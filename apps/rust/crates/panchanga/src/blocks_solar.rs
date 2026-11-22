//! Solar corrections: Belaantar, Deshaantar and Akshamsha (`solar_corrections.py`).

use astronomy::{
    System,
    engine::{Observer, is_nepal_observer, rise_set_on_day},
    surya_siddhanta::{Body, Crossing},
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, Moment, PyInstant, UtcInstant, Zone};

use crate::pyfloat::{py_int, py_round, py_round_int};

/// The day Python's solar corrections probe when the real day has no `date`.
pub(crate) const fn civil_probe_day() -> CivilDay {
    CivilDay::new(2020, 6, 15)
}

/// Gaurishankar prime meridian, the patro's देशान्तर reference.
const GAURISHANKAR_MERIDIAN: f64 = 86.25;
/// Kathmandu's latitude, the national reference for अक्षांश.
const REFERENCE_LATITUDE: f64 = 27.7172;

#[expect(
    clippy::cast_precision_loss,
    reason = "a whole-minute count of a day's corrections is small"
)]
fn split_minutes(total: f64) -> Map<String, Value> {
    let dhan = total >= 0.0;
    let abs = total.abs();
    let mut minutes = py_int(abs);
    let mut seconds = py_round_int((abs - minutes as f64) * 60.0);
    if seconds >= 60 {
        seconds -= 60;
        minutes += 1;
    }
    let prefix = if dhan { "+" } else { "-" };
    let v = json!({
        "minutes_total": py_round(total, 6), "minutes": minutes, "seconds": seconds,
        "sign": if dhan { "dhan" } else { "rin" }, "sign_ne": if dhan { "धन" } else { "ऋण" },
        "apply": if dhan { "add" } else { "subtract" },
        "label_en": format!("{prefix}{minutes}m {seconds:02}s"),
        "label_ne": format!("{prefix}{minutes} मि {seconds:02} से"),
    });
    match v {
        Value::Object(m) => m,
        _ => Map::new(),
    }
}

fn with(mut m: Map<String, Value>, extra: Value) -> Value {
    if let Value::Object(e) = extra {
        m.extend(e);
    }
    Value::Object(m)
}

/// Nepal's zone, parsed once.
static NEPAL: std::sync::LazyLock<Zone> = std::sync::LazyLock::new(Zone::kathmandu);

fn sunrise_at(
    system: System,
    day: CivilDay,
    lat: f64,
    lon: f64,
    zone: &Zone,
) -> Option<UtcInstant> {
    let observer = Observer {
        system,
        latitude: lat,
        longitude: lon,
        zone: zone.clone(),
    };
    match rise_set_on_day(Body::Sun, day, &observer, Crossing::Rise)? {
        Moment::Utc(t) => Some(t),
        Moment::Jd(_) => None,
    }
}

fn timezone_era(day: CivilDay) -> Value {
    if day <= CivilDay::new(1919, 12, 31) {
        json!({"key": "kmt", "name_en": "Kathmandu Mean Time", "name_ne": "काठमाडौं औसत सूर्य समय", "utc_offset": "+05:41:16", "utc_offset_seconds": 20476})
    } else if day <= CivilDay::new(1985, 12, 31) {
        json!({"key": "ist", "name_en": "Indian Standard Time", "name_ne": "भारतीय मानक समय", "utc_offset": "+05:30", "utc_offset_seconds": 19800})
    } else {
        json!({"key": "npt", "name_en": "Nepal Standard Time", "name_ne": "नेपाल मानक समय", "utc_offset": "+05:45", "utc_offset_seconds": 20700})
    }
}

/// `build_solar_corrections` anchored at sunrise.
///
/// `day` is the civil day for a `datetime`-range day. For a Julian Day sunrise
/// Python cannot build a `date`, so it probes 2020-06-15 for the zone meridian,
/// the timezone era and the akshamsha sunrises:
/// pass [`civil_probe_day`] then.
pub(crate) fn solar_corrections<I: PyInstant>(
    system: System,
    day: CivilDay,
    lat: f64,
    lon: f64,
    zone: &Zone,
    sunrise: I,
) -> Value {
    let meridian = f64::from(zone.offset_at_local(day, 12)) / 3600.0 * 15.0;
    let belaantar = -(system.equation_of_time_days(sunrise.to_jd()) * 24.0 * 60.0);
    let deshaantar = (lon - meridian) * 4.0;
    // Both sunrises are on the Gaurishankar meridian, so both start from that meridian's
    // own midnight (Nepal's clock), whatever zone the observer keeps. Python anchored
    // the observer's sunrise on the observer's zone: for a point outside Nepal the two
    // differed by that zone's whole offset, and the correction came out as hours.
    let nepal = &*NEPAL;
    let akshamsha = match (
        sunrise_at(system, day, lat, GAURISHANKAR_MERIDIAN, nepal),
        sunrise_at(
            system,
            day,
            REFERENCE_LATITUDE,
            GAURISHANKAR_MERIDIAN,
            nepal,
        ),
    ) {
        (Some(obs), Some(reference)) => Some(obs.seconds_since(reference) / 60.0),
        _ => None,
    };
    let mut out = Map::new();
    out.insert(
        "belaantar".into(),
        with(
            split_minutes(belaantar),
            json!({"name_ne": "बेलान्तर", "name_en": "Belaantar (equation of time)"}),
        ),
    );
    out.insert("deshaantar".into(), with(split_minutes(deshaantar), json!({
        "name_ne": "देशान्तर", "name_en": "Deshaantar (longitude correction)",
        "local_longitude": py_round(lon, 6), "standard_meridian_longitude": py_round(meridian, 6),
    })));
    out.insert("standard_meridian_longitude".into(), json!(meridian));
    out.insert(
        "computed_at_local".into(),
        json!(sunrise.astimezone(zone).iso),
    );
    out.insert("sunrise_includes_corrections".into(), json!(true));
    out.insert(
        "timezone_era".into(),
        if is_nepal_observer(lat, lon) {
            timezone_era(day)
        } else {
            Value::Null
        },
    );
    out.insert("ishtakaal_note_ne".into(), json!("सूचीबद्ध सूर्योदय/अस्त स्थानको वास्तविक अक्षांश र देशान्तरबाट गणना गरिएको हो — इष्टकाल गणनामा पुनः देशान्तर वा अक्षांश थप्नु पर्दैन। बेलान्तर सन्दर्भका लागि मात्र देखाइएको हो।"));
    out.insert("ishtakaal_note_en".into(), json!("Listed sunrise/sunset are computed from the observer's own latitude and longitude, so Deshaantar and Akshamsha are already inherent; do not apply them again for Ishtakaal. Belaantar is shown for reference only."));
    if let Some(minutes) = akshamsha {
        out.insert("akshamsha".into(), with(split_minutes(minutes), json!({
            "name_ne": "अक्षांश", "name_en": "Akshamsha (latitude correction)",
            "local_latitude": py_round(lat, 6), "reference_latitude": py_round(REFERENCE_LATITUDE, 6),
            "meridian_longitude": py_round(GAURISHANKAR_MERIDIAN, 6),
        })));
    }
    Value::Object(out)
}
