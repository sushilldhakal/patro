//! Lunar months: amanta (Aausi → Aausi), pūrṇimānta (Purnima → Purnima) and festival masa.
//!
//! A port of `engine/panchanga/lunar_month.py` and `adhik_maas.py` as far as the daily
//! panchanga and the Nepal Sambat new year use them. A lunar month is named after the
//! Sun's rashi at its opening Aausi; it is adhik when the Sun is in the same rashi at
//! both of its Aausis (no sankranti inside).

use std::sync::{Arc, LazyLock};

use astronomy::engine::{Observer, rise_set_on_day, sun_longitude};
use astronomy::surya_siddhanta::{Body, Crossing};
use astronomy::{angles::Anga, events::next_entry, position::SuryaSiddhanta};
use serde_json::{Value, json};
use timescale::{
    Calendar, CivilDay, GREGORIAN_CUTOVER_JD, JdInstant, Moment, PyInstant, UtcInstant, julday,
};

use crate::{
    angas::{Paksha, tithi},
    boundaries::{tithi_end, tithi_start},
    memo::Memo,
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

/// A lunar-month boundary. The lunar calendar is the Surya Siddhanta's: it runs on the
/// instants the astronomy gives, and the Gregorian (Julian before 1582-10-15) date is
/// only a label read off them. From 1582-10-15 an instant is a `datetime`; before that,
/// and for BCE years, it is a Julian Day.
#[derive(Debug, Clone, Copy)]
pub(crate) enum Stamp {
    Utc(UtcInstant),
    Jd(JdInstant),
}

impl std::fmt::Display for Stamp {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Utc(t) => t.fmt(f),
            Self::Jd(t) => t.fmt(f),
        }
    }
}

impl PartialEq for Stamp {
    fn eq(&self, other: &Self) -> bool {
        self.partial_cmp(other) == Some(std::cmp::Ordering::Equal)
    }
}

impl PartialOrd for Stamp {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        match (self, other) {
            (Self::Utc(a), Self::Utc(b)) => a.partial_cmp(b),
            (Self::Jd(a), Self::Jd(b)) => a.partial_cmp(b),
            _ => self.jd().partial_cmp(&other.jd()),
        }
    }
}

impl Stamp {
    /// The Julian Day.
    pub(crate) fn jd(self) -> f64 {
        match self {
            Self::Utc(t) => t.to_jd(),
            Self::Jd(t) => t.0,
        }
    }

    fn add_micros(self, micros: i64) -> Self {
        match self {
            Self::Utc(t) => Self::Utc(t.add_micros(micros)),
            Self::Jd(t) => Self::Jd(t.add_micros(micros)),
        }
    }

    fn add_hours(self, hours: i64) -> Self {
        self.add_micros(hours * 3_600_000_000)
    }

    /// The `datetime` instant, when this is one or falls on a `datetime` day.
    pub(crate) fn utc(self) -> Option<UtcInstant> {
        match self {
            Self::Utc(t) => Some(t),
            Self::Jd(t) if t.0 >= GREGORIAN_CUTOVER_JD => UtcInstant::from_jd(t.0),
            Self::Jd(_) => None,
        }
    }

    /// The UTC civil date of the instant, in the calendar its day is read in.
    pub(crate) fn utc_day(self) -> CivilDay {
        match self {
            Self::Utc(t) => t.fields().0,
            Self::Jd(t) => CivilDay::from_jd_ut(t.0),
        }
    }

    /// The civil day on the zone's clock.
    fn local_day(self, zone: &timescale::Zone) -> CivilDay {
        match self {
            Self::Utc(t) => zone.local(t).day(),
            Self::Jd(t) => t.wall(zone).day,
        }
    }

    /// The end of the tithi in force.
    fn tithi_end(self) -> Self {
        match self {
            Self::Utc(t) => Self::Utc(tithi_end(t)),
            Self::Jd(t) => Self::Jd(tithi_end(t)),
        }
    }
}

fn sun_rashi_at(at: Stamp) -> usize {
    usize::try_from(py_int(sun_longitude(at.jd()) / 30.0) % 12)
        .expect("rashi index is non-negative")
}

/// `find_next_tithi`: when this tithi begins: the start of the one in force at
/// `after`, or the next one to begin within `within_days`. Read from the event
/// engine's boundary tables (Python scanned in 12-hour steps for the same answer: a
/// tithi always lasts longer than 12 hours, so the scan never skipped one).
pub(crate) fn find_next_tithi(
    display: u32,
    paksha: Paksha,
    after: Stamp,
    within_days: i64,
) -> Option<Stamp> {
    match after {
        Stamp::Utc(t) => find_next_tithi_at(display, paksha, t, within_days).map(Stamp::Utc),
        Stamp::Jd(t) => find_next_tithi_at(display, paksha, t, within_days).map(Stamp::Jd),
    }
}

fn find_next_tithi_at<I: PyInstant>(
    display: u32,
    paksha: Paksha,
    after: I,
    within_days: i64,
) -> Option<I> {
    let target = if paksha == Paksha::Krishna {
        display + 15
    } else {
        display
    };
    if tithi(after.to_jd()).number == target {
        return Some(tithi_start(after));
    }
    // Tithi `n` begins where the elongation reaches the multiple `n − 1` of 12°.
    let entry = next_entry(
        &SuryaSiddhanta,
        Anga::Tithi,
        (target - 1) % 30,
        after.to_jd(),
    );
    let end = after.add_micros(within_days * MICROS_PER_DAY);
    if !entry.jd.is_finite() || entry.jd >= end.to_jd() {
        return None;
    }
    after.at_boundary(entry.jd)
}

fn find_purnima(after: Stamp) -> Option<Stamp> {
    find_next_tithi(15, Paksha::Shukla, after, 35).map(Stamp::tithi_end)
}

fn find_aausi(after: Stamp) -> Option<Stamp> {
    find_next_tithi(15, Paksha::Krishna, after, 35).map(Stamp::tithi_end)
}

/// First civil day at the observer whose sunrise is at or after `instant`: a patro day
/// belongs to whatever prevails at its own sunrise (the udaya rule), so a lunar month's
/// days come from the observer's sunrise, not Kathmandu's.
fn udaya_day_on_or_after(instant: Stamp, observer: &Observer) -> CivilDay {
    let day = instant.local_day(&observer.zone);
    match (
        rise_set_on_day(Body::Sun, day, observer, Crossing::Rise),
        instant,
    ) {
        (Some(Moment::Utc(sunrise)), Stamp::Utc(at)) if sunrise < at => day.add_days(1),
        (Some(Moment::Utc(_)), Stamp::Utc(_)) | (None, _) => day,
        (Some(sunrise), at) if sunrise.to_jd() < at.jd() => day.add_days(1),
        _ => day,
    }
}

/// One amanta lunar month, as global instants: its name and adhik status are the same
/// for every observer.
#[derive(Debug, Clone)]
pub(crate) struct LunarMonth {
    pub(crate) start_aausi: Stamp,
    pub(crate) end_purnima: Stamp,
    pub(crate) end_aausi: Stamp,
    pub(crate) name: &'static str,
    pub(crate) is_adhik: bool,
}

impl LunarMonth {
    fn full_name(&self) -> String {
        if self.is_adhik {
            format!("Adhik {}", self.name)
        } else {
            self.name.to_owned()
        }
    }

    /// The month's civil days at an observer.
    fn days(&self, observer: &Observer) -> MonthDays {
        MonthDays {
            first: udaya_day_on_or_after(self.start_aausi, observer),
            last: udaya_day_on_or_after(self.end_aausi, observer).add_days(-1),
            purnima: udaya_day_on_or_after(self.end_purnima, observer).add_days(-1),
        }
    }
}

/// A lunar month's civil days at one observer.
#[derive(Debug, Clone, Copy)]
pub(crate) struct MonthDays {
    /// First day: the first sunrise after its opening Aausi.
    pub(crate) first: CivilDay,
    /// Last day: the closing Aausi still prevails at its sunrise.
    pub(crate) last: CivilDay,
    /// The day whose sunrise Purnima prevails at.
    pub(crate) purnima: CivilDay,
}

fn compute_lunar_month(start: Stamp) -> Option<LunarMonth> {
    let purnima = find_purnima(start.add_micros(2 * MICROS_PER_DAY))?;
    let next = find_aausi(purnima.add_micros(2 * MICROS_PER_DAY))?;
    let rashi = sun_rashi_at(start);
    Some(LunarMonth {
        start_aausi: start,
        end_purnima: purnima,
        end_aausi: next,
        name: BS_MONTH_NAMES[rashi],
        is_adhik: rashi == sun_rashi_at(next),
    })
}

/// The lunar months from the first Aausi after 15 February of a Gregorian year.
#[derive(Debug)]
pub(crate) struct LunarYear {
    pub(crate) months: Vec<LunarMonth>,
    pub(crate) adhik_name: Option<&'static str>,
}

/// Where a lunar year starts looking: 15 February of the year as the calendar of its
/// day labels it (Julian before 1582-10-15), read off the Surya Siddhanta's time axis.
/// From the cutover the instants are `datetime`s; before it, and for BCE years (which
/// `datetime` cannot hold), Julian Days.
fn lunar_year_anchor(year: i32) -> Stamp {
    let calendar = if (year, 2, 15) >= (1582, 10, 15) {
        Calendar::Gregorian
    } else {
        Calendar::Julian
    };
    let jd = julday(year, 2, 15, 0.0, calendar);
    if jd >= GREGORIAN_CUTOVER_JD {
        if let Some(t) = UtcInstant::from_utc(CivilDay::new(year, 2, 15), 0, 0, 0, 0) {
            return Stamp::Utc(t);
        }
    }
    Stamp::Jd(JdInstant(jd))
}

fn build_lunar_year(year: i32) -> LunarYear {
    let mut months = Vec::new();
    if let Some(mut current) = find_aausi(lunar_year_anchor(year)) {
        for _ in 0..14 {
            let Some(month) = compute_lunar_month(current) else {
                break;
            };
            current = month.end_aausi;
            months.push(month);
            if current.utc_day().year > year + 1 {
                break;
            }
        }
    }
    let adhik_name = months.iter().find(|m| m.is_adhik).map(|m| m.name);
    LunarYear { months, adhik_name }
}

/// Lunar years kept in memory: every request reads its own year and the two beside it.
const LUNAR_YEAR_CAPACITY: usize = 256;

static LUNAR_YEARS: LazyLock<Memo<i32, LunarYear>> =
    LazyLock::new(|| Memo::new(LUNAR_YEAR_CAPACITY));

/// The lunar year of a Gregorian year, memoized (`get_lunar_year`).
pub(crate) fn lunar_year(year: i32) -> Arc<LunarYear> {
    LUNAR_YEARS.get_or_insert_with(&year, || Arc::new(build_lunar_year(year)))
}

/// Per-location month days kept in memory (a year's 14 months at one observer).
const MONTH_DAYS_CAPACITY: usize = 2048;

type DaysKey = (i32, String);

static MONTH_DAYS: LazyLock<Memo<DaysKey, [MonthDays]>> =
    LazyLock::new(|| Memo::new(MONTH_DAYS_CAPACITY));

fn observer_key(observer: &Observer) -> String {
    format!(
        "{:.4}_{:.4}_{}",
        observer.latitude,
        observer.longitude,
        observer.zone.name()
    )
}

/// A lunar month with its civil days at one observer.
type ObservedMonth = (LunarMonth, MonthDays);

/// A lunar year and its months' civil days at an observer.
pub(crate) struct ObservedYear {
    pub(crate) year: Arc<LunarYear>,
    pub(crate) days: Arc<[MonthDays]>,
}

impl ObservedYear {
    fn months(&self) -> impl Iterator<Item = (&LunarMonth, &MonthDays)> {
        self.year.months.iter().zip(self.days.iter())
    }
}

/// [`lunar_year`] with its month days at `observer`, memoized per (year, observer).
pub(crate) fn observed_year(year: i32, observer: &Observer) -> ObservedYear {
    let lunar = lunar_year(year);
    let days = MONTH_DAYS.get_or_insert_with(&(year, observer_key(observer)), || {
        lunar
            .months
            .iter()
            .map(|m| m.days(observer))
            .collect::<Vec<_>>()
            .into()
    });
    ObservedYear { year: lunar, days }
}

/// A pūrṇimānta window: the day after the previous Purnima through this Purnima.
#[derive(Debug, Clone)]
struct PurnimantWindow {
    start: CivilDay,
    end_purnima: CivilDay,
    start_dt: Stamp,
    end_dt: Stamp,
    name: &'static str,
    is_adhik: bool,
}

fn purnimant_windows(year: &ObservedYear) -> Vec<PurnimantWindow> {
    let mut prev: Option<(Stamp, CivilDay)> = None;
    year.months()
        .map(|(m, d)| {
            let window = PurnimantWindow {
                // `udaya_day_on_or_after(previous Purnima)`: the day after its Purnima day.
                start: prev.map_or(d.first, |(_, purnima)| purnima.add_days(1)),
                end_purnima: d.purnima,
                start_dt: prev.map_or(m.start_aausi, |(p, _)| p.add_micros(MICROS_PER_DAY)),
                end_dt: m.end_purnima,
                name: m.name,
                is_adhik: m.is_adhik,
            };
            prev = Some((m.end_purnima, d.purnima));
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

fn years_around(day: CivilDay, observer: &Observer) -> [ObservedYear; 3] {
    [
        observed_year(day.year - 1, observer),
        observed_year(day.year, observer),
        observed_year(day.year + 1, observer),
    ]
}

fn amanta_for(day: CivilDay, observer: &Observer) -> Value {
    for year in years_around(day, observer) {
        if let Some((m, d)) = year.months().find(|(_, d)| d.first <= day && day <= d.last) {
            return MonthPayload {
                name: Some(m.name),
                full_name: Some(m.full_name()),
                is_adhik: m.is_adhik,
                month_type: if m.is_adhik { "adhik" } else { "nija" },
                paksha_model: "amanta",
                window: Some((d.first, d.last)),
                solar_name: Some(m.name),
                festival_masa: Some(m.name),
            }
            .to_json();
        }
    }
    MonthPayload::unknown("amanta").to_json()
}

fn festival_masa_for(day: CivilDay, observer: &Observer) -> Value {
    for year in years_around(day, observer) {
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
fn purnimanta_paksha(day: CivilDay, paksha: Paksha, observer: &Observer) -> Value {
    let mut context: Option<(ObservedMonth, Option<ObservedMonth>)> = None;
    for year in years_around(day, observer) {
        let mut prev: Option<(&LunarMonth, &MonthDays)> = None;
        for (m, d) in year.months() {
            if d.first <= day && day <= d.last {
                context = Some(((m.clone(), *d), prev.map(|(pm, pd)| (pm.clone(), *pd))));
                break;
            }
            prev = Some((m, d));
        }
        if context.is_some() {
            break;
        }
    }
    let Some(((mut month, mut days), prev)) = context else {
        return MonthPayload::unknown("purnimant").to_json();
    };
    // The junction Aausi closes the previous month, so its Krishna paksha stays contiguous.
    if paksha == Paksha::Krishna && day == days.first {
        if let Some((prev_month, prev_days)) = prev {
            month = prev_month;
            days = prev_days;
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
        window: Some((days.first, days.last)),
        solar_name: Some(month.name),
        festival_masa: Some(name),
    }
    .to_json()
}

/// `merge_lunar_month_for_day`: the amanta month plus the pūrṇimānta fields.
#[must_use]
pub(crate) fn merge_for_day(day: CivilDay, paksha: Paksha, observer: &Observer) -> Value {
    let mut amanta = amanta_for(day, observer);
    let purnim = purnimanta_paksha(day, paksha, observer);
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
pub fn calendar_layers(day: CivilDay, paksha: Paksha, observer: &Observer) -> Value {
    let adhik = lunar_year(day.year).adhik_name;
    json!({
        "adhik_maas": {
            "year_has_adhik": adhik.is_some(),
            "name": adhik,
            "name_ne": adhik.map(|n| format!("अधिक {}", masa_ne(n))),
        },
        "amanta": amanta_for(day, observer),
        "purnimant": purnimanta_paksha(day, paksha, observer),
        "festival_masa": festival_masa_for(day, observer),
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
fn boundary_instant(month: &LunarMonth, display: u32, paksha: Paksha) -> Option<Stamp> {
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
    let boundary = boundary_instant(month, display, paksha)?.local_day(&observer.zone);
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
    Some(boundary_instant(month, display, paksha)?.local_day(&observer.zone))
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
            if let Some(start) = boundary_instant(month, display, paksha).and_then(Stamp::utc) {
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

/// The kshaya months that skip the masa `name` and touch `gregorian_year`: two
/// sankrantis in one lunar month skip a masa name, and that masa's lunar festivals
/// are not observed in that cycle (owner's rule; Python fell back to a neighbouring
/// year's date). Each window is the kshaya month's civil span (UTC dates).
///
/// Every festival of a masa asks the same question for its year, so the answer is
/// kept (keyed by the masa's place in [`BS_MONTH_NAMES`]).
fn kshaya_drops(name: &str, gregorian_year: i32) -> Arc<[KshayaWindow]> {
    static DROPS: LazyLock<Memo<(usize, i32), [KshayaWindow]>> =
        LazyLock::new(|| Memo::new(KSHAYA_DROPS_CAPACITY));
    let Some(masa) = BS_MONTH_NAMES.iter().position(|n| *n == name) else {
        return Arc::from(Vec::new());
    };
    DROPS.get_or_insert_with(&(masa, gregorian_year), || {
        Arc::from(kshaya_drops_uncached(BS_MONTH_NAMES[masa], gregorian_year))
    })
}

/// A kshaya month's civil span (first and last UTC dates).
type KshayaWindow = (CivilDay, CivilDay);

/// Masa-years of kshaya drops kept in memory (twelve masas over a few hundred years).
const KSHAYA_DROPS_CAPACITY: usize = 4096;

fn kshaya_drops_uncached(name: &str, gregorian_year: i32) -> Vec<KshayaWindow> {
    [gregorian_year - 1, gregorian_year]
        .into_iter()
        .filter(|y| kshaya_possible(*y))
        .flat_map(|y| {
            lunar_year(y)
                .months
                .iter()
                .filter(|m| {
                    let in_year = m.start_aausi.utc_day().year == gregorian_year
                        || m.end_aausi.utc_day().year == gregorian_year;
                    in_year && {
                        let sankrantis = sankrantis_in_period(m.start_aausi, m.end_aausi);
                        sankrantis.len() >= 2 && BS_MONTH_NAMES[sankrantis[0] as usize] == name
                    }
                })
                .map(|m| (m.start_aausi.utc_day(), m.end_aausi.utc_day()))
                .collect::<Vec<_>>()
        })
        .collect()
}

/// Whether a found occurrence is the one a kshaya month swallowed: a fallback to a
/// neighbouring year's date, or a date inside the kshaya month itself. A real
/// occurrence of the masa earlier in the same Gregorian year stays (Poush in
/// January 2028 survives the December 2028 kshaya).
fn swallowed_by_kshaya(
    day: CivilDay,
    gregorian_year: i32,
    windows: &[(CivilDay, CivilDay)],
) -> bool {
    day.year != gregorian_year
        || windows
            .iter()
            .any(|(start, end)| *start <= day && day <= *end)
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
    let kshaya = kshaya_drops(name, gregorian_year);
    let mut candidates: Vec<(CivilDay, bool)> = Vec::new();
    for search_year in [gregorian_year - 1, gregorian_year] {
        let year = observed_year(search_year, observer);
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
        .filter(|day| kshaya.is_empty() || !swallowed_by_kshaya(*day, gregorian_year, &kshaya))
}

/// First day of the year's Adhik Maas when it is `name` (`compute_adhik_arambha`), or of
/// any Adhik Maas when `name` is `None`.
#[must_use]
pub fn adhik_month_first_day(
    gregorian_year: i32,
    name: Option<&str>,
    observer: &Observer,
) -> Option<CivilDay> {
    let year = observed_year(gregorian_year, observer);
    let (adhik, days) = year.months().find(|(m, _)| m.is_adhik)?;
    if name.is_some_and(|n| n != adhik.name) {
        return None;
    }
    Some(days.first)
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

fn sankrantis_in_period(start: Stamp, end: Stamp) -> Vec<u32> {
    let mut sankrantis = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let mut check = start.jd();
    let end_jd = end.jd();
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

fn kshaya_info(start: Stamp, end: Stamp) -> Option<Value> {
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

/// Whether a kshaya month can fall in `gregorian_year`'s lunar year: every kshaya month
/// is flanked by two adhik months in the same or an adjacent lunar year (BS 2039:
/// Adhik Ashwin before, Adhik Phalgun after), so with fewer than two adhik months in
/// the three lunar years around it there is nothing to search for.
fn kshaya_possible(gregorian_year: i32) -> bool {
    (gregorian_year - 1..=gregorian_year + 1)
        .map(|y| lunar_year(y).months.iter().filter(|m| m.is_adhik).count())
        .sum::<usize>()
        >= 2
}

/// Adhik and kshaya-month metadata for one Gregorian year
/// (`get_special_months_for_gregorian_year`), with each month's dates at `observer`.
#[must_use]
pub fn special_months_for_gregorian_year(gregorian_year: i32, observer: &Observer) -> Value {
    let year = observed_year(gregorian_year, observer);
    let adhik_months = year
        .months()
        .filter(|(m, _)| m.is_adhik)
        .map(|(m, d)| {
            json!({
                "has_adhik_maas": true,
                "month_name": m.name,
                "full_name_en": m.full_name(),
                "full_name_ne": format!("अधिक {}", masa_ne(m.name)),
                "start_date": d.first.to_string(),
                "end_date": d.last.to_string(),
                "purnima_date": d.purnima.to_string(),
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
    let candidates: Vec<(&LunarMonth, &MonthDays)> = if kshaya_possible(gregorian_year) {
        year.months().collect()
    } else {
        Vec::new()
    };
    for (month, days) in candidates {
        if let Some(mut info) = kshaya_info(month.start_aausi, month.end_aausi) {
            if let Some(map) = info.as_object_mut() {
                map.insert("start_date".into(), json!(days.first.to_string()));
                map.insert("end_date".into(), json!(days.last.to_string()));
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

/// Every kshaya month among the lunar months special months scans for a Gregorian year
/// (from the first Aausi after 15 February), found by testing every month with no
/// shortcut: the reference the shortcut is checked against.
#[doc(hidden)]
#[must_use]
pub fn kshaya_months_exhaustive(gregorian_year: i32) -> Vec<String> {
    lunar_year(gregorian_year)
        .months
        .iter()
        .filter(|m| kshaya_info(m.start_aausi, m.end_aausi).is_some())
        .map(|m| m.start_aausi.to_string())
        .collect()
}

/// Whether the two-adhik shortcut would search `gregorian_year` for a kshaya month.
#[doc(hidden)]
#[must_use]
pub fn kshaya_searched(gregorian_year: i32) -> bool {
    kshaya_possible(gregorian_year)
}
