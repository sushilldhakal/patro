//! The event engine's replayed searches against the full bisections they replace:
//! every boundary must be the same microsecond, everywhere on the time axis.

use astronomy::engine::{moon_longitude, sun_longitude};
use panchanga::{
    boundary_reference::{span_end, span_start},
    karana, karana_end, karana_start, moon_pada_end, moon_rashi_end, nakshatra, nakshatra_end,
    nakshatra_start, sun_nakshatra_end, tithi, tithi_end, tithi_start, yoga, yoga_end, yoga_start,
};
use timescale::{JdInstant, PyInstant, UtcInstant};

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "test ratios"
)]
fn t(x: f64) -> u32 {
    x as u32
}
fn tithi_i(jd: f64) -> u32 {
    tithi(jd).number
}
fn nak_i(jd: f64) -> u32 {
    nakshatra(jd).number
}
fn yoga_i(jd: f64) -> u32 {
    yoga(jd).number
}
fn karana_i(jd: f64) -> u32 {
    karana(jd).number
}
fn rashi_i(jd: f64) -> u32 {
    t(moon_longitude(jd) / 30.0) % 12
}
fn pada_i(jd: f64) -> u32 {
    let span = 360.0 / 27.0;
    let moon = moon_longitude(jd);
    let n = t(moon / span) + 1;
    let n = if n > 27 { 1 } else { n };
    let pada = (t((moon % span) / (span / 4.0)) + 1).min(4);
    (n - 1) * 4 + (pada - 1)
}
fn sun_nak_i(jd: f64) -> u32 {
    let n = t(sun_longitude(jd) / (360.0 / 27.0)) + 1;
    if n > 27 { 1 } else { n }
}

fn check<I: PyInstant>(at: I) {
    assert_eq!(tithi_end(at), span_end(at, 30, tithi_i), "tithi_end {at}");
    assert_eq!(tithi_start(at), span_start(at, tithi_i), "tithi_start {at}");
    assert_eq!(
        nakshatra_end(at),
        span_end(at, 30, nak_i),
        "nakshatra_end {at}"
    );
    assert_eq!(
        nakshatra_start(at),
        span_start(at, nak_i),
        "nakshatra_start {at}"
    );
    assert_eq!(yoga_end(at), span_end(at, 30, yoga_i), "yoga_end {at}");
    assert_eq!(yoga_start(at), span_start(at, yoga_i), "yoga_start {at}");
    assert_eq!(
        karana_end(at),
        span_end(at, 30, karana_i),
        "karana_end {at}"
    );
    assert_eq!(
        karana_start(at),
        span_start(at, karana_i),
        "karana_start {at}"
    );
    assert_eq!(
        moon_rashi_end(at),
        span_end(at, 60, rashi_i),
        "moon_rashi_end {at}"
    );
    assert_eq!(
        moon_pada_end(at),
        span_end(at, 8, pada_i),
        "moon_pada_end {at}"
    );
    assert_eq!(
        sun_nakshatra_end(at),
        span_end(at, 30, sun_nak_i),
        "sun_nakshatra_end {at}"
    );
}

/// A fixed pseudo-random walk over JD so the cases are reproducible.
fn jds(n: usize, lo: f64, hi: f64) -> impl Iterator<Item = f64> {
    let mut x: u64 = 0x9E37_79B9_7F4A_7C15;
    (0..n).map(move |_| {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
        let u = (x >> 11) as f64 / (1_u64 << 53) as f64;
        lo + u * (hi - lo)
    })
}

#[test]
fn utc_instants_match_the_full_bisection() {
    for jd in jds(1500, 2_299_161.0, 2_524_593.0) {
        if let Some(at) = UtcInstant::from_jd_truncated(jd) {
            check(at);
        }
    }
}

#[test]
fn instants_on_and_beside_a_boundary_match() {
    for jd in jds(150, 2_440_000.0, 2_480_000.0) {
        let Some(at) = UtcInstant::from_jd_truncated(jd) else {
            continue;
        };
        let end = span_end(at, 30, tithi_i);
        for offset in [-1_000_000, -1, 0, 1, 999_999] {
            check(end.add_micros(offset));
        }
    }
}

#[test]
fn julian_day_instants_match_the_full_bisection() {
    for jd in jds(400, 0.0, 2_299_160.0) {
        check(JdInstant(jd));
    }
}
