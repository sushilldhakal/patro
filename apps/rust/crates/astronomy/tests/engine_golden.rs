//! `astronomy::engine` against the Python engine under the Surya Siddhanta.

#[path = "../../../tests/support/parity.rs"]
#[expect(dead_code, reason = "this test uses part of the shared comparator")]
mod parity;

use std::sync::LazyLock;

use astronomy::{
    engine::{Observer, rise_set_on_day, sun_moon_longitudes},
    surya_siddhanta::{Body, Crossing},
};
use serde_json::Value;
use timescale::{CivilDay, Moment, Zone};

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/engine_golden.json"))
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
fn n(v: &Value) -> i64 {
    v.as_i64().unwrap_or_else(|| panic!("not an integer: {v}"))
}

#[test]
fn longitudes_are_the_engines() {
    for c in cases("longitudes") {
        let (sun, moon) = sun_moon_longitudes(SS, f(&c[0]));
        assert_eq!(sun.to_bits(), f(&c[1]).to_bits(), "sun {c}");
        assert_eq!(moon.to_bits(), f(&c[2]).to_bits(), "moon {c}");
    }
}

#[test]
fn rise_and_set_on_a_civil_day() {
    for c in cases("rise_set") {
        let body: Body = c[0].as_str().and_then(|s| s.parse().ok()).expect("body");
        let crossing = if c[1] == "rise" {
            Crossing::Rise
        } else {
            Crossing::Set
        };
        let day = CivilDay::new(
            i32::try_from(n(&c[2])).expect("year"),
            u32::try_from(n(&c[3])).expect("month"),
            u32::try_from(n(&c[4])).expect("day"),
        );
        let observer = Observer {
            system: astronomy::System::SuryaSiddhanta,
            latitude: f(&c[5]),
            longitude: f(&c[6]),
            zone: Zone::get(c[7].as_str().expect("zone")).expect("known zone"),
        };
        let got = rise_set_on_day(body, day, &observer, crossing).map(|m| match m {
            Moment::Utc(i) => i.to_string(),
            Moment::Jd(jd) => format!("jd:{jd:?}"),
        });
        // The engine solves the crossing; a printed second may differ from the
        // recording's bisection by the allowed drift.
        let (got, want) = (got.expect("rises"), c[8].as_str().expect("time"));
        let (got_jd, want_jd) = (got.strip_prefix("jd:"), want.strip_prefix("jd:"));
        assert!(
            parity::text_close(got_jd.unwrap_or(&got), want_jd.unwrap_or(want))
                && got_jd.is_some() == want_jd.is_some(),
            "{c}: rust {got} vs python {want}"
        );
    }
}

const SS: astronomy::System = astronomy::System::SuryaSiddhanta;
