//! Crawler-facing HTML for a shared `/panchanga` link (`api/og.py` `share_panchanga`,
//! `services/sharing/share_copy.py`), and the routes not ported yet: `/og-image`
//! and `/meta/provenance`.

use std::time::Instant;

use axum::{
    extract::{Query as AxumQuery, State},
    http::{HeaderMap, StatusCode, Uri, header},
    response::Response,
};
use geography::{LocationError, LocationQuery};
use panchanga::daily::Location;
use patro::day::{
    DayBuildOptions, DayError, DetailMode, FestivalMode, SlimMode, day_payload_for_jd,
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
    let payload = match day_payload_for_jd(greg.to_jd_ut(), &location, options) {
        Ok(p) => p,
        Err(DayError::NotPorted(msg)) => return detail(StatusCode::NOT_IMPLEMENTED, &msg),
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e.to_string()),
    };
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

/// `GET /og-image`: Python screenshots the web app's chart in headless Chromium,
/// falling back to a Pillow-drawn card; neither renderer is ported.
pub async fn og_image() -> Response {
    detail(
        StatusCode::NOT_IMPLEMENTED,
        "/og-image is not ported to the Rust server yet",
    )
}

/// `GET /meta/provenance`: Python reports the Swiss Ephemeris environment (swisseph
/// build, `.se1` inventory, JPL DE, ΔT probes) and the panchanga cache's rows. The
/// Rust server has neither yet, so it answers 501 rather than borrow Python's values.
pub async fn provenance() -> Response {
    detail(
        StatusCode::NOT_IMPLEMENTED,
        "/meta/provenance describes the Swiss Ephemeris environment and the panchanga cache; neither is ported to the Rust server yet",
    )
}
