//! The response half of `app/era_middleware.py`: era labels beside every Julian Day.

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

/// `era_language`: Nepali for the Vikram eras, English for the Gregorian.
#[must_use]
pub fn era_language(era: &str) -> &'static str {
    if matches!(era, "bs" | "bbs") {
        "ne"
    } else {
        "en"
    }
}
