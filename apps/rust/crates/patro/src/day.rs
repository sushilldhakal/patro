//! Daily-route use cases (`/panchanga/...`) and day-adjacent helpers.
//!
//! This ports the request-independent business logic from
//! `services/panchanga/panchanga_api.py`: day-key resolution to Julian Day, daily
//! payload shaping, month headers, and BS/AD conversion helpers.

use std::{
    collections::HashMap,
    hash::BuildHasher,
    str::FromStr,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use calendar::BsDate;
use panchanga::{
    HoraSlot, Muhurta,
    daily::{Daily, DailyError, Location, build_daily, build_daily_civil},
    payload::{Field, Fields},
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, JdInstant, PyInstant, UtcInstant};

use crate::{
    caches::gregorian_year_festivals,
    date_key::{self, RELATIVE_DAY_KEYS},
};

const BS_MONTH_NAMES: [&str; 12] = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush",
    "Magh", "Falgun", "Chaitra",
];
const BS_MONTH_NAMES_NE: [&str; 12] = [
    "बैशाख",
    "जेठ",
    "आषाढ",
    "श्रावण",
    "भाद्र",
    "आश्विन",
    "कार्तिक",
    "मंसिर",
    "पौष",
    "माघ",
    "फाल्गुन",
    "चैत्र",
];
const AD_MONTH_NAMES: [&str; 12] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const WEEKDAY_EN: [&str; 7] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

/// Whether the day payload keeps the heavy `detail` block.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DetailMode {
    /// Keep `detail`.
    Include,
    /// Omit `detail`.
    Exclude,
}

/// Whether the day payload applies `slim=true` trimming.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SlimMode {
    /// Keep the full day shape.
    Keep,
    /// Drop fields the app does not read (`payload_slim.py`).
    Slim,
}

/// Whether day festivals are included.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FestivalMode {
    /// Omit `festivals` and `festival_saits`.
    Exclude,
    /// Include festivals with detail enrichment and `festival_saits` (the day route).
    Include,
    /// Include the plain festival rows only, as `build_daily_state` returns them to
    /// other use cases (at-time): no enrichment, no `festival_saits`.
    Plain,
}

/// Options for building one daily payload.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DayBuildOptions {
    /// `detail=true|false`.
    pub detail: DetailMode,
    /// `slim=true|false`.
    pub slim: SlimMode,
    /// `festivals=true|false`.
    pub festivals: FestivalMode,
}

/// Why a day-route payload could not be built.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[non_exhaustive]
pub enum DayError {
    /// A bad caller input (maps to 400).
    #[error("{0}")]
    BadRequest(String),
    /// A branch not ported yet (maps to 501).
    #[error("{0}")]
    NotPorted(String),
    /// Calendar parts the era middleware rejects (a 400 with its own separators).
    #[error("{0}")]
    Era(String),
}

impl From<calendar::BsError> for DayError {
    fn from(e: calendar::BsError) -> Self {
        Self::BadRequest(e.to_string())
    }
}

impl From<DailyError> for DayError {
    fn from(e: DailyError) -> Self {
        match e {
            DailyError::BeforeGregorian(day) => Self::NotPorted(format!(
                "{day}: days before 1582-10-15 are not ported to the Rust server yet"
            )),
            other => Self::BadRequest(other.to_string()),
        }
    }
}

/// `_as_float` of the era middleware: blank or junk is `None`.
fn as_float(raw: Option<&String>) -> Option<f64> {
    raw.map(|v| v.trim())
        .filter(|v| !v.is_empty())
        .and_then(|v| v.replace('_', "").parse::<f64>().ok())
}

/// `_as_int` of the era middleware: blank or junk is `None`.
fn as_int(raw: Option<&String>) -> Option<i64> {
    raw.filter(|v| !v.trim().is_empty())
        .and_then(|v| date_key::py_int(v))
}

/// `day_jd_for_request` behind `EraMiddleware._resolve`: a request's day as a JD.
///
/// `?jd=` and `?year=&month=&day=` only count when the request names a display
/// `era` (without one the middleware builds no context and they are ignored);
/// then the `{date_key}` (or a relative key such as `today`), read in the input
/// era; then a bare `?year=` (with `era`); then the observer's current day.
///
/// # Errors
///
/// [`DayError::Era`] for calendar parts the middleware rejects, and
/// [`DayError::BadRequest`] when the date key cannot name a day.
pub fn resolve_request_jd(
    query: &HashMap<String, String, impl BuildHasher>,
    date_key: Option<&str>,
    location: &Location,
) -> Result<f64, DayError> {
    let display = query
        .get("era")
        .map(|e| e.trim().to_lowercase())
        .filter(|e| !e.is_empty());
    let mut era_julian = None;
    if let Some(display) = display {
        let parse_era = ["inputEra", "input_era"]
            .iter()
            .find_map(|k| query.get(*k).filter(|v| !v.is_empty()))
            .map(|v| v.trim().to_lowercase())
            .filter(|v| !v.is_empty())
            .unwrap_or(display);
        if let Some(jd) = as_float(query.get("jd")) {
            return Ok(jd);
        }
        let year = as_int(query.get("year"));
        let month = as_int(query.get("month"));
        let day = as_int(query.get("day"));
        if let (Some(y), Some(m), Some(d)) = (year, month, day) {
            return date_key::to_jd(&parse_era, y, Some(m), Some(d)).map_err(DayError::Era);
        }
        era_julian = Some(match year {
            Some(y) => date_key::to_jd(&parse_era, y, month, day).map_err(DayError::Era)?,
            None => today_jd_ut(location)?,
        });
    }

    if let Some(raw_key) = date_key {
        let key = raw_key.trim().to_lowercase();
        if RELATIVE_DAY_KEYS.contains(&key.as_str()) {
            let today = today_jd_ut(location)?;
            return Ok(if key == "tomorrow" {
                CivilDay::from_jd_ut(today).add_days(1).to_jd_ut()
            } else {
                today
            });
        }
        return date_key::parse_date_key(raw_key, &input_era(query)).map_err(DayError::BadRequest);
    }

    match era_julian {
        Some(jd) => Ok(jd),
        None => today_jd_ut(location),
    }
}

/// `build_daily_state` + `slim_day_payload`: one day response at a canonical civil JD.
///
/// # Errors
///
/// [`DayError::BadRequest`] for invalid inputs.
pub fn day_payload_for_jd(
    jd_ut: f64,
    location: &Location,
    options: DayBuildOptions,
) -> Result<Value, DayError> {
    day_payload_for_jd_with(jd_ut, location, options, DayVariant::default())
}

/// The `reference=` / `civil=` variants of a day response.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct DayVariant {
    /// `reference=midnight`: moving angas re-read at local 00:00.
    pub midnight: bool,
    /// `civil=true`: attach the midnight → midnight `civil_timeline`.
    pub civil_timeline: bool,
}

/// [`day_payload_for_jd`] with the `reference=` / `civil=` variants (`_day_payload_for_jd`).
/// Both are ignored for days before 1582-10-15, except `reference=midnight`, which
/// Python refuses there (501).
///
/// # Errors
///
/// [`DayError::BadRequest`] for invalid inputs, [`DayError::NotPorted`] for a
/// midnight reference before 1582-10-15.
pub fn day_payload_for_jd_with(
    jd_ut: f64,
    location: &Location,
    options: DayBuildOptions,
    variant: DayVariant,
) -> Result<Value, DayError> {
    day_fields_for_jd_with(jd_ut, location, options, variant).map(|f| f.to_value())
}

/// [`day_payload_for_jd_with`] as typed fields: the day's own values, and its
/// payload's blocks shared rather than copied, ready to be written straight to text.
///
/// # Errors
///
/// As [`day_payload_for_jd_with`].
pub fn day_fields_for_jd_with(
    jd_ut: f64,
    location: &Location,
    options: DayBuildOptions,
    variant: DayVariant,
) -> Result<Fields, DayError> {
    let civil = CivilDay::from_jd_ut(jd_ut);
    let mut payload = if civil.is_datetime_range() {
        let mut state = if variant.midnight {
            crate::midnight::midnight_day_state(civil, location, options)?
        } else {
            let raw = build_daily(civil, location)?;
            build_daily_state(civil, location, &raw, options)
        };
        if variant.civil_timeline {
            state.insert_tree(
                "civil_timeline",
                crate::civil_timeline::build_civil_timeline(civil, location)?,
            );
        }
        state
    } else if variant.midnight {
        return Err(DayError::NotPorted(
            "midnight reference for BCE civil days is not supported yet".into(),
        ));
    } else {
        // `_bce_day_payload`: the signed patro axis; festivals are only ever
        // resolved for `datetime` days, so the civil state never carries them.
        let raw = Daily::from_tree(build_daily_civil(
            civil,
            location,
            calendar::locate_patro_day(civil)?,
        )?);
        build_daily_state(
            civil,
            location,
            &raw,
            DayBuildOptions {
                festivals: FestivalMode::Exclude,
                ..options
            },
        )
    };
    if options.slim == SlimMode::Slim {
        payload = slim_day_payload(payload);
    }
    Ok(payload)
}

/// `build_calendar_header(bs_year, bs_month, location)`.
///
/// # Errors
///
/// [`DayError::BadRequest`] for invalid month/year values, and (as Python) for a
/// month whose middle day falls before 1582-10-15.
pub fn calendar_header(
    bs_year: i32,
    bs_month: u32,
    location: &Location,
) -> Result<Value, DayError> {
    if !(1..=12).contains(&bs_month) {
        return Err(DayError::BadRequest("month must be 1..12".into()));
    }
    let month_start = calendar::month_start(bs_year, bs_month)?;
    let month_length = calendar::month_length(bs_year, bs_month)?;
    let mid_day = month_length.min(15);
    let mid = calendar::bs_to_civil(BsDate {
        year: bs_year,
        month: bs_month,
        day: mid_day,
    })?;
    // Python reads the header from the middle day's `datetime` panchanga and
    // answers 400 when that day has none (before 1582-10-15).
    if !mid.is_datetime_range() {
        return Err(DayError::BadRequest(format!(
            "Civil day CivilDay(year={}, month={}, day={}) is outside datetime.date range",
            mid.year, mid.month, mid.day
        )));
    }
    let mid_daily = build_daily(mid, location)?;
    let mid_raw = mid_daily.tree();
    let lunar = mid_raw.get("lunar_month").cloned().unwrap_or(Value::Null);
    let ns = mid_raw.get("ns_date").cloned().unwrap_or(Value::Null);
    let mut ns_label = ns
        .get("year")
        .and_then(Value::as_i64)
        .map_or_else(String::new, |y| y.to_string());
    if let Some(paksha) = ns
        .get("paksha_ne")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
    {
        ns_label = format!("{ns_label} ({paksha})");
    }
    let end = calendar::bs_to_civil(BsDate {
        year: bs_year,
        month: bs_month,
        day: month_length,
    })?;
    let mut out = Map::new();
    out.insert("bikram_sambat".into(), json!(bs_year.to_string()));
    out.insert(
        "bikram_sambat_month".into(),
        json!(BS_MONTH_NAMES[usize::try_from(bs_month - 1).unwrap_or(0)]),
    );
    out.insert(
        "bikram_sambat_month_ne".into(),
        json!(BS_MONTH_NAMES_NE[usize::try_from(bs_month - 1).unwrap_or(0)]),
    );
    out.insert(
        "gregorian".into(),
        json!(format!(
            "{} {}",
            AD_MONTH_NAMES[usize::try_from(month_start.month - 1).unwrap_or(0)],
            month_start.year
        )),
    );
    out.insert(
        "gregorian_range".into(),
        json!({"start": month_start.to_string(), "end": end.to_string()}),
    );
    out.insert(
        "lunar_month".into(),
        lunar.get("name").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "lunar_month_full".into(),
        lunar.get("full_name").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "lunar_month_is_adhik".into(),
        lunar.get("is_adhik").cloned().unwrap_or(json!(false)),
    );
    out.insert(
        "lunar_month_type".into(),
        lunar.get("type").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "shaka_sambat".into(),
        json!(shaka_year(month_start).to_string()),
    );
    out.insert(
        "samvatsara".into(),
        mid_raw.get("samvatsara").cloned().unwrap_or(Value::Null),
    );
    out.insert("nepal_sambat".into(), json!(ns_label));
    out.insert("nepal_sambat_detail".into(), ns);
    out.insert("location".into(), location.as_json());
    Ok(Value::Object(out))
}

/// `convert/ad-to-bs/{ad_date}`.
///
/// # Errors
///
/// [`DayError::BadRequest`] when the date cannot be converted.
pub fn convert_ad_to_bs(ad: CivilDay) -> Result<Value, DayError> {
    let bs = calendar::civil_to_bs(ad)?;
    let mut out = Map::new();
    out.insert("ad_date".into(), json!(ad.to_string()));
    out.insert("bs_year".into(), json!(bs.year));
    out.insert("bs_month".into(), json!(bs.month));
    out.insert("bs_day".into(), json!(bs.day));
    out.insert(
        "bs_date".into(),
        json!(format!("{}-{:02}-{:02}", bs.year, bs.month, bs.day)),
    );
    out.insert(
        "bs_month_name".into(),
        json!(BS_MONTH_NAMES[usize::try_from(bs.month - 1).unwrap_or(0)]),
    );
    out.insert(
        "bs_month_name_ne".into(),
        json!(BS_MONTH_NAMES_NE[usize::try_from(bs.month - 1).unwrap_or(0)]),
    );
    out.insert("weekday".into(), json!(weekday_name(ad)));
    Ok(Value::Object(out))
}

/// `convert/bs-to-ad/{bs_date}`.
///
/// # Errors
///
/// [`DayError::BadRequest`] for malformed or invalid BS dates.
pub fn convert_bs_to_ad(text: &str) -> Result<Value, DayError> {
    let (bs_year, bs_month, bs_day) = parse_bs_date(text)?;
    let ad = calendar::bs_to_civil(BsDate {
        year: bs_year,
        month: bs_month,
        day: bs_day,
    })?;
    // Before 1582-10-15 the date is the Julian (or BCE, astronomical-year) civil
    // label; Python 500s there (`CivilDay` has no `strftime`), see rust_divergences.py.
    let mut out = Map::new();
    out.insert(
        "bs_date".into(),
        json!(format!("{bs_year}-{bs_month:02}-{bs_day:02}")),
    );
    out.insert("bs_year".into(), json!(bs_year));
    out.insert("bs_month".into(), json!(bs_month));
    out.insert("bs_day".into(), json!(bs_day));
    out.insert(
        "bs_month_name".into(),
        json!(BS_MONTH_NAMES[usize::try_from(bs_month - 1).unwrap_or(0)]),
    );
    out.insert(
        "bs_month_name_ne".into(),
        json!(BS_MONTH_NAMES_NE[usize::try_from(bs_month - 1).unwrap_or(0)]),
    );
    out.insert("ad_date".into(), json!(ad.to_string()));
    out.insert("weekday".into(), json!(weekday_name(ad)));
    Ok(Value::Object(out))
}

#[expect(
    clippy::too_many_lines,
    reason = "field-for-field mapping of Python build_daily_state output"
)]
pub(crate) fn build_daily_state(
    civil: CivilDay,
    location: &Location,
    raw: &Daily,
    options: DayBuildOptions,
) -> Fields {
    let f = raw.fields();
    let mut out = Fields::new();
    let bs = value_of(f, "bs_date");
    let bs_year = bs.get("year").and_then(Value::as_i64).unwrap_or(0);
    let bs_month = bs.get("month").and_then(Value::as_u64).unwrap_or(1);
    let bs_day = bs.get("day").and_then(Value::as_u64).unwrap_or(1);
    put(
        &mut out,
        "date_bs",
        json!(format!("{bs_year}-{bs_month:02}-{bs_day:02}")),
    );
    put(&mut out, "date_ad", json!(civil.to_string()));
    put(&mut out, "jd_ut", pass(f, "jd_ut", Value::Null));
    put(&mut out, "weekday", sub(f, "vaara", "name_ne"));
    put(&mut out, "weekday_en", sub(f, "vaara", "name_english"));
    put(
        &mut out,
        "sun",
        json!({
            "sunrise": sub(f, "sunrise", "local_time_short"),
            "sunset": sub(f, "sunset", "local_time_short"),
            "noon": solar_noon(f),
        }),
    );
    put(
        &mut out,
        "moon",
        json!({
            "rise": sub(f, "moonrise", "local_time_short"),
            "set": sub(f, "moonset", "local_time_short"),
        }),
    );
    put(
        &mut out,
        "tithi",
        element_state(&value_of(f, "tithi"), &location.zone),
    );
    put(
        &mut out,
        "nakshatra",
        element_state(&value_of(f, "nakshatra"), &location.zone),
    );
    put(
        &mut out,
        "yoga",
        element_state(&value_of(f, "yoga"), &location.zone),
    );
    put(
        &mut out,
        "karana",
        element_state(&value_of(f, "karana"), &location.zone),
    );
    put(&mut out, "paksha", sub(f, "paksha", "label_en"));
    put(&mut out, "paksha_ne", sub(f, "paksha", "label_ne"));
    put(&mut out, "chandra_rashi", sub(f, "chandra_rashi", "name"));
    put(
        &mut out,
        "chandra_rashi_ne",
        sub(f, "chandra_rashi", "name_ne"),
    );
    put(
        &mut out,
        "chandra_rashi_spans",
        pass(f, "chandra_rashi_spans", Value::Array(Vec::new())),
    );
    put(&mut out, "surya_rashi", sub(f, "surya_rashi", "name"));
    put(&mut out, "surya_rashi_ne", sub(f, "surya_rashi", "name_ne"));
    put(&mut out, "ritu", sub(f, "ritu", "name"));
    put(&mut out, "ritu_ne", sub(f, "ritu", "name_ne"));
    put(&mut out, "ritu_vedic", sub(f, "ritu_vedic", "name"));
    put(&mut out, "ritu_vedic_ne", sub(f, "ritu_vedic", "name_ne"));
    put(&mut out, "aayan", sub(f, "aayan", "name"));
    put(&mut out, "aayan_ne", sub(f, "aayan", "name_ne"));
    put(&mut out, "aayan_vedic", sub(f, "aayan_vedic", "name"));
    put(&mut out, "aayan_vedic_ne", sub(f, "aayan_vedic", "name_ne"));
    put(&mut out, "ayana_mark", sub(f, "aayan", "kranti_mark"));
    put(&mut out, "lagna", sub(f, "lagna", "name"));
    put(&mut out, "lagna_ne", sub(f, "lagna", "name_ne"));
    put(
        &mut out,
        "lagna_spans",
        pass(f, "lagna_spans", Value::Array(Vec::new())),
    );
    put(
        &mut out,
        "udaya_lagna",
        pass(f, "udaya_lagna", Value::Array(Vec::new())),
    );
    put(&mut out, "planets", pass(f, "planets", Value::Null));
    put(
        &mut out,
        "planets_anchor",
        pass(f, "planets_anchor", Value::Null),
    );
    put(
        &mut out,
        "solar_corrections",
        pass(f, "solar_corrections", Value::Null),
    );
    put(&mut out, "dinamaan", sub(f, "dinamaan", "label_en"));
    put(&mut out, "muhurta", pass(f, "muhurta", Value::Null));
    put(&mut out, "nivas_shool", pass(f, "nivas_shool", Value::Null));
    put(&mut out, "location", pass(f, "location", Value::Null));
    put(
        &mut out,
        "lunar_calendar",
        pass(f, "lunar_calendar", Value::Null),
    );
    put(&mut out, "lunar_month", pass(f, "lunar_month", Value::Null));
    put(&mut out, "bs_date", bs);
    put(&mut out, "from_cache", json!(false));

    let festival_bundle = if options.festivals == FestivalMode::Exclude {
        None
    } else {
        let (slim, detail_rows, saits) = festival_rows(civil, location, options.festivals);
        put(&mut out, "festivals", Value::Array(slim));
        Some((detail_rows, saits))
    };
    if options.detail == DetailMode::Include {
        // The payload's own fields, shared, with this day's festival rows.
        let mut detail = f.clone();
        if let Some((detail_rows, _)) = festival_bundle.as_ref() {
            detail.insert_tree("festivals", Value::Array(detail_rows.clone()));
        }
        put(&mut out, "detail", Field::Nested(Arc::new(detail)));
    }

    let (hora, hora_day) = hora_fields(f);
    put(&mut out, "hora", hora);
    put(&mut out, "hora_day", hora_day);
    put(
        &mut out,
        "choghadiya",
        pass(f, "choghadiya", Value::Array(Vec::new())),
    );
    put(
        &mut out,
        "tarabala_table",
        pass(f, "tarabala_table", Value::Null),
    );
    put(
        &mut out,
        "chandrabala_table",
        pass(f, "chandrabala_table", Value::Null),
    );
    put(&mut out, "rashifal", pass(f, "rashifal", Value::Null));
    if let Some((_, Some(saits))) = festival_bundle {
        put(&mut out, "festival_saits", Value::Array(saits));
    }

    put(&mut out, "jd_ut", json!(civil.to_jd_ut()));
    put(&mut out, "date_ad", json!(civil.to_string()));
    out
}

/// Sets `key` on a day's state.
fn put(out: &mut Fields, key: &'static str, field: impl Into<Field>) {
    out.insert(key, field.into());
}

/// The payload's field `key`, shared, or `default` when it has none.
fn pass(f: &Fields, key: &str, default: Value) -> Field {
    f.field(key)
        .cloned()
        .unwrap_or_else(|| Field::tree(default))
}

/// The payload's field `key` as a tree (`null` when absent).
fn value_of(f: &Fields, key: &str) -> Value {
    f.get(key).map_or(Value::Null, std::borrow::Cow::into_owned)
}

/// `payload[block][key]`, `null` when either is absent.
fn sub(f: &Fields, block: &str, key: &str) -> Value {
    f.get(block)
        .and_then(|v| v.get(key).cloned())
        .unwrap_or(Value::Null)
}

/// The muhurta block's solar noon, read from the typed block when it is one.
fn solar_noon(f: &Fields) -> Value {
    match f.field("muhurta") {
        Some(field) => match field.typed_as::<Muhurta>() {
            Some(m) => m
                .solar_noon()
                .map_or(Value::Null, |n| Value::String(n.to_owned())),
            None => field
                .as_tree()
                .get("abhijit")
                .and_then(|a| a.get("solar_noon"))
                .cloned()
                .unwrap_or(Value::Null),
        },
        None => Value::Null,
    }
}

/// The hora slots, and the daytime ones (`hora_day`), shared or filtered from the
/// typed block when it is one.
fn hora_fields(f: &Fields) -> (Field, Field) {
    let Some(field) = f.field("hora") else {
        let empty = || Field::tree(Value::Array(Vec::new()));
        return (empty(), empty());
    };
    if let Some(slots) = field.typed_as::<Vec<HoraSlot>>() {
        let day: Vec<HoraSlot> = slots.iter().filter(|s| s.is_day()).cloned().collect();
        return (field.clone(), Field::typed(day));
    }
    let tree = field.as_tree();
    let slots = tree.as_array().cloned().unwrap_or_default();
    let day = slots
        .iter()
        .filter(|slot| slot.get("phase").and_then(Value::as_str) == Some("day"))
        .cloned()
        .collect();
    (
        Field::tree(Value::Array(slots)),
        Field::tree(Value::Array(day)),
    )
}

/// Top-level slim festivals, detail occurrence rows, and (for [`FestivalMode::Include`]) the rows
/// enriched with festival detail plus `festival_saits`.
fn festival_rows(
    civil: CivilDay,
    location: &Location,
    mode: FestivalMode,
) -> (Vec<Value>, Vec<Value>, Option<Vec<Value>>) {
    // `festivals_on_date`: the Gregorian year's list, which holds occurrences a BS
    // year's list files under the neighbouring BS year (Chaite Dashain in March).
    let all = gregorian_year_festivals(civil.year, location);
    let detail_rows = all.on_day(civil);
    let mut slim: Vec<Value> = detail_rows
        .iter()
        .map(|f| {
            let mut row = Map::new();
            row.insert("id".into(), f.get("id").cloned().unwrap_or(Value::Null));
            row.insert(
                "name".into(),
                f.get("name_en")
                    .or_else(|| f.get("name"))
                    .cloned()
                    .unwrap_or(Value::Null),
            );
            row.insert(
                "name_ne".into(),
                f.get("name_ne").cloned().unwrap_or(Value::Null),
            );
            row.insert("type".into(), f.get("type").cloned().unwrap_or(Value::Null));
            row.insert(
                "category".into(),
                f.get("category").cloned().unwrap_or(Value::Null),
            );
            Value::Object(row)
        })
        .collect();
    let saits = (mode == FestivalMode::Include).then(|| {
        let ceremonies = crate::sait::ceremony_windows(civil, location);
        festivals::attach_festival_saits(&mut slim, civil, location, &ceremonies)
    });
    (slim, detail_rows, saits)
}

pub(crate) fn element_state(block: &Value, zone: &timescale::Zone) -> Value {
    let mut out = Map::new();
    out.insert(
        "name".into(),
        block.get("name").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "name_ne".into(),
        block.get("name_ne").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "start".into(),
        local_stamp(block.get("start_time").and_then(Value::as_str), zone)
            .map_or(Value::Null, Value::String),
    );
    out.insert(
        "end".into(),
        local_stamp(block.get("end_time").and_then(Value::as_str), zone)
            .map_or(Value::Null, Value::String),
    );
    let next = block.get("next").and_then(Value::as_object);
    out.insert(
        "next".into(),
        next.and_then(|n| n.get("name"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    out.insert(
        "next_ne".into(),
        next.and_then(|n| n.get("name_ne"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    out.insert(
        "end_ghati_clock".into(),
        block.get("end_ghati_clock").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "end_hours_clock".into(),
        block.get("end_hours_clock").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "progress".into(),
        block.get("progress").cloned().unwrap_or(Value::Null),
    );
    let has_next_end = next
        .and_then(|n| n.get("end_time"))
        .and_then(Value::as_str)
        .is_some_and(|s| !s.is_empty());
    if has_next_end {
        out.insert(
            "next_end".into(),
            local_stamp(
                next.and_then(|n| n.get("end_time")).and_then(Value::as_str),
                zone,
            )
            .map_or(Value::Null, Value::String),
        );
        out.insert(
            "next_end_ghati_clock".into(),
            next.and_then(|n| n.get("end_ghati_clock"))
                .cloned()
                .unwrap_or(Value::Null),
        );
        out.insert(
            "next_end_hours_clock".into(),
            next.and_then(|n| n.get("end_hours_clock"))
                .cloned()
                .unwrap_or(Value::Null),
        );
    }
    if let Some(third) = next
        .and_then(|n| n.get("next"))
        .and_then(serde_json::Value::as_object)
    {
        out.insert(
            "next_next".into(),
            third.get("name").cloned().unwrap_or(Value::Null),
        );
        out.insert(
            "next_next_ne".into(),
            third.get("name_ne").cloned().unwrap_or(Value::Null),
        );
        out.insert(
            "next_next_end_ghati_clock".into(),
            third.get("end_ghati_clock").cloned().unwrap_or(Value::Null),
        );
        out.insert(
            "next_next_end_hours_clock".into(),
            third.get("end_hours_clock").cloned().unwrap_or(Value::Null),
        );
    }
    Value::Object(out)
}

fn local_stamp(iso: Option<&str>, zone: &timescale::Zone) -> Option<String> {
    let wall = parse_ephemeris_instant(iso?)?.wall(zone);
    Some(format!("{} {}", wall.day, wall.hm))
}

/// An instant printed by a payload, read back as `parse_ephemeris_instant` does:
/// a `datetime` when its date label fits one, else a Julian Day instant.
pub(crate) enum PrintedInstant {
    /// A `datetime`-range instant.
    Utc(UtcInstant),
    /// An expanded-ISO instant before 1582-10-15 or BCE.
    Jd(JdInstant),
}

impl PrintedInstant {
    /// `format_ut_instant_local` / `astimezone` of the instant.
    pub(crate) fn wall(&self, zone: &timescale::Zone) -> timescale::WallClock {
        match self {
            Self::Utc(i) => i.wall(zone),
            Self::Jd(j) => j.wall(zone),
        }
    }
}

/// `parse_ephemeris_instant`.
pub(crate) fn parse_ephemeris_instant(text: &str) -> Option<PrintedInstant> {
    let (sign, body) = text.strip_prefix('-').map_or((1, text), |rest| (-1, rest));
    let mut parts = body.get(..10)?.splitn(3, '-').map(str::parse::<u32>);
    let (Some(Ok(y)), Some(Ok(m)), Some(Ok(d))) = (parts.next(), parts.next(), parts.next()) else {
        return None;
    };
    let label = CivilDay::new(sign * i32::try_from(y).ok()?, m, d);
    if label.is_datetime_range() {
        UtcInstant::from_str(text)
            .ok()
            .or_else(|| timescale::ZonedInstant::parse_iso(text).map(timescale::ZonedInstant::utc))
            .map(PrintedInstant::Utc)
    } else {
        JdInstant::parse_expanded(text).map(PrintedInstant::Jd)
    }
}

fn slim_day_payload(mut payload: Fields) -> Fields {
    payload.remove("rashifal");
    let Some(Field::Nested(detail)) = payload.field("detail").cloned() else {
        if let Some(detail) = payload.field("detail").cloned() {
            // A detail read back as a tree: slim it the same way.
            return slim_tree_detail(payload, &detail.value());
        }
        return payload;
    };
    let mut kept = Fields::new();
    let mut shared = Vec::new();
    for (key, field) in detail.iter() {
        if key == "rashifal" {
            continue;
        }
        let same = key != "detail" && payload.field(key).is_some_and(|top| same_field(top, field));
        if same {
            shared.push(Value::String(key.to_owned()));
        } else {
            kept.insert(key.to_owned(), field.clone());
        }
    }
    payload.insert("detail", Field::Nested(Arc::new(kept)));
    payload.insert_tree("detail_shared", Value::Array(shared));
    payload
}

/// Whether two fields hold the same JSON: the same shared block, or equal trees.
fn same_field(a: &Field, b: &Field) -> bool {
    match (a, b) {
        (Field::Tree(x), Field::Tree(y)) if Arc::ptr_eq(x, y) => true,
        (Field::Typed(x), Field::Typed(y)) if Arc::ptr_eq(x, y) => true,
        (Field::Nested(x), Field::Nested(y)) if Arc::ptr_eq(x, y) => true,
        _ => a.as_tree() == b.as_tree(),
    }
}

/// [`slim_day_payload`] for a `detail` held as a tree.
fn slim_tree_detail(mut payload: Fields, detail: &Value) -> Fields {
    let Value::Object(detail_map) = detail else {
        return payload;
    };
    let mut kept = Map::new();
    let mut shared = Vec::new();
    for (key, value) in detail_map {
        if key == "rashifal" {
            continue;
        }
        let same = key != "detail" && payload.get(key).is_some_and(|top| *top == *value);
        if same {
            shared.push(Value::String(key.clone()));
        } else {
            kept.insert(key.clone(), value.clone());
        }
    }
    payload.insert_tree("detail", Value::Object(kept));
    payload.insert_tree("detail_shared", Value::Array(shared));
    payload
}

/// `_input_era`: the first non-empty of `inputEra`, `input_era`, `era`, else `bs`.
fn input_era(query: &HashMap<String, String, impl BuildHasher>) -> String {
    ["inputEra", "input_era", "era"]
        .iter()
        .find_map(|k| query.get(*k).filter(|v| !v.is_empty()))
        .map(|v| v.trim().to_lowercase())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| "bs".to_owned())
}

fn today_jd_ut(location: &Location) -> Result<f64, DayError> {
    let epoch = UtcInstant::from_utc(CivilDay::new(1970, 1, 1), 0, 0, 0, 0)
        .ok_or_else(|| DayError::BadRequest("failed to build unix epoch instant".into()))?;
    let now_seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64());
    let now = epoch.add_seconds_f64(now_seconds);
    Ok(location.zone.local(now).day().to_jd_ut())
}

fn shaka_year(day: CivilDay) -> i32 {
    if day.month >= 4 {
        day.year - 78
    } else {
        day.year - 79
    }
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "weekday index is always 0-6 after rem_euclid"
)]
fn weekday_name(day: CivilDay) -> &'static str {
    let idx = (day.to_jd_ut() + 1.5).rem_euclid(7.0).floor() as usize;
    WEEKDAY_EN.get(idx).copied().unwrap_or("Sunday")
}

fn parse_bs_date(text: &str) -> Result<(i32, u32, u32), DayError> {
    let key = text.trim().to_lowercase();
    if RELATIVE_DAY_KEYS.contains(&key.as_str()) {
        return Err(DayError::BadRequest(format!(
            "{key:?} is a relative day key, not a BS calendar date; use GET /panchanga/{key}?era="
        )));
    }
    let parts: Vec<&str> = text.trim().split('-').collect();
    if parts.len() != 3 {
        return Err(DayError::BadRequest(format!("Invalid BS date: {text}")));
    }
    let bs_year = parts[0]
        .parse::<i32>()
        .map_err(|_| DayError::BadRequest(format!("Invalid BS date: {text}")))?;
    let bs_month = parts[1]
        .parse::<u32>()
        .map_err(|_| DayError::BadRequest(format!("Invalid BS date: {text}")))?;
    let bs_day = parts[2]
        .parse::<u32>()
        .map_err(|_| DayError::BadRequest(format!("Invalid BS date: {text}")))?;
    Ok((bs_year, bs_month, bs_day))
}
