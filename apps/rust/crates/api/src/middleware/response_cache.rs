//! Shared response cache for whole public GET responses
//! (`app/redis_response_middleware.py`).
//!
//! The final bytes (era-rendered, gzipped) of eligible `/v1/…` GETs are kept in
//! Redis; a hit skips the route, the era rendering and gzip. What is cached and for
//! how long follows Python exactly (`ttl_for`): `public` responses for their
//! `s-maxage` when the URL names a fixed day, else their `max-age`; a few
//! deterministic routes without Cache-Control by `UNMARKED_ROUTES`; personal
//! rashifal server-side only; responses pinned to a cache version (`cv`, `sv`…)
//! for 400 days. Documents and the Veda reader stay out (Cloudflare holds them).
//!
//! Two deliberate differences: keys live under their own namespace (`rsresp:`), so
//! the Rust and Python servers never answer from each other's entries (the Rust
//! server fixes some Python bugs, so bodies can differ); and the layer is off
//! unless `PATRO_RS_REDIS_URL` is set. Identical concurrent misses share one build
//! in this process. Every Redis failure is a miss.

use std::{
    collections::HashMap,
    io::Read as _,
    sync::{Arc, LazyLock, Mutex, PoisonError},
    time::Duration,
};

use axum::{
    body::Body,
    extract::Request,
    http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use regex::Regex;
use sha2::{Digest, Sha256};
use tokio::sync::{OnceCell, watch};

const KEY_NS: &str = "rsresp:";
const MIN_TTL_S: u64 = 30;
const LONG: u64 = 24 * 3600;
const SHORT: u64 = 15 * 60;
const LOCK_WAIT: Duration = Duration::from_secs(8);
/// Bump when a code change alters responses without changing a version the URL
/// carries; `RESPONSE_CACHE_EPOCH` adds to it for an emergency flush.
const EPOCH: &str = "rs1";
const VERSION_PARAMS: [&str; 5] = ["cv", "sv", "gv", "ev", "v"];
const FIXED_DAY_QUERY: [&str; 5] = ["date", "jd", "year", "from", "bs_year"];
/// `_CDN_ONLY`.
const CDN_ONLY: [&str; 2] = ["/documents", "/veda/"];

/// `_UNMARKED_ROUTES`: (path marker, ttl for a fixed day, ttl otherwise).
const UNMARKED_ROUTES: [(&str, u64, u64); 17] = [
    ("/nepal/sait/", LONG, LONG),
    ("/nepal/festivals", LONG, SHORT),
    ("/nepal/holidays", LONG, SHORT),
    ("/festivals/", LONG, LONG),
    ("/holidays/", LONG, LONG),
    ("/seasons/tropical", LONG, SHORT),
    ("/panchanga/element", LONG, SHORT),
    ("/panchanga/jd/", LONG, LONG),
    ("/cities/", LONG, LONG),
    ("/convert/", LONG, LONG),
    ("/calendar/header/", LONG, LONG),
    ("/nepal/panchanga/", LONG, SHORT),
    ("/nepal/sankranti/", LONG, SHORT),
    ("/kundali/reference", LONG, LONG),
    ("/kundali/yogas/reference", LONG, LONG),
    ("/vastu/zones", LONG, LONG),
    ("/vastu/rooms", LONG, LONG),
];

/// `_PRIVATE_SERVER_ROUTES`.
const PRIVATE_SERVER_ROUTES: [(&str, u64); 2] = [
    ("/panchanga/rashifal/personal", 6 * 3600),
    ("/panchanga/rashifal/janma", 6 * 3600),
];

/// Headers replayed on a hit (`_STORED_HEADERS`).
const STORED_HEADERS: [&str; 6] = [
    "content-type",
    "content-encoding",
    "cache-control",
    "cdn-cache-control",
    "x-siddhanta",
    "content-language",
];

static FIXED_DAY_PATH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"/\d{4}-\d{2}-\d{2}(?:/|$)|/jd/-?[\d.]+|/year/-?\d+|/patro/-?\d+/\d+|/special-months/-?\d+|/gochar/\d{4}-\d{2}-\d{2}",
    )
    .expect("valid regex")
});
static MONTH_PATH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"/panchanga/-?\d+/\d+(?:/|$)|/nepal/sait/-?\d+/").expect("valid regex")
});
static MAX_AGE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?:^|[,\s])max-age=(\d+)").expect("valid regex"));
static S_MAXAGE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"s-maxage=(\d+)").expect("valid regex"));

fn env_u64(name: &str, default: u64) -> u64 {
    std::env::var(name)
        .ok()
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(default)
}

fn max_body_bytes() -> usize {
    usize::try_from(env_u64("REDIS_RESPONSE_MAX_BYTES", 4 * 1024 * 1024)).unwrap_or(usize::MAX)
}

fn max_ttl() -> u64 {
    env_u64("REDIS_RESPONSE_MAX_TTL_S", 30 * 24 * 3600)
}

fn pinned_ttl() -> u64 {
    env_u64("REDIS_RESPONSE_PINNED_TTL_S", 400 * 24 * 3600)
}

fn stale_if_error() -> String {
    std::env::var("STALE_IF_ERROR_S").unwrap_or_else(|_| "86400".to_owned())
}

/// Where cached responses live.
pub trait Store: Send + Sync {
    /// The stored bytes for `key`, `None` on a miss or any error.
    fn get(&self, key: &str) -> futures_like::BoxFuture<'_, Option<Vec<u8>>>;
    /// Store `value` for `ttl` seconds; errors are ignored.
    fn set(&self, key: &str, value: Vec<u8>, ttl: u64) -> futures_like::BoxFuture<'_, ()>;
}

/// A boxed `Send` future, without pulling in the `futures` crate.
pub mod futures_like {
    /// A boxed `Send` future.
    pub type BoxFuture<'a, T> = std::pin::Pin<Box<dyn std::future::Future<Output = T> + Send + 'a>>;
}

/// Redis through a reconnecting connection manager.
struct RedisStore {
    conn: redis::aio::ConnectionManager,
}

impl Store for RedisStore {
    fn get(&self, key: &str) -> futures_like::BoxFuture<'_, Option<Vec<u8>>> {
        let key = key.to_owned();
        let mut conn = self.conn.clone();
        Box::pin(async move {
            redis::cmd("GET")
                .arg(&key)
                .query_async::<Option<Vec<u8>>>(&mut conn)
                .await
                .ok()
                .flatten()
        })
    }

    fn set(&self, key: &str, value: Vec<u8>, ttl: u64) -> futures_like::BoxFuture<'_, ()> {
        let key = key.to_owned();
        let mut conn = self.conn.clone();
        Box::pin(async move {
            let _: Result<(), _> = redis::cmd("SET")
                .arg(&key)
                .arg(value)
                .arg("EX")
                .arg(ttl.max(1))
                .query_async(&mut conn)
                .await;
        })
    }
}

/// An in-memory store (tests, and a single box without Redis).
#[derive(Debug, Default)]
pub struct MemoryStore {
    entries: Mutex<HashMap<String, Vec<u8>>>,
}

impl Store for MemoryStore {
    fn get(&self, key: &str) -> futures_like::BoxFuture<'_, Option<Vec<u8>>> {
        let value = self
            .entries
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .get(key)
            .cloned();
        Box::pin(async move { value })
    }

    fn set(&self, key: &str, value: Vec<u8>, _ttl: u64) -> futures_like::BoxFuture<'_, ()> {
        self.entries
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(key.to_owned(), value);
        Box::pin(async {})
    }
}

static STORE: OnceCell<Option<Arc<dyn Store>>> = OnceCell::const_new();
static TEST_STORE: Mutex<Option<Arc<dyn Store>>> = Mutex::new(None);

/// Use `store` for every later request (tests).
pub fn install_store(store: Arc<dyn Store>) {
    *TEST_STORE.lock().unwrap_or_else(PoisonError::into_inner) = Some(store);
}

async fn store() -> Option<Arc<dyn Store>> {
    if let Some(s) = TEST_STORE
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .clone()
    {
        return Some(s);
    }
    STORE
        .get_or_init(|| async {
            let url = std::env::var("PATRO_RS_REDIS_URL").ok()?;
            let url = url.trim();
            if url.is_empty() {
                return None;
            }
            let client = match redis::Client::open(url) {
                Ok(c) => c,
                Err(e) => {
                    tracing::warn!(error = %e, "response cache: bad PATRO_RS_REDIS_URL, cache off");
                    return None;
                }
            };
            match redis::aio::ConnectionManager::new(client).await {
                Ok(conn) => Some(Arc::new(RedisStore { conn }) as Arc<dyn Store>),
                Err(e) => {
                    tracing::warn!(error = %e, "response cache: Redis unreachable, cache off");
                    None
                }
            }
        })
        .await
        .clone()
}

fn query_pairs(query: &str) -> Vec<(String, String)> {
    query
        .split('&')
        .filter(|p| !p.is_empty())
        .map(|p| {
            let (k, v) = p.split_once('=').unwrap_or((p, ""));
            (decode(k), decode(v))
        })
        .collect()
}

/// `application/x-www-form-urlencoded` decoding (`+` is a space).
fn decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'+' => out.push(b' '),
            b'%' if i + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[i + 1..=i + 2]).ok();
                match hex.and_then(|h| u8::from_str_radix(h, 16).ok()) {
                    Some(b) => {
                        out.push(b);
                        i += 2;
                    }
                    None => out.push(b'%'),
                }
            }
            b => out.push(b),
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn first<'a>(pairs: &'a [(String, String)], key: &str) -> Option<&'a str> {
    // `dict(parse_qsl(...))` keeps the last value of a repeated key.
    pairs
        .iter()
        .rev()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.as_str())
        .filter(|v| !v.is_empty())
}

fn is_fixed_day(path: &str, pairs: &[(String, String)]) -> bool {
    FIXED_DAY_PATH.is_match(path) || FIXED_DAY_QUERY.iter().any(|k| first(pairs, k).is_some())
}

/// `ttl_for`: seconds to keep this response, or `None` to skip it.
fn ttl_for(path: &str, pairs: &[(String, String)], cache_control: Option<&str>) -> Option<u64> {
    let ttl = base_ttl(path, pairs, cache_control)?;
    if cache_control.is_some_and(|cc| cc.to_lowercase().contains("private")) {
        return Some(ttl);
    }
    let fixed = is_fixed_day(path, pairs);
    let pinned = VERSION_PARAMS.iter().any(|k| first(pairs, k).is_some())
        && (fixed || MONTH_PATH.is_match(path));
    Some(if pinned {
        ttl.max(pinned_ttl())
    } else {
        ttl.min(max_ttl())
    })
}

fn base_ttl(path: &str, pairs: &[(String, String)], cache_control: Option<&str>) -> Option<u64> {
    let fixed = is_fixed_day(path, pairs);
    if let Some(cc) = cache_control.filter(|c| !c.is_empty()) {
        let cc = cc.to_lowercase();
        if cc.contains("private") && !cc.contains("no-store") && first(pairs, "date").is_some() {
            for (marker, ttl) in PRIVATE_SERVER_ROUTES {
                if path.ends_with(marker) {
                    return Some(ttl);
                }
            }
        }
        if cc.contains("private") || cc.contains("no-store") || cc.contains("no-cache") {
            return None;
        }
        if !cc.starts_with("public") {
            return None;
        }
        let number = |re: &Regex| {
            re.captures(&cc)
                .and_then(|c| c.get(1))
                .and_then(|m| m.as_str().parse::<u64>().ok())
        };
        let (s_max, max_age) = (number(&S_MAXAGE), number(&MAX_AGE));
        let ttl = match (fixed, s_max, max_age) {
            (true, Some(s), _) | (_, Some(s), None) => s,
            (_, _, Some(m)) => m,
            _ => return None,
        };
        if ttl < MIN_TTL_S {
            return None;
        }
        return Some(ttl.min(max_ttl()));
    }
    UNMARKED_ROUTES
        .iter()
        .find(|(marker, _, _)| path.contains(marker))
        .map(|&(_, fixed_ttl, live_ttl)| if fixed { fixed_ttl } else { live_ttl })
}

/// `_eligible_path`.
fn eligible(path: &str) -> bool {
    if path.ends_with("/og-image") {
        return true;
    }
    if CDN_ONLY.iter().any(|m| path.contains(m)) {
        return false;
    }
    path.contains("/v1/")
}

fn cache_key(headers: &HeaderMap, path: &str, query: &str) -> String {
    let host = headers
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .split(':')
        .next()
        .unwrap_or_default()
        .to_lowercase();
    let mut pairs = query_pairs(query);
    pairs.sort();
    let sorted: Vec<String> = pairs.iter().map(|(k, v)| format!("{k}={v}")).collect();
    let extra = std::env::var("RESPONSE_CACHE_EPOCH").unwrap_or_default();
    let epoch = if extra.trim().is_empty() {
        EPOCH.to_owned()
    } else {
        format!("{EPOCH}.{}", extra.trim())
    };
    let raw = [host.as_str(), path, &sorted.join("&"), epoch.as_str()].join("\n");
    let digest = Sha256::digest(raw.as_bytes());
    let hex = digest.iter().fold(String::with_capacity(64), |mut out, b| {
        use std::fmt::Write as _;
        let _ = write!(out, "{b:02x}");
        out
    });
    format!("{KEY_NS}{hex}")
}

/// `with_stale_if_error` on one header value.
fn stale_if_error_value(value: &str) -> String {
    let low = value.to_lowercase();
    if low.starts_with("public") && !low.contains("stale-if-error") {
        format!("{value}, stale-if-error={}", stale_if_error())
    } else {
        value.to_owned()
    }
}

/// Stored `(name, value)` headers.
type Stored = Vec<(String, String)>;

/// What the client can take.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Encoding {
    Gzip,
    Identity,
}

/// `_pack`: 4-byte big-endian header-JSON length, the header JSON, the body.
fn pack(headers: &[(String, String)], body: &[u8]) -> Vec<u8> {
    let meta = serde_json::to_vec(
        &headers
            .iter()
            .map(|(k, v)| [k.as_str(), v.as_str()])
            .collect::<Vec<_>>(),
    )
    .unwrap_or_default();
    let mut out = Vec::with_capacity(4 + meta.len() + body.len());
    out.extend_from_slice(&u32::try_from(meta.len()).unwrap_or(0).to_be_bytes());
    out.extend_from_slice(&meta);
    out.extend_from_slice(body);
    out
}

/// `_unpack`; `None` for a corrupt entry (a miss).
fn unpack(blob: &[u8]) -> Option<(Stored, Vec<u8>)> {
    let size = usize::try_from(u32::from_be_bytes(blob.get(..4)?.try_into().ok()?)).ok()?;
    let meta: Vec<[String; 2]> = serde_json::from_slice(blob.get(4..4 + size)?).ok()?;
    Some((
        meta.into_iter().map(|[k, v]| (k, v)).collect(),
        blob.get(4 + size..)?.to_vec(),
    ))
}

fn gunzip(body: &[u8]) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    flate2::read::GzDecoder::new(body)
        .read_to_end(&mut out)
        .ok()?;
    Some(out)
}

fn insert(headers: &mut HeaderMap, name: &str, value: &str) {
    if let (Ok(n), Ok(v)) = (HeaderName::try_from(name), HeaderValue::from_str(value)) {
        headers.append(n, v);
    }
}

/// `_send_hit`.
fn hit_response(stored: Stored, body: Vec<u8>, encoding: Encoding) -> Response {
    let encoded = stored
        .iter()
        .any(|(k, v)| k == "content-encoding" && v.eq_ignore_ascii_case("gzip"));
    let (stored, body) = if encoded && encoding == Encoding::Identity {
        match gunzip(&body) {
            Some(plain) => (
                stored
                    .into_iter()
                    .filter(|(k, _)| k != "content-encoding")
                    .collect(),
                plain,
            ),
            None => (stored, body),
        }
    } else {
        (stored, body)
    };
    let mut headers = HeaderMap::new();
    for (k, v) in &stored {
        let v = if k == "cache-control" || k == "cdn-cache-control" {
            stale_if_error_value(v)
        } else {
            v.clone()
        };
        insert(&mut headers, k, &v);
    }
    insert(&mut headers, "content-length", &body.len().to_string());
    insert(&mut headers, "vary", "Accept-Encoding");
    insert(&mut headers, "x-cache", "HIT");
    (StatusCode::OK, headers, Body::from(body)).into_response()
}

async fn try_hit(store: &dyn Store, key: &str, encoding: Encoding) -> Option<Response> {
    let blob = store.get(key).await?;
    let (headers, body) = unpack(&blob)?;
    Some(hit_response(headers, body, encoding))
}

/// Keys being built now: waiters subscribe for the owner's finish.
static IN_FLIGHT: LazyLock<Mutex<HashMap<String, watch::Receiver<bool>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Removes the in-flight entry and wakes waiters, also if the build panics.
struct Flight {
    key: String,
    done: watch::Sender<bool>,
}

impl Drop for Flight {
    fn drop(&mut self) {
        IN_FLIGHT
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .remove(&self.key);
        let _ = self.done.send(true);
    }
}

/// The response-cache layer.
pub(crate) async fn response_cache(request: Request, next: Next) -> Response {
    if request.method() != Method::GET || !eligible(request.uri().path()) {
        return next.run(request).await;
    }
    let Some(store) = store().await else {
        return next.run(request).await;
    };
    let encoding = if request
        .headers()
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_lowercase().contains("gzip"))
    {
        Encoding::Gzip
    } else {
        Encoding::Identity
    };
    let path = request.uri().path().to_owned();
    let query = request.uri().query().unwrap_or_default().to_owned();
    let key = cache_key(request.headers(), &path, &query);

    if let Some(hit) = try_hit(store.as_ref(), &key, encoding).await {
        return hit;
    }

    // One build per key; identical misses wait for its stored answer.
    let waiting = {
        let mut flights = IN_FLIGHT.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some(rx) = flights.get(&key) {
            Err(rx.clone())
        } else {
            let (tx, rx) = watch::channel(false);
            flights.insert(key.clone(), rx);
            Ok(Flight {
                key: key.clone(),
                done: tx,
            })
        }
    };
    let flight = match waiting {
        Ok(flight) => Some(flight),
        Err(mut rx) => {
            let _ = tokio::time::timeout(LOCK_WAIT, rx.wait_for(|done| *done)).await;
            if let Some(hit) = try_hit(store.as_ref(), &key, encoding).await {
                return hit;
            }
            None
        }
    };

    let response = compute(request, next, store.as_ref(), &key, &path, &query, encoding).await;
    drop(flight);
    response
}

async fn compute(
    mut request: Request,
    next: Next,
    store: &dyn Store,
    key: &str,
    path: &str,
    query: &str,
    encoding: Encoding,
) -> Response {
    // Always ask the inner stack for gzip so the store holds compressed bytes.
    request
        .headers_mut()
        .insert(header::ACCEPT_ENCODING, HeaderValue::from_static("gzip"));
    let response = next.run(request).await;
    let (mut parts, body) = response.into_parts();
    for name in [
        header::CACHE_CONTROL,
        HeaderName::from_static("cdn-cache-control"),
    ] {
        if let Some(v) = parts.headers.get(&name).and_then(|v| v.to_str().ok()) {
            let updated = stale_if_error_value(v);
            if let Ok(v) = HeaderValue::from_str(&updated) {
                parts.headers.insert(name, v);
            }
        }
    }
    let gzipped = parts
        .headers
        .get(header::CONTENT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.eq_ignore_ascii_case("gzip"));
    let pairs = query_pairs(query);
    let ttl = (parts.status == StatusCode::OK && !parts.headers.contains_key(header::SET_COOKIE))
        .then(|| {
            ttl_for(
                path,
                &pairs,
                parts
                    .headers
                    .get(header::CACHE_CONTROL)
                    .and_then(|v| v.to_str().ok()),
            )
        })
        .flatten();
    let Ok(bytes) = axum::body::to_bytes(body, usize::MAX).await else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response();
    };
    let ttl = ttl.filter(|_| bytes.len() <= max_body_bytes());
    let store_it = ttl.is_some();
    if let Some(ttl) = ttl {
        let stored: Vec<(String, String)> = STORED_HEADERS
            .iter()
            .filter_map(|name| {
                parts
                    .headers
                    .get(*name)
                    .and_then(|v| v.to_str().ok())
                    .map(|v| ((*name).to_owned(), v.to_owned()))
            })
            .collect();
        store.set(key, pack(&stored, &bytes), ttl).await;
    }
    let x_cache = if store_it { "MISS" } else { "BYPASS" };
    if gzipped && encoding == Encoding::Identity {
        if let Some(plain) = gunzip(&bytes) {
            parts.headers.remove(header::CONTENT_ENCODING);
            parts.headers.remove(header::CONTENT_LENGTH);
            insert(
                &mut parts.headers,
                "content-length",
                &plain.len().to_string(),
            );
            insert(&mut parts.headers, "x-cache", "MISS");
            return Response::from_parts(parts, Body::from(plain));
        }
    }
    insert(&mut parts.headers, "x-cache", x_cache);
    Response::from_parts(parts, Body::from(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pairs(q: &str) -> Vec<(String, String)> {
        query_pairs(q)
    }

    #[test]
    fn ttl_follows_python() {
        let day = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
        assert_eq!(
            ttl_for("/v1/panchanga/2026-03-12", &pairs(""), Some(day)),
            Some(3600)
        );
        assert_eq!(
            ttl_for("/v1/panchanga/at-time", &pairs("jd=1"), Some(day)),
            Some(3600)
        );
        assert_eq!(
            ttl_for("/v1/panchanga/at-time", &pairs(""), Some(day)),
            Some(300)
        );
        assert_eq!(
            ttl_for("/v1/panchanga/2026-03-12", &pairs("cv=6506"), Some(day)),
            Some(400 * 24 * 3600)
        );
        assert_eq!(
            ttl_for("/v1/x", &pairs(""), Some("private, max-age=60")),
            None
        );
        assert_eq!(
            ttl_for(
                "/v1/panchanga/rashifal/personal",
                &pairs("date=2026-01-01"),
                Some("private, max-age=60")
            ),
            Some(6 * 3600)
        );
        assert_eq!(
            ttl_for("/v1/convert/ad-to-bs/2026-03-12", &pairs(""), None),
            Some(LONG)
        );
        assert_eq!(
            ttl_for("/v1/nepal/festivals", &pairs(""), None),
            Some(SHORT)
        );
        assert_eq!(
            ttl_for("/v1/x", &pairs(""), Some("public, max-age=0")),
            None
        );
        assert!(!eligible("/v1/documents/rigveda"));
        assert!(eligible("/share/og-image"));
        assert!(!eligible("/health"));
    }

    #[test]
    fn pack_round_trips() {
        let headers = vec![("content-type".to_owned(), "application/json".to_owned())];
        let blob = pack(&headers, b"{}");
        assert_eq!(unpack(&blob), Some((headers, b"{}".to_vec())));
    }
}
