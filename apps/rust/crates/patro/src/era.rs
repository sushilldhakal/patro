//! The response half of `app/era_middleware.py`: era labels beside every Julian Day.

use std::sync::Arc;

use panchanga::payload::{Field, Fields};
use serde_json::{Map, Value, json};
use timescale::CivilDay;

/// Keys that hold a Julian Day; anything ending in `_jd` too.
const JD_KEYS: [&str; 5] = ["jd_ut", "julian", "julian_start", "julian_end", "jd"];

/// `from_jd(jd)`: the Gregorian (`ad`/`bc`) and Vikram (`bs`/`bbs`) labels of a day,
/// every year positive with the era carrying the sign. `None` when the day is off
/// the patro axis (Python's `from_jd` raises, and the label is left out).
struct EraLabels {
    civil: CivilDay,
    gregorian: (&'static str, i32),
    vikram: (&'static str, i32, u32, u32),
}

fn from_jd(jd: f64) -> Option<EraLabels> {
    let civil = CivilDay::from_jd_ut(jd);
    let gregorian = if civil.year >= 1 {
        ("ad", civil.year)
    } else {
        ("bc", 1 - civil.year)
    };
    let bs = calendar::locate_patro_day(civil).ok()?;
    let vikram = if bs.year >= 1 {
        ("bs", bs.year, bs.month, bs.day)
    } else {
        ("bbs", -bs.year, bs.month, bs.day)
    };
    Some(EraLabels {
        civil,
        gregorian,
        vikram,
    })
}

/// `from_jd(jd).label_for(era)`.
fn label_for(jd: f64, era: &str) -> Option<String> {
    let labels = from_jd(jd)?;
    if matches!(era, "ad" | "bc") {
        let (code, year) = labels.gregorian;
        let day = labels.civil;
        return Some(if code == "bc" {
            format!("{year} BC")
        } else {
            format!("{year:04}-{:02}-{:02}", day.month, day.day)
        });
    }
    let (_, year, month, day) = labels.vikram;
    Some(format!("{year}-{month:02}-{day:02}"))
}

fn is_jd_key(key: &str) -> bool {
    JD_KEYS.contains(&key) || key.ends_with("_jd")
}

fn date_parts(jd: f64, era: &str) -> Option<Value> {
    let labels = from_jd(jd)?;
    let day = labels.civil;
    let (v_era, v_year, v_month, v_day) = labels.vikram;
    let (g_era, g_year) = labels.gregorian;
    let vikram = json!({"era": v_era, "year": v_year, "month": v_month, "day": v_day});
    let gregorian = json!({"era": g_era, "year": g_year, "month": day.month, "day": day.day});
    let shown = if matches!(era, "ad" | "bc") {
        &gregorian
    } else {
        &vikram
    };
    let mut m = Map::new();
    m.insert("jd".into(), json!(day.to_jd_ut()));
    for k in ["era", "year", "month", "day"] {
        m.insert(k.into(), shown[k].clone());
    }
    m.insert("vikram".into(), vikram);
    m.insert("gregorian".into(), gregorian);
    Some(Value::Object(m))
}

/// Whether a node is the payload itself (which gets `date_parts`) or nested in it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Level {
    Top,
    Nested,
}

fn render(node: &Value, era: &str, level: Level) -> Value {
    let top = level == Level::Top;
    match node {
        Value::Object(map) => {
            let mut out = Map::new();
            for (key, value) in map {
                out.insert(key.clone(), render(value, era, Level::Nested));
                let Some(jd) = value
                    .as_f64()
                    .filter(|_| is_jd_key(key) && value.is_number())
                else {
                    continue;
                };
                let label_key = if matches!(key.as_str(), "jd_ut" | "julian" | "jd") {
                    "date".to_owned()
                } else {
                    format!("{key}_date")
                };
                if !map.contains_key(&label_key) {
                    if let Some(label) = label_for(jd, era) {
                        out.insert(label_key, json!(label));
                    }
                }
                if top
                    && matches!(key.as_str(), "jd_ut" | "julian" | "jd")
                    && !map.contains_key("date_parts")
                {
                    if let Some(parts) = date_parts(jd, era) {
                        out.insert("date_parts".into(), parts);
                    }
                }
            }
            Value::Object(out)
        }
        Value::Array(items) => Value::Array(
            items
                .iter()
                .map(|v| render(v, era, Level::Nested))
                .collect(),
        ),
        other => other.clone(),
    }
}

fn align(node: &mut Value) {
    match node {
        Value::Object(map) => {
            if let Some(parts) = map.get("date_parts").cloned() {
                let v = &parts["vikram"];
                if let (Some(y), Some(m), Some(d)) =
                    (v["year"].as_i64(), v["month"].as_i64(), v["day"].as_i64())
                {
                    map.insert("date_bs".into(), json!(format!("{y}-{m:02}-{d:02}")));
                    if let Some(Value::Object(bs)) = map.get_mut("bs_date") {
                        bs.insert("year".into(), json!(y));
                        bs.insert("month".into(), json!(m));
                        bs.insert("day".into(), json!(d));
                    }
                    if let Some(Value::Object(detail)) = map.get_mut("detail") {
                        if let Some(Value::Object(bs)) = detail.get_mut("bs_date") {
                            bs.insert("year".into(), json!(y));
                            bs.insert("month".into(), json!(m));
                            bs.insert("day".into(), json!(d));
                        }
                    }
                }
                let g = &parts["gregorian"];
                if let (Some(y), Some(m), Some(d)) =
                    (g["year"].as_i64(), g["month"].as_i64(), g["day"].as_i64())
                {
                    let ad = format!("{y}-{m:02}-{d:02}");
                    map.insert("date_ad".into(), json!(&ad));
                    if let Some(Value::Object(detail)) = map.get_mut("detail") {
                        detail.insert("date_ad".into(), json!(&ad));
                        detail.insert("date".into(), json!(ad));
                    }
                }
            }
            for v in map.values_mut() {
                align(v);
            }
        }
        Value::Array(items) => items.iter_mut().for_each(align),
        _ => {}
    }
}

/// The rendered body for a request that named `era` (and maybe `language`).
#[must_use]
pub fn render_for_era(payload: &Value, era: &str, language: &str) -> Value {
    let mut out = render(payload, era, Level::Top);
    align(&mut out);
    if let Value::Object(map) = &mut out {
        map.entry("era").or_insert_with(|| json!(era));
        map.entry("language").or_insert_with(|| json!(language));
    }
    out
}

/// [`render_for_era`] for a part of a payload below its top level (a month of a year),
/// so a large payload can be rendered and written one part at a time: the same labels
/// and alignment, without the top-level `date_parts`, `era` and `language`.
#[must_use]
pub fn render_part(part: &Value, era: &str) -> Value {
    let mut out = render(part, era, Level::Nested);
    align(&mut out);
    out
}

/// [`render_for_era`] over typed fields: the same bytes, without first building the
/// whole payload as one tree. Nested payloads and lists stay [`Fields`]; each leaf
/// tree or typed block is rendered on its own.
#[must_use]
pub fn render_fields_for_era(payload: &Fields, era: &str, language: &str) -> Fields {
    let mut out = render_fields(payload, era, Level::Top);
    align_fields(&mut out);
    if !out.contains("era") {
        out.insert_tree("era", json!(era));
    }
    if !out.contains("language") {
        out.insert_tree("language", json!(language));
    }
    out
}

/// [`render_part`] over typed fields.
#[must_use]
pub fn render_fields_part(part: &Fields, era: &str) -> Fields {
    let mut out = render_fields(part, era, Level::Nested);
    align_fields(&mut out);
    out
}

/// Whether rendering (or aligning) can change a tree: only objects with a Julian Day
/// key or `date_parts` are touched. Anything else stays shared, as it is.
fn tree_needs_render(node: &Value) -> bool {
    match node {
        Value::Object(map) => map
            .iter()
            .any(|(k, v)| is_jd_key(k) || k == "date_parts" || tree_needs_render(v)),
        Value::Array(items) => items.iter().any(tree_needs_render),
        _ => false,
    }
}

/// [`tree_needs_render`] for a typed block, walked through serde without writing it.
fn block_needs_render(block: &dyn panchanga::payload::Block) -> bool {
    block.any_key(&|k| is_jd_key(k) || k == "date_parts")
}

fn render_field(field: &Field, era: &str) -> Field {
    match field {
        Field::Tree(v) if !tree_needs_render(v) => Field::Tree(Arc::clone(v)),
        Field::Tree(v) => Field::tree(render(v, era, Level::Nested)),
        Field::Typed(b) if !block_needs_render(&**b) => Field::Typed(Arc::clone(b)),
        Field::Typed(b) => Field::tree(render(&b.value(), era, Level::Nested)),
        Field::Nested(f) => Field::Nested(Arc::new(render_fields(f, era, Level::Nested))),
        Field::List(rows) => Field::List(
            rows.iter()
                .map(|row| render_fields(row, era, Level::Nested))
                .collect(),
        ),
    }
}

/// [`render`] of an object held as fields.
fn render_fields(fields: &Fields, era: &str, level: Level) -> Fields {
    let top = level == Level::Top;
    let mut out = Fields::new();
    for (key, field) in fields.iter() {
        out.insert(key.to_owned(), render_field(field, era));
        let jd = match field {
            Field::Tree(v) if v.is_number() && is_jd_key(key) => v.as_f64(),
            _ => None,
        };
        let Some(jd) = jd else {
            continue;
        };
        let label_key = if matches!(key, "jd_ut" | "julian" | "jd") {
            "date".to_owned()
        } else {
            format!("{key}_date")
        };
        if !fields.contains(&label_key) {
            if let Some(label) = label_for(jd, era) {
                out.insert_tree(label_key, json!(label));
            }
        }
        if top && matches!(key, "jd_ut" | "julian" | "jd") && !fields.contains("date_parts") {
            if let Some(parts) = date_parts(jd, era) {
                out.insert_tree("date_parts", parts);
            }
        }
    }
    out
}

/// Sets `key` on a field that is an object (a tree, a typed block or nested fields);
/// anything else is left alone, as `isinstance(x, dict)` checks it.
fn set_key(field: &mut Field, key: &str, value: Value) {
    if let Field::Typed(b) = field {
        let tree = b.value();
        if !tree.is_object() {
            return;
        }
        *field = Field::tree(tree);
    }
    match field {
        Field::Tree(v) => {
            if let Value::Object(map) = Arc::make_mut(v) {
                map.insert(key.to_owned(), value);
            }
        }
        Field::Nested(f) => Arc::make_mut(f).insert_tree(key.to_owned(), value),
        Field::Typed(_) | Field::List(_) => {}
    }
}

/// Runs `change` on the object at `key` inside an object field, if both are objects.
fn with_child(field: &mut Field, key: &str, change: impl FnOnce(&mut Field)) {
    if let Field::Typed(b) = field {
        let tree = b.value();
        if !tree.is_object() {
            return;
        }
        *field = Field::tree(tree);
    }
    match field {
        Field::Tree(v) => {
            if let Value::Object(map) = Arc::make_mut(v) {
                if let Some(child) = map.get(key).filter(|c| c.is_object()).cloned() {
                    let mut child = Field::tree(child);
                    change(&mut child);
                    map.insert(key.to_owned(), child.value());
                }
            }
        }
        Field::Nested(f) => {
            if let Some(child) = Arc::make_mut(f).field_mut(key) {
                change(child);
            }
        }
        Field::Typed(_) | Field::List(_) => {}
    }
}

/// [`align`] of an object held as fields.
fn align_fields(fields: &mut Fields) {
    if let Some(parts) = fields.get("date_parts").map(std::borrow::Cow::into_owned) {
        let v = &parts["vikram"];
        if let (Some(y), Some(m), Some(d)) =
            (v["year"].as_i64(), v["month"].as_i64(), v["day"].as_i64())
        {
            fields.insert_tree("date_bs", json!(format!("{y}-{m:02}-{d:02}")));
            let set_ymd = |f: &mut Field| {
                set_key(f, "year", json!(y));
                set_key(f, "month", json!(m));
                set_key(f, "day", json!(d));
            };
            if let Some(bs) = fields.field_mut("bs_date") {
                set_ymd(bs);
            }
            if let Some(detail) = fields.field_mut("detail") {
                with_child(detail, "bs_date", set_ymd);
            }
        }
        let g = &parts["gregorian"];
        if let (Some(y), Some(m), Some(d)) =
            (g["year"].as_i64(), g["month"].as_i64(), g["day"].as_i64())
        {
            let ad = format!("{y}-{m:02}-{d:02}");
            fields.insert_tree("date_ad", json!(&ad));
            if let Some(detail) = fields.field_mut("detail") {
                set_key(detail, "date_ad", json!(&ad));
                set_key(detail, "date", json!(ad));
            }
        }
    }
    for (_, field) in fields.iter_mut() {
        align_field(field);
    }
}

fn align_field(field: &mut Field) {
    match field {
        // Only an object with `date_parts` changes; shared trees without one stay shared.
        Field::Tree(v) => {
            if tree_needs_render(v) {
                align(Arc::make_mut(v));
            }
        }
        // Rendering keeps a typed block only when it has no Julian Day key and no
        // `date_parts`, so aligning cannot change it.
        Field::Typed(_) => {}
        Field::Nested(f) => align_fields(Arc::make_mut(f)),
        Field::List(rows) => {
            if let Some(unique) = Arc::get_mut(rows) {
                unique.iter_mut().for_each(align_fields);
            } else {
                let mut owned = rows.to_vec();
                owned.iter_mut().for_each(align_fields);
                *rows = owned.into();
            }
        }
    }
}

/// `era_language`: Nepali for the Vikram eras, English for the Gregorian.
#[must_use]
pub fn era_language(era: &str) -> &'static str {
    if matches!(era, "bs" | "bbs") {
        "ne"
    } else {
        "en"
    }
}
