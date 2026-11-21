//! Nivas and shool: directional abodes and homa indicators (`nivas_shool.py`).

use serde_json::{Map, Value, json};
use timescale::{PyInstant, Zone};

use crate::{
    angas::{karana, nakshatra, tithi},
    boundaries::{karana_end, moon_rashi_end, nakshatra_end, tithi_end},
    daily::{from_sunrise, py_min},
    text_tables::{
        AGNIVASA, BHADRA_LOKA, DIRECTIONS, HOMAHUTI_GRAHAS, KUMBHACHAKRA_PARTS, RAHU_VASA,
        SHIVAVASA,
    },
};
use astronomy::engine::{moon_longitude, sun_longitude};

use crate::{angas::NAKSHATRA_SPAN, pyfloat::py_int};

/// Disha shool direction index (0 E, 1 W, 2 N, 3 S) by Python weekday (Monday first).
const DISHA_SHOOLA: [usize; 7] = [0, 2, 2, 3, 1, 0, 1];

fn direction(i: usize) -> Map<String, Value> {
    let (key, en, ne) = DIRECTIONS[i % 4];
    let mut m = Map::new();
    m.insert("direction_key".into(), json!(key));
    m.insert("name_en".into(), json!(en));
    m.insert("name_ne".into(), json!(ne));
    m
}

fn disha_shool(weekday_py: usize) -> Value {
    let i = DISHA_SHOOLA[weekday_py % 7];
    let mut out = direction(i);
    let safe: Vec<Value> = (0..4)
        .filter(|j| *j != i)
        .map(|j| Value::Object(direction(j)))
        .collect();
    out.insert("auspicious_directions".into(), Value::Array(safe));
    Value::Object(out)
}

fn agnivasa(tithi_absolute: u32, weekday_py: usize) -> Map<String, Value> {
    let vaara = [2, 3, 4, 5, 6, 7, 1][weekday_py % 7];
    let (en, ne, sub_en, sub_ne, good) =
        AGNIVASA[[0, 1, 2, 0][((tithi_absolute + vaara + 1) % 4) as usize]];
    obj(
        json!({"name_en": en, "name_ne": ne, "subtitle_en": sub_en, "subtitle_ne": sub_ne, "is_auspicious": good}),
    )
}

fn shivavasa(tithi_absolute: u32) -> Map<String, Value> {
    let paksha_tithi = (tithi_absolute - 1) % 15 + 1;
    let (en, ne, good) = SHIVAVASA[[6, 0, 1, 2, 3, 4, 5][((paksha_tithi * 2 + 5) % 7) as usize]];
    obj(json!({"name_en": en, "name_ne": ne, "is_auspicious": good}))
}

fn kumbha(paksha_tithi: u32, weekday_py: usize) -> Map<String, Value> {
    let i = (weekday_py + paksha_tithi as usize) % 7;
    let (en, ne, good) = KUMBHACHAKRA_PARTS[i];
    obj(json!({"name_en": en, "name_ne": ne, "is_auspicious": good, "index": i}))
}

fn homahuti<I: PyInstant>(at: I) -> Map<String, Value> {
    let jd = at.to_jd();
    let mut sun_nak = py_int(sun_longitude(jd) / NAKSHATRA_SPAN) + 1;
    if sun_nak > 27 {
        sun_nak = 1;
    }
    let moon_nak = i64::from(nakshatra(jd).number);
    let distance = usize::try_from((moon_nak - sun_nak).rem_euclid(27)).unwrap_or(0);
    let (key, symbol, en, ne, good) = HOMAHUTI_GRAHAS[(distance / 3) % 9];
    obj(json!({"key": key, "symbol": symbol, "name_en": en, "name_ne": ne, "is_auspicious": good}))
}

fn moon_rashi_number<I: PyInstant>(at: I) -> usize {
    usize::try_from(py_int(moon_longitude(at.to_jd()) / 30.0) % 12).unwrap_or(0) + 1
}

fn chandra_vasa<I: PyInstant>(at: I) -> Map<String, Value> {
    direction([2, 0, 3, 1][moon_rashi_number(at) % 4])
}

fn obj(v: Value) -> Map<String, Value> {
    match v {
        Value::Object(m) => m,
        _ => Map::new(),
    }
}

struct Window<'a, I> {
    sunrise: I,
    next_sunrise: I,
    zone: &'a Zone,
}

impl<I: PyInstant> Window<'_, I> {
    fn boundaries(&self, find_end: impl Fn(I) -> I) -> Vec<I> {
        let mut points = vec![self.sunrise];
        let mut cursor = self.sunrise;
        while cursor < self.next_sunrise {
            let end = py_min(find_end(cursor), self.next_sunrise);
            if end < self.next_sunrise && !points.contains(&end) {
                points.push(end);
            }
            if end >= self.next_sunrise {
                break;
            }
            cursor = end.add_seconds(90);
        }
        points
    }

    fn attach_end(&self, span: &mut Map<String, Value>, end: I) {
        if end >= self.next_sunrise {
            span.insert("until_full_night".into(), json!(true));
            return;
        }
        span.insert("end_time".into(), json!(end.to_string()));
        span.insert(
            "end_local_time".into(),
            json!(from_sunrise(end, self.sunrise, self.zone).local_time),
        );
        span.insert("end_local_time_short".into(), json!(end.wall(self.zone).hm));
    }

    fn timed(&self, bounds: &[I], value: impl Fn(I) -> Map<String, Value>) -> Vec<Value> {
        bounds
            .iter()
            .enumerate()
            .map(|(i, &start)| {
                let end = bounds.get(i + 1).copied().unwrap_or(self.next_sunrise);
                let mut span = Map::new();
                span.insert("start_time".into(), json!(start.to_string()));
                span.insert(
                    "start_local_time_short".into(),
                    json!(start.wall(self.zone).hm),
                );
                span.extend(value(start));
                if end < self.next_sunrise {
                    self.attach_end(&mut span, end);
                } else {
                    span.insert("until_full_night".into(), json!(true));
                }
                Value::Object(span)
            })
            .collect()
    }

    fn vishti(&self) -> Vec<Value> {
        let mut out = Vec::new();
        let mut cursor = self.sunrise;
        while cursor < self.next_sunrise {
            if karana(cursor.to_jd()).name() != "Vishti" {
                cursor = karana_end(cursor).add_seconds(90);
                continue;
            }
            let end = py_min(karana_end(cursor), self.next_sunrise);
            let (loka_index, loka) = match moon_rashi_number(cursor) {
                1 | 2 | 3 | 8 => (0, "swarga"),
                6 | 7 | 9 | 10 => (2, "patala"),
                _ => (1, "prithvi"),
            };
            let (en, ne, sub_en, sub_ne, good) = BHADRA_LOKA[loka_index];
            let mut span = Map::new();
            span.insert("start_time".into(), json!(cursor.to_string()));
            span.insert(
                "start_local_time_short".into(),
                json!(cursor.wall(self.zone).hm),
            );
            span.extend(obj(json!({"name_en": en, "name_ne": ne, "subtitle_en": sub_en, "subtitle_ne": sub_ne, "is_auspicious": good})));
            span.insert("loka".into(), json!(loka));
            if end < self.next_sunrise {
                self.attach_end(&mut span, end);
            } else {
                span.insert("until_full_night".into(), json!(true));
            }
            out.push(Value::Object(span));
            cursor = end.add_seconds(90);
        }
        out
    }
}

fn current(segments: &[Value], fallback: impl FnOnce() -> Map<String, Value>) -> Value {
    segments
        .first()
        .cloned()
        .unwrap_or_else(|| Value::Object(fallback()))
}

/// `build_nivas_shool_block` for the day from sunrise to the next sunrise.
pub(crate) fn nivas_shool<I: PyInstant>(
    sunrise: I,
    next_sunrise: I,
    weekday_py: usize,
    zone: &Zone,
) -> Value {
    let w = Window {
        sunrise,
        next_sunrise,
        zone,
    };
    let tithi_bounds = w.boundaries(tithi_end);
    let nak_bounds = w.boundaries(nakshatra_end);
    let rashi_bounds = w.boundaries(moon_rashi_end);
    let tithi_at = |at: I| tithi(at.to_jd());
    let agni = w.timed(&tithi_bounds, |at| {
        agnivasa(tithi_at(at).number, weekday_py)
    });
    let shiva = w.timed(&tithi_bounds, |at| shivavasa(tithi_at(at).number));
    let kumbh = w.timed(&tithi_bounds, |at| {
        kumbha(tithi_at(at).display_number, weekday_py)
    });
    let mut homa_bounds: Vec<I> = tithi_bounds.iter().chain(&nak_bounds).copied().collect();
    homa_bounds.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    homa_bounds.dedup();
    let homa = w.timed(&homa_bounds, homahuti);
    let chandra = w.timed(&rashi_bounds, chandra_vasa);
    let bhadra = w.vishti();
    let (rv_key, rv_en, rv_ne) = RAHU_VASA[weekday_py % 7];
    json!({
        "homahuti": {"current": current(&homa, || homahuti(sunrise)), "segments": homa},
        "disha_shool": disha_shool(weekday_py),
        "rahu_vasa": {"direction_key": rv_key, "name_en": rv_en, "name_ne": rv_ne},
        "agnivasa": {"current": current(&agni, || agnivasa(tithi_at(sunrise).number, weekday_py)), "segments": agni},
        "shivavasa": {"current": current(&shiva, || shivavasa(tithi_at(sunrise).number)), "segments": shiva},
        "chandra_vasa": {"current": current(&chandra, || chandra_vasa(sunrise)), "segments": chandra},
        "bhadravasa": {"active": !bhadra.is_empty(), "segments": bhadra},
        "kumbha_chakra": {"current": current(&kumbh, || kumbha(tithi_at(sunrise).display_number, weekday_py)), "segments": kumbh},
    })
}
