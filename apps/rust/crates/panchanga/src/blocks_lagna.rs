//! Planets (spashta graha), lagna, lagna spans with Pushkara Navamsha, udaya lagna and
//! panchaka rahita blocks of the daily payload.

use astronomy::{System, surya_siddhanta::Body};
use serde::Serialize;
use serde_json::{Map, Value, json};
use timescale::{PyInstant, UtcInstant, Zone};

use crate::{
    angas::{nakshatra_number, tithi_number},
    daily::{RASHI_NAMES, RASHI_NAMES_NE, from_sunrise, idx},
    payload::to_value,
    pyfloat::{py_int, py_mod, py_round, py_round_int},
};

/// `stable_round(value, 6)`: round to 9 places, then to 6.
fn stable_round(value: f64) -> f64 {
    py_round(py_round(value, 9), 6)
}

#[expect(
    clippy::cast_precision_loss,
    reason = "degree and minute counts are below 360"
)]
fn dms(value: f64, width: usize) -> String {
    let mut d = py_int(value);
    let m_frac = (value - d as f64) * 60.0;
    let mut m = py_int(m_frac);
    let mut s = py_round_int((m_frac - m as f64) * 60.0);
    if s >= 60 {
        s -= 60;
        m += 1;
    }
    if m >= 60 {
        m -= 60;
        d += 1;
    }
    format!("{d:0width$}°{m:02}'{s:02}\"")
}

struct Graha {
    key: &'static str,
    longitude: f64,
    speed: f64,
}

impl Graha {
    fn is_retrograde(&self) -> bool {
        match self.key {
            "rahu" | "ketu" => true,
            "sun" | "moon" => false,
            _ => self.speed < 0.0,
        }
    }

    fn is_combust(&self, sun: f64) -> bool {
        let diff = py_mod(self.longitude - sun, 360.0);
        let separation = diff.min(360.0 - diff);
        let retro = self.is_retrograde();
        match self.key {
            "mars" => separation < 17.0,
            "jupiter" => separation < 11.0,
            "saturn" => separation < 15.0,
            "venus" => separation < if retro { 8.0 } else { 10.0 },
            "mercury" => separation < if retro { 12.0 } else { 14.0 },
            "moon" => separation < 13.0,
            _ => false,
        }
    }

    fn payload(&self, sun: f64) -> Planet {
        let i = idx(py_int(self.longitude / 30.0) % 12);
        Planet {
            longitude: self.longitude,
            speed: self.speed,
            rashi: i + 1,
            rashi_name: RASHI_NAMES[i],
            rashi_ne: RASHI_NAMES_NE[i],
            dms: dms(self.longitude, 3),
            deg_in_rashi: py_round(py_mod(self.longitude, 30.0), 6),
            dms_in_rashi: dms(py_mod(self.longitude, 30.0), 2),
            is_retrograde: self.is_retrograde(),
            is_combust: self.is_combust(sun),
        }
    }
}

/// One graha of the spashta table.
#[derive(Debug, Serialize)]
pub(crate) struct Planet {
    longitude: f64,
    speed: f64,
    rashi: usize,
    rashi_name: &'static str,
    rashi_ne: &'static str,
    dms: String,
    deg_in_rashi: f64,
    dms_in_rashi: String,
    is_retrograde: bool,
    is_combust: bool,
}

/// `spashta_table`: every graha at sunrise, in the text's order with Ketu last.
#[derive(Debug, Serialize)]
pub(crate) struct PlanetTable {
    sun: Planet,
    moon: Planet,
    mercury: Planet,
    venus: Planet,
    mars: Planet,
    jupiter: Planet,
    saturn: Planet,
    rahu: Planet,
    ketu: Planet,
}

impl PlanetTable {
    pub(crate) fn new(system: System, jd: f64) -> Self {
        let grahas = spashta_grahas(system, jd);
        let sun = grahas[0].longitude;
        let row = |i: usize| grahas[i].payload(sun);
        Self {
            sun: row(0),
            moon: row(1),
            mercury: row(2),
            venus: row(3),
            mars: row(4),
            jupiter: row(5),
            saturn: row(6),
            rahu: row(7),
            ketu: row(8),
        }
    }
}

fn spashta_grahas(system: System, jd: f64) -> Vec<Graha> {
    const KEYS: [(&str, Body); 8] = [
        ("sun", Body::Sun),
        ("moon", Body::Moon),
        ("mercury", Body::Mercury),
        ("venus", Body::Venus),
        ("mars", Body::Mars),
        ("jupiter", Body::Jupiter),
        ("saturn", Body::Saturn),
        ("rahu", Body::Rahu),
    ];
    let mut grahas: Vec<Graha> = KEYS
        .iter()
        .map(|&(key, body)| {
            let (lon, speed) = system.true_longitude_and_speed(body, jd);
            Graha {
                key,
                longitude: stable_round(py_mod(lon, 360.0)),
                speed: stable_round(speed),
            }
        })
        .collect();
    let rahu = &grahas[7];
    let ketu = Graha {
        key: "ketu",
        longitude: stable_round(py_mod(rahu.longitude + 180.0, 360.0)),
        speed: stable_round(-rahu.speed),
    };
    grahas.push(ketu);
    grahas
}

/// One row of the spashta graha table (`spashta_table`), typed.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GrahaPosition {
    /// `sun`, `moon`, `mercury`, `venus`, `mars`, `jupiter`, `saturn`, `rahu`, `ketu`.
    pub key: &'static str,
    /// Sidereal longitude, `stable_round`ed to six places.
    pub longitude: f64,
    /// Degrees per day.
    pub speed: f64,
    /// `round(longitude % 30, 6)`.
    pub deg_in_rashi: f64,
    /// वक्री.
    pub is_retrograde: bool,
    /// अस्त.
    pub is_combust: bool,
}

/// `spashta_table(jd)` as typed rows, in the table's order (Sun … Rahu, Ketu).
#[must_use]
pub fn graha_positions(system: System, jd: f64) -> Vec<GrahaPosition> {
    let grahas = spashta_grahas(system, jd);
    let sun = grahas[0].longitude;
    grahas
        .iter()
        .map(|g| GrahaPosition {
            key: g.key,
            longitude: g.longitude,
            speed: g.speed,
            deg_in_rashi: py_round(py_mod(g.longitude, 30.0), 6),
            is_retrograde: g.is_retrograde(),
            is_combust: g.is_combust(sun),
        })
        .collect()
}

/// The graha table as a JSON tree, for callers that still build trees.
pub(crate) fn planets(system: System, jd: f64) -> Value {
    to_value(&PlanetTable::new(system, jd))
}

/// `planet_astro_extras(jd, graha)`: ecliptic latitude (शर), right ascension and
/// declination, each rounded to 4 places.
#[must_use]
pub fn graha_extras(system: System, jd: f64, key: &str) -> Option<(f64, f64, f64)> {
    let body = if key == "ketu" {
        Body::Rahu
    } else {
        key.parse::<Body>().ok()?
    };
    let (mut lon, mut lat) = system.true_position(body, jd);
    if key == "ketu" {
        lon = py_mod(lon + 180.0, 360.0);
        lat = -lat;
    }
    let (ra, dec) = system.equatorial(lon + system.ayanamsha(jd), lat, jd);
    Some((py_round(lat, 4), py_round(ra, 4), py_round(dec, 4)))
}

/// `ascendant_astro_extras(jd, lat, lon)`: the ascendant's right ascension,
/// declination and speed (°/day), each rounded to 4 places.
#[must_use]
pub fn ascendant_extras(system: System, jd: f64, lat: f64, lon: f64) -> (f64, f64, f64) {
    let sayana = system.ascendant_sayana(jd, lat, lon);
    let ahead = system.ascendant_sayana(jd + ASCENDANT_SPEED_STEP_DAYS, lat, lon);
    let speed = (py_mod(ahead - sayana + 540.0, 360.0) - 180.0) / ASCENDANT_SPEED_STEP_DAYS;
    let (ra, dec) = system.equatorial(sayana, 0.0, jd);
    (py_round(ra, 4), py_round(dec, 4), py_round(speed, 4))
}

/// `spashta_table` + `enrich_snapshot_astro`: the graha table with ecliptic latitude
/// (शर), right ascension and declination (क्रान्ति), as the at-time route reads it.
pub(crate) fn planets_with_extras(system: System, jd: f64) -> Value {
    let mut table = planets(system, jd);
    if let Value::Object(rows) = &mut table {
        for (key, row) in rows.iter_mut() {
            let body = if key == "ketu" {
                Body::Rahu
            } else {
                match key.parse::<Body>() {
                    Ok(b) => b,
                    Err(_) => continue,
                }
            };
            let (mut lon, mut lat) = system.true_position(body, jd);
            if key == "ketu" {
                lon = py_mod(lon + 180.0, 360.0);
                lat = -lat;
            }
            let (ra, dec) = system.equatorial(lon + system.ayanamsha(jd), lat, jd);
            if let Value::Object(fields) = row {
                fields.insert("latitude".into(), json!(py_round(lat, 4)));
                fields.insert("right_ascension".into(), json!(py_round(ra, 4)));
                fields.insert("declination".into(), json!(py_round(dec, 4)));
            }
        }
    }
    table
}

/// `ASCENDANT_SPEED_STEP_DAYS`: one minute.
const ASCENDANT_SPEED_STEP_DAYS: f64 = 60.0 / 86_400.0;

/// The lagna at an instant (`anchor: instant`) with `ascendant_astro_extras`.
pub(crate) fn instant_lagna(system: System, jd: f64, lat: f64, lon: f64) -> Value {
    let mut block = lagna(system, jd, lat, lon);
    let sayana = system.ascendant_sayana(jd, lat, lon);
    let ahead = system.ascendant_sayana(jd + ASCENDANT_SPEED_STEP_DAYS, lat, lon);
    let speed = (py_mod(ahead - sayana + 540.0, 360.0) - 180.0) / ASCENDANT_SPEED_STEP_DAYS;
    let (ra, dec) = system.equatorial(sayana, 0.0, jd);
    if let Value::Object(fields) = &mut block {
        fields.insert("anchor".into(), json!("instant"));
        fields.insert("latitude".into(), json!(0.0));
        fields.insert("right_ascension".into(), json!(py_round(ra, 4)));
        fields.insert("declination".into(), json!(py_round(dec, 4)));
        fields.insert("speed".into(), json!(py_round(speed, 4)));
    }
    block
}

/// `lagna_service.lagna`: the rising sign at sunrise.
pub(crate) fn lagna(system: System, jd: f64, lat: f64, lon: f64) -> Value {
    let asc = system.ascendant(jd, lat, lon);
    let i = idx(py_int(asc / 30.0) % 12);
    json!({
        "number": i + 1, "name": RASHI_NAMES[i], "name_ne": RASHI_NAMES_NE[i],
        "longitude": py_round(asc, 6), "degree_in_rashi": py_round(py_mod(asc, 30.0), 4), "anchor": "sunrise",
    })
}

/// When the ascendant next enters a new sign, in closed form (a four-hour search
/// window would miss the longer signs at high latitude; there is none now).
fn next_lagna_boundary(system: System, jd: f64, lat: f64, lon: f64) -> f64 {
    system
        .next_lagna_change(jd, lat, lon)
        .unwrap_or(jd + FALLBACK_SPAN_DAYS)
}

/// Where the ascendant never leaves its sign (beyond the polar circle), a span ends
/// after this many days.
const FALLBACK_SPAN_DAYS: f64 = 4.0 / 24.0;

const NAVAMSHA_DEG: f64 = 30.0 / 9.0;

fn pushkara_degrees(rashi_number: usize) -> [f64; 2] {
    let (a, b) = [(7.0, 9.0), (3.0, 5.0), (6.0, 8.0), (1.0, 3.0)][(rashi_number - 1) % 4];
    [(a - 1.0) * NAVAMSHA_DEG, (b - 1.0) * NAVAMSHA_DEG]
}

fn degree_in_rashi<I: PyInstant>(system: System, at: I, lat: f64, lon: f64) -> f64 {
    py_mod(system.ascendant(at.to_jd(), lat, lon), 30.0)
}

/// When the ascendant, inside lagna `rashi`'s span from `start` to `end`, reaches
/// `deg` degrees of the sign, solved directly. A degree the span starts on counts at
/// its start.
fn degree_crossing<I: PyInstant>(
    system: System,
    start: I,
    end: I,
    rashi: usize,
    deg: f64,
    lat: f64,
    lon: f64,
) -> Option<I> {
    if end <= start {
        return None;
    }
    let d_start = degree_in_rashi(system, start, lat, lon);
    if (d_start - deg).abs() < 0.03 || (deg == 0.0 && d_start < 0.5) {
        return Some(start);
    }
    #[expect(clippy::cast_precision_loss, reason = "a sign number is 1-12")]
    let target = 30.0 * (rashi - 1) as f64 + deg;
    let at = system.next_ascendant_crossing(start.to_jd(), lat, lon, target)?;
    // The ascendant moves ~0.004° a second: a crossing a few seconds past the end
    // still belongs to this span.
    (at <= end.to_jd() + END_SLACK_DAYS)
        .then(|| start.at_boundary(at))
        .flatten()
}

/// Seconds (in days) past a span's end a navamsha crossing is still counted in it.
const END_SLACK_DAYS: f64 = 5.0 / 86_400.0;

/// `pushkara_times_for_span`: the span is read back from its printed ISO text.
fn pushkara_hits<I: PyInstant>(
    system: System,
    span: &LagnaSpan<I>,
    lat: f64,
    lon: f64,
    zone: &Zone,
) -> Vec<PushkaraHit> {
    let start = span.start.reparse();
    let end = span.end.reparse();
    pushkara_degrees(span.number)
        .into_iter()
        .filter_map(|deg| {
            let local = degree_crossing(system, start, end, span.number, deg, lat, lon)?.wall(zone);
            Some(PushkaraHit {
                degree: py_round(deg, 4),
                degree_dms: dms_label(deg),
                local_time: local.hms,
                local_time_short: local.hm,
            })
        })
        .collect()
}

/// `build_lagna_spans` + `enrich_lagna_spans_with_pushkara` for any instant kind:
/// the at-time route enriches even a Julian Day day's spans.
pub(crate) fn lagna_spans_with_pushkara<I: PyInstant>(
    system: System,
    sunrise: I,
    next_sunrise: I,
    lat: f64,
    lon: f64,
    zone: &Zone,
) -> Vec<LagnaSpan<I>> {
    let mut spans = lagna_spans_plain(system, sunrise, next_sunrise, lat, lon, zone);
    for span in &mut spans {
        let hits = pushkara_hits(system, span, lat, lon, zone);
        span.row.pushkara_navamsha = Some(hits);
    }
    spans
}

#[expect(clippy::cast_precision_loss, reason = "a degree count is below 30")]
fn dms_label(deg: f64) -> String {
    let mut d = py_int(deg);
    let mut m = py_round_int((deg - d as f64) * 60.0);
    if m >= 60 {
        d += 1;
        m = 0;
    }
    format!("{d}°{m:02}'")
}

/// A pushkara navamsha crossing inside a lagna span.
#[derive(Debug, Clone, Serialize)]
pub(crate) struct PushkaraHit {
    degree: f64,
    degree_dms: String,
    local_time: String,
    local_time_short: String,
}

/// A lagna span as the payload prints it.
#[derive(Debug, Clone, Serialize)]
pub(crate) struct LagnaRow {
    number: usize,
    name: &'static str,
    name_ne: &'static str,
    degree_in_rashi: f64,
    longitude: f64,
    start_time: String,
    start_ghati_clock: String,
    start_hours_clock: String,
    start_local_time: String,
    end_time: String,
    end_ghati_clock: String,
    end_hours_clock: String,
    end_local_time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pushkara_navamsha: Option<Vec<PushkaraHit>>,
}

/// One lagna period, kept typed for the blocks derived from it.
pub(crate) struct LagnaSpan<I> {
    pub(crate) number: usize,
    pub(crate) start: I,
    pub(crate) end: I,
    /// The span as the payload prints it.
    pub(crate) row: LagnaRow,
}

/// The spans' rows as a JSON tree, for callers that still build trees.
pub(crate) fn lagna_rows_value<I>(spans: &[LagnaSpan<I>]) -> Value {
    to_value(&spans.iter().map(|s| &s.row).collect::<Vec<_>>())
}

/// The spans' rows, typed.
pub(crate) fn lagna_rows<I>(spans: Vec<LagnaSpan<I>>) -> Vec<LagnaRow> {
    spans.into_iter().map(|s| s.row).collect()
}

/// `build_lagna_spans`: twelve lagna periods from sunrise, the twelfth stretched to
/// the next sunrise. Python enriches them with pushkara navamsha crossings only for
/// `datetime` instants ([`lagna_spans`]); a Julian Day day keeps them plain.
pub(crate) fn lagna_spans_plain<I: PyInstant>(
    system: System,
    sunrise: I,
    next_sunrise: I,
    lat: f64,
    lon: f64,
    zone: &Zone,
) -> Vec<LagnaSpan<I>> {
    let mut spans = Vec::with_capacity(12);
    let mut cursor = sunrise;
    for index in 0..12 {
        let cursor_jd = cursor.to_jd();
        let asc = system.ascendant(cursor_jd, lat, lon);
        let i = idx(py_int(asc / 30.0) % 12);
        let mut end = if index == 11 {
            next_sunrise
        } else {
            // The first second the next sign is rising, so reading the ascendant
            // there gives the next sign's number.
            cursor
                .at_boundary(next_lagna_boundary(system, cursor_jd, lat, lon))
                .unwrap_or(cursor.add_seconds(60))
        };
        if end <= cursor {
            end = cursor.add_seconds(60);
        }
        let s = from_sunrise(cursor, sunrise, zone);
        let e = from_sunrise(end, sunrise, zone);
        let row = LagnaRow {
            number: i + 1,
            name: RASHI_NAMES[i],
            name_ne: RASHI_NAMES_NE[i],
            degree_in_rashi: py_round(py_mod(asc, 30.0), 4),
            longitude: py_round(asc, 6),
            start_time: cursor.to_string(),
            start_ghati_clock: s.ghati_clock,
            start_hours_clock: s.hours_clock,
            start_local_time: s.local_time,
            end_time: end.to_string(),
            end_ghati_clock: e.ghati_clock,
            end_hours_clock: e.hours_clock,
            end_local_time: e.local_time,
            pushkara_navamsha: None,
        };
        spans.push(LagnaSpan {
            number: i + 1,
            start: cursor,
            end,
            row,
        });
        cursor = end;
    }
    spans
}

/// `build_lagna_spans` + `enrich_lagna_spans_with_pushkara` (the daily payload).
pub(crate) fn lagna_spans(
    system: System,
    sunrise: UtcInstant,
    next_sunrise: UtcInstant,
    lat: f64,
    lon: f64,
    zone: &Zone,
) -> Vec<LagnaSpan<UtcInstant>> {
    lagna_spans_with_pushkara(system, sunrise, next_sunrise, lat, lon, zone)
}

/// One udaya lagna row: a lagna span with short clock fields.
#[derive(Debug, Serialize)]
pub(crate) struct UdayaRow {
    number: usize,
    name: &'static str,
    name_ne: &'static str,
    start_time: String,
    end_time: String,
    start_local_time: String,
    end_local_time: String,
    start_local_time_short: String,
    end_local_time_short: String,
    start_hours_clock: String,
    end_hours_clock: String,
    pushkara_navamsha: Vec<PushkaraHit>,
}

/// `build_udaya_lagna`: the lagna spans with short clock fields.
pub(crate) fn udaya_lagna<I>(spans: &[LagnaSpan<I>]) -> Vec<UdayaRow> {
    let short = |t: &str| t.chars().take(5).collect::<String>();
    spans
        .iter()
        .map(|span| {
            let r = &span.row;
            UdayaRow {
                number: r.number,
                name: r.name,
                name_ne: r.name_ne,
                start_time: r.start_time.clone(),
                end_time: r.end_time.clone(),
                start_local_time: r.start_local_time.clone(),
                end_local_time: r.end_local_time.clone(),
                start_local_time_short: short(&r.start_local_time),
                end_local_time_short: short(&r.end_local_time),
                start_hours_clock: r.start_hours_clock.clone(),
                end_hours_clock: r.end_hours_clock.clone(),
                pushkara_navamsha: r.pushkara_navamsha.clone().unwrap_or_default(),
            }
        })
        .collect()
}

fn panchaka_label(remainder: u32) -> (&'static str, &'static str, bool) {
    match remainder {
        1 => ("Mrityu Panchaka", "मृत्यु पञ्चक", false),
        2 => ("Agni Panchaka", "अग्नि पञ्चक", false),
        4 => ("Raja Panchaka", "राज पञ्चक", false),
        6 => ("Chora Panchaka", "चोर पञ्चक", false),
        8 => ("Roga Panchaka", "रोग पञ्चक", false),
        _ => ("Shubha Muhurta", "शुभ मुहूर्त", true),
    }
}

/// `build_panchaka_rahita`: (tithi + vaara + nakshatra + lagna) mod 9 per lagna span,
/// consecutive equal labels merged.
pub(crate) fn panchaka_rahita<I: PyInstant>(
    system: System,
    sunrise: I,
    spans: &[LagnaSpan<I>],
    vaara: u32,
    zone: &Zone,
) -> Value {
    let mut merged: Vec<Map<String, Value>> = Vec::new();
    for span in spans {
        // Python reads each span back from its printed ISO text, which for a
        // Julian Day instant rounds it to the microsecond.
        let start = span.start.reparse();
        let end = span.end.reparse();
        let jd = start.to_jd();
        let lagna_number = u32::try_from(span.number).unwrap_or(0);
        let remainder =
            (tithi_number(system, jd) + vaara + 1 + nakshatra_number(system, jd) + lagna_number)
                % 9;
        let (en, ne, good) = panchaka_label(remainder);
        let s = from_sunrise(start, sunrise, zone);
        let e = from_sunrise(end, sunrise, zone);
        let short = |t: &str| t.chars().take(5).collect::<String>();
        if let Some(last) = merged
            .last_mut()
            .filter(|m| m["good"] == json!(good) && m["name_ne"] == json!(ne))
        {
            last.insert("end_time".into(), json!(end.to_string()));
            last.insert("end_local_time".into(), json!(e.local_time));
            last.insert("end_local_time_short".into(), json!(short(&e.local_time)));
            last.insert("end_hours_clock".into(), json!(e.hours_clock));
            continue;
        }
        let row = json!({
            "name": en, "name_ne": ne, "good": good, "remainder": remainder,
            "start_time": start.to_string(), "end_time": end.to_string(),
            "start_local_time": s.local_time, "end_local_time": e.local_time,
            "start_local_time_short": short(&s.local_time), "end_local_time_short": short(&e.local_time),
            "start_hours_clock": s.hours_clock, "end_hours_clock": e.hours_clock,
        });
        if let Value::Object(m) = row {
            merged.push(m);
        }
    }
    Value::Array(merged.into_iter().map(Value::Object).collect())
}
