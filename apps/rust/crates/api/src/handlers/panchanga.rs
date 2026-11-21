//! `/v1/panchanga/…` routes.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::time::Instant;

use axum::{
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use geography::{LocationError, LocationQuery};
use panchanga::daily::Location;
use patro::presentation::{Locale, MonthStyle};
use patro::{
    month::{Embed, International, MonthError, month_calendar},
    year::{YearShape, year_calendar, year_sun_times},
};
use timescale::CivilDay;

use crate::{
    respond::{IMMUTABLE, LIVE, Query, detail, era_error, flag, json_payload, siddhanta_error},
    state::AppState,
};

/// `LocationDep`: the observer from `lat`/`lon`/`timezone`/`city`/`city_id`.
pub(crate) fn location(q: &Query, state: &AppState) -> Result<Location, Response> {
    let parse_f = |k: &str| -> Result<Option<f64>, Response> {
        q.get(k)
            .map(|v| {
                v.parse::<f64>().map_err(|_| {
                    detail(
                        StatusCode::UNPROCESSABLE_ENTITY,
                        &format!("{k}: Input should be a valid number"),
                    )
                })
            })
            .transpose()
    };
    let query = LocationQuery {
        lat: parse_f("lat")?,
        lon: parse_f("lon")?,
        timezone: q.get("timezone").cloned(),
        city: q.get("city").cloned(),
        city_id: q
            .get("city_id")
            .map(|v| {
                v.parse::<i64>().map_err(|_| {
                    detail(
                        StatusCode::UNPROCESSABLE_ENTITY,
                        "city_id: Input should be a valid integer",
                    )
                })
            })
            .transpose()?,
    };
    geography::resolve_location(&query, &state.cities).map_err(|e| match e {
        LocationError::Invalid(msg) => detail(StatusCode::BAD_REQUEST, &msg),
        other => detail(StatusCode::SERVICE_UNAVAILABLE, &other.to_string()),
    })
}

/// The current BS year at the server's clock (`gregorian_to_bs(date.today())`).
fn current_bs_year() -> i32 {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64());
    let today = CivilDay::from_jd_ut(2_440_587.5 + now / 86400.0);
    calendar::civil_to_bs(today).map_or(0, |bs| bs.year)
}

/// `_signed_bs_year_from_browse` + `_validate_bs_year`: the signed patro year a
/// browse URL names (`era=bbs` maps url year N to −N).
pub(crate) fn signed_browse_year(era: &str, url_year: i64) -> Result<i32, Response> {
    let invalid = || {
        detail(
            StatusCode::BAD_REQUEST,
            "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
        )
    };
    let Ok(url_year) = i32::try_from(url_year) else {
        return Err(invalid());
    };
    let signed = if era == "bbs" {
        if !(1..=3_891_137).contains(&url_year) {
            return Err(detail(
                StatusCode::BAD_REQUEST,
                "bbs url year must be 1..3891137 (पू. वि.सं.)",
            ));
        }
        -url_year
    } else {
        url_year
    };
    if signed == 0 || !(-3_891_138..=17053).contains(&signed) {
        return Err(invalid());
    }
    Ok(signed)
}

/// `FastAPI`'s `int` path parameter, with pydantic's 422.
pub(crate) fn path_int(raw: &str, name: &str) -> Result<i64, Response> {
    raw.trim().parse::<i64>().map_err(|_| {
        crate::respond::detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &serde_json::json!([{
                "type": "int_parsing", "loc": ["path", name],
                "msg": "Input should be a valid integer, unable to parse string as an integer",
                "input": raw,
            }]),
        )
    })
}

pub(crate) fn month_error(error: MonthError) -> Response {
    match error {
        MonthError::BadRequest(msg) => detail(StatusCode::BAD_REQUEST, &msg),
        MonthError::NotPorted(what) => detail(
            StatusCode::NOT_IMPLEMENTED,
            &format!("{what} are not ported to the Rust server yet"),
        ),
        _ => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// The year directive: immutable for past BS years, live otherwise.
pub(crate) fn year_directive(signed: i32) -> &'static str {
    if signed < current_bs_year() {
        IMMUTABLE
    } else {
        LIVE
    }
}

/// `GET /v1/panchanga/year/{bs_year}`: every month of a BS year (`full=`, `wheel=`).
pub(crate) async fn year(
    State(state): State<AppState>,
    Path(raw_year): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let bs_year = match path_int(&raw_year, "bs_year") {
        Ok(y) => y,
        Err(r) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let (full, wheel) = match (flag(&q, "full"), flag(&q, "wheel")) {
        (Ok(f), Ok(w)) => (f, w),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let era = q
        .get("era")
        .map_or_else(|| "bs".to_owned(), |e| e.trim().to_lowercase());
    let signed = match signed_browse_year(&era, bs_year) {
        Ok(y) => y,
        Err(r) => return r,
    };
    let shape = if wheel {
        YearShape::Wheel
    } else if full {
        YearShape::Full
    } else {
        YearShape::Lite
    };
    let built = tokio::task::spawn_blocking(move || year_calendar(signed, &loc, shape)).await;
    match built {
        Ok(Ok(payload)) => json_payload(
            &payload,
            &q,
            &headers,
            year_directive(signed),
            None,
            started,
        ),
        Ok(Err(e)) => month_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/panchanga/year/{bs_year}/sun`: sunrise, sunset and ayana for a BS year.
pub(crate) async fn year_sun(
    State(state): State<AppState>,
    Path(raw_year): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let bs_year = match path_int(&raw_year, "bs_year") {
        Ok(y) => y,
        Err(r) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let signed = match signed_browse_year("bs", bs_year) {
        Ok(y) => y,
        Err(r) => return r,
    };
    let built = tokio::task::spawn_blocking(move || year_sun_times(signed, &loc)).await;
    match built {
        Ok(Ok(payload)) => json_payload(
            &payload,
            &q,
            &headers,
            year_directive(signed),
            None,
            started,
        ),
        Ok(Err(e)) => month_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/panchanga/{bs_year}/{bs_month}`: the BS month grid.
pub(crate) async fn month(
    State(state): State<AppState>,
    Path((bs_year, bs_month)): Path<(i64, i64)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let era = q.get("era").map_or("bs", String::as_str).to_owned();
    if !matches!(era.as_str(), "bs" | "bbs") {
        return detail(
            StatusCode::UNPROCESSABLE_ENTITY,
            "era: Input should be 'bs' or 'bbs'",
        );
    }
    let (full, exclude_international) = match (flag(&q, "full"), flag(&q, "exclude_international"))
    {
        (Ok(f), Ok(e)) => (f, e),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let signed = match signed_browse_year(&era, bs_year) {
        Ok(y) => y,
        Err(r) => return r,
    };
    if !(1..=12).contains(&bs_month) {
        return detail(StatusCode::BAD_REQUEST, "month must be 1..12");
    }
    let clock = q.get("clock").filter(|c| !c.is_empty()).cloned();
    let slim = match flag(&q, "slim") {
        Ok(v) => v,
        Err(r) => return r,
    };
    let embed = match (full, slim) {
        (false, _) => Embed::Lite,
        (true, false) => Embed::Full,
        (true, true) => Embed::FullSlim,
    };
    let month_u = u32::try_from(bs_month).unwrap_or(1);
    let built = tokio::task::spawn_blocking(move || {
        let international = if exclude_international {
            International::Exclude
        } else {
            International::Include
        };
        match clock {
            Some(clock) => patro::month::month_calendar_at_clock(
                signed,
                month_u,
                &loc,
                &clock,
                international,
                embed,
            ),
            None => month_calendar(signed, month_u, &loc, international, embed),
        }
    })
    .await;
    let payload = match built {
        Ok(Ok(p)) => p,
        Ok(Err(MonthError::BadRequest(msg))) => return detail(StatusCode::BAD_REQUEST, &msg),
        Ok(Err(MonthError::NotPorted(what))) => {
            return detail(
                StatusCode::NOT_IMPLEMENTED,
                &format!("{what} are not ported to the Rust server yet"),
            );
        }
        Ok(Err(_)) | Err(_) => return detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };
    let directive = if signed < current_bs_year() {
        IMMUTABLE
    } else {
        LIVE
    };
    json_payload(&payload, &q, &headers, directive, None, started)
}

/// `full` / `slim` as the month routes read them.
fn embed_flags(q: &Query) -> Result<(Embed, International), Response> {
    let full = flag(q, "full")?;
    let slim = flag(q, "slim")?;
    let international = if flag(q, "exclude_international")? {
        International::Exclude
    } else {
        International::Include
    };
    let embed = match (full, slim) {
        (false, _) => Embed::Lite,
        (true, false) => Embed::Full,
        (true, true) => Embed::FullSlim,
    };
    Ok((embed, international))
}

/// `GET /v1/panchanga/ad/{ad_year}/{ad_month}`: a Gregorian month grid.
pub(crate) async fn ad_month(
    State(state): State<AppState>,
    Path((raw_year, raw_month)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let (ad_year, ad_month) = match (
        path_int(&raw_year, "ad_year"),
        path_int(&raw_month, "ad_month"),
    ) {
        (Ok(y), Ok(m)) => (y, m),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let (embed, international) = match embed_flags(&q) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if !(1..=16995).contains(&ad_year) {
        return detail(
            StatusCode::BAD_REQUEST,
            "ad year out of supported range (1..16995)",
        );
    }
    if !(1..=12).contains(&ad_month) {
        return detail(StatusCode::BAD_REQUEST, "ad_month must be 1..12");
    }
    if q.get("clock").is_some_and(|c| !c.is_empty()) {
        return detail(
            StatusCode::BAD_REQUEST,
            "clock mode not supported for AD month yet",
        );
    }
    let (Ok(year), Ok(month)) = (i32::try_from(ad_year), u32::try_from(ad_month)) else {
        return detail(StatusCode::BAD_REQUEST, "ad_month must be 1..12");
    };
    let built = tokio::task::spawn_blocking(move || {
        patro::month::ad_month_calendar(year, month, &loc, international, embed)
    })
    .await;
    match built {
        Ok(Ok(payload)) => json_payload(
            &payload,
            &q,
            &headers,
            year_directive(year + 56),
            None,
            started,
        ),
        Ok(Err(e)) => month_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/panchanga/bc/{bc_year}/{bc_month}`: a BCE (Julian-calendar) month grid.
pub(crate) async fn bc_month(
    State(state): State<AppState>,
    Path((raw_year, raw_month)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let (bc_year, bc_month) = match (
        path_int(&raw_year, "bc_year"),
        path_int(&raw_month, "bc_month"),
    ) {
        (Ok(y), Ok(m)) => (y, m),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let (embed, international) = match embed_flags(&q) {
        Ok(v) => v,
        Err(r) => return r,
    };
    if !(1..=3_891_194).contains(&bc_year) {
        return detail(
            StatusCode::BAD_REQUEST,
            "bc year out of supported range (1..3891194)",
        );
    }
    if !(1..=12).contains(&bc_month) {
        return detail(StatusCode::BAD_REQUEST, "bc_month must be 1..12");
    }
    let (Ok(year), Ok(month)) = (i32::try_from(bc_year), u32::try_from(bc_month)) else {
        return detail(StatusCode::BAD_REQUEST, "bc_month must be 1..12");
    };
    let built = tokio::task::spawn_blocking(move || {
        patro::month::gregorian_month_calendar(
            patro::month::GregorianEra::Bc,
            year,
            month,
            &loc,
            international,
            embed,
        )
    })
    .await;
    match built {
        // `bs_year_cache_control(-bc_year)`: always a past year.
        Ok(Ok(payload)) => {
            json_payload(&payload, &q, &headers, year_directive(-year), None, started)
        }
        Ok(Err(e)) => month_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/nepal/patro/ad/{ad_year}/{ad_month}`: an AD month's daily panchanga
/// with each day's festivals.
pub(crate) async fn nepal_patro_ad(
    State(state): State<AppState>,
    Path((raw_year, raw_month)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let (year, month) = match (
        path_int(&raw_year, "ad_year"),
        path_int(&raw_month, "ad_month"),
    ) {
        (Ok(y), Ok(m)) => (y, m),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    if !(1..=12).contains(&month) {
        return detail(StatusCode::BAD_REQUEST, "ad_month must be 1..12");
    }
    let (Ok(year), Ok(month)) = (i32::try_from(year), u32::try_from(month)) else {
        return detail(StatusCode::BAD_REQUEST, "ad_year out of range");
    };
    match tokio::task::spawn_blocking(move || {
        patro::presentation::ad_month_patro(year, month, &loc)
    })
    .await
    {
        Ok(Ok(p)) => crate::respond::json_plain_payload(&p, &q, &headers, started),
        Ok(Err(e)) => month_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/nepal/patro/{bs_year}/{bs_month}`: the printable patro grid and its
/// `format=` renderings (canonical, surya, toyanath, dayblock with `output=text`).
pub(crate) async fn nepal_patro(
    State(state): State<AppState>,
    Path((raw_year, raw_month)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let (year, month) = match (
        path_int(&raw_year, "bs_year"),
        path_int(&raw_month, "bs_month"),
    ) {
        (Ok(y), Ok(m)) => (y, m),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let mut errors = Vec::new();
    for (key, allowed, expected) in [
        (
            "format",
            &["patro", "dayblock", "surya", "toyanath", "canonical"][..],
            "'patro', 'dayblock', 'surya', 'toyanath' or 'canonical'",
        ),
        ("locale", &["en", "ne"][..], "'en' or 'ne'"),
        ("output", &["json", "text"][..], "'json' or 'text'"),
    ] {
        if let Some(raw) = q.get(key)
            && !allowed.contains(&raw.as_str())
        {
            errors.push(serde_json::json!({
                "type": "literal_error", "loc": ["query", key],
                "msg": format!("Input should be {expected}"), "input": raw,
                "ctx": {"expected": expected},
            }));
        }
    }
    if !errors.is_empty() {
        return crate::respond::detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &serde_json::Value::Array(errors),
        );
    }
    let signed = match signed_browse_year("bs", year) {
        Ok(y) => y,
        Err(r) => return r,
    };
    if !(1..=12).contains(&month) {
        return detail(StatusCode::BAD_REQUEST, "month must be 1..12");
    }
    let style = match q.get("format").map(String::as_str) {
        Some("canonical") => Some(MonthStyle::Canonical),
        Some("surya") => Some(MonthStyle::Surya),
        Some("toyanath") => Some(MonthStyle::Toyanath),
        Some("dayblock") => Some(MonthStyle::Dayblock),
        _ => None,
    };
    let locale = if q.get("locale").is_some_and(|l| l == "ne") {
        Locale::Ne
    } else {
        Locale::En
    };
    let text_out =
        style == Some(MonthStyle::Dayblock) && q.get("output").is_some_and(|o| o == "text");
    let month_u = u32::try_from(month).unwrap_or(1);
    match tokio::task::spawn_blocking(move || match style {
        None => patro::presentation::patro_month(signed, month_u, &loc),
        Some(style) => patro::presentation::styled_month(signed, month_u, &loc, style, locale),
    })
    .await
    {
        Ok(Ok(p)) if text_out => crate::respond::raw_payload(
            p["text"].as_str().unwrap_or("").to_owned(),
            "text/plain; charset=utf-8",
            &[],
            &headers,
            1024,
            started,
        ),
        Ok(Ok(p)) => json_payload(&p, &q, &headers, year_directive(signed), None, started),
        Ok(Err(e)) => month_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}
