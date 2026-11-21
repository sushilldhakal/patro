//! The Python module's own tests (`apps/api/tests/test_surya_siddhanta.py`), ported.
//! Each test name matches the Python one; tests that need Swiss Ephemeris (drik)
//! or the API are listed in PORTING.md and wait for those parts of the port.

use astronomy::surya_siddhanta::{
    Body, Crossing, Direction, Eclipse, EclipseKind, KALI_EPOCH_JD, MeanBody, SATYA_YUGA_START_JD,
    YEAR_DAYS, apsis_longitude, ayanamsha, eclipse_measures, mean_longitude, next_eclipse,
    next_rise_or_set, solar_eclipse_local, true_position,
};

const KALI: f64 = KALI_EPOCH_JD;
/// 1 Nov 2026, 0h UT (`CivilDay(2026, 11, 1).to_jd_ut()`).
const NOV_2026: f64 = 2_461_345.5;

fn assert_near(got: f64, want: f64, tolerance: f64, what: &str) {
    assert!(
        (got - want).abs() <= tolerance,
        "{what}: {got} not within {tolerance} of {want}"
    );
}

#[test]
fn test_every_mean_planet_starts_kali_yuga_at_mesha_0() {
    let keys = [
        MeanBody::Sun,
        MeanBody::Moon,
        MeanBody::Mars,
        MeanBody::MercurySighra,
        MeanBody::Jupiter,
        MeanBody::VenusSighra,
        MeanBody::Saturn,
    ];
    for key in keys {
        assert_near(mean_longitude(key, KALI), 0.0, 1e-6, key.name());
    }
}

#[test]
fn test_the_moons_apogee_and_node_at_kali_are_where_the_text_puts_them() {
    assert_near(
        mean_longitude(MeanBody::MoonApogee, KALI),
        90.0,
        1e-6,
        "apogee",
    );
    assert_near(
        mean_longitude(MeanBody::MoonNode, KALI),
        180.0,
        1e-6,
        "node",
    );
    let sun_apsis = apsis_longitude(Body::Sun, KALI).expect("the sun has an apsis");
    assert_near(sun_apsis, 77.13, 0.01, "sun apsis 77°8′");
}

#[test]
fn test_ayanamsha_is_zero_at_kali_and_3600_years_later_and_about_23_now() {
    assert_near(ayanamsha(KALI), 0.0, 1e-9, "at kali");
    assert_near(
        ayanamsha(KALI + 3600.0 * YEAR_DAYS),
        0.0,
        1e-6,
        "3600 years later",
    );
    assert_near(ayanamsha(NOV_2026), 22.91, 0.01, "nov 2026");
    assert_near(
        ayanamsha(KALI + 1800.0 * YEAR_DAYS),
        -27.0,
        1e-6,
        "1800 years later",
    );
}

#[test]
fn test_positions_exist_at_the_start_of_satya_yuga() {
    for body in Body::ALL {
        let (lon, _) = true_position(body, SATYA_YUGA_START_JD);
        assert!((0.0..360.0).contains(&lon), "{body}: {lon}");
    }
}

#[test]
fn test_sunrise_is_found_far_back_and_near_six() {
    let jd0 = SATYA_YUGA_START_JD.floor() + 0.5 + 100.0;
    let rise = next_rise_or_set(
        Body::Sun,
        jd0 - 85.3 / 360.0 - 0.25,
        27.7,
        85.3,
        Crossing::Rise,
        0.0,
    )
    .expect("the sun rises");
    let local_hours = (rise + 85.3 / 360.0 + 0.5).rem_euclid(1.0) * 24.0;
    assert!(
        4.5 < local_hours && local_hours < 7.5,
        "sunrise at {local_hours} h"
    );
}

#[test]
fn test_the_texts_shadow_and_discs_have_their_classical_size() {
    let m = eclipse_measures(NOV_2026);
    assert!(29.0 < m.moon && m.moon < 36.0, "moon {}", m.moon);
    assert!(29.0 < m.sun && m.sun < 35.0, "sun {}", m.sun);
    assert!(75.0 < m.shadow && m.shadow < 92.0, "shadow {}", m.shadow);
    assert!(
        44.0 < m.parallax && m.parallax < 58.0,
        "parallax {}",
        m.parallax
    );
}

#[test]
fn test_lunar_eclipse_of_3_march_2026_is_total_by_the_text() {
    // swe.julday(2026, 2, 1, 0) and the JD range of 3 March 2026 (UT).
    let found = next_eclipse(2_461_072.5, EclipseKind::Lunar, Direction::Forward);
    let Some(Eclipse::Lunar(e)) = found else {
        panic!("expected a lunar eclipse, got {found:?}")
    };
    assert!(
        (2_461_102.5..2_461_103.5).contains(&e.max_jd),
        "max on 3 March 2026, got {}",
        e.max_jd
    );
    assert_eq!(e.eclipse_type.name(), "total");
    let (partial_begin, partial_end) = e.partial.expect("partial contacts");
    let (total_begin, total_end) = e.total.expect("total contacts");
    assert!(
        partial_begin < total_begin
            && total_begin < e.max_jd
            && e.max_jd < total_end
            && total_end < partial_end,
        "contacts out of order: {e:?}"
    );
}

#[test]
fn test_the_annular_eclipse_of_june_2020_is_seen_from_kathmandu() {
    // swe.julday(2020, 6, 15, 0); the engine passes geopos (lon 85.32, lat 27.7).
    let found =
        next_eclipse(2_459_015.5, EclipseKind::Solar, Direction::Forward).expect("a solar eclipse");
    let local = solar_eclipse_local(found.max_jd(), 27.7, 85.32).expect("seen from kathmandu");
    assert!(local.visible, "sun is up at the middle");
    let begin = local.local_begin_jd.expect("first contact");
    let end = local.local_end_jd.expect("last contact");
    assert!(
        begin < local.local_max_jd && local.local_max_jd < end,
        "contacts out of order: {local:?}"
    );
}

#[test]
fn test_eclipses_are_found_long_before_any_ephemeris_reaches() {
    let deep = SATYA_YUGA_START_JD + 1_000_000.0;
    assert!(
        next_eclipse(deep, EclipseKind::Lunar, Direction::Forward).is_some(),
        "lunar"
    );
    assert!(
        next_eclipse(deep, EclipseKind::Solar, Direction::Backward).is_some(),
        "solar backward"
    );
}
