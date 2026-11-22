//! Civil-day (midnight → midnight) timeline: `services/panchanga/civil_timeline.py`.
//!
//! The daily payload covers one vedic day (sunrise → next sunrise). A civil day
//! overlaps two of them, so this stitches the previous and current daily payloads
//! and re-projects every band onto minutes from local midnight (0 … 1440). No
//! astronomy is recomputed.

use panchanga::{
    daily::{DailyError, Location, build_daily},
    pyfloat::py_round,
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, UtcInstant};

const DAY_MIN: f64 = 1440.0;

/// A minute count as Python holds it: an `int` from `HH:MM`, or a float.
#[derive(Debug, Clone, Copy)]
enum Minutes {
    Int(i64),
    Float(f64),
}

impl Minutes {
    #[expect(
        clippy::cast_precision_loss,
        reason = "minutes of a day are tiny integers"
    )]
    fn as_f64(self) -> f64 {
        match self {
            Self::Int(n) => n as f64,
            Self::Float(x) => x,
        }
    }

    /// `round(x, 2)`: an `int` stays an `int`.
    fn rounded(self) -> Value {
        match self {
            Self::Int(n) => json!(n),
            Self::Float(x) => json!(py_round(x, 2)),
        }
    }
}

/// `_hhmm_to_min`: `"HH:MM"` → minutes from that day's midnight.
fn hhmm_to_min(short: Option<&str>) -> Option<Minutes> {
    let short = short.filter(|s| !s.is_empty())?;
    let parts: Vec<&str> = short.trim().split(':').collect();
    if parts.len() < 2 {
        return None;
    }
    let h: i64 = parts[0].trim().parse().ok()?;
    let m: i64 = parts[1].trim().parse().ok()?;
    Some(Minutes::Int(h * 60 + m))
}

fn short_of<'a>(payload: &'a Value, key: &str) -> Option<&'a str> {
    payload.get(key)?.get("local_time_short")?.as_str()
}

/// `_ghati_clock_to_ghati`: `"G:P:V"` → ghati.
fn ghati_clock_to_ghati(clock: Option<&str>) -> Option<f64> {
    let clock = clock.filter(|c| !c.is_empty())?;
    let parts: Vec<&str> = clock.split(':').collect();
    let gh: f64 = parts.first()?.trim().parse().ok()?;
    let pa: f64 = match parts.get(1) {
        Some(p) => p.trim().parse().ok()?,
        None => 0.0,
    };
    Some(gh + pa / 60.0)
}

/// `_clip`: clamp to `[lo, hi]`, dropping a slice that collapses. Python's
/// `max` / `min` hand back the winning object, so an `int` bound stays an `int`.
fn clip(start: f64, end: f64, lo: Minutes, hi: Minutes) -> Option<(Minutes, Minutes)> {
    let s = if start >= lo.as_f64() {
        Minutes::Float(start)
    } else {
        lo
    };
    let e = if end <= hi.as_f64() {
        Minutes::Float(end)
    } else {
        hi
    };
    (e.as_f64() - s.as_f64() > 0.05).then_some((s, e))
}

/// `_project_ghati_segments`.
fn project_ghati_segments(
    out: &mut Vec<Value>,
    segments: Option<&Value>,
    sunrise_min: f64,
    day_offset: f64,
    (lo, hi): (Minutes, Minutes),
    fields: &[&str],
) {
    for seg in segments.and_then(Value::as_array).into_iter().flatten() {
        let start_g = seg.get("start_g").and_then(Value::as_f64).unwrap_or(0.0);
        let end_g = seg.get("end_g").and_then(Value::as_f64).unwrap_or(0.0);
        let s = sunrise_min + start_g * 24.0 - day_offset;
        let e = sunrise_min + end_g * 24.0 - day_offset;
        let Some((cs, ce)) = clip(s, e, lo, hi) else {
            continue;
        };
        let mut item = Map::new();
        item.insert("start_min".into(), cs.rounded());
        item.insert("end_min".into(), ce.rounded());
        for key in fields {
            item.insert((*key).into(), seg.get(*key).cloned().unwrap_or(Value::Null));
        }
        out.push(Value::Object(item));
    }
}

fn truthy(v: Option<&Value>) -> bool {
    match v {
        None | Some(Value::Null) => false,
        Some(Value::String(s)) => !s.is_empty(),
        Some(Value::Bool(b)) => *b,
        Some(_) => true,
    }
}

type Link<'a> = (
    Option<&'a Value>,
    Option<&'a Value>,
    Option<&'a Value>,
    Option<&'a Value>,
);

/// `_anga_chain`: `(name_ne, name, start_iso, end_iso)` for the block and its `next` chain.
fn anga_chain(block: Option<&Value>) -> Vec<Link<'_>> {
    let Some(block) = block.filter(|b| truthy(Some(b))) else {
        return Vec::new();
    };
    if !truthy(block.get("name")) && !truthy(block.get("name_ne")) {
        return Vec::new();
    }
    let end = block.get("end_time");
    let mut chain = vec![(
        block.get("name_ne"),
        block.get("name"),
        block.get("start_time"),
        end,
    )];
    if let Some(nxt) = block.get("next").filter(|n| truthy(Some(n)))
        && (truthy(nxt.get("name")) || truthy(nxt.get("name_ne")))
    {
        chain.push((
            nxt.get("name_ne"),
            nxt.get("name"),
            end,
            nxt.get("end_time"),
        ));
        if let Some(third) = nxt.get("next").filter(|n| truthy(Some(n)))
            && (truthy(third.get("name")) || truthy(third.get("name_ne")))
        {
            chain.push((
                third.get("name_ne"),
                third.get("name"),
                nxt.get("end_time"),
                third.get("end_time"),
            ));
        }
    }
    chain
}

/// `_iso_to_civil_min`: minutes from the civil day's local midnight. Python subtracts
/// two datetimes in the same zone, which is wall-clock arithmetic.
#[expect(
    clippy::cast_precision_loss,
    reason = "a day's microseconds are far below 2^53"
)]
fn iso_to_civil_min(
    iso: Option<&Value>,
    location: &Location,
    midnight_wall: UtcInstant,
) -> Option<f64> {
    let text = iso.and_then(Value::as_str).filter(|s| !s.is_empty())?;
    let instant: UtcInstant = text.replace('Z', "+00:00").parse().ok()?;
    let offset = location.zone.offset_seconds_at(instant);
    let wall = instant.add_seconds(i64::from(offset));
    Some(wall.micros_since(midnight_wall) as f64 / 1_000_000.0 / 60.0)
}

/// `_row_segments`: the ordered `{name_ne, name, end_min}` anga sequence.
fn row_segments(
    prev_block: Option<&Value>,
    cur_block: Option<&Value>,
    location: &Location,
    midnight_wall: UtcInstant,
) -> Value {
    let mut intervals: Vec<(f64, f64, Value, Value)> = Vec::new();
    for chain in [anga_chain(prev_block), anga_chain(cur_block)] {
        for (name_ne, name, s_iso, e_iso) in chain {
            let s = iso_to_civil_min(s_iso, location, midnight_wall).unwrap_or(-1e9);
            let e = iso_to_civil_min(e_iso, location, midnight_wall).unwrap_or(1e9);
            if e > 0.0 && s < DAY_MIN {
                intervals.push((
                    s,
                    e,
                    name_ne.cloned().unwrap_or(Value::Null),
                    name.cloned().unwrap_or(Value::Null),
                ));
            }
        }
    }
    // `list.sort` is stable, as is `sort_by`.
    intervals.sort_by(|a, b| a.0.total_cmp(&b.0));
    let mut result: Vec<Map<String, Value>> = Vec::new();
    let mut t = 0.0;
    for (_, e, name_ne, name) in intervals {
        if e <= t + 0.05 {
            continue;
        }
        let end_min = e.min(DAY_MIN);
        match result.last_mut() {
            Some(last) if last.get("name_ne") == Some(&name_ne) => {
                last.insert("end_min".into(), json!(py_round(end_min, 2)));
            }
            _ => {
                let mut row = Map::new();
                row.insert("name_ne".into(), name_ne);
                row.insert("name".into(), name);
                row.insert("end_min".into(), json!(py_round(end_min, 2)));
                result.push(row);
            }
        }
        t = end_min;
        if t >= DAY_MIN {
            break;
        }
    }
    Value::Array(result.into_iter().map(Value::Object).collect())
}

/// `_lagna_segments`: lagna spans projected through their ghati clocks.
fn lagna_segments(
    prev_spans: Option<&Value>,
    cur_spans: Option<&Value>,
    sr_prev: Option<f64>,
    sr_cur: Minutes,
) -> Value {
    let mut out: Vec<(f64, Value)> = Vec::new();
    let mut project =
        |spans: Option<&Value>, sunrise_min: Option<f64>, offset: f64, lo: Minutes, hi: Minutes| {
            let Some(sunrise_min) = sunrise_min else {
                return;
            };
            for span in spans.and_then(Value::as_array).into_iter().flatten() {
                let gs =
                    ghati_clock_to_ghati(span.get("start_ghati_clock").and_then(Value::as_str));
                let ge = ghati_clock_to_ghati(span.get("end_ghati_clock").and_then(Value::as_str));
                let (Some(gs), Some(ge)) = (gs, ge) else {
                    continue;
                };
                let s = sunrise_min + gs * 24.0 - offset;
                let e = sunrise_min + ge * 24.0 - offset;
                let Some((cs, ce)) = clip(s, e, lo, hi) else {
                    continue;
                };
                let start = cs.rounded();
                out.push((
                    start.as_f64().unwrap_or(0.0),
                    json!({
                        "name_ne": span.get("name_ne").cloned().unwrap_or(Value::Null),
                        "name": span.get("name").cloned().unwrap_or(Value::Null),
                        "start_min": start,
                        "end_min": ce.rounded(),
                    }),
                ));
            }
        };
    let (zero, day) = (Minutes::Float(0.0), Minutes::Float(DAY_MIN));
    project(prev_spans, sr_prev, DAY_MIN, zero, sr_cur);
    project(cur_spans, Some(sr_cur.as_f64()), 0.0, sr_cur, day);
    out.sort_by(|a, b| a.0.total_cmp(&b.0));
    Value::Array(out.into_iter().map(|(_, v)| v).collect())
}

/// `clip_marker`: a moonrise/moonset inside the civil day, else `None`.
fn clip_marker(minutes: Option<Minutes>) -> Value {
    match minutes {
        Some(m) if (0.0..=DAY_MIN).contains(&m.as_f64()) => m.rounded(),
        _ => Value::Null,
    }
}

/// `build_civil_timeline(greg, location)`.
///
/// # Errors
///
/// [`DailyError`] when either day's panchanga cannot be built.
pub fn build_civil_timeline(day: CivilDay, location: &Location) -> Result<Value, DailyError> {
    let cur_daily = build_daily(day, location)?;
    let prev_daily = build_daily(day.add_days(-1), location)?;
    let (cur, prev) = (cur_daily.tree(), prev_daily.tree());
    let midnight_wall =
        UtcInstant::from_utc(day, 0, 0, 0, 0).ok_or(DailyError::BeforeGregorian(day))?;

    let sunrise_cur = hhmm_to_min(short_of(cur, "sunrise")).unwrap_or(Minutes::Float(0.0));
    let sunset_cur = hhmm_to_min(short_of(cur, "sunset"));
    let sunrise_prev = hhmm_to_min(short_of(prev, "sunrise")).map(Minutes::as_f64);
    let sunrise_min = sunrise_cur.as_f64();

    let mut choghadiya = Vec::new();
    let cho_fields = ["name_ne", "bad"];
    project_ghati_segments(
        &mut choghadiya,
        prev.get("choghadiya"),
        sunrise_prev.unwrap_or(0.0),
        DAY_MIN,
        (Minutes::Float(0.0), sunrise_cur),
        &cho_fields,
    );
    project_ghati_segments(
        &mut choghadiya,
        cur.get("choghadiya"),
        sunrise_min,
        0.0,
        (sunrise_cur, Minutes::Float(DAY_MIN)),
        &cho_fields,
    );

    let mut hora = Vec::new();
    let hora_fields = ["planet_ne", "planet_en", "bad"];
    project_ghati_segments(
        &mut hora,
        prev.get("hora"),
        sunrise_prev.unwrap_or(0.0),
        DAY_MIN,
        (Minutes::Float(0.0), sunrise_cur),
        &hora_fields,
    );
    project_ghati_segments(
        &mut hora,
        cur.get("hora"),
        sunrise_min,
        0.0,
        (sunrise_cur, Minutes::Float(DAY_MIN)),
        &hora_fields,
    );

    let row = |key: &str| row_segments(prev.get(key), cur.get(key), location, midnight_wall);
    let pick = |v: &Value, outer: &str, inner: &str| {
        v.get(outer)
            .and_then(|o| o.get(inner))
            .cloned()
            .unwrap_or(Value::Null)
    };

    Ok(json!({
        "anchor": "civil",
        "date_ad": day.to_string(),
        "sunrise_min": sunrise_cur.rounded(),
        "sunset_min": sunset_cur.map_or(Value::Null, Minutes::rounded),
        "moonrise_min": clip_marker(hhmm_to_min(short_of(cur, "moonrise"))),
        "moonset_min": clip_marker(hhmm_to_min(short_of(cur, "moonset"))),
        "weekday_ne": pick(cur, "vaara", "name_ne"),
        "weekday_en": pick(cur, "vaara", "name_english"),
        "rows": {
            "tithi": row("tithi"),
            "nakshatra": row("nakshatra"),
            "yoga": row("yoga"),
            "karana": row("karana"),
        },
        "paksha_ne": pick(cur, "paksha", "label_ne"),
        "choghadiya": choghadiya,
        "hora": hora,
        "lagna": lagna_segments(prev.get("lagna_spans"), cur.get("lagna_spans"), sunrise_prev, sunrise_cur),
        "planets": cur.get("planets").cloned().unwrap_or(Value::Null),
        "planets_anchor": cur.get("planets_anchor").cloned().unwrap_or(Value::Null),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ghati_clock_reads_ghati_and_pala() {
        assert_eq!(
            ghati_clock_to_ghati(Some("3:08:51")),
            Some(3.0 + 8.0 / 60.0)
        );
        assert_eq!(ghati_clock_to_ghati(Some("")), None);
    }

    #[test]
    fn hhmm_is_an_int_minute_count() {
        assert!(matches!(
            hhmm_to_min(Some("06:17")),
            Some(Minutes::Int(377))
        ));
        assert!(hhmm_to_min(Some("6")).is_none());
    }
}
