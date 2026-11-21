//! Choghadiya, hora, ritu and ayana blocks of the daily payload.

use astronomy::engine::sun_longitude;
use serde::Serialize;
use serde_json::{Value, json};
use timescale::{PyInstant, Zone};

use crate::{
    payload::to_value,
    pyfloat::{py_floordiv, py_int, py_mod, py_round},
    text_tables::{
        CHO_DAY_START, CHO_NIGHT_START, CHOGHADIYA, DAY_LORD, HORA_PLANETS, HORA_SEQUENCE, RITU,
    },
};

/// One choghadiya segment in ghati coordinates.
#[derive(Debug, Serialize)]
pub(crate) struct ChoSegment {
    name_ne: &'static str,
    name_en: &'static str,
    name: &'static str,
    quality_ne: &'static str,
    quality_en: &'static str,
    start_g: f64,
    end_g: f64,
    bad: bool,
    phase: &'static str,
}

fn cho_segment(
    c: (&'static str, &'static str, &'static str, &'static str, bool),
    start: f64,
    end: f64,
    phase: &'static str,
) -> ChoSegment {
    let (name_ne, name_en, quality_ne, quality_en, bad) = c;
    ChoSegment {
        name_ne,
        name_en,
        name: name_en,
        quality_ne,
        quality_en,
        start_g: start,
        end_g: end,
        bad,
        phase,
    }
}

/// `build_choghadiya`: eight day and eight night segments in ghati coordinates.
#[must_use]
pub(crate) fn choghadiya_list(day_ghati: f64, vaara: u32) -> Vec<ChoSegment> {
    let d_seg = day_ghati / 8.0;
    let n_seg = (60.0 - day_ghati) / 8.0;
    let dow = vaara as usize % 7;
    let mut segments = Vec::with_capacity(16);
    for i in 0..8u32 {
        let f = f64::from(i);
        segments.push(cho_segment(
            CHOGHADIYA[(CHO_DAY_START[dow] + i as usize) % 7],
            f * d_seg,
            (f + 1.0) * d_seg,
            "day",
        ));
    }
    for i in 0..8u32 {
        let f = f64::from(i);
        let c = CHOGHADIYA[(CHO_NIGHT_START[dow] + 5 * i as usize) % 7];
        segments.push(cho_segment(
            c,
            day_ghati + f * n_seg,
            day_ghati + (f + 1.0) * n_seg,
            "night",
        ));
    }
    segments
}

/// [`choghadiya_list`] as a JSON tree, for callers that still build trees.
#[must_use]
pub fn choghadiya(day_ghati: f64, vaara: u32) -> Value {
    to_value(&choghadiya_list(day_ghati, vaara))
}

fn hora_lord(vaara: u32, index: usize) -> &'static str {
    let start = HORA_SEQUENCE
        .iter()
        .position(|p| *p == DAY_LORD[vaara as usize % 7])
        .unwrap_or(0);
    HORA_SEQUENCE[(start + index) % 7]
}

struct HoraSpan<I> {
    start: I,
    end: I,
    start_g: f64,
    end_g: f64,
}

/// Day or night half of the hora sequence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Phase {
    Day,
    Night,
}

/// One hora slot with its local clock and ghati span.
#[derive(Debug, Serialize)]
pub(crate) struct HoraSlot {
    index: usize,
    phase: &'static str,
    phase_ne: &'static str,
    planet: &'static str,
    planet_ne: &'static str,
    planet_en: &'static str,
    quality_ne: &'static str,
    tone: &'static str,
    bad: bool,
    start_local_time_short: String,
    end_local_time_short: String,
    start_g: f64,
    end_g: f64,
}

fn hora_slot<I: PyInstant>(
    index: usize,
    phase: Phase,
    planet: &'static str,
    span: &HoraSpan<I>,
    zone: &Zone,
) -> HoraSlot {
    let night = phase == Phase::Night;
    let (_, planet_ne, planet_en, bad) = HORA_PLANETS
        .iter()
        .copied()
        .find(|p| p.0 == planet)
        .unwrap_or(HORA_PLANETS[0]);
    HoraSlot {
        index,
        phase: if night { "night" } else { "day" },
        phase_ne: if night { "रात" } else { "दिन" },
        planet,
        planet_ne,
        planet_en,
        quality_ne: if bad { "अशुभ" } else { "शुभ" },
        tone: if bad { "bad" } else { "good" },
        bad,
        start_local_time_short: span.start.wall(zone).hm,
        end_local_time_short: span.end.wall(zone).hm,
        start_g: py_round(span.start_g, 4),
        end_g: py_round(span.end_g, 4),
    }
}

/// `build_hora`: twelve day and twelve night hora slots.
#[must_use]
pub(crate) fn hora_slot_list<I: PyInstant>(
    sunrise: I,
    sunset: I,
    next_sunrise: I,
    vaara: u32,
    zone: &Zone,
) -> Vec<HoraSlot> {
    let day_s = sunset.seconds_since(sunrise);
    let night_s = next_sunrise.seconds_since(sunset);
    let day_ghati = (day_s / (day_s + night_s) * 60.0).min(60.0);
    let (day_hora, night_hora) = (day_s / 12.0, night_s / 12.0);
    let (day_g, night_g) = (day_ghati / 12.0, (60.0 - day_ghati) / 12.0);
    let mut slots = Vec::with_capacity(24);
    for i in 0..12u32 {
        let f = f64::from(i);
        let span = HoraSpan {
            start: sunrise.add_seconds_f64(f * day_hora),
            end: sunrise.add_seconds_f64((f + 1.0) * day_hora),
            start_g: f * day_g,
            end_g: (f + 1.0) * day_g,
        };
        slots.push(hora_slot(
            i as usize + 1,
            Phase::Day,
            hora_lord(vaara, i as usize),
            &span,
            zone,
        ));
    }
    for i in 0..12u32 {
        let f = f64::from(i);
        let span = HoraSpan {
            start: sunset.add_seconds_f64(f * night_hora),
            end: sunset.add_seconds_f64((f + 1.0) * night_hora),
            start_g: day_ghati + f * night_g,
            end_g: day_ghati + (f + 1.0) * night_g,
        };
        slots.push(hora_slot(
            i as usize + 1,
            Phase::Night,
            hora_lord(vaara, 12 + i as usize),
            &span,
            zone,
        ));
    }
    slots
}

/// [`hora_slot_list`] as a JSON tree, for callers that still build trees.
#[must_use]
pub fn hora<I: PyInstant>(
    sunrise: I,
    sunset: I,
    next_sunrise: I,
    vaara: u32,
    zone: &Zone,
) -> Value {
    to_value(&hora_slot_list(sunrise, sunset, next_sunrise, vaara, zone))
}

/// Real precession (IAU 2006, linear term), degrees per day.
const PRECESSION_DEG_PER_DAY: f64 = 5_028.796_195 / 3600.0 / 36525.0;
/// Lahiri ayanamsha at J2000.0, which anchors the drift to the sidereal frame.
const AYANAMSHA_J2000_DEG: f64 = 23.853_056;
const J2000: f64 = 2_451_545.0;

/// Tropical Sun under the Surya Siddhanta: the text's Sun turned by real precession.
pub(crate) fn tropical_sun(jd: f64) -> f64 {
    py_mod(
        sun_longitude(jd) + (AYANAMSHA_J2000_DEG + (jd - J2000) * PRECESSION_DEG_PER_DAY),
        360.0,
    )
}

fn sidereal_sun(jd: f64) -> f64 {
    py_mod(sun_longitude(jd), 360.0)
}

fn sun_rashi(lon: f64) -> i64 {
    py_int(py_floordiv(lon, 30.0)) % 12 + 1
}

fn ritu_from(lon: f64, lat: f64, basis: &str) -> Value {
    let slot = py_int(py_floordiv(py_mod(lon - 330.0, 360.0), 60.0));
    let i = usize::try_from(slot).unwrap_or(0);
    let (number, name, name_sanskrit, name_ne, season) =
        RITU[if lat < 0.0 { (i + 3) % 6 } else { i }];
    json!({
        "number": number, "name": name, "name_sanskrit": name_sanskrit, "name_ne": name_ne, "season": season,
        "solar_slot": slot, "sun_rashi": sun_rashi(lon), "basis": basis,
    })
}

/// `ritu_at`: the real (tropical) season at the observer.
pub(crate) fn ritu(jd: f64, lat: f64) -> Value {
    ritu_from(
        tropical_sun(jd),
        lat,
        if lat < 0.0 {
            "tropical_southern"
        } else {
            "tropical"
        },
    )
}

/// `vedic_ritu_at`: the season the sidereal Sun names.
pub(crate) fn ritu_vedic(jd: f64, lat: f64) -> Value {
    ritu_from(sidereal_sun(jd), lat, "sidereal")
}

fn ayana_from(lon: f64, basis: &str) -> Value {
    let uttara = !(90.0..270.0).contains(&lon);
    json!({
        "name": if uttara { "Uttarayana" } else { "Dakshinayana" },
        "name_ne": if uttara { "उत्तरायण" } else { "दक्षिणायण" },
        "name_sanskrit": if uttara { "Uttarayana" } else { "Dakshinayana" },
        "sun_rashi": sun_rashi(lon), "basis": basis,
        "kranti_mark": if uttara { "उ" } else { "द" },
    })
}

/// `ayana_at`: Uttarayana from the December solstice, from the tropical Sun.
/// `rashi_service.aayan(jd)`: Uttarayana / Dakshinayana at an instant.
#[must_use]
pub fn aayan(jd: f64) -> Value {
    ayana_from(tropical_sun(jd), "tropical")
}

/// `vedic_ayana_at`: the same from the sidereal Sun.
pub(crate) fn aayan_vedic(jd: f64) -> Value {
    ayana_from(sidereal_sun(jd), "sidereal")
}
