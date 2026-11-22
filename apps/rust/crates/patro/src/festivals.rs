//! Festival and holiday API use cases (`services/festivals/*.py`, sankranti listings,
//! and special-months aggregation).

use std::{
    collections::{HashMap, HashSet},
    hash::{Hash, Hasher},
    str::FromStr as _,
    sync::LazyLock,
};

use astronomy::{System, engine::sun_longitude};
use calendar::{civil_to_bs, month_length, month_start};
use festivals::{festival_location, festivals_for_day, generate_bs_festivals};
use panchanga::{
    daily::{Location, build_daily},
    lunar_month,
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, Moment, UtcInstant, Zone};

const RULE_VERSION: &str = "v3";
const ENGINE_VERSION: &str = "1.0.13+a6";
const RULES_HASH: &str = "97a63657ed87";
const SIDDHANTA: &str = "surya_siddhanta";
const FESTIVAL_STACK_MIN_YEAR: i32 = 60;
const SIGNED_YEAR_MIN: i32 = -3_891_138;
const SIGNED_YEAR_MAX: i32 = 17_053;
const BBS_URL_YEAR_MAX: i32 = 3_891_137;

const RASHI_NAMES: [&str; 12] = [
    "Mesha",
    "Vrishabha",
    "Mithuna",
    "Karka",
    "Simha",
    "Kanya",
    "Tula",
    "Vrishchika",
    "Dhanu",
    "Makara",
    "Kumbha",
    "Meena",
];
const RASHI_NAMES_NE: [&str; 12] = [
    "मेष",
    "वृष",
    "मिथुन",
    "कर्कट",
    "सिंह",
    "कन्या",
    "तुला",
    "वृश्चिक",
    "धनु",
    "मकर",
    "कुम्भ",
    "मीन",
];
const BS_MONTH_NAMES: [&str; 12] = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush",
    "Magh", "Falgun", "Chaitra",
];
const NEPALI_DIGITS: [char; 10] = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

static RULE_BOOK: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../../../api/rules/festival_rules_v3.json"))
        .unwrap_or_else(|e| panic!("festival_rules_v3.json is valid JSON: {e}"))
});
static PUBLIC_HOLIDAYS: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../api/rules/public_holidays_v1.json"
    ))
    .unwrap_or_else(|e| panic!("public_holidays_v1.json is valid JSON: {e}"))
});
static HOLIDAY_OVERRIDES: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../../api/rules/holiday_overrides_v1.json"
    ))
    .unwrap_or_else(|e| panic!("holiday_overrides_v1.json is valid JSON: {e}"))
});
static EMPTY_MAP: LazyLock<Map<String, Value>> = LazyLock::new(Map::new);

fn rules() -> &'static Map<String, Value> {
    RULE_BOOK["festivals"].as_object().unwrap_or(&EMPTY_MAP)
}

fn rule(id: &str) -> &'static Map<String, Value> {
    rules()
        .get(id)
        .and_then(Value::as_object)
        .unwrap_or(&EMPTY_MAP)
}

fn overrides(bs_year: i32) -> &'static Map<String, Value> {
    HOLIDAY_OVERRIDES["bs_years"][bs_year.to_string()]
        .as_object()
        .unwrap_or(&EMPTY_MAP)
}

fn public_holiday_ids() -> Option<&'static Vec<Value>> {
    PUBLIC_HOLIDAYS["holiday_ids"].as_array()
}

fn is_public_holiday(id: &str) -> bool {
    public_holiday_ids().is_some_and(|ids| ids.iter().any(|v| v.as_str() == Some(id)))
}

/// A `YYYY-MM-DD` civil day.
#[must_use]
pub fn parse_iso_day(text: &str) -> Option<CivilDay> {
    // A BCE year prints with a leading minus (`-0044-03-02`).
    let (negative, body) = match text.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, text),
    };
    let mut parts = body.splitn(3, '-');
    let year = parts.next()?.parse::<i32>().ok()?;
    let year = if negative { -year } else { year };
    let month = parts.next()?.parse::<u32>().ok()?;
    let day = parts.next()?.parse::<u32>().ok()?;
    Some(CivilDay::new(year, month, day))
}

fn py_repr_str(s: &str) -> String {
    if s.contains('\'') && !s.contains('"') {
        format!("\"{s}\"")
    } else {
        format!("'{}'", s.replace('\'', "\\'"))
    }
}

fn truthy(v: Option<&Value>) -> bool {
    match v {
        None | Some(Value::Null) => false,
        Some(Value::Bool(b)) => *b,
        Some(Value::String(s)) => !s.is_empty(),
        Some(Value::Number(n)) => n.as_f64() != Some(0.0),
        Some(_) => true,
    }
}

fn id_of(row: &Value) -> String {
    row["id"].as_str().unwrap_or_default().to_owned()
}

fn start_of(row: &Value) -> String {
    row["start_date"].as_str().unwrap_or_default().to_owned()
}

fn is_listed_holiday(row: &Value) -> bool {
    is_public_holiday(&id_of(row))
        || row
            .get("audience")
            .and_then(Value::as_str)
            .is_some_and(|s| !s.is_empty())
}

fn in_bs_month(rows: Vec<Value>, bs_year: i32, bs_month: u32) -> Vec<Value> {
    let Ok(month_start_day) = month_start(bs_year, bs_month) else {
        return Vec::new();
    };
    let Ok(month_days) = month_length(bs_year, bs_month) else {
        return Vec::new();
    };
    let month_end = month_start_day.add_days(i32::try_from(month_days).unwrap_or(0) - 1);
    rows.into_iter()
        .filter(|row| {
            let Some(start) = row
                .get("start_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
            else {
                return false;
            };
            let Some(end) = row
                .get("end_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
            else {
                return false;
            };
            start <= month_end && end >= month_start_day
        })
        .collect()
}

fn sorted_by_start(mut rows: Vec<Value>) -> Vec<Value> {
    rows.sort_by_key(start_of);
    rows
}

/// `ObserverLocation.cache_key()`: `lat_lon_zone` to four places.
#[must_use]
pub fn location_key(location: &Location) -> String {
    format!(
        "{:.4}_{:.4}_{}",
        location.lat,
        location.lon,
        location.zone.name()
    )
}

fn now_utc_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64());
    let Some(epoch) = UtcInstant::from_utc(CivilDay::new(1970, 1, 1), 0, 0, 0, 0) else {
        return "1970-01-01T00:00:00+00:00".to_owned();
    };
    epoch.add_seconds_f64(now).to_string()
}

fn payload_hash(payload: &Map<String, Value>) -> String {
    let target = payload
        .get("holidays")
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new()));
    let text = serde_json::to_string(&target).unwrap_or_else(|_| "[]".to_owned());
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    text.hash(&mut hasher);
    format!("{:016x}", hasher.finish())[..12].to_owned()
}

fn stamp(mut payload: Map<String, Value>, location: &Location) -> Value {
    payload.insert("rule_version".into(), json!(RULE_VERSION));
    payload.insert("engine_version".into(), json!(ENGINE_VERSION));
    payload.insert("rules_hash".into(), json!(RULES_HASH));
    payload.insert("location_key".into(), json!(location_key(location)));
    payload.insert("siddhanta".into(), json!(SIDDHANTA));
    payload.insert("generated_at".into(), json!(now_utc_iso()));
    let hash = payload_hash(&payload);
    payload.insert("hash".into(), json!(hash));
    Value::Object(payload)
}

fn bs_date_string(day: CivilDay) -> Option<String> {
    let bs = civil_to_bs(day).ok()?;
    Some(format!("{}-{:02}-{:02}", bs.year, bs.month, bs.day))
}

fn with_bs_dates(rows: Vec<Value>) -> Vec<Value> {
    rows.into_iter()
        .map(|row| {
            let mut out = row.as_object().cloned().unwrap_or_default();
            let bs_start = row
                .get("start_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
                .and_then(bs_date_string)
                .unwrap_or_default();
            let bs_end = row
                .get("end_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
                .and_then(bs_date_string)
                .unwrap_or_default();
            out.insert("bs_start_date".into(), json!(bs_start));
            out.insert("bs_end_date".into(), json!(bs_end));
            Value::Object(out)
        })
        .collect()
}

fn normalize_tradition(value: Option<&str>) -> Result<String, String> {
    let Some(raw) = value else {
        return Ok("all".to_owned());
    };
    if raw.trim().is_empty() {
        return Ok("all".to_owned());
    }
    let key = raw.trim().to_lowercase();
    if matches!(key.as_str(), "all" | "smarta" | "vaishnava") {
        Ok(key)
    } else {
        Err(format!(
            "Unknown tradition {}. Use one of: all, smarta, vaishnava",
            py_repr_str(raw)
        ))
    }
}

fn rule_applies(id: &str, tradition: &str) -> bool {
    if tradition == "all" {
        return true;
    }
    rule(id)
        .get("tradition")
        .and_then(Value::as_str)
        .is_none_or(|t| t == tradition)
}

fn apply_tradition(
    rows: Vec<Value>,
    tradition_value: Option<&str>,
) -> Result<(Vec<Value>, String), String> {
    let resolved = normalize_tradition(tradition_value)?;
    if resolved == "all" {
        return Ok((rows, resolved));
    }
    let filtered = rows
        .into_iter()
        .filter(|row| rule_applies(&id_of(row), &resolved))
        .collect();
    Ok((filtered, resolved))
}

fn validate_signed_bs_year(year: i32) -> Result<(), String> {
    if year == 0 || !((SIGNED_YEAR_MIN..=SIGNED_YEAR_MAX).contains(&year)) {
        return Err(
            "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)"
                .to_owned(),
        );
    }
    Ok(())
}

/// URL year + browse era to the signed BS axis.
///
/// # Errors
///
/// Returns a human-readable 400 detail when the year is outside the supported range.
pub fn signed_bs_year_from_browse(era: &str, url_year: i32) -> Result<i32, String> {
    match era {
        "bbs" => {
            if !(1..=BBS_URL_YEAR_MAX).contains(&url_year) {
                return Err("bbs url year must be 1..3891137 (पू. वि.सं.)".to_owned());
            }
            let signed = -url_year;
            validate_signed_bs_year(signed)?;
            Ok(signed)
        }
        "bs" => {
            validate_signed_bs_year(url_year)?;
            Ok(url_year)
        }
        _ => Err("era must be one of ad, bc, bs, bbs".to_owned()),
    }
}

fn bs_year_range(bs_year: i32) -> Option<(CivilDay, CivilDay)> {
    let start = month_start(bs_year, 1).ok()?;
    let next = month_start(bs_year + 1, 1).ok()?;
    Some((start, next.add_days(-1)))
}

fn festival_payload_rows(bs_year: i32, location: &Location) -> Vec<Value> {
    let location = festival_location(location);
    generate_bs_festivals(bs_year, &location)
}

fn holiday_override_entry(festival_id: &str, override_row: &Map<String, Value>) -> Option<Value> {
    let mut merged = rule(festival_id).clone();
    for (k, v) in override_row {
        merged.insert(k.clone(), v.clone());
    }
    let start = override_row
        .get("start_date")
        .and_then(Value::as_str)
        .and_then(parse_iso_day)?;
    let end = override_row
        .get("end_date")
        .and_then(Value::as_str)
        .and_then(parse_iso_day)?;
    #[expect(
        clippy::cast_possible_truncation,
        reason = "a holiday span is in whole days"
    )]
    let duration = (end.to_jd_ut() - start.to_jd_ut()).round() as i64 + 1;
    let mut out = Map::new();
    out.insert("id".into(), json!(festival_id));
    out.insert(
        "name_en".into(),
        merged
            .get("name_en")
            .cloned()
            .unwrap_or_else(|| json!(festival_id)),
    );
    out.insert(
        "name_ne".into(),
        merged.get("name_ne").cloned().unwrap_or(Value::Null),
    );
    out.insert("start_date".into(), json!(start.to_string()));
    out.insert("end_date".into(), json!(end.to_string()));
    out.insert("duration_days".into(), json!(duration));
    out.insert(
        "type".into(),
        merged
            .get("type")
            .cloned()
            .unwrap_or_else(|| json!("lunar")),
    );
    out.insert(
        "category".into(),
        merged.get("category").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "importance".into(),
        merged.get("importance").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "is_public_holiday".into(),
        json!(is_public_holiday(festival_id)),
    );
    out.insert(
        "notes".into(),
        merged.get("notes").cloned().unwrap_or(Value::Null),
    );
    if let Some(audience) = merged
        .get("audience")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
    {
        out.insert("audience".into(), json!(audience));
    }
    Some(Value::Object(out))
}

fn override_applies(override_row: &Map<String, Value>) -> bool {
    matches!(
        override_row.get("type").and_then(Value::as_str),
        Some("ad_fixed" | "announced")
    )
}

fn apply_bs_holiday_overrides(bs_year: i32, rows: Vec<Value>) -> Vec<Value> {
    let mut merged: Vec<(String, Value)> = rows.into_iter().map(|row| (id_of(&row), row)).collect();
    for (festival_id, override_row) in overrides(bs_year) {
        let Some(override_row) = override_row.as_object() else {
            continue;
        };
        if truthy(override_row.get("omit")) {
            if let Some(index) = merged.iter().position(|(id, _)| id == festival_id) {
                merged.remove(index);
            }
            continue;
        }
        let probe = json!({"id": festival_id, "audience": override_row.get("audience")});
        if !is_listed_holiday(&probe) {
            continue;
        }
        if !override_applies(override_row) {
            continue;
        }
        if let Some(entry) = holiday_override_entry(festival_id, override_row) {
            if let Some(index) = merged.iter().position(|(id, _)| id == festival_id) {
                merged[index].1 = entry;
            } else {
                merged.push((festival_id.clone(), entry));
            }
        }
    }
    let mut rows = merged.into_iter().map(|(_, row)| row).collect::<Vec<_>>();
    rows.retain(is_listed_holiday);
    sorted_by_start(rows)
}

fn bs_holiday_rows(bs_year: i32, location: &Location) -> Vec<Value> {
    let festivals = festival_payload_rows(bs_year, location);
    let listed = festivals
        .into_iter()
        .filter(is_listed_holiday)
        .collect::<Vec<_>>();
    apply_bs_holiday_overrides(bs_year, listed)
}

/// `/festivals/bs/{bs_year}` payload.
///
/// # Errors
///
/// Returns a 400 detail string when the year/month inputs are invalid.
pub fn bs_festivals_payload(
    bs_year: i32,
    location: &Location,
    bs_month: Option<u32>,
) -> Result<Value, String> {
    validate_signed_bs_year(bs_year)?;
    if let Some(month) = bs_month.filter(|m| !(1..=12).contains(m)) {
        return Err(format!("month must be 1..12; got {month}"));
    }
    if bs_year < FESTIVAL_STACK_MIN_YEAR {
        let mut out = Map::new();
        out.insert("bs_year".into(), json!(bs_year));
        out.insert("count".into(), json!(0));
        out.insert("festivals".into(), Value::Array(Vec::new()));
        out.insert("unavailable_reason".into(), json!("pre_festival_era"));
        if let Some(month) = bs_month {
            out.insert("bs_month".into(), json!(month));
        }
        return Ok(Value::Object(out));
    }
    let location = festival_location(location);
    let rows = festival_payload_rows(bs_year, &location);
    let filtered = bs_month.map_or_else(
        || rows.clone(),
        |month| in_bs_month(rows.clone(), bs_year, month),
    );
    let (Some(start), Some(end)) = (
        bs_year_range(bs_year).map(|(s, _)| s),
        bs_year_range(bs_year).map(|(_, e)| e),
    ) else {
        return Err("could not resolve BS year range".to_owned());
    };
    let mut payload = Map::new();
    payload.insert("bs_year".into(), json!(bs_year));
    payload.insert(
        "gregorian_range".into(),
        json!({"start": start.to_string(), "end": end.to_string()}),
    );
    payload.insert("location".into(), location.as_json());
    payload.insert("count".into(), json!(rows.len()));
    payload.insert("festivals".into(), Value::Array(rows));
    let stamped = stamp(payload, &location);
    let mut out = stamped.as_object().cloned().unwrap_or_default();
    if let Some(month) = bs_month {
        out.insert("bs_month".into(), json!(month));
        out.insert("count".into(), json!(filtered.len()));
        out.insert("festivals".into(), Value::Array(filtered));
    }
    Ok(Value::Object(out))
}

/// `/holidays/{year}` payload.
///
/// # Errors
///
/// Returns a 400 detail string when the year/month inputs are invalid.
pub fn bs_holidays_payload(
    bs_year: i32,
    location: &Location,
    bs_month: Option<u32>,
) -> Result<Value, String> {
    validate_signed_bs_year(bs_year)?;
    if let Some(month) = bs_month.filter(|m| !(1..=12).contains(m)) {
        return Err(format!("month must be 1..12; got {month}"));
    }
    if bs_year < FESTIVAL_STACK_MIN_YEAR {
        let mut out = Map::new();
        out.insert("bs_year".into(), json!(bs_year));
        out.insert("count".into(), json!(0));
        out.insert("holidays".into(), Value::Array(Vec::new()));
        out.insert("unavailable_reason".into(), json!("pre_festival_era"));
        if let Some(month) = bs_month {
            out.insert("bs_month".into(), json!(month));
        }
        return Ok(Value::Object(out));
    }
    let location = festival_location(location);
    let rows = bs_holiday_rows(bs_year, &location);
    let filtered = bs_month.map_or_else(
        || rows.clone(),
        |month| in_bs_month(rows.clone(), bs_year, month),
    );
    let (Some(start), Some(end)) = (
        bs_year_range(bs_year).map(|(s, _)| s),
        bs_year_range(bs_year).map(|(_, e)| e),
    ) else {
        return Err("could not resolve BS year range".to_owned());
    };
    let mut payload = Map::new();
    payload.insert("bs_year".into(), json!(bs_year));
    payload.insert(
        "gregorian_range".into(),
        json!({"start": start.to_string(), "end": end.to_string()}),
    );
    payload.insert("location".into(), location.as_json());
    payload.insert("count".into(), json!(rows.len()));
    payload.insert("holidays".into(), Value::Array(rows));
    let stamped = stamp(payload, &location);
    let mut out = stamped.as_object().cloned().unwrap_or_default();
    if let Some(month) = bs_month {
        out.insert("bs_month".into(), json!(month));
        out.insert("count".into(), json!(filtered.len()));
        out.insert("holidays".into(), Value::Array(filtered));
    }
    Ok(Value::Object(out))
}

fn touches_ad_year(row: &Value, ad_year: i32) -> bool {
    let Some(start) = row
        .get("start_date")
        .and_then(Value::as_str)
        .and_then(parse_iso_day)
    else {
        return false;
    };
    let Some(end) = row
        .get("end_date")
        .and_then(Value::as_str)
        .and_then(parse_iso_day)
    else {
        return false;
    };
    start.year <= ad_year && ad_year <= end.year || start.year == ad_year || end.year == ad_year
}

fn touches_ad_month(rows: Vec<Value>, ad_year: i32, ad_month: u32) -> Vec<Value> {
    let Some(first) =
        UtcInstant::from_utc(CivilDay::new(ad_year, ad_month, 1), 0, 0, 0, 0).map(|u| u.fields().0)
    else {
        return Vec::new();
    };
    let mut day = 28;
    while UtcInstant::from_utc(CivilDay::new(ad_year, ad_month, day + 1), 0, 0, 0, 0).is_some() {
        day += 1;
    }
    let last = CivilDay::new(ad_year, ad_month, day);
    rows.into_iter()
        .filter(|row| {
            let Some(start) = row
                .get("start_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
            else {
                return false;
            };
            let Some(end) = row
                .get("end_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
            else {
                return false;
            };
            start <= last && end >= first
        })
        .collect()
}

fn merge_bs_year_rows(
    years: &[i32],
    mut load: impl FnMut(i32) -> Vec<Value>,
    keep: impl Fn(&Value) -> bool,
) -> Vec<Value> {
    let mut seen: HashSet<(String, String)> = HashSet::new();
    let mut rows = Vec::new();
    for year in years {
        for row in load(*year) {
            if !keep(&row) {
                continue;
            }
            let key = (id_of(&row), start_of(&row));
            if seen.insert(key) {
                rows.push(row);
            }
        }
    }
    sorted_by_start(rows)
}

/// `/nepal/festivals` payload.
///
/// # Errors
///
/// Returns a 400 detail string for invalid era, tradition, or month/year inputs.
pub fn festival_listing_payload(
    year: i32,
    era: &str,
    location: &Location,
    month: Option<u32>,
    tradition: Option<&str>,
    signed_bs_year: Option<i32>,
) -> Result<Value, String> {
    let _ = normalize_tradition(tradition)?;
    match era {
        "ad" => {
            if let Some(month) = month.filter(|m| !(1..=12).contains(m)) {
                return Err(format!("month must be 1..12; got {month}"));
            }
            let mut rows = merge_bs_year_rows(
                &[year + 56, year + 57],
                |bs_year| {
                    bs_festivals_payload(bs_year, location, None)
                        .ok()
                        .and_then(|p| p.get("festivals").cloned())
                        .and_then(|v| v.as_array().cloned())
                        .unwrap_or_default()
                },
                |row| touches_ad_year(row, year),
            );
            if let Some(month) = month {
                rows = touches_ad_month(rows, year, month);
            }
            let enriched = with_bs_dates(rows);
            let (festivals, resolved) = apply_tradition(enriched, tradition)?;
            let mut out = Map::new();
            out.insert("ad_year".into(), json!(year));
            out.insert("era".into(), json!("ad"));
            out.insert("count".into(), json!(festivals.len()));
            out.insert("festivals".into(), Value::Array(festivals));
            if tradition.is_some() {
                out.insert("tradition".into(), json!(resolved));
            }
            Ok(Value::Object(out))
        }
        "bc" => {
            Err("Festival rules are not defined for era=bc; use era=bs, bbs, or ad.".to_owned())
        }
        "bs" | "bbs" => {
            let Some(signed) = signed_bs_year else {
                return Err("missing signed BS year".to_owned());
            };
            let payload = bs_festivals_payload(signed, location, month)?;
            let festivals = payload["festivals"].as_array().cloned().unwrap_or_default();
            let enriched = with_bs_dates(festivals);
            let (filtered, resolved) = apply_tradition(enriched, tradition)?;
            let mut out = payload.as_object().cloned().unwrap_or_default();
            out.insert("era".into(), json!(era));
            out.insert("count".into(), json!(filtered.len()));
            out.insert("festivals".into(), Value::Array(filtered));
            if era == "bbs" {
                out.insert("bbs".into(), json!(year));
            }
            if tradition.is_some() {
                out.insert("tradition".into(), json!(resolved));
            }
            Ok(Value::Object(out))
        }
        _ => Err("era must be one of ad, bc, bs, bbs".to_owned()),
    }
}

/// `/nepal/holidays` payload.
///
/// # Errors
///
/// Returns a 400 detail string for invalid era or month/year inputs.
pub fn holiday_listing_payload(
    year: i32,
    era: &str,
    location: &Location,
    month: Option<u32>,
    signed_bs_year: Option<i32>,
) -> Result<Value, String> {
    match era {
        "ad" => {
            if let Some(month) = month.filter(|m| !(1..=12).contains(m)) {
                return Err(format!("month must be 1..12; got {month}"));
            }
            let mut rows = merge_bs_year_rows(
                &[year + 56, year + 57],
                |bs_year| {
                    bs_holidays_payload(bs_year, location, None)
                        .ok()
                        .and_then(|p| p.get("holidays").cloned())
                        .and_then(|v| v.as_array().cloned())
                        .unwrap_or_default()
                },
                |row| touches_ad_year(row, year),
            );
            if let Some(month) = month {
                rows = touches_ad_month(rows, year, month);
            }
            let holidays = with_bs_dates(rows);
            let mut out = Map::new();
            out.insert("ad_year".into(), json!(year));
            out.insert("era".into(), json!("ad"));
            out.insert("count".into(), json!(holidays.len()));
            out.insert("holidays".into(), Value::Array(holidays));
            Ok(Value::Object(out))
        }
        "bc" => Err(
            "Nepal holiday listings are not defined for era=bc; use era=bs, bbs, or ad.".to_owned(),
        ),
        "bs" | "bbs" => {
            let Some(signed) = signed_bs_year else {
                return Err("missing signed BS year".to_owned());
            };
            let payload = bs_holidays_payload(signed, location, None)?;
            let rows = payload["holidays"].as_array().cloned().unwrap_or_default();
            let rows = if let Some(month) = month {
                if !(1..=12).contains(&month) {
                    return Err(format!("month must be 1..12; got {month}"));
                }
                in_bs_month(rows, signed, month)
            } else {
                rows
            };
            let holidays = with_bs_dates(rows);
            let mut out = Map::new();
            out.insert("bs_year".into(), json!(signed));
            out.insert("era".into(), json!(era));
            out.insert("gregorian_range".into(), payload["gregorian_range"].clone());
            out.insert("count".into(), json!(holidays.len()));
            out.insert("holidays".into(), Value::Array(holidays));
            if let Some(reason) = payload.get("unavailable_reason").cloned() {
                out.insert("unavailable_reason".into(), reason);
            }
            if era == "bbs" {
                out.insert("bbs".into(), json!(year));
            }
            Ok(Value::Object(out))
        }
        _ => Err("era must be one of ad, bc, bs, bbs".to_owned()),
    }
}

/// Whether `/nepal/festivals/upcoming` keeps every festival or only public holidays.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum UpcomingScope {
    /// Keep every festival in the window (the default).
    #[default]
    All,
    /// Keep only rows with `is_public_holiday` (`holidays_only=true`).
    HolidaysOnly,
}

/// `/nepal/festivals/upcoming` payload.
#[must_use]
pub fn upcoming_festivals_payload(
    location: &Location,
    start: CivilDay,
    days: i32,
    limit: usize,
    scope: UpcomingScope,
) -> Value {
    let window_end = start.add_days(days);
    let rows = merge_bs_year_rows(
        &[start.year + 56, start.year + 57, start.year + 58],
        |bs_year| {
            bs_festivals_payload(bs_year, location, None)
                .ok()
                .and_then(|p| p.get("festivals").cloned())
                .and_then(|v| v.as_array().cloned())
                .unwrap_or_default()
        },
        |row| {
            let Some(start_day) = row
                .get("start_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
            else {
                return false;
            };
            let Some(end_day) = row
                .get("end_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
            else {
                return false;
            };
            if end_day < start || start_day > window_end {
                return false;
            }
            match scope {
                UpcomingScope::All => true,
                UpcomingScope::HolidaysOnly => row
                    .get("is_public_holiday")
                    .and_then(Value::as_bool)
                    .unwrap_or(false),
            }
        },
    );
    let rows = rows
        .into_iter()
        .map(|row| {
            let mut out = row.as_object().cloned().unwrap_or_default();
            let start_day = row
                .get("start_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
                .unwrap_or(start);
            #[expect(clippy::cast_possible_truncation, reason = "difference is civil days")]
            let until = (start_day.to_jd_ut() - start.to_jd_ut()).round() as i64;
            out.insert("days_until".into(), json!(until));
            Value::Object(out)
        })
        .take(limit)
        .collect::<Vec<_>>();
    let festivals = with_bs_dates(rows);
    json!({"from": start.to_string(), "days": days, "count": festivals.len(), "festivals": festivals})
}

fn gregorian_day_for_date_key(date_key: &str, era: &str) -> Result<CivilDay, String> {
    crate::date_key::greg_day_for_date_key(date_key, era)
}

/// `/festivals/{date_key}` payload.
///
/// # Errors
///
/// Returns a 400 detail string when the date key cannot be read in the chosen era.
pub fn festivals_for_date_payload(
    date_key: &str,
    location: &Location,
    era: &str,
) -> Result<Value, String> {
    let greg = gregorian_day_for_date_key(date_key, era)?;
    let bs = civil_to_bs(greg).map_err(|e| e.to_string())?;
    let all = festival_payload_rows(bs.year, location);
    let active = festivals_for_day(&all, greg);
    let list = active
        .into_iter()
        .map(|f| {
            json!({
                "id": f["id"].as_str().unwrap_or_default(),
                "name": f["name_en"].as_str().or_else(|| f["name"].as_str()).unwrap_or_default(),
                "name_ne": f["name_ne"].clone(),
                "type": f["type"].clone(),
                "category": f["category"].clone(),
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({
        "date_bs": format!("{}-{:02}-{:02}", bs.year, bs.month, bs.day),
        "date_ad": greg.to_string(),
        "festivals": list
    }))
}

fn nepali_digits(number: i32) -> String {
    number
        .to_string()
        .chars()
        .map(|c| c.to_digit(10).map_or(c, |d| NEPALI_DIGITS[d as usize]))
        .collect()
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "longitude / 30 is in [0, 12]"
)]
fn sun_rashi_at_time(system: System, at: UtcInstant) -> u32 {
    (sun_longitude(system, at.to_jd()) / 30.0) as u32 % 12
}

/// The Sun's entry into `target_rashi` near `after`, as the first second the Sun is
/// in it (see [`calendar::find_sankranti_after_jd`]).
fn find_sankranti(
    system: System,
    target_rashi: u32,
    after: UtcInstant,
    max_days: u32,
) -> Option<UtcInstant> {
    let jd = calendar::find_sankranti_after_jd(system, target_rashi, after.to_jd(), max_days)?;
    timescale::PyInstant::at_boundary(after, jd)
}

fn sankranti_timestamp(at: UtcInstant, zone: &Zone) -> Value {
    let local = zone.local(at);
    let local_day = local.day();
    json!({
        "utc": at.to_string(),
        "local": local.to_string(),
        "local_time": local.hms(),
        "local_date": local_day.to_string(),
        "local_display": format!("{local_day} {}", local.hm()),
    })
}

fn sankranti_festival(to_rashi: u32) -> Value {
    match to_rashi {
        0 => json!({
            "id": "mesh-sankranti",
            "name_en": "Mesh Sankranti (Nepali New Year)",
            "name_ne": "मेष संक्रान्ति",
        }),
        9 => json!({
            "id": "maghe-sankranti",
            "name_en": "Maghe Sankranti",
            "name_ne": "माघे संक्रान्ति",
        }),
        _ => Value::Null,
    }
}

fn sankranti_entry(at: UtcInstant, to_rashi: u32, timezone: &Zone) -> Option<Value> {
    let sankranti_day = Zone::kathmandu().local_day(Moment::Utc(at));
    let mut bs = civil_to_bs(sankranti_day).ok()?;
    let bs_month = to_rashi + 1;
    if bs.month == 12 && bs_month == 1 {
        bs.year += 1;
    } else if bs.month == 1 && bs_month == 12 {
        bs.year -= 1;
    }
    let bs_month_start = month_start(bs.year, bs_month).ok()?;
    Some(json!({
        "to_rashi_index": to_rashi,
        "to_rashi": RASHI_NAMES[to_rashi as usize],
        "to_rashi_ne": RASHI_NAMES_NE[to_rashi as usize],
        "from_rashi": RASHI_NAMES[((to_rashi + 11) % 12) as usize],
        "from_rashi_ne": RASHI_NAMES_NE[((to_rashi + 11) % 12) as usize],
        "bs_month_name": BS_MONTH_NAMES[to_rashi as usize],
        "bs_month_index": bs_month,
        "bs_month_start_date": bs_month_start.to_string(),
        "bs_year_at_start": bs.year,
        "bs_month_at_start": bs_month,
        "timestamp": sankranti_timestamp(at, timezone),
        "festival": sankranti_festival(to_rashi),
    }))
}

fn list_sankrantis_for_year(
    system: System,
    ad_year: i32,
    timezone: &Zone,
) -> Result<Vec<Value>, String> {
    let Some(start) = UtcInstant::from_utc(CivilDay::new(ad_year, 1, 1), 0, 0, 0, 0) else {
        return Err(format!("year {ad_year} is out of range"));
    };
    let Some(end) = UtcInstant::from_utc(CivilDay::new(ad_year, 12, 31), 23, 59, 59, 0) else {
        return Err(format!("year {ad_year} is out of range"));
    };
    let mut rows = Vec::new();
    let mut cursor = start;
    while cursor <= end {
        let current = sun_rashi_at_time(system, cursor);
        let next = (current + 1) % 12;
        let Some(found) = find_sankranti(system, next, cursor, 45) else {
            break;
        };
        if found > end {
            break;
        }
        if found.fields().0.year == ad_year {
            if let Some(entry) = sankranti_entry(found, next, timezone) {
                rows.push(entry);
            }
        }
        cursor = found.add_seconds(120);
    }
    Ok(rows)
}

/// `/nepal/sankranti/year/{ad_year}` payload.
///
/// # Errors
///
/// Returns a 400 detail string when the Gregorian year cannot be represented.
pub fn sankranti_year_payload(ad_year: i32, location: &Location) -> Result<Value, String> {
    let system = location.system;
    let sankrantis = list_sankrantis_for_year(system, ad_year, &location.zone)?;
    Ok(json!({
        "ad_year": ad_year,
        "count": sankrantis.len(),
        "location": location.as_json(),
        "sankrantis": sankrantis,
        "notes": "Exact sidereal solar ingress (Lahiri ayanamsa). bs_month_start_date follows Nepal convention: sankranti day if before local sunrise, else next day."
    }))
}

/// `sankrantis_on_date(system, target, timezone_name=…)`: ingresses within a day of `target`.
///
/// # Errors
///
/// The year scan's error text.
pub fn sankrantis_on_date(
    system: System,
    target: CivilDay,
    timezone: &Zone,
) -> Result<Vec<Value>, String> {
    let Some(day_start) = UtcInstant::from_utc(target, 0, 0, 0, 0) else {
        return Err(format!("invalid date {target}"));
    };
    let window_start = day_start.add_hours(-24).to_jd();
    let window_end = day_start.add_hours(48).to_jd();
    let mut events = list_sankrantis_for_year(system, target.year, timezone)?;
    if target.month == 1 {
        events.splice(
            0..0,
            list_sankrantis_for_year(system, target.year - 1, timezone)?,
        );
    }
    if target.month == 12 {
        events.extend(list_sankrantis_for_year(system, target.year + 1, timezone)?);
    }
    let mut seen: HashSet<String> = HashSet::new();
    let mut matched = Vec::new();
    for event in events {
        let Some(stamp) = event
            .get("timestamp")
            .and_then(Value::as_object)
            .and_then(|t| t.get("utc"))
            .and_then(Value::as_str)
        else {
            continue;
        };
        let Ok(utc) = UtcInstant::from_str(stamp) else {
            continue;
        };
        let jd = utc.to_jd();
        if window_start <= jd && jd <= window_end && seen.insert(stamp.to_owned()) {
            matched.push(event);
        }
    }
    Ok(matched)
}

/// `/nepal/sankranti/{date_key}` payload.
///
/// # Errors
///
/// Returns a 400 detail string when the date key cannot be read in the chosen era.
pub fn sankranti_day_payload(
    date_key: &str,
    era: &str,
    location: &Location,
) -> Result<Value, String> {
    let system = location.system;
    let greg = gregorian_day_for_date_key(date_key, era)?;
    let bs = civil_to_bs(greg).map_err(|e| e.to_string())?;
    let events = sankrantis_on_date(system, greg, &location.zone)?;
    Ok(json!({
        "date_ad": greg.to_string(),
        "date_bs": format!("{}-{:02}-{:02}", bs.year, bs.month, bs.day),
        "date_bs_ne": format!("वि.सं. {} {} {}", nepali_digits(bs.year), BS_MONTH_NAMES[bs.month as usize - 1], nepali_digits(i32::try_from(bs.day).unwrap_or_default())),
        "location": location.as_json(),
        "sankrantis": events,
        "is_sankranti_day": !events.is_empty(),
    }))
}

/// `/nepal/special-months/{bs_year}` payload.
///
/// # Errors
///
/// Returns a 400 detail string when the year is outside the supported BS axis.
pub fn special_months_payload(bs_year: i32, location: &Location) -> Result<Value, String> {
    validate_signed_bs_year(bs_year)?;
    let Some((year_start, year_end)) = bs_year_range(bs_year) else {
        return Err("could not resolve BS year range".to_owned());
    };
    let mut adhik_by_start: HashMap<String, Value> = HashMap::new();
    let mut kshaya = json!({"is_kshaya": false});
    for g_year in (year_start.year - 1)..=year_end.year {
        let special = lunar_month::special_months_for_gregorian_year(g_year, &location.observer());
        for month in special["adhik_months"]
            .as_array()
            .cloned()
            .unwrap_or_default()
        {
            let Some(start) = month
                .get("start_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
            else {
                continue;
            };
            if year_start <= start && start <= year_end {
                let key = start.to_string();
                adhik_by_start.entry(key).or_insert(month);
            }
        }
        let current = special.get("kshaya_maas").cloned().unwrap_or(Value::Null);
        if current
            .get("is_kshaya")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            let in_year = current
                .get("start_date")
                .and_then(Value::as_str)
                .and_then(parse_iso_day)
                .is_some_and(|d| year_start <= d && d <= year_end);
            if in_year {
                kshaya = current;
            }
        }
    }
    let mut pairs = adhik_by_start.into_iter().collect::<Vec<_>>();
    pairs.sort_by_key(|(k, _)| k.clone());
    let adhik_months = pairs.into_iter().map(|(_, v)| v).collect::<Vec<_>>();
    let adhik = adhik_months
        .first()
        .cloned()
        .unwrap_or_else(|| json!({"has_adhik_maas": false}));
    Ok(json!({
        "bs_year": bs_year,
        "gregorian_range": {"start": year_start.to_string(), "end": year_end.to_string()},
        "location": location.as_json(),
        "adhik_maas": adhik,
        "adhik_months": adhik_months,
        "kshaya_maas": kshaya,
    }))
}

/// `/nepal/panchanga/year/{bs_year}` payload.
///
/// # Errors
///
/// Returns a 400 detail string when the year is invalid and 501-style detail text when
/// the daily engine cannot build one of the year's days.
pub fn bs_year_summary_payload(bs_year: i32, location: &Location) -> Result<Value, String> {
    validate_signed_bs_year(bs_year)?;
    let Some((year_start, year_end)) = bs_year_range(bs_year) else {
        return Err("could not resolve BS year range".to_owned());
    };
    let mut day = year_start;
    let mut rows = Vec::new();
    while day <= year_end {
        let daily = build_daily(day, location).map_err(|e| e.to_string())?;
        let state = daily.tree();
        rows.push(json!({
            "date_bs": format!("{}-{:02}-{:02}", state["bs_date"]["year"].as_i64().unwrap_or_default(), state["bs_date"]["month"].as_i64().unwrap_or_default(), state["bs_date"]["day"].as_i64().unwrap_or_default()),
            "date_ad": day.to_string(),
            "weekday": state["vaara"]["name_ne"].as_str().unwrap_or_default(),
            "weekday_en": state["vaara"]["name_english"].as_str().unwrap_or_default(),
            "tithi": state["tithi"]["name"].as_str().unwrap_or_default(),
            "tithi_ne": state["tithi"]["name_ne"].as_str().unwrap_or_default(),
            "nakshatra": state["nakshatra"]["name"].as_str().unwrap_or_default(),
            "paksha": state["paksha"]["label_en"].as_str().unwrap_or_default(),
            "sunrise": state["sunrise"]["local_time_short"].as_str().unwrap_or_default(),
            "sunset": state["sunset"]["local_time_short"].as_str().unwrap_or_default(),
            "rahu_kalam": {
                "start": state["muhurta"]["rahu_kalam"]["start_time"].clone(),
                "end": state["muhurta"]["rahu_kalam"]["end_time"].clone(),
            },
            "abhijit": {
                "start": state["muhurta"]["abhijit"]["start_time"].clone(),
                "end": state["muhurta"]["abhijit"]["end_time"].clone(),
            },
            "is_public_holiday": false,
        }));
        day = day.add_days(1);
    }
    Ok(json!({
        "bs_year": bs_year,
        "gregorian_range": {"start": year_start.to_string(), "end": year_end.to_string()},
        "location": location.as_json(),
        "count": rows.len(),
        "days": rows,
    }))
}
