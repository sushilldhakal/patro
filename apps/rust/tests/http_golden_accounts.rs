//! The account layer against Python, step by step (`gen_http_golden_accounts.py`).
//!
//! Needs a scratch Postgres: `PATRO_RS_TEST_DATABASE_URL` naming a database whose
//! name ends in `_test` (it is wiped). Without it the test says so and passes.
//! Ids, tokens and "now" timestamps differ between runs, so both sides' bodies
//! are compared after each volatile value becomes a first-seen placeholder.

use std::{
    collections::HashMap,
    io::Read as _,
    sync::{Arc, Mutex},
};

use api::AppState;
use axum::{
    body::Body,
    http::{Method, Request},
};
use common::AppConfig;
use serde_json::{Value, json};
use tower::ServiceExt;

fn config() -> AppConfig {
    AppConfig {
        host: "127.0.0.1".into(),
        port: 0,
        data_dir: concat!(env!("CARGO_MANIFEST_DIR"), "/../api/data").into(),
        request_timeout_secs: 120,
        log_filter: "warn".into(),
    }
}

/// The scratch database, wiped; `None` when the test cannot run here.
async fn scratch_accounts(outbox: accounts::Outbox) -> Option<accounts::Accounts> {
    let url = std::env::var("PATRO_RS_TEST_DATABASE_URL").ok()?;
    assert!(
        url.rsplit('/')
            .next()
            .is_some_and(|db| db.ends_with("_test")),
        "PATRO_RS_TEST_DATABASE_URL must name a *_test database"
    );
    let mut cfg = accounts::AccountConfig::with_url(&url);
    cfg.jwt_secret = "golden-secret".into();
    cfg.admin_api_key = Some("golden-admin-key".into());
    cfg.admin_emails = vec!["alice.test@example.com".into()];
    cfg.google_client_ids = Vec::new();
    cfg.apple_client_ids = vec!["com.vedicpatro.mobile".into()];
    cfg.facebook = None;
    cfg.smtp = None;
    cfg.access_ttl_minutes = 30;
    cfg.refresh_ttl_days = 365;
    let (client, conn) = tokio_postgres::connect(&cfg.database_url, tokio_postgres::NoTls)
        .await
        .expect("scratch database reachable");
    tokio::spawn(conn);
    client
        .batch_execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
        .await
        .expect("wipe scratch schema");
    let layer = accounts::Accounts::new(cfg)
        .expect("pool")
        .with_outbox(outbox);
    layer.init().await.expect("schema");
    Some(layer)
}

/// Replaces volatile values with numbered placeholders, consistently within one side.
#[derive(Default)]
struct Normalizer {
    seen: HashMap<String, String>,
    counts: HashMap<&'static str, usize>,
}

impl Normalizer {
    fn tag(&mut self, kind: &'static str, value: &str) -> String {
        if let Some(t) = self.seen.get(value) {
            return t.clone();
        }
        let n = self.counts.entry(kind).or_default();
        *n += 1;
        let t = format!("<{kind}:{n}>");
        self.seen.insert(value.to_owned(), t.clone());
        t
    }

    fn text(&mut self, s: &str) -> String {
        let is_tok = |c: char| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.';
        let mut out = String::new();
        let mut run = String::new();
        let flush = |run: &mut String, out: &mut String, me: &mut Self| {
            if run.is_empty() {
                return;
            }
            let word = std::mem::take(run);
            out.push_str(&me.word(&word));
        };
        for c in s.chars() {
            if is_tok(c) {
                run.push(c);
            } else {
                flush(&mut run, &mut out, self);
                out.push(c);
            }
        }
        flush(&mut run, &mut out, self);
        out
    }

    /// One run of token characters (letters, digits, `_`, `-`, `.`).
    fn word(&mut self, w: &str) -> String {
        if w.starts_with("eyJ") && w.matches('.').count() == 2 {
            return "<jwt>".to_owned();
        }
        // A UUID, possibly followed by text (`<uuid>@vedicpatro.com`).
        if w.len() >= 36 {
            let (head, rest) = w.split_at(36);
            let b = head.as_bytes();
            let uuid = [8, 13, 18, 23].iter().all(|&i| b[i] == b'-')
                && head
                    .chars()
                    .filter(|c| *c != '-')
                    .all(|c| c.is_ascii_hexdigit());
            if uuid {
                return format!("{}{rest}", self.tag("id", head));
            }
        }
        // `/calendar/<token>.ics` and bare 43-character tokens.
        let core = w.strip_suffix(".ics").unwrap_or(w);
        if core.len() == 43 && !core.contains('.') {
            let suffix = &w[core.len()..];
            return format!("{}{suffix}", self.tag("tok", core));
        }
        w.to_owned()
    }

    fn value(&mut self, v: &Value, key: Option<&str>) -> Value {
        match v {
            Value::String(s) => {
                if matches!(
                    key,
                    Some("created_at" | "updated_at" | "synced_at" | "as_of")
                ) {
                    return json!("<now>");
                }
                if key == Some("ics") || s.starts_with("BEGIN:VCALENDAR") {
                    return json!(self.ics(s));
                }
                json!(self.text(s))
            }
            Value::Array(a) => Value::Array(a.iter().map(|x| self.value(x, None)).collect()),
            Value::Object(m) => Value::Object(
                m.iter()
                    .map(|(k, x)| (k.clone(), self.value(x, Some(k))))
                    .collect(),
            ),
            other => other.clone(),
        }
    }

    fn ics(&mut self, s: &str) -> String {
        // Unfold first: folding positions move with token lengths.
        let unfolded = s.replace("\r\n ", "");
        let lines: Vec<String> = unfolded
            .split("\r\n")
            .map(|line| {
                if line.starts_with("DTSTAMP:") {
                    "DTSTAMP:<now>".to_owned()
                } else if line.starts_with("SEQUENCE:") && line != "SEQUENCE:0" {
                    "SEQUENCE:<now>".to_owned()
                } else {
                    self.text(line)
                }
            })
            .collect();
        lines.join("\r\n")
    }
}

fn substitute(v: &Value, env: &HashMap<String, String>, outbox: &[Value]) -> Value {
    match v {
        Value::String(s) => {
            let mut out = s.clone();
            while let Some(start) = out.find("${") {
                let end = start + out[start..].find('}').expect("closing brace");
                let name = &out[start + 2..end];
                let value = if let Some(kind) = name.strip_prefix("outbox:") {
                    outbox
                        .iter()
                        .rev()
                        .find(|o| o["kind"] == kind)
                        .and_then(|o| o["token"].as_str())
                        .expect("an email of that kind")
                        .to_owned()
                } else {
                    env.get(name)
                        .cloned()
                        .unwrap_or_else(|| panic!("no capture {name}"))
                };
                out.replace_range(start..=end, &value);
            }
            json!(out)
        }
        Value::Array(a) => Value::Array(a.iter().map(|x| substitute(x, env, outbox)).collect()),
        Value::Object(m) => Value::Object(
            m.iter()
                .map(|(k, x)| (k.clone(), substitute(x, env, outbox)))
                .collect(),
        ),
        other => other.clone(),
    }
}

const IGNORED_HEADERS: [&str; 4] = ["server-timing", "content-length", "date", "server"];

/// Both scenarios and the divergence checks in one test: they share (and wipe)
/// the scratch database.
#[tokio::test]
async fn account_layer_matches_python() {
    let accounts: Value = serde_json::from_str(include_str!("fixtures/http_golden_accounts.json"))
        .expect("accounts golden JSON");
    let guidance: Value = serde_json::from_str(include_str!("fixtures/http_golden_guidance.json"))
        .expect("guidance golden JSON");
    let mut failures = Vec::new();
    if !replay(&accounts, None, &mut failures).await {
        eprintln!("PATRO_RS_TEST_DATABASE_URL not set: account goldens skipped");
        return;
    }
    let now: timescale::UtcInstant = guidance["now"]
        .as_str()
        .expect("recorded now")
        .parse()
        .expect("an ISO instant");
    replay(&guidance["steps"], Some(now), &mut failures).await;
    account_divergences().await;
    assert!(
        failures.is_empty(),
        "{} mismatches:\n{}",
        failures.len(),
        failures.join("\n")
    );
}

/// Replays one recorded scenario; `false` when there is no scratch database.
#[expect(
    clippy::too_many_lines,
    reason = "one loop: build the step's request, compare status, body, headers and emails"
)]
async fn replay(
    golden: &Value,
    now: Option<timescale::UtcInstant>,
    failures: &mut Vec<String>,
) -> bool {
    let outbox: accounts::Outbox = Arc::new(Mutex::new(Vec::new()));
    let Some(layer) = scratch_accounts(Arc::clone(&outbox)).await else {
        return false;
    };
    let mut state = AppState::new(config()).with_accounts(layer);
    if let Some(now) = now {
        state = state.with_fixed_now(now);
    }
    let app = api::router(state);
    let mut env: HashMap<String, String> = HashMap::new();
    let mut py = Normalizer::default();
    let mut rs = Normalizer::default();
    for (i, case) in golden.as_array().expect("steps").iter().enumerate() {
        let step = &case["step"];
        let sent_before = outbox.lock().expect("outbox").len();
        let mails: Vec<Value> = outbox.lock().expect("outbox").clone();
        let method =
            Method::from_bytes(step["m"].as_str().expect("method").as_bytes()).expect("method");
        let path = substitute(&step["p"], &env, &mails);
        let path = path.as_str().expect("path");
        let mut headers = step["headers"].as_object().cloned().unwrap_or_default();
        if let Some(extra) = step["extra_headers"].as_object() {
            headers.extend(extra.clone());
        }
        let mut req = Request::builder()
            .method(method.clone())
            .uri(path)
            .header("accept-encoding", "gzip, deflate");
        if !headers.keys().any(|k| k.eq_ignore_ascii_case("user-agent")) {
            req = req.header("user-agent", "testclient");
        }
        for (k, v) in &headers {
            let v = substitute(v, &env, &mails);
            req = req.header(k.as_str(), v.as_str().expect("header value"));
        }
        let body = if let Some(j) = step.get("json") {
            req = req.header("content-type", "application/json");
            Body::from(serde_json::to_vec(&substitute(j, &env, &mails)).expect("json"))
        } else if let Some(raw) = step["raw"].as_str() {
            Body::from(raw.to_owned())
        } else {
            Body::empty()
        };
        let res = app
            .clone()
            .oneshot(req.body(body).expect("request"))
            .await
            .expect("router");
        let status = res.status().as_u16();
        let res_headers = res.headers().clone();
        let bytes = axum::body::to_bytes(res.into_body(), 1 << 24)
            .await
            .expect("body");
        let bytes = if res_headers
            .get("content-encoding")
            .is_some_and(|v| v == "gzip")
        {
            let mut out = Vec::new();
            flate2::read::GzDecoder::new(&bytes[..])
                .read_to_end(&mut out)
                .expect("gunzip");
            out
        } else {
            bytes.to_vec()
        };
        let body: Value = serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| json!(String::from_utf8_lossy(&bytes).into_owned()));
        if let Some(caps) = step["capture"].as_object() {
            for (name, key) in caps {
                if let Some(v) = body[key.as_str().expect("key")].as_str() {
                    env.insert(name.clone(), v.to_owned());
                }
            }
        }
        let label = format!("step {i}: {method} {}", step["p"]);
        if u64::from(status) != case["status"] {
            failures.push(format!(
                "{label}: status {status} != {}  body {body}",
                case["status"]
            ));
            continue;
        }
        let want = py.value(&case["body"], None);
        let got = rs.value(&body, None);
        if want != got {
            failures.push(format!("{label}: body\n  python {want}\n  rust   {got}"));
        }
        let py_headers = case["headers"].as_object().expect("headers");
        for (k, v) in py_headers {
            if IGNORED_HEADERS.contains(&k.as_str()) {
                continue;
            }
            let ours = res_headers.get(k.as_str()).and_then(|h| h.to_str().ok());
            if ours != v.as_str() {
                failures.push(format!("{label}: header {k}: rust {ours:?} != python {v}"));
            }
        }
        for k in res_headers.keys() {
            if !IGNORED_HEADERS.contains(&k.as_str()) && !py_headers.contains_key(k.as_str()) {
                failures.push(format!("{label}: extra header {k}"));
            }
        }
        let sent: Vec<Value> = outbox.lock().expect("outbox")[sent_before..]
            .iter()
            .map(|o| {
                let mut o = o.clone();
                if let Some(m) = o.as_object_mut() {
                    m.remove("token");
                }
                rs.value(&o, None)
            })
            .collect();
        let want_sent: Vec<Value> = case["outbox"]
            .as_array()
            .expect("outbox")
            .iter()
            .map(|o| py.value(o, None))
            .collect();
        if sent != want_sent {
            failures.push(format!(
                "{label}: emails\n  python {want_sent:?}\n  rust   {sent:?}"
            ));
        }
    }
    true
}

/// The account layer's deliberate fixes (`rust_divergences.py` #16, #17).
async fn account_divergences() {
    let outbox: accounts::Outbox = Arc::new(Mutex::new(Vec::new()));
    let Some(layer) = scratch_accounts(Arc::clone(&outbox)).await else {
        return;
    };
    let app = api::router(AppState::new(config()).with_accounts(layer));
    let send = |method: &str, path: &str, token: Option<&str>, body: Value| {
        let mut req = Request::builder()
            .method(method)
            .uri(path)
            .header("content-type", "application/json");
        if let Some(t) = token {
            req = req.header("authorization", format!("Bearer {t}"));
        }
        let app = app.clone();
        async move {
            let res = app
                .oneshot(req.body(Body::from(body.to_string())).expect("request"))
                .await
                .expect("router");
            let status = res.status().as_u16();
            let bytes = axum::body::to_bytes(res.into_body(), 1 << 20)
                .await
                .expect("body");
            (
                status,
                serde_json::from_slice::<Value>(&bytes).unwrap_or(Value::Null),
            )
        }
    };
    let long = "p".repeat(100);
    let (status, tokens) = send(
        "POST",
        "/auth/signup",
        None,
        json!({"email": "long@example.com", "password": long}),
    )
    .await;
    assert_eq!(status, 201, "#16: a 100-byte password signs up");
    let (status, _) = send(
        "POST",
        "/auth/login",
        None,
        json!({"email": "long@example.com", "password": long}),
    )
    .await;
    assert_eq!(status, 200, "#16: and signs in");
    let token = tokens["access_token"].as_str().expect("token");
    let (_, profile) = send(
        "POST",
        "/profiles",
        Some(token),
        json!({"full_name": "Kept"}),
    )
    .await;
    let id = profile["id"].as_str().expect("id");
    let (status, patched) = send(
        "PATCH",
        &format!("/profiles/{id}"),
        Some(token),
        json!({"full_name": null, "is_default": null, "phone": "1"}),
    )
    .await;
    assert_eq!(status, 200, "#17: nulls for NOT NULL fields are ignored");
    assert_eq!(patched["full_name"], "Kept", "#17");
    assert_eq!(patched["is_default"], true, "#17");
    assert_eq!(patched["phone"], "1", "#17");
}
