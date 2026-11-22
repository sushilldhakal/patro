//! `/nepal/panchanga/{date_key}` and `/nepal/panchanga/month/{y}/{m}`: the day state
//! with holiday flags (`services/festivals/festival_day.py`) and the format registry
//! (`services/panchanga/presentation/registry.py`: canonical, toyanath, dayblock,
//! the patro grid, and `apply_variant`).

use panchanga::{daily::Location, payload::Fields};
use serde_json::{Map, Value, json};
use timescale::CivilDay;

use crate::{
    day::{
        DayBuildOptions, DayError, DayVariant, DetailMode, FestivalMode, SlimMode, calendar_header,
        day_fields_for_jd_with,
    },
    festivals::sankrantis_on_date,
    month::{Embed, International, MonthError, month_fields, month_tree_with},
    presentation::{
        DAY_BLOCK_KEYS, GRID_KEYS, Locale, day_block, end_time, month_stream, patro_grid,
        tithi_display, toyanath_month, window,
    },
};

const RENDERER_VERSION: &str = "2.2.0";

/// `format=` of the two routes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Style {
    /// The engine state as is.
    Raw,
    /// The canonical schema, `meta.format = "surya"`.
    Surya,
    /// Devanagari-first patro block.
    Toyanath,
    /// The Surya canonical schema.
    Canonical,
    /// Day: canonical; month: the printable grid.
    Patro,
    /// Printable text blocks.
    Dayblock,
}

impl Style {
    /// From the query value.
    #[must_use]
    pub fn parse(s: &str) -> Option<Self> {
        Some(match s {
            "raw" => Self::Raw,
            "surya" => Self::Surya,
            "toyanath" => Self::Toyanath,
            "canonical" => Self::Canonical,
            "patro" => Self::Patro,
            "dayblock" => Self::Dayblock,
            _ => return None,
        })
    }
}

/// `apply_variant(payload, variant)`: publisher labels added to `meta`.
#[must_use]
pub fn apply_variant(payload: Value, variant: &str) -> Value {
    let extra: &[(&str, &str)] = match variant {
        "nepal_official" => &[
            ("udaya_anchor", "local_sunrise"),
            ("publisher", "nepal_official"),
        ],
        "toyanath" => &[("graha_anchor", "06:00_local"), ("publisher", "toyanath")],
        "surya" => &[("engine", "surya_panchanga_api"), ("publisher", "surya")],
        _ => return payload,
    };
    let Value::Object(mut map) = payload else {
        return payload;
    };
    let mut meta = match map.get("meta") {
        Some(Value::Object(m)) => m.clone(),
        _ => Map::new(),
    };
    for (k, v) in extra {
        meta.insert((*k).to_owned(), json!(v));
    }
    meta.insert("variant".into(), json!(variant));
    map.insert("meta".into(), Value::Object(meta));
    Value::Object(map)
}

/// `day_state_with_holidays(civil, location)`.
///
/// # Errors
///
/// As [`day_payload_for_jd`] (days before 1582-10-15 are not ported).
pub fn day_state_with_holidays(civil: CivilDay, location: &Location) -> Result<Fields, DayError> {
    let options = DayBuildOptions {
        detail: DetailMode::Exclude,
        slim: SlimMode::Keep,
        festivals: FestivalMode::Plain,
    };
    let mut state =
        day_fields_for_jd_with(civil.to_jd_ut(), location, options, DayVariant::default())?;
    let mut any = false;
    if let Some(mut festivals) = state.get("festivals").map(std::borrow::Cow::into_owned)
        && let Some(list) = festivals.as_array_mut()
    {
        for f in list {
            let holiday = f
                .get("id")
                .and_then(Value::as_str)
                .is_some_and(::festivals::is_public_holiday);
            any |= holiday;
            if let Some(obj) = f.as_object_mut() {
                obj.insert("is_public_holiday".into(), json!(holiday));
            }
        }
        state.insert_tree("festivals", festivals);
    }
    state.insert_tree("is_public_holiday", json!(any));
    state.remove("detail");
    Ok(state)
}

fn truthy(v: Option<&Value>) -> Option<&Value> {
    v.filter(|v| match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::String(s) => !s.is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Object(o) => !o.is_empty(),
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
    })
}

fn get<'a>(v: &'a Value, k: &str) -> &'a Value {
    v.get(k).unwrap_or(&Value::Null)
}

fn opt_str(v: Option<String>) -> Value {
    v.map_or(Value::Null, Value::String)
}

fn festival_list(festivals: &Value) -> Vec<Value> {
    festivals
        .as_array()
        .into_iter()
        .flatten()
        .map(|f| {
            let mut m = Map::new();
            m.insert("id".into(), f.get("id").cloned().unwrap_or(json!("")));
            m.insert(
                "name".into(),
                truthy(f.get("name"))
                    .or_else(|| truthy(f.get("name_en")))
                    .cloned()
                    .unwrap_or(json!("")),
            );
            if let Some(ne) = truthy(f.get("name_ne")) {
                m.insert("name_ne".into(), ne.clone());
            }
            Value::Object(m)
        })
        .collect()
}

fn special_block(state: &Value, location: &Location) -> Value {
    let lunar = get(state, "lunar_month");
    let is_adhik = truthy(lunar.get("is_adhik")).is_some();
    let is_kshaya = lunar.get("type").and_then(Value::as_str) == Some("kshaya");
    let civil = state
        .get("date_ad")
        .and_then(Value::as_str)
        .and_then(parse_iso);
    let events = civil
        .map(|c| sankrantis_on_date(location.system, c, &location.zone).unwrap_or_default())
        .unwrap_or_default();
    let sankranti = events.first().map_or(Value::Null, |ev| {
        json!({
            "sign": get(ev, "to_rashi"),
            "sign_ne": get(ev, "to_rashi_ne"),
            "timestamp": get(get(ev, "timestamp"), "local_display"),
            "type": "sankranti",
            "bs_month": get(ev, "bs_month_name"),
        })
    });
    json!({"adhik_maas": is_adhik, "kshaya_maas": is_kshaya, "sankranti": sankranti})
}

fn parse_iso(s: &str) -> Option<CivilDay> {
    let mut it = s.splitn(3, '-');
    let y = it.next()?.parse().ok()?;
    let m = it.next()?.parse().ok()?;
    let d = it.next()?.parse().ok()?;
    Some(CivilDay::new(y, m, d))
}

fn anga(block: &Value, name: &Value) -> Value {
    json!({
        "name": name,
        "name_ne": get(block, "name_ne"),
        "end_time": opt_str(end_time(get(block, "end"))),
    })
}

/// `to_canonical(daily_state)`: the Surya Panchanga canonical schema.
#[must_use]
pub fn to_canonical(state: &Value, location: &Location) -> Value {
    let loc = get(state, "location");
    let muhurta = get(state, "muhurta");
    let paksha = get(state, "paksha");
    let tithi = get(state, "tithi");
    let sun = get(state, "sun");
    let moon = get(state, "moon");
    let noon = truthy(sun.get("noon"))
        .cloned()
        .unwrap_or_else(|| get(get(muhurta, "abhijit"), "solar_noon").clone());
    let w = |k: &str| opt_str(window(get(muhurta, k)).filter(|_| truthy(muhurta.get(k)).is_some()));
    let plain = |k: &str| {
        let b = get(state, k);
        anga(b, get(b, "name"))
    };
    json!({
        "date": {
            "ad": get(state, "date_ad"),
            "bs": get(state, "date_bs"),
            "weekday": get(state, "weekday_en"),
            "weekday_ne": get(state, "weekday"),
        },
        "location": {
            "city": get(loc, "name"),
            "city_id": get(loc, "city_id"),
            "lat": get(loc, "lat"),
            "lon": get(loc, "lon"),
            "timezone": get(loc, "timezone"),
        },
        "sun": {"sunrise": get(sun, "sunrise"), "sunset": get(sun, "sunset"), "noon": noon},
        "moon": {"moonrise": get(moon, "rise"), "moonset": get(moon, "set")},
        "panchanga": {
            "tithi": anga(tithi, &opt_str(tithi_display(tithi, paksha))),
            "nakshatra": plain("nakshatra"),
            "yoga": plain("yoga"),
            "karana": plain("karana"),
            "paksha": paksha,
            "paksha_ne": get(state, "paksha_ne"),
        },
        "muhurta": {
            "rahu_kalam": w("rahu_kalam"),
            "yamaganda": w("yamaganda"),
            "gulika": w("gulika"),
            "abhijit": w("abhijit"),
        },
        "astrology": {
            "sun_rashi": get(state, "surya_rashi"),
            "sun_rashi_ne": get(state, "surya_rashi_ne"),
            "moon_rashi": get(state, "chandra_rashi"),
            "moon_rashi_ne": get(state, "chandra_rashi_ne"),
            "ritu": get(state, "ritu"),
            "ritu_ne": get(state, "ritu_ne"),
            "aayan": get(state, "aayan"),
            "ayanamsa": "Surya Siddhanta",
        },
        "festivals": festival_list(get(state, "festivals")),
        "is_public_holiday": state.get("is_public_holiday").cloned().unwrap_or(json!(false)),
        "special": special_block(state, location),
        "meta": {
            "format": "surya_canonical",
            "engine_version": RENDERER_VERSION,
            "from_cache": state.get("from_cache").cloned().unwrap_or(json!(false)),
        },
    })
}

fn nepali_digits(s: &str) -> String {
    s.chars()
        .map(|c| {
            c.to_digit(10)
                .and_then(|d| char::from_u32(0x0966 + d))
                .unwrap_or(c)
        })
        .collect()
}

fn toyanath_anga(block: &Value) -> Value {
    if truthy(Some(block)).is_none() {
        return json!({"nama": null, "antya": null});
    }
    json!({
        "nama": truthy(block.get("name_ne")).or_else(|| block.get("name")).cloned().unwrap_or(Value::Null),
        "antya": get(block, "end_time"),
    })
}

fn split_window(v: &Value) -> Value {
    match v
        .as_str()
        .filter(|s| !s.is_empty())
        .and_then(|s| s.split_once('-'))
    {
        Some((a, b)) => json!({"start": a, "end": b}),
        None => json!({"start": null, "end": null}),
    }
}

/// `to_toyanath(daily_state)`.
#[must_use]
pub fn to_toyanath(state: &Value, location: &Location) -> Value {
    let c = to_canonical(state, location);
    let p = &c["panchanga"];
    let bs = &c["date"]["bs"];
    let bs_ne = match bs.as_str().filter(|s| !s.is_empty()) {
        None => Value::Null,
        Some(s) => {
            let parts: Vec<&str> = s.split('-').collect();
            if parts.len() == 3 {
                json!(
                    parts
                        .iter()
                        .map(|x| nepali_digits(x))
                        .collect::<Vec<_>>()
                        .join("-")
                )
            } else {
                json!(s)
            }
        }
    };
    json!({
        "meta": {
            "format": "toyanath",
            "from_cache": c["meta"]["from_cache"],
            "convention": "Udaya tithi at local true sunrise; Lahiri ayanamsa",
            "derived_from": "surya_canonical",
        },
        "mastak": {
            "bs_date": bs,
            "bs_date_ne": bs_ne,
            "ad_date": c["date"]["ad"],
            "vaara_ne": c["date"]["weekday_ne"],
            "vaara_en": c["date"]["weekday"],
            "paksha_ne": p["paksha_ne"],
            "sthana": c["location"]["city"],
        },
        "samaya": {
            "sunrise": c["sun"]["sunrise"],
            "sunset": c["sun"]["sunset"],
            "noon": c["sun"]["noon"],
            "moonrise": c["moon"]["moonrise"],
            "moonset": c["moon"]["moonset"],
        },
        "panchanga": {
            "tithi": toyanath_anga(&p["tithi"]),
            "nakshatra": toyanath_anga(&p["nakshatra"]),
            "yoga": toyanath_anga(&p["yoga"]),
            "karana": toyanath_anga(&p["karana"]),
        },
        "muhurta": {
            "rahu_kalam": split_window(&c["muhurta"]["rahu_kalam"]),
            "yamaganda": split_window(&c["muhurta"]["yamaganda"]),
            "gulika": split_window(&c["muhurta"]["gulika"]),
            "abhijit": split_window(&c["muhurta"]["abhijit"]),
        },
        "utsav": c["festivals"].as_array().into_iter().flatten().map(|f| json!({
            "name_ne": truthy(f.get("name_ne")).or_else(|| f.get("name")).cloned().unwrap_or(Value::Null),
            "name_en": get(f, "name"),
        })).collect::<Vec<_>>(),
        "special": c["special"],
    })
}

/// `render_panchanga(daily_state, style, variant, locale)`.
#[must_use]
pub fn render_day(
    fields: &Fields,
    location: &Location,
    style: Style,
    variant: &str,
    locale: Locale,
) -> Value {
    // The styles read a few blocks of the day's state: only those are turned into a tree.
    let state = if style == Style::Raw {
        fields.to_value()
    } else {
        fields.view(DAY_BLOCK_KEYS)
    };
    let payload = match style {
        // The route returns the state before the registry: no variant.
        Style::Raw => return state,
        Style::Dayblock => {
            let c = to_canonical(&state, location);
            json!({
                "meta": {
                    "format": "dayblock",
                    "locale": if locale == Locale::Ne { "ne" } else { "en" },
                    "engine_version": RENDERER_VERSION,
                    "from_cache": state.get("from_cache").cloned().unwrap_or(json!(false)),
                },
                "date": c["date"],
                "location": c["location"],
                "text": day_block(&state, location, locale),
            })
        }
        Style::Toyanath => to_toyanath(&state, location),
        Style::Surya | Style::Canonical | Style::Patro => {
            let mut c = to_canonical(&state, location);
            if style == Style::Surya {
                c["meta"]["format"] = json!("surya");
            }
            c
        }
    };
    apply_variant(payload, variant)
}

/// The month route's body (`nepal_panchanga_month_formatted`); `full` is
/// [`Embed::Full`] for `full=true`.
///
/// # Errors
///
/// As [`month_calendar`] and [`calendar_header`].
pub fn render_month(
    bs_year: i32,
    bs_month: u32,
    location: &Location,
    style: Style,
    variant: &str,
    full: Embed,
    locale: Locale,
) -> Result<Value, MonthError> {
    if style == Style::Patro {
        return crate::presentation::patro_month(bs_year, bs_month, location);
    }
    let embed = if full != Embed::Lite || style == Style::Dayblock {
        Embed::Full
    } else {
        Embed::Lite
    };
    let fields = month_fields(bs_year, bs_month, location, International::Include, embed)?;
    // The styles read a few blocks of each row's state: only those are turned into a tree.
    let month = match style {
        Style::Raw => fields.to_value(),
        Style::Dayblock => month_tree_with(&fields, DAY_BLOCK_KEYS),
        Style::Toyanath => month_tree_with(&fields, &[]),
        _ => month_tree_with(&fields, GRID_KEYS),
    };
    let header = calendar_header(bs_year, bs_month, location)?;
    let payload = match style {
        // The route returns the month before the registry: no variant.
        Style::Raw => return Ok(month),
        Style::Dayblock => month_stream(&month, &header, location, locale),
        Style::Toyanath => toyanath_month(&month),
        _ => {
            let mut grid = patro_grid(bs_year, bs_month, &month, &header);
            if style == Style::Surya {
                grid["meta"]["format"] = json!("surya_month");
            }
            grid
        }
    };
    Ok(apply_variant(payload, variant))
}
