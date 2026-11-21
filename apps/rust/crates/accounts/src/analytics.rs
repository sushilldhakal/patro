//! Anonymous install counting (`services/platform/install_analytics.py` and the
//! Redis helpers it uses from `services/platform/redis_cache.py`).
//!
//! An install is a random UUID the app made for itself; nothing here names a
//! person or a device, and the caller's address is used only for the rate count.
//! Redis (`PATRO_RS_REDIS_URL`) holds the rate counters, the "seen in the last
//! minute" claims and the live presence set; without it every limit is open and
//! the live numbers are `null`, as in Python. Rust keys live under `vp-rs:`
//! (Python's are `vp:`), so the two servers never share counters before cutover.

use std::collections::{BTreeMap, HashMap, HashSet};

use jiff::{SignedDuration, Timestamp, civil::Date, tz::TimeZone};
use serde_json::{Value, json};
use tokio::sync::OnceCell;

use crate::{
    AccountError, Accounts,
    db::{new_id, now, sys, ts},
};

const PREFIX: &str = "vp-rs:";
const PRESENCE_KEY: &str = "app-installs";
const ONLINE_WINDOW_S: i64 = 150;
const PRESENCE_KEEP_S: i64 = 3600;
/// One install reports at most this often.
pub const REPORT_EVERY_S: u64 = 60;
/// Reports per address per hour.
pub const PER_ADDRESS_PER_HOUR: i64 = 120;
/// Pings per address per hour.
pub const PINGS_PER_ADDRESS_PER_HOUR: i64 = 600;
/// One counted ping per install per this many seconds.
pub const PING_EVERY_S: u64 = 30;

static REDIS: OnceCell<Option<redis::aio::ConnectionManager>> = OnceCell::const_new();

async fn redis() -> Option<redis::aio::ConnectionManager> {
    REDIS
        .get_or_init(|| async {
            let url = std::env::var("PATRO_RS_REDIS_URL").ok()?;
            let client = redis::Client::open(url.trim()).ok()?;
            redis::aio::ConnectionManager::new(client).await.ok()
        })
        .await
        .clone()
}

/// `within_limit`: a fixed-window counter; open (true) without Redis.
pub async fn within_limit(name: &str, limit: i64, window: u64) -> bool {
    let Some(mut conn) = redis().await else {
        return true;
    };
    let key = format!("{PREFIX}limit:{name}");
    let Ok(count) = redis::cmd("INCR")
        .arg(&key)
        .query_async::<i64>(&mut conn)
        .await
    else {
        return true;
    };
    if count == 1 {
        let _: Result<(), _> = redis::cmd("EXPIRE")
            .arg(&key)
            .arg(window)
            .query_async(&mut conn)
            .await;
    }
    count <= limit
}

/// `claim_once`: true for one caller per `ttl` window; true without Redis.
pub async fn claim_once(name: &str, ttl: u64) -> bool {
    let Some(mut conn) = redis().await else {
        return true;
    };
    redis::cmd("SET")
        .arg(format!("{PREFIX}once:{name}"))
        .arg("1")
        .arg("NX")
        .arg("EX")
        .arg(ttl)
        .query_async::<Option<String>>(&mut conn)
        .await
        .map_or(true, |set| set.is_some())
}

/// `record_presence`: the install has the app on screen now.
pub async fn record_presence(installation_id: &str, platform: &str) -> bool {
    let Some(mut conn) = redis().await else {
        return false;
    };
    #[expect(
        clippy::cast_precision_loss,
        reason = "Unix microseconds fit a float's precision for decades"
    )]
    let at = Timestamp::now().as_microsecond() as f64 / 1e6;
    let key = format!("{PREFIX}presence:{PRESENCE_KEY}");
    #[expect(clippy::cast_precision_loss, reason = "a small window in seconds")]
    let cutoff = at - PRESENCE_KEEP_S as f64;
    redis::pipe()
        .cmd("ZADD")
        .arg(&key)
        .arg(at)
        .arg(format!("{platform}:{installation_id}"))
        .cmd("ZREMRANGEBYSCORE")
        .arg(&key)
        .arg("-inf")
        .arg(cutoff)
        .cmd("EXPIRE")
        .arg(&key)
        .arg(PRESENCE_KEEP_S)
        .query_async::<()>(&mut conn)
        .await
        .is_ok()
}

async fn presence_members(since: f64) -> Option<Vec<String>> {
    let mut conn = redis().await?;
    redis::cmd("ZRANGEBYSCORE")
        .arg(format!("{PREFIX}presence:{PRESENCE_KEY}"))
        .arg(since)
        .arg("+inf")
        .query_async::<Vec<String>>(&mut conn)
        .await
        .ok()
}

/// pydantic / `isoformat()` of an aware UTC datetime: `+00:00` suffix.
fn iso_utc(t: Timestamp) -> String {
    let z = crate::db::iso_z(t);
    format!("{}+00:00", z.trim_end_matches('Z'))
}

fn utc_date(t: Timestamp) -> Date {
    t.to_zoned(TimeZone::UTC).date()
}

fn utc_midnight(d: Date) -> Timestamp {
    d.to_zoned(TimeZone::UTC)
        .map_or(Timestamp::UNIX_EPOCH, |z| z.timestamp())
}

fn days(n: i64) -> SignedDuration {
    SignedDuration::from_hours(24 * n)
}

/// `live`: installs with the app open now and in the last 15 / 60 minutes.
pub async fn live() -> Value {
    let at = Timestamp::now();
    #[expect(
        clippy::cast_precision_loss,
        reason = "Unix microseconds as float seconds"
    )]
    let secs = at.as_microsecond() as f64 / 1e6;
    let mut out = serde_json::Map::new();
    for (key, window) in [
        ("online_now", ONLINE_WINDOW_S),
        ("last_15m", 15 * 60),
        ("last_60m", 60 * 60),
    ] {
        #[expect(clippy::cast_precision_loss, reason = "a small window in seconds")]
        let since = secs - window as f64;
        let v = match presence_members(since).await {
            None => Value::Null,
            Some(members) => {
                let mut ios = 0;
                let mut android = 0;
                for m in &members {
                    match m.split(':').next() {
                        Some("ios") => ios += 1,
                        Some("android") => android += 1,
                        _ => {}
                    }
                }
                json!({"total": members.len(), "ios": ios, "android": android})
            }
        };
        out.insert(key.to_owned(), v);
    }
    out.insert("as_of".to_owned(), json!(iso_utc(at)));
    Value::Object(out)
}

fn clip(v: Option<&str>, n: usize) -> Option<String> {
    let s: String = v.unwrap_or("").trim().chars().take(n).collect();
    (!s.is_empty()).then_some(s)
}

/// What an install report carried.
#[derive(Debug, Clone)]
pub struct Report<'a> {
    /// The install's random UUID.
    pub installation_id: &'a str,
    /// `ios` / `android`.
    pub platform: &'a str,
    /// App version.
    pub app_version: Option<&'a str>,
    /// OS version.
    pub os_version: Option<&'a str>,
    /// Cloudflare's country header.
    pub country_code: Option<&'a str>,
    /// The signed-in account, if a valid token came along.
    pub user_id: Option<String>,
}

/// Which install events a query reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Events {
    /// `first_open` and `app_open`.
    Opens,
    /// Every event.
    All,
}

impl Accounts {
    /// `record_seen`: registers the install or refreshes it; whether it was new.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn record_seen(&self, r: &Report<'_>) -> Result<bool, AccountError> {
        let at = now();
        let app_version = clip(r.app_version, 32);
        let os_version = clip(r.os_version, 32);
        let country = r.country_code.unwrap_or("").trim().to_uppercase();
        let country = (country.chars().count() == 2
            && country.chars().all(char::is_alphabetic)
            && country != "XX")
            .then_some(country);
        let mut c = self.client().await?;
        let tx = c.transaction().await?;
        let row = tx
            .query_opt(
                "SELECT app_version, last_seen_at FROM app_installations WHERE installation_id = $1 FOR UPDATE",
                &[&r.installation_id],
            )
            .await?;
        let mut events = Vec::new();
        match row {
            None => {
                let inserted = tx
                    .execute(
                        "INSERT INTO app_installations (id, installation_id, platform, app_version, os_version, \
                         country_code, user_id, is_active, first_seen_at, last_seen_at) \
                         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8) ON CONFLICT (installation_id) DO NOTHING",
                        &[&new_id(), &r.installation_id, &r.platform, &app_version, &os_version, &country, &r.user_id, &sys(at)],
                    )
                    .await?;
                if inserted == 0 {
                    // Another first report registered it.
                    return Ok(false);
                }
                events.push("first_open");
            }
            Some(row) => {
                let old_version: Option<String> = row.get(0);
                if let (Some(new), Some(old)) = (&app_version, &old_version)
                    && new != old
                {
                    events.push("app_update");
                }
                if utc_date(ts(row.get(1))) < utc_date(at) {
                    events.push("app_open");
                }
                tx.execute(
                    "UPDATE app_installations SET platform = $2, app_version = COALESCE($3, app_version), \
                     os_version = COALESCE($4, os_version), country_code = COALESCE($5, country_code), \
                     user_id = COALESCE($6, user_id), is_active = true, last_seen_at = $7 WHERE installation_id = $1",
                    &[&r.installation_id, &r.platform, &app_version, &os_version, &country, &r.user_id, &sys(at)],
                )
                .await?;
            }
        }
        for event in &events {
            tx.execute(
                "INSERT INTO app_installation_events (id, installation_id, event_type, app_version, created_at) \
                 VALUES ($1, $2, $3, $4, $5)",
                &[&new_id(), &r.installation_id, event, &app_version, &sys(at)],
            )
            .await?;
        }
        tx.commit().await?;
        Ok(events.contains(&"first_open"))
    }

    /// `record_session`: one app open on today's running total.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn record_session(&self, platform: &str) -> Result<(), AccountError> {
        let day = utc_date(now()).to_string();
        let c = self.client().await?;
        c.execute(
            "INSERT INTO app_daily_sessions (id, day, platform, sessions) VALUES ($1, $2, $3, 1) \
             ON CONFLICT (day, platform) DO UPDATE SET sessions = app_daily_sessions.sessions + 1",
            &[&new_id(), &day, &platform],
        )
        .await?;
        Ok(())
    }

    async fn count(
        &self,
        filter: &str,
        at: Option<Timestamp>,
        text: Option<&str>,
    ) -> Result<i64, AccountError> {
        let c = self.client().await?;
        let sql = format!("SELECT count(*) FROM app_installations{filter}");
        let row = match (at, text) {
            (Some(t), _) => c.query_one(&sql, &[&sys(t)]).await?,
            (None, Some(s)) => c.query_one(&sql, &[&s]).await?,
            (None, None) => c.query_one(&sql, &[]).await?,
        };
        Ok(row.get(0))
    }

    async fn sessions_by_day(
        &self,
        since: Date,
    ) -> Result<BTreeMap<String, HashMap<String, i64>>, AccountError> {
        let c = self.client().await?;
        let rows = c
            .query(
                "SELECT day, platform, sessions FROM app_daily_sessions WHERE day >= $1",
                &[&since.to_string()],
            )
            .await?;
        let mut out: BTreeMap<String, HashMap<String, i64>> = BTreeMap::new();
        for r in rows {
            let n: i32 = r.get(2);
            out.entry(r.get(0))
                .or_default()
                .insert(r.get(1), i64::from(n));
        }
        Ok(out)
    }

    async fn event_rows(
        &self,
        since: Timestamp,
        which: Events,
    ) -> Result<Vec<(String, String, Timestamp)>, AccountError> {
        let c = self.client().await?;
        let sql = if which == Events::Opens {
            "SELECT installation_id, event_type, created_at FROM app_installation_events \
             WHERE created_at >= $1 AND event_type IN ('first_open', 'app_open')"
        } else {
            "SELECT installation_id, event_type, created_at FROM app_installation_events WHERE created_at >= $1"
        };
        let rows = c.query(sql, &[&sys(since)]).await?;
        Ok(rows
            .iter()
            .map(|r| (r.get(0), r.get(1), ts(r.get(2))))
            .collect())
    }

    async fn retention(&self, at: Timestamp) -> Result<Value, AccountError> {
        let lookback = 90;
        let today = utc_date(at);
        let since = utc_midnight(today.saturating_sub(days(lookback + 30)));
        let mut first: HashMap<String, Date> = HashMap::new();
        let mut open_days: HashMap<String, HashSet<Date>> = HashMap::new();
        for (id, kind, created) in self.event_rows(since, Events::Opens).await? {
            let day = utc_date(created);
            open_days.entry(id.clone()).or_default().insert(day);
            if kind == "first_open" {
                first.insert(id, day);
            }
        }
        let mut out = serde_json::Map::new();
        for n in [1, 7, 30] {
            let lo = today.saturating_sub(days(lookback));
            let hi = today.saturating_sub(days(n));
            let cohort: Vec<&String> = first
                .iter()
                .filter(|(_, d)| lo <= **d && **d <= hi)
                .map(|(i, _)| i)
                .collect();
            let kept = cohort
                .iter()
                .filter(|i| {
                    let target = first[**i].saturating_add(days(n));
                    open_days.get(**i).is_some_and(|s| s.contains(&target))
                })
                .count();
            #[expect(clippy::cast_precision_loss, reason = "small counts")]
            let rate = (!cohort.is_empty()).then(|| kept as f64 / cohort.len() as f64);
            out.insert(
                format!("d{n}"),
                json!({"rate": rate, "retained": kept, "cohort": cohort.len()}),
            );
        }
        Ok(Value::Object(out))
    }

    /// `overview`.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn analytics_overview(&self) -> Result<Value, AccountError> {
        let at = Timestamp::now();
        let today = utc_midnight(utc_date(at));
        let seen = |n: i64| at - days(n);
        let total = self.count("", None, None).await?;
        let day_active = self
            .count(" WHERE last_seen_at >= $1", Some(seen(1)), None)
            .await?;
        let week_active = self
            .count(" WHERE last_seen_at >= $1", Some(seen(7)), None)
            .await?;
        let month_active = self
            .count(" WHERE last_seen_at >= $1", Some(seen(30)), None)
            .await?;
        let sessions = self
            .sessions_by_day(utc_date(at).saturating_sub(days(6)))
            .await?;
        let today_key = utc_date(at).to_string();
        let sessions_today: i64 = sessions.get(&today_key).map_or(0, |d| d.values().sum());
        let sessions_7d: i64 = sessions.values().map(|d| d.values().sum::<i64>()).sum();
        #[expect(clippy::cast_precision_loss, reason = "small counts")]
        let ratio = |a: i64, b: i64, places: i32| -> Value {
            if b == 0 {
                Value::Null
            } else {
                let scale = 10f64.powi(places);
                json!(crate::analytics::py_round(a as f64 / b as f64 * scale) / scale)
            }
        };
        Ok(json!({
            "total_installations": total,
            "active_24h": day_active,
            "active_7d": week_active,
            "active_30d": month_active,
            "android": self.count(" WHERE platform = $1", None, Some("android")).await?,
            "ios": self.count(" WHERE platform = $1", None, Some("ios")).await?,
            "new_today": self.count(" WHERE first_seen_at >= $1", Some(today), None).await?,
            "new_7d": self.count(" WHERE first_seen_at >= $1", Some(today - days(6)), None).await?,
            "signed_in": self.count(" WHERE user_id IS NOT NULL", None, None).await?,
            "lapsed_30d": total - month_active,
            "sessions_today": sessions_today,
            "sessions_7d": sessions_7d,
            "sessions_per_active_today": ratio(sessions_today, day_active, 2),
            "dau_mau": ratio(day_active, month_active, 3),
            "retention": self.retention(at).await?,
            "as_of": iso_utc(at),
        }))
    }

    /// `daily`: per UTC day, oldest first.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn analytics_daily(&self, n_days: i64) -> Result<Value, AccountError> {
        let at = Timestamp::now();
        let first_day = utc_date(at).saturating_sub(days(n_days - 1));
        let rows = self
            .event_rows(utc_midnight(first_day), Events::All)
            .await?;
        let sessions = self.sessions_by_day(first_day).await?;
        let mut new: HashMap<Date, HashSet<String>> = HashMap::new();
        let mut active: HashMap<Date, HashSet<String>> = HashMap::new();
        let mut updates: HashMap<Date, i64> = HashMap::new();
        for (id, kind, created) in rows {
            let day = utc_date(created);
            if kind == "app_update" {
                *updates.entry(day).or_default() += 1;
                continue;
            }
            active.entry(day).or_default().insert(id.clone());
            if kind == "first_open" {
                new.entry(day).or_default().insert(id);
            }
        }
        let out: Vec<Value> = (0..n_days)
            .map(|i| {
                let day = first_day.saturating_add(days(i));
                json!({
                    "date": day.to_string(),
                    "new_installations": new.get(&day).map_or(0, HashSet::len),
                    "active_installations": active.get(&day).map_or(0, HashSet::len),
                    "app_updates": updates.get(&day).copied().unwrap_or(0),
                    "sessions": sessions.get(&day.to_string()).map_or(0, |d| d.values().sum::<i64>()),
                })
            })
            .collect();
        Ok(json!({ "days": out }))
    }

    /// `platforms`: installs by platform, app version and country.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn analytics_platforms(&self) -> Result<Value, AccountError> {
        let recent = Timestamp::now() - days(30);
        let mut out = serde_json::Map::new();
        for (key, column) in [
            ("platforms", "platform"),
            ("app_versions", "app_version"),
            ("countries", "country_code"),
        ] {
            let c = self.client().await?;
            let rows = c
                .query(
                    &format!("SELECT {column}, last_seen_at FROM app_installations"),
                    &[],
                )
                .await?;
            // Insertion order, as Python's dict, then a stable sort by count.
            let mut order: Vec<String> = Vec::new();
            let mut totals: HashMap<String, (i64, i64)> = HashMap::new();
            for r in rows {
                let value: Option<String> = r.get(0);
                let value = value
                    .filter(|v| !v.is_empty())
                    .unwrap_or_else(|| "unknown".to_owned());
                if !totals.contains_key(&value) {
                    order.push(value.clone());
                }
                let entry = totals.entry(value).or_default();
                entry.0 += 1;
                if ts(r.get(1)) >= recent {
                    entry.1 += 1;
                }
            }
            order.sort_by_key(|v| -totals[v].0);
            let list: Vec<Value> = order
                .iter()
                .map(|v| json!({"value": v, "installations": totals[v].0, "active_30d": totals[v].1}))
                .collect();
            out.insert(key.to_owned(), Value::Array(list));
        }
        Ok(Value::Object(out))
    }
}

/// Python's `round(x)` to the nearest integer, ties to even (applied to scaled values).
#[must_use]
pub fn py_round(x: f64) -> f64 {
    let r = x.round();
    let tie = ((x - x.trunc()).abs() - 0.5).abs() < f64::EPSILON;
    if tie && (r / 2.0).fract().abs() > f64::EPSILON {
        r - x.signum()
    } else {
        r
    }
}
