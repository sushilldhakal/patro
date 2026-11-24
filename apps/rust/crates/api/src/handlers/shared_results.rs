//! Shared month results: `GET`/`PUT /v1/shared/month/{key}`.
//!
//! The apps work a month out themselves (sunrise, angas, festivals ...). Once one device has, the
//! result is worth keeping for everyone else at the same place: the key is the calculation, the BS
//! month and the place snapped to 0.01 degree (the device computes at the snapped place, so every
//! device makes the same bytes). The server does no maths here and trusts nobody: it checks only that
//! a submission is well formed and for the month its key names, and it serves a result only after
//! three different callers sent the identical bytes (a vote count, not a calculation).
//!
//! Off unless `PATRO_RS_SHARED_DIR` names a folder: `GET` is then a 404 and `PUT` a 503.
//! A stored month is immutable, so a CDN may keep it for a year.

use std::{
    collections::{HashMap, HashSet},
    net::SocketAddr,
    path::PathBuf,
    sync::{LazyLock, Mutex},
};

use axum::{
    Extension,
    body::Bytes,
    extract::{ConnectInfo, Path},
    http::{HeaderMap, StatusCode, header},
    response::Response,
};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::respond::detail;

/// Callers that must send the same bytes before a result is served.
const VOTES_NEEDED: usize = 3;
/// Largest submission (a lite month is about 35 KB; a full week of festivals fits well under).
const MAX_BODY: usize = 160 * 1024;
/// Keys with votes pending at once (a flood cannot grow memory without limit).
const MAX_PENDING: usize = 20_000;
/// Row fields every day must carry.
const ROW_KEYS: &[&str] = &[
    "day",
    "date_ad",
    "weekday",
    "tithi",
    "paksha",
    "nakshatra",
    "yoga",
    "karana",
    "chandra_rashi",
    "sunrise",
    "sunset",
    "festivals",
];

struct Pending {
    /// Hash of the bytes -> the callers (hashed) that sent them.
    votes: HashMap<String, HashSet<String>>,
}

static PENDING: LazyLock<Mutex<HashMap<String, Pending>>> = LazyLock::new(Mutex::default);

fn dir() -> Option<PathBuf> {
    std::env::var_os("PATRO_RS_SHARED_DIR")
        .filter(|v| !v.is_empty())
        .map(PathBuf::from)
}

/// `{calc}.{bs_year}.{bs_month}.{lat}.{lon}.{flags}`: letters, digits, `_`, `-`, `.` only.
fn parse_key(key: &str) -> Option<(i32, u32)> {
    if key.is_empty()
        || key.len() > 96
        || !key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.'))
    {
        return None;
    }
    let mut parts = key.split('.');
    let _calc = parts.next()?;
    let year: i32 = parts.next()?.parse().ok()?;
    let month: u32 = parts.next()?.parse().ok()?;
    ((1..=12).contains(&month) && (1900..=2200).contains(&year)).then_some((year, month))
}

fn path_of(root: &std::path::Path, key: &str) -> PathBuf {
    root.join("month").join(format!("{key}.json"))
}

/// The same checks for every submission: shape, and that it is the month the key names.
fn well_formed(body: &[u8], year: i32, month: u32) -> bool {
    let Ok(v) = serde_json::from_slice::<Value>(body) else {
        return false;
    };
    let ok_header = v["year_bs"].as_i64() == Some(i64::from(year))
        && v["month_bs"].as_u64() == Some(u64::from(month))
        && v["grid_mode"].as_str() == Some("full_panchanga");
    let Some(rows) = v["calendar"].as_array() else {
        return false;
    };
    let length = v["month_length"].as_u64().unwrap_or(0);
    ok_header
        && (28..=32).contains(&rows.len())
        && rows.len() as u64 == length
        && rows.iter().enumerate().all(|(i, r)| {
            r["day"].as_u64() == Some(i as u64 + 1) && ROW_KEYS.iter().all(|k| r.get(*k).is_some())
        })
}

fn address(headers: &HeaderMap, peer: Option<SocketAddr>) -> String {
    let get = |name: &str| {
        headers
            .get(name)
            .and_then(|v| v.to_str().ok())
            .map(str::to_owned)
    };
    get("cf-connecting-ip")
        .filter(|v| !v.is_empty())
        .or_else(|| {
            get("x-forwarded-for")
                .map(|v| v.split(',').next().unwrap_or_default().trim().to_owned())
                .filter(|v| !v.is_empty())
        })
        .or_else(|| peer.map(|p| p.ip().to_string()))
        .unwrap_or_else(|| "unknown".to_owned())
}

fn hex(bytes: &[u8]) -> String {
    use std::fmt::Write as _;
    Sha256::digest(bytes)
        .iter()
        .fold(String::new(), |mut out, b| {
            let _ = write!(out, "{b:02x}");
            out
        })
}

/// `GET /v1/shared/month/{key}`.
pub(crate) async fn get_month(Path(key): Path<String>) -> Response {
    let (Some(root), Some(_)) = (dir(), parse_key(&key)) else {
        return not_found();
    };
    let path = path_of(&root, &key);
    match tokio::task::spawn_blocking(move || std::fs::read(path)).await {
        Ok(Ok(bytes)) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::CACHE_CONTROL, "public, max-age=31536000, immutable")
            .body(axum::body::Body::from(bytes))
            .unwrap_or_else(|_| {
                detail(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "could not build response",
                )
            }),
        _ => not_found(),
    }
}

fn not_found() -> Response {
    let mut r = detail(StatusCode::NOT_FOUND, "not stored");
    r.headers_mut().insert(
        header::CACHE_CONTROL,
        header::HeaderValue::from_static("public, max-age=300"),
    );
    r
}

/// `PUT /v1/shared/month/{key}`: a vote for these bytes.
pub(crate) async fn put_month(
    Path(key): Path<String>,
    headers: HeaderMap,
    peer: Option<Extension<ConnectInfo<SocketAddr>>>,
    body: Bytes,
) -> Response {
    let Some(root) = dir() else {
        return detail(StatusCode::SERVICE_UNAVAILABLE, "shared results are off");
    };
    let Some((year, month)) = parse_key(&key) else {
        return detail(StatusCode::BAD_REQUEST, "bad key");
    };
    if body.len() > MAX_BODY || !well_formed(&body, year, month) {
        return detail(StatusCode::UNPROCESSABLE_ENTITY, "not a month for this key");
    }
    let caller = hex(address(&headers, peer.map(|Extension(ConnectInfo(a))| a)).as_bytes());
    store_vote(&root, &key, caller, body).await
}

/// Counts one caller's vote for these bytes and stores them when enough callers agree.
async fn store_vote(root: &std::path::Path, key: &str, caller: String, body: Bytes) -> Response {
    let target = path_of(root, key);
    if target.exists() {
        return accepted("stored");
    }
    let digest = hex(&body);
    let promote = {
        let Ok(mut pending) = PENDING.lock() else {
            return detail(StatusCode::INTERNAL_SERVER_ERROR, "busy");
        };
        if pending.len() >= MAX_PENDING && !pending.contains_key(key) {
            return detail(StatusCode::SERVICE_UNAVAILABLE, "busy");
        }
        let entry = pending.entry(key.to_owned()).or_insert_with(|| Pending {
            votes: HashMap::new(),
        });
        let callers = entry.votes.entry(digest).or_default();
        callers.insert(caller);
        let done = callers.len() >= VOTES_NEEDED;
        if done {
            pending.remove(key);
        }
        done
    };
    if !promote {
        return accepted("counted");
    }
    let bytes = body.to_vec();
    let stored = tokio::task::spawn_blocking(move || {
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let tmp = target.with_extension("tmp");
        std::fs::write(&tmp, bytes)?;
        std::fs::rename(&tmp, &target)
    })
    .await;
    if !matches!(stored, Ok(Ok(()))) {
        return detail(StatusCode::INTERNAL_SERVER_ERROR, "could not store");
    }
    accepted("stored")
}

fn accepted(state: &str) -> Response {
    Response::builder()
        .status(StatusCode::ACCEPTED)
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::CACHE_CONTROL, "no-store")
        .body(axum::body::Body::from(format!(
            "{{\"status\":\"{state}\"}}"
        )))
        .unwrap_or_else(|_| {
            detail(
                StatusCode::INTERNAL_SERVER_ERROR,
                "could not build response",
            )
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn month(rows: usize) -> Vec<u8> {
        let calendar: Vec<Value> = (1..=rows)
            .map(|d| {
                serde_json::json!({"day": d, "date_ad": "x", "weekday": "x", "tithi": "x", "paksha": "x",
                "nakshatra": "x", "yoga": "x", "karana": "x", "chandra_rashi": "x", "sunrise": "x",
                "sunset": "x", "festivals": []})
            })
            .collect();
        serde_json::to_vec(
            &serde_json::json!({"year_bs": 2083, "month_bs": 8, "grid_mode": "full_panchanga",
            "month_length": rows, "calendar": calendar}),
        )
        .expect("json")
    }

    #[test]
    fn keys_are_checked() {
        assert_eq!(parse_key("drik-kp.2083.8.27.70.85.32.0"), Some((2083, 8)));
        assert_eq!(parse_key("../etc.2083.8"), None);
        assert_eq!(parse_key("surya.2083.13"), None);
        assert_eq!(parse_key("surya.1500.1"), None);
    }

    #[tokio::test]
    async fn three_callers_make_a_month_served() {
        let root = std::env::temp_dir().join(format!("patro-shared-{}", std::process::id()));
        let key = "surya.2083.8.27.70.85.32.0";
        let body = Bytes::from(month(29));
        let state = |r: Response| r.status();
        for caller in ["a", "a", "b"] {
            let r = store_vote(&root, key, caller.to_owned(), body.clone()).await;
            assert_eq!(state(r), StatusCode::ACCEPTED);
            assert!(!path_of(&root, key).exists(), "two callers are not enough");
        }
        // A different month from a third caller is a vote for other bytes, not for these.
        let other = Bytes::from(month(30));
        let _ = store_vote(&root, key, "c".to_owned(), other).await;
        assert!(!path_of(&root, key).exists());
        let _ = store_vote(&root, key, "c".to_owned(), body.clone()).await;
        assert_eq!(
            std::fs::read(path_of(&root, key)).expect("stored"),
            body.to_vec()
        );
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn submissions_are_checked() {
        assert!(well_formed(&month(29), 2083, 8));
        assert!(!well_formed(&month(29), 2083, 9));
        assert!(!well_formed(&month(12), 2083, 8));
        assert!(!well_formed(b"nope", 2083, 8));
    }
}
