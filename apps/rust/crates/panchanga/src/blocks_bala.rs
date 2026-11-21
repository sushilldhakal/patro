//! Chandrabalam, tarabalam, their navatara tables and the daily rashifal.

use serde::Serialize;
use serde_json::{Value, json};
use timescale::{PyInstant, Zone};

use crate::{
    daily::{NAKSHATRA_NAMES_NE, RASHI_NAMES, RASHI_NAMES_NE, from_sunrise, nepali_digits},
    names::NAKSHATRA_NAMES,
    payload::to_value,
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

/// One nakshatra graded by navatara from the Moon's.
#[derive(Debug, Serialize)]
struct TaraRow {
    index: usize,
    name: &'static str,
    name_en: &'static str,
    tara: &'static str,
    quality: &'static str,
    tone: &'static str,
    tara_num: usize,
}

/// `build_tarabala_table`: all 27 nakshatras graded by navatara from the Moon's.
#[derive(Debug, Serialize)]
pub(crate) struct TarabalaTable {
    moon_index: usize,
    moon_label: String,
    moon_label_en: String,
    rows: Vec<TaraRow>,
}

impl TarabalaTable {
    pub(crate) fn new(block: &Value) -> Self {
        let moon = number(&block["number"]) - 1;
        let rows = (0..27)
            .map(|i| {
                let tara_num = navatara_number(moon, i, 27);
                let (tara, _, quality, _, tone) = NAVATARA[tara_num - 1];
                TaraRow {
                    index: i,
                    name: NAKSHATRA_NAMES_NE[i],
                    name_en: NAKSHATRA_NAMES[i],
                    tara,
                    quality,
                    tone,
                    tara_num,
                }
            })
            .collect();
        Self {
            moon_index: moon,
            moon_label: block["name_ne"]
                .as_str()
                .unwrap_or(NAKSHATRA_NAMES_NE[moon])
                .to_owned(),
            moon_label_en: block["name"]
                .as_str()
                .unwrap_or(NAKSHATRA_NAMES[moon])
                .to_owned(),
            rows,
        }
    }
}

/// The tarabala table as a JSON tree, for callers that still build trees.
pub(crate) fn tarabala_table(block: &Value) -> Value {
    to_value(&TarabalaTable::new(block))
}

fn chandra_house_quality(house: usize) -> (&'static str, &'static str) {
    match house {
        8 => ("अष्टम चन्द्र", "worst"),
        h if CHANDRA_GOOD_HOUSES.contains(&h) => ("शुभ", "good"),
        4 | 12 => ("अशुभ", "bad"),
        _ => ("मध्यम", "neutral"),
    }
}

/// One janma rashi graded by the transit Moon's house.
#[derive(Debug, Serialize)]
struct ChandraRow {
    index: usize,
    name: &'static str,
    name_en: &'static str,
    house: usize,
    tara: String,
    quality: &'static str,
    tone: &'static str,
}

/// `build_chandrabalam_table`: twelve janma rashis graded by the transit Moon's house.
#[derive(Debug, Serialize)]
pub(crate) struct ChandrabalaTable {
    moon_index: usize,
    moon_label: String,
    moon_label_en: String,
    rows: Vec<ChandraRow>,
}

impl ChandrabalaTable {
    pub(crate) fn new(chandra_rashi: &Value) -> Self {
        let moon = number(&chandra_rashi["number"]) - 1;
        let rows = (0..12)
            .map(|i| {
                let house = (moon + 12 - i) % 12 + 1;
                let (quality, tone) = chandra_house_quality(house);
                ChandraRow {
                    index: i,
                    name: RASHI_NAMES_NE[i],
                    name_en: RASHI_NAMES[i],
                    house,
                    tara: format!("{}औं भाव", nepali_digits(house)),
                    quality,
                    tone,
                }
            })
            .collect();
        Self {
            moon_index: moon,
            moon_label: chandra_rashi["name_ne"]
                .as_str()
                .unwrap_or(RASHI_NAMES_NE[moon])
                .to_owned(),
            moon_label_en: chandra_rashi["name"]
                .as_str()
                .unwrap_or(RASHI_NAMES[moon])
                .to_owned(),
            rows,
        }
    }
}

/// The chandrabala table as a JSON tree, for callers that still build trees.
pub(crate) fn chandrabala_table(chandra_rashi: &Value) -> Value {
    to_value(&ChandrabalaTable::new(chandra_rashi))
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

/// One sign of the daily rashifal.
#[derive(Debug, Serialize)]
struct SignRow {
    index: usize,
    id: usize,
    name: &'static str,
    name_en: &'static str,
    title_en: &'static str,
    syllables_ne: &'static str,
    tara: String,
    quality: &'static str,
    tone: &'static str,
    house_from_moon: usize,
    moorti: &'static str,
    moorti_ne: &'static str,
    moorti_en: &'static str,
    lucky_color_ne: &'static str,
    lucky_color_en: &'static str,
    lucky_number_ne: String,
    lucky_number_en: String,
    prediction_ne: String,
    prediction_en: String,
}

/// How the rashifal was worked out.
#[derive(Debug, Serialize)]
struct Method {
    frame: &'static str,
    ayanamsa: &'static str,
    chandrabala: &'static str,
    moorti: &'static str,
}

/// `build_daily_rashifal`: twelve signs from the chandrabala table.
#[derive(Debug, Serialize)]
pub(crate) struct Rashifal {
    period: &'static str,
    anchor: &'static str,
    vaara_num: u32,
    method: Method,
    moon_index: usize,
    moon_label: String,
    moon_label_en: String,
    signs: Vec<SignRow>,
}

impl Rashifal {
    pub(crate) fn new(table: &ChandrabalaTable, vaara: u32) -> Self {
        let signs = table
            .rows
            .iter()
            .map(|row| {
                let i = row.index;
                let (tone, house) = (row.tone, row.house);
                let m = moorti(house);
                let t = tone_index(tone);
                let weak = matches!(tone, "bad" | "worst");
                let prediction =
                    |phala: &[&str; 5], moorti_phala: &[&str; 4], remedy: &[&str; 12]| {
                        let mut parts = vec![phala[t], moorti_phala[m]];
                        if weak {
                            parts.push(remedy[i % 12]);
                        }
                        parts.join(" ")
                    };
                SignRow {
                    index: i,
                    id: i + 1,
                    name: row.name,
                    name_en: row.name_en,
                    title_en: RASHI_TITLE_EN[i],
                    syllables_ne: RASHI_NAMA_AKSHARAS_NE[i],
                    tara: row.tara.clone(),
                    quality: row.quality,
                    tone,
                    house_from_moon: house,
                    moorti: ["swarna", "rajata", "tamra", "loha"][m],
                    moorti_ne: MOORTI_NE[m],
                    moorti_en: MOORTI_EN[m],
                    lucky_color_ne: LUCKY_COLOR_NE[m],
                    lucky_color_en: LUCKY_COLOR_EN[m],
                    lucky_number_ne: nepali_digits(house),
                    lucky_number_en: house.to_string(),
                    prediction_ne: prediction(&TONE_PHALA_NE, &MOORTI_PHALA_NE, &REMEDY_NE),
                    prediction_en: prediction(&TONE_PHALA_EN, &MOORTI_PHALA_EN, &REMEDY_EN),
                }
            })
            .collect();
        Self {
            period: "daily",
            anchor: "sunrise",
            vaara_num: vaara,
            method: Method {
                frame: "drik_ganita",
                ayanamsa: "Surya Siddhanta",
                chandrabala: "transit_moon_house",
                moorti: "transit_moon_house_from_janma_rashi",
            },
            moon_index: table.moon_index,
            moon_label: table.moon_label.clone(),
            moon_label_en: table.moon_label_en.clone(),
            signs,
        }
    }
}
