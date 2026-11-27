//! NEPSE share prices, live during trading hours, with every change saved.
//!
//! merolagani.com's market summary (every traded scrip with its open, high, low, last
//! price and volume) is read every 30 seconds while the market is open and every 15
//! minutes otherwise. Each read saves, in one SQLite file, a tick for every scrip whose
//! last price or volume changed (the intraday chart) and the day's row per scrip (daily
//! and long-term history). Daily history from before the first recorded day is read
//! once per scrip from merolagani's chart feed.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex, OnceLock},
    time::Duration,
};

use jiff::{Timestamp, civil, tz::Offset};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

const SUMMARY_URL: &str =
    "https://merolagani.com/handlers/webrequesthandler.ashx?type=market_summary";
const CHART_URL: &str = "https://merolagani.com/handlers/TechnicalChartHandler.ashx";
const NAMES_URL: &str = "https://merolagani.com/handlers/AutoSuggestHandler.ashx?type=Company";
/// Nepal Standard Time, UTC+05:45 all year.
const NPT_SECONDS: i32 = 5 * 3600 + 45 * 60;
/// Reads this often while trading is (about to be) open…
const POLL_OPEN: Duration = Duration::from_secs(30);
/// …and this often otherwise, so a restart or a late close is still picked up.
const POLL_CLOSED: Duration = Duration::from_secs(15 * 60);
/// Company names are read again after this long.
const NAMES_REFRESH_SECS: i64 = 24 * 3600;
/// The background backfill starts this long after start-up (after the first read)…
const BACKFILL_START: Duration = Duration::from_secs(60);
/// …and waits this long between scrips.
const BACKFILL_GAP: Duration = Duration::from_secs(2);
/// Daily history is backfilled from this day (NEPSE's online records start around 2000).
const BACKFILL_FROM: i64 = 946_684_800;
/// Prices older than this (seconds since the last good read) are not served while trading is
/// on: six missed 30-second reads.
const STALE_OPEN_SECS: i64 = 180;
/// …and outside trading: three missed 15-minute reads.
const STALE_CLOSED_SECS: i64 = 45 * 60;
/// The error log goes up after this many failed reads in a row.
const FAILURES_BEFORE_ERROR: u32 = 3;

/// One scrip's quote, as the app shows it.
#[derive(Debug, Clone, Serialize)]
pub struct Quote {
    /// Ticker, such as `NABIL`.
    pub symbol: String,
    /// Company name, when known.
    pub name: Option<String>,
    /// Last traded price.
    pub ltp: f64,
    /// Change from the previous close.
    pub change: f64,
    /// Change in percent.
    pub percent: f64,
    /// The day's open, high and low.
    pub open: f64,
    /// Day high.
    pub high: f64,
    /// Day low.
    pub low: f64,
    /// Previous close.
    pub prev_close: f64,
    /// Shares traded today.
    pub volume: f64,
    /// Rupees traded today.
    pub turnover: f64,
}

/// The whole market at one moment.
#[derive(Debug, Clone, Default, Serialize)]
pub struct Live {
    /// The data's own time (Nepal), such as `2026-11-26T15:00:00+05:45`.
    pub as_of: Option<String>,
    /// Trading day of the data, `YYYY-MM-DD`.
    pub date: Option<String>,
    /// Unix seconds of the read.
    pub fetched_at: i64,
    /// Trading is open now and the data is today's.
    pub market_open: bool,
    /// Rupees traded today.
    pub turnover: f64,
    /// Shares traded today.
    pub volume: f64,
    /// Transactions today.
    pub transactions: f64,
    /// Scrips traded today.
    pub scrips: usize,
    /// Every traded scrip, by turnover.
    pub stocks: Vec<Quote>,
    /// The feed stopped (merolagani changed or blocked the read): no prices are sent, and the
    /// apps hide every share price rather than show old ones as current.
    pub stale: bool,
}

impl Live {
    /// Whether the last good read is too old to show, at unix second `now`.
    #[must_use]
    pub fn is_stale(&self, now: Timestamp) -> bool {
        let limit = if self.market_open || trading_window(now) {
            STALE_OPEN_SECS
        } else {
            STALE_CLOSED_SECS
        };
        self.fetched_at == 0 || now.as_second() - self.fetched_at > limit
    }

    /// What is served when [`Self::is_stale`]: the flag and the read time, no prices.
    #[must_use]
    pub fn stale_marker(&self) -> Self {
        Self {
            fetched_at: self.fetched_at,
            stale: true,
            ..Self::default()
        }
    }
}

/// The shared NEPSE recorder. Clones share one store.
#[derive(Debug, Clone)]
pub struct NepseService {
    inner: Arc<Inner>,
}

#[derive(Debug)]
struct Inner {
    client: reqwest::Client,
    latest: RwLock<Arc<Live>>,
    names: RwLock<(i64, Arc<HashMap<String, String>>)>,
    db: OnceLock<Option<Mutex<Connection>>>,
}

impl Default for NepseService {
    fn default() -> Self {
        Self::new()
    }
}

impl NepseService {
    /// Builds the service; nothing is read until [`Self::spawn_recorder`] or a request.
    #[must_use]
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent("Mozilla/5.0 (compatible; VedicPatro/0.1; +https://vedicpatro.com)")
            .build()
            .unwrap_or_default();
        Self {
            inner: Arc::new(Inner {
                client,
                latest: RwLock::new(Arc::new(Live::default())),
                names: RwLock::new((0, Arc::new(HashMap::new()))),
                db: OnceLock::new(),
            }),
        }
    }

    /// Starts the background reader that records prices for the life of the server.
    pub fn spawn_recorder(&self) {
        let backfill = self.clone();
        tokio::spawn(async move {
            // Every traded scrip's history, one every few seconds so merolagani is never
            // hammered; the period rankings (a week to five years) need all of them.
            tokio::time::sleep(BACKFILL_START).await;
            let symbols: Vec<String> = backfill
                .inner
                .latest
                .read()
                .await
                .stocks
                .iter()
                .map(|q| q.symbol.clone())
                .collect();
            for symbol in symbols {
                if let Err(error) = backfill.ensure_backfilled(&symbol).await {
                    tracing::warn!(%error, symbol, "NEPSE backfill failed");
                }
                tokio::time::sleep(BACKFILL_GAP).await;
            }
        });
        let service = self.clone();
        tokio::spawn(async move {
            let mut failures = 0_u32;
            loop {
                match service.poll().await {
                    Ok(()) => failures = 0,
                    Err(error) => {
                        failures += 1;
                        if failures >= FAILURES_BEFORE_ERROR {
                            tracing::error!(%error, failures, "NEPSE reads keep failing; share prices are hidden once stale");
                        } else {
                            tracing::warn!(%error, "NEPSE read failed");
                        }
                    }
                }
                tokio::time::sleep(poll_wait(Timestamp::now())).await;
            }
        });
    }

    /// The latest market; read now if nothing has been read yet.
    ///
    /// # Errors
    ///
    /// The first read failed.
    pub async fn live(&self) -> Result<Arc<Live>, String> {
        let current = Arc::clone(&*self.inner.latest.read().await);
        if current.fetched_at != 0 {
            return Ok(current);
        }
        self.poll().await?;
        Ok(Arc::clone(&*self.inner.latest.read().await))
    }

    /// Whether `symbol` is a listed (or at least traded) scrip.
    pub async fn knows(&self, symbol: &str) -> bool {
        let names = self.names().await;
        if names.contains_key(symbol) {
            return true;
        }
        self.inner
            .latest
            .read()
            .await
            .stocks
            .iter()
            .any(|q| q.symbol == symbol)
    }

    /// One trading day's price points `[unix seconds, price, cumulative volume]`, oldest
    /// first. Days before recording began come from merolagani's trade feed.
    ///
    /// # Errors
    ///
    /// Neither the store nor merolagani could be read.
    #[expect(
        clippy::cast_precision_loss,
        reason = "unix seconds fit in f64 exactly"
    )]
    pub async fn intraday(&self, symbol: &str, date: civil::Date) -> Result<Vec<[f64; 3]>, String> {
        let start = date
            .to_zoned(npt().to_time_zone())
            .map_err(|e| e.to_string())?
            .timestamp()
            .as_second();
        let end = start + 24 * 3600;
        let service = self.clone();
        let sym = symbol.to_owned();
        let stored = tokio::task::spawn_blocking(move || {
            service.with_db(|db| {
                let mut stmt = db.prepare_cached(
                    "SELECT ts, ltp, volume FROM ticks WHERE symbol = ?1 AND ts >= ?2 AND ts < ?3 ORDER BY ts",
                )?;
                let rows = stmt.query_map(params![sym, start, end], |r| {
                    Ok([r.get::<_, i64>(0)? as f64, r.get(1)?, r.get(2)?])
                })?;
                rows.collect::<rusqlite::Result<Vec<_>>>()
            })
        })
        .await
        .map_err(|e| e.to_string())??;
        if !stored.is_empty() {
            return Ok(stored);
        }
        let chart = self.chart(symbol, "1", start, end).await?;
        let mut volume = 0.0;
        Ok(chart
            .t
            .iter()
            .zip(&chart.c)
            .zip(&chart.v)
            .filter(|((t, _), _)| (start..end).contains(t))
            .map(|((t, c), v)| {
                volume += v;
                [*t as f64, *c, volume]
            })
            .collect())
    }

    /// Every stored day `[date, open, high, low, close, volume]`, oldest first; the first
    /// request for a scrip backfills its history from merolagani.
    ///
    /// # Errors
    ///
    /// The store could not be read.
    pub async fn daily(&self, symbol: &str) -> Result<Vec<DailyRow>, String> {
        self.ensure_backfilled(symbol).await?;
        let service = self.clone();
        let sym = symbol.to_owned();
        tokio::task::spawn_blocking(move || {
            service.with_db(|db| {
                let mut stmt = db.prepare_cached(
                    "SELECT date, open, high, low, close, volume FROM daily WHERE symbol = ?1 ORDER BY date",
                )?;
                let rows = stmt.query_map([&sym], |r| {
                    Ok(DailyRow(
                        r.get(0)?,
                        r.get(1)?,
                        r.get(2)?,
                        r.get(3)?,
                        r.get(4)?,
                        r.get(5)?,
                    ))
                })?;
                rows.collect()
            })
        })
        .await
        .map_err(|e| e.to_string())?
    }

    /// Every scrip over the last `days` calendar days: `[symbol, close before the window,
    /// shares traded in it, rupees traded in it]`, plus the window's first day. Rupees for
    /// backfilled days (which carry no turnover) are close × volume.
    ///
    /// # Errors
    ///
    /// The store could not be read.
    pub async fn period(&self, days: u32) -> Result<(Option<String>, Vec<PeriodRow>), String> {
        let service = self.clone();
        tokio::task::spawn_blocking(move || service.with_db(|db| period_rows(db, days)))
            .await
            .map_err(|e| e.to_string())?
    }

    /// Reads a scrip's daily history from merolagani once; later calls return at once.
    async fn ensure_backfilled(&self, symbol: &str) -> Result<(), String> {
        let service = self.clone();
        let sym = symbol.to_owned();
        let backfilled = tokio::task::spawn_blocking(move || {
            service.with_db(|db| {
                db.query_row("SELECT 1 FROM backfilled WHERE symbol = ?1", [&sym], |_| {
                    Ok(())
                })
                .map(|()| true)
                .or_else(|e| {
                    if e == rusqlite::Error::QueryReturnedNoRows {
                        Ok(false)
                    } else {
                        Err(e)
                    }
                })
            })
        })
        .await
        .map_err(|e| e.to_string())??;
        if !backfilled {
            match self
                .chart(symbol, "1D", BACKFILL_FROM, Timestamp::now().as_second())
                .await
            {
                Ok(chart) => self.save_backfill(symbol, chart).await?,
                // Recorded days are still served; the next request tries again.
                Err(error) => tracing::warn!(%error, symbol, "NEPSE history backfill failed"),
            }
        }
        Ok(())
    }

    async fn save_backfill(&self, symbol: &str, chart: Chart) -> Result<(), String> {
        let service = self.clone();
        let sym = symbol.to_owned();
        tokio::task::spawn_blocking(move || {
            service.with_db(|db| {
                let tx = db.unchecked_transaction()?;
                {
                    let mut stmt = tx.prepare_cached(
                        "INSERT OR IGNORE INTO daily (symbol, date, open, high, low, close, volume) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    )?;
                    for i in 0..chart.t.len().min(chart.o.len()).min(chart.h.len()).min(chart.l.len()).min(chart.c.len()).min(chart.v.len()) {
                        // Daily bars carry an evening UTC time of their own trading day.
                        let date = Timestamp::from_second(chart.t[i])
                            .unwrap_or(Timestamp::UNIX_EPOCH)
                            .to_zoned(jiff::tz::TimeZone::UTC)
                            .date()
                            .to_string();
                        stmt.execute(params![sym, date, chart.o[i], chart.h[i], chart.l[i], chart.c[i], chart.v[i]])?;
                    }
                }
                tx.execute(
                    "INSERT OR REPLACE INTO backfilled (symbol, at) VALUES (?1, ?2)",
                    params![sym, Timestamp::now().as_second()],
                )?;
                tx.commit()
            })
        })
        .await
        .map_err(|e| e.to_string())?
    }

    async fn chart(
        &self,
        symbol: &str,
        resolution: &str,
        from: i64,
        to: i64,
    ) -> Result<Chart, String> {
        let chart: Chart = self
            .inner
            .client
            .get(CHART_URL)
            .query(&[
                ("type", "get_advanced_chart"),
                ("symbol", symbol),
                ("resolution", resolution),
                ("rangeStartDate", &from.to_string()),
                ("rangeEndDate", &to.to_string()),
                ("isAdjust", "0"),
                ("currencyCode", "NPR"),
            ])
            .send()
            .await
            .and_then(reqwest::Response::error_for_status)
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?;
        Ok(chart)
    }

    async fn names(&self) -> Arc<HashMap<String, String>> {
        let (at, names) = self.inner.names.read().await.clone();
        let now = Timestamp::now().as_second();
        if now - at < NAMES_REFRESH_SECS {
            return names;
        }
        let read = async {
            let list: Vec<NameRow> = self
                .inner
                .client
                .get(NAMES_URL)
                .send()
                .await?
                .error_for_status()?
                .json()
                .await?;
            Ok::<_, reqwest::Error>(list)
        };
        match read.await {
            Ok(list) => {
                let map: HashMap<String, String> = list
                    .into_iter()
                    .map(|row| {
                        // "ADBL (Agriculture Development Bank Limited)"
                        let name = row
                            .l
                            .split_once(" (")
                            .map_or(row.l.as_str(), |(_, rest)| {
                                rest.strip_suffix(')').unwrap_or(rest)
                            })
                            .to_owned();
                        (row.d, name)
                    })
                    .collect();
                let map = Arc::new(map);
                *self.inner.names.write().await = (now, Arc::clone(&map));
                map
            }
            Err(error) => {
                tracing::warn!(%error, "NEPSE company names read failed");
                // Try again in an hour, not on every request.
                *self.inner.names.write().await =
                    (now - NAMES_REFRESH_SECS + 3600, Arc::clone(&names));
                names
            }
        }
    }

    /// Reads the market once, saves what changed and swaps in the new snapshot.
    async fn poll(&self) -> Result<(), String> {
        let body = self
            .inner
            .client
            .get(SUMMARY_URL)
            .send()
            .await
            .and_then(reqwest::Response::error_for_status)
            .map_err(|e| e.to_string())?
            .text()
            .await
            .map_err(|e| e.to_string())?;
        let now = Timestamp::now();
        let names = self.names().await;
        let live = parse_summary(&body, now, &names)?;
        // A changed handler can still answer "ok" with nothing in it; that is a failed read.
        if live.stocks.is_empty() {
            return Err("market summary has no scrips".into());
        }
        let live = Arc::new(live);
        let service = self.clone();
        let snapshot = Arc::clone(&live);
        tokio::task::spawn_blocking(move || service.with_db(|db| save(db, &snapshot, now)))
            .await
            .map_err(|e| e.to_string())??;
        *self.inner.latest.write().await = live;
        Ok(())
    }

    /// Runs `f` on the store, opening it on first use (`PATRO_RS_NEPSE_DB`, default
    /// `nepse.sqlite` in the working directory).
    fn with_db<T>(&self, f: impl FnOnce(&Connection) -> rusqlite::Result<T>) -> Result<T, String> {
        let db = self.inner.db.get_or_init(|| {
            let path = std::env::var("PATRO_RS_NEPSE_DB").unwrap_or_else(|_| "nepse.sqlite".into());
            match open(&path) {
                Ok(conn) => Some(Mutex::new(conn)),
                Err(error) => {
                    tracing::error!(%error, path, "NEPSE store not opened");
                    None
                }
            }
        });
        let conn = db
            .as_ref()
            .ok_or("NEPSE store unavailable")?
            .lock()
            .map_err(|_| "NEPSE store lock poisoned")?;
        f(&conn).map_err(|e| e.to_string())
    }
}

/// `[symbol, close before the window, shares traded, rupees traded]`.
#[derive(Debug, Serialize)]
pub struct PeriodRow(String, Option<f64>, f64, f64);

/// The period query: see [`NepseService::period`].
fn period_rows(db: &Connection, days: u32) -> rusqlite::Result<(Option<String>, Vec<PeriodRow>)> {
    let last: Option<String> = db.query_row("SELECT MAX(date) FROM daily", [], |r| r.get(0))?;
    let Some(last) = last else {
        return Ok((None, Vec::new()));
    };
    let from = civil_shift(&last, -i64::from(days));
    let mut stmt = db.prepare_cached(
        "SELECT d.symbol,
            (SELECT b.close FROM daily b WHERE b.symbol = d.symbol AND b.date <= ?1
             ORDER BY b.date DESC LIMIT 1),
            SUM(d.volume), SUM(COALESCE(d.turnover, d.close * d.volume))
         FROM daily d WHERE d.date > ?1 GROUP BY d.symbol",
    )?;
    let rows = stmt
        .query_map([&from], |r| {
            Ok(PeriodRow(
                r.get(0)?,
                r.get(1)?,
                r.get::<_, Option<f64>>(2)?.unwrap_or(0.0),
                r.get::<_, Option<f64>>(3)?.unwrap_or(0.0),
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok((Some(from), rows))
}

/// `YYYY-MM-DD` moved by `days` (negative goes back).
fn civil_shift(date: &str, days: i64) -> String {
    date.parse::<civil::Date>()
        .ok()
        .and_then(|d| d.checked_add(jiff::Span::new().days(days)).ok())
        .map_or_else(|| date.to_owned(), |d| d.to_string())
}

/// `[date, open, high, low, close, volume]`.
#[derive(Debug, Serialize)]
pub struct DailyRow(String, f64, f64, f64, f64, f64);

fn open(path: &str) -> rusqlite::Result<Connection> {
    let db = Connection::open(path)?;
    db.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         CREATE TABLE IF NOT EXISTS ticks (
             symbol TEXT NOT NULL, ts INTEGER NOT NULL,
             ltp REAL NOT NULL, volume REAL NOT NULL, turnover REAL NOT NULL,
             PRIMARY KEY (symbol, ts)) WITHOUT ROWID;
         CREATE TABLE IF NOT EXISTS daily (
             symbol TEXT NOT NULL, date TEXT NOT NULL,
             open REAL, high REAL, low REAL, close REAL, volume REAL,
             turnover REAL, prev_close REAL,
             PRIMARY KEY (symbol, date)) WITHOUT ROWID;
         CREATE TABLE IF NOT EXISTS backfilled (symbol TEXT PRIMARY KEY, at INTEGER NOT NULL);",
    )?;
    Ok(db)
}

/// Saves the day's row of every scrip and, on a trading day, a tick for every scrip whose
/// price or volume moved since its last tick.
fn save(db: &Connection, live: &Live, now: Timestamp) -> rusqlite::Result<()> {
    let Some(date) = live.date.as_deref() else {
        return Ok(());
    };
    let today = npt_date(now.as_second()).to_string();
    let tx = db.unchecked_transaction()?;
    {
        let mut day = tx.prepare_cached(
            "INSERT INTO daily (symbol, date, open, high, low, close, volume, turnover, prev_close)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT (symbol, date) DO UPDATE SET open = ?3, high = ?4, low = ?5, close = ?6,
                 volume = ?7, turnover = ?8, prev_close = ?9",
        )?;
        let mut tick = tx.prepare_cached(
            "INSERT OR IGNORE INTO ticks (symbol, ts, ltp, volume, turnover)
             SELECT ?1, ?2, ?3, ?4, ?5 WHERE NOT EXISTS (
                 SELECT 1 FROM (SELECT ltp, volume FROM ticks WHERE symbol = ?1 ORDER BY ts DESC LIMIT 1)
                 WHERE ltp = ?3 AND volume = ?4)",
        )?;
        for q in &live.stocks {
            day.execute(params![
                q.symbol,
                date,
                q.open,
                q.high,
                q.low,
                q.ltp,
                q.volume,
                q.turnover,
                q.prev_close
            ])?;
            // Figures re-read on a holiday, before the open or after the close are not ticks.
            if date == today && trading_window(now) {
                tick.execute(params![
                    q.symbol,
                    now.as_second(),
                    q.ltp,
                    q.volume,
                    q.turnover
                ])?;
            }
        }
    }
    tx.commit()
}

#[derive(Deserialize)]
struct Summary {
    mt: String,
    overall: Overall,
    turnover: List<Turnover>,
    stock: List<Change>,
}

#[derive(Deserialize)]
struct Overall {
    d: String,
    t: String,
    q: String,
    tn: String,
}

#[derive(Deserialize)]
struct List<T> {
    detail: Vec<T>,
}

#[derive(Deserialize)]
struct Turnover {
    s: String,
    lp: f64,
    t: f64,
    pc: f64,
    h: f64,
    l: f64,
    op: f64,
    q: f64,
}

#[derive(Deserialize)]
struct Change {
    s: String,
    c: f64,
}

#[derive(Deserialize)]
struct NameRow {
    l: String,
    d: String,
}

/// merolagani's chart feed (`TradingView` UDF bars).
#[derive(Debug, Default, Deserialize)]
struct Chart {
    #[serde(default)]
    t: Vec<i64>,
    #[serde(default)]
    o: Vec<f64>,
    #[serde(default)]
    h: Vec<f64>,
    #[serde(default)]
    l: Vec<f64>,
    #[serde(default)]
    c: Vec<f64>,
    #[serde(default)]
    v: Vec<f64>,
}

fn parse_summary(
    body: &str,
    now: Timestamp,
    names: &HashMap<String, String>,
) -> Result<Live, String> {
    let raw: Summary = serde_json::from_str(body).map_err(|e| format!("market summary: {e}"))?;
    if raw.mt != "ok" {
        return Err(format!("market summary status {}", raw.mt));
    }
    let changes: HashMap<&str, f64> = raw
        .stock
        .detail
        .iter()
        .map(|c| (c.s.as_str(), c.c))
        .collect();
    let mut stocks: Vec<Quote> = raw
        .turnover
        .detail
        .into_iter()
        .map(|r| {
            // The change list has the rupee change; fall back to the percent.
            let change = changes
                .get(r.s.as_str())
                .copied()
                .unwrap_or_else(|| r.lp - r.lp / (1.0 + r.pc / 100.0));
            Quote {
                name: names.get(&r.s).cloned(),
                symbol: r.s,
                ltp: r.lp,
                change: round2(change),
                percent: r.pc,
                open: r.op,
                high: r.h,
                low: r.l,
                prev_close: round2(r.lp - change),
                volume: r.q,
                turnover: r.t,
            }
        })
        .collect();
    stocks.sort_by(|a, b| b.turnover.total_cmp(&a.turnover));
    let (date, as_of) = parse_as_of(&raw.overall.d).unzip();
    let market_open = trading_hours(now)
        && date.as_deref() == Some(npt_date(now.as_second()).to_string().as_str());
    Ok(Live {
        as_of,
        date,
        fetched_at: now.as_second(),
        market_open,
        turnover: raw.overall.t.parse().unwrap_or(0.0),
        volume: raw.overall.q.parse().unwrap_or(0.0),
        transactions: raw.overall.tn.parse().unwrap_or(0.0),
        scrips: stocks.len(),
        stocks,
        stale: false,
    })
}

/// `"2026/11/26 03:00:00"` (a 12-hour clock without AM/PM) → date and ISO time. Trading
/// runs 11:00–15:00, so an hour before 10 is afternoon.
fn parse_as_of(text: &str) -> Option<(String, String)> {
    let (day, time) = text.trim().split_once(' ')?;
    let mut parts = day.split('/');
    let (y, m, d) = (parts.next()?, parts.next()?, parts.next()?);
    let date = civil::date(y.parse().ok()?, m.parse().ok()?, d.parse().ok()?);
    let mut t = time.split(':');
    let mut hour: i8 = t.next()?.parse().ok()?;
    let minute: i8 = t.next()?.parse().ok()?;
    let second: i8 = t.next().unwrap_or("0").parse().ok()?;
    if hour < 10 {
        hour += 12;
    }
    let time = civil::Time::new(hour, minute, second, 0).ok()?;
    Some((
        date.to_string(),
        format!("{}T{}+05:45", date, time.strftime("%H:%M:%S")),
    ))
}

fn npt() -> Offset {
    Offset::from_seconds(NPT_SECONDS).expect("UTC+05:45 is a valid offset")
}

fn npt_date(unix: i64) -> civil::Date {
    Timestamp::from_second(unix)
        .unwrap_or(Timestamp::UNIX_EPOCH)
        .to_zoned(npt().to_time_zone())
        .date()
}

/// Sunday–Thursday, minutes since midnight in Nepal.
fn npt_clock(now: Timestamp) -> Option<i32> {
    let z = now.to_zoned(npt().to_time_zone());
    let trading_day = !matches!(
        z.weekday(),
        jiff::civil::Weekday::Friday | jiff::civil::Weekday::Saturday
    );
    trading_day.then(|| i32::from(z.hour()) * 60 + i32::from(z.minute()))
}

/// Continuous trading, 11:00–15:00 Nepal time, Sunday–Thursday.
fn trading_hours(now: Timestamp) -> bool {
    npt_clock(now).is_some_and(|m| (11 * 60..15 * 60).contains(&m))
}

/// When to read every 30 seconds: a little before the open until a little after the close.
fn trading_window(now: Timestamp) -> bool {
    npt_clock(now).is_some_and(|m| (10 * 60 + 55..15 * 60 + 10).contains(&m))
}

/// How long to sleep after a read: 30 s in the trading window, else 15 min, but never past
/// the window's start, so the morning's first read is on time.
fn poll_wait(now: Timestamp) -> Duration {
    if trading_window(now) {
        return POLL_OPEN;
    }
    let open = 10 * 60 + 55;
    match npt_clock(now) {
        Some(m) if m < open => POLL_CLOSED.min(Duration::from_secs(
            u64::from((open - m).unsigned_abs()) * 60,
        )),
        _ => POLL_CLOSED,
    }
}

fn round2(x: f64) -> f64 {
    (x * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;

    const BODY: &str = r#"{"mt":"ok","overall":{"d":"2026/11/26 03:00:00","t":"5489584101.96","q":"14710298","tn":"49806","st":"2"},
      "turnover":{"date":"x","detail":[
        {"s":"NABIL","n":"","lp":510.0,"t":1000.0,"pc":1.0,"h":512.0,"l":500.0,"op":505.0,"q":20.0},
        {"s":"HURJA","n":"","lp":291.5,"t":2000.0,"pc":0.14,"h":304.9,"l":290.0,"op":295.3,"q":806043.0}]},
      "stock":{"date":"x","detail":[{"s":"NABIL","lp":510.0,"c":5.0,"q":20.0}]},
      "sector":{"date":"x","detail":[]},"broker":{"date":"x","detail":[]}}"#;

    fn at(iso: &str) -> Timestamp {
        iso.parse().expect("valid timestamp")
    }

    #[test]
    fn stale_after_missed_reads() {
        let names = HashMap::new();
        let read = at("2026-11-26T06:00:00Z"); // 11:45 NPT, Thursday, open
        let live = parse_summary(BODY, read, &names).expect("parses");
        assert!(
            !live.is_stale(at("2026-11-26T06:02:00Z")),
            "two minutes old while open"
        );
        assert!(
            live.is_stale(at("2026-11-26T06:04:00Z")),
            "four minutes old while open"
        );
        let closed = parse_summary(BODY, at("2026-11-28T06:00:00Z"), &names).expect("parses");
        assert!(
            !closed.is_stale(at("2026-11-28T06:30:00Z")),
            "half an hour on Saturday"
        );
        assert!(
            closed.is_stale(at("2026-11-28T07:00:00Z")),
            "an hour on Saturday"
        );
        assert!(Live::default().is_stale(read), "never read");
        let marker = live.stale_marker();
        assert!(
            marker.stale && marker.stocks.is_empty(),
            "no prices when stale"
        );
    }

    #[test]
    fn wakes_at_the_open() {
        // 10:50 NPT Thursday: five minutes to the window.
        assert_eq!(
            poll_wait(at("2026-11-26T05:05:00Z")),
            Duration::from_secs(300)
        );
        assert_eq!(
            poll_wait(at("2026-11-26T05:30:00Z")),
            POLL_OPEN,
            "in the window"
        );
        assert_eq!(
            poll_wait(at("2026-11-26T12:00:00Z")),
            POLL_CLOSED,
            "evening"
        );
    }

    #[test]
    fn parses_summary_and_saves_only_changes() {
        let names = HashMap::from([("NABIL".to_owned(), "Nabil Bank".to_owned())]);
        let now = at("2026-11-26T06:00:00Z"); // 11:45 NPT, Thursday
        let live = parse_summary(BODY, now, &names).expect("parses");
        assert_eq!(
            live.as_of.as_deref(),
            Some("2026-11-26T15:00:00+05:45"),
            "afternoon hour"
        );
        assert!(live.market_open, "Thursday 11:45 with today's data is open");
        assert_eq!(live.stocks[0].symbol, "HURJA", "sorted by turnover");
        let nabil = &live.stocks[1];
        assert_eq!(
            (nabil.prev_close, nabil.name.as_deref()),
            (505.0, Some("Nabil Bank")),
            "prev close from change"
        );

        let db = open(":memory:").expect("opens");
        save(&db, &live, now).expect("saves");
        save(&db, &live, at("2026-11-26T06:00:30Z")).expect("saves again");
        save(&db, &live, at("2026-11-26T13:00:00Z")).expect("saves after the close");
        let ticks: i64 = db
            .query_row("SELECT COUNT(*) FROM ticks", [], |r| r.get(0))
            .expect("counts");
        assert_eq!(ticks, 2, "an unchanged price is not saved twice");
        let days: i64 = db
            .query_row("SELECT COUNT(*) FROM daily", [], |r| r.get(0))
            .expect("counts");
        assert_eq!(days, 2, "one day row per scrip");

        // A Saturday re-read of Thursday's data updates the day row but adds no ticks.
        save(&db, &live, at("2026-11-28T06:00:00Z")).expect("saves");
        let ticks: i64 = db
            .query_row("SELECT COUNT(*) FROM ticks", [], |r| r.get(0))
            .expect("counts");
        assert_eq!(ticks, 2, "no ticks off a trading day");
        assert!(
            !parse_summary(BODY, at("2026-11-28T06:00:00Z"), &names)
                .expect("parses")
                .market_open,
            "Saturday closed"
        );
    }
}
