//! `reference=midnight` day state: `build_panchanga_civil_day`
//! (`services/panchanga/panchanga_at_time.py`) as `_day_payload_for_jd` uses it.

use panchanga::{
    daily::{Location, build_daily},
    midnight::{apply_to_detail, midnight_overlay},
};
use serde_json::{Value, json};
use timescale::CivilDay;

use crate::day::{
    DayBuildOptions, DayError, DetailMode, FestivalMode, build_daily_state, element_state,
};

fn field(v: &Value, key: &str) -> Value {
    v.get(key).cloned().unwrap_or(Value::Null)
}

/// The civil-date state (festivals, ritu, sun/moon, muhurta …) with the moving
/// angas re-read at local midnight. Python always builds it with festivals and
/// detail, then drops the top-level `detail` / `festivals` the caller did not ask
/// for (the detail keeps its festival rows).
///
/// # Errors
///
/// [`DayError`] when the day cannot be built.
pub(crate) fn midnight_day_state(
    civil: CivilDay,
    location: &Location,
    options: DayBuildOptions,
) -> Result<Value, DayError> {
    let daily = build_daily(civil, location)?;
    let raw = daily.tree();
    let festivals = if options.festivals == FestivalMode::Include {
        FestivalMode::Include
    } else {
        FestivalMode::Plain
    };
    let mut state = build_daily_state(
        civil,
        location,
        &daily,
        DayBuildOptions {
            detail: DetailMode::Include,
            festivals,
            ..options
        },
    )
    .to_value();
    let vaara = raw
        .get("vaara")
        .and_then(|v| v.get("number"))
        .and_then(Value::as_u64)
        .and_then(|n| u32::try_from(n).ok())
        .unwrap_or(0);
    let lunar = field(raw, "lunar_month");
    let overlay = midnight_overlay(civil, location, &lunar, vaara)?;

    let Value::Object(map) = &mut state else {
        return Ok(state);
    };
    // `attach_festival_saits` runs after the overlay in Python.
    let saits = map.shift_remove("festival_saits");
    let mut detail = match map.get("detail") {
        Some(Value::Object(d)) => d.clone(),
        _ => serde_json::Map::new(),
    };
    apply_to_detail(&mut detail, &overlay);

    let zone = &location.zone;
    let paksha = overlay.get("paksha");
    let chandra = overlay.get("chandra_rashi");
    let surya = overlay.get("surya_rashi");
    let lagna = overlay.get("lagna");
    let updates = [
        ("mode", json!("civil")),
        ("boundary", json!("midnight")),
        ("anchor", json!("midnight")),
        ("panchanga_date_ad", json!(civil.to_string())),
        ("tithi", element_state(overlay.get("tithi"), zone)),
        ("nakshatra", element_state(overlay.get("nakshatra"), zone)),
        ("yoga", element_state(overlay.get("yoga"), zone)),
        ("karana", element_state(overlay.get("karana"), zone)),
        ("paksha", field(paksha, "label_en")),
        ("paksha_ne", field(paksha, "label_ne")),
        ("chandra_rashi", field(chandra, "name")),
        ("chandra_rashi_ne", field(chandra, "name_ne")),
        ("surya_rashi", field(surya, "name")),
        ("surya_rashi_ne", field(surya, "name_ne")),
        ("lagna", field(lagna, "name")),
        ("lagna_ne", field(lagna, "name_ne")),
        ("lagna_spans", overlay.get("lagna_spans").clone()),
        ("udaya_lagna", overlay.get("udaya_lagna").clone()),
        ("tarabala_table", overlay.get("tarabala_table").clone()),
        (
            "chandrabala_table",
            overlay.get("chandrabala_table").clone(),
        ),
        ("detail", Value::Object(detail)),
    ];
    for (key, value) in updates {
        map.insert(key.to_owned(), value);
    }
    if options.detail == DetailMode::Exclude {
        map.shift_remove("detail");
    }
    if options.festivals == FestivalMode::Exclude {
        map.shift_remove("festivals");
    }
    if let Some(saits) = saits {
        map.insert("festival_saits".into(), saits);
    }
    Ok(state)
}
