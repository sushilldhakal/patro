//! The BS year views: every month grid in one payload (`build_year_calendar`, lite,
//! full or the slim year-wheel shape) and the सूर्यक्रान्ति grid (`build_year_sun_times`).

use common::{pyjson::Style, pyser};
use panchanga::daily::{Location, sun_times};
use serde_json::{Map, Value, json};
use timescale::PyInstant;

use std::sync::Arc;

use panchanga::payload::{Field, Fields};

use crate::month::{Embed, International, MonthError, month_fields};

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

/// Most threads one year view uses: months are independent, so they build side by
/// side, while a busy server still keeps cores for other requests.
const YEAR_THREADS: usize = 4;

/// The twelve months of a BS year, built on up to [`YEAR_THREADS`] threads and each
/// passed through `finish` on the thread that built it (so a month can be written out
/// and its tree freed there), in month order.
fn months_in_parallel<T: Send>(
    bs_year: i32,
    location: &Location,
    embed: Embed,
    finish: impl Fn(Fields) -> T + Sync,
) -> Vec<Result<T, MonthError>> {
    let threads = std::thread::available_parallelism()
        .map_or(1, std::num::NonZero::get)
        .clamp(1, YEAR_THREADS);
    let build =
        |m: u32| month_fields(bs_year, m, location, International::Include, embed).map(&finish);
    if threads == 1 {
        return (1..=12).map(build).collect();
    }
    let mut slots: Vec<Option<Result<T, MonthError>>> = (0..12).map(|_| None).collect();
    std::thread::scope(|scope| {
        let workers: Vec<_> = (0..threads)
            .map(|w| {
                scope.spawn(move || {
                    (1..=12_u32)
                        .filter(|m| (*m as usize - 1) % threads == w)
                        .map(|m| (m, build(m)))
                        .collect::<Vec<_>>()
                })
            })
            .collect();
        for worker in workers {
            for (m, month) in worker.join().expect("a month builder panicked") {
                slots[m as usize - 1] = Some(month);
            }
        }
    });
    slots
        .into_iter()
        .map(|m| m.expect("every month was built"))
        .collect()
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
    let built = months_in_parallel(bs_year, location, embed, |month| month.to_value());
    let mut months = Vec::with_capacity(12);
    let mut days = Vec::new();
    let mut year_length = 0u64;
    for month in built {
        let month = month?;
        year_length += month["month_length"].as_u64().unwrap_or(0);
        let Value::Object(mut fields) = month else {
            continue;
        };
        if shape == YearShape::Wheel {
            if let Some(Value::Array(rows)) = fields.shift_remove("calendar") {
                days.extend(rows.iter().map(slim_day_for_wheel));
            }
        } else if let Some(Value::Array(rows)) = fields.get("calendar") {
            days.extend(rows.iter().cloned());
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

/// One month of a year written out: its object, its rows, and its length.
struct MonthText {
    object: String,
    rows: String,
    length: u64,
}

/// How a year is written: compact, or rendered for an era (labels beside every
/// Julian Day, `json.dumps`'s default separators) as the era layer re-renders a body.
#[derive(Debug, Clone, Copy)]
pub struct YearText<'a> {
    /// The era to render for, with its language; `None` for the plain compact body.
    pub era: Option<(&'a str, &'a str)>,
}

impl YearText<'_> {
    fn style(&self) -> Style {
        if self.era.is_some() {
            Style::Default
        } else {
            Style::Compact
        }
    }

    fn item(&self) -> &'static str {
        if self.era.is_some() { ", " } else { "," }
    }

    fn key(&self) -> &'static str {
        if self.era.is_some() { ": " } else { ":" }
    }
}

/// Writes one month for the year payload and frees its tree: the month object (with
/// its `calendar` unless the year is the wheel shape) and its rows for the year's own
/// `calendar`.
fn month_text(month: &Value, shape: YearShape, how: YearText<'_>) -> Option<MonthText> {
    let rendered;
    let month = match how.era {
        Some((era, _)) => {
            rendered = crate::era::render_part(month, era);
            &rendered
        }
        None => month,
    };
    let (style, item, key_sep) = (how.style(), how.item(), how.key());
    let Value::Object(fields) = month else {
        return None;
    };
    let rows: Vec<&Value> = match fields.get("calendar") {
        Some(Value::Array(rows)) => rows.iter().collect(),
        _ => Vec::new(),
    };
    let mut rows_text = String::new();
    for (i, row) in rows.iter().enumerate() {
        if i > 0 {
            rows_text.push_str(item);
        }
        if shape == YearShape::Wheel {
            pyser::write(&mut rows_text, &slim_day_for_wheel(row), style);
        } else {
            pyser::write(&mut rows_text, *row, style);
        }
    }
    let mut object = String::from("{");
    let mut first = true;
    for (key, value) in fields {
        if key == "calendar" && shape == YearShape::Wheel {
            continue;
        }
        if !first {
            object.push_str(item);
        }
        first = false;
        pyser::write(&mut object, key, style);
        object.push_str(key_sep);
        if key == "calendar" && matches!(value, Value::Array(_)) {
            object.push('[');
            object.push_str(&rows_text);
            object.push(']');
        } else {
            pyser::write(&mut object, value, style);
        }
    }
    object.push('}');
    Some(MonthText {
        object,
        rows: rows_text,
        length: month["month_length"].as_u64().unwrap_or(0),
    })
}

/// A row trimmed to what the year wheel reads, as typed fields (`_slim_day_for_wheel`).
fn slim_fields_for_wheel(day: &Fields) -> Fields {
    let Some(Field::Nested(embed)) = day.field("panchanga") else {
        if let Some(field) = day.field("panchanga") {
            return Fields::from_value(slim_day_for_wheel(&{
                let mut tree = day.to_value();
                if let Value::Object(m) = &mut tree {
                    m.insert("panchanga".into(), field.value());
                }
                tree
            }));
        }
        return day.clone();
    };
    let mut slim = Fields::new();
    for (key, field) in day.iter() {
        if WHEEL_DAY_KEEP_FLAT.contains(&key) {
            slim.insert(key.to_owned(), field.clone());
        }
    }
    let mut kept = Fields::new();
    for (key, field) in embed.iter() {
        if !WHEEL_DAY_DROP_KEYS.contains(&key) && key != "rashifal" {
            kept.insert(key.to_owned(), field.clone());
        }
    }
    slim.insert("panchanga", Field::Nested(Arc::new(kept)));
    slim
}

/// [`month_text`] for the plain compact body, written from the month's typed fields
/// (each row's embedded panchanga written from its day's shared blocks).
fn month_text_plain(month: &Fields, shape: YearShape) -> MonthText {
    let rows: Vec<Fields> = match month.field("calendar") {
        Some(Field::List(rows)) => rows.to_vec(),
        Some(other) => match other.value() {
            Value::Array(rows) => rows.into_iter().map(Fields::from_value).collect(),
            _ => Vec::new(),
        },
        None => Vec::new(),
    };
    let mut rows_text = String::new();
    for (i, row) in rows.iter().enumerate() {
        if i > 0 {
            rows_text.push(',');
        }
        if shape == YearShape::Wheel {
            slim_fields_for_wheel(row).write(&mut rows_text, Style::Compact);
        } else {
            row.write(&mut rows_text, Style::Compact);
        }
    }
    let mut object = String::from("{");
    let mut first = true;
    for (key, field) in month.iter() {
        if key == "calendar" && shape == YearShape::Wheel {
            continue;
        }
        if !first {
            object.push(',');
        }
        first = false;
        pyser::write(&mut object, key, Style::Compact);
        object.push(':');
        if key == "calendar" {
            object.push('[');
            object.push_str(&rows_text);
            object.push(']');
        } else {
            field.write(&mut object, Style::Compact);
        }
    }
    object.push('}');
    MonthText {
        object,
        rows: rows_text,
        length: month
            .get("month_length")
            .and_then(|v| v.as_u64())
            .unwrap_or(0),
    }
}

/// [`year_calendar`] written straight to JSON text: the bytes
/// `dumps(year_calendar(…), Compact)` gives, or, with an era, the bytes the era layer
/// writes for it. Each thread builds, writes and frees one month at a time instead of
/// the year holding every day's tree at once: a `full=true` year is tens of megabytes
/// of text, and as one tree (rendered once more for an era) it was the better part of
/// a gigabyte.
///
/// # Errors
///
/// As [`month_calendar`].
pub fn year_calendar_text(
    bs_year: i32,
    location: &Location,
    shape: YearShape,
    how: YearText<'_>,
) -> Result<String, MonthError> {
    let embed = if shape == YearShape::Lite {
        Embed::Lite
    } else {
        Embed::Full
    };
    let built = months_in_parallel(bs_year, location, embed, |month| match how.era {
        Some(_) => month_text(&month.to_value(), shape, how),
        None => Some(month_text_plain(&month, shape)),
    });
    let mut months = Vec::with_capacity(12);
    for month in built {
        if let Some(text) = month? {
            months.push(text);
        }
    }
    let (style, item, key) = (how.style(), how.item(), how.key());
    let field = |out: &mut String, name: &str, first: bool| {
        if !first {
            out.push_str(item);
        }
        pyser::write(out, name, style);
        out.push_str(key);
    };
    let year_length: u64 = months.iter().map(|m| m.length).sum();
    let size: usize = months
        .iter()
        .map(|m| m.object.len() + m.rows.len() + 4)
        .sum();
    let mut out = String::with_capacity(size + 512);
    out.push('{');
    field(&mut out, "year_bs", true);
    pyser::write(&mut out, &bs_year, style);
    field(&mut out, "year_length", false);
    pyser::write(&mut out, &year_length, style);
    field(&mut out, "location", false);
    let location_json = location.as_json();
    match how.era {
        Some((era, _)) => pyser::write(
            &mut out,
            &crate::era::render_part(&location_json, era),
            style,
        ),
        None => pyser::write(&mut out, &location_json, style),
    }
    field(&mut out, "months", false);
    out.push('[');
    for (i, m) in months.iter().enumerate() {
        if i > 0 {
            out.push_str(item);
        }
        out.push_str(&m.object);
    }
    out.push(']');
    field(&mut out, "calendar", false);
    out.push('[');
    let mut first = true;
    for m in months.iter().filter(|m| !m.rows.is_empty()) {
        if !first {
            out.push_str(item);
        }
        first = false;
        out.push_str(&m.rows);
    }
    out.push(']');
    if let Some((era, language)) = how.era {
        field(&mut out, "era", false);
        pyser::write(&mut out, era, style);
        field(&mut out, "language", false);
        pyser::write(&mut out, language, style);
    }
    out.push('}');
    Ok(out)
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
