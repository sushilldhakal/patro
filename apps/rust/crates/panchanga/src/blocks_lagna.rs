//! Planets (spashta graha), lagna, lagna spans with Pushkara Navamsha, udaya lagna and
//! panchaka rahita blocks of the daily payload.

use astronomy::surya_siddhanta::{
    Body, ascendant, ascendant_sayana, ayanamsha, equatorial, true_longitude_and_speed,
    true_position,
};
use serde_json::{Map, Value, json};
use timescale::{PyInstant, UtcInstant, Zone};

use crate::{
    angas::{nakshatra, tithi},
    daily::{RASHI_NAMES, RASHI_NAMES_NE, from_sunrise, idx},
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

    fn payload(&self, sun: f64) -> Value {
        let i = idx(py_int(self.longitude / 30.0) % 12);
        let retro = self.is_retrograde();
        let combust = self.is_combust(sun);
        json!({
            "longitude": self.longitude, "speed": self.speed, "rashi": i + 1,
            "rashi_name": RASHI_NAMES[i], "rashi_ne": RASHI_NAMES_NE[i],
            "dms": dms(self.longitude, 3),
            "deg_in_rashi": py_round(py_mod(self.longitude, 30.0), 6),
            "dms_in_rashi": dms(py_mod(self.longitude, 30.0), 2),
            "is_retrograde": retro, "is_combust": combust,
        })
    }
}

fn spashta_grahas(jd: f64) -> Vec<Graha> {
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
            let (lon, speed) = true_longitude_and_speed(body, jd);
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
pub fn graha_positions(jd: f64) -> Vec<GrahaPosition> {
    let grahas = spashta_grahas(jd);
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

/// `spashta_table`: every graha at sunrise with rashi, DMS, वक्री and अस्त flags.
pub(crate) fn planets(jd: f64) -> Value {
    let grahas = spashta_grahas(jd);
    let sun = grahas[0].longitude;
    Value::Object(
        grahas
            .iter()
            .map(|g| (g.key.to_owned(), g.payload(sun)))
            .collect(),
    )
}

/// `planet_astro_extras(jd, graha)`: ecliptic latitude (शर), right ascension and
/// declination, each rounded to 4 places.
#[must_use]
pub fn graha_extras(jd: f64, key: &str) -> Option<(f64, f64, f64)> {
    let body = if key == "ketu" {
        Body::Rahu
    } else {
        key.parse::<Body>().ok()?
    };
    let (mut lon, mut lat) = true_position(body, jd);
    if key == "ketu" {
        lon = py_mod(lon + 180.0, 360.0);
        lat = -lat;
    }
    let (ra, dec) = equatorial(lon + ayanamsha(jd), lat);
    Some((py_round(lat, 4), py_round(ra, 4), py_round(dec, 4)))
}

/// `ascendant_astro_extras(jd, lat, lon)`: the ascendant's right ascension,
/// declination and speed (°/day), each rounded to 4 places.
#[must_use]
pub fn ascendant_extras(jd: f64, lat: f64, lon: f64) -> (f64, f64, f64) {
    let sayana = ascendant_sayana(jd, lat, lon);
    let ahead = ascendant_sayana(jd + ASCENDANT_SPEED_STEP_DAYS, lat, lon);
    let speed = (py_mod(ahead - sayana + 540.0, 360.0) - 180.0) / ASCENDANT_SPEED_STEP_DAYS;
    let (ra, dec) = equatorial(sayana, 0.0);
    (py_round(ra, 4), py_round(dec, 4), py_round(speed, 4))
}

/// `spashta_table` + `enrich_snapshot_astro`: the graha table with ecliptic latitude
/// (शर), right ascension and declination (क्रान्ति), as the at-time route reads it.
pub(crate) fn planets_with_extras(jd: f64) -> Value {
    let mut table = planets(jd);
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
            let (mut lon, mut lat) = true_position(body, jd);
            if key == "ketu" {
                lon = py_mod(lon + 180.0, 360.0);
                lat = -lat;
            }
            let (ra, dec) = equatorial(lon + ayanamsha(jd), lat);
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
pub(crate) fn instant_lagna(jd: f64, lat: f64, lon: f64) -> Value {
    let mut block = lagna(jd, lat, lon);
    let sayana = ascendant_sayana(jd, lat, lon);
    let ahead = ascendant_sayana(jd + ASCENDANT_SPEED_STEP_DAYS, lat, lon);
    let speed = (py_mod(ahead - sayana + 540.0, 360.0) - 180.0) / ASCENDANT_SPEED_STEP_DAYS;
    let (ra, dec) = equatorial(sayana, 0.0);
    if let Value::Object(fields) = &mut block {
        fields.insert("anchor".into(), json!("instant"));
        fields.insert("latitude".into(), json!(0.0));
        fields.insert("right_ascension".into(), json!(py_round(ra, 4)));
        fields.insert("declination".into(), json!(py_round(dec, 4)));
        fields.insert("speed".into(), json!(py_round(speed, 4)));
    }
    block
}

fn lagna_rashi(jd: f64, lat: f64, lon: f64) -> usize {
    idx(py_int(ascendant(jd, lat, lon) / 30.0) % 12)
}

/// `lagna_service.lagna`: the rising sign at sunrise.
pub(crate) fn lagna(jd: f64, lat: f64, lon: f64) -> Value {
    let asc = ascendant(jd, lat, lon);
    let i = idx(py_int(asc / 30.0) % 12);
    json!({
        "number": i + 1, "name": RASHI_NAMES[i], "name_ne": RASHI_NAMES_NE[i],
        "longitude": py_round(asc, 6), "degree_in_rashi": py_round(py_mod(asc, 30.0), 4), "anchor": "sunrise",
    })
}

/// `lagna_service.next_boundary`: JD the ascendant next enters the following sign.
fn next_lagna_boundary(jd: f64, lat: f64, lon: f64) -> f64 {
    let current = lagna_rashi(jd, lat, lon);
    let (mut start, mut end) = (jd, jd + 4.0 / 24.0);
    for _ in 0..50 {
        if end - start < 1.0 / 86400.0 {
            return end;
        }
        let mid = start + (end - start) / 2.0;
        if lagna_rashi(mid, lat, lon) == current {
            start = mid;
        } else {
            end = mid;
        }
    }
    end
}

const NAVAMSHA_DEG: f64 = 30.0 / 9.0;

fn pushkara_degrees(rashi_number: usize) -> [f64; 2] {
    let (a, b) = [(7.0, 9.0), (3.0, 5.0), (6.0, 8.0), (1.0, 3.0)][(rashi_number - 1) % 4];
    [(a - 1.0) * NAVAMSHA_DEG, (b - 1.0) * NAVAMSHA_DEG]
}

fn degree_in_rashi<I: PyInstant>(at: I, lat: f64, lon: f64) -> f64 {
    py_mod(ascendant(at.to_jd(), lat, lon), 30.0)
}

/// `find_lagna_degree_crossing`: when the ascendant (mod 30°) reaches `target`.
fn degree_crossing<I: PyInstant>(start: I, end: I, target: f64, lat: f64, lon: f64) -> Option<I> {
    if end <= start {
        return None;
    }
    let d_start = degree_in_rashi(start, lat, lon);
    let mut d_end = degree_in_rashi(end, lat, lon);
    if d_end < d_start {
        d_end += 30.0;
    }
    let mut adj = target;
    if adj < d_start - 0.02 {
        adj += 30.0;
    }
    if adj > d_end + 0.02 || adj < d_start - 0.02 {
        return None;
    }
    if (d_start - target).abs() < 0.03 || (target == 0.0 && d_start < 0.5) {
        return Some(start);
    }
    let (mut lo, mut hi) = (start, end);
    for _ in 0..64 {
        if hi.seconds_since(lo) <= 2.0 {
            return Some(I::midpoint(lo, hi));
        }
        let mid = I::midpoint(lo, hi);
        if degree_in_rashi(mid, lat, lon) < target - 1e-6 {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    Some(hi)
}

/// `pushkara_times_for_span`: the span is read back from its printed ISO text.
fn pushkara_hits<I: PyInstant>(span: &LagnaSpan<I>, lat: f64, lon: f64, zone: &Zone) -> Vec<Value> {
    let start = I::parse_py(&span.start.to_string()).unwrap_or(span.start);
    let end = I::parse_py(&span.end.to_string()).unwrap_or(span.end);
    pushkara_degrees(span.number)
        .into_iter()
        .filter_map(|deg| {
            let local = degree_crossing(start, end, deg, lat, lon)?.wall(zone);
            Some(json!({"degree": py_round(deg, 4), "degree_dms": dms_label(deg), "local_time": local.hms, "local_time_short": local.hm}))
        })
        .collect()
}

/// `build_lagna_spans` + `enrich_lagna_spans_with_pushkara` for any instant kind:
/// the at-time route enriches even a Julian Day day's spans.
pub(crate) fn lagna_spans_with_pushkara<I: PyInstant>(
    sunrise: I,
    next_sunrise: I,
    lat: f64,
    lon: f64,
    zone: &Zone,
) -> Vec<LagnaSpan<I>> {
    let mut spans = lagna_spans_plain(sunrise, next_sunrise, lat, lon, zone);
    for span in &mut spans {
        let hits = pushkara_hits(span, lat, lon, zone);
        span.json
            .insert("pushkara_navamsha".into(), Value::Array(hits));
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

/// One lagna period, kept typed for the blocks derived from it.
pub(crate) struct LagnaSpan<I> {
    pub(crate) number: usize,
    pub(crate) start: I,
    pub(crate) end: I,
    /// The span as the payload prints it.
    pub(crate) json: Map<String, Value>,
}

/// `build_lagna_spans`: twelve lagna periods from sunrise, the twelfth stretched to
/// the next sunrise. Python enriches them with pushkara navamsha crossings only for
/// `datetime` instants ([`lagna_spans`]); a Julian Day day keeps them plain.
pub(crate) fn lagna_spans_plain<I: PyInstant>(
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
        let asc = ascendant(cursor_jd, lat, lon);
        let i = idx(py_int(asc / 30.0) % 12);
        let mut end = if index == 11 {
            next_sunrise
        } else {
            cursor.add_days_f64(next_lagna_boundary(cursor_jd, lat, lon) - cursor_jd)
        };
        if end <= cursor {
            end = cursor.add_seconds(60);
        }
        let s = from_sunrise(cursor, sunrise, zone);
        let e = from_sunrise(end, sunrise, zone);
        let mut row = Map::new();
        row.insert("number".into(), json!(i + 1));
        row.insert("name".into(), json!(RASHI_NAMES[i]));
        row.insert("name_ne".into(), json!(RASHI_NAMES_NE[i]));
        row.insert(
            "degree_in_rashi".into(),
            json!(py_round(py_mod(asc, 30.0), 4)),
        );
        row.insert("longitude".into(), json!(py_round(asc, 6)));
        row.insert("start_time".into(), json!(cursor.to_string()));
        row.insert("start_ghati_clock".into(), json!(s.ghati_clock));
        row.insert("start_hours_clock".into(), json!(s.hours_clock));
        row.insert("start_local_time".into(), json!(s.local_time));
        row.insert("end_time".into(), json!(end.to_string()));
        row.insert("end_ghati_clock".into(), json!(e.ghati_clock));
        row.insert("end_hours_clock".into(), json!(e.hours_clock));
        row.insert("end_local_time".into(), json!(e.local_time));
        spans.push(LagnaSpan {
            number: i + 1,
            start: cursor,
            end,
            json: row,
        });
        cursor = end;
    }
    spans
}

/// `build_lagna_spans` + `enrich_lagna_spans_with_pushkara` (the daily payload).
pub(crate) fn lagna_spans(
    sunrise: UtcInstant,
    next_sunrise: UtcInstant,
    lat: f64,
    lon: f64,
    zone: &Zone,
) -> Vec<LagnaSpan<UtcInstant>> {
    lagna_spans_with_pushkara(sunrise, next_sunrise, lat, lon, zone)
}

/// `build_udaya_lagna`: the lagna spans with short clock fields.
pub(crate) fn udaya_lagna<I>(spans: &[LagnaSpan<I>]) -> Value {
    Value::Array(
        spans
            .iter()
            .map(|span| {
                let s = &span.json;
                let short = |k: &str| s[k].as_str().unwrap_or_default().chars().take(5).collect::<String>();
                json!({
                    "number": s["number"], "name": s["name"], "name_ne": s["name_ne"],
                    "start_time": s["start_time"], "end_time": s["end_time"],
                    "start_local_time": s["start_local_time"], "end_local_time": s["end_local_time"],
                    "start_local_time_short": short("start_local_time"), "end_local_time_short": short("end_local_time"),
                    "start_hours_clock": s["start_hours_clock"], "end_hours_clock": s["end_hours_clock"],
                    "pushkara_navamsha": s.get("pushkara_navamsha").cloned().unwrap_or_else(|| json!([])),
                })
            })
            .collect(),
    )
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
    sunrise: I,
    spans: &[LagnaSpan<I>],
    vaara: u32,
    zone: &Zone,
) -> Value {
    let mut merged: Vec<Map<String, Value>> = Vec::new();
    for span in spans {
        // Python reads each span back from its printed ISO text, which for a
        // Julian Day instant rounds it to the microsecond.
        let start = I::parse_py(&span.start.to_string()).unwrap_or(span.start);
        let end = I::parse_py(&span.end.to_string()).unwrap_or(span.end);
        let jd = start.to_jd();
        let lagna_number = u32::try_from(span.number).unwrap_or(0);
        let remainder = (tithi(jd).number + vaara + 1 + nakshatra(jd).number + lagna_number) % 9;
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
