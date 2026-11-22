//! `GET /panchanga/at-time`: the udaya day state with the moving angas, grahas and
//! lagna re-read at a moment (`services/panchanga/panchanga_at_time.py`,
//! `app/instant_resolver.py`, `engine/panchanga/at_time.py`).

use std::time::{SystemTime, UNIX_EPOCH};

use astronomy::engine::is_nepal_observer;
use panchanga::{
    at_time::{InstantBlocks, day_lagna_spans, instant_blocks, vedic_day, vedic_day_jd},
    daily::Location,
    payload::{Field, Fields},
};
use serde_json::{Map, Value, json};
use timescale::{
    Calendar, CivilDay, GREGORIAN_CUTOVER_JD, JdInstant, LocalDateTime, PyInstant, UtcInstant,
    Zone, julday, revjul,
};

use crate::{
    date_key::{py_int, py_repr_str},
    day::{
        DayBuildOptions, DayError, DayVariant, DetailMode, FestivalMode, SlimMode,
        day_fields_for_jd_with,
    },
    midnight::object_fields,
};

/// The `Cache-Control` / `CDN-Cache-Control` of the route (`AT_TIME_PANCHANGA_CACHE_CONTROL`).
pub const CACHE_CONTROL: &str = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

/// How a request named its moment (`instant_for_request`).
#[derive(Debug, Clone, Copy, Default)]
pub struct InstantQuery<'a> {
    /// `?datetime=`: an ISO instant, naive values in the observer's zone.
    pub datetime: Option<&'a str>,
    /// The civil-day Julian Day: `?jd=`, or the era middleware's parts.
    pub jd: Option<f64>,
    /// `?clock=`: observer-local `HH:MM[:SS]` on the day `jd` names.
    pub clock: Option<&'a str>,
}

/// The zone an observer's wall clock is read in (`resolve_observer_timezone`):
/// Asia/Kathmandu for coordinates inside Nepal, whatever the stored label.
/// The zone an observer's moments are read in (Kathmandu inside Nepal).
#[must_use]
pub fn observer_zone(location: &Location) -> Zone {
    if is_nepal_observer(location.lat, location.lon) {
        Zone::kathmandu()
    } else {
        location.zone.clone()
    }
}

fn now_utc() -> UtcInstant {
    let micros = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| i64::try_from(d.as_micros()).unwrap_or(0));
    UtcInstant::from_utc(CivilDay::new(1970, 1, 1), 0, 0, 0, 0)
        .map_or_else(unreachable_epoch, |epoch| epoch.add_micros(micros))
}

#[expect(clippy::panic, reason = "1970-01-01 is always a valid UTC instant")]
fn unreachable_epoch() -> UtcInstant {
    panic!("the Unix epoch is in range")
}

fn int_literal(part: &str) -> Result<u32, DayError> {
    let bad = || {
        DayError::BadRequest(format!(
            "invalid literal for int() with base 10: {}",
            py_repr_str(part)
        ))
    };
    let value = py_int(part).ok_or_else(bad)?;
    // Out-of-range values fail `time()`; negative ones there too.
    Ok(u32::try_from(value).unwrap_or(u32::MAX))
}

/// `parse_clock_on_date`: `HH:MM[:SS]` on `day` in `zone`.
/// `HH:MM[:SS]` as `parse_clock_on_date` reads it (`int()` of each part, then `time()`).
fn clock_parts(clock: &str) -> Result<(u32, u32, u32), DayError> {
    let parts: Vec<&str> = clock.trim().split(':').collect();
    if parts.len() < 2 {
        return Err(DayError::BadRequest(
            "clock must be HH:MM or HH:MM:SS".into(),
        ));
    }
    let hour = int_literal(parts[0])?;
    let minute = int_literal(parts[1])?;
    let second = match parts.get(2) {
        Some(p) => int_literal(p)?,
        None => 0,
    };
    check_time(hour, minute, second, 0)?;
    Ok((hour, minute, second))
}

fn clock_on_day(clock: &str, day: CivilDay, zone: &Zone) -> Result<UtcInstant, DayError> {
    let (hour, minute, second) = clock_parts(clock)?;
    if !day.is_datetime_range() {
        return Err(DayError::NotPorted(
            "at-time moments before 1582-10-15 are not ported to the Rust server yet".into(),
        ));
    }
    zone.local_to_utc(day, hour, minute, second, 0)
        .ok_or_else(|| DayError::BadRequest(format!("{day} is outside the time zone database")))
}

fn check_time(hour: u32, minute: u32, second: u32, micro: u32) -> Result<(), DayError> {
    let fail = |m: &str| Err(DayError::BadRequest(m.to_owned()));
    if hour > 23 {
        return fail("hour must be in 0..23");
    }
    if minute > 59 {
        return fail("minute must be in 0..59");
    }
    if second > 59 {
        return fail("second must be in 0..59");
    }
    if micro > 999_999 {
        return fail("microsecond must be in 0..999999");
    }
    Ok(())
}

/// Exactly `n` ASCII digits.
fn digits(text: &str, n: usize) -> Option<u32> {
    (text.len() == n && text.bytes().all(|b| b.is_ascii_digit()))
        .then(|| text.parse().ok())
        .flatten()
}

/// `HH[:MM[:SS[.fff[fff]]]]` as Python 3.10's `fromisoformat` reads a time.
fn iso_time(text: &str) -> Option<(u32, u32, u32, u32)> {
    let (clock, frac) = match text.split_once('.') {
        Some((c, f)) => (c, Some(f)),
        None => (text, None),
    };
    let fields: Vec<&str> = clock.split(':').collect();
    if fields.is_empty() || fields.len() > 3 || (frac.is_some() && fields.len() != 3) {
        return None;
    }
    let hour = digits(fields[0], 2)?;
    let minute = fields.get(1).map_or(Some(0), |f| digits(f, 2))?;
    let second = fields.get(2).map_or(Some(0), |f| digits(f, 2))?;
    let micro = match frac {
        None => 0,
        Some(f) if f.len() == 3 => digits(f, 3)? * 1000,
        Some(f) if f.len() == 6 => digits(f, 6)?,
        Some(_) => return None,
    };
    Some((hour, minute, second, micro))
}

/// A parsed `fromisoformat` value: wall clock plus an optional UTC offset in seconds.
struct IsoDateTime {
    day: CivilDay,
    time: (u32, u32, u32, u32),
    offset: Option<i64>,
}

/// Python 3.10 `datetime.fromisoformat` (the formats `isoformat()` writes).
fn from_isoformat(text: &str) -> Result<IsoDateTime, DayError> {
    let invalid =
        || DayError::BadRequest(format!("Invalid isoformat string: {}", py_repr_str(text)));
    let date = text.get(..10).ok_or_else(invalid)?;
    let (year_digits, month_digits, day_digits) = (
        digits(date.get(..4).ok_or_else(invalid)?, 4),
        digits(date.get(5..7).ok_or_else(invalid)?, 2),
        digits(date.get(8..10).ok_or_else(invalid)?, 2),
    );
    if date.as_bytes().get(4) != Some(&b'-') || date.as_bytes().get(7) != Some(&b'-') {
        return Err(invalid());
    }
    let (Some(year), Some(month), Some(dd)) = (year_digits, month_digits, day_digits) else {
        return Err(invalid());
    };
    let rest = text.get(10..).ok_or_else(invalid)?;
    let (time, offset) = if rest.is_empty() {
        ((0, 0, 0, 0), None)
    } else {
        let mut chars = rest.chars();
        chars.next();
        let body = chars.as_str();
        let split = body.find(['+', '-']);
        let (clock, tz) = match split {
            Some(i) => (&body[..i], Some(&body[i..])),
            None => (body, None),
        };
        let time = iso_time(clock).ok_or_else(invalid)?;
        let offset = match tz {
            None => None,
            Some(tz) => {
                let sign = if tz.starts_with('-') { -1 } else { 1 };
                let (h, mi, s, us) = iso_time(&tz[1..]).ok_or_else(invalid)?;
                if !tz[1..].contains(':') || us != 0 {
                    return Err(invalid());
                }
                Some(sign * i64::from(h * 3600 + mi * 60 + s))
            }
        };
        (time, offset)
    };
    if year == 0 {
        return Err(DayError::BadRequest(format!("year {year} is out of range")));
    }
    if !(1..=12).contains(&month) {
        return Err(DayError::BadRequest("month must be in 1..12".into()));
    }
    let day = CivilDay::new(i32::try_from(year).map_err(|_| invalid())?, month, dd);
    if dd == 0 || !day.is_valid_gregorian() {
        return Err(DayError::BadRequest("day is out of range for month".into()));
    }
    check_time(time.0, time.1, time.2, time.3)?;
    Ok(IsoDateTime { day, time, offset })
}

/// `_EXPANDED_ISO_RE` (a prefix match): `[-]Y{1,8}-MM-DD[T ]HH:MM[:SS[.f+]]`.
struct ExpandedIso {
    year: i64,
    month: u32,
    day: u32,
    hour: f64,
}

fn expanded_iso(text: &str) -> Option<ExpandedIso> {
    let (negative, body) = match text.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, text),
    };
    let year_len = body.bytes().take_while(u8::is_ascii_digit).count();
    if !(1..=8).contains(&year_len) {
        return None;
    }
    let year: i64 = body[..year_len].parse().ok()?;
    let rest = &body.as_bytes()[year_len..];
    let two = |i: usize| -> Option<u32> {
        let pair = rest.get(i..i + 2)?;
        pair.iter()
            .all(u8::is_ascii_digit)
            .then(|| u32::from(pair[0] - b'0') * 10 + u32::from(pair[1] - b'0'))
    };
    if rest.first() != Some(&b'-') || rest.get(3) != Some(&b'-') {
        return None;
    }
    let (month, day) = (two(1)?, two(4)?);
    if !matches!(rest.get(6), Some(b'T' | b' ')) || rest.get(9) != Some(&b':') {
        return None;
    }
    let (h, mi) = (two(7)?, two(10)?);
    let mut second = 0.0;
    if rest.get(12) == Some(&b':') {
        if let Some(sec) = two(13) {
            let tail = &rest[15..];
            let frac_len = if tail.first() == Some(&b'.') {
                1 + tail[1..].iter().take_while(|b| b.is_ascii_digit()).count()
            } else {
                0
            };
            let frac_len = if frac_len == 1 { 0 } else { frac_len };
            let text = std::str::from_utf8(&rest[13..15 + frac_len]).ok()?;
            second = text.parse().unwrap_or(f64::from(sec));
        }
    }
    Some(ExpandedIso {
        year: if negative { -year } else { year },
        month,
        day,
        hour: f64::from(h) + f64::from(mi) / 60.0 + second / 3600.0,
    })
}

/// Whether the month and day exist in `year` (Gregorian from 1582-10-15, Julian before,
/// both proleptic; astronomical year numbering, so year 0 is a leap year).
fn real_date(year: i64, month: u32, day: u32) -> bool {
    if !(1..=12).contains(&month) || day < 1 {
        return false;
    }
    let gregorian = (year, month, day) >= (1582, 10, 15);
    let leap = if gregorian {
        year.rem_euclid(4) == 0 && (year.rem_euclid(100) != 0 || year.rem_euclid(400) == 0)
    } else {
        year.rem_euclid(4) == 0
    };
    let length = match month {
        2 if leap => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    };
    day <= length
}

/// `date_if_supported(y, m, d) is not None`.
fn date_supported(year: i64, month: u32, day: u32) -> bool {
    i32::try_from(year).is_ok_and(|y| CivilDay::new(y, month, day).is_datetime_range())
}

/// The `UtInstant` branch of `parse_query_datetime`: an expanded ISO text whose date
/// `datetime` cannot hold (month 13, Feb 30, …) is read as **UTC**, rolled over the way
/// `swe.julday` rolls it, shifted by the label zone's reference offset and truncated to
/// the second, then re-read as a naive wall clock in the observer zone.
fn rolled_over_wall(
    ex: &ExpandedIso,
    label_zone: &Zone,
    zone: &Zone,
) -> Result<UtcInstant, DayError> {
    let not_ported = || {
        DayError::NotPorted(
            "at-time moments before 1 CE are not ported to the Rust server yet".into(),
        )
    };
    let year = i32::try_from(ex.year).map_err(|_| not_ported())?;
    if year <= 0 {
        // Python reads the text as UTC, re-reads its zone wall clock as UTC again
        // and hands that to `datetime.fromisoformat`, which rejects the year.
        let day = CivilDay::new(year, ex.month, ex.day);
        let first = JdInstant(julday(year, ex.month, ex.day, ex.hour, day.calendar()));
        let again =
            JdInstant::parse_expanded(&first.wall(label_zone).iso).ok_or_else(not_ported)?;
        return Err(DayError::BadRequest(format!(
            "Invalid isoformat string: {}",
            py_repr_str(&again.to_string())
        )));
    }
    let cal = if (year, ex.month, ex.day) >= (1582, 10, 15) {
        Calendar::Gregorian
    } else {
        Calendar::Julian
    };
    let jd = julday(year, ex.month, ex.day, ex.hour, cal);
    let local_jd = jd + f64::from(label_zone.reference_offset_seconds()) / 86_400.0;
    let local_cal = if local_jd >= GREGORIAN_CUTOVER_JD {
        Calendar::Gregorian
    } else {
        Calendar::Julian
    };
    let (y, m, d, hour) = revjul(local_jd, local_cal);
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "Python's int() of hours/minutes/seconds in 0..24 / 0..60"
    )]
    let (h, mi, sec) = {
        let h = hour.trunc();
        let minutes = (hour - h) * 60.0;
        let mi = minutes.trunc();
        let sec = ((minutes - mi) * 60.0).trunc();
        (h as u32, mi as u32, sec as u32)
    };
    let day = CivilDay::new(y, m, d);
    if !day.is_datetime_range() {
        return Err(not_ported());
    }
    zone.local_to_utc(day, h, mi, sec, 0).ok_or_else(not_ported)
}

/// `parse_query_datetime`: naive values in `zone`; aware ones converted to it.
fn parse_datetime(
    raw: Option<&str>,
    label_zone: &Zone,
    zone: &Zone,
) -> Result<UtcInstant, DayError> {
    let Some(raw) = raw.filter(|r| !r.is_empty()) else {
        return Ok(now_utc());
    };
    let mut text = raw.trim().to_owned();
    if let Some(head) = text.strip_suffix('Z') {
        text = format!("{head}+00:00");
    }
    let replaced = text.replace('Z', "+00:00");
    if replaced.starts_with("jd:") {
        return Err(DayError::NotPorted(
            "jd: datetimes are not ported to the Rust server yet".into(),
        ));
    }
    let parsed = match expanded_iso(&replaced) {
        // A date that does not exist (month 13, 30 February) is a bad request. Python
        // read it as UTC and rolled it over into the next month's real date.
        Some(ex) if !real_date(ex.year, ex.month, ex.day) => {
            return Err(from_isoformat(&replaced)
                .or_else(|_| from_isoformat(&text))
                .err()
                .unwrap_or_else(|| {
                    DayError::BadRequest(format!(
                        "Invalid isoformat string: {}",
                        py_repr_str(&text)
                    ))
                }));
        }
        Some(ex) if !date_supported(ex.year, ex.month, ex.day) => {
            return rolled_over_wall(&ex, label_zone, zone);
        }
        Some(_) => from_isoformat(&replaced).or_else(|_| from_isoformat(&text))?,
        None => from_isoformat(&text)?,
    };
    let invalid =
        || DayError::BadRequest(format!("Invalid isoformat string: {}", py_repr_str(&text)));
    let (h, mi, s, us) = parsed.time;
    match parsed.offset {
        None => zone
            .local_to_utc(parsed.day, h, mi, s, us)
            .ok_or_else(invalid),
        Some(offset) => UtcInstant::from_utc(parsed.day, h, mi, s, us)
            .map(|wall| wall.add_seconds(-offset))
            .ok_or_else(invalid),
    }
}

/// A saved profile's birth moment, as the query names it.
#[derive(Debug, Clone, Copy, Default)]
pub struct BirthQuery<'a> {
    /// `birth=YYYY-MM-DDTHH:MM`: the older Gregorian civil datetime.
    pub birth: Option<&'a str>,
    /// `birth_tz`.
    pub birth_tz: &'a str,
    /// `birth_era` of the parts (`ad` when absent).
    pub birth_era: Option<&'a str>,
    /// `birth_year`.
    pub birth_year: Option<i64>,
    /// `birth_month`.
    pub birth_month: Option<i64>,
    /// `birth_day`.
    pub birth_day: Option<i64>,
    /// `birth_clock`, observer-local `HH:MM[:SS]`.
    pub birth_clock: Option<&'a str>,
}

/// A birth moment as Python holds it: the instant, plus the wall clock and zone of
/// the aware `datetime` (parts are read in the birth zone; `birth=` lands in UTC).
/// Dasha boundaries are wall-clock arithmetic in that zone.
#[derive(Debug, Clone)]
pub struct BirthMoment {
    /// The moment itself.
    pub utc: UtcInstant,
    /// Its wall clock in [`BirthMoment::zone`], held as a naive `UtcInstant`.
    pub wall: UtcInstant,
    /// The `tzinfo` the Python `datetime` carries.
    pub zone: Zone,
}

/// `resolve_observer_timezone(name, lat=, lon=)`: Kathmandu inside Nepal, else the name.
fn resolve_observer_zone(name: &str, coords: Option<(f64, f64)>) -> Result<Zone, DayError> {
    if coords.is_some_and(|(lat, lon)| is_nepal_observer(lat, lon)) {
        return Ok(Zone::kathmandu());
    }
    let name = if name.is_empty() {
        "Asia/Kathmandu"
    } else {
        name
    };
    Zone::get(name).map_err(|_| DayError::BadRequest(format!("Unknown observer timezone: {name}")))
}

/// `birth_instant_from_query`: era parts (read in the birth zone, `12:00` when no
/// clock) win over a Gregorian `birth=` ISO datetime. `coords` are the birth
/// latitude and longitude when the route has them (they make a Nepal birth read in
/// Asia/Kathmandu whatever `birth_tz` says).
///
/// # Errors
///
/// Python's `ValueError` text as [`DayError::BadRequest`], or
/// [`DayError::NotPorted`] for moments before 1582-10-15.
pub fn birth_instant(
    query: &BirthQuery<'_>,
    coords: Option<(f64, f64)>,
) -> Result<BirthMoment, DayError> {
    let mut clock = query.birth_clock.filter(|c| !c.is_empty());
    if clock.is_none()
        && let Some((_, tail)) = query.birth.and_then(|b| b.split_once('T'))
    {
        clock = Some(tail);
    }
    if let (Some(year), Some(month), Some(day)) =
        (query.birth_year, query.birth_month, query.birth_day)
    {
        let era = query.birth_era.filter(|e| !e.is_empty()).unwrap_or("ad");
        let jd = crate::date_key::to_jd(era, year, Some(month), Some(day))
            .map_err(DayError::BadRequest)?;
        let zone = resolve_observer_zone(query.birth_tz, coords)?;
        let civil = CivilDay::from_jd_ut(jd);
        let clock = clock.filter(|c| !c.is_empty()).unwrap_or("12:00");
        let (hour, minute, second) = clock_parts(clock)?;
        let utc = clock_on_day(clock, civil, &zone)?;
        let wall = UtcInstant::from_utc(civil, hour, minute, second, 0).ok_or_else(|| {
            DayError::NotPorted("birth moments before 1582-10-15 are not ported yet".into())
        })?;
        return Ok(BirthMoment { utc, wall, zone });
    }
    if let Some(raw) = query.birth.filter(|b| !b.is_empty()) {
        let zone = resolve_observer_zone(query.birth_tz, None)?;
        let parsed = from_isoformat(raw)?;
        let invalid =
            || DayError::BadRequest(format!("Invalid isoformat string: {}", py_repr_str(raw)));
        let (h, mi, s, us) = parsed.time;
        let utc = match parsed.offset {
            None => zone.local_to_utc(parsed.day, h, mi, s, us),
            Some(offset) => {
                UtcInstant::from_utc(parsed.day, h, mi, s, us).map(|w| w.add_seconds(-offset))
            }
        }
        .ok_or_else(invalid)?;
        let utc_zone = Zone::get("UTC").map_err(|e| DayError::BadRequest(e.to_string()))?;
        return Ok(BirthMoment {
            utc,
            wall: utc,
            zone: utc_zone,
        });
    }
    Err(DayError::BadRequest(
        "Provide birth_era + birth_year/month/day + birth_clock, or a birth datetime.".into(),
    ))
}

/// The Julian Day of a birth moment, for routes that need only the instant. Era parts
/// on a day before 1582-10-15 name a Julian Day instant (`local_wall_instant` in the
/// `birth_tz` zone's modern offset); everything else is [`birth_instant`].
///
/// # Errors
///
/// As [`birth_instant`].
pub fn birth_jd(query: &BirthQuery<'_>, coords: Option<(f64, f64)>) -> Result<f64, DayError> {
    if let (Some(year), Some(month), Some(day)) =
        (query.birth_year, query.birth_month, query.birth_day)
    {
        let era = query.birth_era.filter(|e| !e.is_empty()).unwrap_or("ad");
        let jd = crate::date_key::to_jd(era, year, Some(month), Some(day))
            .map_err(DayError::BadRequest)?;
        let civil = CivilDay::from_jd_ut(jd);
        if !civil.is_datetime_range() {
            let mut clock = query.birth_clock.filter(|c| !c.is_empty());
            if clock.is_none()
                && let Some((_, tail)) = query.birth.and_then(|b| b.split_once('T'))
            {
                clock = Some(tail);
            }
            let (hour, minute, second) = clock_parts(clock.unwrap_or("12:00"))?;
            let name = if query.birth_tz.is_empty() {
                "Asia/Kathmandu"
            } else {
                query.birth_tz
            };
            let zone = Zone::get(name)
                .map_err(|_| DayError::BadRequest(format!("Unknown observer timezone: {name}")))?;
            return Ok(local_wall_jd(civil, hour, minute, second, &zone).0);
        }
    }
    birth_instant(query, coords).map(|m| m.utc.to_jd())
}

/// `datetime.fromisoformat(text)` (Python 3.10): the instant and its UTC offset in
/// seconds; a naive value is read as UTC (offset 0).
///
/// # Errors
///
/// Python's `Invalid isoformat string: '…'` as [`DayError::BadRequest`].
pub fn parse_iso_aware(text: &str) -> Result<(UtcInstant, i64), DayError> {
    let parsed = from_isoformat(text)?;
    let invalid =
        || DayError::BadRequest(format!("Invalid isoformat string: {}", py_repr_str(text)));
    let (h, mi, s, us) = parsed.time;
    let wall = UtcInstant::from_utc(parsed.day, h, mi, s, us).ok_or_else(invalid)?;
    let offset = parsed.offset.unwrap_or(0);
    Ok((wall.add_seconds(-offset), offset))
}

/// `instant.isoformat()` of a resolved request instant: its wall clock in the zone the
/// observer is read in.
#[must_use]
pub fn observer_iso(instant: UtcInstant, location: &Location) -> String {
    observer_zone(location).local(instant).to_string()
}

/// `instant_at`: `jd` + `clock` wins over `datetime`.
///
/// # Errors
///
/// Python's `ValueError` text (a 400), or [`DayError::NotPorted`] for pre-1582 moments.
pub fn resolve_instant(
    query: InstantQuery<'_>,
    location: &Location,
) -> Result<UtcInstant, DayError> {
    let zone = observer_zone(location);
    if let Some(jd) = query.jd {
        let Some(clock) = query.clock.filter(|c| !c.is_empty()) else {
            return Err(DayError::BadRequest(
                "a Julian Day or calendar date needs a clock (observer-local HH:MM) to name a moment"
                    .into(),
            ));
        };
        return clock_on_day(clock, CivilDay::from_jd_ut(jd), &zone);
    }
    parse_datetime(query.datetime, &location.zone, &zone)
}

/// A resolved at-time moment: a `datetime`, or a Julian Day instant for a day
/// `datetime` cannot hold (Python's `UtInstant`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AtInstant {
    /// 1582-10-15 on.
    Utc(UtcInstant),
    /// Before 1582-10-15, and BCE.
    Jd(JdInstant),
}

/// `local_wall_instant`: a wall clock on a civil day in the zone's modern offset.
fn local_wall_jd(day: CivilDay, hour: u32, minute: u32, second: u32, zone: &Zone) -> JdInstant {
    let offset_hours = f64::from(zone.reference_offset_seconds()) / 3600.0;
    let hour_ut =
        f64::from(hour) + f64::from(minute) / 60.0 + f64::from(second) / 3600.0 - offset_hours;
    JdInstant(julday(
        day.year,
        day.month,
        day.day,
        hour_ut,
        day.calendar(),
    ))
}

/// [`resolve_instant`] for every day: `jd` + `clock` on a day before 1582-10-15
/// names a Julian Day instant (`parse_clock_on_date` → `local_wall_instant`).
///
/// # Errors
///
/// As [`resolve_instant`].
pub fn resolve_instant_any(
    query: InstantQuery<'_>,
    location: &Location,
) -> Result<AtInstant, DayError> {
    if let Some(jd) = query.jd {
        let civil = CivilDay::from_jd_ut(jd);
        if !civil.is_datetime_range() {
            let Some(clock) = query.clock.filter(|c| !c.is_empty()) else {
                return resolve_instant(query, location).map(AtInstant::Utc);
            };
            let (hour, minute, second) = clock_parts(clock)?;
            return Ok(AtInstant::Jd(local_wall_jd(
                civil,
                hour,
                minute,
                second,
                &location.zone,
            )));
        }
    }
    resolve_instant(query, location).map(AtInstant::Utc)
}

/// `parse_local_wall_iso` of a Julian Day window bound (`YYYY-MM-DDTHH:MM:SS`, no offset).
fn wall_bound(text: &str, zone: &Zone) -> Option<JdInstant> {
    let ex = expanded_iso(text)?;
    let fields: Vec<&str> = text.split(['T', ' ']).nth(1)?.split(':').collect();
    let hour: u32 = fields.first()?.parse().ok()?;
    let minute: u32 = fields.get(1)?.parse().ok()?;
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "int(float(second))"
    )]
    let second = fields
        .get(2)
        .map_or(Some(0), |f| f.parse::<f64>().ok().map(|v| v as u32))?;
    let day = CivilDay::new(i32::try_from(ex.year).ok()?, ex.month, ex.day);
    Some(local_wall_jd(day, hour, minute, second, zone))
}

/// `compute_muhurta_now` for a Julian Day instant: each window's `start_local` /
/// `end_local` is read back as a wall clock (`parse_local_wall_iso`).
fn muhurta_now_jd(muhurta: &Map<String, Value>, instant: JdInstant, zone: &Zone) -> Value {
    let mut now = Map::new();
    for key in ["rahu_kalam", "yamaganda", "gulika", "abhijit"] {
        let value = match muhurta.get(key) {
            Some(Value::Object(block)) if !block.is_empty() => {
                let mut block = block.clone();
                let active = match (
                    block
                        .get("start_local")
                        .and_then(Value::as_str)
                        .and_then(|t| wall_bound(t, zone)),
                    block
                        .get("end_local")
                        .and_then(Value::as_str)
                        .and_then(|t| wall_bound(t, zone)),
                ) {
                    (Some(start), Some(end)) => start <= instant && instant < end,
                    _ => false,
                };
                block.insert("active".into(), json!(active));
                Value::Object(block)
            }
            _ => Value::Null,
        };
        now.insert(key.into(), value);
    }
    Value::Object(now)
}

/// `build_panchanga_at_time` for a Julian Day instant. Python's duck-typed reads of a
/// `UtInstant` are kept: `planets_anchor.local_time`, `query_instant`,
/// `query_instant_local` and `before_sunrise_of_civil_day` read its UTC clock.
///
/// # Errors
///
/// [`DayError`] when the day state cannot be built (polar sun, off the patro axis).
pub fn at_time_payload_jd(instant: JdInstant, location: &Location) -> Result<Value, DayError> {
    at_time_fields_jd(instant, location).map(|f| f.to_value())
}

/// [`at_time_payload_jd`] as typed fields.
///
/// # Errors
///
/// As [`at_time_payload_jd`].
pub fn at_time_fields_jd(instant: JdInstant, location: &Location) -> Result<Fields, DayError> {
    let zone = &location.zone;
    let utc_clock = instant.astimezone(zone);
    let day = vedic_day_jd(instant, location)?;
    let blocks = instant_blocks(instant, &day, location);
    let lagna_spans = day_lagna_spans(&day, location);
    let state = day_fields_for_jd_with(
        day.anchor.to_jd_ut(),
        location,
        DayBuildOptions {
            detail: DetailMode::Include,
            slim: SlimMode::Keep,
            festivals: FestivalMode::Exclude,
        },
        DayVariant::default(),
    )?;
    let overlay = InstantOverlay {
        blocks,
        query_instant: instant.to_string(),
        query_instant_local: format!("{} {}", utc_clock.day, utc_clock.hms),
        local_hm: utc_clock.hm.clone(),
        anchor: day.anchor,
        before_sunrise: utc_clock.day > day.anchor,
        lagna_spans: Some(Field::tree(lagna_spans)),
    };
    Ok(instant_fields(state, overlay, |muhurta| {
        muhurta_now_jd(muhurta, instant, zone)
    }))
}

/// What `build_panchanga_at_time` lays over the udaya day state.
struct InstantOverlay {
    blocks: InstantBlocks,
    query_instant: String,
    query_instant_local: String,
    local_hm: String,
    anchor: CivilDay,
    before_sunrise: bool,
    /// The day's lagna spans; `None` keeps the ones already in its detail.
    lagna_spans: Option<Field>,
}

/// The day state with the instant laid over it: the day's own blocks stay shared,
/// only the overlaid fields are new.
fn instant_fields(
    mut state: Fields,
    o: InstantOverlay,
    muhurta_now: impl FnOnce(&Map<String, Value>) -> Value,
) -> Fields {
    let mut detail = object_fields(state.field("detail"));
    let muhurta: Map<String, Value> = match detail.field("muhurta") {
        // The typed block hands over just the keys this reads.
        Some(field) => match field.typed_as::<panchanga::Muhurta>() {
            Some(block) => block.instant_keys(),
            None => match field.as_tree().as_ref() {
                Value::Object(daily) => MUHURTA_KEYS
                    .iter()
                    .filter_map(|k| daily.get(*k).map(|v| ((*k).to_owned(), v.clone())))
                    .collect(),
                _ => Map::new(),
            },
        },
        None => Map::new(),
    };
    let now = Field::tree(muhurta_now(&muhurta));
    let planets_anchor = Field::tree(json!({
        "type": "instant",
        "local_time": o.local_hm,
        "label_ne": "क्षणिक स्पष्टग्रह",
        "label_en": "Instantaneous positions",
    }));
    let lagna_spans = o.lagna_spans.unwrap_or_else(|| {
        detail
            .field("lagna_spans")
            .cloned()
            .unwrap_or_else(|| Field::tree(Value::Null))
    });
    let InstantBlocks {
        tithi,
        nakshatra,
        yoga,
        karana,
        planets,
        lagna,
        upagrahas,
        ..
    } = o.blocks;
    let planets = Field::tree(planets);
    detail.insert("planets", planets.clone());
    detail.insert("planets_anchor", planets_anchor.clone());
    detail.insert("muhurta_now", now.clone());
    detail.insert_tree("instant_lagna", lagna.clone());
    detail.insert("lagna_spans", lagna_spans.clone());
    detail.insert_tree("upagrahas", upagrahas);
    let state_text = |key: &str| {
        state
            .get(key)
            .map_or(Value::Null, std::borrow::Cow::into_owned)
    };
    let lagna_name = lagna
        .get("name")
        .cloned()
        .unwrap_or_else(|| state_text("lagna"));
    let lagna_ne = lagna
        .get("name_ne")
        .cloned()
        .unwrap_or_else(|| state_text("lagna_ne"));
    for (key, value) in [
        ("mode", json!("ephemeris")),
        ("anchor", json!("instant")),
        ("query_instant", json!(o.query_instant)),
        ("query_instant_local", json!(o.query_instant_local)),
        ("panchanga_date_ad", json!(o.anchor.to_string())),
        ("before_sunrise_of_civil_day", json!(o.before_sunrise)),
    ] {
        state.insert_tree(key, value);
    }
    state.insert("lagna_spans", lagna_spans);
    for (key, value) in [
        ("tithi", tithi),
        ("nakshatra", nakshatra),
        ("yoga", yoga),
        ("karana", karana),
        ("lagna", lagna_name),
        ("lagna_ne", lagna_ne),
        ("muhurta", Value::Object(muhurta)),
    ] {
        state.insert_tree(key, value);
    }
    state.insert("planets", planets);
    state.insert("planets_anchor", planets_anchor);
    state.insert("muhurta_now", now);
    state.insert("detail", Field::Nested(std::sync::Arc::new(detail)));
    state
}

const MUHURTA_KEYS: [&str; 6] = [
    "hora_duration_minutes",
    "muhurta_duration_minutes",
    "rahu_kalam",
    "yamaganda",
    "gulika",
    "abhijit",
];

fn window_active(block: &Value, instant: UtcInstant) -> Option<bool> {
    let start: UtcInstant = block.get("start_utc")?.as_str()?.parse().ok()?;
    let end: UtcInstant = block.get("end_utc")?.as_str()?.parse().ok()?;
    Some(start <= instant && instant < end)
}

/// `compute_muhurta_now`: each window of the day's muhurta block, flagged `active`.
fn muhurta_now(muhurta: &Map<String, Value>, instant: UtcInstant) -> Value {
    let mut out = Map::new();
    for key in ["rahu_kalam", "yamaganda", "gulika", "abhijit"] {
        let value = match muhurta.get(key) {
            Some(Value::Object(block)) if !block.is_empty() => {
                let mut block = block.clone();
                let active = window_active(&Value::Object(block.clone()), instant).unwrap_or(false);
                block.insert("active".into(), json!(active));
                Value::Object(block)
            }
            _ => Value::Null,
        };
        out.insert(key.into(), value);
    }
    Value::Object(out)
}

/// `build_panchanga_at_time(parse_clock_on_date(clock, day, ...), location)`: the
/// at-time payload at an observer-local clock on a civil day.
///
/// # Errors
///
/// [`DayError::BadRequest`] for a bad clock, [`DayError::NotPorted`] before 1582-10-15.
pub fn at_time_on_day(day: CivilDay, clock: &str, location: &Location) -> Result<Fields, DayError> {
    let zone = observer_zone(location);
    if !day.is_datetime_range() {
        // `local_wall_instant`: the wall clock on the Julian Day axis.
        let (hour, minute, second) = clock_parts(clock)?;
        return at_time_fields_jd(local_wall_jd(day, hour, minute, second, &zone), location);
    }
    let instant = clock_on_day(clock, day, &zone)?;
    at_time_fields(instant, location)
}

/// `build_panchanga_at_time`.
///
/// # Errors
///
/// [`DayError`] when the day state cannot be built (polar sun, pre-1582 days).
pub fn at_time_payload(instant: UtcInstant, location: &Location) -> Result<Value, DayError> {
    at_time_fields(instant, location).map(|f| f.to_value())
}

/// [`at_time_payload`] as typed fields: the udaya day's blocks shared, the instant's
/// overlays new, written straight to text.
///
/// # Errors
///
/// As [`at_time_payload`].
pub fn at_time_fields(instant: UtcInstant, location: &Location) -> Result<Fields, DayError> {
    let zone = observer_zone(location);
    let local: LocalDateTime = zone.local(instant);
    let day = vedic_day(instant, location, &zone)?;
    let blocks = instant_blocks(instant, &day, location);
    let state = day_fields_for_jd_with(
        day.anchor.to_jd_ut(),
        location,
        DayBuildOptions {
            detail: DetailMode::Include,
            slim: SlimMode::Keep,
            festivals: FestivalMode::Plain,
        },
        DayVariant::default(),
    )?;
    let overlay = InstantOverlay {
        blocks,
        query_instant: local.to_string(),
        query_instant_local: format!("{} {}", local.day(), local.hms()),
        local_hm: local.hm(),
        anchor: day.anchor,
        before_sunrise: local.day() > day.anchor,
        lagna_spans: None,
    };
    Ok(instant_fields(state, overlay, |muhurta| {
        muhurta_now(muhurta, instant)
    }))
}
