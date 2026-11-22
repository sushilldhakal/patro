//! Nepal Sambat (नेपाल सम्बत): amānta months from Kachhalā (Kartik), new year on
//! Kartik Shukla Pratipada. A port of `engine/panchanga/nepal_sambat.py`.

use std::sync::LazyLock;

use astronomy::{cache::Cache, engine::Observer};
use serde_json::{Value, json};
use timescale::CivilDay;

use crate::{
    angas::Paksha,
    lunar_month::{BS_MONTH_NAMES, DateSelection, find_festival_in_lunar_month},
};

const BS_TO_NS_OFFSET: i32 = 937;
const NS_MONTH_NAMES_NE: [&str; 12] = [
    "कछला",
    "थिन्ला",
    "पोहेला",
    "सिल्ला",
    "चिल्ला",
    "चौला",
    "बछला",
    "तछला",
    "दिल्ला",
    "गुँला",
    "ञला",
    "कौला",
];

/// Index into [`NS_MONTH_NAMES_NE`] of an amānta month (Kartik is Kachhalā).
fn ns_month_of_amanta(name: &str) -> Option<usize> {
    let i = BS_MONTH_NAMES.iter().position(|n| *n == name)?;
    Some((i + 12 - 6) % 12)
}

fn paksha_ne(paksha: Paksha) -> &'static str {
    match paksha {
        Paksha::Shukla => "शुक्ल पक्ष",
        Paksha::Krishna => "कृष्ण पक्ष",
    }
}

/// Kartik Shukla Pratipada inside the BS year (`find_ns_new_year`).
type NewYearKey = (i32, u64, u64, String, usize);

/// Nepal Sambat new year per BS year and observer: the same for every day of the
/// year, so found once instead of once per day.
static NEW_YEARS: LazyLock<Cache<NewYearKey, Option<CivilDay>>> =
    LazyLock::new(|| Cache::new(4096));

fn ns_new_year(bs_year: i32, observer: &Observer) -> Option<CivilDay> {
    let key = (
        bs_year,
        observer.latitude.to_bits(),
        observer.longitude.to_bits(),
        observer.zone.name().to_owned(),
        observer.system.key(),
    );
    NEW_YEARS.get_or_insert_with(key, || find_ns_new_year(bs_year, observer))
}

fn find_ns_new_year(bs_year: i32, observer: &Observer) -> Option<CivilDay> {
    let start = calendar::month_start(bs_year, 1).ok()?;
    let end = calendar::month_start(bs_year + 1, 1).ok()?.add_days(-1);
    (start.year..=end.year)
        .filter_map(|y| {
            find_festival_in_lunar_month(
                "Kartik",
                1,
                Paksha::Shukla,
                y,
                DateSelection::Udaya,
                observer,
            )
        })
        .find(|d| start <= *d && *d <= end)
}

pub(crate) struct NsInput<'a> {
    pub(crate) day: CivilDay,
    pub(crate) bs_year: i32,
    pub(crate) tithi_display: u32,
    pub(crate) tithi_absolute: u32,
    pub(crate) tithi_name_ne: &'a str,
    pub(crate) paksha: Paksha,
    pub(crate) lunar_month_name: Option<&'a str>,
    pub(crate) is_adhik: bool,
}

/// `gregorian_to_ns`, or `None` when the new year cannot be found (Python raises there).
pub(crate) fn ns_date(input: &NsInput<'_>, observer: &Observer) -> Option<Value> {
    let new_year = ns_new_year(input.bs_year, observer)?;
    let month_index = input
        .lunar_month_name
        .and_then(|n| BS_MONTH_NAMES.iter().position(|m| *m == n))
        .map(|i| i + 1);
    let label = if input.is_adhik {
        match input.paksha {
            Paksha::Shukla => "अनालाथ्व".to_owned(),
            Paksha::Krishna => "अनालागा".to_owned(),
        }
    } else if input.paksha == Paksha::Krishna && input.lunar_month_name.is_some() {
        input
            .lunar_month_name
            .and_then(ns_month_of_amanta)
            .map_or_else(
                || "कृष्ण पक्ष".to_owned(),
                |i| format!("{}गा", NS_MONTH_NAMES_NE[i]),
            )
    } else {
        paksha_ne(input.paksha).to_owned()
    };
    Some(json!({
        "year": input.bs_year - BS_TO_NS_OFFSET,
        "month": input.lunar_month_name.unwrap_or("Unknown"),
        "month_index": month_index,
        "month_name_ne": input.lunar_month_name.and_then(ns_month_of_amanta).map(|i| NS_MONTH_NAMES_NE[i]),
        "day": input.tithi_display,
        "tithi_absolute": input.tithi_absolute,
        "paksha": input.paksha.name(),
        "paksha_ne": label,
        "label_ne": format!("{label} {} - {}", input.tithi_name_ne, input.tithi_absolute),
        "new_year": new_year.to_string(),
        "is_before_new_year": input.day < new_year,
    }))
}
