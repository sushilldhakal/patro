//! The udaya (sunrise) panchanga of one civil day, as the Python server returns it.
//!
//! A port of `engine/panchanga/daily.py` and the block builders it calls. The
//! payload is built as ordered JSON with the Python dict's keys in the Python
//! order, so a response can be compared, and served, byte for byte.
//!
//! [`build_daily`] emits the blocks ported so far in the Python key order
//! ([`PAYLOAD_KEYS`]); `docs/PORTING-engine-layer.md` lists what is still missing.

use astronomy::{
    engine::{
        Observer, moon_longitude, moon_phase_angle_and_fraction, rise_set_after, rise_set_on_day,
        sun_longitude, sun_moon_longitudes,
    },
    surya_siddhanta::{Body, Crossing, ayanamsha},
};
use std::collections::HashMap;

use serde_json::{Map, Value, json};
use timescale::{CivilDay, JdInstant, Moment, PyInstant, UtcInstant, Zone};

use crate::{
    angas::{NAKSHATRA_SPAN, Paksha, Tithi, karana, nakshatra, tithi, vara, yoga},
    blocks_bala::{chandrabala_table, chandrabalam, rashifal, tarabala_table, tarabalam},
    blocks_lagna::{lagna, lagna_spans, lagna_spans_plain, panchaka_rahita, planets, udaya_lagna},
    blocks_muhurta::{muhurta, muhurta_civil},
    blocks_nivas::nivas_shool,
    blocks_solar::{civil_probe_day, solar_corrections},
    blocks_time::{aayan, aayan_vedic, choghadiya, hora, ritu, ritu_vedic},
    boundaries::{
        karana_end, karana_start, moon_pada_end, moon_rashi_end, nakshatra_end, nakshatra_start,
        tithi_end, tithi_start, yoga_end, yoga_start,
    },
    lunar_month::{calendar_layers, merge_for_day},
    names::{KARANA_NAMES, NAKSHATRA_NAMES, VAARA_ENGLISH, VAARA_NAMES, YOGA_NAMES},
    nepal_sambat::{NsInput, ns_date},
    pyfloat::{py_floordiv, py_int, py_mod, py_round, py_round_int},
    samvatsara::samvatsara_payload,
};

const TITHI_NAMES_NE: [&str; 15] = [
    "प्रतिपदा",
    "द्वितीया",
    "तृतीया",
    "चतुर्थी",
    "पञ्चमी",
    "षष्ठी",
    "सप्तमी",
    "अष्टमी",
    "नवमी",
    "दशमी",
    "एकादशी",
    "द्वादशी",
    "त्रयोदशी",
    "चतुर्दशी",
    "पूर्णिमा",
];
/// Nakshatra names (Nepali), Ashwini first.
pub const NAKSHATRA_NAMES_NE: [&str; 27] = [
    "अश्विनी",
    "भरणी",
    "कृत्तिका",
    "रोहिणी",
    "मृगशिरा",
    "आर्द्रा",
    "पुनर्वसु",
    "पुष्य",
    "आश्लेषा",
    "मघा",
    "पूर्वाफाल्गुनी",
    "उत्तराफाल्गुनी",
    "हस्त",
    "चित्रा",
    "स्वाती",
    "विशाखा",
    "अनुराधा",
    "ज्येष्ठा",
    "मूल",
    "पूर्वाषाढा",
    "उत्तराषाढा",
    "श्रवण",
    "धनिष्ठा",
    "शतभिषा",
    "पूर्वभाद्रपदा",
    "उत्तरभाद्रपदा",
    "रेवती",
];
const YOGA_NAMES_NE: [&str; 27] = [
    "विष्कुम्भ",
    "प्रीति",
    "आयुष्मान",
    "सौभाग्य",
    "शोभन",
    "अतिगण्ड",
    "सुकर्मा",
    "धृति",
    "शूल",
    "गण्ड",
    "वृद्धि",
    "ध्रुव",
    "व्याघात",
    "हर्षण",
    "वज्र",
    "सिद्धि",
    "व्यतीपात",
    "वरीयान",
    "परिघ",
    "शिव",
    "सिद्ध",
    "साध्य",
    "शुभ",
    "शुक्ल",
    "ब्रह्म",
    "इन्द्र",
    "वैधृति",
];
const KARANA_NAMES_NE: [&str; 11] = [
    "बव",
    "बालव",
    "कौलव",
    "तैतिल",
    "गर",
    "वणिज",
    "विष्टि",
    "शकुनि",
    "चतुष्पाद",
    "नाग",
    "किमस्तुघ्न",
];
const VAARA_NAMES_NE: [&str; 7] = [
    "आइतवार",
    "सोमवार",
    "मङ्गलवार",
    "बुधवार",
    "बिहिवार",
    "शुक्रवार",
    "शनिवार",
];
/// Rashi names (Latin), Mesha first.
pub const RASHI_NAMES: [&str; 12] = [
    "Mesha",
    "Vrishabha",
    "Mithuna",
    "Karka",
    "Simha",
    "Kanya",
    "Tula",
    "Vrishchika",
    "Dhanu",
    "Makara",
    "Kumbha",
    "Meena",
];
/// Rashi names (Nepali), Mesha first.
pub const RASHI_NAMES_NE: [&str; 12] = [
    "मेष",
    "वृष",
    "मिथुन",
    "कर्कट",
    "सिंह",
    "कन्या",
    "तुला",
    "वृश्चिक",
    "धनु",
    "मकर",
    "कुम्भ",
    "मीन",
];
const BS_MONTH_NAMES: [&str; 12] = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush",
    "Magh", "Falgun", "Chaitra",
];
const BS_MONTH_NAMES_NE: [&str; 12] = [
    "बैशाख",
    "जेठ",
    "आषाढ",
    "श्रावण",
    "भाद्र",
    "आश्विन",
    "कार्तिक",
    "मंसिर",
    "पौष",
    "माघ",
    "फाल्गुन",
    "चैत्र",
];
const PHASE_NAMES: [&str; 8] = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
];
const PHASE_NAMES_NE: [&str; 8] = [
    "औंसी",
    "बढ्दो चन्द्र",
    "अर्ध चन्द्र",
    "बढ्दो गिब्बस",
    "पूर्णिमा",
    "घट्दो गिब्बस",
    "अर्ध चन्द्र",
    "घट्दो चन्द्र",
];
/// Synodic month (days), only to label the phase's age.
const SYNODIC_MONTH_DAYS: f64 = 29.530_588_853;
const PADA_SPAN: f64 = NAKSHATRA_SPAN / 4.0;
const SECONDS_IN_DAY: i64 = 86_400;

/// The observer a daily panchanga is drawn for (`ObserverLocation`).
#[derive(Debug, Clone)]
pub struct Location {
    /// Degrees north.
    pub lat: f64,
    /// Degrees east.
    pub lon: f64,
    /// IANA zone.
    pub zone: Zone,
    /// Display name.
    pub name: String,
    /// City id from the city database, when the request named one.
    pub city_id: Option<i64>,
}

impl Location {
    /// Kathmandu, the server's default observer.
    #[must_use]
    pub fn kathmandu() -> Self {
        Self {
            lat: 27.7172,
            lon: 85.324,
            zone: Zone::kathmandu(),
            name: "Kathmandu".to_owned(),
            city_id: None,
        }
    }

    /// The observer for the astronomy (latitude, longitude, zone).
    #[must_use]
    pub fn observer(&self) -> Observer {
        Observer {
            latitude: self.lat,
            longitude: self.lon,
            zone: self.zone.clone(),
        }
    }

    /// `ObserverLocation.as_dict()`.
    #[must_use]
    pub fn as_json(&self) -> Value {
        let mut m = Map::new();
        m.insert("lat".into(), json!(self.lat));
        m.insert("lon".into(), json!(self.lon));
        m.insert("timezone".into(), json!(self.zone.name()));
        m.insert("name".into(), json!(self.name));
        if let Some(id) = self.city_id {
            m.insert("city_id".into(), json!(id));
        }
        Value::Object(m)
    }
}

/// Why a daily panchanga could not be built.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[non_exhaustive]
pub enum DailyError {
    /// The day is before 1582-10-15 or BCE: its pre-`datetime` path is not ported yet.
    #[error("{0}: days before 1582-10-15 are not ported to Rust yet")]
    BeforeGregorian(CivilDay),
    /// The Sun does not rise or set that day at this latitude.
    #[error("no sunrise or sunset on {0} at this latitude")]
    NoSunrise(CivilDay),
    /// The Nepal Sambat new year could not be placed in the BS year.
    #[error("no Nepal Sambat new year found for {0}")]
    NepalSambat(CivilDay),
    /// The Bikram Sambat date could not be resolved.
    #[error(transparent)]
    Calendar(#[from] calendar::BsError),
}

fn utc(moment: Option<Moment>, day: CivilDay) -> Result<UtcInstant, DailyError> {
    match moment {
        Some(Moment::Utc(i)) => Ok(i),
        Some(Moment::Jd(_)) => Err(DailyError::BeforeGregorian(day)),
        None => Err(DailyError::NoSunrise(day)),
    }
}

/// `to_nepali_digits`: every ASCII digit in the text written in Devanagari.
pub fn nepali_digits(n: impl std::fmt::Display) -> String {
    n.to_string()
        .chars()
        .map(|c| {
            c.to_digit(10).map_or(c, |d| {
                ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'][d as usize]
            })
        })
        .collect()
}

/// How `local_time_short` is cut from the clock.
#[derive(Debug, Clone, Copy)]
pub(crate) enum ShortClock {
    /// Rounded to the nearest minute, as almanacs print rise and set.
    NearestMinute,
    /// Truncated, which keeps a window end at or before the real instant.
    Truncated,
}

/// An index computed from a non-negative angle ratio.
pub(crate) fn idx(i: i64) -> usize {
    usize::try_from(i).expect("angle indices are non-negative")
}

/// `_time_block`: UTC and local ISO, `HH:MM:SS`, and `HH:MM` (rounded to the nearest
/// minute for rise/set, truncated otherwise).
pub(crate) fn time_block<I: PyInstant>(at: I, zone: &Zone, short: ShortClock) -> Value {
    let wall = at.wall(zone);
    let short = match short {
        ShortClock::NearestMinute => at.add_seconds(30).wall(zone).hm,
        ShortClock::Truncated => wall.hm.clone(),
    };
    match at.as_jd_instant() {
        None => {
            json!({"utc": at.to_string(), "local": wall.iso, "local_time": wall.hms, "local_time_short": short})
        }
        // `format_ut_instant_local` keys, then `_time_block` adds the expanded UTC ISO.
        Some(jd) => json!({
            "utc_jd": Value::from(jd).to_string(), "local": wall.iso, "local_time": wall.hms,
            "local_time_short": short, "utc": at.to_string(),
        }),
    }
}

/// Python's `min(a, b)`: `a` unless `b` is strictly earlier.
pub fn py_min<I: PartialOrd>(a: I, b: I) -> I {
    if b < a { b } else { a }
}

/// `time_from_sunrise`: elapsed ghati:pala:vipala and hours since sunrise, and the local clock.
pub(crate) struct FromSunrise {
    pub(crate) seconds: i64,
    pub(crate) ghati_clock: String,
    pub(crate) hours_clock: String,
    pub(crate) local_time: String,
}

pub(crate) fn from_sunrise<I: PyInstant>(end: I, sunrise: I, zone: &Zone) -> FromSunrise {
    let mut delta = end.seconds_since(sunrise);
    if delta < 0.0 {
        delta += 86400.0;
    }
    let ghati = py_int(py_floordiv(delta, 1440.0));
    let rem_minutes = py_mod(delta, 1440.0) / 60.0;
    let pala = py_int(rem_minutes * 60.0 / 24.0);
    let vipala = py_int(py_mod(rem_minutes * 60.0, 24.0) * (60.0 / 24.0));
    let hours = py_int(py_floordiv(delta, 3600.0));
    let minutes = py_int(py_floordiv(py_mod(delta, 3600.0), 60.0));
    let seconds = py_int(py_mod(delta, 60.0));
    FromSunrise {
        seconds: py_round_int(delta),
        ghati_clock: format!("{ghati}:{pala:02}:{vipala:02}"),
        hours_clock: format!("{hours}:{minutes:02}:{seconds:02}"),
        local_time: end.wall(zone).hms,
    }
}

/// `compute_dinamaan` / `seconds_to_ghadi_pala`.
fn day_length<I: PyInstant>(from: I, to: I) -> Value {
    let total = to.seconds_since(from);
    let ghadi = py_int(py_floordiv(total, 1440.0));
    let remaining = py_mod(total, 1440.0);
    let pala = py_int(py_floordiv(remaining, 24.0));
    let vipala = py_int(py_mod(remaining, 24.0) * (60.0 / 24.0));
    let hours = py_int(py_floordiv(total, 3600.0));
    let minutes = py_int(py_floordiv(py_mod(total, 3600.0), 60.0));
    let seconds = py_int(py_mod(total, 60.0));
    let label_ne = format!("{ghadi} घडी {pala} पला");
    let label_en = format!("{hours}hr {minutes}min");
    json!({
        "ghadi": ghadi, "pala": pala, "vipala": vipala, "hours": hours, "minutes": minutes, "seconds": seconds,
        "total_minutes": py_round_int(total / 60.0),
        "label_ne": label_ne, "label_en": label_en,
        "label_en_full": format!("{hours} Hours {minutes} Mins {seconds:02} Secs"),
        "label_ne_full": format!("{hours} घण्टा {minutes} मिनेट {seconds:02} सेकेन्ड"),
        "label_full_ne": format!("{label_ne} - {label_en}"),
    })
}

fn end_fields<I: PyInstant>(
    target: &mut Map<String, Value>,
    end: I,
    sunrise: I,
    zone: &Zone,
) -> i64 {
    let info = from_sunrise(end, sunrise, zone);
    target.insert("end_time".into(), json!(end.to_string()));
    target.insert("end_ghati_clock".into(), json!(info.ghati_clock));
    target.insert("end_hours_clock".into(), json!(info.hours_clock));
    target.insert("end_local_time".into(), json!(info.local_time));
    info.seconds
}

/// Number and names of an anga, as `_element_with_span` takes them.
struct Named {
    number: u32,
    name: &'static str,
    name_ne: &'static str,
}

/// `_element_with_span`.
fn element<I: PyInstant>(
    sunrise: I,
    zone: &Zone,
    current: &Named,
    progress: Option<f64>,
    span: (I, I),
    next: &Named,
) -> Map<String, Value> {
    let (start, end) = span;
    let s = from_sunrise(start, sunrise, zone);
    let mut block = Map::new();
    block.insert("number".into(), json!(current.number));
    block.insert("name".into(), json!(current.name));
    block.insert("name_ne".into(), json!(current.name_ne));
    block.insert(
        "progress".into(),
        progress.map_or(Value::Null, |p| json!(p)),
    );
    block.insert("start_time".into(), json!(start.to_string()));
    block.insert("start_ghati_clock".into(), json!(s.ghati_clock));
    block.insert("start_hours_clock".into(), json!(s.hours_clock));
    block.insert("start_local_time".into(), json!(s.local_time));
    end_fields(&mut block, end, sunrise, zone);
    block.insert(
        "next".into(),
        json!({"number": next.number, "name": next.name, "name_ne": next.name_ne}),
    );
    block
}

fn tithi_named(t: &Tithi) -> Named {
    let name_ne = match (t.display_number, t.paksha) {
        (15, Paksha::Shukla) => "पूर्णिमा",
        (15, Paksha::Krishna) => "औंसी",
        (n, _) => TITHI_NAMES_NE[n as usize - 1],
    };
    Named {
        number: t.number,
        name: t.name(),
        name_ne,
    }
}

fn next_cyclic(current: u32, size: u32) -> u32 {
    if current >= size { 1 } else { current + 1 }
}

/// End times on `next`, and a third anga on `next.next` when the second ends before the next sunrise.
fn enrich_next<I: PyInstant>(
    block: &mut Map<String, Value>,
    end: I,
    sunrise: I,
    zone: &Zone,
    find_end: impl Fn(I) -> I,
    third: impl Fn(I, u32) -> Named,
) {
    // Python reads the end back from the printed `end_time` (`_parse_instant`),
    // which rounds a Julian Day instant to the microsecond.
    let end = I::parse_py(&end.to_string()).unwrap_or(end);
    let next_end = find_end(end.add_seconds(90));
    let Some(Value::Object(next)) = block.get_mut("next") else {
        return;
    };
    let next_number = next
        .get("number")
        .and_then(Value::as_u64)
        .and_then(|n| u32::try_from(n).ok())
        .unwrap_or(0);
    if end_fields(next, next_end, sunrise, zone) >= SECONDS_IN_DAY {
        return;
    }
    let after = next_end.add_seconds(90);
    let named = third(after, next_number);
    let mut third_block = Map::new();
    third_block.insert("number".into(), json!(named.number));
    third_block.insert("name".into(), json!(named.name));
    third_block.insert("name_ne".into(), json!(named.name_ne));
    end_fields(&mut third_block, find_end(after), sunrise, zone);
    next.insert("next".into(), Value::Object(third_block));
}

/// `build_tithi_block(dt, sunrise_dt, …)`: the tithi running at `at`, clocks from `origin`.
pub(crate) fn tithi_block<I: PyInstant>(at: I, origin: I, zone: &Zone, info: &Tithi) -> Value {
    let (start, end) = (tithi_start(at), tithi_end(at));
    let next = tithi(end.add_seconds(90).to_jd());
    let mut block = element(
        origin,
        zone,
        &tithi_named(info),
        Some(py_round(info.progress, 4)),
        (start, end),
        &tithi_named(&next),
    );
    enrich_next(&mut block, end, origin, zone, tithi_end, |after, _| {
        tithi_named(&tithi(after.to_jd()))
    });
    Value::Object(block)
}

fn star_named(number: u32, names: &[&'static str; 27], names_ne: &[&'static str; 27]) -> Named {
    Named {
        number,
        name: names[number as usize - 1],
        name_ne: names_ne[number as usize - 1],
    }
}

/// `build_nakshatra_block(dt, sunrise_dt, …)`.
pub(crate) fn nakshatra_block<I: PyInstant>(at: I, origin: I, zone: &Zone) -> Value {
    let jd = at.to_jd();
    let nak = nakshatra(jd);
    let pada = (py_int(py_mod(moon_longitude(jd), NAKSHATRA_SPAN) / PADA_SPAN) + 1).min(4);
    let (start, end) = (nakshatra_start(at), nakshatra_end(at));
    let current = star_named(nak.number, &NAKSHATRA_NAMES, &NAKSHATRA_NAMES_NE);
    let next = star_named(
        next_cyclic(nak.number, 27),
        &NAKSHATRA_NAMES,
        &NAKSHATRA_NAMES_NE,
    );
    let mut block = element(
        origin,
        zone,
        &current,
        Some(py_round(nak.progress, 4)),
        (start, end),
        &next,
    );
    block.insert("pada".into(), json!(pada));
    enrich_next(&mut block, end, origin, zone, nakshatra_end, |_, n| {
        star_named(next_cyclic(n, 27), &NAKSHATRA_NAMES, &NAKSHATRA_NAMES_NE)
    });
    Value::Object(block)
}

/// `build_yoga_block(dt, sunrise_dt, …)`.
pub(crate) fn yoga_block<I: PyInstant>(at: I, origin: I, zone: &Zone) -> Value {
    let y = yoga(at.to_jd());
    let (start, end) = (yoga_start(at), yoga_end(at));
    let current = star_named(y.number, &YOGA_NAMES, &YOGA_NAMES_NE);
    let next = star_named(next_cyclic(y.number, 27), &YOGA_NAMES, &YOGA_NAMES_NE);
    let mut block = element(
        origin,
        zone,
        &current,
        Some(py_round(y.progress, 4)),
        (start, end),
        &next,
    );
    enrich_next(&mut block, end, origin, zone, yoga_end, |_, n| {
        star_named(next_cyclic(n, 27), &YOGA_NAMES, &YOGA_NAMES_NE)
    });
    Value::Object(block)
}

fn karana_named(jd: f64) -> Named {
    let k = karana(jd);
    let name = k.name();
    let index = KARANA_NAMES.iter().position(|n| *n == name).unwrap_or(0);
    Named {
        number: k.number,
        name,
        name_ne: KARANA_NAMES_NE[index],
    }
}

/// `build_karana_block(dt, sunrise_dt, …)`.
pub(crate) fn karana_block<I: PyInstant>(at: I, origin: I, zone: &Zone) -> Value {
    let (start, end) = (karana_start(at), karana_end(at));
    let next = karana_named(end.add_seconds(90).to_jd());
    let mut block = element(
        origin,
        zone,
        &karana_named(at.to_jd()),
        None,
        (start, end),
        &next,
    );
    if let Some(Value::Object(next)) = block.get_mut("next") {
        end_fields(next, karana_end(end.add_seconds(90)), origin, zone);
    }
    Value::Object(block)
}

fn rashi_payload(longitude: f64) -> Value {
    let index = idx(py_int(longitude / 30.0) % 12);
    json!({
        "number": index + 1, "name": RASHI_NAMES[index], "name_ne": RASHI_NAMES_NE[index],
        "longitude": py_round(longitude, 6), "progress": py_round(py_mod(longitude, 30.0) / 30.0, 4),
    })
}

pub(crate) fn moon_phase(jd: f64) -> Value {
    let (sun, moon) = sun_moon_longitudes(jd);
    let elongation = py_mod(moon - sun, 360.0);
    let index = idx(py_int(py_floordiv(py_mod(elongation + 22.5, 360.0), 45.0)));
    let (phase_angle, lit) = moon_phase_angle_and_fraction(jd);
    json!({
        "elongation": py_round(elongation, 6), "phase_index": index, "name": PHASE_NAMES[index],
        "name_ne": PHASE_NAMES_NE[index], "illuminated_fraction": py_round(lit, 6),
        "phase_angle": py_round(phase_angle, 6), "is_waxing": elongation < 180.0,
        "age_days": py_round(elongation / 360.0 * SYNODIC_MONTH_DAYS, 4),
    })
}

/// End fields on a span, unless it runs to the next sunrise (`_attach_end`).
fn attach_end<I: PyInstant>(
    span: &mut Map<String, Value>,
    end: I,
    sunrise: I,
    day_end: I,
    zone: &Zone,
) {
    if end >= day_end {
        return;
    }
    let info = from_sunrise(end, sunrise, zone);
    let short = info.local_time.get(..5).unwrap_or_default().to_owned();
    span.insert("end_time".into(), json!(end.to_string()));
    span.insert("end_local_time".into(), json!(info.local_time));
    span.insert("end_local_time_short".into(), json!(short));
    span.insert("end_hours_clock".into(), json!(info.hours_clock));
    span.insert("end_ghati_clock".into(), json!(info.ghati_clock));
}

fn chandra_rashi_spans<I: PyInstant>(sunrise: I, next_sunrise: I, zone: &Zone) -> Value {
    let mut spans = Vec::new();
    let mut cursor = sunrise;
    while cursor < next_sunrise && spans.len() < 4 {
        let index = idx(py_int(moon_longitude(cursor.to_jd()) / 30.0) % 12);
        let end = py_min(moon_rashi_end(cursor), next_sunrise);
        let mut span = Map::new();
        span.insert("number".into(), json!(index + 1));
        span.insert("name".into(), json!(RASHI_NAMES[index]));
        span.insert("name_ne".into(), json!(RASHI_NAMES_NE[index]));
        attach_end(&mut span, end, sunrise, next_sunrise, zone);
        spans.push(Value::Object(span));
        if end >= next_sunrise {
            break;
        }
        cursor = end.add_seconds(90);
    }
    Value::Array(spans)
}

fn nakshatra_pada_spans<I: PyInstant>(sunrise: I, next_sunrise: I, zone: &Zone) -> Value {
    let mut spans = Vec::new();
    let mut cursor = sunrise;
    while cursor < next_sunrise && spans.len() < 8 {
        let moon = moon_longitude(cursor.to_jd());
        let mut number = py_int(moon / NAKSHATRA_SPAN) + 1;
        if number > 27 {
            number = 1;
        }
        let pada = (py_int(py_mod(moon, NAKSHATRA_SPAN) / PADA_SPAN) + 1).min(4);
        let end = py_min(moon_pada_end(cursor), next_sunrise);
        let i = usize::try_from(number - 1).unwrap_or(0);
        let mut span = Map::new();
        span.insert("nakshatra_number".into(), json!(number));
        span.insert("nakshatra_name".into(), json!(NAKSHATRA_NAMES[i]));
        span.insert("nakshatra_name_ne".into(), json!(NAKSHATRA_NAMES_NE[i]));
        span.insert("pada".into(), json!(pada));
        span.insert("pada_ne".into(), json!(nepali_digits(pada)));
        attach_end(&mut span, end, sunrise, next_sunrise, zone);
        spans.push(Value::Object(span));
        if end >= next_sunrise {
            break;
        }
        cursor = end.add_seconds(90);
    }
    Value::Array(spans)
}

fn surya_nakshatra(jd: f64) -> Value {
    let mut number = py_int(sun_longitude(jd) / NAKSHATRA_SPAN) + 1;
    if number > 27 {
        number = 1;
    }
    let i = usize::try_from(number - 1).unwrap_or(0);
    json!({"number": number, "name": NAKSHATRA_NAMES[i], "name_ne": NAKSHATRA_NAMES_NE[i]})
}

/// The sun and moon events that frame a panchanga day (sunrise to next sunrise).
#[derive(Clone, Copy)]
pub(crate) struct DayTimes<I = UtcInstant> {
    pub(crate) sunrise: I,
    pub(crate) sunset: I,
    pub(crate) next_sunrise: I,
    /// The first moonrise after sunrise, if it comes before the next sunrise.
    moonrise: Option<I>,
    /// The first moonset after sunrise, if it comes before the next sunrise.
    moonset: Option<I>,
}

/// Sunrise, sunset and the next sunrise of a civil day.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SunTimes {
    /// Sunrise on the day.
    pub sunrise: UtcInstant,
    /// Sunset on the day.
    pub sunset: UtcInstant,
    /// Sunrise on the following day.
    pub next_sunrise: UtcInstant,
}

/// `sun_service.sunrise` for a civil day at the observer.
///
/// # Errors
///
/// [`DailyError`] when the Sun does not rise (polar night) or the day is before 1582.
pub fn sunrise_on(day: CivilDay, location: &Location) -> Result<UtcInstant, DailyError> {
    utc(
        rise_set_on_day(Body::Sun, day, &location.observer(), Crossing::Rise),
        day,
    )
}

/// An instant kind a sunrise can be read as: a `datetime` ([`UtcInstant`], days from
/// 1582-10-15) or a Julian Day ([`JdInstant`], any day — Python's `sun_service.sunrise`
/// hands back a `UtInstant` for days `datetime` cannot hold).
pub trait SunriseInstant: PyInstant {
    /// Sunrise on `day` at the observer.
    ///
    /// # Errors
    ///
    /// [`DailyError`] when the Sun does not rise, or (for a `datetime`) the day is
    /// before 1582-10-15.
    fn sunrise_on(day: CivilDay, location: &Location) -> Result<Self, DailyError>;
}

impl SunriseInstant for UtcInstant {
    fn sunrise_on(day: CivilDay, location: &Location) -> Result<Self, DailyError> {
        sunrise_on(day, location)
    }
}

impl SunriseInstant for JdInstant {
    fn sunrise_on(day: CivilDay, location: &Location) -> Result<Self, DailyError> {
        rise_set_on_day(Body::Sun, day, &location.observer(), Crossing::Rise)
            .map(|m| Self(m.to_jd()))
            .ok_or(DailyError::NoSunrise(day))
    }
}

/// Sunrise, sunset and the next sunrise, without the Moon events.
///
/// # Errors
///
/// [`DailyError`] when any of the three cannot be found.
pub fn sun_times(day: CivilDay, location: &Location) -> Result<SunTimes, DailyError> {
    let observer = location.observer();
    let sunrise = utc(
        rise_set_on_day(Body::Sun, day, &observer, Crossing::Rise),
        day,
    )?;
    let sunset = utc(
        rise_set_on_day(Body::Sun, day, &observer, Crossing::Set),
        day,
    )?;
    let next_day = day.add_days(1);
    let next_sunrise = utc(
        rise_set_on_day(Body::Sun, next_day, &observer, Crossing::Rise),
        next_day,
    )?;
    Ok(SunTimes {
        sunrise,
        sunset,
        next_sunrise,
    })
}

pub(crate) fn day_times(day: CivilDay, location: &Location) -> Result<DayTimes, DailyError> {
    day_times_as(day, location, |m| match m {
        Moment::Utc(i) => Some(i),
        Moment::Jd(_) => None,
    })
}

/// [`day_times`] for a day Python holds as Julian Day instants (`UtInstant`).
pub(crate) fn day_times_jd(
    day: CivilDay,
    location: &Location,
) -> Result<DayTimes<JdInstant>, DailyError> {
    // Next to the cutover a CE event arrives as a `datetime`; its Julian Day is
    // what `UtInstant` arithmetic would read from it.
    day_times_as(day, location, |m| Some(JdInstant(m.to_jd())))
}

fn day_times_as<I: PyInstant>(
    day: CivilDay,
    location: &Location,
    convert: impl Fn(Moment) -> Option<I>,
) -> Result<DayTimes<I>, DailyError> {
    let observer = location.observer();
    let event = |d: CivilDay, crossing| match rise_set_on_day(Body::Sun, d, &observer, crossing) {
        Some(m) => convert(m).ok_or(DailyError::BeforeGregorian(d)),
        None => Err(DailyError::NoSunrise(d)),
    };
    let sunrise = event(day, Crossing::Rise)?;
    let sunset = event(day, Crossing::Set)?;
    let next_sunrise = event(day.add_days(1), Crossing::Rise)?;
    let moon_event = |crossing| {
        rise_set_after(Body::Moon, Moment::Jd(sunrise.to_jd()), &observer, crossing)
            .and_then(&convert)
            .filter(|t| *t < next_sunrise)
    };
    let (moonrise, moonset) = (moon_event(Crossing::Rise), moon_event(Crossing::Set));
    Ok(DayTimes {
        sunrise,
        sunset,
        next_sunrise,
        moonrise,
        moonset,
    })
}

/// `paksha_block`: the paksha with its pūrṇimānta month label.
fn paksha_block(lunar: &Value, paksha: Paksha) -> Value {
    let month_name = lunar["purnimanta_name"]
        .as_str()
        .or_else(|| lunar["name"].as_str())
        .unwrap_or("Unknown");
    let is_adhik = lunar
        .get("purnimanta_is_adhik")
        .map_or(lunar["is_adhik"].as_bool(), Value::as_bool)
        .unwrap_or(false);
    let month_ne = match lunar["purnimanta_name_ne"].as_str() {
        Some(ne) if !ne.is_empty() => ne.to_owned(),
        _ => BS_MONTH_NAMES
            .iter()
            .position(|n| *n == month_name)
            .map_or(month_name, |i| BS_MONTH_NAMES_NE[i])
            .to_owned(),
    };
    let paksha_ne = match paksha {
        Paksha::Shukla => "शुक्ल पक्ष",
        Paksha::Krishna => "कृष्ण पक्ष",
    };
    let prefix = if is_adhik { "अधिक " } else { "" };
    json!({
        "name": paksha.name(),
        "name_ne": paksha_ne,
        "lunar_month": month_name,
        "lunar_month_ne": month_ne,
        "is_adhik": is_adhik,
        "label_ne": format!("{prefix}{month_ne} {paksha_ne}"),
        "label_en": format!("{}{month_name} {} paksha", if is_adhik { "Adhik " } else { "" }, paksha.name()),
    })
}

/// `_display_headers`: the BS, Gregorian and Nepal Sambat header lines.
fn display_headers(day: CivilDay, bs: calendar::BsDate, vaara_english: &str, ns: &Value) -> Value {
    const MONTH_ABBR: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "a Julian Day Number is positive and fits"
    )]
    let weekday = ((day.to_jd_ut() + 0.5) as i64 % 7) as usize; // Monday = 0
    json!({
        "bs_ne": format!(
            "वि.सं. {} {} {} {}",
            nepali_digits(bs.year), BS_MONTH_NAMES_NE[bs.month as usize - 1], nepali_digits(bs.day), VAARA_NAMES_NE[(weekday + 1) % 7]
        ),
        "gregorian_en": format!("{} {} {}, {vaara_english}", day.year, MONTH_ABBR[day.month as usize - 1], day.day),
        "ns_ne": format!("ने.सं. {} {}", nepali_digits(ns["year"].as_i64().unwrap_or(0)), ns["label_ne"].as_str().unwrap_or_default()),
    })
}

/// Every key of the Python daily payload, in the Python order.
pub const PAYLOAD_KEYS: [&str; 54] = [
    "date",
    "date_ad",
    "jd_ut",
    "anchor",
    "display",
    "bs_date",
    "samvatsara",
    "ns_date",
    "location",
    "sunrise",
    "sunset",
    "day_ghati",
    "choghadiya",
    "hora",
    "solar_corrections",
    "moonrise",
    "moonset",
    "dinamaan",
    "ratrimana",
    "madhyahna",
    "lahiri_ayanamsa",
    "aayan",
    "aayan_vedic",
    "vaara",
    "tithi",
    "nakshatra",
    "yoga",
    "karana",
    "paksha",
    "chandra_rashi",
    "moon_phase",
    "chandra_rashi_spans",
    "nakshatra_pada_spans",
    "surya_rashi",
    "surya_nakshatra",
    "ritu",
    "ritu_vedic",
    "lunar_month",
    "lunar_calendar",
    "planets",
    "planets_anchor",
    "lagna",
    "lagna_spans",
    "udaya_lagna",
    "chandrabalam",
    "tarabalam",
    "tarabala_table",
    "chandrabala_table",
    "rashifal",
    "panchaka_rahita",
    "muhurta",
    "nivas_shool",
    "markers",
    "ayanamsa",
];

/// `build_daily_panchanga(target, location)` for a CE day (1582-10-15 on): every block
/// ported so far, in the Python key order (see [`PAYLOAD_KEYS`]).
///
/// # Errors
///
/// [`DailyError::BeforeGregorian`] for earlier days (use [`build_daily_civil`]),
/// [`DailyError::NoSunrise`] where the Sun does not rise, [`DailyError::NepalSambat`]
/// when the NS new year cannot be placed, and calendar errors from the BS conversion.
pub fn build_daily(day: CivilDay, location: &Location) -> Result<Value, DailyError> {
    if !day.is_datetime_range() {
        return Err(DailyError::BeforeGregorian(day));
    }
    assemble(day, day_times(day, location)?, location, None)
}

/// `build_daily_panchanga_civil`: the udaya panchanga of a civil day on the signed
/// patro axis, for days `datetime` cannot hold (before 1582-10-15, and BCE).
///
/// The astronomy is the CE path's, on Julian Day instants (`UtInstant`); the
/// labelling is Python's `patro_bs` fork: the given BS/BBS date, the lunar month and
/// Nepal Sambat stubbed (the CE-only engines cannot place them), no muhurta
/// enrichment and no pushkara navamsha.
///
/// # Errors
///
/// [`DailyError::NoSunrise`] where the Sun does not rise.
pub fn build_daily_civil(
    day: CivilDay,
    location: &Location,
    patro: calendar::BsDate,
) -> Result<Value, DailyError> {
    assemble(day, day_times_jd(day, location)?, location, Some(patro))
}

/// The blocks Python builds differently for a `datetime` and a `UtInstant` sunrise.
trait DayInstant: PyInstant {
    fn muhurta_block(sunrise: Self, sunset: Self, next: Self, vaara: u32, zone: &Zone) -> Value;
    fn lagna_rows(
        sunrise: Self,
        next: Self,
        lat: f64,
        lon: f64,
        zone: &Zone,
    ) -> Vec<crate::blocks_lagna::LagnaSpan<Self>>;
}

impl DayInstant for UtcInstant {
    fn muhurta_block(sunrise: Self, sunset: Self, next: Self, vaara: u32, zone: &Zone) -> Value {
        muhurta(sunrise, sunset, next, vaara, zone)
    }

    fn lagna_rows(
        sunrise: Self,
        next: Self,
        lat: f64,
        lon: f64,
        zone: &Zone,
    ) -> Vec<crate::blocks_lagna::LagnaSpan<Self>> {
        lagna_spans(sunrise, next, lat, lon, zone)
    }
}

impl DayInstant for JdInstant {
    fn muhurta_block(sunrise: Self, sunset: Self, _next: Self, vaara: u32, zone: &Zone) -> Value {
        muhurta_civil(sunrise, sunset, vaara, zone)
    }

    fn lagna_rows(
        sunrise: Self,
        next: Self,
        lat: f64,
        lon: f64,
        zone: &Zone,
    ) -> Vec<crate::blocks_lagna::LagnaSpan<Self>> {
        lagna_spans_plain(sunrise, next, lat, lon, zone)
    }
}

/// `_lunar_stub_for_solar_month`: pūrṇimānta labels from the solar month.
fn lunar_stub(bs_month: u32, paksha: Paksha) -> Value {
    let (name, name_ne) = (
        BS_MONTH_NAMES[bs_month as usize - 1],
        BS_MONTH_NAMES_NE[bs_month as usize - 1],
    );
    json!({
        "name": name, "purnimanta_name": name, "purnimanta_name_ne": name_ne, "name_ne": name_ne,
        "is_adhik": false, "purnimanta_is_adhik": false, "source": "solar_month_stub",
        "paksha": paksha.name(),
    })
}

/// `_lunar_calendar_stub`.
fn lunar_calendar_stub(lunar: &Value, paksha: Paksha) -> Value {
    json!({
        "purnimant": {"name": lunar["purnimanta_name"], "name_ne": lunar["purnimanta_name_ne"], "paksha": paksha.name(), "is_adhik": false},
        "amant": {"name": lunar["name"], "name_ne": lunar["name_ne"], "paksha": paksha.name(), "is_adhik": false},
        "source": "solar_month_stub",
    })
}

/// `_display_headers_civil`.
fn display_headers_civil(date_ad: &str, bs: calendar::BsDate, vaara: usize, ns: &Value) -> Value {
    let month_ne = BS_MONTH_NAMES_NE[bs.month as usize - 1];
    let year = if bs.year < 0 {
        format!("BBS {}", nepali_digits(bs.year.unsigned_abs()))
    } else {
        format!("वि.सं. {}", nepali_digits(bs.year))
    };
    json!({
        "bs_ne": format!("{year} {month_ne} {} {}", nepali_digits(bs.day), VAARA_NAMES_NE[vaara]),
        "gregorian_en": format!("{date_ad} {}", VAARA_ENGLISH[vaara]),
        "ns_ne": format!("ने.सं. {} {}", nepali_digits(ns["year"].as_i64().unwrap_or(0)), ns["label_ne"].as_str().unwrap_or_default()),
    })
}

#[expect(
    clippy::too_many_lines,
    reason = "one block per payload key, in the Python order"
)]
fn assemble<I: DayInstant>(
    day: CivilDay,
    times: DayTimes<I>,
    location: &Location,
    patro: Option<calendar::BsDate>,
) -> Result<Value, DailyError> {
    let zone = &location.zone;
    let observer = location.observer();
    let DayTimes {
        sunrise,
        sunset,
        next_sunrise,
        moonrise,
        moonset,
    } = times;
    let sunrise_jd = sunrise.to_jd();
    let tithi_info = tithi(sunrise_jd);
    let vaara = vara(sunrise_jd, zone);
    let day_s = sunset.seconds_since(sunrise);
    let night_s = next_sunrise.seconds_since(sunset);
    let ayanamsa =
        json!({"name": "Surya Siddhanta", "degrees": py_round(ayanamsha(sunrise_jd), 6)});
    let display = tithi_info.display_number;
    let paksha = tithi_info.paksha;
    let vaara_english = VAARA_ENGLISH[vaara.number as usize];
    let date_ad = day.to_string();
    let (bs, lunar, lunar_layers, ns, headers, solar_day) = if let Some(bs) = patro {
        let lunar = lunar_stub(bs.month, paksha);
        let layers = lunar_calendar_stub(&lunar, paksha);
        let ns = json!({"year": 0, "label_ne": "—", "label_en": "—", "available": false});
        let headers = display_headers_civil(&date_ad, bs, vaara.number as usize, &ns);
        (bs, lunar, layers, ns, headers, civil_probe_day())
    } else {
        let bs = calendar::civil_to_bs(day)?;
        let lunar = merge_for_day(day, paksha, &observer);
        let ns = ns_date(
            &NsInput {
                day,
                bs_year: bs.year,
                tithi_display: display,
                tithi_absolute: tithi_info.number,
                tithi_name_ne: tithi_named(&tithi_info).name_ne,
                paksha,
                lunar_month_name: lunar["name"].as_str(),
                is_adhik: lunar["is_adhik"].as_bool().unwrap_or(false),
            },
            &observer,
        )
        .ok_or(DailyError::NepalSambat(day))?;
        let headers = display_headers(day, bs, vaara_english, &ns);
        let layers = calendar_layers(day, paksha, &observer);
        (bs, lunar, layers, ns, headers, day)
    };

    let mut b: HashMap<&'static str, Value> = HashMap::new();
    b.insert("date", json!(date_ad));
    b.insert("date_ad", json!(date_ad));
    b.insert("jd_ut", json!(day.to_jd_ut()));
    b.insert("anchor", json!("sunrise"));
    b.insert("display", headers);
    b.insert("bs_date", json!({
        "year": bs.year, "month": bs.month, "day": bs.day,
        "month_name": BS_MONTH_NAMES[bs.month as usize - 1], "month_name_ne": BS_MONTH_NAMES_NE[bs.month as usize - 1],
    }));
    b.insert("samvatsara", samvatsara_payload(bs.year));
    b.insert("ns_date", ns);
    b.insert("location", location.as_json());
    b.insert(
        "sunrise",
        time_block(sunrise, zone, ShortClock::NearestMinute),
    );
    b.insert(
        "sunset",
        time_block(sunset, zone, ShortClock::NearestMinute),
    );
    let day_ghati = (day_s / (day_s + night_s) * 60.0).min(60.0);
    b.insert("day_ghati", json!(day_ghati));
    b.insert("choghadiya", choghadiya(day_ghati, vaara.number));
    b.insert(
        "hora",
        hora(sunrise, sunset, next_sunrise, vaara.number, zone),
    );
    b.insert(
        "solar_corrections",
        solar_corrections(solar_day, location.lat, location.lon, zone, sunrise),
    );
    b.insert(
        "muhurta",
        I::muhurta_block(sunrise, sunset, next_sunrise, vaara.number, zone),
    );
    let weekday_py = usize::try_from(i64::from(vaara.number) + 6).map_or(0, |w| w % 7);
    b.insert(
        "nivas_shool",
        nivas_shool(sunrise, next_sunrise, weekday_py, zone),
    );
    b.insert(
        "moonrise",
        moonrise.map_or(Value::Null, |t| time_block(t, zone, ShortClock::Truncated)),
    );
    b.insert(
        "moonset",
        moonset.map_or(Value::Null, |t| time_block(t, zone, ShortClock::Truncated)),
    );
    b.insert("dinamaan", day_length(sunrise, sunset));
    b.insert("ratrimana", day_length(sunset, next_sunrise));
    b.insert(
        "madhyahna",
        time_block(I::midpoint(sunrise, sunset), zone, ShortClock::Truncated),
    );
    b.insert("lahiri_ayanamsa", ayanamsa.clone());
    b.insert(
        "vaara",
        json!({
            "number": vaara.number, "name_sanskrit": VAARA_NAMES[vaara.number as usize],
            "name_english": vaara_english, "name_ne": VAARA_NAMES_NE[vaara.number as usize],
        }),
    );
    b.insert("aayan", aayan(sunrise_jd));
    b.insert("aayan_vedic", aayan_vedic(sunrise_jd));
    b.insert("tithi", tithi_block(sunrise, sunrise, zone, &tithi_info));
    let nak_block = nakshatra_block(sunrise, sunrise, zone);
    b.insert("tarabalam", tarabalam(sunrise, &nak_block, zone));
    b.insert("tarabala_table", tarabala_table(&nak_block));
    b.insert("nakshatra", nak_block);
    b.insert("yoga", yoga_block(sunrise, sunrise, zone));
    b.insert("karana", karana_block(sunrise, sunrise, zone));
    b.insert("paksha", paksha_block(&lunar, paksha));
    let chandra_rashi = rashi_payload(moon_longitude(sunrise_jd));
    let bala_table = chandrabala_table(&chandra_rashi);
    b.insert("rashifal", rashifal(&bala_table, vaara.number));
    b.insert("chandrabala_table", bala_table);
    b.insert("chandra_rashi", chandra_rashi);
    b.insert("moon_phase", moon_phase(sunrise_jd));
    let rashi_spans = chandra_rashi_spans(sunrise, next_sunrise, zone);
    b.insert("chandrabalam", chandrabalam(sunrise, &rashi_spans, zone));
    b.insert("chandra_rashi_spans", rashi_spans);
    b.insert(
        "nakshatra_pada_spans",
        nakshatra_pada_spans(sunrise, next_sunrise, zone),
    );
    b.insert("surya_rashi", rashi_payload(sun_longitude(sunrise_jd)));
    b.insert("surya_nakshatra", surya_nakshatra(sunrise_jd));
    b.insert("ritu", ritu(sunrise_jd, location.lat));
    b.insert("ritu_vedic", ritu_vedic(sunrise_jd, location.lat));
    b.insert("planets", planets(sunrise_jd));
    b.insert(
        "planets_anchor",
        json!({
            "type": "udayakal",
            "local_time": sunrise.add_seconds(30).wall(zone).hm,
            "label_ne": "उदयकालिक स्पष्टग्रह (सूर्योदय)",
            "label_en": "Udayakalika Spashtagraha (sunrise)",
        }),
    );
    b.insert("lagna", lagna(sunrise_jd, location.lat, location.lon));
    let spans = I::lagna_rows(sunrise, next_sunrise, location.lat, location.lon, zone);
    b.insert("udaya_lagna", udaya_lagna(&spans));
    b.insert(
        "panchaka_rahita",
        panchaka_rahita(sunrise, &spans, vaara.number, zone),
    );
    b.insert(
        "lagna_spans",
        Value::Array(spans.into_iter().map(|s| Value::Object(s.json)).collect()),
    );
    b.insert("lunar_calendar", lunar_layers);
    b.insert("lunar_month", lunar);
    b.insert(
        "markers",
        json!({
            "is_purnima": paksha == Paksha::Shukla && display == 15,
            "is_Aausi": paksha == Paksha::Krishna && display == 15,
            "is_ekadashi": display == 11,
        }),
    );
    b.insert("ayanamsa", ayanamsa);

    let mut payload = Map::new();
    for key in PAYLOAD_KEYS {
        if let Some(value) = b.remove(key) {
            payload.insert(key.to_owned(), value);
        }
    }
    Ok(Value::Object(payload))
}
