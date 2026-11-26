//! Crawler-facing HTML for a shared `/panchanga` link (`api/og.py` `share_panchanga`,
//! `services/sharing/share_copy.py`), the `/og-image` card, and `/meta/provenance`
//! (not ported yet).

use std::time::Instant;

use axum::{
    extract::{Query as AxumQuery, State},
    http::{HeaderMap, StatusCode, Uri, header},
    response::Response,
};
use geography::{LocationError, LocationQuery};
use panchanga::daily::Location;
use patro::day::{
    DayBuildOptions, DayError, DetailMode, FestivalMode, SlimMode, day_fields_for_jd_with,
};
use serde_json::{Value, json};
use timescale::CivilDay;

use crate::{
    body::{parse_py_float, parse_py_int},
    respond::{Query, detail, detail_json, raw_payload},
    state::AppState,
};

const HTML_CACHE_CONTROL: &str = "public, max-age=3600, s-maxage=86400";

const AD_MONTHS_NE: [&str; 12] = [
    "जनवरी",
    "फेब्रुअरी",
    "मार्च",
    "अप्रिल",
    "मे",
    "जुन",
    "जुलाई",
    "अगस्ट",
    "सेप्टेम्बर",
    "अक्टोबर",
    "नोभेम्बर",
    "डिसेम्बर",
];

const PLANET_NE: [(&str, &str); 9] = [
    ("sun", "सूर्य"),
    ("moon", "चन्द्र"),
    ("mars", "मंगल"),
    ("mercury", "बुध"),
    ("jupiter", "बृहस्पति"),
    ("venus", "शुक्र"),
    ("saturn", "शनि"),
    ("rahu", "राहु"),
    ("ketu", "केतु"),
];

/// `ne_digits`: ASCII digits to Devanagari.
fn ne_digits(s: &str) -> String {
    s.chars()
        .map(|c| match c.to_digit(10) {
            Some(d) => char::from_u32(0x0966 + d).unwrap_or(c),
            None => c,
        })
        .collect()
}

/// Python `str(value)` of a JSON scalar.
fn py_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Null => "None".into(),
        other => other.to_string(),
    }
}

/// Python truthiness of an optional JSON value.
fn truthy(v: Option<&Value>) -> Option<&Value> {
    v.filter(|v| match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::String(s) => !s.is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Object(o) => !o.is_empty(),
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
    })
}

/// `_name_ne(block)`: the Nepali name of an anga block, `—` when missing.
fn name_ne(block: Option<&Value>) -> String {
    match block {
        Some(Value::Object(_)) => {
            let b = block.unwrap_or(&Value::Null);
            truthy(b.get("name_ne"))
                .or_else(|| truthy(b.get("name")))
                .map_or_else(|| "—".to_owned(), py_str)
        }
        _ => "—".to_owned(),
    }
}

/// The strings the card and the crawler HTML share (`og_fields`).
struct OgFields {
    weekday: String,
    bs_line: String,
    ad_line: String,
    paksha: &'static str,
    tithi: String,
    nakshatra: String,
    yoga: String,
    karana: String,
    sunrise: String,
    sunset: String,
}

fn og_fields(payload: &Value, date_ad: &str) -> OgFields {
    let shukla = payload
        .get("paksha")
        .and_then(Value::as_str)
        .is_some_and(|p| p.to_lowercase().contains("shukla"));
    let bs_line = match truthy(payload.get("bs_date")) {
        Some(bs) => {
            let month = truthy(bs.get("month_name_ne"))
                .or_else(|| truthy(bs.get("month_name")))
                .map_or_else(String::new, py_str);
            let part = |k: &str| bs.get(k).map_or_else(String::new, py_str);
            format!(
                "{month} {}, {}",
                ne_digits(&part("day")),
                ne_digits(&part("year"))
            )
        }
        None => String::new(),
    };
    let ad_line = ad_line(date_ad).unwrap_or_else(|| date_ad.to_owned());
    let sun = payload.get("sun");
    let sun_field =
        |k: &str| truthy(sun.and_then(|s| s.get(k))).map_or_else(|| "—".to_owned(), py_str);
    OgFields {
        weekday: truthy(payload.get("weekday")).map_or_else(String::new, py_str),
        bs_line,
        ad_line,
        paksha: if shukla {
            "शुक्ल पक्ष"
        } else {
            "कृष्ण पक्ष"
        },
        tithi: name_ne(truthy(payload.get("tithi"))),
        nakshatra: name_ne(payload.get("nakshatra")),
        yoga: name_ne(payload.get("yoga")),
        karana: name_ne(payload.get("karana")),
        sunrise: sun_field("sunrise"),
        sunset: sun_field("sunset"),
    }
}

/// Gregorian date as day → month → year in Nepali digits.
fn ad_line(date_ad: &str) -> Option<String> {
    let mut parts = date_ad.split('-');
    let y: i64 = parts.next()?.parse().ok()?;
    let m: usize = parts.next()?.parse().ok()?;
    let d: i64 = parts.next()?.parse().ok()?;
    if parts.next().is_some() {
        return None;
    }
    let month = AD_MONTHS_NE.get(m.checked_sub(1)?)?;
    Some(format!(
        "{} {month} {}",
        ne_digits(&d.to_string()),
        ne_digits(&y.to_string())
    ))
}

fn span(block: Option<&Value>) -> Option<String> {
    let b = truthy(block)?;
    let start = truthy(b.get("start_time"))?;
    let end = truthy(b.get("end_time"))?;
    Some(ne_digits(&format!("{}–{}", py_str(start), py_str(end))))
}

fn periods_summary(payload: &Value) -> String {
    let m = payload.get("muhurta");
    [
        ("अभिजित् मुहूर्त", "abhijit"),
        ("राहु काल", "rahu_kalam"),
        ("यमगण्ड", "yamaganda"),
        ("गुलिक काल", "gulika"),
    ]
    .iter()
    .filter_map(|(n, k)| span(m.and_then(|m| m.get(*k))).map(|t| format!("{n} {t}")))
    .collect::<Vec<_>>()
    .join(" · ")
}

fn planets_summary(payload: &Value) -> String {
    let planets = payload.get("planets");
    PLANET_NE
        .iter()
        .filter_map(|(key, label)| {
            let p = truthy(planets.and_then(|p| p.get(*key)))?;
            let rashi = truthy(p.get("rashi_ne")).or_else(|| truthy(p.get("rashi_name")))?;
            Some(format!("{label} {}", py_str(rashi)))
        })
        .collect::<Vec<_>>()
        .join(" · ")
}

/// `share_copy(payload, date_ad, label, card)`: (title, description).
fn share_copy(payload: &Value, date_ad: &str, label: &str, card: Option<&str>) -> (String, String) {
    let f = og_fields(payload, date_ad);
    let date_ne = if f.bs_line.is_empty() {
        f.ad_line.clone()
    } else {
        f.bs_line.clone()
    };
    let date_line = [f.weekday.as_str(), date_ne.as_str()]
        .iter()
        .filter(|x| !x.is_empty())
        .copied()
        .collect::<Vec<_>>()
        .join(" · ");
    match card {
        Some("periods") => (
            format!("आजका शुभ र अशुभ समय · {label} · {date_ne} | Vedic Patro"),
            format!("{label}, {date_line}। {}।", periods_summary(payload)),
        ),
        Some("d1") => (
            format!("आजको ग्रहस्थिति · D1 चक्र · {label} · {date_ne} | Vedic Patro"),
            format!(
                "{label}, {date_line}। उदयकालिक स्पष्टग्रह: {}।",
                planets_summary(payload)
            ),
        ),
        _ => (
            format!(
                "{} {} · {label} · {date_ne} — पञ्चाङ्ग | Vedic Patro",
                f.paksha, f.tithi
            ),
            format!(
                "{label}, {date_line}। तिथि {}, नक्षत्र {}, योग {}, करण {}। सूर्योदय {}, सूर्यास्त {}।",
                f.tithi, f.nakshatra, f.yoga, f.karana, f.sunrise, f.sunset
            ),
        ),
    }
}

/// Python `html.escape(s, quote=True)`.
fn escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#x27;"),
            c => out.push(c),
        }
    }
    out
}

fn share_html(title: &str, description: &str, page_url: &str, image_url: &str) -> String {
    let (t, d) = (escape(title), escape(description));
    let (pu, iu) = (escape(page_url), escape(image_url));
    format!(
        "<!doctype html><html lang=\"ne\"><head><meta charset=\"utf-8\">\
<title>{t}</title>\
<meta name=\"description\" content=\"{d}\">\
<link rel=\"canonical\" href=\"{pu}\">\
<meta property=\"og:type\" content=\"website\">\
<meta property=\"og:site_name\" content=\"Vedic Patro\">\
<meta property=\"og:title\" content=\"{t}\">\
<meta property=\"og:description\" content=\"{d}\">\
<meta property=\"og:url\" content=\"{pu}\">\
<meta property=\"og:image\" content=\"{iu}\">\
<meta property=\"og:image:width\" content=\"1200\">\
<meta property=\"og:image:height\" content=\"630\">\
<meta property=\"og:image:type\" content=\"image/png\">\
<meta property=\"og:locale\" content=\"ne_NP\">\
<meta name=\"twitter:card\" content=\"summary_large_image\">\
<meta name=\"twitter:title\" content=\"{t}\">\
<meta name=\"twitter:description\" content=\"{d}\">\
<meta name=\"twitter:image\" content=\"{iu}\">\
<meta http-equiv=\"refresh\" content=\"0; url={pu}\">\
</head><body><a href=\"{pu}\">{t}</a></body></html>"
    )
}

/// `config.frontend_url()`: `FRONTEND_URL`, default the production site, no trailing `/`.
fn frontend_url() -> String {
    let base = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "https://vedicpatro.com".into());
    let base = base.trim_end_matches('/').to_owned();
    if base.is_empty() {
        "https://vedicpatro.com".into()
    } else {
        base
    }
}

/// `_site_base(request)`: the configured origin, moved onto the www / bare twin the
/// crawler actually asked for.
fn site_base(headers: &HeaderMap) -> String {
    let base = frontend_url();
    let (scheme, rest) = base.split_once("://").unwrap_or(("", base.as_str()));
    let netloc = rest.split(['/', '?', '#']).next().unwrap_or("");
    let host_port = netloc.rsplit('@').next().unwrap_or("");
    let hostname = host_port.split(':').next().unwrap_or("").to_lowercase();
    let asked = headers
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_lowercase();
    let apex = hostname.strip_prefix("www.").unwrap_or(&hostname);
    if !apex.is_empty() && (asked == apex || asked == format!("www.{apex}")) {
        return format!("{scheme}://{asked}");
    }
    base
}

/// Python 3.10 `date.fromisoformat`: exactly `YYYY-MM-DD`, a real date.
fn parse_iso_date(text: &str) -> Option<CivilDay> {
    let bytes = text.as_bytes();
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return None;
    }
    let digits = |range: std::ops::Range<usize>| -> Option<u32> {
        let part = text.get(range)?;
        part.bytes()
            .all(|c| c.is_ascii_digit())
            .then(|| part.parse().ok())?
    };
    let (year, month, day) = (digits(0..4)?, digits(5..7)?, digits(8..10)?);
    let civil = CivilDay::new(i32::try_from(year).ok()?, month, day);
    (year >= 1 && civil.is_valid_gregorian()).then_some(civil)
}

/// The share query's `city`, `lat` and `lon`.
type Coordinates = (Option<i64>, Option<f64>, Option<f64>);

/// The query's `city` / `lat` / `lon`, with pydantic's 422 items in order.
#[expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]
fn parse_query(q: &Query) -> Result<Coordinates, Response> {
    let mut errors = Vec::new();
    let city = q.get("city").and_then(|v| {
        let parsed = parse_py_int(v);
        if parsed.is_none() {
            errors.push(json!({
                "type": "int_parsing", "loc": ["query", "city"],
                "msg": "Input should be a valid integer, unable to parse string as an integer",
                "input": v,
            }));
        }
        parsed
    });
    let mut float = |k: &str| {
        q.get(k).and_then(|v| {
            let parsed = parse_py_float(v);
            if parsed.is_none() {
                errors.push(json!({
                    "type": "float_parsing", "loc": ["query", k],
                    "msg": "Input should be a valid number, unable to parse string as a number",
                    "input": v,
                }));
            }
            parsed
        })
    };
    let (lat, lon) = (float("lat"), float("lon"));
    if errors.is_empty() {
        Ok((city, lat, lon))
    } else {
        Err(detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &Value::Array(errors),
        ))
    }
}

/// `_resolve_location`: query → raw coordinates → Kathmandu, never a 4xx.
fn resolve(
    state: &AppState,
    city: Option<i64>,
    lat: Option<f64>,
    lon: Option<f64>,
    tz: Option<String>,
) -> Location {
    let query = LocationQuery {
        lat,
        lon,
        timezone: tz.clone(),
        city: None,
        city_id: city,
    };
    match geography::resolve_location(&query, &state.cities) {
        Ok(loc) => loc,
        Err(LocationError::Invalid(_) | LocationError::Cities(_)) => {
            geography::resolve_coordinates(lat, lon, tz).unwrap_or_else(|_| Location::kathmandu())
        }
        Err(_) => Location::kathmandu(),
    }
}

/// `GET /share/panchanga`.
pub async fn share_panchanga(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    uri: Uri,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let (city, lat, lon) = match parse_query(&q) {
        Ok(v) => v,
        Err(e) => return e,
    };
    let greg = q
        .get("date")
        .filter(|d| !d.is_empty())
        .and_then(|d| parse_iso_date(d))
        .unwrap_or_else(|| state.now().fields().0);
    let location = resolve(&state, city, lat, lon, q.get("tz").cloned());
    let options = DayBuildOptions {
        detail: DetailMode::Include,
        slim: SlimMode::Keep,
        festivals: FestivalMode::Exclude,
    };
    let payload = match day_fields_for_jd_with(
        greg.to_jd_ut(),
        &location,
        options,
        patro::day::DayVariant::default(),
    ) {
        Ok(p) => p,
        Err(DayError::NotPorted(msg)) => return detail(StatusCode::NOT_IMPLEMENTED, &msg),
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e.to_string()),
    };
    // The share card reads a few small blocks of the day, not the whole state.
    let payload = payload.view(&[
        "paksha",
        "bs_date",
        "sun",
        "weekday",
        "tithi",
        "nakshatra",
        "yoga",
        "karana",
        "muhurta",
        "planets",
    ]);
    let date_ad = format!("{:04}-{:02}-{:02}", greg.year, greg.month, greg.day);
    let label = q
        .get("place")
        .filter(|p| !p.is_empty())
        .cloned()
        .unwrap_or_else(|| location.name.clone());
    let (title, description) = share_copy(
        &payload,
        &date_ad,
        &label,
        q.get("card").map(String::as_str),
    );

    let base = site_base(&headers);
    let qs = uri.query().unwrap_or("");
    let suffix = if qs.is_empty() {
        String::new()
    } else {
        format!("?{qs}")
    };
    let page_url = format!("{base}/panchanga{suffix}");
    let image_url = format!(
        "{base}/api/og-image{suffix}{}v=4",
        if qs.is_empty() { '?' } else { '&' }
    );
    raw_payload(
        share_html(&title, &description, &page_url, &image_url),
        "text/html; charset=utf-8",
        &[
            ("cache-control", HTML_CACHE_CONTROL),
            ("cdn-cache-control", HTML_CACHE_CONTROL),
        ],
        &headers,
        1024,
        started,
    )
}

const PNG_CACHE_CONTROL: &str = "public, max-age=86400, s-maxage=604800, immutable";

/// The web app's `/panchanga/og-preview` page (the `card=` query picks the day chart, the
/// periods list or the D1 chart) screenshotted by a headless Chromium, as Python did.
/// On only when `PATRO_RS_OG_BROWSER` names the browser; renders are cached on disk for a day.
mod screenshot {
    use std::{
        fs,
        path::{Path, PathBuf},
        process::{Command, Stdio},
        sync::{Mutex, PoisonError},
        thread,
        time::{Duration, Instant, SystemTime},
    };

    use sha2::{Digest, Sha256};

    /// One browser at a time: a render is ~115 MB and a few seconds.
    static ONE_AT_A_TIME: Mutex<()> = Mutex::new(());
    const TTL: Duration = Duration::from_secs(86_400);
    const TIMEOUT: Duration = Duration::from_secs(40);
    /// Query keys the preview page reads; anything else is dropped from the URL and cache key.
    const KEYS: [&str; 9] = [
        "card", "date", "time", "lat", "lon", "tz", "city", "place", "app",
    ];
    const KATHMANDU_OFFSET_S: u64 = 20_700;

    fn fresh(path: &Path) -> bool {
        fs::metadata(path)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.elapsed().ok())
            .is_some_and(|age| age < TTL)
    }

    fn cached(path: &Path) -> Option<Vec<u8>> {
        if fresh(path) {
            fs::read(path).ok()
        } else {
            None
        }
    }

    pub(super) fn png(query: &str) -> Option<Vec<u8>> {
        let browser = std::env::var("PATRO_RS_OG_BROWSER")
            .ok()
            .filter(|b| !b.is_empty())?;
        let query = query
            .split('&')
            .filter(|p| KEYS.contains(&p.split('=').next().unwrap_or("")))
            .collect::<Vec<_>>()
            .join("&");
        // A query without a date draws today, so today's Kathmandu day is part of its key.
        let day = if query.contains("date=") {
            0
        } else {
            let now = SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .ok()?;
            (now.as_secs() + KATHMANDU_OFFSET_S) / 86_400
        };
        let digest = format!("{:x}", Sha256::digest(format!("{day}:{query}")));
        let dir = PathBuf::from(
            std::env::var("PATRO_RS_OG_CACHE")
                .unwrap_or_else(|_| "/tmp/vedicpatro-og-cache".into()),
        );
        let path = dir.join(format!("{digest}.png"));
        if let Some(png) = cached(&path) {
            return Some(png);
        }
        let _one = ONE_AT_A_TIME.lock().unwrap_or_else(PoisonError::into_inner);
        if let Some(png) = cached(&path) {
            return Some(png); // drawn by the request this one waited for
        }
        fs::create_dir_all(&dir).ok()?;
        for entry in fs::read_dir(&dir).ok()?.flatten() {
            if !fresh(&entry.path()) {
                let _ = fs::remove_file(entry.path());
            }
        }
        let tmp = dir.join(format!("{digest}.part.png"));
        let url = format!("{}/panchanga/og-preview?{query}", super::frontend_url());
        let mut child = Command::new(browser)
            .args([
                "--headless",
                "--no-sandbox",
                "--hide-scrollbars",
                "--window-size=1200,630",
                "--force-device-scale-factor=2",
                // Virtual time only runs while the network is idle, so the day's data is in.
                "--virtual-time-budget=15000",
            ])
            .arg(format!("--screenshot={}", tmp.display()))
            .arg(&url)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .ok()?;
        let started = Instant::now();
        loop {
            match child.try_wait() {
                Ok(Some(status)) if status.success() => break,
                Ok(None) if started.elapsed() < TIMEOUT => {
                    thread::sleep(Duration::from_millis(100));
                }
                _ => {
                    let _ = child.kill();
                    let _ = child.wait();
                    return None;
                }
            }
        }
        let png = fs::read(&tmp).ok().filter(|b| b.starts_with(b"\x89PNG"))?;
        let _ = fs::rename(&tmp, &path);
        Some(png)
    }
}

/// `GET /og-image`: the share card PNG (1.91:1). With `PATRO_RS_OG_BROWSER` set it is a
/// screenshot of the web app's og-preview page (`card=` main / periods / d1); otherwise, or
/// when that fails, the drawn card (the `og` crate, with the same Mukta fonts).
pub async fn og_image(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
    uri: Uri,
) -> Response {
    let started = Instant::now();
    let (city, lat, lon) = match parse_query(&q) {
        Ok(v) => v,
        Err(e) => return e,
    };
    let full = match crate::respond::flag(&q, "full") {
        Ok(v) => v,
        Err(e) => return e,
    };
    // The three daily cards (day chart, periods, D1) are the web page itself; the drawn
    // card below is the fallback when no browser is configured or the screenshot fails.
    if !full && let Some(png) = screenshot::png(uri.query().unwrap_or("")) {
        return crate::respond::raw_bytes_payload(
            png,
            "image/png",
            &[
                ("cache-control", PNG_CACHE_CONTROL),
                ("cdn-cache-control", PNG_CACHE_CONTROL),
            ],
            &headers,
            1024,
            started,
        );
    }
    let greg = q
        .get("date")
        .filter(|d| !d.is_empty())
        .and_then(|d| parse_iso_date(d))
        .unwrap_or_else(|| state.now().fields().0);
    let location = resolve(&state, city, lat, lon, q.get("tz").cloned());
    let place = q
        .get("place")
        .filter(|p| !p.is_empty())
        .cloned()
        .unwrap_or_else(|| location.name.clone());
    // Drawn on the cpu_pool blocking thread already, so no nested
    // spawn_blocking: the closure below only groups the fallible steps so
    // `?` still returns an error string for the match beneath it.
    let drawn = (|| -> Result<Vec<u8>, String> {
        let options = DayBuildOptions {
            detail: DetailMode::Include,
            slim: SlimMode::Keep,
            festivals: FestivalMode::Exclude,
        };
        let payload = day_fields_for_jd_with(
            greg.to_jd_ut(),
            &location,
            options,
            patro::day::DayVariant::default(),
        )
        .map_err(|e| e.to_string())?
        .view(&[
            "paksha",
            "bs_date",
            "sun",
            "weekday",
            "tithi",
            "nakshatra",
            "yoga",
            "karana",
        ]);
        let date_ad = format!("{:04}-{:02}-{:02}", greg.year, greg.month, greg.day);
        let f = og_fields(&payload, &date_ad);
        og::render_png(&og::Card {
            weekday: f.weekday,
            bs_line: f.bs_line,
            ad_line: f.ad_line,
            paksha: f.paksha.to_owned(),
            tithi: f.tithi,
            nakshatra: f.nakshatra,
            yoga: f.yoga,
            karana: f.karana,
            sunrise: f.sunrise,
            sunset: f.sunset,
            location: place,
        })
        .map_err(|e| e.to_string())
    })();
    match drawn {
        Ok(png) => crate::respond::raw_bytes_payload(
            png,
            "image/png",
            &[
                ("cache-control", PNG_CACHE_CONTROL),
                ("cdn-cache-control", PNG_CACHE_CONTROL),
            ],
            &headers,
            1024,
            started,
        ),
        Err(message) => detail(StatusCode::INTERNAL_SERVER_ERROR, &message),
    }
}

/// `GET /meta/provenance`: the astronomical environment this process computes with,
/// observed from the files it loaded (never typed in): our own `.veph` kernel, the
/// frames and ΔT behaviour. Python reports its Swiss Ephemeris
/// build here; this server's own ephemeris is the environment, so the fields differ
/// but the shape is the same (`provenance` + `cache`). Without `PATRO_RS_EPHDATA` there
/// is no own ephemeris to describe, so it answers 501.
pub async fn provenance(State(state): State<AppState>) -> Response {
    use sha2::{Digest, Sha256};
    let Some(files) = state.drik else {
        return detail(
            StatusCode::NOT_IMPLEMENTED,
            "/meta/provenance describes the own ephemeris; set PATRO_RS_EPHDATA to the folder holding kernel.veph",
        );
    };
    let Some(sky) = files.system.drik() else {
        return detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error");
    };
    let (first, last) = sky.coverage_jd_ut();
    let years = |jd: f64| CivilDay::from_jd_ut(jd).year;
    // ΔT sampled where the engine serves, as Python's probes do: what the model did.
    let delta_t: Vec<Value> = [2_451_545.0, 2_415_020.5, 1_721_423.5, 1_000_000.0]
        .iter()
        .map(|jd| {
            json!({"jd": jd, "seconds": ephdata::deltat::delta_t_seconds(ephdata::deltat::year_of(*jd))})
        })
        .collect();
    let environment = json!({
        "engine": "own_drik",
        "siddhanta": "drik",
        "ephemeris": {
            "source": "JPL DE441 development ephemeris, repacked as Chebyshev coefficients (.veph)",
            "kernel_bytes": files.kernel_bytes,
            "coverage_jd_ut": [first, last],
            "coverage_years": [years(first), years(last)],
            "answers_for_years": system_years(files.system),
        },
        "ayanamsha": {"name": "lahiri", "at_j2000_degrees": sky.ayanamsha(2_451_545.0)},
        "frames": "IAU 2006 precession and mean obliquity; apparent places (light-time and annual aberration); mean equator of date for hour angles",
        "delta_t": delta_t,
        "sunrise_model": "upper limb of the Sun, refraction 34 arc-minutes; the Moon's horizon adds its parallax",
    });
    let hash = format!("{:x}", Sha256::digest(environment.to_string().as_bytes()));
    let mut provenance = environment;
    if let Some(map) = provenance.as_object_mut() {
        map.insert("provenance_hash".into(), json!(hash));
        map.insert("short_hash".into(), json!(&hash[..12]));
    }
    let payload = json!({
        "provenance": provenance,
        "cache": {"note": "this server keeps no panchanga cache keyed by environment"},
    });
    crate::respond::json_plain_payload(&payload, &Query::new(), &HeaderMap::new(), Instant::now())
}

fn system_years(system: astronomy::System) -> Value {
    system
        .supported_years()
        .map_or(Value::Null, |(a, b)| json!([a, b]))
}
