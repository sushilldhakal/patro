//! The day a festival rule falls on in a Gregorian year (`festival_rules.py`).

use astronomy::engine::{Observer, rise_set_on_day};
use astronomy::surya_siddhanta::{Body, Crossing};
use calendar::{BsDate, bs_to_civil, find_sankranti_after_jd};
use panchanga::{
    Paksha,
    lunar_month::{DateSelection, adhik_month_first_day, find_festival_in_lunar_month},
    tropical_sun_longitude,
};
use serde_json::{Map, Value};
use timescale::{CivilDay, Moment, UtcInstant, Zone};

use crate::rules::rules;

fn int(rule: &Map<String, Value>, key: &str) -> Option<i64> {
    rule.get(key).and_then(|v| {
        v.as_i64()
            .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
    })
}

fn text<'a>(rule: &'a Map<String, Value>, key: &str) -> Option<&'a str> {
    rule.get(key).and_then(Value::as_str)
}

fn u(v: i64) -> u32 {
    u32::try_from(v).unwrap_or(0)
}

fn lunar(rule: &Map<String, Value>, gregorian_year: i32, observer: &Observer) -> Option<CivilDay> {
    let paksha = if text(rule, "paksha") == Some("krishna") {
        Paksha::Krishna
    } else {
        Paksha::Shukla
    };
    find_festival_in_lunar_month(
        text(rule, "lunar_month")?,
        u(int(rule, "tithi")?),
        paksha,
        gregorian_year,
        DateSelection::from_rule(text(rule, "date_selection")),
        observer,
    )
}

/// A BS (month, day) in whichever of BS `year + 56` / `year + 57` lands in the Gregorian year.
fn bs_day_in_year(bs_month: u32, bs_day: u32, gregorian_year: i32) -> Option<CivilDay> {
    [gregorian_year + 56, gregorian_year + 57]
        .into_iter()
        .filter_map(|year| {
            bs_to_civil(BsDate {
                year,
                month: bs_month,
                day: bs_day,
            })
            .ok()
        })
        .find(|d| d.year == gregorian_year)
}

fn solar(rule: &Map<String, Value>, gregorian_year: i32) -> Option<CivilDay> {
    let bs_month = u(int(rule, "bs_month")?);
    if bs_month == 0 {
        return None;
    }
    let solar_day = int(rule, "solar_day").unwrap_or(1);
    if let Some(day) = bs_day_in_year(bs_month, u(solar_day), gregorian_year) {
        return Some(day);
    }
    // Outside the month grid: the astronomical sankranti's Kathmandu day.
    let jan1 = CivilDay::new(gregorian_year, 1, 1).to_jd_ut();
    let sankranti = find_sankranti_after_jd(bs_month - 1, jan1, 40)?;
    let day = Zone::kathmandu().local_day(Moment::from_jd(sankranti));
    Some(day.add_days(i32::try_from(solar_day - 1).ok()?))
}

fn bs_fixed(rule: &Map<String, Value>, gregorian_year: i32) -> Option<CivilDay> {
    let bs_month = u(int(rule, "bs_month")?);
    if bs_month == 0 {
        return None;
    }
    bs_day_in_year(
        bs_month,
        u(int(rule, "bs_day").unwrap_or(1)),
        gregorian_year,
    )
}

fn ad_fixed(rule: &Map<String, Value>, gregorian_year: i32) -> Option<CivilDay> {
    let day = CivilDay::new(
        gregorian_year,
        u(int(rule, "ad_month")?),
        u(int(rule, "ad_day")?),
    );
    UtcInstant::from_utc(day, 0, 0, 0, 0).map(|_| day)
}

/// `signed_diff`: an angle folded into [−180, 180).
fn signed_diff(deg: f64) -> f64 {
    ((deg.rem_euclid(360.0)) + 540.0).rem_euclid(360.0) - 180.0
}

/// `ayana_start_date`: the first local day whose sunrise follows the solstice.
fn ayana(rule: &Map<String, Value>, gregorian_year: i32, observer: &Observer) -> Option<CivilDay> {
    let (target, guess_day) = match text(rule, "ayana")? {
        "uttara" => (270.0, CivilDay::new(gregorian_year, 12, 21)),
        "dakshina" => (90.0, CivilDay::new(gregorian_year, 6, 21)),
        _ => return None,
    };
    let mut jd = UtcInstant::from_utc(guess_day, 12, 0, 0, 0)?.to_jd();
    let sun_deg_per_day = 360.0 / 365.2422;
    for _ in 0..16 {
        jd -= signed_diff(tropical_sun_longitude(jd) - target) / sun_deg_per_day;
    }
    let day = observer.zone.local_day(Moment::from_jd(jd));
    match rise_set_on_day(Body::Sun, day, observer, Crossing::Rise)? {
        Moment::Utc(sunrise) if sunrise.to_jd() >= jd => Some(day),
        _ => Some(day.add_days(1)),
    }
}

/// `first_observed_date`: the earliest day a festival can fall on, if known.
fn first_observed(rule: &Map<String, Value>) -> Option<CivilDay> {
    let bs = int(rule, "from_bs_year").filter(|y| *y != 0).and_then(|y| {
        bs_to_civil(BsDate {
            year: i32::try_from(y).ok()?,
            month: 1,
            day: 1,
        })
        .ok()
    });
    let ad = int(rule, "from_ad_year")
        .filter(|y| *y != 0)
        .and_then(|y| Some(CivilDay::new(i32::try_from(y).ok()?, 1, 1)));
    bs.into_iter().chain(ad).max()
}

/// (start, end) of a festival in a Gregorian year (`compute_festival_dates`).
#[must_use]
pub fn compute_festival_dates(
    rule: &Map<String, Value>,
    gregorian_year: i32,
    observer: &Observer,
) -> Option<(CivilDay, CivilDay)> {
    let duration = int(rule, "duration_days").unwrap_or(1).max(1);
    let kind = text(rule, "type").unwrap_or("lunar");
    let start = match kind {
        "lunar" => lunar(rule, gregorian_year, observer),
        "solar" => solar(rule, gregorian_year),
        "bs_fixed" => bs_fixed(rule, gregorian_year),
        "ad_fixed" => ad_fixed(rule, gregorian_year),
        "adhik_arambha" => {
            adhik_month_first_day(gregorian_year, text(rule, "lunar_month"), observer)
        }
        "ayana" => ayana(rule, gregorian_year, observer),
        _ => None,
    }?;
    if first_observed(rule).is_some_and(|first| start < first) {
        return None;
    }
    let mut end = None;
    if int(rule, "end_tithi").is_some_and(|t| t != 0) && kind == "lunar" {
        let mut end_rule: Map<String, Value> = rule
            .iter()
            .filter(|(k, _)| {
                !matches!(
                    k.as_str(),
                    "end_tithi" | "end_at" | "end_extra_days" | "end_date_selection"
                )
            })
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect();
        end_rule.insert("tithi".into(), rule["end_tithi"].clone());
        end_rule.insert(
            "date_selection".into(),
            rule.get("end_date_selection")
                .cloned()
                .unwrap_or_else(|| "udaya".into()),
        );
        end = lunar(&end_rule, gregorian_year, observer);
    } else if let Some(target) = text(rule, "end_at").filter(|t| !t.is_empty()) {
        end = rules()
            .get(target)
            .and_then(Value::as_object)
            .and_then(|r| compute_festival_dates(r, gregorian_year, observer))
            .map(|(s, _)| s);
    }
    let end = match end {
        Some(e) if e >= start => e,
        _ => start.add_days(i32::try_from(duration - 1).ok()?),
    };
    let extra = int(rule, "end_extra_days").unwrap_or(0);
    Some((start, end.add_days(i32::try_from(extra).ok()?)))
}
