//! Kundali routes (`api/kundali.py`): planetary positions, Vimshottari, shadbala,
//! the static references, dasha expansion, milan and the sunrise snapshot.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::time::Instant;

use axum::{
    extract::{Query as AxumQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use panchanga::daily::Location;
use patro::at_time::{InstantQuery, observer_iso, resolve_instant};
use serde_json::{Value, json};
use timescale::UtcInstant;

use super::at_time::{day_error, era_parts_jd, jd_param};
use crate::{
    respond::{
        Query, detail, detail_json, era_error, json_no_store_payload, json_payload,
        json_plain_payload, request_system, siddhanta_error,
    },
    state::AppState,
};

/// The shared front half: gates (`ayanamsha=` is read and ignored under the Surya
/// Siddhanta, as in Python),
/// the location and the instant (`instant_for_request`).
fn instant_request(q: &Query, state: &AppState) -> Result<(Location, UtcInstant), Response> {
    if let Some(r) = era_error(q).or_else(|| siddhanta_error(state, q)) {
        return Err(r);
    }
    let jd = match jd_param(q)? {
        Some(jd) => Some(jd),
        None => era_parts_jd(q)?,
    };
    let location = super::panchanga::location(q, state)?;
    let query = InstantQuery {
        datetime: q.get("datetime").map(String::as_str),
        jd,
        clock: q.get("clock").map(String::as_str),
    };
    let instant = resolve_instant(query, &location).map_err(day_error)?;
    location
        .ensure_supported(timescale::CivilDay::from_jd_ut(instant.to_jd()))
        .map_err(|e| detail(StatusCode::BAD_REQUEST, &e.to_string()))?;
    Ok((location, instant))
}

/// `GET /v1/planetary/positions`: the nine grahas and the lagna at an instant.
pub(crate) async fn planetary_positions(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let (loc, instant) = match instant_request(&q, &state) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let mut payload = panchanga::at_time::planetary_snapshot(loc.system, instant, loc.lat, loc.lon);
    if let Value::Object(fields) = &mut payload {
        fields.insert(
            "ayanamsha".into(),
            json!(if loc.system.is_drik() {
                "lahiri"
            } else {
                "surya_siddhanta"
            }),
        );
        fields.insert("location".into(), loc.as_json());
        fields.insert("query_instant".into(), json!(observer_iso(instant, &loc)));
    }
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/kundali/detail`: the full birth chart (`build_kundali_detail`), never
/// cached by a shared cache (`private, no-store`).
pub(crate) async fn detail_route(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let (loc, instant) = match instant_request(&q, &state) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let panchanga = match patro::at_time::at_time_fields(instant, &loc) {
        Ok(p) => p.to_value(),
        Err(e) => return day_error(e),
    };
    let zone = patro::at_time::observer_zone(&loc);
    let inputs = jyotish::kundali_detail::DetailInputs {
        instant,
        location: &loc,
        zone: &zone,
        now: state.now(),
    };
    match jyotish::kundali_detail::assemble(&inputs, &panchanga) {
        Ok(payload) => json_payload(&payload, &q, &headers, "private, no-store", None, started),
        Err(e) => detail(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    }
}

/// `GET /v1/kundali/report`: the deterministic reading as NDJSON — a header, the
/// meta record, every section, `done`. Only drik reports are cached in Python, so
/// the Surya Siddhanta always answers `X-Report-Cache: miss`.
pub(crate) async fn report_route(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Err(r) = crate::respond::flag(&q, "force") {
        return r;
    }
    let (loc, instant) = match instant_request(&q, &state) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let zone = patro::at_time::observer_zone(&loc);
    let mut context = jyotish::report::BirthContext::default();
    if let Ok(panchanga) = patro::at_time::at_time_fields(instant, &loc) {
        let rows = panchanga
            .path(&["detail", "upagrahas"])
            .and_then(|v| v.as_array().cloned())
            .unwrap_or_default();
        let lon = |key: &str| {
            rows.iter()
                .find(|r| r["key"] == key)
                .and_then(|r| r["longitude"].as_f64())
        };
        context.gulika_lon = lon("gulika");
        context.mandi_lon = lon("mandi");
        if let Ok(day) = panchanga::at_time::vedic_day(instant, &loc, &zone) {
            context.is_day = Some(day.sunrise <= instant && instant < day.sunset);
        }
    }
    let lang = q.get("lang").map_or("ne", String::as_str);
    let records = match jyotish::report::kundali_report(instant, &loc, context, state.now(), lang) {
        Ok(r) => r,
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e.to_string()),
    };
    let header = json!({
        "kind": "header",
        "ayanamsha": "surya_siddhanta",
        "location": loc.as_json(),
        "birth_instant": observer_iso(instant, &loc),
    });
    let mut body = String::new();
    for record in std::iter::once(&header).chain(&records) {
        body.push_str(&common::pyjson::dumps(
            record,
            common::pyjson::Style::Default,
        ));
        body.push('\n');
    }
    crate::respond::raw_payload(
        body,
        "application/x-ndjson",
        &[
            ("cache-control", "no-store"),
            ("x-accel-buffering", "no"),
            ("x-report-cache", "miss"),
        ],
        &headers,
        0,
        started,
    )
}

/// `GET /v1/seasons/tropical`: the current ऋतु, the next five season starts and the
/// two ayanas, at the server's "now".
pub(crate) async fn tropical_seasons(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let loc = match super::panchanga::location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let payload = patro::seasons::tropical_seasons(&loc, state.now());
    json_plain_payload(&payload, &q, &headers, started)
}

/// `cycles: int = Query(1, ge=1, le=3)`.
fn cycles(q: &Query) -> Result<usize, Response> {
    let Some(raw) = q.get("cycles") else {
        return Ok(1);
    };
    let fail = |item: Value| {
        Err(detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &json!([item]),
        ))
    };
    match raw.trim().parse::<i64>() {
        Err(_) => fail(json!({
            "type": "int_parsing", "loc": ["query", "cycles"],
            "msg": "Input should be a valid integer, unable to parse string as an integer", "input": raw,
        })),
        Ok(v) if v < 1 => fail(json!({
            "type": "greater_than_equal", "loc": ["query", "cycles"],
            "msg": "Input should be greater than or equal to 1", "input": raw, "ctx": {"ge": 1},
        })),
        Ok(v) if v > 3 => fail(json!({
            "type": "less_than_equal", "loc": ["query", "cycles"],
            "msg": "Input should be less than or equal to 3", "input": raw, "ctx": {"le": 3},
        })),
        Ok(v) => Ok(usize::try_from(v).unwrap_or(1)),
    }
}

/// `GET /v1/kundali/vimshottari`: the Mahadasha sequence from the birth Moon.
pub(crate) async fn vimshottari(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let cycles = match cycles(&q) {
        Ok(c) => c,
        Err(r) => return r,
    };
    let (loc, instant) = match instant_request(&q, &state) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let moon = panchanga::graha_positions(loc.system, instant.to_jd())
        .iter()
        .find(|p| p.key == "moon")
        .map_or(0.0, |p| p.longitude);
    let mut payload = json!({
        "ayanamsha": "surya_siddhanta",
        "moon_longitude": moon,
        "location": loc.as_json(),
        "query_instant": observer_iso(instant, &loc),
    });
    if let (Value::Object(fields), Value::Object(dasha)) = (
        &mut payload,
        jyotish::dasha::vimshottari_payload(moon, instant, cycles),
    ) {
        fields.extend(dasha);
    }
    json_no_store_payload(&payload, &q, &headers, started)
}

/// `GET /v1/shadbala`: sixfold strength at an instant.
pub(crate) async fn shadbala(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let (loc, instant) = match instant_request(&q, &state) {
        Ok(v) => v,
        Err(r) => return r,
    };
    let mut payload = match jyotish::shadbala::shadbala(instant, &loc) {
        Ok(p) => p,
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e.to_string()),
    };
    if let Value::Object(fields) = &mut payload {
        fields.insert("location".into(), loc.as_json());
        fields.insert("query_instant".into(), json!(observer_iso(instant, &loc)));
    }
    json_no_store_payload(&payload, &q, &headers, started)
}

/// `GET /v1/kundali/yogas/reference` (`id=`, `q=`).
pub(crate) async fn yoga_reference(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    use patro::reference::{ReferenceError, YogaQuery, yoga_reference};
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let id = q.get("id").filter(|v| !v.is_empty());
    let search = q.get("q").filter(|v| !v.is_empty());
    let query = match (id, search) {
        (Some(id), _) => YogaQuery::Id(id),
        (None, Some(s)) => YogaQuery::Search(s),
        (None, None) => YogaQuery::All,
    };
    let combinations = match yoga_reference(&state.config.data_dir, query) {
        Ok(Some(rows)) => rows,
        // Python raised this 404 inside a `try` whose `except Exception` turned it into a
        // 500 ("Yoga reference catalog failed to load: 404: …"); it is the 404 it meant.
        Ok(None) => {
            return detail(
                StatusCode::NOT_FOUND,
                &format!(
                    "No yoga combination with id {}",
                    patro::date_key::py_repr_str(id.map_or("", String::as_str))
                ),
            );
        }
        Err(ReferenceError::Missing(m)) => return detail(StatusCode::SERVICE_UNAVAILABLE, &m),
        Err(e) => return detail(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    };
    let payload = json!({
        "source": "Three Hundred Important Combinations — B. V. Raman",
        "part": "Parts I–II (combinations 1–300)",
        "count": combinations.len(),
        "combinations": combinations,
    });
    crate::respond::json_compact(
        &payload,
        &q,
        &headers,
        Some(crate::respond::DEFAULT),
        Some(crate::respond::DEFAULT),
        started,
    )
}

/// `GET /v1/kundali/reference/bhava`.
pub(crate) async fn bhava_reference(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    match patro::reference::bhava_reference(&state.config.data_dir) {
        Ok(payload) => crate::respond::json_compact(
            &payload,
            &q,
            &headers,
            Some(crate::respond::DEFAULT),
            Some(crate::respond::DEFAULT),
            started,
        ),
        Err(e) => detail(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    }
}

/// `GET /v1/kundali/{date_key}` (`era`: `bs` or `ad`): planets at sunrise.
pub(crate) async fn kundali_day(
    State(state): State<AppState>,
    axum::extract::Path(date_key): axum::extract::Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let loc = match super::panchanga::location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let era = q.get("era").map_or("bs", String::as_str);
    if !matches!(era, "bs" | "ad") {
        return detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &json!([{
                "type": "literal_error", "loc": ["query", "era"],
                "msg": "Input should be 'bs' or 'ad'", "input": era,
                "ctx": {"expected": "'bs' or 'ad'"},
            }]),
        );
    }
    let day = match patro::date_key::greg_day_for_date_key(&date_key, era) {
        Ok(d) => d,
        Err(m) => return detail(StatusCode::BAD_REQUEST, &m),
    };
    if !day.is_datetime_range() {
        return detail(
            StatusCode::NOT_IMPLEMENTED,
            &format!("{day}: days before 1582-10-15 are not ported to the Rust server yet"),
        );
    }
    let daily = match panchanga::daily::build_daily(day, &loc) {
        Ok(r) => r,
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e.to_string()),
    };
    let raw = daily.tree();
    let mut planets = serde_json::Map::new();
    if let Some(rows) = raw["planets"].as_object() {
        for (name, pos) in rows {
            let degree = panchanga::pyfloat::py_mod(pos["longitude"].as_f64().unwrap_or(0.0), 30.0);
            planets.insert(
                name.clone(),
                json!(format!(
                    "{} {degree:.1}°",
                    pos["rashi_name"].as_str().unwrap_or_default()
                )),
            );
        }
    }
    let bs = &raw["bs_date"];
    let payload = json!({
        "date_bs": format!(
            "{}-{:02}-{:02}",
            bs["year"].as_i64().unwrap_or(0),
            bs["month"].as_i64().unwrap_or(0),
            bs["day"].as_i64().unwrap_or(0)
        ),
        "date_ad": day.to_string(),
        "location": raw["location"],
        "planets": planets,
        "planets_detail": raw["planets"],
        "lagna_note": "Lagna requires birth time; positions are at sunrise (udaya).",
    });
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/kundali/dasha/expand?lord=&start=&end=&system=`.
pub(crate) async fn dasha_expand(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    use jyotish::dasha::{Aware, VIMSHOTTARI, YOGINI, sub_periods_aware};
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let missing: Vec<Value> = ["lord", "start", "end"]
        .iter()
        .filter(|k| !q.contains_key(**k))
        .map(|k| json!({"type": "missing", "loc": ["query", k], "msg": "Field required", "input": null}))
        .collect();
    if !missing.is_empty() {
        return detail_json(StatusCode::UNPROCESSABLE_ENTITY, &Value::Array(missing));
    }
    let system_name = q.get("system").map_or("vimshottari", String::as_str);
    let system = if system_name == "yogini" {
        &YOGINI
    } else {
        &VIMSHOTTARI
    };
    let parse = |k: &str| {
        patro::at_time::parse_iso_aware(&q[k].replace('Z', "+00:00"))
            .map(|(utc, offset)| Aware { utc, offset })
    };
    let (start, end) = match (parse("start"), parse("end")) {
        (Ok(s), Ok(e)) => (s, e),
        (Err(e), _) | (_, Err(e)) => return day_error(e),
    };
    let lord = &q["lord"];
    let Some(children) = sub_periods_aware(system, lord, start, end, None) else {
        return detail(StatusCode::BAD_REQUEST, "tuple.index(x): x not in tuple");
    };
    let children: Vec<Value> = children
        .into_iter()
        .map(|(i, s, e)| {
            json!({
                "lord": system.keys[i], "lord_ne": system.names_ne[i],
                "start": s.iso(), "end": e.iso(),
            })
        })
        .collect();
    json_no_store_payload(
        &json!({"lord": lord, "system": system_name, "children": children}),
        &q,
        &headers,
        started,
    )
}

/// One partner's birth moment for `/kundali/milan` (`instant_for_parts`).
fn milan_partner(
    system: astronomy::System,
    q: &Query,
    who: &str,
) -> Result<jyotish::milan::Partner, Response> {
    let get = |k: &str| q.get(&format!("{who}_{k}")).map(String::as_str);
    let num = |k: &str| get(k).and_then(|v| v.trim().parse::<f64>().ok());
    let int = |k: &str| get(k).and_then(|v| v.trim().parse::<i64>().ok());
    let tz = get("timezone").unwrap_or("Asia/Kathmandu");
    let (lat, lon) = (num("lat"), num("lon"));
    let zone = if lat
        .zip(lon)
        .is_some_and(|(a, o)| astronomy::engine::is_nepal_observer(a, o))
    {
        timescale::Zone::kathmandu()
    } else {
        let name = if tz.is_empty() { "Asia/Kathmandu" } else { tz };
        timescale::Zone::get(name).map_err(|_| {
            detail(
                StatusCode::BAD_REQUEST,
                &format!("Unknown observer timezone: {name}"),
            )
        })?
    };
    let location = Location {
        lat: lat.unwrap_or(f64::NAN),
        lon: lon.unwrap_or(f64::NAN),
        zone,
        name: String::new(),
        city_id: None,
        system,
    };
    let mut jd = num("jd");
    if jd.is_none()
        && let (Some(y), Some(m), Some(d)) = (int("year"), int("month"), int("day"))
    {
        let era = get("era").filter(|e| !e.is_empty()).unwrap_or("ad");
        jd = Some(
            patro::date_key::to_jd(era, y, Some(m), Some(d))
                .map_err(|m| detail(StatusCode::BAD_REQUEST, &m))?,
        );
    }
    let query = InstantQuery {
        datetime: get("datetime"),
        jd,
        clock: get("clock"),
    };
    let instant = resolve_instant(query, &location).map_err(day_error)?;
    location
        .ensure_supported(timescale::CivilDay::from_jd_ut(instant.to_jd()))
        .map_err(|e| detail(StatusCode::BAD_REQUEST, &e.to_string()))?;
    let moon = panchanga::graha_positions(system, instant.to_jd())
        .iter()
        .find(|p| p.key == "moon")
        .map_or(0.0, |p| p.longitude);
    Ok(jyotish::milan::Partner {
        moon_longitude: moon,
        birth_instant: observer_iso(instant, &location),
        location: json!({"lat": lat, "lon": lon, "timezone": tz}),
    })
}

/// pydantic's 422 items for the milan query's numeric parameters, in declaration order.
fn milan_errors(q: &Query) -> Vec<Value> {
    let mut errors = Vec::new();
    let mut check = |key: String, kind: &str, ge: Option<i64>, le: Option<i64>| {
        let Some(raw) = q.get(&key) else { return };
        let item = |t: &str, msg: String, ctx: Option<Value>| {
            let mut v = json!({"type": t, "loc": ["query", key], "msg": msg, "input": raw});
            if let (Some(c), Value::Object(m)) = (ctx, &mut v) {
                m.insert("ctx".into(), c);
            }
            v
        };
        if kind == "float" {
            if raw.trim().parse::<f64>().is_err() {
                errors.push(item(
                    "float_parsing",
                    "Input should be a valid number, unable to parse string as a number".into(),
                    None,
                ));
            }
            return;
        }
        match raw.trim().parse::<i64>() {
            Err(_) => errors.push(item(
                "int_parsing",
                "Input should be a valid integer, unable to parse string as an integer".into(),
                None,
            )),
            Ok(v) if ge.is_some_and(|g| v < g) => errors.push(item(
                "greater_than_equal",
                "Input should be greater than or equal to 1".into(),
                Some(json!({"ge": 1})),
            )),
            Ok(v) if le.is_some_and(|l| v > l) => errors.push(item(
                "less_than_equal",
                "Input should be less than or equal to 12".into(),
                Some(json!({"le": 12})),
            )),
            Ok(_) => {}
        }
    };
    for who in ["boy", "girl"] {
        check(format!("{who}_jd"), "float", None, None);
        check(format!("{who}_year"), "int", Some(1), None);
        check(format!("{who}_month"), "int", Some(1), Some(12));
        check(format!("{who}_day"), "int", Some(1), None);
    }
    for key in ["boy_lat", "boy_lon", "girl_lat", "girl_lon"] {
        check(key.to_owned(), "float", None, None);
    }
    errors
}

/// `GET /v1/kundali/milan`: Ashtakoota compatibility of two births.
pub(crate) async fn milan(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let system = request_system(&state, &q).unwrap_or_default();
    let errors = milan_errors(&q);
    if !errors.is_empty() {
        return detail_json(StatusCode::UNPROCESSABLE_ENTITY, &Value::Array(errors));
    }
    for who in ["boy", "girl"] {
        if !["datetime", "jd", "year"]
            .iter()
            .any(|k| q.contains_key(&format!("{who}_{k}")))
        {
            return detail(
                StatusCode::BAD_REQUEST,
                &format!(
                    "provide {who}_jd + {who}_clock, {who}_era + {who}_year/month/day + {who}_clock, or {who}_datetime"
                ),
            );
        }
    }
    let (boy, girl) = match (
        milan_partner(system, &q, "boy"),
        milan_partner(system, &q, "girl"),
    ) {
        (Ok(b), Ok(g)) => (b, g),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let lang = q.get("lang").map_or("ne", String::as_str);
    json_plain_payload(
        &jyotish::milan::kundali_milan(&boy, &girl, lang),
        &q,
        &headers,
        started,
    )
}
