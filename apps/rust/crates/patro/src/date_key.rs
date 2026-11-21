//! A calendar date written as text (`2083-10-12`) → the day it names.
//!
//! Port of `engine/calendar/date_keys.py` and `engine/calendar/era.py::to_jd`: the
//! single reader every day-scoped route uses for its `{date_key}` path segment.
//! Errors are the exact strings Python raises; callers answer them as 400s.

use std::fmt::Write as _;

use calendar::BsError;
use timescale::CivilDay;

/// The era codes a key can be read in (`engine.calendar.era.ERA_CODES`).
pub const ERA_CODES: [&str; 4] = ["ad", "bc", "bs", "bbs"];
/// Words that name a day by when you ask (`engine.calendar.day_keys`).
pub const RELATIVE_DAY_KEYS: [&str; 4] = ["today", "tomorrow", "now", "current"];
/// Signed patro axis floor under the Surya Siddhanta (`signed_year_min()`).
pub const SIGNED_YEAR_MIN: i64 = -3_891_138;
/// Signed patro axis ceiling (`signed_year_max()`).
pub const SIGNED_YEAR_MAX: i64 = 17_053;

/// `is_relative_day_key`.
#[must_use]
pub fn is_relative_day_key(key: &str) -> bool {
    RELATIVE_DAY_KEYS.contains(&key.trim().to_lowercase().as_str())
}

/// Python `repr()` of a str, as error messages quote keys.
#[must_use]
pub fn py_repr_str(s: &str) -> String {
    let quote = if s.contains('\'') && !s.contains('"') {
        '"'
    } else {
        '\''
    };
    let mut out = String::with_capacity(s.len() + 2);
    out.push(quote);
    for ch in s.chars() {
        match ch {
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c == quote => {
                out.push('\\');
                out.push(c);
            }
            c if (c as u32) < 0x20 || c as u32 == 0x7f => {
                let _ = write!(out, "\\x{:02x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push(quote);
    out
}

/// The zero of every Unicode decimal-digit run (category Nd); Python's `int()`
/// reads all of them, so `२०८३-०८-१५` is a valid key.
const ND_ZEROS: [u32; 65] = [
    0x30, 0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66,
    0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90,
    0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10,
    0x104A0, 0x10D30, 0x11066, 0x110F0, 0x11136, 0x111D0, 0x112F0, 0x11450, 0x114D0, 0x11650,
    0x116C0, 0x11730, 0x118E0, 0x11950, 0x11C50, 0x11D50, 0x11DA0, 0x16A60, 0x16B50, 0x1D7CE,
    0x1D7D8, 0x1D7E2, 0x1D7EC, 0x1D7F6, 0x1E140, 0x1E2F0, 0x1E950, 0x1FBF0,
];

fn decimal_value(c: char) -> Option<u32> {
    let cp = c as u32;
    ND_ZEROS
        .iter()
        .find(|&&zero| (zero..zero + 10).contains(&cp))
        .map(|zero| cp - zero)
}

/// Python `int(text)`: surrounding whitespace, a sign, any Unicode decimal digits
/// and single underscores between digits. `None` where Python raises (or the value
/// overflows `i64`, which no valid key reaches).
#[must_use]
pub fn py_int(text: &str) -> Option<i64> {
    let t = text.trim();
    let (negative, digits) = match t.chars().next() {
        Some('-') => (true, &t[1..]),
        Some('+') => (false, &t[1..]),
        _ => (false, t),
    };
    if digits.is_empty()
        || digits.starts_with('_')
        || digits.ends_with('_')
        || digits.contains("__")
    {
        return None;
    }
    let mut value: i64 = 0;
    for c in digits.chars().filter(|&c| c != '_') {
        value = value
            .checked_mul(10)?
            .checked_add(i64::from(decimal_value(c)?))?;
    }
    Some(if negative { -value } else { value })
}

fn normalise(era: &str) -> Result<&'static str, String> {
    let text = era.trim().to_lowercase();
    ERA_CODES
        .iter()
        .copied()
        .find(|code| *code == text)
        .ok_or_else(|| {
            format!(
                "era must be one of {}; got {}",
                ERA_CODES.join(", "),
                py_repr_str(era)
            )
        })
}

fn astronomical_year(code: &str, year: i64) -> Result<i64, String> {
    if code == "ad" {
        if year < 1 {
            return Err(format!(
                "ad year must be >= 1 (use era=bc for BCE); got {year}"
            ));
        }
        return Ok(year);
    }
    if year < 1 {
        return Err(format!("bc year must be >= 1; got {year}"));
    }
    Ok(1 - year)
}

fn signed_patro_year(code: &str, year: i64) -> Result<i32, String> {
    if year < 1 {
        return Err(format!(
            "{code} year must be >= 1 — the eras carry the sign, not the number; got {year}"
        ));
    }
    let signed = if code == "bs" { year } else { -year };
    if signed == 0 || !(SIGNED_YEAR_MIN..=SIGNED_YEAR_MAX).contains(&signed) {
        let limit = if code == "bbs" {
            -SIGNED_YEAR_MIN
        } else {
            SIGNED_YEAR_MAX
        };
        return Err(format!("{code} year must be 1..{limit}; got {year}"));
    }
    i32::try_from(signed)
        .map_err(|_| format!("{code} year must be 1..{SIGNED_YEAR_MAX}; got {year}"))
}

/// `era.to_jd(era, year, month, day)`: JD at 0h UT of that civil day.
///
/// `month` / `day` default to 1. `raw_era` is the caller's text, used verbatim in
/// the ephemeris message as Python does.
///
/// # Errors
///
/// Python's `ValueError` text for a bad era, year, month or day, or the
/// out-of-ephemeris message when a Vikram month cannot be built.
pub fn to_jd(
    raw_era: &str,
    year: i64,
    month: Option<i64>,
    day: Option<i64>,
) -> Result<f64, String> {
    let code = normalise(raw_era)?;
    let m = month.unwrap_or(1);
    let d = day.unwrap_or(1);
    if !(1..=12).contains(&m) {
        let shown = month.map_or_else(|| "None".to_owned(), |v| v.to_string());
        return Err(format!("month must be 1..12; got {shown}"));
    }
    if d < 1 {
        let shown = day.map_or_else(|| "None".to_owned(), |v| v.to_string());
        return Err(format!("day must be >= 1; got {shown}"));
    }
    let month_u = u32::try_from(m).map_err(|_| format!("month must be 1..12; got {m}"))?;

    if code == "ad" || code == "bc" {
        let astro = astronomical_year(code, year)?;
        let (Ok(y), Ok(dd)) = (i32::try_from(astro), u32::try_from(d)) else {
            return Err(ephemeris_message(raw_era, year));
        };
        return Ok(CivilDay::new(y, month_u, dd).to_jd_ut());
    }

    let signed = signed_patro_year(code, year)?;
    let ephemeris = |e: BsError| match e {
        BsError::Sankranti { .. } => ephemeris_message(raw_era, year),
        other => other.to_string(),
    };
    let length = calendar::month_length(signed, month_u).map_err(ephemeris)?;
    if d > i64::from(length) {
        return Err(format!(
            "day must be 1..{length} for {code} {year}/{month_u}; got {d}"
        ));
    }
    let start = calendar::month_start(signed, month_u).map_err(ephemeris)?;
    #[expect(
        clippy::cast_precision_loss,
        reason = "d <= 32, exactly representable; Python adds float(days)"
    )]
    let offset = (d - 1) as f64;
    Ok(start.to_jd_ut() + offset)
}

fn ephemeris_message(raw_era: &str, year: i64) -> String {
    format!(
        "{raw_era} year {year} is outside the installed ephemeris range, so no \
         panchanga can be computed for it"
    )
}

fn not_ymd(date_key: &str) -> String {
    format!(
        "{} is not a Y-M-D date; use ?jd= or ?year=&month=&day=",
        py_repr_str(date_key)
    )
}

/// `jd_calendar.parse_civil_iso`: `YYYY-MM-DD` / `-YYYY-MM-DD` with no zone.
fn parse_civil_iso(text: &str) -> Option<CivilDay> {
    let t = text.trim();
    let (sign, body) = match t.as_bytes().first()? {
        b'-' => (-1, &t[1..]),
        b'+' => (1, &t[1..]),
        _ => (1, t),
    };
    let parts: Vec<&str> = body.split('-').collect();
    let [y, m, d] = parts.as_slice() else {
        return None;
    };
    let year = i32::try_from(sign * py_int(y)?).ok()?;
    let month = u32::try_from(py_int(m)?).ok()?;
    let day = u32::try_from(py_int(d)?).ok()?;
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }
    Some(CivilDay::new(year, month, day))
}

/// `parse_date_key(date_key, era)`: a `Y-M-D` path segment → JD, read in `era`.
///
/// # Errors
///
/// Python's `DayResolutionError` text.
pub fn parse_date_key(date_key: &str, era: &str) -> Result<f64, String> {
    let text = date_key.trim();
    if text.starts_with('-') {
        return parse_civil_iso(text)
            .map(CivilDay::to_jd_ut)
            .ok_or_else(|| format!("{} is not a date this era can read", py_repr_str(date_key)));
    }
    let parts: Vec<&str> = text.split('-').collect();
    let [y, m, d] = parts.as_slice() else {
        return Err(not_ymd(date_key));
    };
    let (Some(year), Some(month), Some(day)) = (py_int(y), py_int(m), py_int(d)) else {
        return Err(not_ymd(date_key));
    };
    to_jd(era, year, Some(month), Some(day))
}

/// `greg_date_for_date_key`: the Gregorian day a key names (1582-10-15 or later).
///
/// # Errors
///
/// Python's `DayResolutionError` text, including relative keys and days before 1 CE.
pub fn greg_day_for_date_key(date_key: &str, era: &str) -> Result<CivilDay, String> {
    if is_relative_day_key(date_key) {
        return Err(format!(
            "{} names an instant, not a calendar date; use /panchanga/today (or /tomorrow), or pass ?jd=",
            py_repr_str(date_key)
        ));
    }
    let civil = CivilDay::from_jd_ut(parse_date_key(date_key, era)?);
    if civil.is_datetime_range() {
        Ok(civil)
    } else {
        Err(format!(
            "{date_key} is before 1 CE; address it with ?jd= on a route that supports it"
        ))
    }
}

/// `civil_day_for_date_key`: the civil day, or `None` when it cannot be read.
#[must_use]
pub fn civil_day_for_date_key(date_key: &str, era: &str) -> Option<CivilDay> {
    if is_relative_day_key(date_key) {
        return None;
    }
    parse_date_key(date_key, era).ok().map(CivilDay::from_jd_ut)
}

/// `era.year_span_jd(era, year)`: JD of the first and last civil day of a year.
///
/// # Errors
///
/// Python's `ValueError` text for a bad era or year, or the BS table's error.
pub fn year_span_jd(raw_era: &str, year: i64) -> Result<(f64, f64), String> {
    let code = normalise(raw_era)?;
    if code == "ad" || code == "bc" {
        let astro = i32::try_from(astronomical_year(code, year)?)
            .map_err(|_| format!("{code} year must be >= 1; got {year}"))?;
        return Ok((
            CivilDay::new(astro, 1, 1).to_jd_ut(),
            CivilDay::new(astro, 12, 31).to_jd_ut(),
        ));
    }
    let signed = signed_patro_year(code, year)?;
    let start = calendar::month_start(signed, 1).map_err(|e| e.to_string())?;
    let last = calendar::month_start(signed, 12).map_err(|e| e.to_string())?;
    let len = calendar::month_length(signed, 12).map_err(|e| e.to_string())?;
    Ok((
        start.to_jd_ut(),
        last.add_days(i32::try_from(len).unwrap_or(30) - 1)
            .to_jd_ut(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn py_int_matches_python() {
        assert_eq!(py_int(" 12 "), Some(12));
        assert_eq!(py_int("+1_000"), Some(1000));
        assert_eq!(py_int("1__0"), None);
        assert_eq!(py_int("_1"), None);
        assert_eq!(py_int(""), None);
        assert_eq!(py_int("0x1"), None);
        assert_eq!(py_int("२०८३"), Some(2083));
    }

    #[test]
    fn repr_quotes_like_python() {
        assert_eq!(py_repr_str("ab"), "'ab'");
        assert_eq!(py_repr_str("a'b"), "\"a'b\"");
        assert_eq!(py_repr_str("a'b\""), "'a\\'b\"'");
    }
}
