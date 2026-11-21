//! Sankrantis and the BS month grid against the Python server.

use std::sync::LazyLock;

use calendar::{
    BsDate, bs_to_civil, civil_to_bs, find_sankranti_after_jd, month_length, month_start,
    month_starts,
};
use serde_json::Value;
use timescale::CivilDay;

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/calendar_golden.json"))
        .expect("golden file is valid JSON")
});

fn cases(name: &str) -> &'static [Value] {
    GOLDEN[name]
        .as_array()
        .unwrap_or_else(|| panic!("golden file has no {name}"))
}
fn i(v: &Value) -> i32 {
    i32::try_from(v.as_i64().unwrap_or_else(|| panic!("not an integer: {v}"))).expect("fits i32")
}
fn u(v: &Value) -> u32 {
    u32::try_from(v.as_i64().unwrap_or_else(|| panic!("not an integer: {v}"))).expect("fits u32")
}

#[test]
fn month_starts_and_lengths() {
    for c in cases("month_start") {
        let got = month_start(i(&c[0]), u(&c[1])).expect("solves");
        assert_eq!(
            got,
            CivilDay::new(i(&c[2]), u(&c[3]), u(&c[4])),
            "month start {c}"
        );
    }
    for c in cases("month_start").chunks(12) {
        let year = i(&c[0][0]);
        let all = month_starts(year).expect("solves");
        for (got, want) in all.iter().zip(c) {
            assert_eq!(
                *got,
                CivilDay::new(i(&want[2]), u(&want[3]), u(&want[4])),
                "month_starts {year}"
            );
        }
    }
    for c in cases("month_length") {
        assert_eq!(
            month_length(i(&c[0]), u(&c[1])).expect("solves"),
            u(&c[2]),
            "month length {c}"
        );
    }
}

#[test]
fn conversions() {
    for c in cases("civil_to_bs") {
        let got = civil_to_bs(CivilDay::new(i(&c[0]), u(&c[1]), u(&c[2]))).expect("converts");
        assert_eq!(
            got,
            BsDate {
                year: i(&c[3]),
                month: u(&c[4]),
                day: u(&c[5])
            },
            "civil_to_bs {c}"
        );
    }
    for c in cases("bs_to_civil") {
        let got = bs_to_civil(BsDate {
            year: i(&c[0]),
            month: u(&c[1]),
            day: u(&c[2]),
        })
        .expect("converts");
        assert_eq!(
            got,
            CivilDay::new(i(&c[3]), u(&c[4]), u(&c[5])),
            "bs_to_civil {c}"
        );
    }
}

#[test]
fn sankrantis_match_to_the_bit() {
    for c in cases("sankranti") {
        let got = find_sankranti_after_jd(u(&c[0]), c[1].as_f64().expect("jd"), 45);
        assert_eq!(
            got.map(f64::to_bits),
            c[2].as_f64().map(f64::to_bits),
            "sankranti {c}"
        );
    }
}
