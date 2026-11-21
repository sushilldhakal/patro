//! Lunar months: amanta (Aausi → Aausi), pūrṇimānta (Purnima → Purnima) and festival masa.
//!
//! A port of `engine/panchanga/lunar_month.py` and `adhik_maas.py` as far as the daily
//! panchanga and the Nepal Sambat new year use them. A lunar month is named after the
//! Sun's rashi at its opening Aausi; it is adhik when the Sun is in the same rashi at
//! both of its Aausis (no sankranti inside).

use std::{
    collections::HashMap,
    sync::{Arc, LazyLock, Mutex},
};

use astronomy::engine::{Observer, rise_set_on_day, sun_longitude};
use astronomy::surya_siddhanta::{Body, Crossing};
use serde_json::{Value, json};
use timescale::{CivilDay, Moment, UtcInstant, Zone};

use crate::{
    angas::{Paksha, tithi},
    boundaries::{tithi_end, tithi_start},
    pyfloat::py_int,
};

/// Solar month names, Mesha (Baishakh) first: the names lunar months take.
pub(crate) const BS_MONTH_NAMES: [&str; 12] = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush",
    "Magh", "Falgun", "Chaitra",
];
const LUNAR_MASA_NE: [&str; 12] = [
    "वैशाख",
    "ज्येष्ठ",
    "आषाढ",
    "श्रावण",
    "भाद्रपद",
    "आश्विन",
    "कार्तिक",
    "मार्गशीर्ष",
    "पौष",
    "माघ",
    "फाल्गुन",
    "चैत्र",
];

const MICROS_PER_DAY: i64 = 86_400_000_000;

/// `lunar_masa_name_ne`: Devanagari masa name.
pub(crate) fn masa_ne(name: &str) -> &str {
    BS_MONTH_NAMES
        .iter()
        .position(|n| *n == name)
        .map_or(name, |i| LUNAR_MASA_NE[i])
}

fn sun_rashi_at(at: UtcInstant) -> usize {
    usize::try_from(py_int(sun_longitude(at.to_jd()) / 30.0) % 12)
        .expect("rashi index is non-negative")
}

/// `find_next_tithi`: start of the next instant with this tithi, scanning in 12-hour
/// steps for `within_days`.
pub(crate) fn find_next_tithi(
    display: u32,
    paksha: Paksha,
    after: UtcInstant,
    within_days: i64,
) -> Option<UtcInstant> {
    let target = if paksha == Paksha::Krishna {
        display + 15
    } else {
        display
    };
    let end = after.add_micros(within_days * MICROS_PER_DAY);
    let mut search = after;
    while search < end {
        if tithi(search.to_jd()).number == target {
            return Some(tithi_start(search));
        }
        search = search.add_hours(12);
    }
    None
}

fn find_purnima(after: UtcInstant) -> Option<UtcInstant> {
    find_next_tithi(15, Paksha::Shukla, after, 35).map(tithi_end)
}

fn find_aausi(after: UtcInstant) -> Option<UtcInstant> {
    find_next_tithi(15, Paksha::Krishna, after, 35).map(tithi_end)
}

fn kathmandu_observer() -> Observer {
    Observer {
        latitude: 27.7172,
        longitude: 85.324,
        zone: Zone::kathmandu(),
    }
}

/// First Kathmandu civil day whose sunrise is at or after `instant`.
fn udaya_day_on_or_after(instant: UtcInstant, kathmandu: &Observer) -> CivilDay {
    let day = kathmandu.zone.local(instant).day();
    match rise_set_on_day(Body::Sun, day, kathmandu, Crossing::Rise) {
        Some(Moment::Utc(sunrise)) if sunrise < instant => day.add_days(1),
        _ => day,
    }
}

/// One amanta lunar month.
#[derive(Debug, Clone)]
pub(crate) struct LunarMonth {
    pub(crate) start_aausi: UtcInstant,
    pub(crate) end_purnima: UtcInstant,
    pub(crate) end_aausi: UtcInstant,
    pub(crate) name: &'static str,
    pub(crate) is_adhik: bool,
    pub(crate) first_day: CivilDay,
    pub(crate) last_day: CivilDay,
    pub(crate) purnima_day: CivilDay,
}

impl LunarMonth {
    fn full_name(&self) -> String {
        if self.is_adhik {
            format!("Adhik {}", self.name)
        } else {
            self.name.to_owned()
        }
    }
}

fn compute_lunar_month(start: UtcInstant, kathmandu: &Observer) -> Option<LunarMonth> {
    let purnima = find_purnima(start.add_micros(2 * MICROS_PER_DAY))?;
    let next = find_aausi(purnima.add_micros(2 * MICROS_PER_DAY))?;
    let rashi = sun_rashi_at(start);
    Some(LunarMonth {
        start_aausi: start,
        end_purnima: purnima,
        end_aausi: next,
        name: BS_MONTH_NAMES[rashi],
        is_adhik: rashi == sun_rashi_at(next),
        first_day: udaya_day_on_or_after(start, kathmandu),
        last_day: udaya_day_on_or_after(next, kathmandu).add_days(-1),
        purnima_day: udaya_day_on_or_after(purnima, kathmandu).add_days(-1),
    })
}

/// The lunar months from the first Aausi after 15 February of a Gregorian year.
#[derive(Debug)]
pub(crate) struct LunarYear {
    pub(crate) months: Vec<LunarMonth>,
    pub(crate) adhik_name: Option<&'static str>,
}

fn build_lunar_year(year: i32) -> LunarYear {
    let kathmandu = kathmandu_observer();
    let mut months = Vec::new();
    let start = UtcInstant::from_utc(CivilDay::new(year, 2, 15), 0, 0, 0, 0);
    if let Some(mut current) = start.and_then(find_aausi) {
        for _ in 0..14 {
            let Some(month) = compute_lunar_month(current, &kathmandu) else {
                break;
            };
            current = month.end_aausi;
            months.push(month);
            if current.fields().0.year > year + 1 {
                break;
            }
        }
    }
    let adhik_name = months.iter().find(|m| m.is_adhik).map(|m| m.name);
    LunarYear { months, adhik_name }
}

static LUNAR_YEARS: LazyLock<Mutex<HashMap<i32, Arc<LunarYear>>>> = LazyLock::new(Mutex::default);

/// The lunar year of a Gregorian year, built once per process (`get_lunar_year`).
pub(crate) fn lunar_year(year: i32) -> Arc<LunarYear> {
    if let Some(found) = LUNAR_YEARS
        .lock()
        .expect("lunar year cache lock")
        .get(&year)
    {
        return Arc::clone(found);
    }
    let built = Arc::new(build_lunar_year(year));
    let mut cache = LUNAR_YEARS.lock().expect("lunar year cache lock");
    Arc::clone(cache.entry(year).or_insert(built))
}

/// A pūrṇimānta window: the day after the previous Purnima through this Purnima.
#[derive(Debug, Clone)]
struct PurnimantWindow {
    start: CivilDay,
    end_purnima: CivilDay,
    start_dt: UtcInstant,
    end_dt: UtcInstant,
    name: &'static str,
    is_adhik: bool,
}

fn purnimant_windows(year: &LunarYear) -> Vec<PurnimantWindow> {
    let kathmandu = kathmandu_observer();
    let mut prev: Option<UtcInstant> = None;
    year.months
        .iter()
        .map(|m| {
            let window = PurnimantWindow {
                start: prev.map_or(m.first_day, |p| udaya_day_on_or_after(p, &kathmandu)),
                end_purnima: m.purnima_day,
                start_dt: prev.map_or(m.start_aausi, |p| p.add_micros(MICROS_PER_DAY)),
                end_dt: m.end_purnima,
                name: m.name,
                is_adhik: m.is_adhik,
            };
            prev = Some(m.end_purnima);
            window
        })
        .collect()
}

/// `_lunar_month_payload`.
struct MonthPayload<'a> {
    name: Option<&'a str>,
    full_name: Option<String>,
    is_adhik: bool,
    month_type: &'static str,
    paksha_model: &'static str,
    window: Option<(CivilDay, CivilDay)>,
    solar_name: Option<&'a str>,
    festival_masa: Option<&'a str>,
}

impl MonthPayload<'_> {
    fn unknown(paksha_model: &'static str) -> Self {
        MonthPayload {
            name: None,
            full_name: None,
            is_adhik: false,
            month_type: "unknown",
            paksha_model,
            window: None,
            solar_name: None,
            festival_masa: None,
        }
    }

    fn to_json(&self) -> Value {
        json!({
            "name": self.name,
            "name_ne": self.name.map(masa_ne),
            "full_name": self.full_name.clone().or_else(|| self.name.map(str::to_owned)),
            "is_adhik": self.is_adhik,
            "type": self.month_type,
            "paksha_model": self.paksha_model,
            "window_start": self.window.map(|w| w.0.to_string()),
            "window_end": self.window.map(|w| w.1.to_string()),
            "solar_name": self.solar_name,
            "festival_masa": self.festival_masa,
        })
    }
}

fn years_around(day: CivilDay) -> [Arc<LunarYear>; 3] {
    [
        lunar_year(day.year - 1),
        lunar_year(day.year),
        lunar_year(day.year + 1),
    ]
}

fn amanta_for(day: CivilDay) -> Value {
    for year in years_around(day) {
        if let Some(m) = year
            .months
            .iter()
            .find(|m| m.first_day <= day && day <= m.last_day)
        {
            return MonthPayload {
                name: Some(m.name),
                full_name: Some(m.full_name()),
                is_adhik: m.is_adhik,
                month_type: if m.is_adhik { "adhik" } else { "nija" },
                paksha_model: "amanta",
                window: Some((m.first_day, m.last_day)),
                solar_name: Some(m.name),
                festival_masa: Some(m.name),
            }
            .to_json();
        }
    }
    MonthPayload::unknown("amanta").to_json()
}

fn festival_masa_for(day: CivilDay) -> Value {
    for year in years_around(day) {
        if let Some(w) = purnimant_windows(&year)
            .iter()
            .find(|w| w.start <= day && day <= w.end_purnima)
        {
            return MonthPayload {
                name: Some(w.name),
                full_name: Some(if w.is_adhik {
                    format!("Adhik {}", w.name)
                } else {
                    w.name.to_owned()
                }),
                is_adhik: w.is_adhik,
                month_type: if w.is_adhik { "adhik" } else { "nija" },
                paksha_model: "festival",
                window: Some((w.start, w.end_purnima)),
                solar_name: Some(w.name),
                festival_masa: Some(w.name),
            }
            .to_json();
        }
    }
    MonthPayload::unknown("purnimant").to_json()
}

fn next_masa(name: &'static str) -> &'static str {
    BS_MONTH_NAMES
        .iter()
        .position(|n| *n == name)
        .map_or(name, |i| BS_MONTH_NAMES[(i + 1) % 12])
}

/// `compute_purnimanta_paksha`: the pūrṇimānta month of a day at paksha granularity.
fn purnimanta_paksha(day: CivilDay, paksha: Paksha) -> Value {
    let mut context = None;
    for year in years_around(day) {
        let mut prev: Option<&LunarMonth> = None;
        for m in &year.months {
            if m.first_day <= day && day <= m.last_day {
                context = Some((m.clone(), prev.cloned()));
                break;
            }
            prev = Some(m);
        }
        if context.is_some() {
            break;
        }
    }
    let Some((mut month, prev)) = context else {
        return MonthPayload::unknown("purnimant").to_json();
    };
    // The junction Aausi closes the previous month, so its Krishna paksha stays contiguous.
    if paksha == Paksha::Krishna && day == month.first_day {
        if let Some(prev) = prev {
            month = prev;
        }
    }
    let (name, is_adhik, month_type) = if month.is_adhik {
        (month.name, true, "adhik")
    } else if paksha == Paksha::Krishna {
        (next_masa(month.name), false, "nija")
    } else {
        (month.name, false, "nija")
    };
    MonthPayload {
        name: Some(name),
        full_name: Some(if is_adhik {
            format!("Adhik {name}")
        } else {
            name.to_owned()
        }),
        is_adhik,
        month_type,
        paksha_model: "purnimant",
        window: Some((month.first_day, month.last_day)),
        solar_name: Some(month.name),
        festival_masa: Some(name),
    }
    .to_json()
}

/// `merge_lunar_month_for_day`: the amanta month plus the pūrṇimānta fields.
#[must_use]
pub(crate) fn merge_for_day(day: CivilDay, paksha: Paksha) -> Value {
    let mut amanta = amanta_for(day);
    let purnim = purnimanta_paksha(day, paksha);
    if let Value::Object(map) = &mut amanta {
        for (to, from) in [
            ("purnimanta_name", "name"),
            ("purnimanta_name_ne", "name_ne"),
            ("purnimanta_full_name", "full_name"),
            ("purnimanta_is_adhik", "is_adhik"),
            ("purnimanta_type", "type"),
            ("purnimanta_solar_name", "solar_name"),
            ("purnimanta_festival_masa", "festival_masa"),
        ] {
            map.insert(to.into(), purnim[from].clone());
        }
    }
    amanta
}

/// `get_lunar_calendar_layers`: adhik summary, amanta, pūrṇimānta and festival masa.
#[must_use]
pub fn calendar_layers(day: CivilDay, paksha: Paksha) -> Value {
    let adhik = lunar_year(day.year).adhik_name;
    json!({
        "adhik_maas": {
            "year_has_adhik": adhik.is_some(),
            "name": adhik,
            "name_ne": adhik.map(|n| format!("अधिक {}", masa_ne(n))),
        },
        "amanta": amanta_for(day),
        "purnimant": purnimanta_paksha(day, paksha),
        "festival_masa": festival_masa_for(day),
    })
}

/// (display tithi 1–15, paksha) at the observer's sunrise on `day` (`get_udaya_tithi`).
#[must_use]
pub fn udaya_tithi(day: CivilDay, observer: &Observer) -> Option<(u32, Paksha)> {
    match rise_set_on_day(Body::Sun, day, observer, Crossing::Rise)? {
        Moment::Utc(sunrise) => {
            let t = tithi(sunrise.to_jd());
            Some((t.display_number, t.paksha))
        }
        Moment::Jd(_) => None,
    }
}

/// The instant this month's tithi begins, if it falls inside the month.
fn boundary_instant(month: &LunarMonth, display: u32, paksha: Paksha) -> Option<UtcInstant> {
    let search_start = if paksha == Paksha::Shukla {
        month.start_aausi
    } else {
        month.end_purnima
    };
    let found = find_next_tithi(display, paksha, search_start, 35)?;
    let inside = if paksha == Paksha::Krishna && display == 15 {
        search_start <= found && found <= month.end_aausi.add_hours(24)
    } else {
        search_start <= found && found < month.end_aausi
    };
    inside.then_some(found)
}

/// How a festival rule picks the civil day out of the tithi it names.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DateSelection {
    /// The day whose sunrise the tithi holds (what the printed patro prints).
    Udaya,
    /// The day the tithi begins, sunrise ignored.
    Boundary,
    /// The day the tithi pervades midday (the third fifth of daylight).
    Madhyahna,
    /// The day the tithi pervades the fourth fifth of daylight.
    Aparahna,
    /// The day the tithi pervades the first fifth of the night.
    Pradosh,
    /// Joined with the next tithi, never the one before (शरद् महाअष्टमी).
    ParaYuta,
}

impl DateSelection {
    /// From the rule book's `date_selection` string (`udaya` when absent or unknown).
    #[must_use]
    pub fn from_rule(value: Option<&str>) -> Self {
        match value {
            Some("boundary") => Self::Boundary,
            Some("madhyahna") => Self::Madhyahna,
            Some("aparahna") => Self::Aparahna,
            Some("pradosh") => Self::Pradosh,
            Some("para_yuta") => Self::ParaYuta,
            _ => Self::Udaya,
        }
    }
}

fn sunrise_sunset(day: CivilDay, observer: &Observer, crossing: Crossing) -> Option<UtcInstant> {
    match rise_set_on_day(Body::Sun, day, observer, crossing)? {
        Moment::Utc(t) => Some(t),
        Moment::Jd(_) => None,
    }
}

/// `kaal_window`: (start, end) of a day part on `day`.
fn kaal_window(
    day: CivilDay,
    kaal: DateSelection,
    observer: &Observer,
) -> Option<(UtcInstant, UtcInstant)> {
    let sunrise = sunrise_sunset(day, observer, Crossing::Rise)?;
    let sunset = sunrise_sunset(day, observer, Crossing::Set)?;
    let fifth = |a: UtcInstant, b: UtcInstant| crate::pyfloat::timedelta_div(b.micros_since(a), 5);
    match kaal {
        DateSelection::Madhyahna | DateSelection::Aparahna => {
            let part = fifth(sunrise, sunset);
            let index = if kaal == DateSelection::Madhyahna {
                2
            } else {
                3
            };
            Some((
                sunrise.add_micros(index * part),
                sunrise.add_micros((index + 1) * part),
            ))
        }
        DateSelection::Pradosh => {
            let next = sunrise_sunset(day.add_days(1), observer, Crossing::Rise)?;
            Some((sunset, sunset.add_micros(fifth(sunset, next))))
        }
        _ => None,
    }
}

/// `vyapini_date`: the day the tithi covers more of the kaal (earlier day on a tie).
fn vyapini_date(
    start: UtcInstant,
    end: UtcInstant,
    kaal: DateSelection,
    observer: &Observer,
) -> Option<CivilDay> {
    let (first, last) = (
        observer.zone.local(start).day(),
        observer.zone.local(end).day(),
    );
    let mut best = None;
    let mut best_overlap = 0.0;
    let mut day = first;
    while day <= last {
        if let Some((ws, we)) = kaal_window(day, kaal, observer) {
            let overlap = end.min(we).seconds_since(start.max(ws)).max(0.0);
            if overlap > best_overlap {
                best = Some(day);
                best_overlap = overlap;
            }
        }
        day = day.add_days(1);
    }
    best
}

/// `_search_tithi_in_month`: the udaya day near the tithi's start.
fn search_udaya(
    month: &LunarMonth,
    display: u32,
    paksha: Paksha,
    observer: &Observer,
) -> Option<CivilDay> {
    let boundary = observer
        .zone
        .local(boundary_instant(month, display, paksha)?)
        .day();
    (0..5)
        .map(|offset| boundary.add_days(offset - 1))
        .find(|check| udaya_tithi(*check, observer) == Some((display, paksha)))
}

fn boundary_day(
    month: &LunarMonth,
    display: u32,
    paksha: Paksha,
    observer: &Observer,
) -> Option<CivilDay> {
    Some(
        observer
            .zone
            .local(boundary_instant(month, display, paksha)?)
            .day(),
    )
}

/// One month's candidate day, and whether the selection rule itself resolved it (`_resolve_tithi_day`).
fn resolve_tithi_day(
    month: &LunarMonth,
    display: u32,
    paksha: Paksha,
    selection: DateSelection,
    observer: &Observer,
) -> Option<(CivilDay, bool)> {
    match selection {
        DateSelection::Boundary => {
            return boundary_day(month, display, paksha, observer).map(|d| (d, false));
        }
        DateSelection::ParaYuta => {
            let Some(first) = search_udaya(month, display, paksha, observer) else {
                return boundary_day(month, display, paksha, observer).map(|d| (d, false));
            };
            let following = first.add_days(1);
            return Some(
                if udaya_tithi(following, observer) == Some((display, paksha)) {
                    (following, true)
                } else {
                    (first, true)
                },
            );
        }
        DateSelection::Madhyahna | DateSelection::Aparahna | DateSelection::Pradosh => {
            if let Some(start) = boundary_instant(month, display, paksha) {
                if let Some(day) = vyapini_date(start, tithi_end(start), selection, observer) {
                    return Some((day, true));
                }
            }
        }
        DateSelection::Udaya => {}
    }
    if let Some(exact) = search_udaya(month, display, paksha, observer) {
        return Some((exact, true));
    }
    boundary_day(month, display, paksha, observer).map(|d| (d, false))
}

/// A civil BS month's day whose udaya tithi is (15, `paksha`) (`_find_bs_civil_purnima` / `_Aausi`).
fn bs_civil_fifteenth(
    bs_year: i32,
    bs_month: u32,
    paksha: Paksha,
    observer: &Observer,
) -> Option<CivilDay> {
    let start = calendar::month_start(bs_year, bs_month).ok()?;
    let length = calendar::month_length(bs_year, bs_month).ok()?;
    (0..i32::try_from(length).ok()?)
        .map(|o| start.add_days(o))
        .find(|d| udaya_tithi(*d, observer) == Some((15, paksha)))
}

/// `find_festival_in_lunar_month` for the festival month model with adhik months
/// skipped, as every rule in the rule book uses it.
#[must_use]
pub fn find_festival_in_lunar_month(
    name: &str,
    display: u32,
    paksha: Paksha,
    gregorian_year: i32,
    selection: DateSelection,
    observer: &Observer,
) -> Option<CivilDay> {
    if name == "Shrawan" && display == 15 && paksha == Paksha::Shukla {
        // MoHA: Shrawan's civil Purnima unless it falls before day 20; then Bhadau's.
        let bs_year = gregorian_year + 57;
        let shrawan = bs_civil_fifteenth(bs_year, 4, Paksha::Shukla, observer);
        let bhadau = bs_civil_fifteenth(bs_year, 5, Paksha::Shukla, observer);
        if let Some(day) = shrawan {
            if calendar::civil_to_bs(day).is_ok_and(|bs| bs.day >= 20) && day.year == gregorian_year
            {
                return Some(day);
            }
        }
        if let Some(day) = bhadau.filter(|d| d.year == gregorian_year) {
            return Some(day);
        }
    }
    if name == "Baishakh" && display == 15 && paksha == Paksha::Krishna {
        if let Some(day) = bs_civil_fifteenth(gregorian_year + 57, 1, Paksha::Krishna, observer)
            .filter(|d| d.year == gregorian_year)
        {
            return Some(day);
        }
    }
    let mut candidates: Vec<(CivilDay, bool)> = Vec::new();
    for search_year in [gregorian_year - 1, gregorian_year] {
        let year = lunar_year(search_year);
        for w in purnimant_windows(&year)
            .into_iter()
            .filter(|w| w.name == name && !w.is_adhik)
        {
            let month = LunarMonth {
                start_aausi: w.start_dt,
                end_purnima: w.start_dt.add_micros(-MICROS_PER_DAY),
                end_aausi: w.end_dt.add_micros(MICROS_PER_DAY),
                name: w.name,
                is_adhik: w.is_adhik,
                first_day: w.start,
                last_day: w.end_purnima,
                purnima_day: w.end_purnima,
            };
            candidates.extend(resolve_tithi_day(
                &month, display, paksha, selection, observer,
            ));
        }
    }
    candidates
        .into_iter()
        .min_by_key(|(day, exact)| {
            (
                i32::from(day.year != gregorian_year),
                (day.year - gregorian_year).abs(),
                i32::from(day.year < gregorian_year),
                i32::from(!exact),
                *day,
            )
        })
        .map(|(day, _)| day)
}

/// First day of the year's Adhik Maas when it is `name` (`compute_adhik_arambha`), or of
/// any Adhik Maas when `name` is `None`.
#[must_use]
pub fn adhik_month_first_day(gregorian_year: i32, name: Option<&str>) -> Option<CivilDay> {
    let year = lunar_year(gregorian_year);
    let adhik = year.months.iter().find(|m| m.is_adhik)?;
    if name.is_some_and(|n| n != adhik.name) {
        return None;
    }
    Some(adhik.first_day)
}

const RASHI_NAMES: [&str; 12] = [
    "Mesha",
    "Vrisha",
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

fn sankrantis_in_period(start: UtcInstant, end: UtcInstant) -> Vec<u32> {
    let mut sankrantis = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let mut check = start.to_jd();
    let end_jd = end.to_jd();
    while check < end_jd {
        let rashi = calendar::sun_rashi_at_jd(check);
        let next = (rashi + 1) % 12;
        if seen.contains(&next) {
            break;
        }
        let Some(candidate) = calendar::find_sankranti_after_jd(next, check, 35) else {
            break;
        };
        if candidate >= end_jd {
            break;
        }
        sankrantis.push(next);
        seen.insert(next);
        check = candidate + 1.0 / 24.0;
    }
    sankrantis
}

fn kshaya_info(start: UtcInstant, end: UtcInstant) -> Option<Value> {
    let sankrantis = sankrantis_in_period(start, end);
    if sankrantis.len() < 2 {
        return None;
    }
    let kept = BS_MONTH_NAMES[((sankrantis[0] + 11) % 12) as usize];
    let dropped = BS_MONTH_NAMES[sankrantis[0] as usize];
    Some(json!({
        "is_kshaya": true,
        "month_name": kept,
        "dropped_month_name": dropped,
        "full_name_en": format!("{kept}–{dropped} Kshaya"),
        "full_name_ne": format!("{}–{} क्षय", masa_ne(kept), masa_ne(dropped)),
        "first_sankranti_rashi": sankrantis[0],
        "second_sankranti_rashi": sankrantis[1],
        "first_rashi_name": RASHI_NAMES[sankrantis[0] as usize],
        "second_rashi_name": RASHI_NAMES[sankrantis[1] as usize],
        "description": format!(
            "Kshaya Maas: Sun enters {} and {} within this single lunar month",
            RASHI_NAMES[sankrantis[0] as usize], RASHI_NAMES[sankrantis[1] as usize]
        ),
    }))
}

/// Adhik and kshaya-month metadata for one Gregorian year (`get_special_months_for_gregorian_year`).
#[must_use]
pub fn special_months_for_gregorian_year(gregorian_year: i32) -> Value {
    let year = lunar_year(gregorian_year);
    let adhik_months = year
        .months
        .iter()
        .filter(|m| m.is_adhik)
        .map(|m| {
            json!({
                "has_adhik_maas": true,
                "month_name": m.name,
                "full_name_en": m.full_name(),
                "full_name_ne": format!("अधिक {}", masa_ne(m.name)),
                "start_date": m.first_day.to_string(),
                "end_date": m.last_day.to_string(),
                "purnima_date": m.purnima_day.to_string(),
            })
        })
        .collect::<Vec<_>>();
    let adhik_maas = adhik_months
        .first()
        .cloned()
        .map_or_else(
            || json!({"has_adhik_maas": false}),
            |mut m| {
                if let Some(map) = m.as_object_mut() {
                    map.insert(
                        "note".into(),
                        json!("Mala Maas / Adhik Maas / Purushottam Maas — no Sankranti (solar ingress) occurs within this lunar month"),
                    );
                }
                m
            },
        );
    let mut kshaya = json!({"is_kshaya": false});
    for month in &year.months {
        if let Some(mut info) = kshaya_info(month.start_aausi, month.end_aausi) {
            if let Some(map) = info.as_object_mut() {
                map.insert("start_date".into(), json!(month.first_day.to_string()));
                map.insert("end_date".into(), json!(month.last_day.to_string()));
                map.insert(
                    "adhik_months".into(),
                    Value::Array(
                        adhik_months
                            .iter()
                            .map(|a| {
                                json!({
                                    "month_name": a["month_name"].clone(),
                                    "full_name_en": a["full_name_en"].clone(),
                                    "full_name_ne": a["full_name_ne"].clone(),
                                    "start_date": a["start_date"].clone(),
                                    "end_date": a["end_date"].clone(),
                                })
                            })
                            .collect(),
                    ),
                );
            }
            kshaya = info;
            break;
        }
    }
    json!({
        "gregorian_year": gregorian_year,
        "bs_year": gregorian_year + 57,
        "adhik_maas": adhik_maas,
        "adhik_months": adhik_months,
        "kshaya_maas": kshaya,
    })
}
