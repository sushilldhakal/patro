//! JSON text exactly as Python's `json.dumps(..., ensure_ascii=False)` writes it.
//!
//! The Python server answers with `json.dumps`: compact separators for cached
//! payloads, the default `", "` / `": "` when the era layer re-renders a body, and
//! Python's float `repr` (`1e-05`, `1e+16`, `5.0`). Matching it lets a Rust response be
//! compared, and cached, byte for byte.

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

/// The length [`dumps`] would write, without building the string: the era
/// layer only needs the compact size (see `respond::rendered_body`), and a
/// large payload's text is worth not allocating twice.
#[must_use]
pub fn dumps_len(value: &Value, style: Style) -> usize {
    let mut out = CountingSink(0);
    write_value(&mut out, value, style);
    out.0
}

/// What [`write_value`] writes into: a string, or a counter that only keeps
/// the length. `String` keeps its `reserve` hint; the counter ignores it.
pub(crate) trait Sink: std::fmt::Write {
    fn reserve_hint(&mut self, _additional: usize) {}
}

impl Sink for String {
    fn reserve_hint(&mut self, additional: usize) {
        self.reserve(additional);
    }
}

/// A [`Sink`] that counts bytes instead of keeping them.
struct CountingSink(usize);

impl std::fmt::Write for CountingSink {
    fn write_str(&mut self, s: &str) -> std::fmt::Result {
        self.0 += s.len();
        Ok(())
    }
}

impl Sink for CountingSink {}

fn write_value(out: &mut impl Sink, value: &Value, style: Style) {
    let (item, key) = match style {
        Style::Compact => (",", ":"),
        Style::Default => (", ", ": "),
    };
    match value {
        Value::Null => {
            let _ = out.write_str("null");
        }
        Value::Bool(b) => {
            let _ = out.write_str(if *b { "true" } else { "false" });
        }
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                let _ = write!(out, "{i}");
            } else if let Some(u) = n.as_u64() {
                let _ = write!(out, "{u}");
            } else {
                write_float(out, n.as_f64().unwrap_or(f64::NAN));
            }
        }
        Value::String(s) => write_str(out, s),
        Value::Array(items) => {
            let _ = out.write_char('[');
            for (i, v) in items.iter().enumerate() {
                if i > 0 {
                    let _ = out.write_str(item);
                }
                write_value(out, v, style);
            }
            let _ = out.write_char(']');
        }
        Value::Object(map) => {
            let _ = out.write_char('{');
            for (i, (k, v)) in map.iter().enumerate() {
                if i > 0 {
                    let _ = out.write_str(item);
                }
                write_str(out, k);
                let _ = out.write_str(key);
                write_value(out, v, style);
            }
            let _ = out.write_char('}');
        }
    }
}

/// Python's `json` string escaping with `ensure_ascii=False`.
///
/// Every character that needs escaping is ASCII, so the text is copied in runs of
/// bytes between them rather than a character at a time.
pub(crate) fn write_str(out: &mut impl Sink, s: &str) {
    out.reserve_hint(s.len() + 2);
    let _ = out.write_char('"');
    let bytes = s.as_bytes();
    let mut run = 0;
    // A plain index loop over a lookup table: most strings need no escape at all,
    // and this stays fast in unoptimized builds too (no iterator adapters).
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        if NEEDS_ESCAPE[b as usize] {
            // `i` is at an ASCII byte, so both slices end on character boundaries.
            let _ = out.write_str(&s[run..i]);
            match b {
                b'"' => {
                    let _ = out.write_str("\\\"");
                }
                b'\\' => {
                    let _ = out.write_str("\\\\");
                }
                b'\n' => {
                    let _ = out.write_str("\\n");
                }
                b'\r' => {
                    let _ = out.write_str("\\r");
                }
                b'\t' => {
                    let _ = out.write_str("\\t");
                }
                0x08 => {
                    let _ = out.write_str("\\b");
                }
                0x0c => {
                    let _ = out.write_str("\\f");
                }
                _ => {
                    let _ = write!(out, "\\u{b:04x}");
                }
            }
            run = i + 1;
        }
        i += 1;
    }
    let _ = out.write_str(&s[run..]);
    let _ = out.write_char('"');
}

/// The bytes `json.dumps(ensure_ascii=False)` escapes: control characters, `"` and `\`.
static NEEDS_ESCAPE: [bool; 256] = {
    let mut table = [false; 256];
    let mut b = 0;
    while b < 0x20 {
        table[b] = true;
        b += 1;
    }
    table[b'"' as usize] = true;
    table[b'\\' as usize] = true;
    table
};

/// Appends [`float_repr`] of `x`. Inside Python's fixed-notation range Rust's `{}`
/// prints the same shortest round-trip digits (only an integral value lacks the
/// `.0`), so the common case is written in place without the allocations of the
/// general path. Whether the printed form needs `.0` is just whether the value
/// is integral — checked here instead of by slicing the text just written, so
/// this works for a counting sink too.
pub(crate) fn write_float(out: &mut impl Sink, x: f64) {
    let magnitude = x.abs();
    if (1e-4..1e15).contains(&magnitude) {
        let _ = write!(out, "{x}");
        if x.fract() == 0.0 {
            let _ = out.write_str(".0");
        }
    } else {
        let _ = out.write_str(&float_repr(x));
    }
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

/// Python `repr()` of a `str`, as error messages quote user input
/// (single quotes unless the text has a `'` and no `"`).
#[must_use]
pub fn py_repr_str(s: &str) -> String {
    use std::fmt::Write as _;
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
            let mut fast = String::new();
            write_float(&mut fast, x);
            assert_eq!(fast, want, "write_float {x}");
        }
    }

    #[test]
    fn the_fast_float_path_matches_repr() {
        // Doubles of every magnitude, from a fixed xorshift sequence of bit patterns,
        // plus values at the edges of the fast range.
        let mut state: u64 = 0x9E37_79B9_7F4A_7C15;
        let mut values = vec![1e-4, 0.000_100_000_000_000_01, 999_999_999_999_999.9, 1e15];
        for _ in 0..200_000 {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            let x = f64::from_bits(state);
            if x.is_finite() {
                values.push(x);
                values.push(
                    x.abs().log10().fract()
                        * 10f64.powi(i32::try_from(state % 24).unwrap_or(0) - 6),
                );
            }
        }
        for x in values {
            let mut fast = String::new();
            write_float(&mut fast, x);
            assert_eq!(fast, float_repr(x), "{x:e}");
        }
    }

    #[test]
    fn separators_and_text() {
        let v = json!({"a": [1, 2.0, "नेपाल"], "b": null, "c": "q\"\\\n"});
        assert_eq!(
            dumps(&json!("a\u{1}\u{8}\u{c}\t\ré\"z"), Style::Compact),
            r#""a\u0001\b\f\t\ré\"z""#,
            "every escape, around multi-byte text"
        );
        assert_eq!(
            dumps(&v, Style::Compact),
            r#"{"a":[1,2.0,"नेपाल"],"b":null,"c":"q\"\\\n"}"#
        );
        assert_eq!(
            dumps(&v, Style::Default),
            r#"{"a": [1, 2.0, "नेपाल"], "b": null, "c": "q\"\\\n"}"#
        );
    }

    #[test]
    fn dumps_len_matches_dumps() {
        let values = [
            json!(null),
            json!(true),
            json!(-9_223_372_036_854_775_807i64),
            json!(18_446_744_073_709_551_615u64),
            json!({"a": [1, 2.0, "नेपाल"], "b": null, "c": "q\"\\\n"}),
            json!({"a\u{1}\u{8}\u{c}\t\r\"z": [5.0, 1e-5, 1e16, -0.0, 0.1, 2_461_345.5]}),
            json!([[[{"deep": {"deeper": [1.5e16, "x"]}}]]]),
        ];
        for v in values {
            for style in [Style::Compact, Style::Default] {
                assert_eq!(
                    dumps_len(&v, style),
                    dumps(&v, style).len(),
                    "{v:?} {style:?}"
                );
            }
        }
    }
}
