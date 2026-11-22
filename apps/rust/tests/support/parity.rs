//! API-contract parity with the production server's recorded responses.
//!
//! The Rust server must answer with the same shape as Python: the same keys in the
//! same order, the same types, the same lists, strings and integers. What it is free
//! to do is compute better. Times come from the event engine, which solves each
//! boundary instead of bisecting to a second, so a printed time may differ from the
//! recording by a second or two, a `HH:MM` display by a minute at a rounding edge,
//! and a float derived from a time by a hair. Nothing else may differ.

use std::cell::Cell;

use serde_json::Value;

thread_local! {
    /// Whether the payload being compared is a day on the Julian or BCE axis, whose
    /// lunar month Python labelled with the solar month's name (`solar_month_stub`).
    static JULIAN_PAYLOAD: Cell<bool> = const { Cell::new(false) };
}

/// A payload dated before the Gregorian cutover (1582-10-15), read off the day or
/// month it names.
fn julian_payload(payload: &Value) -> bool {
    if let Some(jd) = payload.get("jd_ut").and_then(Value::as_f64) {
        return jd < 2_299_160.5;
    }
    ["date_ad", "month_start_ad", "date"]
        .iter()
        .find_map(|key| payload.get(key).and_then(Value::as_str))
        .is_some_and(|text| {
            if text.ends_with("BC") {
                return true;
            }
            let (negative, body) = match text.strip_prefix('-') {
                Some(rest) => (true, rest),
                None => (false, text),
            };
            let mut parts = body.splitn(3, '-').map(|p| p.parse::<i64>().ok());
            match (
                parts.next().flatten(),
                parts.next().flatten(),
                parts.next().flatten(),
            ) {
                (Some(y), Some(m), Some(d)) => {
                    let y = if negative { -y } else { y };
                    (y, m, d) < (1582, 10, 15)
                }
                _ => false,
            }
        })
}

/// The lunar-month fields of a Julian-axis payload. Rust names the real lunar month of
/// those days (the calendar is the Surya Siddhanta's, the Gregorian or Julian date only
/// its label); Python printed the solar month's name there, and could not run before
/// year 1. Their shape is still checked by the other fields around them.
fn lunar_label_path(path: &str) -> bool {
    let last = path.rsplit('.').next().unwrap_or(path);
    matches!(
        last,
        "lunar_month"
            | "lunar_calendar"
            | "lunar_month_full"
            | "lunar_month_type"
            | "lunar_month_is_adhik"
            | "paksha"
            | "paksha_ne"
    )
}

/// Largest drift (seconds) of a printed time of day or instant.
const SECONDS_TOLERANCE: f64 = 2.5;
/// Largest drift (seconds) of an `HH:MM` display: a second across a minute edge.
const MINUTE_TOLERANCE: f64 = 61.0;
/// Largest drift of a float derived from a time (ghati, hours, degrees at sunrise).
const FLOAT_TOLERANCE: f64 = 0.011;
/// The civil timeline reads ghati clocks at pala resolution (0.4 minute), so a second
/// of drift across a pala edge moves its minute values by one pala.
const PALA_MINUTES: f64 = 0.41;

fn float_tolerance(path: &str) -> f64 {
    if path.contains("civil_timeline") {
        PALA_MINUTES
    } else {
        FLOAT_TOLERANCE
    }
}

/// Largest drift (days) of a Julian Day printed as text.
const JD_TEXT_TOLERANCE: f64 = 3e-5;

/// `None` when `rust` is the same API answer as `python`, else the first difference.
pub(crate) fn difference(rust: &str, python: &str) -> Option<String> {
    if rust == python {
        return None;
    }
    match (
        serde_json::from_str::<Value>(rust),
        serde_json::from_str::<Value>(python),
    ) {
        (Ok(a), Ok(b)) => value_difference("$", &a, &b),
        _ if text_close(rust, python) => None,
        _ => Some("text differs".into()),
    }
}

/// The first difference between two JSON values, beyond the allowed drift.
pub(crate) fn value_difference(path: &str, rust: &Value, python: &Value) -> Option<String> {
    if path == "$" || path.is_empty() {
        JULIAN_PAYLOAD.with(|c| c.set(julian_payload(python)));
    } else if JULIAN_PAYLOAD.with(Cell::get) && lunar_label_path(path) {
        return None;
    }
    match (rust, python) {
        (Value::Object(a), Value::Object(b)) => {
            let (ka, kb): (Vec<_>, Vec<_>) = (a.keys().collect(), b.keys().collect());
            if ka != kb {
                return Some(format!("{path}: keys {ka:?} vs {kb:?}"));
            }
            a.iter()
                .find_map(|(k, v)| value_difference(&format!("{path}.{k}"), v, &b[k]))
        }
        // The Python server skipped a sign's navamsha crossings at random (its span
        // end sat a hair past the next sign, so the span's degree range was empty
        // or whole depending on sub-second jitter). Rust lists every crossing; the
        // lists may differ, their items must have the same shape.
        (Value::Array(a), Value::Array(b)) if path.ends_with("pushkara_navamsha") => {
            let keys = |v: &Value| v.as_object().map(|o| o.keys().cloned().collect::<Vec<_>>());
            let shape = a.first().map(keys);
            a.iter()
                .chain(b)
                .any(|item| shape.as_ref().is_some_and(|s| *s != keys(item)))
                .then(|| format!("{path}: items differ in shape"))
        }
        (Value::Array(a), Value::Array(b)) => {
            if a.len() != b.len() {
                return Some(format!("{path}: {} items vs {}", a.len(), b.len()));
            }
            a.iter()
                .zip(b)
                .enumerate()
                .find_map(|(i, (x, y))| value_difference(&format!("{path}[{i}]"), x, y))
        }
        (Value::String(a), Value::String(b)) => {
            // The last unit of a ghati clock (ghati:pala:vipala) is 0.4 s, not 1 s.
            let unit = if path.contains("ghati") {
                VIPALA_SECONDS
            } else {
                1.0
            };
            (!text_close_in(a, b, unit)).then(|| format!("{path}: {a:?} vs {b:?}"))
        }
        (Value::Number(a), Value::Number(b)) => {
            let same = match (a.as_i64(), b.as_i64()) {
                (Some(x), Some(y)) => x == y,
                _ => match (a.as_f64(), b.as_f64()) {
                    (Some(x), Some(y)) => (x - y).abs() <= float_tolerance(path),
                    _ => a == b,
                },
            };
            (!same).then(|| format!("{path}: {a} vs {b}"))
        }
        (a, b) => (a != b).then(|| format!("{path}: {a} vs {b}")),
    }
}

/// A clock reading inside a string: its digits, in seconds, and whether it had seconds.
struct Clock {
    seconds: f64,
    has_seconds: bool,
    hour_digits: usize,
}

/// Splits `s` into the text around its clock readings (`H:MM`, `HH:MM:SS`,
/// `HH:MM:SS.ffffff`, hours up to three digits) and the readings themselves.
fn split_clocks(s: &str) -> (String, Vec<Clock>) {
    let b = s.as_bytes();
    let (mut masked, mut clocks) = (String::new(), Vec::new());
    let mut i = 0;
    while i < b.len() {
        let start = i;
        let mut j = i;
        while j < b.len() && j - i < 3 && b[j].is_ascii_digit() {
            j += 1;
        }
        let hour_digits = j - i;
        let prev_is_digit = start > 0 && b[start - 1].is_ascii_digit();
        if hour_digits > 0
            && !prev_is_digit
            && j + 2 < b.len()
            && b[j] == b':'
            && b[j + 1].is_ascii_digit()
            && b[j + 2].is_ascii_digit()
        {
            let hours: f64 = s[i..j].parse().unwrap_or(0.0);
            let minutes: f64 = s[j + 1..j + 3].parse().unwrap_or(0.0);
            let mut end = j + 3;
            let mut seconds = hours * 3600.0 + minutes * 60.0;
            let mut has_seconds = false;
            if end + 2 < b.len()
                && b[end] == b':'
                && b[end + 1].is_ascii_digit()
                && b[end + 2].is_ascii_digit()
            {
                seconds += s[end + 1..end + 3].parse::<f64>().unwrap_or(0.0);
                end += 3;
                has_seconds = true;
                if end < b.len() && b[end] == b'.' {
                    let frac_end = (end + 1..b.len())
                        .find(|&k| !b[k].is_ascii_digit())
                        .unwrap_or(b.len());
                    if frac_end > end + 1 {
                        seconds += format!("0.{}", &s[end + 1..frac_end])
                            .parse()
                            .unwrap_or(0.0);
                        end = frac_end;
                    }
                }
            }
            clocks.push(Clock {
                seconds,
                has_seconds,
                hour_digits,
            });
            masked.push('\u{0}');
            i = end;
        } else {
            let ch = s[i..].chars().next().unwrap_or(' ');
            masked.push(ch);
            i += ch.len_utf8();
        }
    }
    (masked, clocks)
}

/// Seconds in one vipala, the last unit of a ghati clock.
const VIPALA_SECONDS: f64 = 0.4;

/// Whether two strings are the same text, allowing the drift of printed times.
pub(crate) fn text_close(a: &str, b: &str) -> bool {
    text_close_in(a, b, 1.0)
}

/// [`text_close`] for clocks whose "second" lasts `unit` real seconds.
fn text_close_in(a: &str, b: &str, unit: f64) -> bool {
    if a == b {
        return true;
    }
    if let (Ok(x), Ok(y)) = (a.parse::<f64>(), b.parse::<f64>()) {
        return (x - y).abs() <= JD_TEXT_TOLERANCE;
    }
    let ((ma, ca), (mb, cb)) = (split_clocks(a), split_clocks(b));
    ma == mb
        && ca.len() == cb.len()
        && ca.iter().zip(&cb).all(|(x, y)| {
            let mut d = (x.seconds - y.seconds).abs();
            if x.hour_digits == 2 && y.hour_digits == 2 {
                d = d.min(86_400.0 - d);
            }
            d * unit
                <= if x.has_seconds && y.has_seconds {
                    SECONDS_TOLERANCE
                } else {
                    MINUTE_TOLERANCE
                }
        })
}
