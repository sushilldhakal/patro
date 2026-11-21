//! Chandrabalam, tarabalam, their navatara tables and the daily rashifal.

use serde_json::{Map, Value, json};
use timescale::{PyInstant, Zone};

use crate::{
    daily::{NAKSHATRA_NAMES_NE, RASHI_NAMES, RASHI_NAMES_NE, from_sunrise, nepali_digits},
    names::NAKSHATRA_NAMES,
    text_tables::{
        LUCKY_COLOR_EN, LUCKY_COLOR_NE, MOORTI_EN, MOORTI_NE, MOORTI_PHALA_EN, MOORTI_PHALA_NE,
        NAVATARA, RASHI_NAMA_AKSHARAS_NE, RASHI_TITLE_EN, REMEDY_EN, REMEDY_NE, TONE_PHALA_EN,
        TONE_PHALA_NE,
    },
};

/// Houses of the transit Moon from the janma rashi that give चन्द्रबल.
const CHANDRA_GOOD_HOUSES: [usize; 6] = [1, 3, 6, 7, 10, 11];
/// Favourable janma-nakshatra offsets from the Moon's nakshatra.
const TARA_OFFSETS: [usize; 12] = [0, 2, 4, 6, 8, 10, 13, 15, 17, 19, 21, 24];

fn rashi_chip(i: usize) -> Value {
    json!({"number": i + 1, "name": RASHI_NAMES[i], "name_ne": RASHI_NAMES_NE[i]})
}

fn nak_chip(i: usize) -> Value {
    json!({"number": i + 1, "name": NAKSHATRA_NAMES[i], "name_ne": NAKSHATRA_NAMES_NE[i]})
}

fn till<I: PyInstant>(end: I, sunrise: I, zone: &Zone) -> Value {
    let info = from_sunrise(end, sunrise, zone);
    json!({
        "end_time": end.to_string(), "end_local_time": info.local_time,
        "end_local_time_short": info.local_time.chars().take(5).collect::<String>(),
        "end_hours_clock": info.hours_clock, "end_ghati_clock": info.ghati_clock,
    })
}

fn janma_set(moon: usize) -> Value {
    Value::Array(
        CHANDRA_GOOD_HOUSES
            .iter()
            .map(|h| rashi_chip((moon + 12 - (h - 1)) % 12))
            .collect(),
    )
}

fn instant<I: PyInstant>(v: &Value) -> Option<I> {
    v.as_str().and_then(I::parse_py)
}

fn number(v: &Value) -> usize {
    v.as_u64()
        .and_then(|n| usize::try_from(n).ok())
        .unwrap_or(1)
}

/// `build_chandrabalam`: good janma rashis for this and the next Moon rashi.
pub(crate) fn chandrabalam<I: PyInstant>(sunrise: I, spans: &Value, zone: &Zone) -> Value {
    let Some(first) = spans.get(0) else {
        return json!({"till": null, "set1": [], "set2": []});
    };
    let moon = number(&first["number"]) - 1;
    let (till_value, next) = match (spans.get(1), instant::<I>(&first["end_time"])) {
        (Some(second), Some(end)) => (till(end, sunrise, zone), number(&second["number"]) - 1),
        _ => (Value::Null, (moon + 1) % 12),
    };
    json!({"till": till_value, "set1": janma_set(moon), "set2": janma_set(next)})
}

/// `build_tarabalam`: good janma nakshatras for this and the next Moon nakshatra.
pub(crate) fn tarabalam<I: PyInstant>(sunrise: I, block: &Value, zone: &Zone) -> Value {
    let current = number(&block["number"]) - 1;
    let set = |from: usize| {
        Value::Array(
            TARA_OFFSETS
                .iter()
                .map(|o| nak_chip((from + o) % 27))
                .collect(),
        )
    };
    let (till_value, next) = match (
        instant::<I>(&block["end_time"]),
        block["next"]["number"].as_u64(),
    ) {
        (Some(end), Some(n)) if n > 0 => (
            till(end, sunrise, zone),
            usize::try_from(n).unwrap_or(1) - 1,
        ),
        _ => (Value::Null, (current + 1) % 27),
    };
    json!({"till": till_value, "set1": set(current), "set2": set(next)})
}

fn navatara_number(moon: usize, target: usize, cycle: usize) -> usize {
    let diff = (target + cycle - moon) % cycle;
    if diff == 0 { 1 } else { (9 - diff % 9) % 9 + 1 }
}

/// `build_tarabala_table`: all 27 nakshatras graded by navatara from the Moon's.
pub(crate) fn tarabala_table(block: &Value) -> Value {
    let moon = number(&block["number"]) - 1;
    let rows: Vec<Value> = (0..27)
        .map(|i| {
            let tara_num = navatara_number(moon, i, 27);
            let (tara, _, quality, _, tone) = NAVATARA[tara_num - 1];
            json!({
                "index": i, "name": NAKSHATRA_NAMES_NE[i], "name_en": NAKSHATRA_NAMES[i],
                "tara": tara, "quality": quality, "tone": tone, "tara_num": tara_num,
            })
        })
        .collect();
    json!({
        "moon_index": moon,
        "moon_label": block["name_ne"].as_str().unwrap_or(NAKSHATRA_NAMES_NE[moon]),
        "moon_label_en": block["name"].as_str().unwrap_or(NAKSHATRA_NAMES[moon]),
        "rows": rows,
    })
}

fn chandra_house_quality(house: usize) -> (&'static str, &'static str) {
    match house {
        8 => ("अष्टम चन्द्र", "worst"),
        h if CHANDRA_GOOD_HOUSES.contains(&h) => ("शुभ", "good"),
        4 | 12 => ("अशुभ", "bad"),
        _ => ("मध्यम", "neutral"),
    }
}

/// `build_chandrabalam_table`: twelve janma rashis graded by the transit Moon's house.
pub(crate) fn chandrabala_table(chandra_rashi: &Value) -> Value {
    let moon = number(&chandra_rashi["number"]) - 1;
    let rows: Vec<Value> = (0..12)
        .map(|i| {
            let house = (moon + 12 - i) % 12 + 1;
            let (quality, tone) = chandra_house_quality(house);
            json!({
                "index": i, "name": RASHI_NAMES_NE[i], "name_en": RASHI_NAMES[i], "house": house,
                "tara": format!("{}औं भाव", nepali_digits(house)), "quality": quality, "tone": tone,
            })
        })
        .collect();
    json!({
        "moon_index": moon,
        "moon_label": chandra_rashi["name_ne"].as_str().unwrap_or(RASHI_NAMES_NE[moon]),
        "moon_label_en": chandra_rashi["name"].as_str().unwrap_or(RASHI_NAMES[moon]),
        "rows": rows,
    })
}

fn moorti(house: usize) -> usize {
    match house {
        1 | 6 | 11 => 0,
        2 | 5 | 9 => 1,
        4 | 8 | 12 => 3,
        _ => 2,
    }
}

fn tone_index(tone: &str) -> usize {
    ["best", "good", "neutral", "bad", "worst"]
        .iter()
        .position(|t| *t == tone)
        .unwrap_or(2)
}

/// `build_daily_rashifal`: twelve signs from the chandrabala table.
pub(crate) fn rashifal(table: &Value, vaara: u32) -> Value {
    let rows = table["rows"].as_array().map_or(&[][..], Vec::as_slice);
    let signs: Vec<Value> = rows
        .iter()
        .map(|row| {
            let i = number(&row["index"]);
            let tone = row["tone"].as_str().unwrap_or("neutral");
            let house = number(&row["house"]);
            let m = moorti(house);
            let t = tone_index(tone);
            let weak = matches!(tone, "bad" | "worst");
            let moorti_key = ["swarna", "rajata", "tamra", "loha"][m];
            let prediction = |phala: &[&str; 5], moorti_phala: &[&str; 4], remedy: &[&str; 12]| {
                let mut parts = vec![phala[t], moorti_phala[m]];
                if weak {
                    parts.push(remedy[i % 12]);
                }
                parts.join(" ")
            };
            json!({
                "index": i, "id": i + 1, "name": row["name"], "name_en": row["name_en"],
                "title_en": RASHI_TITLE_EN[i], "syllables_ne": RASHI_NAMA_AKSHARAS_NE[i],
                "tara": row["tara"], "quality": row["quality"], "tone": tone, "house_from_moon": house,
                "moorti": moorti_key, "moorti_ne": MOORTI_NE[m], "moorti_en": MOORTI_EN[m],
                "lucky_color_ne": LUCKY_COLOR_NE[m], "lucky_color_en": LUCKY_COLOR_EN[m],
                "lucky_number_ne": nepali_digits(house), "lucky_number_en": house.to_string(),
                "prediction_ne": prediction(&TONE_PHALA_NE, &MOORTI_PHALA_NE, &REMEDY_NE),
                "prediction_en": prediction(&TONE_PHALA_EN, &MOORTI_PHALA_EN, &REMEDY_EN),
            })
        })
        .collect();
    let mut meta = Map::new();
    meta.insert("period".into(), json!("daily"));
    meta.insert("anchor".into(), json!("sunrise"));
    meta.insert("vaara_num".into(), json!(vaara));
    meta.insert(
        "method".into(),
        json!({
            "frame": "drik_ganita", "ayanamsa": "Surya Siddhanta",
            "chandrabala": "transit_moon_house", "moorti": "transit_moon_house_from_janma_rashi",
        }),
    );
    meta.insert("moon_index".into(), table["moon_index"].clone());
    meta.insert("moon_label".into(), table["moon_label"].clone());
    meta.insert("moon_label_en".into(), table["moon_label_en"].clone());
    meta.insert("signs".into(), Value::Array(signs));
    Value::Object(meta)
}
