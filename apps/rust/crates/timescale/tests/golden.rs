//! `timescale` against the Python server (`apps/rust/scripts/gen_engine_golden.py`).

use std::sync::LazyLock;

use serde_json::Value;
use timescale::{Calendar, CivilDay, Moment, UtcInstant, Zone, julday, revjul};

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/timescale_golden.json"))
        .expect("golden file is valid JSON")
});

fn cases(name: &str) -> &'static [Value] {
    GOLDEN[name]
        .as_array()
        .unwrap_or_else(|| panic!("golden file has no {name}"))
}
fn f(v: &Value) -> f64 {
    v.as_f64().unwrap_or_else(|| panic!("not a number: {v}"))
}
fn i(v: &Value) -> i32 {
    i32::try_from(v.as_i64().unwrap_or_else(|| panic!("not an integer: {v}"))).expect("fits i32")
}
fn u(v: &Value) -> u32 {
    u32::try_from(v.as_i64().unwrap_or_else(|| panic!("not an integer: {v}"))).expect("fits u32")
}
fn cal(v: &Value) -> Calendar {
    if v.as_i64() == Some(1) {
        Calendar::Gregorian
    } else {
        Calendar::Julian
    }
}
fn same(got: f64, want: f64, what: &str) {
    assert_eq!(
        got.to_bits(),
        want.to_bits(),
        "{what}: rust {got:?} vs python {want:?}"
    );
}

#[test]
fn julday_and_revjul_match_swiss_ephemeris() {
    for c in cases("julday") {
        same(
            julday(i(&c[0]), u(&c[1]), u(&c[2]), f(&c[3]), cal(&c[4])),
            f(&c[5]),
            &format!("julday {c}"),
        );
    }
    for c in cases("revjul") {
        let (y, m, d, h) = revjul(f(&c[0]), cal(&c[1]));
        assert_eq!((y, m, d), (i(&c[2]), u(&c[3]), u(&c[4])), "revjul {c}");
        same(h, f(&c[5]), &format!("revjul hour {c}"));
    }
}

#[test]
fn civil_days_cross_the_cutover_like_python() {
    for c in cases("civil_to_jd") {
        same(
            CivilDay::new(i(&c[0]), u(&c[1]), u(&c[2])).to_jd_ut(),
            f(&c[3]),
            &format!("civil_to_jd {c}"),
        );
    }
    for c in cases("civil_from_jd") {
        assert_eq!(
            CivilDay::from_jd_ut(f(&c[0])),
            CivilDay::new(i(&c[1]), u(&c[2]), u(&c[3])),
            "civil_from_jd {c}"
        );
    }
}

#[test]
fn instants_convert_like_python_datetime() {
    for c in cases("julian_day") {
        let instant: UtcInstant = c[0].as_str().expect("iso").parse().expect("parses");
        assert_eq!(
            instant.to_string(),
            c[0].as_str().expect("iso"),
            "round trip"
        );
        same(instant.to_jd(), f(&c[1]), &format!("julian_day {c}"));
    }
    for c in cases("datetime_from_jd") {
        let want = c[1].as_str().expect("text");
        match Moment::from_jd(f(&c[0])) {
            Moment::Utc(instant) => assert_eq!(instant.to_string(), want, "datetime_from_jd {c}"),
            Moment::Jd(jd) => assert_eq!(format!("jd:{jd:?}"), want, "datetime_from_jd {c}"),
        }
    }
}

#[test]
fn zones_match_zoneinfo() {
    for c in cases("midnight_offset_days") {
        let zone = Zone::get(c[0].as_str().expect("zone")).expect("known zone");
        let day = CivilDay::new(i(&c[1]), u(&c[2]), u(&c[3]));
        same(
            f64::from(zone.midnight_offset_seconds(day)) / 86400.0,
            f(&c[4]),
            &format!("midnight offset {c}"),
        );
    }
    for c in cases("local_day") {
        let zone = Zone::get(c[0].as_str().expect("zone")).expect("known zone");
        let got = zone.local_day(Moment::from_jd(f(&c[1])));
        assert_eq!(
            got,
            CivilDay::new(i(&c[2]), u(&c[3]), u(&c[4])),
            "local day {c}"
        );
    }
}
