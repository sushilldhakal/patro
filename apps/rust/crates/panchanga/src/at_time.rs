//! Panchanga at an instant: the vedic day an instant belongs to and the blocks the
//! at-time route re-reads at that instant (`engine/panchanga/at_time.py`,
//! `engine/panchanga/upagraha.py`, the instant parts of
//! `services/panchanga/panchanga_at_time.py`).

use astronomy::surya_siddhanta::ascendant;
use serde_json::{Map, Value, json};
use timescale::{CivilDay, JdInstant, PyInstant, UtcInstant, Zone};

use crate::{
    angas::{tithi, vara},
    blocks_lagna::{
        instant_lagna, lagna_rows_value, lagna_spans_with_pushkara, planets_with_extras,
    },
    daily::{
        DailyError, Location, day_times, day_times_jd, karana_block, nakshatra_block, tithi_block,
        yoga_block,
    },
    pyfloat::{py_int, py_mod, py_round},
};

/// The vedic day (sunrise → next sunrise) an instant falls in.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VedicDay<I = UtcInstant> {
    /// The civil day whose sunrise opens the vedic day.
    pub anchor: CivilDay,
    /// That day's sunrise.
    pub sunrise: I,
    /// That day's sunset.
    pub sunset: I,
    /// The following day's sunrise.
    pub next_sunrise: I,
}

/// `resolve_vedic_day_anchor`: instants before the local day's sunrise belong to the
/// previous vedic day. `zone` is the observer zone the instant is read in.
///
/// # Errors
///
/// [`DailyError`] when a sunrise cannot be found (polar day/night) or the day is
/// outside the Gregorian range.
pub fn vedic_day(
    instant: UtcInstant,
    location: &Location,
    zone: &Zone,
) -> Result<VedicDay, DailyError> {
    let civil = zone.local(instant).day();
    let today = day_times(civil, location)?;
    let before_sunrise = instant < today.sunrise;
    let (anchor, times) = if before_sunrise {
        let previous = civil.add_days(-1);
        (previous, day_times(previous, location)?)
    } else {
        (civil, today)
    };
    Ok(VedicDay {
        anchor,
        sunrise: times.sunrise,
        sunset: times.sunset,
        next_sunrise: times.next_sunrise,
    })
}

/// [`vedic_day`] for a Julian Day instant (`UtInstant`): the local civil day comes
/// from `local_civil_fields` (the zone's modern offset).
///
/// # Errors
///
/// [`DailyError`] when a sunrise cannot be found (polar day/night).
pub fn vedic_day_jd(
    instant: JdInstant,
    location: &Location,
) -> Result<VedicDay<JdInstant>, DailyError> {
    let civil = instant.civil_fields(&location.zone).day;
    let today = day_times_jd(civil, location)?;
    let (anchor, times) = if instant < today.sunrise {
        let previous = civil.add_days(-1);
        (previous, day_times_jd(previous, location)?)
    } else {
        (civil, today)
    };
    Ok(VedicDay {
        anchor,
        sunrise: times.sunrise,
        sunset: times.sunset,
        next_sunrise: times.next_sunrise,
    })
}

/// The vedic day's lagna spans with pushkara navamsha, as the at-time route
/// rebuilds them (`build_lagna_spans` + `enrich_lagna_spans_with_pushkara`).
#[must_use]
pub fn day_lagna_spans<I: PyInstant>(day: &VedicDay<I>, location: &Location) -> Value {
    lagna_rows_value(&lagna_spans_with_pushkara(
        day.sunrise,
        day.next_sunrise,
        location.lat,
        location.lon,
        &location.zone,
    ))
}

/// The blocks the at-time route reads at the instant itself.
#[derive(Debug, Clone, PartialEq)]
pub struct InstantBlocks {
    /// Tithi running at the instant (clocks from sunrise).
    pub tithi: Value,
    /// Nakshatra running at the instant.
    pub nakshatra: Value,
    /// Yoga running at the instant.
    pub yoga: Value,
    /// Karana running at the instant.
    pub karana: Value,
    /// Every graha at the instant, with latitude / RA / declination.
    pub planets: Value,
    /// The lagna at the instant, with its equatorial extras and speed.
    pub lagna: Value,
    /// Kāla-velā and sun-based upagrahas.
    pub upagrahas: Value,
    /// The vedic day's weekday (0 = Sunday).
    pub vaara: u32,
}

/// The instant overlays of `build_panchanga_at_time`.
#[must_use]
pub fn instant_blocks<I: PyInstant>(
    instant: I,
    day: &VedicDay<I>,
    location: &Location,
) -> InstantBlocks {
    let zone = &location.zone;
    let jd = instant.to_jd();
    let vaara = vara(day.sunrise.to_jd(), zone).number;
    let planets = planets_with_extras(jd);
    let sun_longitude = planets["sun"]["longitude"].as_f64().unwrap_or(0.0);
    let mut upagrahas = kala_vela_upagrahas(instant, day, vaara, location);
    upagrahas.extend(sun_based_upagrahas(sun_longitude));
    InstantBlocks {
        tithi: tithi_block(instant, day.sunrise, zone, &tithi(jd)),
        nakshatra: nakshatra_block(instant, day.sunrise, zone),
        yoga: yoga_block(instant, day.sunrise, zone),
        karana: karana_block(instant, day.sunrise, zone),
        planets,
        lagna: instant_lagna(jd, location.lat, location.lon),
        upagrahas: Value::Array(upagrahas),
        vaara,
    }
}

/// `build_planetary_snapshot(instant, lat=, lon=)`: the nine grahas with their
/// equatorial extras, the instant lagna, and the Moon's phase.
#[must_use]
pub fn planetary_snapshot(instant: UtcInstant, lat: f64, lon: f64) -> Value {
    let jd = instant.to_jd();
    json!({
        "planets": planets_with_extras(jd),
        "lagna": instant_lagna(jd, lat, lon),
        "moon_phase": crate::daily::moon_phase(jd),
        "anchor": "instant",
        "computed_at": instant.to_string(),
    })
}

/// Portion lords in weekday order; index matches vaara (0 = Sunday).
const WEEKDAY_LORDS: [&str; 7] = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn",
];

/// (key, portion lord, rises at the middle of the portion).
const KALA_VELA: [(&str, &str, bool); 6] = [
    ("gulika", "saturn", false),
    ("mandi", "saturn", true),
    ("kala", "sun", true),
    ("mrityu", "mars", true),
    ("ardha_prahara", "mercury", true),
    ("yama_ghantaka", "jupiter", true),
];

fn upagraha_names(key: &str) -> (&'static str, &'static str) {
    match key {
        "gulika" => ("Gulika", "गुलिक"),
        "mandi" => ("Mandi", "माण्डि"),
        "kala" => ("Kala", "काल"),
        "mrityu" => ("Mrityu", "मृत्यु"),
        "ardha_prahara" => ("Ardha Prahara", "अर्धप्रहर"),
        "yama_ghantaka" => ("Yama Ghantaka", "यमघण्टक"),
        "dhuma" => ("Dhuma", "धूम"),
        "vyatipata" => ("Vyatipata", "व्यतीपात"),
        "parivesha" => ("Parivesha", "परिवेष"),
        "indra_chapa" => ("Indra Chapa", "इन्द्रचाप"),
        _ => ("Upaketu", "उपकेतु"),
    }
}

/// `upagraha._entry`.
fn entry(key: &str, longitude: f64, at: Option<String>) -> Value {
    let lon = py_mod(longitude, 360.0);
    let (name, name_ne) = upagraha_names(key);
    let mut out = Map::new();
    out.insert("key".into(), json!(key));
    out.insert("name".into(), json!(name));
    out.insert("name_ne".into(), json!(name_ne));
    out.insert("longitude".into(), json!(py_round(lon, 6)));
    out.insert("rashi".into(), json!(py_int(lon / 30.0).rem_euclid(12) + 1));
    out.insert("deg_in_rashi".into(), json!(py_round(py_mod(lon, 30.0), 6)));
    if let Some(at) = at {
        out.insert("at_utc".into(), json!(at));
    }
    Value::Object(out)
}

/// Dhuma → Upaketu from the Sun's sidereal longitude.
fn sun_based_upagrahas(sun_longitude: f64) -> Vec<Value> {
    let dhuma = py_mod(sun_longitude + 133.0 + 20.0 / 60.0, 360.0);
    let vyatipata = py_mod(360.0 - dhuma, 360.0);
    let parivesha = py_mod(vyatipata + 180.0, 360.0);
    let indra_chapa = py_mod(360.0 - parivesha, 360.0);
    let upaketu = py_mod(indra_chapa + 16.0 + 40.0 / 60.0, 360.0);
    vec![
        entry("dhuma", dhuma, None),
        entry("vyatipata", vyatipata, None),
        entry("parivesha", parivesha, None),
        entry("indra_chapa", indra_chapa, None),
        entry("upaketu", upaketu, None),
    ]
}

/// Gulika / Mandi / Kala / Mrityu / Ardha Prahara / Yama Ghantaka for the instant.
fn kala_vela_upagrahas<I: PyInstant>(
    instant: I,
    day: &VedicDay<I>,
    vaara: u32,
    location: &Location,
) -> Vec<Value> {
    let is_day = day.sunrise <= instant && instant < day.sunset;
    let (start, end, first_lord) = if is_day {
        (day.sunrise, day.sunset, vaara % 7)
    } else {
        (day.sunset, day.next_sunrise, (vaara + 4) % 7)
    };
    let portion = I::span_divided_seconds(start, end, 8);
    KALA_VELA
        .iter()
        .map(|&(key, lord, middle)| {
            let index = (0..7u32)
                .find(|i| WEEKDAY_LORDS[((first_lord + i) % 7) as usize] == lord)
                .unwrap_or(0);
            let offset = f64::from(index) + if middle { 0.5 } else { 0.0 };
            let at = start.add_seconds_f64(portion * offset);
            let asc = ascendant(at.to_jd(), location.lat, location.lon);
            entry(key, asc, Some(at.to_string()))
        })
        .collect()
}
