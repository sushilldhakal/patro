//! पञ्चक: the Moon's transit from Dhanishta pada 3 through Revati
//! (`engine/jyotish/panchak_calendar.py`).

use panchanga::{
    daily::Location,
    nepali_digits,
    pyfloat::{py_floordiv, py_int, py_mod},
};
use serde_json::{Value, json};
use timescale::{CivilDay, JdInstant, PyInstant, UtcInstant, julday};

use crate::{
    Graha,
    gochar::{Kind, next_pada_entry, pada_flat},
};

/// Dhanishta (22) pada 3: Panchak begins.
const START_FLAT: i64 = 22 * 4 + 2;
/// Ashwini pada 1: Panchak ends.
const END_FLAT: i64 = 0;
const DAY: i64 = 86_400;

fn entry_flat(kind: Kind) -> i64 {
    match kind {
        Kind::Pada { to, .. } => i64::try_from(to.0 * 4 + to.1).unwrap_or(0) - 1,
        _ => -1,
    }
}

/// The next Moon pada ingress landing on `flat` after `cursor` (120 tries).
fn next_landing<I: PyInstant>(siddhanta: astronomy::System, mut cursor: I, flat: i64) -> Option<I> {
    for _ in 0..120 {
        let entry = next_pada_entry(siddhanta, Graha::Moon, cursor)?;
        let at = entry.printed_at();
        if entry_flat(entry.kind) == flat {
            return Some(at);
        }
        cursor = at.add_seconds(30);
    }
    None
}

/// `_find_open_start`: the last Panchak start before `before` (7-day look-back).
fn open_start<I: PyInstant>(siddhanta: astronomy::System, before: I) -> Option<I> {
    let mut cursor = before.add_seconds(-7 * DAY);
    let mut last = None;
    while cursor < before {
        let Some(entry) = next_pada_entry(siddhanta, Graha::Moon, cursor) else {
            break;
        };
        let at = entry.printed_at();
        if at >= before {
            break;
        }
        if entry_flat(entry.kind) == START_FLAT {
            last = Some(at);
        }
        cursor = at.add_seconds(30);
    }
    last
}

/// `list_panchak_periods`: (start, end) pairs overlapping the inclusive civil span.
/// `day_instant_utc(day, hour=, minute=, second=)` for a day `datetime` cannot hold.
fn day_instant_jd(day: CivilDay, hour: u32, minute: u32, second: u32) -> JdInstant {
    let hour_ut = f64::from(hour) + f64::from(minute) / 60.0 + f64::from(second) / 3600.0;
    JdInstant(julday(
        day.year,
        day.month,
        day.day,
        hour_ut,
        day.calendar(),
    ))
}

fn periods<I: PyInstant>(
    start: CivilDay,
    end: CivilDay,
    bounds: (I, I),
    location: &Location,
) -> Vec<(I, I)> {
    let siddhanta = location.system;
    let (s0, e0) = bounds;
    let search_start = s0.add_seconds(-7 * DAY);
    let search_end = e0.add_seconds(7 * DAY);
    let mut cursor = search_start;
    let mut raw = Vec::new();
    if pada_flat(siddhanta, Graha::Moon, cursor) >= START_FLAT
        && let Some(open) = open_start(siddhanta, cursor)
        && let Some(close) = next_landing(siddhanta, open.add_seconds(30), END_FLAT)
        && close <= search_end
    {
        raw.push((open, close));
        cursor = close.add_seconds(30);
    }
    while cursor < search_end {
        let Some(s) = next_landing(siddhanta, cursor, START_FLAT) else {
            break;
        };
        if s > search_end {
            break;
        }
        let Some(e) = next_landing(siddhanta, s.add_seconds(30), END_FLAT) else {
            break;
        };
        raw.push((s, e));
        cursor = e.add_seconds(30);
    }
    let (lo, hi) = (start.to_jd_ut(), end.to_jd_ut());
    raw.into_iter()
        .filter(|(s, e)| {
            s.civil_fields(&location.zone).day.to_jd_ut() <= hi
                && e.civil_fields(&location.zone).day.to_jd_ut() >= lo
        })
        .collect()
}

/// `_moment_stamp`.
fn stamp<I: PyInstant>(at: I, location: &Location) -> Value {
    let local = at.civil_fields(&location.zone);
    let day = local.day;
    let offset = at.utc_offset_seconds(&location.zone);
    let sign = if offset < 0 { '-' } else { '+' };
    let off = offset.unsigned_abs();
    let hm = local.hm.clone();
    let hour: u32 = hm[..2].parse().unwrap_or(0);
    let minute: u32 = hm[3..].parse().unwrap_or(0);
    let h12 = if hour % 12 == 0 { 12 } else { hour % 12 };
    // `_patro_date_for`: the CE conversion for years from 1, the patro axis before.
    let bs = if day.year >= 1 {
        calendar::civil_to_bs(day).ok()
    } else {
        calendar::locate_patro_day(day).ok()
    };
    json!({
        "iso": format!("{day}T{}{sign}{:02}:{:02}", local.hms, off / 3600, off % 3600 / 60),
        "jd": day.to_jd_ut(),
        "bs_year": bs.map(|b| b.year),
        "bs_month": bs.map(|b| b.month),
        "bs_day": bs.map(|b| b.day),
        "time_short": hm,
        "time_en": format!("{h12}:{minute:02} {}", if hour < 12 { "AM" } else { "PM" }),
        "time_ne": format!(
            "{}:{} {}",
            nepali_digits(h12),
            nepali_digits(format!("{minute:02}")),
            if hour >= 12 { "अपराह्न" } else { "पूर्वाह्न" }
        ),
    })
}

/// `_format_duration`.
fn duration<I: PyInstant>(start: I, end: I) -> (String, String) {
    let total = end.seconds_since(start).max(0.0);
    let days = py_int(py_floordiv(total, 86_400.0));
    let hours = py_int(py_floordiv(py_mod(total, 86_400.0), 3600.0));
    let plural = |n: i64| if n == 1 { "" } else { "s" };
    (
        format!("{days} day{} {hours} hour{}", plural(days), plural(hours)),
        format!("{} दिन {} घण्टा", nepali_digits(days), nepali_digits(hours)),
    )
}

/// `build_panchak_span(jd_start, jd_end, location)`.
#[must_use]
pub fn panchak_span(jd_start: f64, jd_end: f64, location: &Location) -> Value {
    let (start, end) = (CivilDay::from_jd_ut(jd_start), CivilDay::from_jd_ut(jd_end));
    let rows = if start.is_datetime_range() && end.is_datetime_range() {
        match (
            UtcInstant::from_utc(start, 0, 0, 0, 0),
            UtcInstant::from_utc(end, 23, 59, 59, 0),
        ) {
            (Some(s0), Some(e0)) => rows(&periods(start, end, (s0, e0), location), location),
            _ => Vec::new(),
        }
    } else {
        let bounds = (
            day_instant_jd(start, 0, 0, 0),
            day_instant_jd(end, 23, 59, 59),
        );
        rows(&periods(start, end, bounds, location), location)
    };
    json!({
        "range_start_jd": jd_start, "range_end_jd": jd_end, "location": location.as_json(),
        "count": rows.len(), "periods": rows,
    })
}

fn rows<I: PyInstant>(found: &[(I, I)], location: &Location) -> Vec<Value> {
    found
        .iter()
        .map(|&(s, e)| {
            let (en, ne) = duration(s, e);
            json!({
                "start": stamp(s, location), "end": stamp(e, location),
                "duration_en": en, "duration_ne": ne,
            })
        })
        .collect()
}
