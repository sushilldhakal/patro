//! The yuga frame: day counts, and mean longitudes kept exact with integers.

use super::body::{Body, MeanBody, StarPlanet};

/// Years in a mahayuga.
pub const MAHAYUGA_YEARS: i64 = 4_320_000;
/// Civil (savana) days in a mahayuga.
pub const MAHAYUGA_DAYS: i64 = 1_577_917_828;
/// Civil days in a kalpa (1000 mahayugas).
pub const KALPA_DAYS: i64 = 1000 * MAHAYUGA_DAYS;
/// Days of planetary motion from creation to the start of Kali Yuga (452.75 mahayugas).
pub const DAYS_CREATION_TO_KALI: i64 = MAHAYUGA_DAYS * 45_275 / 100;
/// JD (UT) of 0h on 18 Feb 3102 BCE (Julian).
const KALI_JD_0H_UT: f64 = 588_465.5;
/// Ujjain's longitude, 75°46′ E.
const UJJAIN_LONGITUDE: f64 = 75.0 + 46.0 / 60.0;
/// JD (UT) of the Kali epoch: midnight on the Ujjain meridian.
pub const KALI_EPOCH_JD: f64 = KALI_JD_0H_UT - UJJAIN_LONGITUDE / 360.0;
/// One sidereal-solar year of the text, in days.
#[expect(
    clippy::cast_precision_loss,
    reason = "both day counts are far below 2^53, so exact"
)]
pub const YEAR_DAYS: f64 = MAHAYUGA_DAYS as f64 / MAHAYUGA_YEARS as f64;
/// सत्य + त्रेता + द्वापर of this mahayuga, in years, before Kali.
const YEARS_SATYA_TO_KALI: i64 = 1_728_000 + 1_296_000 + 864_000;
/// JD of the start of this mahayuga's सत्य युग, the earliest day the app offers.
#[expect(clippy::cast_precision_loss, reason = "3,888,000 is exact as f64")]
pub const SATYA_YUGA_START_JD: f64 = KALI_EPOCH_JD - YEARS_SATYA_TO_KALI as f64 * YEAR_DAYS;

/// Civil days since the Kali epoch (negative before it).
#[must_use]
pub fn ahargana(jd_ut: f64) -> f64 {
    jd_ut - KALI_EPOCH_JD
}

/// `floor(days)` as an integer, with the fraction left over.
#[expect(
    clippy::cast_possible_truncation,
    reason = "days of motion are about 7e11, far inside i128; floor() makes the cast exact"
)]
fn split_days(days: f64) -> (i128, f64) {
    let whole = days.floor();
    (whole as i128, days - whole)
}

/// An integer below 2^53 as f64, exactly as Python's `int + float` converts it.
#[expect(
    clippy::cast_precision_loss,
    reason = "callers pass remainders below a kalpa's days (~1.6e12)"
)]
fn exact_f64(n: i128) -> f64 {
    n as f64
}

/// Fractional revolution after the days of motion up to `jd_ut`, exactly.
///
/// The whole days go through integer arithmetic (the count is ~7×10¹¹ and the
/// Moon's product overflows `i64`); only the fraction of the current day is a float.
pub(crate) fn revolution_fraction(revs: i64, period_days: i64, jd_ut: f64) -> f64 {
    let days = exact_f64(i128::from(DAYS_CREATION_TO_KALI)) + ahargana(jd_ut);
    let (whole, part) = split_days(days);
    let numerator = (i128::from(revs) * whole).rem_euclid(i128::from(period_days));
    let revs_f = exact_f64(i128::from(revs));
    super::modulo::py_mod(
        (exact_f64(numerator) + revs_f * part) / exact_f64(i128::from(period_days)),
        1.0,
    )
}

/// Mean longitude (degrees) of a mean body.
#[must_use]
pub fn mean_longitude(body: MeanBody, jd_ut: f64) -> f64 {
    360.0 * revolution_fraction(body.revolutions_per_mahayuga(), MAHAYUGA_DAYS, jd_ut)
}

/// Revolutions per kalpa of a star-planet's or the Sun's apsis (मन्दोच्च).
const fn apsis_revs_per_kalpa(planet: Option<StarPlanet>) -> i64 {
    match planet {
        None => 387, // the Sun
        Some(StarPlanet::Mars) => 204,
        Some(StarPlanet::Mercury) => 368,
        Some(StarPlanet::Jupiter) => 900,
        Some(StarPlanet::Venus) => 535,
        Some(StarPlanet::Saturn) => 39,
    }
}

/// Revolutions per kalpa of a star-planet's node (पात), retrograde.
const fn node_revs_per_kalpa(planet: StarPlanet) -> i64 {
    match planet {
        StarPlanet::Mars => -214,
        StarPlanet::Mercury => -488,
        StarPlanet::Jupiter => -174,
        StarPlanet::Venus => -903,
        StarPlanet::Saturn => -662,
    }
}

/// Longitude (degrees) of the apsis of a star-planet (`None` is the Sun's).
pub(crate) fn planet_apsis(planet: Option<StarPlanet>, jd_ut: f64) -> f64 {
    360.0 * revolution_fraction(apsis_revs_per_kalpa(planet), KALPA_DAYS, jd_ut)
}

/// Longitude (degrees) of a star-planet's node.
pub(crate) fn planet_node(planet: StarPlanet, jd_ut: f64) -> f64 {
    360.0 * revolution_fraction(node_revs_per_kalpa(planet), KALPA_DAYS, jd_ut)
}

/// Longitude (degrees) of a body's apsis (मन्दोच्च); `None` for Rahu, which has none.
#[must_use]
pub fn apsis_longitude(body: Body, jd_ut: f64) -> Option<f64> {
    match body {
        Body::Moon => Some(mean_longitude(MeanBody::MoonApogee, jd_ut)),
        Body::Sun => Some(planet_apsis(None, jd_ut)),
        Body::Rahu => None,
        _ => body.star_planet().map(|p| planet_apsis(Some(p), jd_ut)),
    }
}

/// Longitude (degrees) of a body's node (पात); `None` for the Sun and Rahu.
#[must_use]
pub fn node_longitude(body: Body, jd_ut: f64) -> Option<f64> {
    match body {
        Body::Moon => Some(mean_longitude(MeanBody::MoonNode, jd_ut)),
        _ => body.star_planet().map(|p| planet_node(p, jd_ut)),
    }
}

/// Whole signs a mean body has entered since the Kali epoch (negative before it).
///
/// For Jupiter this is the count of बार्हस्पत्य years, which advances the 60-year
/// samvatsara cycle.
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    reason = "a sign count over the whole mahayuga is below 1e9 and floor() makes it whole"
)]
pub fn mean_sign_ingresses_since_kali(body: MeanBody, jd_ut: f64) -> i64 {
    let days = ahargana(jd_ut);
    let (whole, part) = split_days(days);
    let signs_per_day_numerator = 12 * i128::from(body.revolutions_per_mahayuga());
    let period = i128::from(MAHAYUGA_DAYS);
    let product = signs_per_day_numerator * whole;
    let (quotient, remainder) = (product.div_euclid(period), product.rem_euclid(period));
    let extra = ((exact_f64(remainder) + exact_f64(signs_per_day_numerator) * part)
        / exact_f64(period))
    .floor();
    (quotient as i64) + (extra as i64)
}
