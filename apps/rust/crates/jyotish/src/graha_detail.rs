//! The graha detail pages: yearly वक्री/मार्गी stations and अस्त periods
//! (`engine/jyotish/graha_detail.py`).

use astronomy::{
    engine::rise_set_on_day,
    surya_siddhanta::{Body, Crossing},
};
use panchanga::{
    daily::{Location, SunriseInstant},
    pyfloat::{py_mod, py_round_int},
    sunrise_on,
};
use serde_json::{Value, json};
use timescale::{CivilDay, JdInstant, Moment, PyInstant, UtcInstant};

use crate::{
    Graha,
    gochar::{
        GocharError, Kind, attach_local_time, meta, motion_stations, position_longitude,
        udayast_events,
    },
};

/// `YEARLY_GRAHAS` / `ASTA_PLANET_GRAHAS`.
const YEARLY_GRAHAS: [Graha; 5] = [
    Graha::Mercury,
    Graha::Venus,
    Graha::Mars,
    Graha::Jupiter,
    Graha::Saturn,
];
/// `ASTA_GRAHAS`: the display order, the Moon included.
const ASTA_GRAHAS: [Graha; 6] = [
    Graha::Mercury,
    Graha::Venus,
    Graha::Moon,
    Graha::Mars,
    Graha::Jupiter,
    Graha::Saturn,
];
/// `MOON_ASTA_ORB`.
const MOON_ASTA_ORB: f64 = 13.0;

fn keys(grahas: &[Graha]) -> Value {
    json!(grahas.iter().map(|g| g.key()).collect::<Vec<_>>())
}

/// The sunrise window a span is scanned over: first day's sunrise to the sunrise
/// after the last day.
fn sunrise_window<I: SunriseInstant>(
    jd_start: f64,
    jd_end: f64,
    location: &Location,
) -> Result<(I, I), GocharError> {
    Ok((
        I::sunrise_on(CivilDay::from_jd_ut(jd_start), location)?,
        I::sunrise_on(CivilDay::from_jd_ut(jd_end).add_days(1), location)?,
    ))
}

/// Whether a span's scan runs on `datetime`s (both ends from 1582-10-15) or on
/// Julian Day instants (Python's `UtInstant` sunrises).
fn datetime_span(jd_start: f64, jd_end: f64) -> bool {
    CivilDay::from_jd_ut(jd_start).is_datetime_range()
        && CivilDay::from_jd_ut(jd_end).add_days(1).is_datetime_range()
}

/// `build_graha_vakri_span`.
///
/// # Errors
///
/// [`GocharError`] when a sunrise cannot be found.
pub fn graha_vakri_span(
    jd_start: f64,
    jd_end: f64,
    location: &Location,
) -> Result<Value, GocharError> {
    let events = if datetime_span(jd_start, jd_end) {
        vakri_events::<UtcInstant>(jd_start, jd_end, location)?
    } else {
        vakri_events::<JdInstant>(jd_start, jd_end, location)?
    };
    Ok(json!({
        "range_start_jd": jd_start, "range_end_jd": jd_end, "location": location.as_json(),
        "grahas": keys(&YEARLY_GRAHAS), "events": events,
    }))
}

fn vakri_events<I: SunriseInstant>(
    jd_start: f64,
    jd_end: f64,
    location: &Location,
) -> Result<Vec<Value>, GocharError> {
    let (from, until) = sunrise_window::<I>(jd_start, jd_end, location)?;
    Ok(motion_stations(from, until, &YEARLY_GRAHAS)
        .into_iter()
        .map(|e| {
            let mut m = e.to_json();
            attach_local_time(&mut m, e.at, location);
            Value::Object(m)
        })
        .collect())
}

/// A stamped moment: `_stamp`'s block and its local civil day JD.
struct Stamp {
    value: Value,
    day_jd: f64,
}

/// `_stamp`: `iso` as given (`isoformat()` — UTC expanded ISO for a Julian Day
/// instant), the local civil day JD and `HH:MM` from `local_civil_fields`.
fn stamp<I: PyInstant>(iso: &str, at: I, location: &Location) -> Stamp {
    let fields = at.civil_fields(&location.zone);
    let day_jd = fields.day.to_jd_ut();
    Stamp {
        value: json!({"iso": iso, "jd": day_jd, "time_short": fields.hm}),
        day_jd,
    }
}

/// `_duration_days`: local civil days, both ends counted.
fn duration_days(start: Option<&Stamp>, end: Option<&Stamp>) -> Value {
    match (start, end) {
        (Some(s), Some(e)) => json!(py_round_int(e.day_jd - s.day_jd) + 1),
        _ => Value::Null,
    }
}

/// One अस्त period, with the sort key `(ASTA_GRAHAS index, start iso)`.
struct Period {
    order: usize,
    start_iso: String,
    value: Value,
}

fn period(
    order: usize,
    graha: &str,
    graha_ne: &str,
    start: Option<Stamp>,
    end: Option<Stamp>,
    hemisphere: &Value,
) -> Period {
    let start_iso = start
        .as_ref()
        .or(end.as_ref())
        .and_then(|s| s.value["iso"].as_str())
        .unwrap_or_default()
        .to_owned();
    let duration = duration_days(start.as_ref(), end.as_ref());
    Period {
        order,
        start_iso,
        value: json!({
            "graha": graha, "graha_ne": graha_ne,
            "start": start.map(|s| s.value), "end": end.map(|s| s.value),
            "duration_days": duration,
            "hemisphere": hemisphere,
        }),
    }
}

/// `_planet_period`: the asta event opens it, the udaya event closes it (both read
/// back from their printed `entry_time_utc`).
fn planet_period<I: PyInstant>(
    graha: Graha,
    asta: Option<(I, bool)>,
    udaya: Option<(I, bool)>,
    location: &Location,
) -> Period {
    let stamp_of = |(t, _): (I, bool)| stamp(&t.to_string(), t, location);
    let hemisphere = asta.or(udaya).map_or(Value::Null, |(_, east)| {
        json!(if east { "west" } else { "east" })
    });
    period(
        ASTA_GRAHAS.iter().position(|g| *g == graha).unwrap_or(99),
        graha.key(),
        meta(graha).1,
        asta.map(stamp_of),
        udaya.map(stamp_of),
        &hemisphere,
    )
}

/// `_planet_asta_periods`: asta → udaya pairs per graha (graha order of first event).
fn planet_periods<I: PyInstant>(from: I, until: I, location: &Location) -> Vec<Period> {
    let events = udayast_events(from, until, &YEARLY_GRAHAS);
    let mut order: Vec<Graha> = Vec::new();
    for e in &events {
        if !order.contains(&e.graha) {
            order.push(e.graha);
        }
    }
    let mut periods = Vec::new();
    for g in order {
        let mut evs: Vec<_> = events.iter().filter(|e| e.graha == g).collect();
        evs.sort_by_key(|e| e.at.to_string());
        let mut open: Option<(I, bool)> = None;
        for e in evs {
            if let Kind::Udayast { visible, east, .. } = e.kind {
                let at = e.printed_at();
                if visible {
                    periods.push(planet_period(g, open, Some((at, east)), location));
                    open = None;
                } else {
                    open = Some((at, east));
                }
            }
        }
        if open.is_some() {
            periods.push(planet_period(g, open, None, location));
        }
    }
    periods
}

/// `_elongation_at`: the unsigned Sun–Moon elongation from the rounded positions.
fn elongation_at(jd: f64) -> f64 {
    let diff = py_mod(
        position_longitude(Graha::Moon, jd) - position_longitude(Graha::Sun, jd),
        360.0,
    );
    diff.min(360.0 - diff)
}

/// `local_wall_instant(day, tz, hour=h)` for a day `datetime` cannot hold: the
/// zone's modern offset.
fn local_wall_jd(day: CivilDay, hour: u32, location: &Location) -> JdInstant {
    let offset_hours = f64::from(location.zone.reference_offset_seconds()) / 3600.0;
    JdInstant(timescale::julday(
        day.year,
        day.month,
        day.day,
        f64::from(hour) - offset_hours,
        day.calendar(),
    ))
}

/// The smallest elongation of a local civil day, sampled every 30 minutes (99 when
/// the Moon is far from the Sun at local noon).
fn day_min_elongation(day: CivilDay, location: &Location) -> f64 {
    if !day.is_datetime_range() {
        let noon = local_wall_jd(day, 12, location);
        if elongation_at(noon.0) > 28.0 {
            return 99.0;
        }
        let base = local_wall_jd(day, 0, location);
        return (0..48)
            .map(|i| elongation_at(base.add_seconds(i * 1800).0))
            .fold(f64::INFINITY, f64::min);
    }
    let Some(noon) = location.zone.local_to_utc(day, 12, 0, 0, 0) else {
        return 99.0;
    };
    if elongation_at(noon.to_jd()) > 28.0 {
        return 99.0;
    }
    let Some(base) = location.zone.local_to_utc(day, 0, 0, 0, 0) else {
        return 99.0;
    };
    (0..48)
        .map(|i| elongation_at(base.add_seconds(i * 1800).to_jd()))
        .fold(f64::INFINITY, f64::min)
}

/// Moonrise or moonset on a civil day, stamped with its zone `isoformat()`
/// (a `datetime`) or its UTC expanded ISO (a Julian Day instant).
fn moon_event(day: CivilDay, location: &Location, crossing: Crossing) -> Option<Stamp> {
    match rise_set_on_day(Body::Moon, day, &location.observer(), crossing)? {
        Moment::Utc(t) => Some(stamp(&location.zone.local(t).to_string(), t, location)),
        Moment::Jd(jd) => {
            let t = JdInstant(jd);
            Some(stamp(&t.to_string(), t, location))
        }
    }
}

/// `_moon_tara_asta_periods`: runs of combust days, moonrise of the first to moonset
/// of the last.
fn moon_periods(from: CivilDay, to: CivilDay, location: &Location) -> Vec<Period> {
    let mut groups: Vec<(CivilDay, CivilDay)> = Vec::new();
    let mut current: Option<(CivilDay, CivilDay)> = None;
    let mut cursor = from;
    while cursor <= to {
        if day_min_elongation(cursor, location) < MOON_ASTA_ORB {
            current = Some((current.map_or(cursor, |c| c.0), cursor));
        } else if let Some(c) = current.take() {
            groups.push(c);
        }
        cursor = cursor.add_days(1);
    }
    if let Some(c) = current {
        groups.push(c);
    }
    groups
        .into_iter()
        .map(|(first, last)| {
            period(
                2,
                "moon",
                "चन्द्र",
                moon_event(first, location, Crossing::Rise),
                moon_event(last, location, Crossing::Set),
                &Value::Null,
            )
        })
        .collect()
}

/// `build_graha_asta_span`.
///
/// # Errors
///
/// [`GocharError`] when a sunrise cannot be found.
pub fn graha_asta_span(
    jd_start: f64,
    jd_end: f64,
    location: &Location,
) -> Result<Value, GocharError> {
    let mut periods = if datetime_span(jd_start, jd_end) {
        let (from, until) = sunrise_window::<UtcInstant>(jd_start, jd_end, location)?;
        planet_periods(from, until, location)
    } else {
        let (from, until) = sunrise_window::<JdInstant>(jd_start, jd_end, location)?;
        planet_periods(from, until, location)
    };
    periods.extend(moon_periods(
        CivilDay::from_jd_ut(jd_start),
        CivilDay::from_jd_ut(jd_end),
        location,
    ));
    periods.sort_by(|a, b| {
        a.order
            .cmp(&b.order)
            .then_with(|| a.start_iso.cmp(&b.start_iso))
    });
    Ok(json!({
        "range_start_jd": jd_start, "range_end_jd": jd_end, "location": location.as_json(),
        "grahas": keys(&ASTA_GRAHAS),
        "periods": periods.into_iter().map(|p| p.value).collect::<Vec<_>>(),
    }))
}

/// `_dms_in_rashi`: `21° कन्या 53′ 14″`.
fn dms_in_rashi(lon: f64) -> String {
    let lon = py_mod(lon, 360.0);
    let rashi = usize::try_from(
        panchanga::pyfloat::py_int(panchanga::pyfloat::py_floordiv(lon, 30.0)) % 12,
    )
    .unwrap_or(0);
    let (deg, minute, sec) = dms_parts(py_mod(lon, 30.0));
    format!(
        "{deg:02}° {} {minute:02}′ {sec:02}″",
        panchanga::RASHI_NAMES_NE[rashi]
    )
}

/// `_dms_latitude`: `04° द. 45′ 02″`.
fn dms_latitude(lat: f64) -> String {
    let hemi = if lat >= 0.0 { "उ." } else { "द." };
    let (deg, minute, sec) = dms_parts(lat.abs());
    format!("{deg:02}° {hemi} {minute:02}′ {sec:02}″")
}

fn dms_parts(value: f64) -> (i64, i64, i64) {
    let mut deg = panchanga::pyfloat::py_int(value);
    #[expect(clippy::cast_precision_loss, reason = "degrees below 360")]
    let m = (value - deg as f64) * 60.0;
    let mut minute = panchanga::pyfloat::py_int(m);
    #[expect(clippy::cast_precision_loss, reason = "minutes below 60")]
    let mut sec = py_round_int((m - minute as f64) * 60.0);
    if sec >= 60 {
        sec -= 60;
        minute += 1;
    }
    if minute >= 60 {
        minute -= 60;
        deg += 1;
    }
    (deg, minute, sec)
}

/// One sphuta row (`_graha_row` and the lagna row).
struct SphutaRow<'a> {
    key: &'a str,
    name_ne: &'a str,
    vedic: &'a str,
    symbol: &'a str,
    lon: f64,
    speed: f64,
    /// (latitude, right ascension, declination).
    coords: (f64, f64, f64),
    retrograde: bool,
    combust: bool,
}

impl SphutaRow<'_> {
    fn to_json(&self) -> Value {
        use panchanga::{
            NAKSHATRA_NAMES, NAKSHATRA_NAMES_NE, RASHI_NAMES_NE, nepali_digits,
            pyfloat::{py_floordiv, py_int, py_round},
        };
        let span = 360.0 / 27.0;
        let lon = py_mod(self.lon, 360.0);
        let nak = usize::try_from(py_int(py_floordiv(lon, span)) % 27).unwrap_or(0);
        let pada = (py_int(py_mod(lon, span) / (span / 4.0)) + 1).min(4);
        #[expect(clippy::cast_precision_loss, reason = "a nakshatra index")]
        let pos = lon - nak as f64 * span;
        let elapsed = (pos / span) * 120.0;
        let start = nak % 9;
        let mut cumulative = 0.0;
        let mut sub = crate::dasha::SEQUENCE[start];
        for i in 0..9 {
            let lord = crate::dasha::SEQUENCE[(start + i) % 9];
            cumulative += f64::from(crate::dasha::years(lord));
            if elapsed < cumulative {
                sub = lord;
                break;
            }
        }
        let rashi =
            usize::try_from(py_int(py_floordiv(py_mod(self.lon, 360.0), 30.0)) % 12).unwrap_or(0);
        json!({
            "graha": self.key, "name_ne": self.name_ne, "name_vedic": self.vedic, "symbol": self.symbol,
            "rekhamsha": dms_in_rashi(self.lon), "rashi_ne": RASHI_NAMES_NE[rashi],
            "nakshatra": NAKSHATRA_NAMES[nak], "nakshatra_ne": NAKSHATRA_NAMES_NE[nak],
            "pada": pada, "pada_ne": nepali_digits(pada),
            "nakshatra_lord_ne": crate::dasha::lord_ne(crate::dasha::SEQUENCE[nak % 9]),
            "sub_lord_ne": crate::dasha::lord_ne(sub),
            "full_degree": py_round(py_mod(self.lon, 360.0), 2),
            "shara": dms_latitude(self.coords.0), "shara_deg": py_round(self.coords.0, 4),
            "speed_deg_day": py_round(self.speed, 2),
            "is_retrograde": self.retrograde, "is_combust": self.combust,
            "right_ascension": py_round(self.coords.1, 2), "declination": py_round(self.coords.2, 2),
        })
    }
}

/// `build_graha_sthiti(jd, location)`: the lagna and all nine grahas at sunrise.
///
/// # Errors
///
/// [`GocharError`] when the sunrise cannot be found.
pub fn graha_sthiti(jd: f64, location: &Location) -> Result<Value, GocharError> {
    let civil = CivilDay::from_jd_ut(jd);
    if civil.is_datetime_range() {
        Ok(graha_sthiti_at(
            civil,
            sunrise_on(civil, location)?,
            location,
        ))
    } else {
        Ok(graha_sthiti_at(
            civil,
            JdInstant::sunrise_on(civil, location)?,
            location,
        ))
    }
}

fn graha_sthiti_at<I: PyInstant>(civil: CivilDay, sunrise: I, location: &Location) -> Value {
    let sjd = sunrise.to_jd();
    let asc = astronomy::surya_siddhanta::ascendant(sjd, location.lat, location.lon);
    let (ra, dec, speed) = panchanga::ascendant_extras(sjd, location.lat, location.lon);
    let mut rows = vec![
        SphutaRow {
            key: "lagna",
            name_ne: "लग्न",
            vedic: "Lagna",
            symbol: "↑",
            lon: asc,
            speed,
            coords: (0.0, ra, dec),
            retrograde: false,
            combust: false,
        }
        .to_json(),
    ];
    let positions = panchanga::graha_positions(sjd);
    for g in Graha::ALL {
        let (lon, spd) = positions
            .iter()
            .find(|p| p.key == g.key())
            .map_or((0.0, 0.0), |p| (p.longitude, p.speed));
        let retrograde = match g {
            Graha::Rahu | Graha::Ketu => true,
            Graha::Sun | Graha::Moon => false,
            _ => spd < 0.0,
        };
        let combust = !matches!(g, Graha::Sun | Graha::Moon | Graha::Rahu | Graha::Ketu)
            && !crate::gochar::visible(g, sunrise);
        let (vedic, ne, symbol) = meta(g);
        rows.push(
            SphutaRow {
                key: g.key(),
                name_ne: ne,
                vedic,
                symbol,
                lon,
                speed: spd,
                coords: panchanga::graha_extras(sjd, g.key()).unwrap_or((0.0, 0.0, 0.0)),
                retrograde,
                combust,
            }
            .to_json(),
        );
    }
    let date_bs = calendar::locate_patro_day(civil)
        .ok()
        .map(|b| format!("{}-{:02}-{:02}", b.year, b.month, b.day));
    json!({
        "date_ad": civil.to_string(), "date_bs": date_bs, "anchor": "sunrise",
        "timezone": location.zone.name(),
        "sunrise_local": sunrise.wall(&location.zone).iso,
        "location": location.as_json(), "rows": rows,
    })
}

/// `build_eclipse_span(jd_start, jd_end, kind, location)`: eclipses whose middle
/// falls in the inclusive span (Surya Siddhanta chapters IV–V).
#[must_use]
pub fn eclipse_span(
    jd_start: f64,
    jd_end: f64,
    which: astronomy::surya_siddhanta::EclipseKind,
    location: &Location,
) -> Value {
    use astronomy::surya_siddhanta::{
        Direction, Eclipse, EclipseKind, altitude, next_eclipse, solar_eclipse_local,
    };
    let solar = which == EclipseKind::Solar;
    let kind = if solar { "solar" } else { "lunar" };
    let scan_end = jd_end + 1.0;
    let zone = &location.zone;
    // `datetime_from_jd(jd).astimezone(tz).isoformat()`: a `UtInstant` (before
    // 1582-10-15) ignores the zone and prints its UTC expanded ISO.
    let local_iso = |jd: f64| match UtcInstant::from_jd_truncated(jd) {
        Some(t) => zone.local(t).to_string(),
        None => JdInstant(jd).to_string(),
    };
    let local = |jd: Option<f64>| {
        jd.filter(|v| *v != 0.0)
            .map_or(Value::Null, |v| json!(local_iso(v)))
    };
    let mut events = Vec::new();
    let mut cursor = jd_start;
    let mut guard = 0;
    while cursor < scan_end && guard < 60 {
        guard += 1;
        let found = next_eclipse(
            cursor,
            if solar {
                EclipseKind::Solar
            } else {
                EclipseKind::Lunar
            },
            Direction::Forward,
        );
        let Some(found) = found else { break };
        let max_jd = found.max_jd();
        if max_jd >= scan_end {
            break;
        }
        let (etype, visible, begin, end) = match found {
            Eclipse::Solar(e) => {
                let seen = solar_eclipse_local(max_jd, location.lat, location.lon);
                (
                    e.eclipse_type.name(),
                    seen.is_some_and(|s| s.visible),
                    seen.and_then(|s| s.local_begin_jd),
                    seen.and_then(|s| s.local_end_jd),
                )
            }
            Eclipse::Lunar(e) => (
                e.eclipse_type.name(),
                altitude(Body::Moon, max_jd, location.lat, location.lon) > 0.0,
                e.partial.map(|p| p.0),
                e.partial.map(|p| p.1),
            ),
        };
        let (type_ne, type_en) = match (solar, etype) {
            (true, "total") => ("पूर्ण सूर्यग्रहण", "Total solar eclipse"),
            (true, "annular") => ("वलयाकार सूर्यग्रहण", "Annular solar eclipse"),
            (true, _) => ("आंशिक सूर्यग्रहण", "Partial solar eclipse"),
            (false, "total") => ("पूर्ण चन्द्रग्रहण", "Total lunar eclipse"),
            (false, _) => ("आंशिक चन्द्रग्रहण", "Partial lunar eclipse"),
        };
        let (max_utc, date_jd) = if let Some(max) = UtcInstant::from_jd_truncated(max_jd) {
            (max.to_string(), zone.local(max).day().to_jd_ut())
        } else {
            let max = JdInstant(max_jd);
            (max.to_string(), max.civil_fields(zone).day.to_jd_ut())
        };
        events.push(json!({
            "kind": kind, "type": etype, "type_ne": type_ne, "type_en": type_en,
            "max_utc": max_utc, "max_local": local_iso(max_jd),
            "date_jd": date_jd, "visible": visible,
            "begin_local": local(begin), "end_local": local(end),
            "penumbral_begin_local": null, "penumbral_end_local": null,
        }));
        cursor = max_jd + 10.0;
    }
    json!({
        "kind": kind, "range_start_jd": jd_start, "range_end_jd": jd_end,
        "location": location.as_json(), "events": events,
    })
}
