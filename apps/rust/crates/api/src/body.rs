//! JSON request bodies read the way `FastAPI` + pydantic v2 read them: the same
//! content-type rule, Python's `json` error messages and positions, lax coercion
//! (`"3"` and `true` are ints, `"1_0"` is 10) and the same 422 items in the same
//! order.

use axum::http::{HeaderMap, header};
use serde_json::{Map, Value, json};

/// A field's type and constraints.
#[derive(Debug, Clone, Copy)]
pub(crate) enum Kind {
    /// `float` with `gt` / `ge` / `lt` / `le` as (value, how the message prints it).
    Float(Bounds),
    /// `int` with `ge` / `le`.
    Int { ge: Option<i64>, le: Option<i64> },
    /// `str | None`.
    OptStr,
    /// `Literal[...]`.
    Lit(&'static [&'static str]),
    /// `list[str]`.
    ListStr,
    /// `dict[str, Literal[...]]`.
    DictLit(&'static [&'static str]),
    /// A nested model.
    Model(&'static [Field]),
    /// `str` with `min_length` / `max_length`.
    Str { min: usize, max: Option<usize> },
    /// `str | None` with `min_length` / `max_length`.
    OptStrLen { min: usize, max: Option<usize> },
    /// `bool`.
    Bool,
    /// `bool | None`.
    OptBool,
    /// `EmailStr` (the normalized address comes back).
    Email,
    /// `EmailStr | None`.
    OptEmail,
    /// `float | None` with bounds.
    OptFloat(Bounds),
    /// `list[int]` with an optional `max_length`.
    ListInt { max_items: Option<usize> },
    /// `list[str]` with an optional `max_length`.
    ListStrMax { max_items: Option<usize> },
    /// `datetime`: the input comes back unchanged; read it with `accounts::pydt`.
    DateTime,
    /// `datetime | None`.
    OptDateTime,
    /// A 36-character random (version 4) UUID, canonicalized (`InstallReport`).
    Uuid4,
}

/// Float bounds: (constraint, its spelling in the message).
#[derive(Debug, Clone, Copy, Default)]
pub(crate) struct Bounds {
    pub(crate) gt: Option<(f64, &'static str)>,
    pub(crate) ge: Option<(f64, &'static str)>,
    pub(crate) lt: Option<(f64, &'static str)>,
    pub(crate) le: Option<(f64, &'static str)>,
}

/// A model field: name, type, and its default (`None` = required).
#[derive(Debug, Clone, Copy)]
pub(crate) struct Field {
    pub(crate) name: &'static str,
    pub(crate) kind: Kind,
    pub(crate) default: Option<&'static str>,
}

/// What reading the body gave: a value to validate, or the response-level failure.
pub(crate) enum Raw {
    /// The parsed JSON (or the raw text when the body is not JSON).
    Value(Value),
    /// No body at all.
    Missing,
    /// `json_invalid`: Python's message and character position.
    Invalid(String, usize),
    /// Not UTF-8 / not representable: `FastAPI`'s 400 or an internal error.
    Unreadable,
    /// Valid Python JSON serde cannot hold (`NaN`, `Infinity`, huge numbers).
    NonFinite,
}

fn is_json_content_type(headers: &HeaderMap) -> Option<bool> {
    let ct = headers.get(header::CONTENT_TYPE)?.to_str().ok()?;
    let main = ct.split(';').next().unwrap_or("").trim().to_lowercase();
    let (maintype, subtype) = main.split_once('/').unwrap_or((main.as_str(), ""));
    Some(maintype == "application" && (subtype == "json" || subtype.ends_with("+json")))
}

/// Reads the body as `FastAPI` does.
pub(crate) fn read(headers: &HeaderMap, bytes: &[u8]) -> Raw {
    if bytes.is_empty() {
        return Raw::Missing;
    }
    let Ok(text) = std::str::from_utf8(bytes) else {
        return Raw::Unreadable;
    };
    if is_json_content_type(headers) != Some(true) {
        return Raw::Value(Value::String(text.to_owned()));
    }
    if let Err((msg, pos)) = check_python_json(text) {
        return Raw::Invalid(msg, pos);
    }
    match serde_json::from_str::<Value>(text) {
        Ok(v) => Raw::Value(v),
        Err(_) => Raw::NonFinite,
    }
}

// ── Python's json scanner, errors only ─────────────────────────────────────────

struct Scan<'a> {
    s: &'a [char],
}

type ScanResult = Result<usize, (String, usize)>;

fn err(msg: &str, pos: usize) -> (String, usize) {
    (msg.to_owned(), pos)
}

impl Scan<'_> {
    fn ws(&self, mut i: usize) -> usize {
        while i < self.s.len() && matches!(self.s[i], ' ' | '\t' | '\n' | '\r') {
            i += 1;
        }
        i
    }

    fn starts(&self, i: usize, lit: &str) -> bool {
        let n = lit.chars().count();
        i + n <= self.s.len() && self.s[i..i + n].iter().copied().eq(lit.chars())
    }

    fn value(&self, i: usize) -> ScanResult {
        let Some(&c) = self.s.get(i) else {
            return Err(err("Expecting value", i));
        };
        match c {
            '"' => self.string(i),
            '{' => self.object(i + 1),
            '[' => self.array(i + 1),
            'n' if self.starts(i, "null") => Ok(i + 4),
            't' if self.starts(i, "true") => Ok(i + 4),
            'f' if self.starts(i, "false") => Ok(i + 5),
            'N' if self.starts(i, "NaN") => Ok(i + 3),
            'I' if self.starts(i, "Infinity") => Ok(i + 8),
            '-' if self.starts(i, "-Infinity") => Ok(i + 9),
            _ => self.number(i).ok_or_else(|| err("Expecting value", i)),
        }
    }

    fn digits(&self, mut i: usize) -> usize {
        while i < self.s.len() && self.s[i].is_ascii_digit() {
            i += 1;
        }
        i
    }

    fn number(&self, start: usize) -> Option<usize> {
        let mut i = start;
        if self.s.get(i) == Some(&'-') {
            i += 1;
        }
        match self.s.get(i) {
            Some('0') => i += 1,
            Some(c) if c.is_ascii_digit() => i = self.digits(i),
            _ => return None,
        }
        if self.s.get(i) == Some(&'.') && self.s.get(i + 1).is_some_and(char::is_ascii_digit) {
            i = self.digits(i + 1);
        }
        if matches!(self.s.get(i), Some('e' | 'E')) {
            let mut j = i + 1;
            if matches!(self.s.get(j), Some('+' | '-')) {
                j += 1;
            }
            if self.s.get(j).is_some_and(char::is_ascii_digit) {
                i = self.digits(j);
            }
        }
        Some(i)
    }

    fn string(&self, start: usize) -> ScanResult {
        let mut i = start + 1;
        loop {
            let Some(&c) = self.s.get(i) else {
                return Err(err("Unterminated string starting at", start));
            };
            match c {
                '"' => return Ok(i + 1),
                '\\' => {
                    let Some(&e) = self.s.get(i + 1) else {
                        return Err(err("Unterminated string starting at", start));
                    };
                    match e {
                        '"' | '\\' | '/' | 'b' | 'f' | 'n' | 'r' | 't' => i += 2,
                        'u' => {
                            let hex = self.s.get(i + 2..i + 6);
                            if !hex.is_some_and(|h| h.iter().all(char::is_ascii_hexdigit)) {
                                return Err(err("Invalid \\uXXXX escape", i + 1));
                            }
                            i += 6;
                        }
                        _ => return Err(err("Invalid \\escape", i)),
                    }
                }
                c if (c as u32) < 0x20 => return Err(err("Invalid control character at", i)),
                _ => i += 1,
            }
        }
    }

    fn object(&self, mut i: usize) -> ScanResult {
        i = self.ws(i);
        match self.s.get(i) {
            Some('}') => return Ok(i + 1),
            Some('"') => {}
            _ => return Err(err("Expecting property name enclosed in double quotes", i)),
        }
        loop {
            i = self.string(i)?;
            i = self.ws(i);
            if self.s.get(i) != Some(&':') {
                return Err(err("Expecting ':' delimiter", i));
            }
            i = self.ws(i + 1);
            i = self.value(i)?;
            i = self.ws(i);
            match self.s.get(i) {
                Some('}') => return Ok(i + 1),
                Some(',') => {}
                _ => return Err(err("Expecting ',' delimiter", i)),
            }
            i = self.ws(i + 1);
            if self.s.get(i) != Some(&'"') {
                return Err(err("Expecting property name enclosed in double quotes", i));
            }
        }
    }

    fn array(&self, mut i: usize) -> ScanResult {
        i = self.ws(i);
        if self.s.get(i) == Some(&']') {
            return Ok(i + 1);
        }
        loop {
            i = self.value(i)?;
            i = self.ws(i);
            match self.s.get(i) {
                Some(']') => return Ok(i + 1),
                Some(',') => {}
                _ => return Err(err("Expecting ',' delimiter", i)),
            }
            i = self.ws(i + 1);
        }
    }
}

/// `json.loads(text)` without building anything: Python's error, if any.
fn check_python_json(text: &str) -> Result<(), (String, usize)> {
    let chars: Vec<char> = text.chars().collect();
    let scan = Scan { s: &chars };
    let start = scan.ws(0);
    let end = scan.value(start)?;
    let end = scan.ws(end);
    if end != chars.len() {
        return Err(err("Extra data", end));
    }
    Ok(())
}

// ── pydantic lax validation ──────────────────────────────────────────────────

fn error(kind: &str, loc: &[Value], msg: &str, input: &Value, ctx: Option<Value>) -> Value {
    let mut m = Map::new();
    m.insert("type".into(), json!(kind));
    m.insert("loc".into(), Value::Array(loc.to_vec()));
    m.insert("msg".into(), json!(msg));
    m.insert("input".into(), input.clone());
    if let Some(ctx) = ctx {
        m.insert("ctx".into(), ctx);
    }
    Value::Object(m)
}

fn literal_expected(options: &[&str]) -> String {
    let quoted: Vec<String> = options.iter().map(|o| format!("'{o}'")).collect();
    match quoted.split_last() {
        Some((last, rest)) if !rest.is_empty() => format!("{} or {last}", rest.join(", ")),
        Some((last, _)) => last.clone(),
        None => String::new(),
    }
}

/// Python `float(str)`: whitespace, single underscores between digits, inf/nan.
pub(crate) fn parse_py_float(s: &str) -> Option<f64> {
    let t = s.trim();
    let chars: Vec<char> = t.chars().collect();
    let mut cleaned = String::with_capacity(t.len());
    for (i, c) in chars.iter().enumerate() {
        if *c == '_' {
            let ok = i > 0
                && chars[i - 1].is_ascii_digit()
                && chars.get(i + 1).is_some_and(char::is_ascii_digit);
            if !ok {
                return None;
            }
            continue;
        }
        cleaned.push(*c);
    }
    if cleaned.is_empty() || !cleaned.is_ascii() {
        return None;
    }
    cleaned.parse::<f64>().ok()
}

/// pydantic's `int` from a string: optional sign, digits with single underscores,
/// an optional all-zero fraction.
pub(crate) fn parse_py_int(s: &str) -> Option<i64> {
    let t = s.trim();
    let (sign, rest) = match t.strip_prefix('-') {
        Some(r) => (-1, r),
        None => (1, t.strip_prefix('+').unwrap_or(t)),
    };
    let (int_part, frac) = rest.split_once('.').unwrap_or((rest, ""));
    if !frac.chars().all(|c| c == '0') {
        return None;
    }
    let chars: Vec<char> = int_part.chars().collect();
    if chars.is_empty() || !chars[0].is_ascii_digit() || !chars[chars.len() - 1].is_ascii_digit() {
        return None;
    }
    let mut digits = String::new();
    for (i, c) in chars.iter().enumerate() {
        if *c == '_' {
            if !chars[i - 1].is_ascii_digit() || !chars[i + 1].is_ascii_digit() {
                return None;
            }
        } else if c.is_ascii_digit() {
            digits.push(*c);
        } else {
            return None;
        }
    }
    digits.parse::<i64>().ok().map(|v| sign * v)
}

/// One float bound: (constraint, error type, message words, passes).
type Check = (
    Option<(f64, &'static str)>,
    &'static str,
    &'static str,
    fn(f64, f64) -> bool,
);

fn validate_float(v: &Value, b: Bounds, loc: &[Value], errors: &mut Vec<Value>) -> Option<Value> {
    let x = match v {
        Value::Number(n) => n.as_f64(),
        Value::Bool(t) => Some(if *t { 1.0 } else { 0.0 }),
        Value::String(s) => {
            let parsed = parse_py_float(s);
            if parsed.is_none() {
                errors.push(error(
                    "float_parsing",
                    loc,
                    "Input should be a valid number, unable to parse string as a number",
                    v,
                    None,
                ));
                return None;
            }
            parsed
        }
        _ => None,
    };
    let Some(x) = x else {
        errors.push(error(
            "float_type",
            loc,
            "Input should be a valid number",
            v,
            None,
        ));
        return None;
    };
    let checks: [Check; 4] = [
        (b.gt, "greater_than", "greater than", |x, c| x > c),
        (
            b.ge,
            "greater_than_equal",
            "greater than or equal to",
            |x, c| x >= c,
        ),
        (b.lt, "less_than", "less than", |x, c| x < c),
        (b.le, "less_than_equal", "less than or equal to", |x, c| {
            x <= c
        }),
    ];
    for (bound, kind, words, ok) in checks {
        if let Some((c, spelled)) = bound
            && !ok(x, c)
        {
            let key = match kind {
                "greater_than" => "gt",
                "greater_than_equal" => "ge",
                "less_than" => "lt",
                _ => "le",
            };
            errors.push(error(
                kind,
                loc,
                &format!("Input should be {words} {spelled}"),
                v,
                Some(json!({ key: c })),
            ));
            return None;
        }
    }
    Some(json!(x))
}

fn validate_int(
    v: &Value,
    ge: Option<i64>,
    le: Option<i64>,
    loc: &[Value],
    errors: &mut Vec<Value>,
) -> Option<Value> {
    let x = match v {
        Value::Bool(t) => i64::from(*t),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                i
            } else {
                let f = n.as_f64().unwrap_or(f64::NAN);
                if f.fract() != 0.0 {
                    errors.push(error(
                        "int_from_float",
                        loc,
                        "Input should be a valid integer, got a number with a fractional part",
                        v,
                        None,
                    ));
                    return None;
                }
                if f.abs() >= 9.223_372_036_854_775e18 {
                    errors.push(error(
                        "int_parsing_size",
                        loc,
                        "Unable to parse input string as an integer, exceeded maximum size",
                        v,
                        None,
                    ));
                    return None;
                }
                #[expect(
                    clippy::cast_possible_truncation,
                    reason = "an integral float inside i64's range"
                )]
                let i = f as i64;
                i
            }
        }
        Value::String(s) => {
            if let Some(i) = parse_py_int(s) {
                i
            } else {
                errors.push(error(
                    "int_parsing",
                    loc,
                    "Input should be a valid integer, unable to parse string as an integer",
                    v,
                    None,
                ));
                return None;
            }
        }
        _ => {
            errors.push(error(
                "int_type",
                loc,
                "Input should be a valid integer",
                v,
                None,
            ));
            return None;
        }
    };
    if let Some(c) = ge
        && x < c
    {
        errors.push(error(
            "greater_than_equal",
            loc,
            &format!("Input should be greater than or equal to {c}"),
            v,
            Some(json!({"ge": c})),
        ));
        return None;
    }
    if let Some(c) = le
        && x > c
    {
        errors.push(error(
            "less_than_equal",
            loc,
            &format!("Input should be less than or equal to {c}"),
            v,
            Some(json!({"le": c})),
        ));
        return None;
    }
    Some(json!(x))
}

fn validate_lit(
    v: &Value,
    options: &[&str],
    loc: &[Value],
    errors: &mut Vec<Value>,
) -> Option<Value> {
    if let Value::String(s) = v
        && options.contains(&s.as_str())
    {
        return Some(v.clone());
    }
    let expected = literal_expected(options);
    errors.push(error(
        "literal_error",
        loc,
        &format!("Input should be {expected}"),
        v,
        Some(json!({ "expected": expected })),
    ));
    None
}

fn string_type(v: &Value, loc: &[Value], errors: &mut Vec<Value>) -> Option<Value> {
    if v.is_string() {
        return Some(v.clone());
    }
    errors.push(error(
        "string_type",
        loc,
        "Input should be a valid string",
        v,
        None,
    ));
    None
}

fn with(loc: &[Value], part: Value) -> Vec<Value> {
    let mut l = loc.to_vec();
    l.push(part);
    l
}

fn plural(n: usize, word: &str) -> String {
    if n == 1 {
        word.to_owned()
    } else {
        format!("{word}s")
    }
}

fn validate_str(
    v: &Value,
    min: usize,
    max: Option<usize>,
    loc: &[Value],
    errors: &mut Vec<Value>,
) -> Option<Value> {
    let Value::String(s) = v else {
        return string_type(v, loc, errors);
    };
    let n = s.chars().count();
    if n < min {
        errors.push(error(
            "string_too_short",
            loc,
            &format!(
                "String should have at least {min} {}",
                plural(min, "character")
            ),
            v,
            Some(json!({ "min_length": min })),
        ));
        return None;
    }
    if let Some(max) = max
        && n > max
    {
        errors.push(error(
            "string_too_long",
            loc,
            &format!(
                "String should have at most {max} {}",
                plural(max, "character")
            ),
            v,
            Some(json!({ "max_length": max })),
        ));
        return None;
    }
    Some(v.clone())
}

fn validate_bool(v: &Value, loc: &[Value], errors: &mut Vec<Value>) -> Option<Value> {
    let parsed = match v {
        Value::Bool(b) => Some(*b),
        Value::Number(n) => n.as_f64().and_then(|x| {
            if x == 0.0 {
                Some(false)
            } else if (x - 1.0).abs() < f64::EPSILON {
                Some(true)
            } else {
                None
            }
        }),
        Value::String(s) => match s.to_lowercase().as_str() {
            "0" | "off" | "f" | "false" | "n" | "no" => Some(false),
            "1" | "on" | "t" | "true" | "y" | "yes" => Some(true),
            _ => None,
        },
        _ => {
            errors.push(error(
                "bool_type",
                loc,
                "Input should be a valid boolean",
                v,
                None,
            ));
            return None;
        }
    };
    if let Some(b) = parsed {
        return Some(json!(b));
    }
    errors.push(error(
        "bool_parsing",
        loc,
        "Input should be a valid boolean, unable to interpret input",
        v,
        None,
    ));
    None
}

fn validate_email(v: &Value, loc: &[Value], errors: &mut Vec<Value>) -> Option<Value> {
    let Value::String(s) = v else {
        return string_type(v, loc, errors);
    };
    match accounts::email::validate(s) {
        Ok(normalized) => Some(json!(normalized)),
        Err(reason) => {
            errors.push(error(
                "value_error",
                loc,
                &format!("value is not a valid email address: {reason}"),
                v,
                Some(json!({ "reason": reason })),
            ));
            None
        }
    }
}

fn too_long(
    v: &Value,
    items: usize,
    max: Option<usize>,
    loc: &[Value],
    errors: &mut Vec<Value>,
) -> bool {
    match max {
        Some(max) if items > max => {
            errors.push(error(
                "too_long",
                loc,
                &format!(
                    "List should have at most {max} {} after validation, not {items}",
                    plural(max, "item")
                ),
                v,
                Some(json!({"field_type": "List", "max_length": max, "actual_length": items})),
            ));
            true
        }
        _ => false,
    }
}

fn validate_datetime(v: &Value, loc: &[Value], errors: &mut Vec<Value>) -> Option<Value> {
    match accounts::pydt::parse_value(v) {
        Ok(_) => Some(v.clone()),
        Err(accounts::pydt::DateTimeError::Type) => {
            errors.push(error(
                "datetime_type",
                loc,
                "Input should be a valid datetime",
                v,
                None,
            ));
            None
        }
        Err(accounts::pydt::DateTimeError::Parsing(why)) => {
            errors.push(error(
                "datetime_from_date_parsing",
                loc,
                &format!("Input should be a valid datetime or date, {why}"),
                v,
                Some(json!({ "error": why })),
            ));
            None
        }
    }
}

/// Python's `uuid.UUID(text)`: optional `urn:`/`uuid:` and braces, hyphens anywhere, 32 hex digits.
fn parse_uuid(text: &str) -> Option<u128> {
    let t = text.replace("urn:", "").replace("uuid:", "");
    let t = t.trim_matches(|c| c == '{' || c == '}').replace('-', "");
    if t.len() != 32 || !t.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    u128::from_str_radix(&t, 16).ok()
}

fn validate_uuid4(v: &Value, loc: &[Value], errors: &mut Vec<Value>) -> Option<Value> {
    let ok = validate_str(v, 36, Some(36), loc, errors)?;
    let text = ok.as_str().unwrap_or_default();
    let fail = |msg: &str, errors: &mut Vec<Value>| {
        errors.push(error(
            "value_error",
            loc,
            &format!("Value error, {msg}"),
            v,
            Some(json!({"error": {}})),
        ));
        None
    };
    let Some(n) = parse_uuid(text) else {
        return fail("installation_id must be a UUID", errors);
    };
    let variant_rfc = (n >> 62) & 0b11 == 0b10;
    let version = (n >> 76) & 0xF;
    if !variant_rfc || version != 4 {
        return fail("installation_id must be a random (version 4) UUID", errors);
    }
    let h = format!("{n:032x}");
    Some(json!(format!(
        "{}-{}-{}-{}-{}",
        &h[0..8],
        &h[8..12],
        &h[12..16],
        &h[16..20],
        &h[20..32]
    )))
}

/// `list[int]` / `list[str]` with an optional `max_length`, checked before the items.
fn validate_bounded_list(
    v: &Value,
    kind: Kind,
    max_items: Option<usize>,
    loc: &[Value],
    errors: &mut Vec<Value>,
) -> Option<Value> {
    let Value::Array(items) = v else {
        errors.push(error(
            "list_type",
            loc,
            "Input should be a valid list",
            v,
            None,
        ));
        return None;
    };
    if too_long(v, items.len(), max_items, loc, errors) {
        return None;
    }
    let before = errors.len();
    let out: Vec<Value> = items
        .iter()
        .enumerate()
        .filter_map(|(i, item)| {
            let at = with(loc, json!(i));
            if matches!(kind, Kind::ListInt { .. }) {
                validate_int(item, None, None, &at, errors)
            } else {
                string_type(item, &at, errors)
            }
        })
        .collect();
    (errors.len() == before).then_some(Value::Array(out))
}

/// Validates `v` against `kind`; errors go to `errors`, the coerced value comes back.
pub(crate) fn validate(
    v: &Value,
    kind: Kind,
    loc: &[Value],
    errors: &mut Vec<Value>,
) -> Option<Value> {
    match kind {
        Kind::Int { ge, le } => validate_int(v, ge, le, loc, errors),
        Kind::OptStr
        | Kind::OptStrLen { .. }
        | Kind::OptBool
        | Kind::OptEmail
        | Kind::OptFloat(_)
        | Kind::OptDateTime
            if v.is_null() =>
        {
            Some(Value::Null)
        }
        Kind::OptStr => string_type(v, loc, errors),
        Kind::Lit(options) => validate_lit(v, options, loc, errors),
        Kind::ListStr => {
            let Value::Array(items) = v else {
                errors.push(error(
                    "list_type",
                    loc,
                    "Input should be a valid list",
                    v,
                    None,
                ));
                return None;
            };
            let before = errors.len();
            let out: Vec<Value> = items
                .iter()
                .enumerate()
                .filter_map(|(i, item)| string_type(item, &with(loc, json!(i)), errors))
                .collect();
            (errors.len() == before).then_some(Value::Array(out))
        }
        Kind::DictLit(options) => {
            let Value::Object(map) = v else {
                errors.push(error(
                    "dict_type",
                    loc,
                    "Input should be a valid dictionary",
                    v,
                    None,
                ));
                return None;
            };
            let before = errors.len();
            let mut out = Map::new();
            for (k, item) in map {
                if let Some(ok) = validate_lit(item, options, &with(loc, json!(k)), errors) {
                    out.insert(k.clone(), ok);
                }
            }
            (errors.len() == before).then_some(Value::Object(out))
        }
        Kind::Str { min, max } | Kind::OptStrLen { min, max } => {
            validate_str(v, min, max, loc, errors)
        }
        Kind::Bool | Kind::OptBool => validate_bool(v, loc, errors),
        Kind::Email | Kind::OptEmail => validate_email(v, loc, errors),
        Kind::Float(b) | Kind::OptFloat(b) => validate_float(v, b, loc, errors),
        Kind::DateTime | Kind::OptDateTime => validate_datetime(v, loc, errors),
        Kind::Uuid4 => validate_uuid4(v, loc, errors),
        Kind::ListInt { max_items } | Kind::ListStrMax { max_items } => {
            validate_bounded_list(v, kind, max_items, loc, errors)
        }
        Kind::Model(fields) => {
            let Value::Object(map) = v else {
                errors.push(error(
                    "model_attributes_type",
                    loc,
                    "Input should be a valid dictionary or object to extract fields from",
                    v,
                    None,
                ));
                return None;
            };
            let before = errors.len();
            let mut out = Map::new();
            for f in fields {
                let floc = with(loc, json!(f.name));
                let got = if let Some(item) = map.get(f.name) {
                    validate(item, f.kind, &floc, errors)
                } else {
                    if f.default.is_none() {
                        errors.push(error("missing", &floc, "Field required", v, None));
                    }
                    f.default.and_then(|d| serde_json::from_str(d).ok())
                };
                if let Some(got) = got {
                    out.insert(f.name.to_owned(), got);
                }
            }
            (errors.len() == before).then_some(Value::Object(out))
        }
    }
}

/// The 422 items for a whole body, or the validated model.
pub(crate) fn validate_body(raw: Raw, model: &'static [Field]) -> Result<Value, BodyError> {
    let v = match raw {
        Raw::Missing | Raw::Value(Value::Null) => {
            return Err(BodyError::Invalid(vec![error(
                "missing",
                &[json!("body")],
                "Field required",
                &Value::Null,
                None,
            )]));
        }
        Raw::Invalid(msg, pos) => {
            return Err(BodyError::Invalid(vec![error(
                "json_invalid",
                &[json!("body"), json!(pos)],
                "JSON decode error",
                &json!({}),
                Some(json!({ "error": msg })),
            )]));
        }
        Raw::Unreadable => return Err(BodyError::Unreadable),
        Raw::NonFinite => return Err(BodyError::Internal),
        Raw::Value(v) => v,
    };
    let mut errors = Vec::new();
    match validate(&v, Kind::Model(model), &[json!("body")], &mut errors) {
        Some(out) if errors.is_empty() => Ok(out),
        _ => Err(BodyError::Invalid(errors)),
    }
}

/// Why a body was refused.
pub(crate) enum BodyError {
    /// pydantic's 422 items.
    Invalid(Vec<Value>),
    /// `FastAPI`'s 400 "There was an error parsing the body".
    Unreadable,
    /// Input Python accepts but the port cannot represent: answered as a 500.
    Internal,
}
