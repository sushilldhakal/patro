//! pydantic v2's lax `datetime` input (speedate): ISO strings, date-only
//! strings, and Unix timestamps (seconds, or milliseconds past 2e10).

use jiff::{Timestamp, civil};

/// A parsed `datetime`: aware (an instant) or naive (a wall clock).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PyDateTime {
    /// Has an offset (or came from a Unix timestamp).
    Aware(Timestamp),
    /// No offset.
    Naive(civil::DateTime),
}

/// Why an input is not a `datetime`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DateTimeError {
    /// `datetime_type`: not a string or number.
    Type,
    /// `datetime_from_date_parsing` with speedate's message.
    Parsing(&'static str),
}

fn digits(b: &[u8]) -> Option<i64> {
    if b.is_empty() || !b.iter().all(u8::is_ascii_digit) {
        return None;
    }
    std::str::from_utf8(b).ok()?.parse().ok()
}

/// speedate's `Date::parse_str` errors (what pydantic reports when the datetime parse fails).
fn date_part(b: &[u8]) -> Result<civil::Date, &'static str> {
    if b.len() < 10 {
        return Err("input is too short");
    }
    let year = digits(&b[0..4]).ok_or("invalid character in year")?;
    if b[4] != b'-' {
        return Err("invalid date separator");
    }
    let month = digits(&b[5..7]).ok_or("invalid character in month")?;
    if b[7] != b'-' {
        return Err("invalid date separator");
    }
    let day = digits(&b[8..10]).ok_or("invalid character in day")?;
    if !(1..=12).contains(&month) {
        return Err("month value is outside expected range of 1-12");
    }
    let (Ok(y), Ok(m), Ok(d)) = (i16::try_from(year), i8::try_from(month), i8::try_from(day))
    else {
        return Err("day value is outside expected range");
    };
    civil::Date::new(y, m, d).map_err(|_| "day value is outside expected range")
}

/// `HH:MM[:SS[.ffffff…]]` then an optional `Z` / `±HH:MM` / `±HHMM`; `None` on any error.
fn time_and_offset(b: &[u8]) -> Option<(civil::Time, Option<i32>)> {
    if b.len() < 5 || b[2] != b':' {
        return None;
    }
    let hour = digits(&b[0..2])?;
    let minute = digits(&b[3..5])?;
    let mut i = 5;
    let mut second = 0;
    let mut nanos = 0i64;
    if b.get(i) == Some(&b':') {
        second = digits(b.get(i + 1..i + 3)?)?;
        i += 3;
        if matches!(b.get(i), Some(b'.' | b',')) {
            i += 1;
            let start = i;
            while i < b.len() && b[i].is_ascii_digit() {
                i += 1;
            }
            if i == start {
                return None;
            }
            let frac = &b[start..i];
            let mut micros = String::from_utf8_lossy(&frac[..frac.len().min(6)]).into_owned();
            while micros.len() < 6 {
                micros.push('0');
            }
            nanos = micros.parse::<i64>().ok()? * 1000;
        }
    }
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    let offset = match b.get(i) {
        None => None,
        Some(b'Z' | b'z') if i + 1 == b.len() => Some(0),
        Some(&sign @ (b'+' | b'-')) => {
            let rest = &b[i + 1..];
            let (h, m) = match rest.len() {
                5 if rest[2] == b':' => (digits(&rest[0..2])?, digits(&rest[3..5])?),
                4 => (digits(&rest[0..2])?, digits(&rest[2..4])?),
                _ => return None,
            };
            if h > 23 || m > 59 {
                return None;
            }
            let secs = i32::try_from(h * 3600 + m * 60).ok()?;
            Some(if sign == b'-' { -secs } else { secs })
        }
        Some(_) => return None,
    };
    let time = civil::Time::new(
        i8::try_from(hour).ok()?,
        i8::try_from(minute).ok()?,
        i8::try_from(second).ok()?,
        i32::try_from(nanos).ok()?,
    )
    .ok()?;
    Some((time, offset))
}

fn from_unix(value: f64) -> Result<PyDateTime, DateTimeError> {
    let seconds = if value.abs() > 2e10 {
        value / 1000.0
    } else {
        value
    };
    #[expect(
        clippy::cast_possible_truncation,
        reason = "a timestamp within jiff's range, rounded to microseconds"
    )]
    let micros = (seconds * 1e6).round() as i64;
    Timestamp::from_microsecond(micros)
        .map(PyDateTime::Aware)
        .map_err(|_| DateTimeError::Parsing("value is too large"))
}

/// Parses a JSON value as pydantic's lax `datetime`.
///
/// # Errors
///
/// [`DateTimeError::Type`] for non-string, non-number input; speedate's message otherwise.
pub fn parse_value(v: &serde_json::Value) -> Result<PyDateTime, DateTimeError> {
    match v {
        serde_json::Value::Number(n) => from_unix(n.as_f64().unwrap_or(0.0)),
        serde_json::Value::String(s) => parse_str(s),
        _ => Err(DateTimeError::Type),
    }
}

/// Parses a string as pydantic's lax `datetime`.
///
/// # Errors
///
/// speedate's date-parse message when the text is neither a datetime nor a timestamp.
pub fn parse_str(s: &str) -> Result<PyDateTime, DateTimeError> {
    let b = s.as_bytes();
    if !b.is_empty()
        && b.iter()
            .all(|c| c.is_ascii_digit() || matches!(c, b'.' | b'-'))
        && s.parse::<f64>().is_ok()
    {
        return from_unix(s.parse::<f64>().unwrap_or(0.0));
    }
    if b.len() >= 16
        && matches!(b[10], b'T' | b't' | b' ' | b'_')
        && let Ok(date) = date_part(&b[..10])
        && let Some((time, offset)) = time_and_offset(&b[11..])
    {
        let dt = date.to_datetime(time);
        return Ok(match offset {
            None => PyDateTime::Naive(dt),
            Some(secs) => {
                let off = jiff::tz::Offset::from_seconds(secs)
                    .map_err(|_| DateTimeError::Parsing("invalid timezone"))?;
                PyDateTime::Aware(
                    off.to_timestamp(dt)
                        .map_err(|_| DateTimeError::Parsing("value is too large"))?,
                )
            }
        });
    }
    let date = date_part(b).map_err(DateTimeError::Parsing)?;
    if b.len() > 10 {
        return Err(DateTimeError::Parsing(
            "unexpected extra characters at the end of the input",
        ));
    }
    Ok(PyDateTime::Naive(date.to_datetime(civil::Time::midnight())))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn err(s: &str) -> &'static str {
        match parse_str(s) {
            Err(DateTimeError::Parsing(m)) => m,
            other => panic!("{s}: {other:?}"),
        }
    }

    #[test]
    fn speedate_cases() {
        assert_eq!(err("x"), "input is too short");
        assert_eq!(
            err("2026-13-01"),
            "month value is outside expected range of 1-12"
        );
        assert_eq!(err("2026-02-30"), "day value is outside expected range");
        assert_eq!(err("  2026-01-02"), "invalid character in year");
        for s in [
            "2026-01-02T25:00",
            "2026-01-02T03:04:05-05",
            "2026-01-02T03",
            "2026-01-02X03:04",
        ] {
            assert_eq!(
                err(s),
                "unexpected extra characters at the end of the input",
                "{s}"
            );
        }
        let aware = |s: &str| match parse_str(s) {
            Ok(PyDateTime::Aware(t)) => t.to_string(),
            other => panic!("{s}: {other:?}"),
        };
        assert_eq!(aware("2026-01-02T03:04:05+0545"), "2026-01-01T21:19:05Z");
        assert_eq!(
            aware("2026-01-02 03:04:05.123+05:45"),
            "2026-01-01T21:19:05.123Z"
        );
        assert_eq!(aware("1700000000.5"), "2023-11-14T22:13:20.5Z");
        assert_eq!(aware("2026"), "1970-01-01T00:33:46Z");
        assert!(matches!(parse_str("2026-01-02"), Ok(PyDateTime::Naive(_))));
        assert!(matches!(
            parse_str("2026-01-02T03:04"),
            Ok(PyDateTime::Naive(_))
        ));
    }
}
