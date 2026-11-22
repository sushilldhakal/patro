//! `GET /profiles/{profile_id}/daily-guidance` (`app/routers/guidance.py` over
//! `services/jyotish/daily_guidance.py`): do / don't / be-careful text from
//! `rules/daily_guidance_v1.json`, the day's शुभ/अशुभ windows, and — when the
//! profile has a birth moment and place — the personal tone, chandrabala,
//! tarabala and dasha read at each day's sunrise.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::{
    collections::HashMap,
    sync::{Arc, OnceLock},
    time::Instant,
};

use accounts::{
    profiles::Birth,
    pydt::{self, PyDateTime},
};
use axum::{
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use geography::{LocationError, LocationQuery};
use jyotish::{graha::Graha, rashifal::NatalChart};
use panchanga::daily::Location;
use serde_json::{Map, Value, json};
use timescale::{CivilDay, UtcInstant};

use crate::{
    body::{self, Bounds, Kind},
    handlers::account::{current_user, error, json_status, layer},
    respond::{detail, detail_json},
    state::AppState,
};

type Q = AxumQuery<HashMap<String, String>>;

const GUIDANCE_VERSION: &str = "1";
const MAX_DAYS: i64 = 31;
const CHANDRA_GOOD_HOUSES: [usize; 6] = [1, 3, 6, 7, 10, 11];

fn rules(state: &AppState) -> Result<Arc<Value>, Response> {
    static RULES: OnceLock<Result<Arc<Value>, String>> = OnceLock::new();
    RULES
        .get_or_init(|| {
            let path = state
                .config
                .data_dir
                .join("../rules/daily_guidance_v1.json");
            std::fs::read_to_string(&path)
                .map_err(|e| format!("{}: {e}", path.display()))
                .and_then(|t| serde_json::from_str(&t).map_err(|e| e.to_string()))
                .map(Arc::new)
        })
        .clone()
        .map_err(|e| {
            tracing::error!(error = %e, "daily guidance rules unreadable");
            crate::handlers::account::internal_error()
        })
}

fn strings(v: Option<&Value>) -> Vec<String> {
    v.and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(Value::as_str)
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

/// The six text lists a day collects.
#[derive(Default)]
struct Lines {
    do_ne: Vec<String>,
    do_en: Vec<String>,
    dont_ne: Vec<String>,
    dont_en: Vec<String>,
    careful_ne: Vec<String>,
    careful_en: Vec<String>,
}

impl Lines {
    fn add(&mut self, rule: Option<&Value>) {
        let Some(rule) = rule else { return };
        self.do_ne.extend(strings(rule.get("do_ne")));
        self.do_en.extend(strings(rule.get("do_en")));
        self.dont_ne.extend(strings(rule.get("dont_ne")));
        self.dont_en.extend(strings(rule.get("dont_en")));
        self.careful_ne.extend(strings(rule.get("careful_ne")));
        self.careful_en.extend(strings(rule.get("careful_en")));
    }
}

fn hhmm(v: Option<&Value>) -> Option<String> {
    let text = match v? {
        Value::Null => return None,
        Value::String(s) if s.is_empty() => return None,
        Value::String(s) => s.clone(),
        other => other.to_string(),
    };
    let chars: Vec<char> = text.chars().collect();
    (chars.len() >= 5 && chars[2] == ':').then(|| chars[..5].iter().collect())
}

/// `_windows`: every शुभ / अशुभ window, sorted by start.
fn windows(muhurta: Option<&Value>) -> Vec<Value> {
    let mut out: Vec<(String, Value)> = Vec::new();
    for (group, kind) in [
        ("auspicious_timings", "shubh"),
        ("inauspicious_timings", "ashubh"),
    ] {
        let timings = muhurta.and_then(|m| m.get(group)).and_then(Value::as_array);
        for timing in timings.into_iter().flatten() {
            let Some(key) = timing.get("key").filter(|k| !k.is_null() && *k != "") else {
                continue;
            };
            for seg in timing
                .get("segments")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                let Some(start) = hhmm(seg.get("start_local_time_short")) else {
                    continue;
                };
                let end = hhmm(seg.get("end_local_time_short"));
                out.push((
                    start.clone(),
                    json!({
                        "kind": kind,
                        "key": key,
                        "name_ne": timing.get("name_ne").cloned().unwrap_or(Value::Null),
                        "name_en": timing.get("name_en").cloned().unwrap_or(Value::Null),
                        "start": start,
                        "end": end,
                    }),
                ));
            }
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out.into_iter().map(|(_, w)| w).collect()
}

/// `round()` to an integer, ties to even.
fn round_half_even(x: f64) -> i64 {
    let r = x.round();
    let tie = ((x - x.trunc()).abs() - 0.5).abs() < 1e-12;
    #[expect(clippy::cast_possible_truncation, reason = "minutes in a day or two")]
    let n = r as i64;
    if tie && n % 2 != 0 { n - n.signum() } else { n }
}

/// `_clock_from_midnight`: minutes from the day's local midnight (past 24:00 after it).
fn clock_from_midnight(moment: UtcInstant, day: CivilDay, location: &Location) -> String {
    let zone = &location.zone;
    let wall = moment.add_seconds(i64::from(zone.offset_seconds_at(moment)));
    let midnight = UtcInstant::from_utc(day, 0, 0, 0, 0).unwrap_or(wall);
    #[expect(clippy::cast_precision_loss, reason = "microseconds within days")]
    let secs = wall.micros_since(midnight) as f64 / 1e6;
    let minutes = round_half_even(secs / 60.0).max(0);
    format!("{:02}:{:02}", minutes / 60, minutes % 60)
}

fn chandra_state(moon_idx: usize, janma_idx: usize) -> (usize, &'static str) {
    let house = (moon_idx + 12 - janma_idx) % 12 + 1;
    if house == 8 {
        (house, "ashtama")
    } else if CHANDRA_GOOD_HOUSES.contains(&house) {
        (house, "good")
    } else {
        (house, "weak")
    }
}

fn tara_state(transit: usize, janma: usize) -> Value {
    let num = ((transit + 27 - janma) % 27) % 9 + 1;
    let (name_ne, name_en, ..) = panchanga::NAVATARA[num - 1];
    let state = match num {
        1 => "caution",
        3 | 5 | 7 => "bad",
        _ => "good",
    };
    json!({"num": num, "name_ne": name_ne, "name_en": name_en, "state": state})
}

/// `_lord_motion`: (अस्त, वक्री) at `jd`; राहु and केतु are never वक्री here.
fn lord_motion(lord: Graha, jd: f64) -> (bool, bool) {
    let rows = panchanga::graha_positions(jd);
    let row = |key: &str| rows.iter().find(|r| r.key == key);
    let vakri = match lord {
        Graha::Rahu | Graha::Ketu | Graha::Sun | Graha::Moon => false,
        _ => row(lord.key()).is_some_and(|r| r.speed < 0.0),
    };
    let raw = jyotish::chart::RawPlanet {
        longitude: 0.0,
        retrograde: vakri,
    };
    let Some(orb) = jyotish::chart::combust_orb(lord, raw) else {
        return (false, vakri);
    };
    let (Some(sun), Some(own)) = (row("sun"), row(lord.key())) else {
        return (false, vakri);
    };
    let sep = (sun.longitude - own.longitude).abs().rem_euclid(360.0);
    let sep = sep.min(360.0 - sep);
    (sep <= orb, vakri)
}

/// `_split_points`: sunrise, the next sunrise, and each Moon rashi or nakshatra change between.
fn split_points(sunrise: UtcInstant, next: UtcInstant) -> Vec<UtcInstant> {
    let s = |n: i64| n * 1_000_000;
    let mut points = vec![sunrise, next];
    let mut cursor = sunrise;
    for _ in 0..8 {
        if cursor >= next.add_micros(-s(45)) {
            break;
        }
        let change = panchanga::moon_rashi_end(cursor).min(panchanga::nakshatra_end(cursor));
        if change <= cursor.add_micros(s(20)) {
            cursor = cursor.add_micros(s(30 * 60));
            continue;
        }
        if change < next.add_micros(-s(45)) {
            points.push(change);
            cursor = change.add_micros(s(90));
        } else {
            break;
        }
    }
    points.sort();
    let mut merged: Vec<UtcInstant> = Vec::new();
    for p in points {
        if let Some(last) = merged.last()
            && p.micros_since(*last) < s(60)
        {
            continue;
        }
        merged.push(p);
    }
    let last = merged.len() - 1;
    if merged[last] < next.add_micros(-s(30)) {
        merged.push(next);
    } else {
        merged[last] = next;
    }
    merged
}

fn moon_rashi_and_nak(jd: f64) -> (usize, usize) {
    let lon = astronomy::engine::moon_longitude(jd);
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "a longitude in [0, 360)"
    )]
    let (rashi, nak) = (
        (lon / 30.0) as usize % 12,
        (lon / (360.0 / 27.0)) as usize % 27,
    );
    (rashi, nak)
}

fn bad_day(e: impl std::fmt::Display) -> Response {
    detail(StatusCode::BAD_REQUEST, &e.to_string())
}

/// `_personal_block`: chandrabala, tarabala and dasha for one day, read at its sunrise.
fn personal_block(
    natal: &NatalChart,
    day: CivilDay,
    location: &Location,
) -> Result<Value, Response> {
    let sunrise = panchanga::sunrise_on(day, location).map_err(bad_day)?;
    let next = panchanga::sunrise_on(day.add_days(1), location).map_err(bad_day)?;
    let jd = sunrise.to_jd();
    let (maha, antar) = natal.dasha_lords(sunrise);
    let lord_row = |lord: Graha| {
        let (asta, vakri) = lord_motion(lord, jd);
        json!({
            "lord": lord.key(), "lord_ne": jyotish::dasha::lord_ne(lord), "lord_en": lord.en(),
            "asta": asta, "vakri": vakri,
        })
    };
    let rashi_idx = natal.moon_sign_index();
    let nak_idx = natal.moon_nakshatra_index();
    let points = split_points(sunrise, next);
    let mut segments = Vec::new();
    for pair in points.windows(2) {
        let (start, end) = (pair[0], pair[1]);
        if end <= start {
            continue;
        }
        let mut probe = start.add_micros(30_000_000);
        if probe >= end {
            probe = start;
        }
        let (moon_rashi, transit_nak) = moon_rashi_and_nak(probe.to_jd());
        let (house, state) = chandra_state(moon_rashi, rashi_idx);
        segments.push(json!({
            "start": clock_from_midnight(start, day, location),
            "end": clock_from_midnight(end, day, location),
            "chandra": {"house": house, "state": state},
            "tara": tara_state(transit_nak, nak_idx),
        }));
    }
    Ok(json!({
        "janma_rashi": {
            "number": rashi_idx + 1,
            "name_ne": panchanga::RASHI_NAMES_NE[rashi_idx],
            "name_en": panchanga::RASHI_NAMES[rashi_idx],
        },
        "janma_nakshatra": {
            "number": nak_idx + 1,
            "name_ne": panchanga::NAKSHATRA_NAMES_NE[nak_idx],
            "name_en": panchanga::NAKSHATRA_NAMES[nak_idx],
        },
        "dasha": {"maha": lord_row(maha), "antar": lord_row(antar)},
        "segments": segments,
    }))
}

/// `_day_reading`: the personal rashifal trimmed to what a day's dialog shows.
fn day_reading(personal: &Value) -> Value {
    let get = |v: &Value, k: &str| v.get(k).cloned().unwrap_or(Value::Null);
    let lord = |row: Option<&Value>| match row {
        Some(r) if r.is_object() && !r.as_object().is_some_and(Map::is_empty) => json!({
            "lord": get(r, "lord"), "lord_ne": get(r, "lord_ne"), "lord_en": get(r, "lord_en"), "end": get(r, "end"),
        }),
        _ => Value::Null,
    };
    let dasha = personal.get("dasha").cloned().unwrap_or(Value::Null);
    let text = |k: &str| match personal.get(k) {
        Some(Value::String(s)) if !s.is_empty() => json!(s),
        _ => json!(""),
    };
    let truthy = |v: Option<&Value>| match v {
        None | Some(Value::Null) => false,
        Some(Value::Bool(b)) => *b,
        Some(Value::Number(n)) => n.as_f64().is_some_and(|f| f != 0.0),
        Some(Value::String(s)) => !s.is_empty(),
        Some(_) => true,
    };
    let domains: Vec<Value> = personal
        .get("domains")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .map(|d| json!({
            "key": get(d, "key"), "label_ne": get(d, "label_ne"), "label_en": get(d, "label_en"),
            "tone": get(d, "tone"), "percent": get(d, "percent"),
        }))
        .collect();
    let gochar: Vec<Value> = personal
        .get("gochar")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .map(|g| json!({
            "graha": get(g, "graha"), "graha_ne": get(g, "graha_ne"), "graha_en": get(g, "graha_en"),
            "sign_ne": get(g, "sign_ne"), "sign_en": get(g, "sign_en"), "house": get(g, "house"),
            "favourable": truthy(g.get("favourable")), "retrograde": truthy(g.get("retrograde")),
            "bindu": get(g, "bindu"),
        }))
        .collect();
    json!({
        "percent": get(personal, "percent"),
        "prediction_ne": text("prediction_ne"),
        "prediction_en": text("prediction_en"),
        "dasha": {"maha": lord(dasha.get("mahadasha")), "antar": lord(dasha.get("antardasha"))},
        "domains": domains,
        "gochar": gochar,
    })
}

fn tithi_rule_key<'a>(rules: &'a Value, name: Option<&str>) -> Option<&'a str> {
    let lowered = name.unwrap_or("").to_lowercase();
    rules
        .get("tithi")?
        .as_object()?
        .keys()
        .find(|k| lowered.contains(k.as_str()))
        .map(String::as_str)
}

/// The profile's own reading of the day, and its rule's lines (added to `lines` too).
struct PersonalLines {
    tone: Value,
    reading: Value,
    ne: Vec<String>,
    en: Vec<String>,
}

fn personal_lines(
    rules: &Value,
    natal: &NatalChart,
    day: CivilDay,
    location: &Location,
    now: UtcInstant,
    lines: &mut Lines,
) -> Result<PersonalLines, Response> {
    let personal = jyotish::rashifal::personal_rashifal_for_day(
        natal,
        day,
        location,
        jyotish::rashifal::Period::Daily,
        now,
    )
    .map_err(bad_day)?;
    let tone = personal.get("tone").cloned().unwrap_or(Value::Null);
    let rule = rules
        .get("personal")
        .and_then(|p| p.get(tone.as_str().unwrap_or("")));
    lines.add(rule);
    // The same lines on their own, so a notification can lead with this person's.
    let mut ne = Vec::new();
    let mut en = Vec::new();
    if let Some(rule) = rule {
        ne.extend(strings(rule.get("do_ne")));
        en.extend(strings(rule.get("do_en")));
        ne.extend(strings(rule.get("careful_ne")));
        en.extend(strings(rule.get("careful_en")));
    }
    Ok(PersonalLines {
        tone,
        reading: day_reading(&personal),
        ne,
        en,
    })
}

/// The weekday, tithi, Vishti and window lines every profile shares.
fn shared_lines(rules: &Value, state: &Value, windows: &[Value]) -> Lines {
    let field = |obj: &str, key: &str| {
        state
            .get(obj)
            .and_then(|o| o.get(key))
            .cloned()
            .unwrap_or(Value::Null)
    };
    let mut lines = Lines::default();
    let weekday_en = state
        .get("weekday_en")
        .and_then(Value::as_str)
        .unwrap_or("");
    lines.add(rules.get("weekday").and_then(|w| w.get(weekday_en)));
    let tithi_name = field("tithi", "name");
    if let Some(key) = tithi_rule_key(rules, tithi_name.as_str()) {
        lines.add(rules.get("tithi").and_then(|t| t.get(key)));
    }
    let karana = field("karana", "name");
    if karana
        .as_str()
        .unwrap_or("")
        .to_lowercase()
        .contains("vishti")
    {
        lines.add(rules.get("karana").and_then(|k| k.get("vishti")));
    }
    let keys: Vec<&Value> = windows.iter().filter_map(|w| w.get("key")).collect();
    for key in ["abhijit", "rahu_kalam", "yamaganda", "gulika"] {
        if keys.iter().any(|k| *k == key) {
            lines.add(rules.get("windows").and_then(|w| w.get(key)));
        }
    }
    lines
}

/// `build_day_guidance`.
#[expect(clippy::too_many_lines, reason = "one field per payload key")]
fn day_guidance(
    rules: &Value,
    day: CivilDay,
    location: &Location,
    natal: Option<&NatalChart>,
    now: UtcInstant,
) -> Result<Value, Response> {
    let options = patro::day::DayBuildOptions {
        detail: patro::day::DetailMode::Exclude,
        slim: patro::day::SlimMode::Keep,
        festivals: patro::day::FestivalMode::Exclude,
    };
    let state = patro::day::day_fields_for_jd_with(
        day.to_jd_ut(),
        location,
        options,
        patro::day::DayVariant::default(),
    )
    .map_err(bad_day)?
    // Guidance reads a few small blocks of the day, not the whole state.
    .view(&[
        "muhurta",
        "weekday_en",
        "weekday",
        "tithi",
        "karana",
        "nakshatra",
        "date_bs",
    ]);
    let field = |obj: &str, key: &str| {
        state
            .get(obj)
            .and_then(|o| o.get(key))
            .cloned()
            .unwrap_or(Value::Null)
    };
    let windows = windows(state.get("muhurta"));
    let mut lines = shared_lines(rules, &state, &windows);
    let personal = match natal {
        Some(natal) => Some(personal_lines(
            rules, natal, day, location, now, &mut lines,
        )?),
        None => None,
    };
    let summary = |a: &[String], b: &[String], c: &[String]| -> String {
        let firsts: Vec<&String> = a
            .iter()
            .take(1)
            .chain(b.iter().take(1))
            .chain(c.iter().take(1))
            .take(2)
            .collect();
        firsts
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join(" ")
    };
    // `DayGuidanceOut` (extra="allow"): declared fields first, then the extras in input order.
    let mut out = Map::new();
    out.insert("date".into(), json!(day.to_string()));
    out.insert(
        "personal_tone".into(),
        personal.as_ref().map_or(Value::Null, |p| p.tone.clone()),
    );
    out.insert(
        "summary_ne".into(),
        json!(summary(&lines.do_ne, &lines.careful_ne, &lines.dont_ne)),
    );
    out.insert(
        "summary_en".into(),
        json!(summary(&lines.do_en, &lines.careful_en, &lines.dont_en)),
    );
    out.insert("do_ne".into(), json!(lines.do_ne));
    out.insert("do_en".into(), json!(lines.do_en));
    out.insert("dont_ne".into(), json!(lines.dont_ne));
    out.insert("dont_en".into(), json!(lines.dont_en));
    out.insert("careful_ne".into(), json!(lines.careful_ne));
    out.insert("careful_en".into(), json!(lines.careful_en));
    let none: Vec<String> = Vec::new();
    out.insert(
        "personal_ne".into(),
        json!(personal.as_ref().map_or(&none, |p| &p.ne)),
    );
    out.insert(
        "personal_en".into(),
        json!(personal.as_ref().map_or(&none, |p| &p.en)),
    );
    out.insert("windows".into(), json!(windows));
    out.insert(
        "personal".into(),
        match natal {
            Some(n) => personal_block(n, day, location)?,
            None => Value::Null,
        },
    );
    out.insert(
        "date_bs".into(),
        state.get("date_bs").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "weekday_ne".into(),
        state.get("weekday").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "weekday_en".into(),
        state.get("weekday_en").cloned().unwrap_or(Value::Null),
    );
    out.insert("tithi_ne".into(), field("tithi", "name_ne"));
    out.insert("tithi_en".into(), field("tithi", "name"));
    out.insert("nakshatra_ne".into(), field("nakshatra", "name_ne"));
    out.insert("nakshatra_en".into(), field("nakshatra", "name"));
    if let Some(p) = personal {
        out.insert("reading".into(), p.reading);
    }
    Ok(Value::Object(out))
}

/// `natal_chart_for_profile`: `None` without a usable birth moment and place.
fn natal_for(birth: &Birth) -> Option<NatalChart> {
    let (Some(date), Some(lat), Some(lon)) =
        (birth.date.as_deref(), birth.latitude, birth.longitude)
    else {
        return None;
    };
    if date.is_empty() {
        return None;
    }
    let parts: Vec<&str> = date.split('-').take(3).collect();
    let [y, m, d] = parts.as_slice() else {
        return None;
    };
    let int = |s: &str| s.trim().parse::<i64>().ok();
    let (y, m, d) = (int(y)?, int(m)?, int(d)?);
    let tz = birth
        .timezone
        .as_deref()
        .filter(|t| !t.is_empty())
        .unwrap_or("Asia/Kathmandu");
    let query = patro::at_time::BirthQuery {
        birth: None,
        birth_tz: tz,
        birth_era: Some(
            birth
                .era
                .as_deref()
                .filter(|e| !e.is_empty())
                .unwrap_or("bs"),
        ),
        birth_year: Some(y),
        birth_month: Some(m),
        birth_day: Some(d),
        birth_clock: Some(
            birth
                .time
                .as_deref()
                .filter(|t| !t.is_empty())
                .unwrap_or("12:00"),
        ),
    };
    let moment = patro::at_time::birth_instant(&query, Some((lat, lon))).ok()?;
    Some(NatalChart::cast(
        moment.utc,
        moment.wall,
        &moment.zone,
        lat,
        lon,
    ))
}

const LAT_FLOAT: Kind = Kind::Float(Bounds {
    gt: None,
    ge: None,
    lt: None,
    le: None,
});

/// `location_params`' own query types (pydantic's items); `None` once they parse.
fn location_errors(q: &HashMap<String, String>) -> Vec<Value> {
    let mut errors = Vec::new();
    for (name, kind) in [
        ("lat", LAT_FLOAT),
        ("lon", LAT_FLOAT),
        ("city_id", Kind::Int { ge: None, le: None }),
    ] {
        if let Some(raw) = q.get(name) {
            body::validate(
                &json!(raw),
                kind,
                &[json!("query"), json!(name)],
                &mut errors,
            );
        }
    }
    errors
}

fn resolve_location(q: &HashMap<String, String>, state: &AppState) -> Result<Location, Response> {
    let query = LocationQuery {
        lat: q.get("lat").and_then(|v| crate::body::parse_py_float(v)),
        lon: q.get("lon").and_then(|v| crate::body::parse_py_float(v)),
        timezone: q.get("timezone").cloned(),
        city: q.get("city").cloned(),
        city_id: q.get("city_id").and_then(|v| crate::body::parse_py_int(v)),
    };
    geography::resolve_location(&query, &state.cities).map_err(|e| match e {
        LocationError::Invalid(msg) => detail(StatusCode::BAD_REQUEST, &msg),
        other => detail(StatusCode::SERVICE_UNAVAILABLE, &other.to_string()),
    })
}

/// `from` as pydantic's `date`.
fn from_day(raw: &str, errors: &mut Vec<Value>) -> Option<CivilDay> {
    let fail = |errors: &mut Vec<Value>, kind: &str, msg: String, ctx: Option<Value>| {
        let mut item = json!({"type": kind, "loc": ["query", "from"], "msg": msg, "input": raw});
        if let Some(ctx) = ctx {
            item["ctx"] = ctx;
        }
        errors.push(item);
        None
    };
    let inexact = |errors: &mut Vec<Value>| {
        fail(
            errors,
            "date_from_datetime_inexact",
            "Datetimes provided to dates should have zero time - e.g. be exact dates".to_owned(),
            None,
        )
    };
    match pydt::parse_str(raw) {
        Ok(PyDateTime::Naive(dt)) => {
            if dt.time() != jiff::civil::Time::midnight() {
                return inexact(errors);
            }
            let d = dt.date();
            Some(CivilDay::new(
                i32::from(d.year()),
                d.month().unsigned_abs().into(),
                d.day().unsigned_abs().into(),
            ))
        }
        Ok(PyDateTime::Aware(t)) => {
            let dt = t.to_zoned(jiff::tz::TimeZone::UTC).datetime();
            if dt.time() != jiff::civil::Time::midnight() {
                return inexact(errors);
            }
            let d = dt.date();
            Some(CivilDay::new(
                i32::from(d.year()),
                d.month().unsigned_abs().into(),
                d.day().unsigned_abs().into(),
            ))
        }
        Err(pydt::DateTimeError::Parsing(why)) => fail(
            errors,
            "date_from_datetime_parsing",
            format!("Input should be a valid date or datetime, {why}"),
            Some(json!({ "error": why })),
        ),
        Err(pydt::DateTimeError::Type) => fail(
            errors,
            "date_type",
            "Input should be a valid date".to_owned(),
            None,
        ),
    }
}

/// `GET /profiles/{profile_id}/daily-guidance`.
pub async fn daily_guidance(
    State(state): State<AppState>,
    Path(profile_id): Path<String>,
    AxumQuery(q): Q,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let run = async {
        let acc = layer(&state)?;
        // FastAPI: the location dependency, then the user, then the route's own query.
        let mut errors = location_errors(&q);
        let location = if errors.is_empty() {
            Some(resolve_location(&q, &state)?)
        } else {
            None
        };
        let user = current_user(acc, &headers).await?;
        let first = q.get("from").and_then(|raw| from_day(raw, &mut errors));
        let days = match q.get("days") {
            None => Some(14),
            Some(raw) => body::validate(
                &json!(raw),
                Kind::Int {
                    ge: Some(1),
                    le: Some(MAX_DAYS),
                },
                &[json!("query"), json!("days")],
                &mut errors,
            )
            .and_then(|v| v.as_i64()),
        };
        if !errors.is_empty() {
            return Err(detail_json(
                StatusCode::UNPROCESSABLE_ENTITY,
                &Value::Array(errors),
            ));
        }
        let (Some(location), Some(days)) = (location, days) else {
            return Err(crate::handlers::account::internal_error());
        };
        let profile = acc
            .get_profile(&user.id, &profile_id)
            .await
            .map_err(|e| error(&e))?;
        let rules = rules(&state)?;
        let now = state.now();
        let first = first.unwrap_or_else(|| CivilDay::from_jd_ut(now.to_jd()));
        let natal = natal_for(&profile.birth);
        let days = (0..days.clamp(1, MAX_DAYS))
            .map(|i| {
                let offset = i32::try_from(i).unwrap_or(0);
                day_guidance(
                    &rules,
                    first.add_days(offset),
                    &location,
                    natal.as_ref(),
                    now,
                )
            })
            .collect::<Result<Vec<Value>, Response>>()?;
        // `GuidanceRangeOut` (extra="allow"): version, profile_id, days, then location.
        let payload = json!({
            "version": GUIDANCE_VERSION,
            "profile_id": profile.id,
            "days": days,
            "location": {"lat": location.lat, "lon": location.lon, "timezone": location.zone.name()},
        });
        Ok(json_status(StatusCode::OK, &payload, &q, &headers, started))
    };
    run.await.unwrap_or_else(|r: Response| r)
}
