//! Nepal sait (auspicious-date) endpoints: categories, listings, detail and personalization.
//!
//! This ports the `FastAPI` behavior in `services/festivals/sait_*.py` and
//! `engine/festivals/{sait_rules,muhurta_engine}.py` for the Rust HTTP layer.
#![expect(
    clippy::cast_possible_truncation,
    reason = "Python int()/floor truncations on longitudes and Julian Days"
)]
#![expect(
    clippy::fn_params_excessive_bools,
    reason = "muhurta/personalize helpers mirror Python bool flags one-for-one"
)]
#![expect(
    clippy::struct_excessive_bools,
    reason = "CeremonyRule flags match muhurta_engine.CeremonyRule field-for-field"
)]
#![expect(
    clippy::too_many_arguments,
    reason = "personalize and window scanners keep the Python argument lists"
)]
#![expect(
    clippy::too_many_lines,
    reason = "faithful single-module port of sait_rules + muhurta_engine"
)]
#![expect(
    clippy::match_same_arms,
    reason = "category branches keep explicit Python if/elif structure"
)]
#![expect(
    clippy::manual_let_else,
    reason = "rise/set matches keep the NotImplemented arm explicit"
)]
#![expect(
    clippy::if_not_else,
    reason = "guard-style if !empty branches match the Python control flow"
)]
#![expect(
    clippy::assigning_clones,
    reason = "CeremonyRule field copies stay field-visible like Python replace()"
)]
#![expect(
    clippy::collapsible_if,
    reason = "nested rule gates stay readable against the Python source"
)]
#![expect(
    clippy::map_unwrap_or,
    reason = "trim-or-empty defaults follow the Python `(x or \"\").strip()` shape"
)]
#![expect(
    clippy::manual_contains,
    reason = "tone scans stay as written next to the Python equivalents"
)]
#![expect(
    clippy::question_mark,
    reason = "Option early-returns keep personalize branches explicit"
)]

use std::{
    collections::{BTreeMap, BTreeSet},
    sync::LazyLock,
};

use astronomy::{
    System,
    engine::{Observer, moon_longitude, rise_set_on_day, sun_longitude},
    surya_siddhanta::{Body, Crossing, Direction, EclipseKind, next_eclipse},
};
use calendar::{BsDate, bs_to_civil, month_length, month_start};
use panchanga::{
    daily::Location, karana, lunar_month::calendar_layers, nakshatra, nakshatra_number, tithi,
    tropical_sun_longitude, vara, yoga_number,
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, UtcInstant};

const SAIT_ENGINE_VERSION: &str = "4.13.0+a6";
const SAIT_LIST_MIN_YEAR: i32 = 1700;
const SAIT_LIST_MAX_YEAR: i32 = 2200;
const SAIT_GENERATE_MIN_YEAR: i32 = 60;
const SAIT_GENERATE_MAX_YEAR: i32 = 3000;
const STEP_SECONDS: i64 = 30 * 60;
const MIN_WINDOW_SECONDS: i64 = 5 * 60;
const REFINE_TOLERANCE_SECONDS: i64 = 1;

const BS_MONTHS_NE: [&str; 12] = [
    "वैशाख",
    "जेठ",
    "असार",
    "साउन",
    "भदौ",
    "असोज",
    "कात्तिक",
    "मंसिर",
    "पुष",
    "माघ",
    "फागुन",
    "चैत",
];
const WEEKDAY_EN: [&str; 7] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
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
const NAKSHATRA_NAMES_NE: [&str; 27] = [
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
const RASHI_NAMES_EN: [&str; 12] = [
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
const RASHI_NAMES_NE: [&str; 12] = [
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
const PAKSHA_NAMES_NE: [(&str, &str); 2] = [("shukla", "शुक्ल पक्ष"), ("krishna", "कृष्ण पक्ष")];
const ANNAPRASAN_NOTE: &str = "अन्नप्रासन requires the child's birth date to pick the 5–8 month window; year-wide listings show nakshatra-suitable days only.";

const RIKTA: [u32; 3] = [4, 9, 14];
const VYATIPATA_YOGA: u32 = 17;
const VAIDHRITI_YOGA: u32 = 27;
const FORBIDDEN_KARANAS: [&str; 5] = ["Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna"];
const ASHUBHA_YOGAS: [u32; 9] = [1, 6, 9, 10, 13, 15, 17, 19, 27];
const CHATURMAS_LUNAR_MONTHS: [&str; 4] = ["Shrawan", "Bhadra", "Ashwin", "Kartik"];
const GRIHA_PRAVESH_MALAMAS_RASHIS: [u32; 3] = [3, 8, 12];
const SHUNYA_TITHI_RASHIS: &[(u32, &[u32])] = &[
    (1, &[7, 10]),
    (2, &[9, 12]),
    (3, &[5, 10]),
    (5, &[3, 6]),
    (7, &[4, 9]),
    (9, &[4, 5]),
    (11, &[9, 12]),
    (13, &[2, 12]),
];
const DUR_MUHURTA_INDEXES: [&[i32]; 7] =
    [&[13], &[11, 8], &[3, 21], &[7], &[11, 5], &[8, 3], &[1, 15]];

const BRATABANDHA_NAKSHATRAS_CLASSICAL: [u32; 18] = [
    1, 4, 5, 7, 8, 10, 12, 13, 14, 15, 17, 19, 21, 22, 23, 24, 26, 27,
];
const BRATABANDHA_NAKSHATRAS_NEPALI: [u32; 22] = [
    1, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27,
];
const BRATABANDHA_NAKSHATRAS_LIBERAL: [u32; 23] = [
    1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27,
];

static SAIT_RULES_JSON: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../api/rules/sait_dates_v1.json"
    )))
    .expect("sait_dates_v1.json is valid JSON")
});
static SAIT_ABOUT_JSON: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../api/rules/sait_about.json"
    )))
    .expect("sait_about.json is valid JSON")
});

/// Sait business-logic failures mapped to HTTP in the API crate.
#[derive(Debug, Clone, thiserror::Error)]
#[non_exhaustive]
pub enum SaitError {
    /// Bad request input, returned as 400.
    #[error("{0}")]
    BadRequest(String),
    /// Missing resource, returned as 404.
    #[error("{0}")]
    NotFound(String),
    /// Known unported path, returned as 501.
    #[error("{0}")]
    NotImplemented(String),
}

#[derive(Debug, Clone)]
struct DayPanchanga {
    tithi_absolute: u32,
    tithi_display: u32,
    paksha: String,
    nakshatra: u32,
    vaara: u32,
    sun_rashi: u32,
    sun_longitude: f64,
    jupiter_combust: bool,
    venus_combust: bool,
    mercury_combust: bool,
    lunar_month: Option<String>,
    is_adhik_maas: bool,
    aayan: String,
    mercury_quadrant: bool,
    jupiter_quadrant: bool,
    jupiter_rashi: u32,
    jupiter_bala_vriddha: bool,
    venus_bala_vriddha: bool,
    yoga: u32,
    karana: String,
}

#[derive(Debug, Clone)]
struct CeremonyRule {
    key: &'static str,
    lunar_months: BTreeSet<&'static str>,
    sun_rashis: BTreeSet<u32>,
    avoid_sun_rashis: BTreeSet<u32>,
    avoid_guru_rashis: BTreeSet<u32>,
    block_chaturmas: bool,
    block_sankranti: bool,
    block_kshaya_paksha: bool,
    require_guru_udaya: bool,
    require_shukra_udaya: bool,
    reject_guru_shukra_bala_vriddha: bool,
    require_uttarayana: bool,
    tithis: BTreeSet<u32>,
    shukla_tithis: BTreeSet<u32>,
    krishna_tithis: BTreeSet<u32>,
    avoid_tithis: BTreeSet<u32>,
    nakshatras: BTreeSet<u32>,
    shukla_only: bool,
    avoid_varas: BTreeSet<u32>,
    daytime_only: bool,
    end_at_madhyahna: bool,
    avoid_karanas: BTreeSet<&'static str>,
    avoid_yogas: BTreeSet<u32>,
    block_dur_muhurta: bool,
    sankranti_buffer_hours: f64,
    major_sankranti_buffer_hours: f64,
    major_sankranti_rashis: BTreeSet<u32>,
    eclipse_pad_days: i32,
    day_kill_on_major_dosha: bool,
    lagnas: BTreeSet<u32>,
    avoid_moon_houses: BTreeSet<u32>,
    avoid_malefic_houses: BTreeSet<u32>,
    graha_vedha_planets: BTreeSet<&'static str>,
    check_dagdha: bool,
    check_shunya: bool,
    godhuli_overrides_dagdha_shunya: bool,
    fallback_nakshatras: BTreeSet<u32>,
    fallback_min_days: usize,
}

#[derive(Debug, Clone)]
struct MuhurtaWindow {
    start: UtcInstant,
    end: UtcInstant,
    lagna: u32,
}

#[derive(Debug, Clone)]
struct DayGate {
    ok: bool,
    vaara: u32,
}

fn set<T: Ord + Copy>(values: &[T]) -> BTreeSet<T> {
    values.iter().copied().collect()
}

fn mode_set(mode: &str) -> Option<BTreeSet<u32>> {
    match mode {
        "classical" => Some(set(&BRATABANDHA_NAKSHATRAS_CLASSICAL)),
        "nepali" => Some(set(&BRATABANDHA_NAKSHATRAS_NEPALI)),
        "liberal" => Some(set(&BRATABANDHA_NAKSHATRAS_LIBERAL)),
        _ => None,
    }
}

fn ceremony_rules() -> BTreeMap<&'static str, CeremonyRule> {
    let mut rules = BTreeMap::new();
    rules.insert(
        "vivah",
        CeremonyRule {
            key: "vivah",
            lunar_months: set(&["Mangsir", "Magh", "Falgun", "Baishakh", "Jestha", "Ashadh"]),
            sun_rashis: set(&[1, 2, 3, 8, 10, 11]),
            avoid_sun_rashis: BTreeSet::new(),
            avoid_guru_rashis: set(&[5]),
            block_chaturmas: true,
            block_sankranti: false,
            block_kshaya_paksha: true,
            require_guru_udaya: true,
            require_shukra_udaya: true,
            reject_guru_shukra_bala_vriddha: true,
            require_uttarayana: false,
            tithis: set(&[2, 3, 5, 7, 10, 11, 13]),
            shukla_tithis: BTreeSet::new(),
            krishna_tithis: BTreeSet::new(),
            avoid_tithis: BTreeSet::new(),
            nakshatras: set(&[4, 5, 10, 12, 13, 15, 17, 19, 21, 26, 27]),
            shukla_only: false,
            avoid_varas: set(&[3, 7]),
            daytime_only: false,
            end_at_madhyahna: false,
            avoid_karanas: set(&FORBIDDEN_KARANAS),
            avoid_yogas: set(&ASHUBHA_YOGAS),
            block_dur_muhurta: true,
            sankranti_buffer_hours: 6.0,
            major_sankranti_buffer_hours: 16.0,
            major_sankranti_rashis: set(&[1, 4, 7, 10]),
            eclipse_pad_days: 3,
            day_kill_on_major_dosha: true,
            lagnas: BTreeSet::new(),
            avoid_moon_houses: BTreeSet::new(),
            avoid_malefic_houses: BTreeSet::new(),
            graha_vedha_planets: set(&["sun", "mars", "saturn", "rahu", "ketu"]),
            check_dagdha: true,
            check_shunya: true,
            godhuli_overrides_dagdha_shunya: false,
            fallback_nakshatras: BTreeSet::new(),
            fallback_min_days: 0,
        },
    );
    rules.insert(
        "bratabandha",
        CeremonyRule {
            key: "bratabandha",
            lunar_months: BTreeSet::new(),
            sun_rashis: set(&[1, 2, 3, 10, 11, 12]),
            avoid_sun_rashis: BTreeSet::new(),
            avoid_guru_rashis: set(&[5]),
            block_chaturmas: true,
            block_sankranti: true,
            block_kshaya_paksha: false,
            require_guru_udaya: true,
            require_shukra_udaya: true,
            reject_guru_shukra_bala_vriddha: true,
            require_uttarayana: false,
            tithis: BTreeSet::new(),
            shukla_tithis: set(&[2, 3, 5, 10, 11, 12]),
            krishna_tithis: set(&[2, 3, 5]),
            avoid_tithis: set(&[1, 4, 7, 8, 9, 13, 14, 15]),
            nakshatras: set(&BRATABANDHA_NAKSHATRAS_CLASSICAL),
            shukla_only: false,
            avoid_varas: set(&[3, 7]),
            daytime_only: true,
            end_at_madhyahna: true,
            avoid_karanas: set(&["Vishti"]),
            avoid_yogas: set(&[VYATIPATA_YOGA, VAIDHRITI_YOGA]),
            block_dur_muhurta: true,
            sankranti_buffer_hours: 0.0,
            major_sankranti_buffer_hours: 0.0,
            major_sankranti_rashis: BTreeSet::new(),
            eclipse_pad_days: 3,
            day_kill_on_major_dosha: false,
            lagnas: BTreeSet::new(),
            avoid_moon_houses: BTreeSet::new(),
            avoid_malefic_houses: BTreeSet::new(),
            graha_vedha_planets: set(&["mars", "rahu"]),
            check_dagdha: true,
            check_shunya: true,
            godhuli_overrides_dagdha_shunya: false,
            fallback_nakshatras: BTreeSet::new(),
            fallback_min_days: 0,
        },
    );
    rules.insert(
        "griha-aarambha",
        CeremonyRule {
            key: "griha-aarambha",
            lunar_months: BTreeSet::new(),
            sun_rashis: set(&[1, 2, 5, 8, 10, 11]),
            avoid_sun_rashis: BTreeSet::new(),
            avoid_guru_rashis: BTreeSet::new(),
            block_chaturmas: false,
            block_sankranti: false,
            block_kshaya_paksha: false,
            require_guru_udaya: true,
            require_shukra_udaya: true,
            reject_guru_shukra_bala_vriddha: true,
            require_uttarayana: false,
            tithis: BTreeSet::new(),
            shukla_tithis: set(&[2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15]),
            krishna_tithis: set(&[2, 3, 5, 6, 7, 8, 10, 11, 12, 13]),
            avoid_tithis: BTreeSet::new(),
            nakshatras: set(&[4, 5, 7, 12, 13, 14, 15, 17, 21, 22, 23, 26, 27]),
            shukla_only: false,
            avoid_varas: BTreeSet::new(),
            daytime_only: true,
            end_at_madhyahna: false,
            avoid_karanas: set(&["Vishti"]),
            avoid_yogas: set(&[VYATIPATA_YOGA, VAIDHRITI_YOGA]),
            block_dur_muhurta: true,
            sankranti_buffer_hours: 6.0,
            major_sankranti_buffer_hours: 16.0,
            major_sankranti_rashis: set(&[1, 4, 7, 10]),
            eclipse_pad_days: 1,
            day_kill_on_major_dosha: false,
            lagnas: set(&[2, 3, 5, 6, 8, 9, 11, 12]),
            avoid_moon_houses: BTreeSet::new(),
            avoid_malefic_houses: BTreeSet::new(),
            graha_vedha_planets: BTreeSet::new(),
            check_dagdha: false,
            check_shunya: false,
            godhuli_overrides_dagdha_shunya: false,
            fallback_nakshatras: BTreeSet::new(),
            fallback_min_days: 0,
        },
    );
    rules.insert(
        "griha-pravesh",
        CeremonyRule {
            key: "griha-pravesh",
            lunar_months: set(&["Magh", "Falgun", "Chaitra", "Baishakh", "Jestha", "Mangsir"]),
            sun_rashis: BTreeSet::new(),
            avoid_sun_rashis: set(&GRIHA_PRAVESH_MALAMAS_RASHIS),
            avoid_guru_rashis: BTreeSet::new(),
            block_chaturmas: true,
            block_sankranti: false,
            block_kshaya_paksha: false,
            require_guru_udaya: true,
            require_shukra_udaya: true,
            reject_guru_shukra_bala_vriddha: true,
            require_uttarayana: false,
            tithis: set(&[2, 3, 5, 7, 10, 11, 13]),
            shukla_tithis: BTreeSet::new(),
            krishna_tithis: BTreeSet::new(),
            avoid_tithis: BTreeSet::new(),
            nakshatras: set(&[4, 5, 12, 14, 17, 21, 26, 27]),
            shukla_only: true,
            avoid_varas: BTreeSet::new(),
            daytime_only: false,
            end_at_madhyahna: false,
            avoid_karanas: set(&["Vishti"]),
            avoid_yogas: set(&[VYATIPATA_YOGA, VAIDHRITI_YOGA]),
            block_dur_muhurta: true,
            sankranti_buffer_hours: 6.0,
            major_sankranti_buffer_hours: 16.0,
            major_sankranti_rashis: set(&[1, 4, 7, 10]),
            eclipse_pad_days: 1,
            day_kill_on_major_dosha: false,
            lagnas: set(&[2, 3, 5, 6, 8, 9, 11, 12]),
            avoid_moon_houses: set(&[2, 4, 5, 8, 9, 12]),
            avoid_malefic_houses: BTreeSet::new(),
            graha_vedha_planets: set(&["sun", "mars", "saturn", "rahu", "ketu"]),
            check_dagdha: true,
            check_shunya: true,
            godhuli_overrides_dagdha_shunya: false,
            fallback_nakshatras: set(&[4, 5, 12, 13, 14, 15, 17, 21, 22, 23, 26, 27]),
            fallback_min_days: 12,
        },
    );
    rules.insert(
        "byaparik-pratisthan",
        CeremonyRule {
            key: "byaparik-pratisthan",
            lunar_months: BTreeSet::new(),
            sun_rashis: BTreeSet::new(),
            avoid_sun_rashis: BTreeSet::new(),
            avoid_guru_rashis: BTreeSet::new(),
            block_chaturmas: false,
            block_sankranti: true,
            block_kshaya_paksha: false,
            require_guru_udaya: false,
            require_shukra_udaya: false,
            reject_guru_shukra_bala_vriddha: false,
            require_uttarayana: false,
            tithis: BTreeSet::new(),
            shukla_tithis: set(&[2, 3, 5, 7, 10, 11, 13, 15]),
            krishna_tithis: set(&[2, 3, 5, 7, 10, 11, 13]),
            avoid_tithis: BTreeSet::new(),
            nakshatras: set(&[1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27]),
            shukla_only: false,
            avoid_varas: set(&[1, 3, 7]),
            daytime_only: true,
            end_at_madhyahna: false,
            avoid_karanas: set(&["Vishti"]),
            avoid_yogas: set(&[VYATIPATA_YOGA, VAIDHRITI_YOGA]),
            block_dur_muhurta: true,
            sankranti_buffer_hours: 0.0,
            major_sankranti_buffer_hours: 0.0,
            major_sankranti_rashis: BTreeSet::new(),
            eclipse_pad_days: 1,
            day_kill_on_major_dosha: false,
            lagnas: set(&[2, 3, 5, 6, 8, 9, 11, 12]),
            avoid_moon_houses: BTreeSet::new(),
            avoid_malefic_houses: BTreeSet::new(),
            graha_vedha_planets: BTreeSet::new(),
            check_dagdha: false,
            check_shunya: false,
            godhuli_overrides_dagdha_shunya: false,
            fallback_nakshatras: BTreeSet::new(),
            fallback_min_days: 0,
        },
    );
    rules.insert(
        "annaprasan",
        CeremonyRule {
            key: "annaprasan",
            lunar_months: BTreeSet::new(),
            sun_rashis: BTreeSet::new(),
            avoid_sun_rashis: BTreeSet::new(),
            avoid_guru_rashis: BTreeSet::new(),
            block_chaturmas: false,
            block_sankranti: false,
            block_kshaya_paksha: false,
            require_guru_udaya: false,
            require_shukra_udaya: false,
            reject_guru_shukra_bala_vriddha: false,
            require_uttarayana: false,
            tithis: BTreeSet::new(),
            shukla_tithis: set(&[2, 3, 5, 7, 10, 13, 15]),
            krishna_tithis: set(&[2, 3, 5, 7, 10, 13]),
            avoid_tithis: BTreeSet::new(),
            nakshatras: set(&[1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27]),
            shukla_only: false,
            avoid_varas: set(&[1, 3, 7]),
            daytime_only: true,
            end_at_madhyahna: false,
            avoid_karanas: set(&["Vishti"]),
            avoid_yogas: set(&[VYATIPATA_YOGA, VAIDHRITI_YOGA]),
            block_dur_muhurta: true,
            sankranti_buffer_hours: 0.0,
            major_sankranti_buffer_hours: 0.0,
            major_sankranti_rashis: BTreeSet::new(),
            eclipse_pad_days: 1,
            day_kill_on_major_dosha: false,
            lagnas: set(&[2, 3, 4, 5, 6, 7, 9, 10, 11]),
            avoid_moon_houses: BTreeSet::new(),
            avoid_malefic_houses: BTreeSet::new(),
            graha_vedha_planets: BTreeSet::new(),
            check_dagdha: false,
            check_shunya: false,
            godhuli_overrides_dagdha_shunya: false,
            fallback_nakshatras: BTreeSet::new(),
            fallback_min_days: 0,
        },
    );
    rules
}

fn toggleable_rule_ids() -> BTreeMap<&'static str, BTreeSet<&'static str>> {
    let mut ids = BTreeMap::new();
    ids.insert(
        "vivah",
        set(&[
            "month",
            "solar-month",
            "tithi",
            "nakshatra",
            "yoga",
            "karana",
            "vara",
            "dosha",
            "graha",
            "simhastha",
            "kshaya-paksha",
        ]),
    );
    ids.insert(
        "bratabandha",
        set(&[
            "nakshatra",
            "tithi",
            "galagraha",
            "vara",
            "yoga",
            "karana",
            "dosha",
            "graha",
            "simhastha",
            "time-window",
        ]),
    );
    ids.insert(
        "griha-aarambha",
        set(&[
            "solar-month",
            "tithi",
            "nakshatra",
            "graha",
            "yoga",
            "karana",
            "lagna",
        ]),
    );
    ids
}

fn apply_nakshatra_mode(rule: &CeremonyRule, mode: Option<&str>) -> CeremonyRule {
    if rule.key != "bratabandha" {
        return rule.clone();
    }
    let Some(raw) = mode else {
        return rule.clone();
    };
    let normalized = raw.trim().to_lowercase();
    let Some(naks) = mode_set(&normalized) else {
        return rule.clone();
    };
    let mut updated = rule.clone();
    updated.nakshatras = naks;
    updated
}

fn relax_rule(
    category: &str,
    rule: &CeremonyRule,
    disabled_ids: &BTreeSet<String>,
) -> CeremonyRule {
    let mut updated = rule.clone();
    for rid in disabled_ids {
        match (category, rid.as_str()) {
            ("vivah", "month") => {
                updated.lunar_months = BTreeSet::new();
                updated.block_chaturmas = false;
            }
            ("vivah", "solar-month") => updated.sun_rashis = BTreeSet::new(),
            ("vivah", "tithi") => {
                updated.tithis = BTreeSet::new();
                updated.shukla_tithis = BTreeSet::new();
                updated.krishna_tithis = BTreeSet::new();
                updated.shukla_only = false;
            }
            ("vivah", "nakshatra") => updated.nakshatras = BTreeSet::new(),
            ("vivah", "yoga") => updated.avoid_yogas = BTreeSet::new(),
            ("vivah", "karana") => updated.avoid_karanas = BTreeSet::new(),
            ("vivah", "vara") => updated.avoid_varas = BTreeSet::new(),
            ("vivah", "dosha") => {
                updated.check_dagdha = false;
                updated.check_shunya = false;
                updated.graha_vedha_planets = BTreeSet::new();
            }
            ("vivah", "graha") => {
                updated.require_guru_udaya = false;
                updated.require_shukra_udaya = false;
                updated.reject_guru_shukra_bala_vriddha = false;
            }
            ("vivah", "simhastha") => updated.avoid_guru_rashis = BTreeSet::new(),
            ("vivah", "kshaya-paksha") => updated.block_kshaya_paksha = false,
            ("bratabandha", "nakshatra") => {
                updated.nakshatras = set(&BRATABANDHA_NAKSHATRAS_NEPALI);
            }
            ("bratabandha", "tithi") => {
                updated.tithis = BTreeSet::new();
                updated.shukla_tithis = BTreeSet::new();
                updated.krishna_tithis = BTreeSet::new();
                updated.shukla_only = false;
            }
            ("bratabandha", "galagraha") => updated.avoid_tithis = BTreeSet::new(),
            ("bratabandha", "vara") => updated.avoid_varas = BTreeSet::new(),
            ("bratabandha", "yoga") => updated.avoid_yogas = BTreeSet::new(),
            ("bratabandha", "karana") => updated.avoid_karanas = BTreeSet::new(),
            ("bratabandha", "dosha") => {
                updated.check_dagdha = false;
                updated.check_shunya = false;
                updated.graha_vedha_planets = BTreeSet::new();
            }
            ("bratabandha", "graha") => {
                updated.require_guru_udaya = false;
                updated.require_shukra_udaya = false;
                updated.reject_guru_shukra_bala_vriddha = false;
            }
            ("bratabandha", "simhastha") => updated.avoid_guru_rashis = BTreeSet::new(),
            ("bratabandha", "time-window") => updated.end_at_madhyahna = false,
            ("griha-aarambha", "solar-month") => updated.sun_rashis = BTreeSet::new(),
            ("griha-aarambha", "tithi") => {
                updated.tithis = BTreeSet::new();
                updated.shukla_tithis = BTreeSet::new();
                updated.krishna_tithis = BTreeSet::new();
                updated.shukla_only = false;
            }
            ("griha-aarambha", "nakshatra") => updated.nakshatras = BTreeSet::new(),
            ("griha-aarambha", "graha") => {
                updated.require_guru_udaya = false;
                updated.require_shukra_udaya = false;
                updated.reject_guru_shukra_bala_vriddha = false;
            }
            ("griha-aarambha", "yoga") => updated.avoid_yogas = BTreeSet::new(),
            ("griha-aarambha", "karana") => updated.avoid_karanas = BTreeSet::new(),
            ("griha-aarambha", "lagna") => updated.lagnas = BTreeSet::new(),
            _ => {}
        }
    }
    updated
}

fn paksha_ne(paksha: &str) -> &str {
    PAKSHA_NAMES_NE
        .iter()
        .find_map(|(en, ne)| (*en == paksha).then_some(*ne))
        .unwrap_or(paksha)
}

fn lunar_masa_name_ne(name: &str) -> &str {
    let pairs = [
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
    pairs
        .iter()
        .find_map(|(en, ne)| (*en == name).then_some(*ne))
        .unwrap_or(name)
}

/// `stable_round(value, 6)` as in `engine.astronomy.position`.
fn stable_round(value: f64) -> f64 {
    let to_9 = (value * 1e9).round() / 1e9;
    (to_9 * 1e6).round() / 1e6
}

fn angular_separation(lon_a: f64, lon_b: f64) -> f64 {
    let diff = ((lon_a - lon_b) % 360.0 + 360.0) % 360.0;
    diff.min(360.0 - diff)
}

fn is_combust(planet_lon: f64, sun_lon: f64, orb: f64) -> bool {
    angular_separation(planet_lon, sun_lon) < orb
}

fn is_bala_vriddha(planet_lon: f64, sun_lon: f64, combust_orb: f64, weak_orb: f64) -> bool {
    let sep = angular_separation(planet_lon, sun_lon);
    sep >= combust_orb && sep < weak_orb
}

fn planet_in_quadrant(planet_rashi: u32, lagna_rashi: u32) -> bool {
    let house = (i32::try_from(planet_rashi).unwrap_or(1)
        - i32::try_from(lagna_rashi).unwrap_or(1))
    .rem_euclid(12)
        + 1;
    matches!(house, 1 | 4 | 7 | 10)
}

fn rashi_from_longitude(lon: f64) -> u32 {
    let raw = (lon / 30.0) as i32;
    u32::try_from(raw.rem_euclid(12) + 1).unwrap_or(1)
}

fn day_times(
    day: CivilDay,
    location: &Location,
) -> Result<(UtcInstant, UtcInstant, UtcInstant), SaitError> {
    let observer = Observer {
        system: location.system,
        latitude: location.lat,
        longitude: location.lon,
        zone: location.zone.clone(),
    };
    let sunrise = match rise_set_on_day(Body::Sun, day, &observer, Crossing::Rise) {
        Some(timescale::Moment::Utc(i)) => i,
        _ => {
            return Err(SaitError::NotImplemented(
                "days before 1582-10-15 are not ported to Rust yet".to_owned(),
            ));
        }
    };
    let sunset = match rise_set_on_day(Body::Sun, day, &observer, Crossing::Set) {
        Some(timescale::Moment::Utc(i)) => i,
        _ => {
            return Err(SaitError::NotImplemented(
                "days before 1582-10-15 are not ported to Rust yet".to_owned(),
            ));
        }
    };
    let next_day = day.add_days(1);
    let next_sunrise = match rise_set_on_day(Body::Sun, next_day, &observer, Crossing::Rise) {
        Some(timescale::Moment::Utc(i)) => i,
        _ => {
            return Err(SaitError::NotImplemented(
                "days before 1582-10-15 are not ported to Rust yet".to_owned(),
            ));
        }
    };
    Ok((sunrise, sunset, next_sunrise))
}

fn build_day_panchanga(day: CivilDay, location: &Location) -> Result<DayPanchanga, SaitError> {
    let system = location.system;
    let (sunrise, _sunset, _next) = day_times(day, location)?;
    let sunrise_jd = sunrise.to_jd();
    let tithi_info = tithi(system, sunrise_jd);
    let nak = nakshatra(system, sunrise_jd);
    let vaara_num = vara(sunrise_jd, &location.zone).number + 1;
    let sun_lon = stable_round({
        let (lon, _) = system.true_longitude_and_speed(Body::Sun, sunrise_jd);
        ((lon % 360.0) + 360.0) % 360.0
    });
    let jupiter = stable_round({
        let (lon, _) = system.true_longitude_and_speed(Body::Jupiter, sunrise_jd);
        ((lon % 360.0) + 360.0) % 360.0
    });
    let venus = stable_round({
        let (lon, _) = system.true_longitude_and_speed(Body::Venus, sunrise_jd);
        ((lon % 360.0) + 360.0) % 360.0
    });
    let mercury = stable_round({
        let (lon, _) = system.true_longitude_and_speed(Body::Mercury, sunrise_jd);
        ((lon % 360.0) + 360.0) % 360.0
    });
    let asc_lon = system.ascendant(sunrise_jd, location.lat, location.lon);
    let lagna_rashi = rashi_from_longitude(asc_lon);
    let jupiter_rashi = rashi_from_longitude(jupiter);
    let mercury_rashi = rashi_from_longitude(mercury);
    let sun_rashi = rashi_from_longitude(sun_lon);
    let tropical = tropical_sun_longitude(system, sunrise_jd);
    let aayan = if (90.0..270.0).contains(&tropical) {
        "Dakshinayana"
    } else {
        "Uttarayana"
    };
    let layers = calendar_layers(day, tithi_info.paksha, &location.observer());
    let purnimanta = &layers["purnimant"];
    let lunar_month = purnimanta["name"].as_str().map(str::to_owned);
    let is_adhik_maas = purnimanta["is_adhik"].as_bool().unwrap_or(false);

    Ok(DayPanchanga {
        tithi_absolute: tithi_info.number,
        tithi_display: tithi_info.display_number,
        paksha: tithi_info.paksha.name().to_owned(),
        nakshatra: nak.number,
        vaara: vaara_num,
        sun_rashi,
        sun_longitude: sun_lon,
        jupiter_combust: is_combust(jupiter, sun_lon, 11.0),
        venus_combust: is_combust(venus, sun_lon, 10.0),
        mercury_combust: is_combust(mercury, sun_lon, 14.0),
        lunar_month,
        is_adhik_maas,
        aayan: aayan.to_owned(),
        mercury_quadrant: planet_in_quadrant(mercury_rashi, lagna_rashi),
        jupiter_quadrant: planet_in_quadrant(jupiter_rashi, lagna_rashi),
        jupiter_rashi,
        jupiter_bala_vriddha: is_bala_vriddha(jupiter, sun_lon, 11.0, 14.0),
        venus_bala_vriddha: is_bala_vriddha(venus, sun_lon, 10.0, 13.0),
        yoga: yoga_number(system, sunrise_jd),
        karana: karana(system, sunrise_jd).name().to_owned(),
    })
}

fn is_kharmas(sun_longitude_value: f64) -> bool {
    (240.0..270.0).contains(&sun_longitude_value) || (330.0..360.0).contains(&sun_longitude_value)
}

fn is_rikta_tithi(display_tithi: u32) -> bool {
    RIKTA.contains(&display_tithi)
}

fn is_dagdha(vaara: u32, display_tithi: u32) -> bool {
    matches!(
        (vaara, display_tithi),
        (1, 12) | (2, 11) | (3, 5) | (4, 3) | (5, 6) | (6, 8) | (7, 9)
    )
}

fn shunya_rashis(display_tithi: u32) -> Option<&'static [u32]> {
    SHUNYA_TITHI_RASHIS
        .iter()
        .find_map(|(tithi_num, rashis)| (*tithi_num == display_tithi).then_some(*rashis))
}

fn agni_on_earth(tithi_absolute: u32, vaara_number: u32) -> bool {
    (tithi_absolute + vaara_number + 1) % 4 == 0 || (tithi_absolute + vaara_number + 1) % 4 == 3
}

fn rudra_on_earth(tithi_absolute: u32) -> bool {
    tithi_absolute != 30
        && ((2 * tithi_absolute + 5) % 7 == 1
            || (2 * tithi_absolute + 5) % 7 == 2
            || (2 * tithi_absolute + 5) % 7 == 3)
}

fn check_vivah(day: &DayPanchanga) -> bool {
    if day.is_adhik_maas
        || is_kharmas(day.sun_longitude)
        || is_rikta_tithi(day.tithi_display)
        || day.tithi_absolute == 30
    {
        return false;
    }
    if !set(&[1_u32, 2, 3, 8, 10, 11]).contains(&day.sun_rashi) {
        return false;
    }
    if day.jupiter_rashi == 5
        || day.jupiter_combust
        || day.venus_combust
        || day.jupiter_bala_vriddha
        || day.venus_bala_vriddha
    {
        return false;
    }
    if day.lunar_month.as_deref().is_none_or(|name| {
        !set(&["Mangsir", "Magh", "Falgun", "Baishakh", "Jestha", "Ashadh"]).contains(name)
    }) {
        return false;
    }
    if set(&CHATURMAS_LUNAR_MONTHS).contains(day.lunar_month.as_deref().unwrap_or_default()) {
        return false;
    }
    if !set(&[4_u32, 5, 10, 12, 13, 15, 17, 19, 20, 21, 26, 27]).contains(&day.nakshatra) {
        return false;
    }
    if !set(&[1_u32, 2, 4, 5, 6]).contains(&day.vaara) {
        return false;
    }
    !(day.paksha == "krishna" && day.tithi_display == 1)
}

fn check_bratabandha(day: &DayPanchanga) -> bool {
    if day.is_adhik_maas
        || is_kharmas(day.sun_longitude)
        || is_rikta_tithi(day.tithi_display)
        || day.tithi_absolute == 30
    {
        return false;
    }
    if day.aayan != "Uttarayana" || day.jupiter_combust {
        return false;
    }
    if day.lunar_month.as_deref().is_none_or(|name| {
        !set(&["Mangsir", "Magh", "Falgun", "Baishakh", "Jestha"]).contains(name)
    }) {
        return false;
    }
    if set(&CHATURMAS_LUNAR_MONTHS).contains(day.lunar_month.as_deref().unwrap_or_default()) {
        return false;
    }
    if !set(&BRATABANDHA_NAKSHATRAS_CLASSICAL).contains(&day.nakshatra) {
        return false;
    }
    if !set(&[2_u32, 4, 5, 6]).contains(&day.vaara) {
        return false;
    }
    day.paksha == "shukla" && set(&[2_u32, 3, 5, 7, 10, 11, 12]).contains(&day.tithi_display)
}

fn check_griha_aarambha(day: &DayPanchanga) -> bool {
    if day.is_adhik_maas || is_rikta_tithi(day.tithi_display) || day.tithi_absolute == 30 {
        return false;
    }
    if !set(&[1_u32, 2, 5, 8, 10, 11]).contains(&day.sun_rashi) {
        return false;
    }
    if day.jupiter_combust
        || day.venus_combust
        || day.jupiter_bala_vriddha
        || day.venus_bala_vriddha
    {
        return false;
    }
    if !set(&[4_u32, 5, 8, 12, 13, 14, 15, 17, 21, 22, 23, 26]).contains(&day.nakshatra) {
        return false;
    }
    set(&[2_u32, 4, 5, 6]).contains(&day.vaara)
}

fn check_griha_pravesh(day: &DayPanchanga) -> bool {
    if day.is_adhik_maas {
        return false;
    }
    if day.lunar_month.as_deref().is_none_or(|name| {
        !set(&["Magh", "Falgun", "Chaitra", "Baishakh", "Jestha", "Mangsir"]).contains(name)
    }) {
        return false;
    }
    if GRIHA_PRAVESH_MALAMAS_RASHIS.contains(&day.sun_rashi) {
        return false;
    }
    if day.paksha != "shukla" || !set(&[2_u32, 3, 5, 7, 10, 11, 13]).contains(&day.tithi_display) {
        return false;
    }
    if !set(&[4_u32, 5, 12, 14, 17, 21, 26, 27]).contains(&day.nakshatra) {
        return false;
    }
    if day.jupiter_combust
        || day.venus_combust
        || day.jupiter_bala_vriddha
        || day.venus_bala_vriddha
    {
        return false;
    }
    !is_dagdha(day.vaara, day.tithi_display)
}

fn check_byaparik_pratisthan(day: &DayPanchanga) -> bool {
    if day.is_adhik_maas
        || is_kharmas(day.sun_longitude)
        || is_rikta_tithi(day.tithi_display)
        || day.tithi_absolute == 30
    {
        return false;
    }
    if day.jupiter_combust || day.mercury_combust || !(day.mercury_quadrant || day.jupiter_quadrant)
    {
        return false;
    }
    if !set(&[2_u32, 4, 5, 6]).contains(&day.vaara) {
        return false;
    }
    if !set(&[1_u32, 4, 5, 8, 12, 13, 14, 17, 21, 22, 23, 27]).contains(&day.nakshatra) {
        return false;
    }
    day.paksha == "shukla" && set(&[2_u32, 3, 5, 7, 10, 11, 13]).contains(&day.tithi_display)
}

fn check_annaprasan(day: &DayPanchanga) -> bool {
    if day.is_adhik_maas || is_kharmas(day.sun_longitude) {
        return false;
    }
    let shukla_allowed = set(&[2_u32, 3, 5, 7, 10, 13, 15]);
    let krishna_allowed = set(&[2_u32, 3, 5, 7, 10, 13]);
    let allowed = if day.paksha == "shukla" {
        shukla_allowed
    } else {
        krishna_allowed
    };
    if !allowed.contains(&day.tithi_display) {
        return false;
    }
    if !set(&[
        1_u32, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27,
    ])
    .contains(&day.nakshatra)
    {
        return false;
    }
    set(&[2_u32, 4, 5, 6]).contains(&day.vaara)
}

fn check_rudri_jurne(day: &DayPanchanga) -> bool {
    rudra_on_earth(day.tithi_absolute)
        && agni_on_earth(day.tithi_absolute, day.vaara)
        && day.yoga != VYATIPATA_YOGA
        && day.yoga != VAIDHRITI_YOGA
        && day.karana != "Vishti"
}

fn check_agni_jurne(day: &DayPanchanga) -> bool {
    agni_on_earth(day.tithi_absolute, day.vaara)
}

fn month_is_ce(bs_year: i32, bs_month: u32) -> Result<bool, SaitError> {
    let start = month_start(bs_year, bs_month).map_err(|e| SaitError::BadRequest(e.to_string()))?;
    Ok(start.is_datetime_range())
}

fn month_days(bs_year: i32, bs_month: u32) -> Result<Vec<(u32, CivilDay)>, SaitError> {
    let length =
        month_length(bs_year, bs_month).map_err(|e| SaitError::BadRequest(e.to_string()))?;
    let start = month_start(bs_year, bs_month).map_err(|e| SaitError::BadRequest(e.to_string()))?;
    Ok((1..=length)
        .map(|day| (day, start.add_days(i32::try_from(day).unwrap_or(1) - 1)))
        .collect())
}

fn day_gate(
    rule: &CeremonyRule,
    greg: CivilDay,
    location: &Location,
) -> Result<DayGate, SaitError> {
    let dp = build_day_panchanga(greg, location)?;
    if dp.is_adhik_maas {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.eclipse_pad_days > 0 && eclipse_near(greg, rule.eclipse_pad_days, location) {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.block_sankranti {
        if sankranti_on_day(greg, location) {
            return Ok(DayGate {
                ok: false,
                vaara: dp.vaara,
            });
        }
    }
    if !rule.lunar_months.is_empty()
        && dp
            .lunar_month
            .as_deref()
            .is_none_or(|month| !rule.lunar_months.contains(month))
    {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if !rule.sun_rashis.is_empty() && !rule.sun_rashis.contains(&dp.sun_rashi) {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if !rule.avoid_sun_rashis.is_empty() && rule.avoid_sun_rashis.contains(&dp.sun_rashi) {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if !rule.avoid_guru_rashis.is_empty() && rule.avoid_guru_rashis.contains(&dp.jupiter_rashi) {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.block_chaturmas
        && dp
            .lunar_month
            .as_deref()
            .is_some_and(|month| set(&CHATURMAS_LUNAR_MONTHS).contains(month))
    {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.require_guru_udaya && dp.jupiter_combust {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.require_shukra_udaya && dp.venus_combust {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.reject_guru_shukra_bala_vriddha && (dp.jupiter_bala_vriddha || dp.venus_bala_vriddha) {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.require_uttarayana && dp.aayan != "Uttarayana" {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if !rule.avoid_varas.is_empty() && rule.avoid_varas.contains(&dp.vaara) {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    if rule.block_kshaya_paksha && is_kshaya_paksha(greg, location)? {
        return Ok(DayGate {
            ok: false,
            vaara: dp.vaara,
        });
    }
    Ok(DayGate {
        ok: true,
        vaara: dp.vaara,
    })
}

fn local_noon_utc(day: CivilDay, location: &Location) -> Option<UtcInstant> {
    let offset = location.zone.offset_at_local(day, 12);
    UtcInstant::from_utc(day, 12, 0, 0, 0).map(|i| i.add_seconds(-i64::from(offset)))
}

fn sankranti_on_day(greg: CivilDay, location: &Location) -> bool {
    let system = location.system;
    let Some(noon) = local_noon_utc(greg, location) else {
        return false;
    };
    let next_day = greg.add_days(1);
    let Some(noon_next) = local_noon_utc(next_day, location) else {
        return false;
    };
    let r0 = ((sun_longitude(system, noon.to_jd()) / 30.0).floor() as i32).rem_euclid(12);
    let r1 = ((sun_longitude(system, noon_next.to_jd()) / 30.0).floor() as i32).rem_euclid(12);
    r0 != r1
}

fn eclipse_near(greg: CivilDay, pad_days: i32, location: &Location) -> bool {
    if pad_days <= 0 {
        return false;
    }
    let Some(noon_utc) = UtcInstant::from_utc(greg, 12, 0, 0, 0) else {
        return false;
    };
    let mut maxima = Vec::new();
    for kind in [EclipseKind::Solar, EclipseKind::Lunar] {
        for direction in [Direction::Forward, Direction::Backward] {
            if let Some(e) = next_eclipse(noon_utc.to_jd(), kind, direction) {
                maxima.push(e.max_jd());
            }
        }
    }
    maxima.into_iter().any(|max_jd| {
        let local_day = location.zone.local_day(timescale::Moment::from_jd(max_jd));
        ((local_day.to_jd_ut() - greg.to_jd_ut()).round().abs() as i32) <= pad_days
    })
}

fn is_kshaya_paksha(date_val: CivilDay, location: &Location) -> Result<bool, SaitError> {
    let (_, paksha) = udaya_number_paksha(date_val, location)?;
    let mut start = date_val;
    while udaya_number_paksha(start.add_days(-1), location)?.1 == paksha {
        start = start.add_days(-1);
    }
    let mut end = date_val;
    while udaya_number_paksha(end.add_days(1), location)?.1 == paksha {
        end = end.add_days(1);
    }
    let sunrise_days = ((end.to_jd_ut() - start.to_jd_ut()).round() as i32) + 1;
    Ok(sunrise_days <= 13)
}

fn udaya_number_paksha(
    day: CivilDay,
    location: &Location,
) -> Result<(u32, &'static str), SaitError> {
    let system = location.system;
    let observer = Observer {
        system: location.system,
        latitude: location.lat,
        longitude: location.lon,
        zone: location.zone.clone(),
    };
    let sunrise = match rise_set_on_day(Body::Sun, day, &observer, Crossing::Rise) {
        Some(timescale::Moment::Utc(i)) => i,
        _ => {
            return Err(SaitError::NotImplemented(
                "days before 1582-10-15 are not ported to Rust yet".to_owned(),
            ));
        }
    };
    let ti = tithi(system, sunrise.to_jd());
    let paksha = if ti.paksha == panchanga::Paksha::Shukla {
        "shukla"
    } else {
        "krishna"
    };
    Ok((ti.number, paksha))
}

fn latta_pierced_nakshatras(
    greg: CivilDay,
    location: &Location,
    planets: &BTreeSet<&'static str>,
) -> BTreeSet<u32> {
    let system = location.system;
    if planets.is_empty() {
        return BTreeSet::new();
    }
    let Some(noon) = local_noon_utc(greg, location) else {
        return BTreeSet::new();
    };
    let offsets = [
        ("sun", 11_i32),
        ("mars", 2),
        ("saturn", 7),
        ("rahu", -8),
        ("ketu", -8),
    ];
    let mut pierced = BTreeSet::new();
    let rahu_lon = system.true_longitude_and_speed(Body::Rahu, noon.to_jd()).0;
    for (planet, offset) in offsets {
        if !planets.contains(planet) {
            continue;
        }
        let lon = match planet {
            "sun" => system.true_longitude_and_speed(Body::Sun, noon.to_jd()).0,
            "mars" => system.true_longitude_and_speed(Body::Mars, noon.to_jd()).0,
            "saturn" => {
                system
                    .true_longitude_and_speed(Body::Saturn, noon.to_jd())
                    .0
            }
            "rahu" => rahu_lon,
            "ketu" => (rahu_lon + 180.0) % 360.0,
            _ => 0.0,
        };
        let nak = ((lon / (360.0 / 27.0)).floor() as i32).rem_euclid(27) + 1;
        let target = (nak - 1 + offset).rem_euclid(27) + 1;
        if let Ok(t) = u32::try_from(target) {
            pierced.insert(t);
        }
    }
    pierced
}

fn in_intervals(at: UtcInstant, intervals: &[(UtcInstant, UtcInstant)]) -> bool {
    intervals
        .iter()
        .any(|(start, end)| *start <= at && at < *end)
}

fn dur_muhurta_intervals(
    sunrise: UtcInstant,
    sunset: UtcInstant,
    next_sunrise: UtcInstant,
    vaara: u32,
) -> Vec<(UtcInstant, UtcInstant)> {
    let day_s = sunset.seconds_since(sunrise);
    let night_s = next_sunrise.seconds_since(sunset);
    if day_s <= 0.0 || night_s <= 0.0 {
        return Vec::new();
    }
    let day_part = day_s / 15.0;
    let night_part = night_s / 15.0;
    let mut out = Vec::new();
    for idx in DUR_MUHURTA_INDEXES[((vaara - 1) % 7) as usize] {
        if *idx < 15 {
            let start = sunrise.add_seconds_f64(f64::from(*idx) * day_part);
            let end = sunrise.add_seconds_f64(f64::from(*idx + 1) * day_part);
            out.push((start, end));
        } else {
            let ni = *idx - 15;
            let start = sunset.add_seconds_f64(f64::from(ni) * night_part);
            let end = sunset.add_seconds_f64(f64::from(ni + 1) * night_part);
            out.push((start, end));
        }
    }
    out
}

fn sankranti_vetoes(
    system: System,
    rule: &CeremonyRule,
    sunrise: UtcInstant,
    end: UtcInstant,
) -> Vec<(UtcInstant, UtcInstant)> {
    if rule.sankranti_buffer_hours <= 0.0 && rule.major_sankranti_buffer_hours <= 0.0 {
        return Vec::new();
    }
    let pad_hours = rule
        .sankranti_buffer_hours
        .max(rule.major_sankranti_buffer_hours);
    let search_start = sunrise.add_seconds_f64(-pad_hours * 3600.0);
    let search_end = end.add_seconds_f64(pad_hours * 3600.0);
    let r0 = ((sun_longitude(system, search_start.to_jd()) / 30.0).floor() as i32).rem_euclid(12);
    let r1 = ((sun_longitude(system, search_end.to_jd()) / 30.0).floor() as i32).rem_euclid(12);
    if r0 == r1 {
        return Vec::new();
    }
    let Some(next_jd) = calendar::find_sankranti_after_jd(
        system,
        u32::try_from(r1).unwrap_or(0),
        search_start.to_jd(),
        5,
    ) else {
        return Vec::new();
    };
    let Some(moment) = UtcInstant::from_jd_truncated(next_jd) else {
        return Vec::new();
    };
    let incoming = ((sun_longitude(system, moment.add_seconds(60).to_jd()) / 30.0).floor() as i32)
        .rem_euclid(12)
        + 1;
    let hours = if rule
        .major_sankranti_rashis
        .contains(&u32::try_from(incoming).unwrap_or(0))
    {
        rule.major_sankranti_buffer_hours
    } else {
        rule.sankranti_buffer_hours
    };
    if hours <= 0.0 {
        return Vec::new();
    }
    let delta = hours * 3600.0;
    vec![(
        moment.add_seconds_f64(-delta),
        moment.add_seconds_f64(delta),
    )]
}

fn major_dosha_at(
    system: System,
    rule: &CeremonyRule,
    at: UtcInstant,
    day_vaara: u32,
    pierced_naks: &BTreeSet<u32>,
    in_godhuli: bool,
    in_dur_muhurta: bool,
    in_sankranti: bool,
    for_day_kill: bool,
) -> bool {
    if in_sankranti {
        return true;
    }
    if rule.block_dur_muhurta && in_dur_muhurta && !for_day_kill {
        return true;
    }
    if !rule.avoid_yogas.is_empty() && rule.avoid_yogas.contains(&yoga_number(system, at.to_jd())) {
        return true;
    }
    if !rule.avoid_karanas.is_empty()
        && rule
            .avoid_karanas
            .contains(karana(system, at.to_jd()).name())
    {
        return true;
    }
    let shielded = in_godhuli && rule.godhuli_overrides_dagdha_shunya;
    if !shielded {
        let ti = tithi(system, at.to_jd());
        if rule.check_dagdha && is_dagdha(day_vaara, ti.display_number) {
            return true;
        }
        if rule.check_shunya {
            if let Some(drained) = shunya_rashis(ti.display_number) {
                let moon_rashi =
                    ((moon_longitude(system, at.to_jd()) / 30.0).floor() as i32).rem_euclid(12) + 1;
                if drained.contains(&u32::try_from(moon_rashi).unwrap_or(0)) {
                    return true;
                }
            }
        }
    }
    if !pierced_naks.is_empty() {
        let nak = nakshatra_number(system, at.to_jd());
        if pierced_naks.contains(&nak) {
            return true;
        }
    }
    false
}

fn major_dosha_touches_practical_window(
    system: System,
    rule: &CeremonyRule,
    sunrise: UtcInstant,
    sunset: UtcInstant,
    next_sunrise: UtcInstant,
    day_vaara: u32,
    pierced_naks: &BTreeSet<u32>,
    dur_intervals: &[(UtcInstant, UtcInstant)],
    sankranti_intervals: &[(UtcInstant, UtcInstant)],
) -> bool {
    let godhuli_end = {
        let night_seconds = next_sunrise.seconds_since(sunset);
        sunset.add_seconds_f64(night_seconds / 30.0)
    };
    let mut at = sunrise;
    while at < sunset {
        if major_dosha_at(
            system,
            rule,
            at,
            day_vaara,
            pierced_naks,
            sunset <= at && at < godhuli_end,
            in_intervals(at, dur_intervals),
            in_intervals(at, sankranti_intervals),
            true,
        ) {
            return true;
        }
        at = at.add_seconds(STEP_SECONDS);
    }
    false
}

fn window_ok(
    rule: &CeremonyRule,
    at: UtcInstant,
    day_vaara: u32,
    location: &Location,
    planet_rashis: &BTreeMap<String, u32>,
    pierced_naks: &BTreeSet<u32>,
    in_godhuli: bool,
    in_dur_muhurta: bool,
    in_sankranti: bool,
) -> (bool, u32, u32, u32) {
    let system = location.system;
    if in_sankranti {
        return (false, 0, 0, 0);
    }
    if rule.block_dur_muhurta && in_dur_muhurta {
        return (false, 0, 0, 0);
    }
    let t = tithi(system, at.to_jd());
    let tithi_display = t.display_number;
    if is_rikta_tithi(tithi_display) || rule.avoid_tithis.contains(&tithi_display) {
        return (false, 0, 0, 0);
    }
    let shielded = in_godhuli && rule.godhuli_overrides_dagdha_shunya;
    if !shielded {
        if rule.check_dagdha && is_dagdha(day_vaara, tithi_display) {
            return (false, 0, 0, 0);
        }
        if rule.check_shunya {
            if let Some(drained) = shunya_rashis(tithi_display) {
                let moon_rashi =
                    ((moon_longitude(system, at.to_jd()) / 30.0).floor() as i32).rem_euclid(12) + 1;
                if drained.contains(&u32::try_from(moon_rashi).unwrap_or(0)) {
                    return (false, 0, 0, 0);
                }
            }
        }
    }
    if !rule.shukla_tithis.is_empty() || !rule.krishna_tithis.is_empty() {
        let allowed = if t.paksha == panchanga::Paksha::Shukla {
            &rule.shukla_tithis
        } else {
            &rule.krishna_tithis
        };
        if !allowed.contains(&tithi_display) {
            return (false, 0, 0, 0);
        }
    } else if !rule.tithis.is_empty() && !rule.tithis.contains(&tithi_display) {
        return (false, 0, 0, 0);
    }
    if rule.shukla_only && t.paksha != panchanga::Paksha::Shukla {
        return (false, 0, 0, 0);
    }
    if !rule.avoid_yogas.is_empty() && rule.avoid_yogas.contains(&yoga_number(system, at.to_jd())) {
        return (false, 0, 0, 0);
    }
    if !rule.avoid_karanas.is_empty()
        && rule
            .avoid_karanas
            .contains(karana(system, at.to_jd()).name())
    {
        return (false, 0, 0, 0);
    }
    let nak = nakshatra_number(system, at.to_jd());
    if !rule.nakshatras.is_empty() && !rule.nakshatras.contains(&nak) {
        return (false, 0, 0, 0);
    }
    if pierced_naks.contains(&nak) {
        return (false, 0, 0, 0);
    }
    let lagna = ((system.ascendant(at.to_jd(), location.lat, location.lon) / 30.0).floor() as i32)
        .rem_euclid(12)
        + 1;
    let lagna_u = u32::try_from(lagna).unwrap_or(0);
    if !rule.lagnas.is_empty() && !rule.lagnas.contains(&lagna_u) {
        return (false, 0, 0, 0);
    }
    if !rule.avoid_moon_houses.is_empty() {
        let moon_rashi =
            ((moon_longitude(system, at.to_jd()) / 30.0).floor() as i32).rem_euclid(12) + 1;
        let moon_h = (moon_rashi - lagna).rem_euclid(12) + 1;
        if rule
            .avoid_moon_houses
            .contains(&u32::try_from(moon_h).unwrap_or(0))
        {
            return (false, 0, 0, 0);
        }
    }
    if !rule.avoid_malefic_houses.is_empty() {
        for planet in ["sun", "mars", "saturn", "rahu"] {
            if let Some(rashi_num) = planet_rashis.get(planet) {
                let house = (i32::try_from(*rashi_num).unwrap_or(1) - lagna).rem_euclid(12) + 1;
                if rule
                    .avoid_malefic_houses
                    .contains(&u32::try_from(house).unwrap_or(0))
                {
                    return (false, 0, 0, 0);
                }
            }
        }
    }
    (true, tithi_display, nak, lagna_u)
}

fn edge_refine(
    rule: &CeremonyRule,
    mut good: UtcInstant,
    mut bad: UtcInstant,
    day_vaara: u32,
    location: &Location,
    planet_rashis: &BTreeMap<String, u32>,
    pierced_naks: &BTreeSet<u32>,
    godhuli: Option<(UtcInstant, UtcInstant)>,
    dur_intervals: &[(UtcInstant, UtcInstant)],
    sankranti_intervals: &[(UtcInstant, UtcInstant)],
) -> (UtcInstant, UtcInstant) {
    while bad.seconds_since(good).abs() > f64::from(REFINE_TOLERANCE_SECONDS as i32) {
        let mid = UtcInstant::midpoint(good, bad);
        let in_godhuli = godhuli.is_some_and(|(s, e)| s <= mid && mid < e);
        let ok = window_ok(
            rule,
            mid,
            day_vaara,
            location,
            planet_rashis,
            pierced_naks,
            in_godhuli,
            in_intervals(mid, dur_intervals),
            in_intervals(mid, sankranti_intervals),
        )
        .0;
        if ok {
            good = mid;
        } else {
            bad = mid;
        }
    }
    (good, bad)
}

/// `muhurta_windows(cat, day, location, refine=True)` for each ceremony a day
/// route times (`CEREMONY_SAITS`). A day the engine cannot judge yields no windows.
pub(crate) fn ceremony_windows(
    greg: CivilDay,
    location: &Location,
) -> Vec<festivals::CeremonyWindows> {
    let rules = ceremony_rules();
    festivals::CEREMONY_SAITS
        .iter()
        .map(|(category, _)| festivals::CeremonyWindows {
            category,
            windows: rules
                .get(category)
                .and_then(|rule| muhurta_windows_for_rule(rule, greg, location, true).ok())
                .unwrap_or_default()
                .into_iter()
                .map(|w| (w.start, w.end))
                .collect(),
        })
        .collect()
}

fn muhurta_windows_for_rule(
    rule: &CeremonyRule,
    greg: CivilDay,
    location: &Location,
    refine: bool,
) -> Result<Vec<MuhurtaWindow>, SaitError> {
    let system = location.system;
    let gate = day_gate(rule, greg, location)?;
    if !gate.ok {
        return Ok(Vec::new());
    }

    let planet_rashis = if !rule.avoid_malefic_houses.is_empty() {
        let mut map = BTreeMap::new();
        if let Some(noon) = local_noon_utc(greg, location) {
            map.insert(
                "sun".to_owned(),
                u32::try_from(
                    ((system.true_longitude_and_speed(Body::Sun, noon.to_jd()).0 / 30.0).floor()
                        as i32)
                        .rem_euclid(12)
                        + 1,
                )
                .unwrap_or(1),
            );
            map.insert(
                "mars".to_owned(),
                u32::try_from(
                    ((system.true_longitude_and_speed(Body::Mars, noon.to_jd()).0 / 30.0).floor()
                        as i32)
                        .rem_euclid(12)
                        + 1,
                )
                .unwrap_or(1),
            );
            map.insert(
                "saturn".to_owned(),
                u32::try_from(
                    ((system
                        .true_longitude_and_speed(Body::Saturn, noon.to_jd())
                        .0
                        / 30.0)
                        .floor() as i32)
                        .rem_euclid(12)
                        + 1,
                )
                .unwrap_or(1),
            );
            map.insert(
                "rahu".to_owned(),
                u32::try_from(
                    ((system.true_longitude_and_speed(Body::Rahu, noon.to_jd()).0 / 30.0).floor()
                        as i32)
                        .rem_euclid(12)
                        + 1,
                )
                .unwrap_or(1),
            );
        }
        map
    } else {
        BTreeMap::new()
    };
    let pierced = latta_pierced_nakshatras(greg, location, &rule.graha_vedha_planets);
    let (sunrise, sunset, next_sunrise) = day_times(greg, location)?;
    let end = if rule.end_at_madhyahna {
        UtcInstant::midpoint(sunrise, sunset)
    } else if rule.daytime_only {
        sunset
    } else {
        next_sunrise
    };
    let dur_intervals = if rule.block_dur_muhurta {
        dur_muhurta_intervals(sunrise, sunset, next_sunrise, gate.vaara)
    } else {
        Vec::new()
    };
    let godhuli = if rule.godhuli_overrides_dagdha_shunya || rule.day_kill_on_major_dosha {
        let night_seconds = next_sunrise.seconds_since(sunset);
        Some((sunset, sunset.add_seconds_f64(night_seconds / 30.0)))
    } else {
        None
    };
    let sankranti_intervals = sankranti_vetoes(system, rule, sunrise, end);
    if rule.day_kill_on_major_dosha
        && major_dosha_touches_practical_window(
            system,
            rule,
            sunrise,
            sunset,
            next_sunrise,
            gate.vaara,
            &pierced,
            &dur_intervals,
            &sankranti_intervals,
        )
    {
        return Ok(Vec::new());
    }

    let mut windows = Vec::new();
    let mut run_start: Option<(UtcInstant, u32, u32, u32)> = None;
    let mut last_good: Option<UtcInstant> = None;
    let mut at = sunrise;
    while at <= end {
        let in_godhuli = godhuli.is_some_and(|(s, e)| s <= at && at < e);
        let (ok, t, n, l) = window_ok(
            rule,
            at,
            gate.vaara,
            location,
            &planet_rashis,
            &pierced,
            in_godhuli,
            in_intervals(at, &dur_intervals),
            in_intervals(at, &sankranti_intervals),
        );
        if ok {
            if run_start.is_none() {
                run_start = Some((at, t, n, l));
            }
            last_good = Some(at);
        } else if let (Some((start, _tithi_num, _nak_num, lagna_num)), Some(last)) =
            (run_start, last_good)
        {
            let mut start_refined = start;
            let mut stop = {
                let candidate = last.add_seconds(STEP_SECONDS);
                if candidate <= end { candidate } else { end }
            };
            if refine {
                if start > sunrise {
                    start_refined = edge_refine(
                        rule,
                        start,
                        start.add_seconds(-STEP_SECONDS),
                        gate.vaara,
                        location,
                        &planet_rashis,
                        &pierced,
                        godhuli,
                        &dur_intervals,
                        &sankranti_intervals,
                    )
                    .0;
                }
                if stop < end {
                    stop = edge_refine(
                        rule,
                        last,
                        stop,
                        gate.vaara,
                        location,
                        &planet_rashis,
                        &pierced,
                        godhuli,
                        &dur_intervals,
                        &sankranti_intervals,
                    )
                    .1;
                }
            }
            if stop.seconds_since(start_refined) >= f64::from(MIN_WINDOW_SECONDS as i32) {
                windows.push(MuhurtaWindow {
                    start: start_refined,
                    end: stop,
                    lagna: lagna_num,
                });
            }
            run_start = None;
            last_good = None;
        }
        at = at.add_seconds(STEP_SECONDS);
    }
    if let (Some((start, _tithi_num, _nak_num, lagna_num)), Some(last)) = (run_start, last_good) {
        let mut start_refined = start;
        let mut stop = {
            let candidate = last.add_seconds(STEP_SECONDS);
            if candidate <= end { candidate } else { end }
        };
        if refine {
            if start > sunrise {
                start_refined = edge_refine(
                    rule,
                    start,
                    start.add_seconds(-STEP_SECONDS),
                    gate.vaara,
                    location,
                    &planet_rashis,
                    &pierced,
                    godhuli,
                    &dur_intervals,
                    &sankranti_intervals,
                )
                .0;
            }
            if stop < end {
                stop = edge_refine(
                    rule,
                    last,
                    stop,
                    gate.vaara,
                    location,
                    &planet_rashis,
                    &pierced,
                    godhuli,
                    &dur_intervals,
                    &sankranti_intervals,
                )
                .1;
            }
        }
        if stop.seconds_since(start_refined) >= f64::from(MIN_WINDOW_SECONDS as i32) {
            windows.push(MuhurtaWindow {
                start: start_refined,
                end: stop,
                lagna: lagna_num,
            });
        }
    }
    Ok(windows)
}

fn has_muhurta(
    category: &str,
    greg: CivilDay,
    location: &Location,
    rule: Option<&CeremonyRule>,
) -> Result<bool, SaitError> {
    let rules = ceremony_rules();
    let Some(base_rule) = rule.or_else(|| rules.get(category)) else {
        return Err(SaitError::BadRequest(format!(
            "No muhurta rule for category: {category}"
        )));
    };
    Ok(!muhurta_windows_for_rule(base_rule, greg, location, false)?.is_empty())
}

fn scan_year(
    bs_year: i32,
    category: &str,
    location: &Location,
    use_muhurta: bool,
    rule: Option<&CeremonyRule>,
) -> Result<BTreeMap<String, Vec<u32>>, SaitError> {
    let mut by_month = BTreeMap::new();
    for bs_month in 1..=12 {
        let mut matching_days = Vec::new();
        for (bs_day, greg) in month_days(bs_year, bs_month)? {
            let matches = if use_muhurta {
                has_muhurta(category, greg, location, rule)?
            } else {
                let day = build_day_panchanga(greg, location)?;
                match category {
                    "rudri-jurne" => check_rudri_jurne(&day),
                    "agni-jurne" => check_agni_jurne(&day),
                    "vivah" => check_vivah(&day),
                    "bratabandha" => check_bratabandha(&day),
                    "griha-aarambha" => check_griha_aarambha(&day),
                    "griha-pravesh" => check_griha_pravesh(&day),
                    "byaparik-pratisthan" => check_byaparik_pratisthan(&day),
                    "annaprasan" => check_annaprasan(&day),
                    _ => false,
                }
            };
            if matches {
                matching_days.push(bs_day);
            }
        }
        if !matching_days.is_empty() {
            by_month.insert(bs_month.to_string(), matching_days);
        }
    }
    Ok(by_month)
}

fn day_total(by_month: &BTreeMap<String, Vec<u32>>) -> usize {
    by_month.values().map(Vec::len).sum()
}

fn generate_sait_months(
    bs_year: i32,
    category: &str,
    location: &Location,
) -> Result<(BTreeMap<String, Vec<u32>>, bool), SaitError> {
    let rules = ceremony_rules();
    let use_muhurta = rules.contains_key(category);
    let base_rule = rules.get(category);
    if !use_muhurta && !matches!(category, "rudri-jurne" | "agni-jurne") {
        return Err(SaitError::BadRequest(format!(
            "Unknown sait category: {category}"
        )));
    }
    let by_month = scan_year(bs_year, category, location, use_muhurta, base_rule)?;
    if let Some(rule) = base_rule {
        if !rule.fallback_nakshatras.is_empty() && day_total(&by_month) < rule.fallback_min_days {
            let mut widened = rule.clone();
            widened.nakshatras = rule.fallback_nakshatras.clone();
            let expanded = scan_year(bs_year, category, location, true, Some(&widened))?;
            return Ok((expanded, true));
        }
    }
    Ok((by_month, false))
}

fn generate_sait_month_days(
    bs_year: i32,
    bs_month: u32,
    category: &str,
    location: &Location,
) -> Result<Vec<u32>, SaitError> {
    let rules = ceremony_rules();
    let use_muhurta = rules.contains_key(category);
    let mut days = Vec::new();
    for (bs_day, greg) in month_days(bs_year, bs_month)? {
        let matches = if use_muhurta {
            has_muhurta(category, greg, location, rules.get(category))?
        } else {
            let day = build_day_panchanga(greg, location)?;
            match category {
                "rudri-jurne" => check_rudri_jurne(&day),
                "agni-jurne" => check_agni_jurne(&day),
                _ => false,
            }
        };
        if matches {
            days.push(bs_day);
        }
    }
    Ok(days)
}

#[derive(Debug, Clone)]
struct GeneratedSait {
    months: BTreeMap<String, Vec<u32>>,
    nakshatra_fallback: bool,
}

fn get_generated_sait(
    bs_year: i32,
    category: &str,
    location: &Location,
) -> Result<GeneratedSait, SaitError> {
    if !(SAIT_GENERATE_MIN_YEAR..=SAIT_GENERATE_MAX_YEAR).contains(&bs_year) {
        return Err(SaitError::BadRequest(format!(
            "bs_year must be between {SAIT_GENERATE_MIN_YEAR} and {SAIT_GENERATE_MAX_YEAR}"
        )));
    }
    let (months, fallback) = generate_sait_months(bs_year, category, location)?;
    Ok(GeneratedSait {
        months,
        nakshatra_fallback: fallback,
    })
}

fn categories_json() -> Result<&'static Map<String, Value>, SaitError> {
    SAIT_RULES_JSON["categories"]
        .as_object()
        .ok_or_else(|| SaitError::BadRequest("sait categories missing".to_owned()))
}

fn about_categories_json() -> Result<&'static Map<String, Value>, SaitError> {
    SAIT_ABOUT_JSON["categories"]
        .as_object()
        .ok_or_else(|| SaitError::BadRequest("sait about categories missing".to_owned()))
}

fn category_method(meta: &Map<String, Value>, about: &Value) -> Value {
    let has_local = meta.get("method_ne").is_some() || meta.get("method_en").is_some();
    if has_local {
        json!({"ne": meta.get("method_ne"), "en": meta.get("method_en")})
    } else {
        json!({
            "ne": about["_meta"]["method_ne"],
            "en": about["_meta"]["method_en"],
        })
    }
}

/// `GET /nepal/sait/categories`.
///
/// # Errors
///
/// Returns [`SaitError`] when the embedded rules JSON is missing categories.
pub fn list_sait_categories() -> Result<Value, SaitError> {
    let categories = categories_json()?;
    let mut out = Vec::new();
    for (cat_id, meta) in categories {
        let mut row = Map::new();
        row.insert("id".to_owned(), json!(cat_id));
        row.insert(
            "label_ne".to_owned(),
            meta.get("label_ne")
                .cloned()
                .unwrap_or_else(|| json!(cat_id)),
        );
        if cat_id == "annaprasan" {
            row.insert("requires_birth_date".to_owned(), json!(true));
        }
        out.push(Value::Object(row));
    }
    Ok(json!({"categories": out}))
}

/// `GET /nepal/sait/years`.
#[must_use]
pub fn list_sait_years() -> Value {
    json!({"years": (SAIT_LIST_MIN_YEAR..=SAIT_LIST_MAX_YEAR).collect::<Vec<_>>()})
}

/// `GET /nepal/sait/about`.
///
/// # Errors
///
/// Returns [`SaitError`] when the embedded about JSON is missing categories.
pub fn get_sait_about_all() -> Result<Value, SaitError> {
    let categories = about_categories_json()?;
    let mut out_categories = Vec::new();
    for (cat_id, meta_value) in categories {
        let Some(meta) = meta_value.as_object() else {
            continue;
        };
        let mut row = Map::new();
        row.insert("id".to_owned(), json!(cat_id));
        for (key, value) in meta {
            row.insert(key.clone(), value.clone());
        }
        row.insert("method".to_owned(), category_method(meta, &SAIT_ABOUT_JSON));
        row.insert(
            "rules".to_owned(),
            meta.get("rules")
                .cloned()
                .unwrap_or_else(|| Value::Array(Vec::new())),
        );
        out_categories.push(Value::Object(row));
    }
    Ok(json!({
        "method": {
            "ne": SAIT_ABOUT_JSON["_meta"]["method_ne"],
            "en": SAIT_ABOUT_JSON["_meta"]["method_en"],
        },
        "source": SAIT_ABOUT_JSON["_meta"]["source"],
        "categories": out_categories,
    }))
}

/// `GET /nepal/sait/{category}/about`.
///
/// # Errors
///
/// Returns [`SaitError::NotFound`] for an unknown category.
pub fn get_sait_about(category: &str) -> Result<Value, SaitError> {
    let categories = about_categories_json()?;
    let Some(meta) = categories.get(category).and_then(Value::as_object) else {
        return Err(SaitError::NotFound(format!(
            "Unknown sait category '{category}'."
        )));
    };
    let mut out = Map::new();
    out.insert("id".to_owned(), json!(category));
    for (key, value) in meta {
        out.insert(key.clone(), value.clone());
    }
    out.insert(
        "source".to_owned(),
        SAIT_ABOUT_JSON["_meta"]["source"].clone(),
    );
    out.insert("method".to_owned(), category_method(meta, &SAIT_ABOUT_JSON));
    out.insert(
        "rules".to_owned(),
        meta.get("rules")
            .cloned()
            .unwrap_or_else(|| Value::Array(Vec::new())),
    );
    Ok(Value::Object(out))
}

/// `GET /nepal/sait/{bs_year}/month/{bs_month}`.
///
/// # Errors
///
/// Returns [`SaitError`] for a bad month, unknown rules, or a day the engine cannot compute.
pub fn get_sait_month_all(
    bs_year: i32,
    bs_month: u32,
    location: &Location,
) -> Result<Value, SaitError> {
    if !(1..=12).contains(&bs_month) {
        return Err(SaitError::BadRequest(format!(
            "bs_month must be 1–12, got {bs_month}"
        )));
    }
    let categories = categories_json()?;
    if !month_is_ce(bs_year, bs_month)? {
        let mut empty = Map::new();
        for cat in categories.keys() {
            empty.insert(cat.clone(), Value::Array(Vec::new()));
        }
        return Ok(json!({
            "bs_year": bs_year,
            "bs_month": bs_month,
            "month_name_ne": BS_MONTHS_NE[usize::try_from(bs_month - 1).unwrap_or(0)],
            "categories": Value::Object(empty),
            "unavailable_reason": "pre_ce",
        }));
    }
    let mut by_category = Map::new();
    for cat in categories.keys() {
        by_category.insert(
            cat.clone(),
            json!(generate_sait_month_days(bs_year, bs_month, cat, location)?),
        );
    }
    Ok(json!({
        "bs_year": bs_year,
        "bs_month": bs_month,
        "month_name_ne": BS_MONTHS_NE[usize::try_from(bs_month - 1).unwrap_or(0)],
        "categories": Value::Object(by_category),
    }))
}

fn format_month_entries(by_month: &BTreeMap<String, Vec<u32>>) -> Vec<Value> {
    let mut months = Vec::new();
    let mut entries: Vec<(&String, &Vec<u32>)> = by_month.iter().collect();
    entries.sort_by_key(|(k, _)| k.parse::<u32>().unwrap_or(u32::MAX));
    for (month_key, days) in entries {
        let Ok(month) = month_key.parse::<u32>() else {
            continue;
        };
        if days.is_empty() {
            continue;
        }
        let mut sorted = days.clone();
        sorted.sort_unstable();
        months.push(json!({
            "month": month,
            "month_name_ne": BS_MONTHS_NE[usize::try_from(month.saturating_sub(1)).unwrap_or(0)],
            "days": sorted,
        }));
    }
    months
}

/// `GET /nepal/sait/{bs_year}/{category}`.
///
/// # Errors
///
/// Returns [`SaitError`] for an unknown category or a year the engine cannot scan.
pub fn get_sait_month_entries(
    bs_year: i32,
    category: &str,
    location: &Location,
) -> Result<Value, SaitError> {
    let categories = categories_json()?;
    let Some(meta) = categories.get(category).and_then(Value::as_object) else {
        return Err(SaitError::BadRequest(format!(
            "Unknown sait category: {category}"
        )));
    };
    let generated = get_generated_sait(bs_year, category, location)?;
    let mut out = Map::new();
    out.insert("bs_year".to_owned(), json!(bs_year));
    out.insert("category".to_owned(), json!(category));
    out.insert(
        "category_label_ne".to_owned(),
        meta.get("label_ne")
            .cloned()
            .unwrap_or_else(|| json!(category)),
    );
    out.insert(
        "months".to_owned(),
        Value::Array(format_month_entries(&generated.months)),
    );
    out.insert("source".to_owned(), json!("computed"));
    if category == "annaprasan" {
        out.insert("note".to_owned(), json!(ANNAPRASAN_NOTE));
    }
    Ok(Value::Object(out))
}

fn custom_year_by_month(
    bs_year: i32,
    category: &str,
    location: &Location,
    exclude: &BTreeSet<String>,
    nakshatra_mode: Option<&str>,
) -> Result<(BTreeMap<String, Vec<u32>>, CeremonyRule), SaitError> {
    let rules = ceremony_rules();
    let Some(base) = rules.get(category) else {
        return Err(SaitError::BadRequest(format!(
            "Unknown sait category: {category}"
        )));
    };
    let mut detail_rule = relax_rule(category, base, exclude);
    detail_rule = apply_nakshatra_mode(&detail_rule, nakshatra_mode);
    let by_month = scan_year(bs_year, category, location, true, Some(&detail_rule))?;
    Ok((by_month, detail_rule))
}

fn parse_bs_date(year: i32, month: u32, day: u32) -> Result<CivilDay, SaitError> {
    bs_to_civil(BsDate { year, month, day }).map_err(|e| SaitError::BadRequest(e.to_string()))
}

/// `GET /nepal/sait/{bs_year}/{category}/detail`.
///
/// # Errors
///
/// Returns [`SaitError`] for unknown categories/modes, non-muhurta categories, or scan failures.
pub fn get_sait_detail(
    bs_year: i32,
    category: &str,
    location: &Location,
    exclude_rules: &BTreeSet<String>,
    nakshatra_mode: Option<&str>,
) -> Result<Value, SaitError> {
    let system = location.system;
    let categories = categories_json()?;
    let Some(meta) = categories.get(category).and_then(Value::as_object) else {
        return Err(SaitError::BadRequest(format!(
            "Unknown sait category: {category}"
        )));
    };
    let rules = ceremony_rules();
    if !rules.contains_key(category) {
        return Err(SaitError::BadRequest(format!(
            "Category '{category}' has no muhūrta-window detail."
        )));
    }
    let normalized_mode = nakshatra_mode.map(str::trim).unwrap_or("").to_lowercase();
    if !normalized_mode.is_empty()
        && !matches!(normalized_mode.as_str(), "classical" | "nepali" | "liberal")
    {
        let raw = nakshatra_mode.unwrap_or("");
        return Err(SaitError::BadRequest(format!(
            "Unknown nakshatra_mode '{raw}'. Expected one of: classical, liberal, nepali."
        )));
    }
    let mode = if category == "bratabandha" && !normalized_mode.is_empty() {
        Some(normalized_mode.as_str())
    } else {
        None
    };
    let toggle_map = toggleable_rule_ids();
    let allowed = toggle_map.get(category).cloned().unwrap_or_default();
    let exclude: BTreeSet<String> = exclude_rules
        .iter()
        .filter(|id| allowed.contains(id.as_str()))
        .cloned()
        .collect();

    let custom = !exclude.is_empty() || mode.is_some_and(|m| m != "classical");
    let (by_month, detail_rule) = if custom {
        custom_year_by_month(bs_year, category, location, &exclude, mode)?
    } else {
        let generated = get_generated_sait(bs_year, category, location)?;
        let mut base = rules
            .get(category)
            .cloned()
            .ok_or_else(|| SaitError::BadRequest(format!("Unknown sait category: {category}")))?;
        if generated.nakshatra_fallback && !base.fallback_nakshatras.is_empty() {
            base.nakshatras = base.fallback_nakshatras.clone();
        }
        if let Some(m) = mode {
            base = apply_nakshatra_mode(&base, Some(m));
        }
        (generated.months, base)
    };

    let mut days_out = Vec::new();
    let mut month_keys: Vec<(&String, &Vec<u32>)> = by_month.iter().collect();
    month_keys.sort_by_key(|(k, _)| k.parse::<u32>().unwrap_or(u32::MAX));
    for (month_key, day_nums) in month_keys {
        let Ok(month) = month_key.parse::<u32>() else {
            continue;
        };
        let mut sorted = day_nums.clone();
        sorted.sort_unstable();
        for bs_day in sorted {
            let greg = parse_bs_date(bs_year, month, bs_day)?;
            let windows = muhurta_windows_for_rule(&detail_rule, greg, location, false)?;
            if windows.is_empty() {
                continue;
            }
            // Python `max(windows, key=duration)` keeps the *first* of equal
            // lengths; Rust `Iterator::max_by` keeps the last — fold like Python.
            let win = windows
                .iter()
                .fold(None, |best: Option<&MuhurtaWindow>, candidate| match best {
                    None => Some(candidate),
                    Some(current) => {
                        let cur = current.end.seconds_since(current.start);
                        let next = candidate.end.seconds_since(candidate.start);
                        if next > cur {
                            Some(candidate)
                        } else {
                            Some(current)
                        }
                    }
                })
                .ok_or_else(|| SaitError::BadRequest("missing muhūrta window".to_owned()))?;
            let dp = build_day_panchanga(greg, location)?;
            let start_local = location.zone.local(win.start);
            let end_local = location.zone.local(win.end);
            let start_jd = win.start.to_jd();
            let tithi_block = tithi(system, start_jd);
            let tdisp = usize::try_from(tithi_block.display_number.saturating_sub(1)).unwrap_or(0);
            let paksha = if tithi_block.paksha == panchanga::Paksha::Shukla {
                "shukla"
            } else {
                "krishna"
            };
            let nak_num =
                usize::try_from(nakshatra_number(system, start_jd).saturating_sub(1)).unwrap_or(0);
            let yoga_num =
                usize::try_from(yoga_number(system, start_jd).saturating_sub(1)).unwrap_or(0);
            let karana_name = karana(system, start_jd).name();
            let karana_index = panchanga::KARANA_NAMES
                .iter()
                .position(|name| *name == karana_name)
                .unwrap_or(0);
            let vaara0 = usize::try_from(dp.vaara.saturating_sub(1)).unwrap_or(0);
            let lagna_index = usize::try_from(win.lagna.saturating_sub(1)).unwrap_or(0);
            days_out.push(json!({
                "bs_month": month,
                "bs_day": bs_day,
                "bs_month_name_ne": BS_MONTHS_NE[usize::try_from(month.saturating_sub(1)).unwrap_or(0)],
                "gregorian": greg.to_string(),
                "weekday_en": WEEKDAY_EN[vaara0],
                "weekday_ne": VAARA_NAMES_NE[vaara0],
                "window_start": start_local.hm(),
                "window_end": end_local.hm(),
                "tithi_num": tithi_block.display_number,
                "tithi_en": TITHI_NAMES_EN[tdisp],
                "tithi_ne": TITHI_NAMES_NE[tdisp],
                "paksha": paksha,
                "paksha_ne": paksha_ne(paksha),
                "nakshatra_num": nak_num + 1,
                "nakshatra_en": panchanga::NAKSHATRA_NAMES[nak_num],
                "nakshatra_ne": NAKSHATRA_NAMES_NE[nak_num],
                "yoga_en": panchanga::YOGA_NAMES[yoga_num],
                "yoga_ne": YOGA_NAMES_NE[yoga_num],
                "karana_en": karana_name,
                "karana_ne": KARANA_NAMES_NE[karana_index],
                "lagna_en": RASHI_NAMES_EN[lagna_index],
                "lagna_ne": RASHI_NAMES_NE[lagna_index],
                "lunar_month_en": dp.lunar_month.clone().unwrap_or_else(|| "Unknown".to_owned()),
                "lunar_month_ne": lunar_masa_name_ne(dp.lunar_month.as_deref().unwrap_or("Unknown")),
            }));
        }
    }
    Ok(json!({
        "bs_year": bs_year,
        "category": category,
        "category_label_ne": meta.get("label_ne").cloned().unwrap_or_else(|| json!(category)),
        "engine_version": SAIT_ENGINE_VERSION,
        "excluded_rules": exclude.iter().cloned().collect::<Vec<_>>(),
        "nakshatra_mode": mode.map_or_else(
            || if category == "bratabandha" { Some("classical".to_owned()) } else { None },
            |m| Some(m.to_owned())
        ),
        "days": days_out,
    }))
}

fn compute_navatara_number(moon_idx: i32, target_idx: i32, cycle_size: i32) -> i32 {
    let diff = (target_idx - moon_idx + cycle_size).rem_euclid(cycle_size);
    if diff == 0 {
        1
    } else {
        ((9 - (diff % 9)).rem_euclid(9)) + 1
    }
}

fn navatara_tone(tara_num: i32) -> &'static str {
    match tara_num {
        2 | 4 | 6 | 9 => "best",
        8 => "good",
        3 | 5 => "bad",
        7 => "worst",
        _ => "neutral",
    }
}

fn parse_birth_instant(
    birth: Option<&str>,
    birth_tz: &str,
    birth_era: Option<&str>,
    birth_year: Option<i32>,
    birth_month: Option<u32>,
    birth_day: Option<u32>,
    birth_clock: Option<&str>,
) -> Result<Option<BirthPoint>, SaitError> {
    let zone = timescale::Zone::get(birth_tz)
        .map_err(|_| SaitError::BadRequest(format!("Unknown observer timezone: {birth_tz}")))?;
    if let (Some(year), Some(month), Some(day)) = (birth_year, birth_month, birth_day) {
        let clock = birth_clock.unwrap_or("12:00");
        let (hour, minute) = parse_clock(clock)?;
        let civil = match (
            birth_era.unwrap_or("ad").trim().to_lowercase().as_str(),
            year,
        ) {
            ("ad", y) => CivilDay::new(y, month, day),
            ("bc", y) => CivilDay::new(1 - y, month, day),
            ("bs", y) => bs_to_civil(BsDate {
                year: y,
                month,
                day,
            })
            .map_err(|e| SaitError::BadRequest(e.to_string()))?,
            ("bbs", y) => bs_to_civil(BsDate {
                year: -y,
                month,
                day,
            })
            .map_err(|e| SaitError::BadRequest(e.to_string()))?,
            (other, _) => {
                return Err(SaitError::BadRequest(format!(
                    "Unknown birth_era '{other}'."
                )));
            }
        };
        if !civil.is_datetime_range() {
            // `local_wall_instant`: a `UtInstant` at the wall clock in the zone's
            // modern offset; `astimezone(tz).date()` of it is its UTC day.
            let offset_hours = f64::from(zone.reference_offset_seconds()) / 3600.0;
            let hour_ut = f64::from(hour) + f64::from(minute) / 60.0 + 0.0 / 3600.0 - offset_hours;
            let instant = timescale::JdInstant(timescale::julday(
                civil.year,
                civil.month,
                civil.day,
                hour_ut,
                civil.calendar(),
            ));
            return Ok(Some(BirthPoint {
                jd: instant.0,
                date: CivilDay::from_jd_ut(instant.0),
            }));
        }
        let offset = zone.offset_at_local(civil, i8::try_from(hour).unwrap_or(0));
        let instant = UtcInstant::from_utc(civil, hour, minute, 0, 0).ok_or_else(|| {
            SaitError::NotImplemented(
                "birth moments before 1582-10-15 are not ported to Rust yet".to_owned(),
            )
        })?;
        return Ok(Some(BirthPoint::of(
            instant.add_seconds(-i64::from(offset)),
            &zone,
        )));
    }
    if let Some(raw) = birth {
        let (date_part, clock_part) = raw
            .split_once('T')
            .ok_or_else(|| SaitError::BadRequest("invalid birth datetime".to_owned()))?;
        let parts: Vec<&str> = date_part.split('-').collect();
        if parts.len() != 3 {
            return Err(SaitError::BadRequest("invalid birth datetime".to_owned()));
        }
        let year = parts[0]
            .parse::<i32>()
            .map_err(|_| SaitError::BadRequest("invalid birth datetime".to_owned()))?;
        let month = parts[1]
            .parse::<u32>()
            .map_err(|_| SaitError::BadRequest("invalid birth datetime".to_owned()))?;
        let day = parts[2]
            .parse::<u32>()
            .map_err(|_| SaitError::BadRequest("invalid birth datetime".to_owned()))?;
        let (hour, minute) = parse_clock(clock_part)?;
        let civil = CivilDay::new(year, month, day);
        let offset = zone.offset_at_local(civil, i8::try_from(hour).unwrap_or(0));
        let instant = UtcInstant::from_utc(civil, hour, minute, 0, 0).ok_or_else(|| {
            SaitError::NotImplemented(
                "birth moments before 1582-10-15 are not ported to Rust yet".to_owned(),
            )
        })?;
        return Ok(Some(BirthPoint::of(
            instant.add_seconds(-i64::from(offset)),
            &zone,
        )));
    }
    Ok(None)
}

/// A birth moment as personalization reads it: its Julian Day and the birth date.
struct BirthPoint {
    jd: f64,
    date: CivilDay,
}

impl BirthPoint {
    fn of(instant: UtcInstant, zone: &timescale::Zone) -> Self {
        Self {
            jd: instant.to_jd(),
            date: zone.local(instant).day(),
        }
    }
}

fn parse_clock(raw: &str) -> Result<(u32, u32), SaitError> {
    let mut parts = raw.split(':');
    let hour = parts
        .next()
        .ok_or_else(|| SaitError::BadRequest("invalid clock".to_owned()))?
        .parse::<u32>()
        .map_err(|_| SaitError::BadRequest("invalid clock".to_owned()))?;
    let minute = parts
        .next()
        .ok_or_else(|| SaitError::BadRequest("invalid clock".to_owned()))?
        .parse::<u32>()
        .map_err(|_| SaitError::BadRequest("invalid clock".to_owned()))?;
    if hour > 23 || minute > 59 {
        return Err(SaitError::BadRequest("invalid clock".to_owned()));
    }
    Ok((hour, minute))
}

fn compute_janma_from_jd(system: System, jd: f64) -> (u32, u32) {
    let nak_num = nakshatra_number(system, jd);
    let rashi_num = ((moon_longitude(system, jd) / 30.0).floor() as i32).rem_euclid(12) + 1;
    (nak_num, u32::try_from(rashi_num).unwrap_or(1))
}

fn planet_tone(house: u32, good_houses: &BTreeSet<u32>) -> &'static str {
    if matches!(house, 4 | 8 | 12) {
        "avoid"
    } else if good_houses.contains(&house) {
        "good"
    } else {
        "shanti"
    }
}

fn overall_shuddhi_tone(tones: &[&str]) -> &'static str {
    if tones.iter().any(|tone| *tone == "avoid") {
        "avoid"
    } else if !tones.is_empty() && tones.iter().all(|tone| *tone == "good") {
        "good"
    } else {
        "shanti"
    }
}

fn annaprasan_month(
    greg: CivilDay,
    birth_date: Option<CivilDay>,
    gender: Option<&str>,
) -> Option<Value> {
    let Some(birth_day) = birth_date else {
        return None;
    };
    let Some(raw_gender) = gender else {
        return None;
    };
    let normalized = raw_gender.trim().to_lowercase();
    let sex = if normalized.starts_with('m') {
        "male"
    } else if normalized.starts_with('f') {
        "female"
    } else {
        return None;
    };
    let mut months = (greg.year - birth_day.year) * 12
        + (i32::try_from(greg.month).unwrap_or(0) - i32::try_from(birth_day.month).unwrap_or(0));
    if greg.day < birth_day.day {
        months -= 1;
    }
    let matches = if sex == "male" {
        [6, 8, 10, 12].contains(&months)
    } else {
        [5, 7, 9, 11].contains(&months)
    };
    Some(json!({
        "ordinal_month": months,
        "gender": sex,
        "matches": matches,
        "tone": if matches { "good" } else { "avoid" },
    }))
}

fn kumbha_zone(count: i32) -> Value {
    let (zone, zone_ne, zone_en, effect_ne, effect_en, tone) = if count == 1 {
        ("mukha", "मुख", "Mouth", "आगोको भय", "risk of fire", "avoid")
    } else if count <= 5 {
        (
            "purva",
            "पूर्व",
            "East",
            "सुखपूर्वक बस्न कठिन",
            "hard to live comfortably",
            "shanti",
        )
    } else if count <= 9 {
        (
            "dakshina",
            "दक्षिण",
            "South",
            "धनलाभ",
            "brings wealth",
            "good",
        )
    } else if count <= 13 {
        (
            "paschima",
            "पश्चिम",
            "West",
            "लक्ष्मीलाभ",
            "gain of Lakṣmī",
            "good",
        )
    } else if count <= 17 {
        ("uttara", "उत्तर", "North", "कलह", "quarrels", "shanti")
    } else if count <= 21 {
        (
            "garbha",
            "गर्भ",
            "Womb",
            "गृहस्वामीको नाश",
            "harms the owner",
            "avoid",
        )
    } else if count <= 24 {
        ("tala", "तल", "Bottom", "दीर्घायु", "long life", "good")
    } else {
        (
            "kantha",
            "कण्ठ",
            "Throat",
            "स्थिर वास",
            "lasting residence",
            "good",
        )
    };
    json!({
        "zone": zone,
        "zone_ne": zone_ne,
        "zone_en": zone_en,
        "effect_ne": effect_ne,
        "effect_en": effect_en,
        "tone": tone,
    })
}

fn kumbha_chakra(system: System, sunrise_utc: UtcInstant, moon_nak: u32) -> Value {
    let sun_lon = system
        .true_longitude_and_speed(Body::Sun, sunrise_utc.to_jd())
        .0;
    let sun_nak = ((sun_lon / (360.0 / 27.0)).floor() as i32).rem_euclid(27) + 1;
    let count = ((i32::try_from(moon_nak).unwrap_or(1) - sun_nak).rem_euclid(27)) + 1;
    json!({
        "count": count,
        "sun_nakshatra": sun_nak,
        "zone": kumbha_zone(count)["zone"],
        "zone_ne": kumbha_zone(count)["zone_ne"],
        "zone_en": kumbha_zone(count)["zone_en"],
        "effect_ne": kumbha_zone(count)["effect_ne"],
        "effect_en": kumbha_zone(count)["effect_en"],
        "tone": kumbha_zone(count)["tone"],
    })
}

fn agni_mukha(system: System, sunrise_utc: UtcInstant, moon_nak: u32) -> Value {
    let planets = [
        ("sun", "सूर्य", "Sun", false),
        ("mercury", "बुध", "Mercury", true),
        ("venus", "शुक्र", "Venus", true),
        ("saturn", "शनि", "Saturn", false),
        ("moon", "चन्द्र", "Moon", true),
        ("mars", "मंगल", "Mars", false),
        ("jupiter", "गुरु", "Jupiter", true),
        ("rahu", "राहु", "Rahu", false),
        ("ketu", "केतु", "Ketu", false),
    ];
    let sun_lon = system
        .true_longitude_and_speed(Body::Sun, sunrise_utc.to_jd())
        .0;
    let sun_nak = ((sun_lon / (360.0 / 27.0)).floor() as i32).rem_euclid(27) + 1;
    let count = ((i32::try_from(moon_nak).unwrap_or(1) - sun_nak).rem_euclid(27)) + 1;
    let idx = usize::try_from((count - 1) / 3)
        .unwrap_or(0)
        .min(planets.len() - 1);
    let (planet, planet_ne, planet_en, benefic) = planets[idx];
    json!({
        "count": count,
        "sun_nakshatra": sun_nak,
        "planet": planet,
        "planet_ne": planet_ne,
        "planet_en": planet_en,
        "benefic": benefic,
        "tone": if benefic { "good" } else { "avoid" },
    })
}

fn verdict(
    tara_tone: &str,
    chandra_tone: &str,
    category_bad: bool,
    native_tone: Option<&str>,
) -> &'static str {
    if category_bad
        || matches!(tara_tone, "bad" | "worst")
        || matches!(chandra_tone, "bad" | "worst")
        || native_tone == Some("avoid")
    {
        return "avoid";
    }
    if native_tone == Some("shanti") {
        return "neutral";
    }
    if matches!(tara_tone, "best" | "good") && matches!(chandra_tone, "best" | "good") {
        "favourable"
    } else {
        "neutral"
    }
}

fn annotate_one(
    greg: CivilDay,
    location: &Location,
    janma_nak: u32,
    janma_rashi: u32,
    category: &str,
    birth_date: Option<CivilDay>,
    gender: Option<&str>,
) -> Result<Value, SaitError> {
    let system = location.system;
    let (sunrise, _, _) = day_times(greg, location)?;
    let sunrise_jd = sunrise.to_jd();
    let t_nak = nakshatra_number(system, sunrise_jd);
    let t_rashi = u32::try_from(
        ((moon_longitude(system, sunrise_jd) / 30.0).floor() as i32).rem_euclid(12) + 1,
    )
    .unwrap_or(1);
    let tara_num = compute_navatara_number(
        i32::try_from(janma_nak).unwrap_or(1) - 1,
        i32::try_from(t_nak).unwrap_or(1) - 1,
        27,
    );
    let chandra_num = compute_navatara_number(
        i32::try_from(janma_rashi).unwrap_or(1) - 1,
        i32::try_from(t_rashi).unwrap_or(1) - 1,
        12,
    );
    let tara_tone = navatara_tone(tara_num);
    let chandra_tone = navatara_tone(chandra_num);
    let moon_house = ((i32::try_from(t_rashi).unwrap_or(1)
        - i32::try_from(janma_rashi).unwrap_or(1))
    .rem_euclid(12)
        + 1) as u32;

    let mut category_bad = false;
    if category == "rudri-jurne" {
        category_bad = [4_u32, 8, 12].contains(&moon_house) || tara_num == 1;
    } else if category == "agni-jurne" {
        category_bad = [4_u32, 8, 12].contains(&moon_house);
    } else if category == "annaprasan" {
        category_bad = tara_num == 1;
    } else if category == "griha-aarambha" {
        category_bad = t_nak == janma_nak;
    }

    let shuddhi = graha_shuddhi(system, sunrise, janma_rashi, t_rashi, category);
    let kumbha = if category == "griha-pravesh" {
        Some(kumbha_chakra(system, sunrise, t_nak))
    } else {
        None
    };
    let agni = if category == "agni-jurne" {
        Some(agni_mukha(system, sunrise, t_nak))
    } else {
        None
    };
    let anna = if category == "annaprasan" {
        annaprasan_month(greg, birth_date, gender)
    } else {
        None
    };
    let native_tone = shuddhi
        .as_ref()
        .and_then(|s| s.get("tone"))
        .and_then(Value::as_str)
        .or_else(|| {
            kumbha
                .as_ref()
                .and_then(|s| s.get("tone"))
                .and_then(Value::as_str)
        })
        .or_else(|| {
            agni.as_ref()
                .and_then(|s| s.get("tone"))
                .and_then(Value::as_str)
        })
        .or_else(|| {
            anna.as_ref()
                .and_then(|s| s.get("tone"))
                .and_then(Value::as_str)
        });

    let tara_ne = [
        "जन्म",
        "सम्पत्",
        "विपत्",
        "क्षेम",
        "प्रत्यक्",
        "साधक",
        "निधन",
        "मित्र",
        "परम मित्र",
    ][usize::try_from(tara_num - 1).unwrap_or(0)];

    Ok(json!({
        "suitability": verdict(tara_tone, chandra_tone, category_bad, native_tone),
        "tara_num": tara_num,
        "tara_tone": tara_tone,
        "tara_ne": tara_ne,
        "chandra_num": chandra_num,
        "chandra_tone": chandra_tone,
        "moon_house": moon_house,
        "shuddhi": shuddhi,
        "kumbha": kumbha,
        "agni_mukha": agni,
        "anna_month": anna,
        "transit_nakshatra": t_nak,
        "transit_nakshatra_ne": NAKSHATRA_NAMES_NE[usize::try_from(t_nak.saturating_sub(1)).unwrap_or(0)],
        "transit_nakshatra_en": panchanga::NAKSHATRA_NAMES[usize::try_from(t_nak.saturating_sub(1)).unwrap_or(0)],
        "transit_rashi_ne": RASHI_NAMES_NE[usize::try_from(t_rashi.saturating_sub(1)).unwrap_or(0)],
        "transit_rashi_en": RASHI_NAMES_EN[usize::try_from(t_rashi.saturating_sub(1)).unwrap_or(0)],
    }))
}

fn graha_shuddhi(
    system: System,
    sunrise_utc: UtcInstant,
    janma_rashi: u32,
    moon_rashi: u32,
    category: &str,
) -> Option<Value> {
    let planets = match category {
        "bratabandha" => vec![("guru", Body::Jupiter, set(&[2_u32, 5, 7, 9, 11]))],
        "griha-aarambha" => vec![
            ("sun", Body::Sun, set(&[3_u32, 6, 10, 11])),
            ("moon", Body::Moon, set(&[3_u32, 6, 7, 10, 11])),
            ("guru", Body::Jupiter, set(&[2_u32, 5, 7, 9, 11])),
            ("shukra", Body::Venus, set(&[2_u32, 5, 7, 9, 11])),
        ],
        "byaparik-pratisthan" => vec![("moon", Body::Moon, set(&[3_u32, 6, 7, 10, 11]))],
        _ => return None,
    };
    let mut rows = Vec::new();
    let mut tones = Vec::new();
    for (key, body, good_houses) in planets {
        let p_rashi = if key == "moon" {
            moon_rashi
        } else {
            u32::try_from(
                ((system.true_longitude_and_speed(body, sunrise_utc.to_jd()).0 / 30.0).floor()
                    as i32)
                    .rem_euclid(12)
                    + 1,
            )
            .unwrap_or(1)
        };
        let house = ((i32::try_from(p_rashi).unwrap_or(1)
            - i32::try_from(janma_rashi).unwrap_or(1))
        .rem_euclid(12)
            + 1) as u32;
        let tone = planet_tone(house, &good_houses);
        tones.push(tone);
        rows.push(json!({
            "planet": key,
            "house": house,
            "tone": tone,
            "rashi_ne": RASHI_NAMES_NE[usize::try_from(p_rashi.saturating_sub(1)).unwrap_or(0)],
            "rashi_en": RASHI_NAMES_EN[usize::try_from(p_rashi.saturating_sub(1)).unwrap_or(0)],
        }));
    }
    Some(json!({
        "tone": overall_shuddhi_tone(&tones),
        "planets": rows,
    }))
}

fn personalize_sait(
    bs_year: i32,
    category: &str,
    janma_nakshatra: u32,
    janma_rashi: u32,
    location: &Location,
    birth_date: Option<CivilDay>,
    gender: Option<&str>,
) -> Result<Value, SaitError> {
    if !(1..=27).contains(&janma_nakshatra) {
        return Err(SaitError::BadRequest(
            "janma_nakshatra must be 1–27".to_owned(),
        ));
    }
    if !(1..=12).contains(&janma_rashi) {
        return Err(SaitError::BadRequest("janma_rashi must be 1–12".to_owned()));
    }
    let entries = get_sait_month_entries(bs_year, category, location)?;
    let mut days_out = Vec::new();
    if let Some(months) = entries["months"].as_array() {
        for month in months {
            let Some(bs_month) = month["month"].as_u64().and_then(|v| u32::try_from(v).ok()) else {
                continue;
            };
            if let Some(days) = month["days"].as_array() {
                for bs_day in days {
                    let Some(day_num) = bs_day.as_u64().and_then(|v| u32::try_from(v).ok()) else {
                        continue;
                    };
                    let greg = parse_bs_date(bs_year, bs_month, day_num)?;
                    let annotation = annotate_one(
                        greg,
                        location,
                        janma_nakshatra,
                        janma_rashi,
                        category,
                        birth_date,
                        gender,
                    )?;
                    let mut row = Map::new();
                    row.insert("bs_month".to_owned(), json!(bs_month));
                    row.insert("bs_day".to_owned(), json!(day_num));
                    if let Value::Object(values) = annotation {
                        row.extend(values);
                    }
                    days_out.push(Value::Object(row));
                }
            }
        }
    }
    let mut counts = Map::from_iter([
        ("favourable".to_owned(), json!(0)),
        ("neutral".to_owned(), json!(0)),
        ("avoid".to_owned(), json!(0)),
    ]);
    for row in &days_out {
        if let Some(key) = row["suitability"].as_str() {
            let next = counts.get(key).and_then(Value::as_i64).map_or(1, |v| v + 1);
            counts.insert(key.to_owned(), json!(next));
        }
    }
    Ok(json!({
        "bs_year": bs_year,
        "category": category,
        "janma": {"nakshatra": janma_nakshatra, "rashi": janma_rashi},
        "counts": Value::Object(counts),
        "days": days_out,
    }))
}

/// `GET /nepal/sait/{bs_year}/{category}/personalize`.
///
/// # Errors
///
/// Returns [`SaitError`] when birth inputs are incomplete/invalid or the year scan fails.
pub fn personalize_for_birth(
    bs_year: i32,
    category: &str,
    location: &Location,
    janma_nakshatra: Option<u32>,
    janma_rashi: Option<u32>,
    birth: Option<&str>,
    birth_tz: &str,
    birth_era: Option<&str>,
    birth_year: Option<i32>,
    birth_month: Option<u32>,
    birth_day: Option<u32>,
    birth_clock: Option<&str>,
    gender: Option<&str>,
) -> Result<Value, SaitError> {
    let system = location.system;
    let instant = parse_birth_instant(
        birth,
        birth_tz,
        birth_era,
        birth_year,
        birth_month,
        birth_day,
        birth_clock,
    )?;
    let mut janma_nak = janma_nakshatra;
    let mut janma_ras = janma_rashi;
    let mut birth_date = None;
    if let Some(point) = instant {
        birth_date = Some(point.date);
        if janma_nak.is_none() || janma_ras.is_none() {
            let (nak, ras) = compute_janma_from_jd(system, point.jd);
            janma_nak = Some(nak);
            janma_ras = Some(ras);
        }
    }
    let Some(jn) = janma_nak else {
        return Err(SaitError::BadRequest(
            "Provide either janma_nakshatra + janma_rashi, or a birth moment.".to_owned(),
        ));
    };
    let Some(jr) = janma_ras else {
        return Err(SaitError::BadRequest(
            "Provide either janma_nakshatra + janma_rashi, or a birth moment.".to_owned(),
        ));
    };
    personalize_sait(bs_year, category, jn, jr, location, birth_date, gender)
}
