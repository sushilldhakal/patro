//! The seasons page (`engine/calendar/tropical_seasons.py` over
//! `engine/astronomy/tropical_year.py`): the current ऋतु and the next five season
//! starts, the ayana in force and the next one — each the real-sky (tropical)
//! crossing, with the Surya Siddhanta's sidereal crossing of the same degree beside it.

use astronomy::{System, engine::sun_longitude};
use panchanga::{
    daily::Location,
    pyfloat::{py_floordiv, py_int, py_mod},
    tropical_sun_longitude,
};
use serde_json::{Map, Value, json};
use timescale::{UtcInstant, Zone};

const SUN_DEG_PER_DAY: f64 = 360.0 / 365.2422;
const VASANTA_START_DEG: i64 = 330;
const UTTARAYANA_START_DEG: i64 = 270;
const DAKSHINAYANA_START_DEG: i64 = 90;

/// `signed_diff`.
fn signed_diff(deg: f64) -> f64 {
    py_mod(py_mod(deg, 360.0) + 540.0, 360.0) - 180.0
}

/// `_refine_crossing`: sixteen Newton steps at the mean solar speed.
fn refine(longitude: impl Fn(f64) -> f64, target: f64, guess: f64) -> f64 {
    let mut jd = guess;
    for _ in 0..16 {
        jd -= signed_diff(longitude(jd) - target) / SUN_DEG_PER_DAY;
    }
    jd
}

fn sidereal_sun(system: System, jd: f64) -> f64 {
    py_mod(sun_longitude(system, jd), 360.0)
}

/// `ritu_slot`: 0 Vasanta … 5 Shishira.
fn ritu_slot(longitude: f64) -> i64 {
    #[expect(clippy::cast_precision_loss, reason = "330")]
    let start = VASANTA_START_DEG as f64;
    py_int(py_floordiv(py_mod(longitude - start, 360.0), 60.0))
}

/// `_start_fields`: the crossing (whole seconds, UTC) and its civil AD / BS day in `zone`.
fn start_fields(jd: f64, zone: &Zone) -> Map<String, Value> {
    let mut m = Map::new();
    let Some(start) = UtcInstant::from_jd_truncated(jd) else {
        return m;
    };
    let day = zone.local(start).day();
    let bs = calendar::civil_to_bs(day).map_or_else(
        |_| Value::Null,
        |b| json!(format!("{}-{:02}-{:02}", b.year, b.month, b.day)),
    );
    m.insert(
        "start_instant_utc".into(),
        json!(start.at_offset(0).to_string()),
    );
    m.insert(
        "start_ad".into(),
        json!(format!("{:04}-{:02}-{:02}", day.year, day.month, day.day)),
    );
    m.insert("start_bs".into(), bs);
    m
}

/// `_with_vedic(angle, real_jd)`.
fn with_vedic(system: System, angle: f64, real_jd: f64, zone: &Zone) -> Map<String, Value> {
    let mut m = start_fields(real_jd, zone);
    let vedic = refine(|jd| sidereal_sun(system, jd), angle, real_jd);
    m.insert("vedic".into(), Value::Object(start_fields(vedic, zone)));
    m
}

#[expect(
    clippy::cast_precision_loss,
    reason = "season angles are whole degrees"
)]
fn deg(angle: i64) -> f64 {
    angle as f64
}

/// `build_tropical_seasons_response(lat=, timezone_name=)` at `now`.
#[must_use]
pub fn tropical_seasons(location: &Location, now: UtcInstant) -> Value {
    let zone = &location.zone;
    let now_jd = now.to_jd();
    let system = location.system;
    let lambda = tropical_sun_longitude(system, now_jd);
    let current = ritu_slot(lambda);
    let boundaries: Vec<Value> = (0..6)
        .map(|i| {
            let slot = (current + i) % 6;
            let angle = (VASANTA_START_DEG + slot * 60) % 360;
            let offset = if i == 0 {
                signed_diff(deg(angle) - lambda)
            } else {
                py_mod(deg(angle) - lambda, 360.0)
            };
            let real = refine(
                |jd| tropical_sun_longitude(system, jd),
                deg(angle),
                now_jd + offset / SUN_DEG_PER_DAY,
            );
            let mut m = Map::new();
            m.insert("slot".into(), json!(slot));
            m.insert("angle".into(), json!(angle));
            m.extend(with_vedic(system, deg(angle), real, zone));
            m.insert("is_current".into(), json!(i == 0));
            Value::Object(m)
        })
        .collect();
    let uttara_now = lambda >= deg(UTTARAYANA_START_DEG) || lambda < deg(DAKSHINAYANA_START_DEG);
    let ayanas: Vec<Value> = [uttara_now, !uttara_now]
        .into_iter()
        .enumerate()
        .map(|(i, uttara)| {
            let angle = if uttara {
                UTTARAYANA_START_DEG
            } else {
                DAKSHINAYANA_START_DEG
            };
            let offset = if i == 0 {
                signed_diff(deg(angle) - lambda)
            } else {
                py_mod(deg(angle) - lambda, 360.0)
            };
            let real = refine(
                |jd| tropical_sun_longitude(system, jd),
                deg(angle),
                now_jd + offset / SUN_DEG_PER_DAY,
            );
            let mut m = Map::new();
            m.insert(
                "name".into(),
                json!(if uttara { "Uttarayana" } else { "Dakshinayana" }),
            );
            m.insert(
                "name_ne".into(),
                json!(if uttara {
                    "उत्तरायण"
                } else {
                    "दक्षिणायण"
                }),
            );
            m.insert("angle".into(), json!(angle));
            m.extend(with_vedic(system, deg(angle), real, zone));
            m.insert("is_current".into(), json!(i == 0));
            Value::Object(m)
        })
        .collect();
    json!({
        "timezone": zone.name(),
        "latitude": location.lat,
        "southern_hemisphere": location.lat < 0.0,
        "boundaries": boundaries,
        "ayanas": ayanas,
        "vedic_siddhanta": "surya_siddhanta",
    })
}
