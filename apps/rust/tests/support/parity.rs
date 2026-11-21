//! API-contract parity with the production server's recorded responses.
//!
//! The Rust server must answer with the same shape as Python: the same keys in the
//! same order, the same types, the same lists, strings and integers. What it is free
//! to do is compute better. Times come from the event engine, which solves each
//! boundary instead of bisecting to a second, so a printed time may differ from the
//! recording by a second or two, a `HH:MM` display by a minute at a rounding edge,
//! and a float derived from a time by a hair. Nothing else may differ.

use serde_json::Value;

/// Largest drift (seconds) of a printed time of day or instant.
const SECONDS_TOLERANCE: f64 = 2.5;
/// Largest drift (seconds) of an `HH:MM` display: a second across a minute edge.
const MINUTE_TOLERANCE: f64 = 61.0;
/// Largest drift of a float derived from a time (ghati, hours, degrees at sunrise).
const FLOAT_TOLERANCE: f64 = 0.011;
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
    match (rust, python) {
        (Value::Object(a), Value::Object(b)) => {
            let (ka, kb): (Vec<_>, Vec<_>) = (a.keys().collect(), b.keys().collect());
            if ka != kb {
                return Some(format!("{path}: keys {ka:?} vs {kb:?}"));
            }
            a.iter()
                .find_map(|(k, v)| value_difference(&format!("{path}.{k}"), v, &b[k]))
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
                    (Some(x), Some(y)) => (x - y).abs() <= FLOAT_TOLERANCE,
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
