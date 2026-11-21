//! JSON text exactly as Python's `json.dumps(..., ensure_ascii=False)` writes it.
//!
//! The Python server answers with `json.dumps`: compact separators for cached
//! payloads, the default `", "` / `": "` when the era layer re-renders a body, and
//! Python's float `repr` (`1e-05`, `1e+16`, `5.0`). Matching it lets a Rust response be
//! compared, and cached, byte for byte.

use std::fmt::Write as _;

use serde_json::Value;

/// Separators between items and between a key and its value.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Style {
    /// `(",", ":")`, as the response cache writes.
    Compact,
    /// `(", ", ": ")`, `json.dumps`'s default.
    Default,
}

/// Serialize like `json.dumps(value, ensure_ascii=False, separators=…)`.
#[must_use]
pub fn dumps(value: &Value, style: Style) -> String {
    let mut out = String::with_capacity(4096);
    write_value(&mut out, value, style);
    out
}

fn write_value(out: &mut String, value: &Value, style: Style) {
    let (item, key) = match style {
        Style::Compact => (",", ":"),
        Style::Default => (", ", ": "),
    };
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                let _ = write!(out, "{i}");
            } else if let Some(u) = n.as_u64() {
                let _ = write!(out, "{u}");
            } else {
                out.push_str(&float_repr(n.as_f64().unwrap_or(f64::NAN)));
            }
        }
        Value::String(s) => write_str(out, s),
        Value::Array(items) => {
            out.push('[');
            for (i, v) in items.iter().enumerate() {
                if i > 0 {
                    out.push_str(item);
                }
                write_value(out, v, style);
            }
            out.push(']');
        }
        Value::Object(map) => {
            out.push('{');
            for (i, (k, v)) in map.iter().enumerate() {
                if i > 0 {
                    out.push_str(item);
                }
                write_str(out, k);
                out.push_str(key);
                write_value(out, v, style);
            }
            out.push('}');
        }
    }
}

/// Python's `json` string escaping with `ensure_ascii=False`.
fn write_str(out: &mut String, s: &str) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

/// Python's `repr(float)`: the shortest round-tripping digits, in fixed notation when
/// the decimal exponent is in (−4, 16], scientific (`1e-05`, `1.5e+16`) otherwise.
#[must_use]
pub fn float_repr(x: f64) -> String {
    if x.is_nan() {
        return "NaN".into();
    }
    if x.is_infinite() {
        return if x > 0.0 {
            "Infinity".into()
        } else {
            "-Infinity".into()
        };
    }
    if x == 0.0 {
        return if x.is_sign_negative() {
            "-0.0".into()
        } else {
            "0.0".into()
        };
    }
    // `{:e}` gives the shortest round-trip digits: "d.ddddde±x".
    let sci = format!("{:e}", x.abs());
    let (mantissa, exp) = sci.split_once('e').unwrap_or((&sci, "0"));
    let exp: i32 = exp.parse().unwrap_or(0);
    let digits: String = mantissa.chars().filter(char::is_ascii_digit).collect();
    let decpt = exp + 1; // value = 0.DIGITS × 10^decpt
    let sign = if x < 0.0 { "-" } else { "" };
    let n = i32::try_from(digits.len()).unwrap_or(i32::MAX);
    if decpt <= -4 || decpt > 16 {
        let (first, rest) = digits.split_at(1);
        let frac = if rest.is_empty() {
            String::new()
        } else {
            format!(".{rest}")
        };
        let e = decpt - 1;
        format!(
            "{sign}{first}{frac}e{}{:02}",
            if e < 0 { '-' } else { '+' },
            e.abs()
        )
    } else if decpt <= 0 {
        format!(
            "{sign}0.{}{digits}",
            "0".repeat(usize::try_from(-decpt).unwrap_or(0))
        )
    } else if decpt >= n {
        format!(
            "{sign}{digits}{}.0",
            "0".repeat(usize::try_from(decpt - n).unwrap_or(0))
        )
    } else {
        let (int, frac) = digits.split_at(usize::try_from(decpt).unwrap_or(0));
        format!("{sign}{int}.{frac}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn floats_follow_python_repr() {
        for (x, want) in [
            (1e-5, "1e-05"),
            (0.0001, "0.0001"),
            (1e16, "1e+16"),
            (1e15, "1000000000000000.0"),
            (5.0, "5.0"),
            (0.1, "0.1"),
            (-2.5, "-2.5"),
            (2_461_345.5, "2461345.5"),
            (123_456_789.123, "123456789.123"),
            (1.5e16, "1.5e+16"),
            (-0.0, "-0.0"),
            (2.675e-7, "2.675e-07"),
        ] {
            assert_eq!(float_repr(x), want, "{x}");
        }
    }

    #[test]
    fn separators_and_text() {
        let v = json!({"a": [1, 2.0, "नेपाल"], "b": null, "c": "q\"\\\n"});
        assert_eq!(
            dumps(&v, Style::Compact),
            r#"{"a":[1,2.0,"नेपाल"],"b":null,"c":"q\"\\\n"}"#
        );
        assert_eq!(
            dumps(&v, Style::Default),
            r#"{"a": [1, 2.0, "नेपाल"], "b": null, "c": "q\"\\\n"}"#
        );
    }
}
