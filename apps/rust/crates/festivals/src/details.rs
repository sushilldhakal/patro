//! Festival detail enrichment for day routes (`services/festivals/festival_details.py`).

use std::sync::LazyLock;

use serde_json::{Map, Value, json};

use crate::rules::{is_public_holiday, rule};

fn parse(text: &str, what: &str) -> Value {
    serde_json::from_str(text).unwrap_or_else(|e| panic!("{what} is valid JSON: {e}"))
}

static DETAILS: LazyLock<Value> = LazyLock::new(|| {
    parse(
        include_str!("../../../../api/rules/festival_details_v1.json"),
        "festival_details_v1.json",
    )
});

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
const TITHI_NAMES_EN: [&str; 15] = [
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima",
];
const LUNAR_MASA_NE: [(&str, &str); 12] = [
    ("Baishakh", "वैशाख"),
    ("Jestha", "ज्येष्ठ"),
    ("Ashadh", "आषाढ"),
    ("Shrawan", "श्रावण"),
    ("Bhadra", "भाद्रपद"),
    ("Ashwin", "आश्विन"),
    ("Kartik", "कार्तिक"),
    ("Mangsir", "मार्गशीर्ष"),
    ("Poush", "पौष"),
    ("Magh", "माघ"),
    ("Falgun", "फाल्गुन"),
    ("Chaitra", "चैत्र"),
];
const BS_MONTHS_NE: [&str; 12] = [
    "वैशाख",
    "जेठ",
    "असार",
    "साउन",
    "भदौ",
    "असोज",
    "कार्तिक",
    "मंसिर",
    "पुस",
    "माघ",
    "फागुन",
    "चैत",
];
const BS_MONTHS_EN: [&str; 12] = [
    "Baishakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush",
    "Magh", "Falgun", "Chaitra",
];
const AD_MONTHS_NE: [&str; 12] = [
    "जनवरी",
    "फेब्रुअरी",
    "मार्च",
    "अप्रिल",
    "मे",
    "जुन",
    "जुलाई",
    "अगस्ट",
    "सेप्टेम्बर",
    "अक्टोबर",
    "नोभेम्बर",
    "डिसेम्बर",
];
const AD_MONTHS_EN: [&str; 12] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const NEPALI_DIGITS: [char; 10] = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

fn ne_digits(n: i64) -> String {
    n.to_string()
        .chars()
        .map(|c| c.to_digit(10).map_or(c, |d| NEPALI_DIGITS[d as usize]))
        .collect()
}

fn lunar_masa_ne(name: &str) -> &str {
    LUNAR_MASA_NE
        .iter()
        .find(|(en, _)| *en == name)
        .map_or(name, |(_, ne)| *ne)
}

fn capitalize_paksha(paksha: &str) -> String {
    let mut chars = paksha.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => {
            let mut out: String = first.to_uppercase().collect();
            out.push_str(chars.as_str());
            out
        }
    }
}

/// `festival_when(rule)`: calendar place of the festival from its rule.
fn festival_when(r: &Map<String, Value>) -> Value {
    let kind = r.get("type").and_then(Value::as_str).unwrap_or("");
    match kind {
        "lunar"
            if r.get("lunar_month").and_then(Value::as_str).is_some()
                && r.get("tithi").and_then(Value::as_i64).is_some() =>
        {
            let tithi = r["tithi"].as_i64().unwrap_or(1);
            let paksha = r.get("paksha").and_then(Value::as_str).unwrap_or("shukla");
            let amavasya = tithi == 15 && paksha == "krishna";
            let tithi_ne = if amavasya {
                "औंसी"
            } else {
                TITHI_NAMES_NE[usize::try_from(tithi - 1).unwrap_or(0)]
            };
            let tithi_en = if amavasya {
                "Amavasya"
            } else {
                TITHI_NAMES_EN[usize::try_from(tithi - 1).unwrap_or(0)]
            };
            let month = r["lunar_month"].as_str().unwrap_or("");
            let paksha_ne = match paksha {
                "shukla" => "शुक्ल",
                "krishna" => "कृष्ण",
                other => other,
            };
            json!({
                "ne": format!("{} {} {}", lunar_masa_ne(month), paksha_ne, tithi_ne),
                "en": format!("{} {} {}", month, capitalize_paksha(paksha), tithi_en),
            })
        }
        "bs_fixed" | "solar" if r.get("bs_month").and_then(Value::as_i64).is_some() => {
            let day = r
                .get("bs_day")
                .or_else(|| r.get("solar_day"))
                .and_then(Value::as_i64)
                .unwrap_or(1);
            let month = r["bs_month"].as_i64().unwrap_or(1);
            let idx = usize::try_from(month - 1).unwrap_or(0);
            json!({
                "ne": format!("{} {} गते", BS_MONTHS_NE[idx], ne_digits(day)),
                "en": format!("{} {}", BS_MONTHS_EN[idx], day),
            })
        }
        "ad_fixed"
            if r.get("ad_month").and_then(Value::as_i64).is_some()
                && r.get("ad_day").and_then(Value::as_i64).is_some() =>
        {
            let month = r["ad_month"].as_i64().unwrap_or(1);
            let day = r["ad_day"].as_i64().unwrap_or(1);
            let idx = usize::try_from(month - 1).unwrap_or(0);
            json!({
                "ne": format!("{} {}", AD_MONTHS_NE[idx], ne_digits(day)),
                "en": format!("{} {}", AD_MONTHS_EN[idx], day),
            })
        }
        "ayana" => {
            let north = r.get("ayana").and_then(Value::as_str) == Some("uttara");
            if north {
                json!({
                    "ne": "शीत अयनान्त (सायन सूर्य २७०°)",
                    "en": "December solstice (tropical Sun 270°)",
                })
            } else {
                json!({
                    "ne": "ग्रीष्म अयनान्त (सायन सूर्य ९०°)",
                    "en": "June solstice (tropical Sun 90°)",
                })
            }
        }
        "announced" => json!({
            "ne": "नेपाल सरकारले तोकेका दिन",
            "en": "On the days the Government of Nepal announces",
        }),
        _ => Value::Null,
    }
}

fn text_entry(own: &Map<String, Value>) -> (Value, Value) {
    let about = json!({
        "ne": own.get("about_ne").cloned().unwrap_or(Value::Null),
        "en": own.get("about_en").cloned().unwrap_or(Value::Null),
    });
    let vidhi_ne = own.get("vidhi_ne");
    let vidhi = match vidhi_ne {
        Some(Value::Array(arr)) if !arr.is_empty() => json!({
            "ne": own.get("vidhi_ne").cloned().unwrap_or(Value::Null),
            "en": own.get("vidhi_en").cloned().unwrap_or(Value::Null),
        }),
        Some(Value::String(s)) if !s.is_empty() => json!({
            "ne": own.get("vidhi_ne").cloned().unwrap_or(Value::Null),
            "en": own.get("vidhi_en").cloned().unwrap_or(Value::Null),
        }),
        _ => Value::Null,
    };
    (about, vidhi)
}

fn text_for(festival_id: &str) -> Option<(Value, Value)> {
    let festivals = DETAILS["festivals"].as_object()?;
    if let Some(own) = festivals.get(festival_id).and_then(Value::as_object) {
        return Some(text_entry(own));
    }
    let r = rule(festival_id);
    let alias = r
        .get("alias_of")
        .or_else(|| r.get("subsumed_by"))
        .and_then(Value::as_str);
    if let Some(alias) = alias
        && let Some(own) = festivals.get(alias).and_then(Value::as_object)
    {
        return Some(text_entry(own));
    }
    let families = DETAILS["families"].as_array()?;
    for family in families {
        let Some(map) = family.as_object() else {
            continue;
        };
        let Some(m) = map.get("match").and_then(Value::as_str) else {
            continue;
        };
        if festival_id.contains(m) {
            return Some(text_entry(map));
        }
    }
    None
}

/// `festival_details(festival_id)`: enrichment fields for one day-list festival.
#[must_use]
pub fn festival_details(festival_id: &str) -> Map<String, Value> {
    let r = rule(festival_id);
    let (about, vidhi) = text_for(festival_id).unwrap_or((Value::Null, Value::Null));
    let mut out = Map::new();
    out.insert(
        "is_public_holiday".into(),
        json!(is_public_holiday(festival_id)),
    );
    out.insert(
        "importance".into(),
        r.get("importance").cloned().unwrap_or(Value::Null),
    );
    out.insert(
        "duration_days".into(),
        r.get("duration_days").cloned().unwrap_or(Value::Null),
    );
    out.insert("when".into(), festival_when(r));
    out.insert("about".into(), about);
    out.insert("vidhi".into(), vidhi);
    out
}

/// Enrich each festival object in place (`attach_festival_details`).
pub fn attach_festival_details(festivals: &mut [Value]) {
    for festival in festivals {
        let Some(map) = festival.as_object_mut() else {
            continue;
        };
        let Some(id) = map.get("id").and_then(Value::as_str).map(str::to_owned) else {
            continue;
        };
        for (key, value) in festival_details(&id) {
            map.insert(key, value);
        }
    }
}
