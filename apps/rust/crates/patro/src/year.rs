//! The BS year views: every month grid in one payload (`build_year_calendar`, lite,
//! full or the slim year-wheel shape) and the सूर्यक्रान्ति grid (`build_year_sun_times`).

use panchanga::daily::{Location, sun_times};
use serde_json::{Map, Value, json};
use timescale::PyInstant;

use crate::month::{Embed, International, MonthError, month_calendar};

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

/// Which year payload to build.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum YearShape {
    /// Month grids without the per-day state.
    Lite,
    /// `full=true`: every day's state, in `months` and again in `calendar`.
    Full,
    /// `wheel=true`: days once in `calendar`, trimmed to what the year wheel reads.
    Wheel,
}

/// `_WHEEL_DAY_DROP_KEYS`.
const WHEEL_DAY_DROP_KEYS: [&str; 12] = [
    "lagna_spans",
    "muhurta",
    "hora",
    "hora_day",
    "nivas_shool",
    "udaya_lagna",
    "tarabala_table",
    "chandrabala_table",
    "choghadiya",
    "solar_corrections",
    "lunar_calendar",
    "planets_anchor",
];

/// `_WHEEL_DAY_KEEP_FLAT`.
const WHEEL_DAY_KEEP_FLAT: [&str; 4] = ["day", "date_ad", "sunrise", "sunset"];

/// `_slim_day_for_wheel`.
fn slim_day_for_wheel(day: &Value) -> Value {
    let Some(Value::Object(embed)) = day.get("panchanga") else {
        return day.clone();
    };
    let mut slim = Map::new();
    if let Value::Object(fields) = day {
        for (k, v) in fields {
            if WHEEL_DAY_KEEP_FLAT.contains(&k.as_str()) {
                slim.insert(k.clone(), v.clone());
            }
        }
    }
    let kept: Map<String, Value> = embed
        .iter()
        .filter(|(k, _)| !WHEEL_DAY_DROP_KEYS.contains(&k.as_str()) && k.as_str() != "rashifal")
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    slim.insert("panchanga".into(), Value::Object(kept));
    Value::Object(slim)
}

/// `build_year_calendar(bs_year, location, full=…, shape=…)`.
///
/// # Errors
///
/// As [`month_calendar`].
pub fn year_calendar(
    bs_year: i32,
    location: &Location,
    shape: YearShape,
) -> Result<Value, MonthError> {
    let embed = if shape == YearShape::Lite {
        Embed::Lite
    } else {
        Embed::Full
    };
    let mut months = Vec::with_capacity(12);
    let mut days = Vec::new();
    let mut year_length = 0u64;
    for bs_month in 1..=12 {
        let month = month_calendar(bs_year, bs_month, location, International::Include, embed)?;
        year_length += month["month_length"].as_u64().unwrap_or(0);
        let Value::Object(mut fields) = month else {
            continue;
        };
        let grid = match fields.get("calendar") {
            Some(Value::Array(rows)) => rows.clone(),
            _ => Vec::new(),
        };
        if shape == YearShape::Wheel {
            days.extend(grid.iter().map(slim_day_for_wheel));
            fields.shift_remove("calendar");
        } else {
            days.extend(grid);
        }
        months.push(Value::Object(fields));
    }
    let mut out = Map::new();
    out.insert("year_bs".into(), json!(bs_year));
    out.insert("year_length".into(), json!(year_length));
    out.insert("location".into(), location.as_json());
    out.insert("months".into(), Value::Array(months));
    out.insert("calendar".into(), Value::Array(days));
    Ok(Value::Object(out))
}

/// `build_year_sun_times`: sunrise, sunset and ayana for every day of a BS year.
///
/// # Errors
///
/// [`MonthError`] for a year off the BS table or days before 1582-10-15.
pub fn year_sun_times(bs_year: i32, location: &Location) -> Result<Value, MonthError> {
    let mut months = Vec::with_capacity(12);
    for bs_month in 1..=12u32 {
        let start = calendar::month_start(bs_year, bs_month)?;
        let length = calendar::month_length(bs_year, bs_month)?;
        let mut days = Vec::with_capacity(length as usize);
        for offset in 0..length {
            let day = start.add_days(i32::try_from(offset).unwrap_or(0));
            // `local_hhmm(…, nearest_minute=True)`; a day `datetime` cannot hold has
            // Julian Day rise and set (`UtInstant`) read in the zone's modern offset.
            let (sunrise_jd, sunrise, sunset) = if day.is_datetime_range() {
                let times = sun_times(day, location)?;
                let hhmm = |t: timescale::UtcInstant| location.zone.local(t.add_seconds(30)).hm();
                (
                    times.sunrise.to_jd(),
                    hhmm(times.sunrise),
                    hhmm(times.sunset),
                )
            } else {
                let observer = location.observer();
                let event = |crossing| {
                    astronomy::engine::rise_set_on_day(
                        astronomy::surya_siddhanta::Body::Sun,
                        day,
                        &observer,
                        crossing,
                    )
                    .map(|m| timescale::JdInstant(m.to_jd()))
                    .ok_or(panchanga::daily::DailyError::NoSunrise(day))
                };
                let rise = event(astronomy::surya_siddhanta::Crossing::Rise)?;
                let set = event(astronomy::surya_siddhanta::Crossing::Set)?;
                let hhmm = |t: timescale::JdInstant| t.add_seconds(30).wall(&location.zone).hm;
                (rise.0, hhmm(rise), hhmm(set))
            };
            let aayan = panchanga::aayan(sunrise_jd);
            days.push(json!({
                "day": offset + 1,
                "date_ad": day.to_string(),
                "sunrise": sunrise,
                "sunset": sunset,
                "aayan": aayan.get("name").cloned().unwrap_or(Value::Null),
                "aayan_ne": aayan.get("name_ne").cloned().unwrap_or(Value::Null),
                "ayana_mark": crate::month::ayana_mark(&aayan),
            }));
        }
        months.push(json!({
            "month_bs": bs_month,
            "month_name": BS_MONTH_NAMES[bs_month as usize - 1],
            "month_name_ne": BS_MONTH_NAMES_NE[bs_month as usize - 1],
            "month_start_ad": start.to_string(),
            "month_length": length,
            "calendar": days,
        }));
    }
    Ok(json!({"year_bs": bs_year, "location": location.as_json(), "months": months}))
}
