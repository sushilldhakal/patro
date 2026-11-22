//! A persistent store of daily panchanga payloads (SQLite), under the in-memory
//! day memo: a restarted server answers warm days without recomputing them, and
//! the `POST /v1/generate/panchanga/*` jobs fill it ahead of traffic (Python's
//! `panchanga_cache.sqlite`).
//!
//! Off unless `PATRO_RS_PANCHANGA_CACHE` names a file. Its own file and its own
//! keys: every field of the location is part of the key (Python shared one entry
//! per town and for Kathmandu-near coordinates), and `PAYLOAD_VERSION` retires
//! every row when the payload changes.

use std::{
    io::{Read as _, Write as _},
    sync::{Mutex, OnceLock, PoisonError},
};

use rusqlite::{Connection, OptionalExtension, params};
use serde_json::Value;

/// Bump when a code change alters a daily payload.
pub const PAYLOAD_VERSION: &str = "1";

struct Store {
    conn: Mutex<Connection>,
}

fn store() -> Option<&'static Store> {
    static STORE: OnceLock<Option<Store>> = OnceLock::new();
    STORE
        .get_or_init(|| {
            let path = std::env::var("PATRO_RS_PANCHANGA_CACHE").ok()?;
            let path = path.trim();
            if path.is_empty() {
                return None;
            }
            let conn = Connection::open(path).ok()?;
            conn.execute_batch(
                "PRAGMA journal_mode=WAL;
                 CREATE TABLE IF NOT EXISTS days (
                     key TEXT PRIMARY KEY,
                     city_id INTEGER NOT NULL,
                     payload BLOB NOT NULL
                 );",
            )
            .ok()?;
            Some(Store {
                conn: Mutex::new(conn),
            })
        })
        .as_ref()
}

/// Whether the store is configured.
#[must_use]
pub fn enabled() -> bool {
    store().is_some()
}

fn versioned(key: &str) -> String {
    format!("v{PAYLOAD_VERSION}|{key}")
}

/// The stored payload for `key`, if any.
#[must_use]
pub fn get(key: &str) -> Option<Value> {
    let store = store()?;
    let blob: Vec<u8> = store
        .conn
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .query_row(
            "SELECT payload FROM days WHERE key = ?1",
            params![versioned(key)],
            |row| row.get(0),
        )
        .optional()
        .ok()??;
    let mut text = String::new();
    flate2::read::GzDecoder::new(&blob[..])
        .read_to_string(&mut text)
        .ok()?;
    serde_json::from_str(&text).ok()
}

/// Whether `key` is stored.
#[must_use]
pub fn contains(key: &str) -> bool {
    store().is_some_and(|store| {
        store
            .conn
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .query_row(
                "SELECT 1 FROM days WHERE key = ?1",
                params![versioned(key)],
                |_| Ok(()),
            )
            .optional()
            .ok()
            .flatten()
            .is_some()
    })
}

/// Stores `payload` for `key` (a failure is ignored: the store is a cache).
pub fn put(key: &str, city_id: Option<i64>, payload: &Value) {
    if let Ok(text) = serde_json::to_string(payload) {
        put_text(key, city_id, &text);
    }
}

/// [`put`] for a payload already written as JSON text.
pub fn put_text(key: &str, city_id: Option<i64>, text: &str) {
    let Some(store) = store() else {
        return;
    };
    let mut enc = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::new(6));
    if enc.write_all(text.as_bytes()).is_err() {
        return;
    }
    let Ok(blob) = enc.finish() else {
        return;
    };
    let _ = store
        .conn
        .lock()
        .unwrap_or_else(PoisonError::into_inner)
        .execute(
            "INSERT OR REPLACE INTO days (key, city_id, payload) VALUES (?1, ?2, ?3)",
            params![versioned(key), city_id.unwrap_or(0), blob],
        );
}

/// `cache_stats`: `{"enabled", "rows", "cities"}`.
#[must_use]
pub fn stats() -> Value {
    let Some(store) = store() else {
        return serde_json::json!({"enabled": false, "rows": 0, "cities": 0});
    };
    let conn = store.conn.lock().unwrap_or_else(PoisonError::into_inner);
    let count = |sql: &str| -> i64 { conn.query_row(sql, [], |row| row.get(0)).unwrap_or(0) };
    serde_json::json!({
        "enabled": true,
        "rows": count("SELECT COUNT(*) FROM days"),
        "cities": count("SELECT COUNT(DISTINCT city_id) FROM days WHERE city_id != 0"),
    })
}
