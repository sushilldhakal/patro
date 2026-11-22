//! Gochar (planetary transit): the transit table at sunrise and the moments a graha
//! enters a new rashi, nakshatra or pada, turns वक्री/मार्गी, or rises/sets heliacally
//! (`engine/jyotish/gochar.py`, `engine/jyotish/udayast.py`).
//!
//! Every search is the Python one step for step: a coarse scan (3 h, or 2 h for
//! udaya/asta) then bisection on `datetime`s until the bracket is under one second
//! (`timedelta(hours=1/3600)`), with `timedelta / 2`
//! rounded half to even — so the reported instants agree to the microsecond.

use astronomy::{System, surya_siddhanta::Body};
use panchanga::{
    NAKSHATRA_NAMES, NAKSHATRA_NAMES_NE, RASHI_NAMES, RASHI_NAMES_NE,
    daily::{DailyError, Location, SunriseInstant},
    graha_positions, nepali_digits, py_min,
    pyfloat::{py_floordiv, py_int, py_mod, py_round, py_round_int, stable_round},
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, JdInstant, PyInstant, UtcInstant};

use crate::{Graha, dasha};

/// `NAKSHATRA_SPAN`.
const NAKSHATRA_SPAN: f64 = 360.0 / 27.0;
/// `PADA_SPAN` (3°20′).
const PADA_SPAN: f64 = NAKSHATRA_SPAN / 4.0;

/// `GRAHA_META`: (vedic name, Nepali name, symbol).
#[must_use]
pub const fn meta(graha: Graha) -> (&'static str, &'static str, &'static str) {
    match graha {
        Graha::Sun => ("Surya", "सूर्य", "☉"),
        Graha::Moon => ("Chandra", "चन्द्र", "☽"),
        Graha::Mars => ("Mangala", "मङ्गल", "♂"),
        Graha::Mercury => ("Budha", "बुध", "☿"),
        Graha::Jupiter => ("Brihaspati", "बृहस्पति", "♃"),
        Graha::Venus => ("Shukra", "शुक्र", "♀"),
        Graha::Saturn => ("Shani", "शनि", "♄"),
        Graha::Rahu => ("Rahu", "राहु", "☊"),
        Graha::Ketu => ("Ketu", "केतु", "☋"),
    }
}

/// `_RASHI_CHANGE_MAX_DAYS`.
const fn rashi_max_days(graha: Graha) -> f64 {
    match graha {
        Graha::Sun | Graha::Mercury | Graha::Venus => 35.0,
        Graha::Moon => 3.0,
        Graha::Mars => 80.0,
        Graha::Jupiter => 400.0,
        Graha::Saturn => 800.0,
        Graha::Rahu | Graha::Ketu => 200.0,
    }
}

/// `_NAKSHATRA_CHANGE_MAX_DAYS`.
const fn nakshatra_max_days(graha: Graha) -> f64 {
    match graha {
        Graha::Sun => 15.0,
        Graha::Moon => 1.5,
        Graha::Mars => 30.0,
        Graha::Mercury => 40.0,
        Graha::Venus => 12.0,
        Graha::Jupiter | Graha::Saturn | Graha::Rahu | Graha::Ketu => 45.0,
    }
}

/// `_PADA_CHANGE_MAX_DAYS`.
const fn pada_max_days(graha: Graha) -> f64 {
    match graha {
        Graha::Sun => 5.0,
        Graha::Moon => 0.5,
        Graha::Mars => 28.0,
        Graha::Mercury | Graha::Rahu | Graha::Ketu => 20.0,
        Graha::Jupiter => 25.0,
        Graha::Venus => 6.0,
        Graha::Saturn => 30.0,
    }
}

/// `_MOTION_PATRO_GRAHAS` and `UDAYAST_GRAHAS`.
const FIVE_PLANETS: [Graha; 5] = [
    Graha::Mars,
    Graha::Mercury,
    Graha::Jupiter,
    Graha::Venus,
    Graha::Saturn,
];

/// `SLOW_GRAHAS`.
pub const SLOW_GRAHAS: [Graha; 4] = [Graha::Jupiter, Graha::Saturn, Graha::Rahu, Graha::Ketu];

fn body(graha: Graha) -> Body {
    match graha {
        Graha::Sun => Body::Sun,
        Graha::Moon => Body::Moon,
        Graha::Mars => Body::Mars,
        Graha::Mercury => Body::Mercury,
        Graha::Jupiter => Body::Jupiter,
        Graha::Venus => Body::Venus,
        Graha::Saturn => Body::Saturn,
        Graha::Rahu | Graha::Ketu => Body::Rahu,
    }
}

/// `planet_service.position(jd, graha).longitude` (Ketu: the rounded Rahu + 180).
pub(crate) fn position_longitude(system: System, graha: Graha, jd: f64) -> f64 {
    let raw = py_mod(system.true_longitude_and_speed(body(graha), jd).0, 360.0);
    if graha == Graha::Ketu {
        stable_round(py_mod(raw + 180.0, 360.0))
    } else {
        stable_round(raw)
    }
}

/// `_longitude_for(graha, dt)`.
fn longitude_for<I: PyInstant>(system: System, graha: Graha, at: I) -> f64 {
    let jd = at.to_jd();
    if graha == Graha::Ketu {
        return py_mod(position_longitude(system, Graha::Rahu, jd) + 180.0, 360.0);
    }
    position_longitude(system, graha, jd)
}

/// `planet_service.speed(jd, graha)`.
fn speed_for<I: PyInstant>(system: System, graha: Graha, at: I) -> f64 {
    let speed = stable_round(system.true_longitude_and_speed(body(graha), at.to_jd()).1);
    if graha == Graha::Ketu { -speed } else { speed }
}

/// `motion.is_retrograde(graha, speed)`.
fn is_retrograde(graha: Graha, speed: f64) -> bool {
    match graha {
        Graha::Rahu | Graha::Ketu => true,
        Graha::Sun | Graha::Moon => false,
        _ => speed < 0.0,
    }
}

fn index(x: f64, span: f64, modulo: i64) -> i64 {
    py_int(x / span) % modulo
}

/// `_rashi_index_for`.
fn rashi_index<I: PyInstant>(system: System, graha: Graha, at: I) -> i64 {
    index(longitude_for(system, graha, at), 30.0, 12)
}

/// `_nakshatra_index_for`.
fn nakshatra_index<I: PyInstant>(system: System, graha: Graha, at: I) -> i64 {
    index(longitude_for(system, graha, at), NAKSHATRA_SPAN, 27)
}

/// `_pada_tuple_for`: (nakshatra 0–26, pada 1–4).
fn pada_tuple<I: PyInstant>(system: System, graha: Graha, at: I) -> (i64, i64) {
    let lon = longitude_for(system, graha, at);
    let nak = index(lon, NAKSHATRA_SPAN, 27);
    let pada = (py_int(py_mod(lon, NAKSHATRA_SPAN) / PADA_SPAN) + 1).min(4);
    (nak, pada)
}

/// `_pada_flat_for`: 0–107 across the ecliptic.
pub(crate) fn pada_flat<I: PyInstant>(system: System, graha: Graha, at: I) -> i64 {
    let (nak, pada) = pada_tuple(system, graha, at);
    nak * 4 + (pada - 1)
}

/// An upper bound on a graha's daily motion (degrees, either direction) on the
/// Surya Siddhanta engine, with a wide margin: the Moon peaks near 15.4°/day,
/// Mercury near 2.2, the nodes move about 0.053.
const fn max_daily_motion(graha: Graha) -> f64 {
    match graha {
        Graha::Sun => 1.5,
        Graha::Moon => 20.0,
        Graha::Mars => 1.2,
        Graha::Mercury => 3.0,
        Graha::Jupiter => 0.5,
        Graha::Venus => 2.0,
        Graha::Saturn | Graha::Rahu | Graha::Ketu => 0.3,
    }
}

/// Seconds during which a graha at `longitude` cannot reach a pada edge.
fn quiet_seconds(graha: Graha, longitude: f64) -> f64 {
    let into = py_mod(longitude, PADA_SPAN);
    // A hundredth of a degree off each edge, for the float rounding of the index.
    let room = into.min(PADA_SPAN - into) - 0.01;
    if room <= 0.0 {
        return 0.0;
    }
    room / max_daily_motion(graha) * 86_400.0
}

/// `_bisect_index_change`: when `get_index` first changes after `from`.
fn bisect_index_change<I: PyInstant>(
    system: System,
    graha: Graha,
    from: I,
    get_index: fn(System, Graha, I) -> i64,
    max_days: f64,
) -> Option<I> {
    let current = get_index(system, graha, from);
    let limit = from.add_days_f64(max_days);
    let (mut lo, mut hi) = (from, None);
    let mut cursor = from;
    // Grid points closer to `from` than the graha can travel to the nearest pada
    // edge (every rashi and nakshatra edge is one) cannot show a new index, so they
    // are stepped over unevaluated. The grid itself is unchanged, so the bracket and
    // the bisection, and with them the answer, are the ones the full scan finds.
    let quiet_seconds = quiet_seconds(graha, longitude_for(system, graha, from));
    while cursor < limit {
        let next = py_min(cursor.add_hours(3), limit);
        if next < limit && next.seconds_since(from) < quiet_seconds {
            cursor = next;
            continue;
        }
        if get_index(system, graha, next) != current {
            lo = cursor;
            hi = Some(next);
            break;
        }
        cursor = next;
    }
    let mut hi = hi?;
    for _ in 0..60 {
        if hi.seconds_since(lo) < 1.0 {
            break;
        }
        let mid = I::midpoint(lo, hi);
        if get_index(system, graha, mid) == current {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    (get_index(system, graha, hi) != current).then_some(hi)
}

/// What kind of moment an ingress entry marks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    /// Entry into a new rashi; `again` when re-entering one it occupied in the lookback.
    Rashi {
        /// From rashi (0-based).
        from: usize,
        /// To rashi (0-based).
        to: usize,
        /// पुनः.
        again: bool,
    },
    /// Entry into a new nakshatra.
    Nakshatra {
        /// From (0-based).
        from: usize,
        /// To (0-based).
        to: usize,
    },
    /// Entry into a new pada: (nakshatra 0-based, pada 1–4).
    Pada {
        /// From.
        from: (usize, usize),
        /// To.
        to: (usize, usize),
    },
    /// A वक्री / मार्गी station.
    Motion {
        /// Turned retrograde.
        retrograde: bool,
    },
    /// Heliacal rising or setting.
    Udayast {
        /// Becoming visible (उदय).
        visible: bool,
        /// East of the Sun (evening sky).
        east: bool,
        /// Retrograde at the moment.
        retrograde: bool,
    },
}

/// One ingress / station / udaya-asta moment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Ingress<I = UtcInstant> {
    /// The graha.
    pub graha: Graha,
    /// The moment (UTC).
    pub at: I,
    /// What happened.
    pub kind: Kind,
}

fn to_usize(i: i64) -> usize {
    usize::try_from(i).unwrap_or(0)
}

impl<I: PyInstant> Ingress<I> {
    /// The moment as Python reads it back from `entry_time_utc`
    /// (`parse_ephemeris_instant`): a Julian Day instant rounds to the microsecond.
    #[must_use]
    pub fn printed_at(&self) -> I {
        self.at.reparse()
    }

    /// The raw entry dict, in the Python key order.
    #[must_use]
    pub fn to_json(&self) -> Map<String, Value> {
        let (vedic, ne, _) = meta(self.graha);
        let mut m = Map::new();
        m.insert("graha".into(), json!(self.graha.key()));
        m.insert("graha_vedic".into(), json!(vedic));
        m.insert("graha_ne".into(), json!(ne));
        let mut put = |k: &str, v: Value| {
            m.insert(k.into(), v);
        };
        match self.kind {
            Kind::Rashi { from, to, again } => {
                put("level", json!("rashi"));
                put("from_rashi", json!(RASHI_NAMES[from]));
                put("from_rashi_ne", json!(RASHI_NAMES_NE[from]));
                put("to_rashi", json!(RASHI_NAMES[to]));
                put("to_rashi_ne", json!(RASHI_NAMES_NE[to]));
                let prefix = if again { "पुनः" } else { "" };
                put(
                    "label_ne",
                    json!(format!("{prefix}{}मा", RASHI_NAMES_NE[to])),
                );
            }
            Kind::Nakshatra { from, to } => {
                put("level", json!("nakshatra"));
                put("from_nakshatra", json!(NAKSHATRA_NAMES[from]));
                put("from_nakshatra_ne", json!(NAKSHATRA_NAMES_NE[from]));
                put("to_nakshatra", json!(NAKSHATRA_NAMES[to]));
                put("to_nakshatra_ne", json!(NAKSHATRA_NAMES_NE[to]));
                put("label_ne", json!(format!("{} मा", NAKSHATRA_NAMES_NE[to])));
            }
            Kind::Pada { from, to } => {
                put("level", json!("pada"));
                put("from_nakshatra", json!(NAKSHATRA_NAMES[from.0]));
                put("from_nakshatra_ne", json!(NAKSHATRA_NAMES_NE[from.0]));
                put("from_pada", json!(from.1));
                put("from_pada_ne", json!(nepali_digits(from.1)));
                put("to_nakshatra", json!(NAKSHATRA_NAMES[to.0]));
                put("to_nakshatra_ne", json!(NAKSHATRA_NAMES_NE[to.0]));
                put("to_pada", json!(to.1));
                put("to_pada_ne", json!(nepali_digits(to.1)));
                put(
                    "label_ne",
                    json!(format!(
                        "{} {} मा",
                        NAKSHATRA_NAMES_NE[to.0],
                        nepali_digits(to.1)
                    )),
                );
            }
            Kind::Motion { retrograde } => {
                put("level", json!("motion"));
                put("motion", json!(if retrograde { "Vakri" } else { "Margi" }));
                put("is_retrograde", json!(retrograde));
                put(
                    "label_ne",
                    json!(if retrograde {
                        "वक्री"
                    } else {
                        "मार्गी"
                    }),
                );
            }
            Kind::Udayast {
                visible,
                east,
                retrograde,
            } => {
                put("level", json!("udayast"));
                put("event", json!(if visible { "udaya" } else { "asta" }));
                put("hemisphere", json!(if east { "west" } else { "east" }));
                put("is_retrograde", json!(retrograde));
                put(
                    "motion_ne",
                    json!(if retrograde {
                        "वक्र"
                    } else {
                        "मार्गी"
                    }),
                );
                let dir = if east {
                    "पश्चिम"
                } else {
                    "पूर्व"
                };
                let event = if visible { "उदय" } else { "अस्त" };
                put("label_ne", json!(format!("{dir}मा {event}")));
            }
        }
        m.insert("entry_time_utc".into(), json!(self.at.to_string()));
        m
    }
}

/// `_rashi_again_prefix`: पुनः when the graha stood in `to` within the lookback.
fn rashi_again<I: PyInstant>(system: System, graha: Graha, from: I, to: i64) -> bool {
    #[expect(clippy::cast_possible_truncation, reason = "at most 120 days")]
    let lookback = rashi_max_days(graha).min(120.0) as i64;
    let mut cursor = from.add_seconds(-86_400);
    let end = from.add_seconds(-86_400 * lookback);
    while cursor >= end {
        if rashi_index(system, graha, cursor) == to {
            return true;
        }
        cursor = cursor.add_seconds(-86_400);
    }
    false
}

/// `find_next_rashi_entry`.
#[must_use]
pub fn next_rashi_entry<I: PyInstant>(system: System, graha: Graha, from: I) -> Option<Ingress<I>> {
    let current = rashi_index(system, graha, from);
    let at = bisect_index_change(system, graha, from, rashi_index, rashi_max_days(graha))?;
    let to = rashi_index(system, graha, at) % 12;
    Some(Ingress {
        graha,
        at,
        kind: Kind::Rashi {
            from: to_usize(current),
            to: to_usize(to),
            again: rashi_again(system, graha, from, to),
        },
    })
}

/// `find_next_nakshatra_entry`.
#[must_use]
pub fn next_nakshatra_entry<I: PyInstant>(
    system: System,
    graha: Graha,
    from: I,
) -> Option<Ingress<I>> {
    let current = nakshatra_index(system, graha, from);
    let at = bisect_index_change(
        system,
        graha,
        from,
        nakshatra_index,
        nakshatra_max_days(graha),
    )?;
    Some(Ingress {
        graha,
        at,
        kind: Kind::Nakshatra {
            from: to_usize(current),
            to: to_usize(nakshatra_index(system, graha, at)),
        },
    })
}

/// `find_next_pada_entry`.
#[must_use]
pub fn next_pada_entry<I: PyInstant>(system: System, graha: Graha, from: I) -> Option<Ingress<I>> {
    let (fnak, fpada) = pada_tuple(system, graha, from);
    let at = bisect_index_change(system, graha, from, pada_flat, pada_max_days(graha))?;
    let (tnak, tpada) = pada_tuple(system, graha, at);
    Some(Ingress {
        graha,
        at,
        kind: Kind::Pada {
            from: (to_usize(fnak), to_usize(fpada)),
            to: (to_usize(tnak), to_usize(tpada)),
        },
    })
}

/// `find_upcoming_rashi_entries`.
#[must_use]
pub fn upcoming_rashi_entries<I: PyInstant>(
    system: System,
    from: I,
    grahas: &[Graha],
    per_graha: usize,
) -> Vec<Ingress<I>> {
    let mut out = Vec::new();
    for &g in grahas {
        let mut cursor = from;
        for _ in 0..per_graha {
            let Some(entry) = next_rashi_entry(system, g, cursor) else {
                break;
            };
            out.push(entry);
            cursor = entry.printed_at().add_hours(1);
        }
    }
    sort_entries(&mut out);
    out
}

/// `_entry_sort_key`: the Julian Day of each entry's printed `entry_time_utc` (stable).
fn sort_entries<I: PyInstant>(entries: &mut [Ingress<I>]) {
    entries.sort_by(|a, b| {
        a.printed_at()
            .to_jd()
            .partial_cmp(&b.printed_at().to_jd())
            .unwrap_or(std::cmp::Ordering::Equal)
    });
}

fn retro_at<I: PyInstant>(system: System, graha: Graha, at: I) -> bool {
    is_retrograde(graha, speed_for(system, graha, at))
}

/// The stored stations of `graha` in `(from, until]`, as ingress entries.
fn station_events<I: PyInstant>(
    system: System,
    graha: Graha,
    from: I,
    until: I,
) -> Option<Vec<Ingress<I>>> {
    if matches!(graha, Graha::Sun | Graha::Moon | Graha::Rahu | Graha::Ketu) {
        // Never turn: the scan finds nothing either.
        return system.is_drik().then(Vec::new);
    }
    let stored = system.station_events(body(graha), from.to_jd(), until.to_jd())?;
    Some(
        stored
            .into_iter()
            .filter_map(|(jd, retrograde)| {
                let at = from.at_boundary(jd)?;
                (at <= until).then_some(Ingress {
                    graha,
                    at,
                    kind: Kind::Motion { retrograde },
                })
            })
            .collect(),
    )
}

/// `find_motion_stations_in_range` for `grahas`.
pub(crate) fn motion_stations<I: PyInstant>(
    system: System,
    from: I,
    until: I,
    grahas: &[Graha],
) -> Vec<Ingress<I>> {
    let mut events = Vec::new();
    for &g in grahas {
        // Drik reads the stored stations (they are the same events the scan below finds,
        // to a few hundredths of a second); the text, and a span the index does not
        // cover, are scanned.
        if let Some(stored) = station_events(system, g, from, until) {
            events.extend(stored);
            continue;
        }
        let mut cursor = from;
        let mut was = retro_at(system, g, cursor);
        while cursor < until {
            let probe = py_min(cursor.add_hours(3), until);
            let now = retro_at(system, g, probe);
            if now == was {
                cursor = probe;
                continue;
            }
            let (mut lo, mut hi) = (cursor, probe);
            for _ in 0..50 {
                if hi.seconds_since(lo) < 1.0 {
                    break;
                }
                let mid = I::midpoint(lo, hi);
                if retro_at(system, g, mid) == now {
                    hi = mid;
                } else {
                    lo = mid;
                }
            }
            if hi > until {
                break;
            }
            events.push(Ingress {
                graha: g,
                at: hi,
                kind: Kind::Motion { retrograde: now },
            });
            was = now;
            cursor = hi.add_seconds(90);
        }
    }
    sort_entries(&mut events);
    events
}

/// `combustion_threshold(graha, retrograde, east)`, the retrograde flag read from `speed`.
fn combustion_threshold(graha: Graha, speed: f64) -> f64 {
    let retrograde = is_retrograde(graha, speed);
    match graha {
        Graha::Mars => 17.0,
        Graha::Jupiter => 11.0,
        Graha::Saturn => 15.0,
        Graha::Venus if retrograde => 8.0,
        Graha::Venus => 10.0,
        Graha::Mercury if retrograde => 12.0,
        _ => 14.0,
    }
}

/// `_elongation`: (separation, east of the Sun, speed).
fn elongation<I: PyInstant>(system: System, graha: Graha, at: I) -> (f64, bool, f64) {
    let sun = longitude_for(system, Graha::Sun, at);
    let planet = longitude_for(system, graha, at);
    let diff = py_mod(planet - sun, 360.0);
    (
        diff.min(360.0 - diff),
        diff < 180.0,
        speed_for(system, graha, at),
    )
}

/// `is_heliacally_visible`.
pub(crate) fn visible<I: PyInstant>(system: System, graha: Graha, at: I) -> bool {
    let (sep, _, speed) = elongation(system, graha, at);
    sep >= combustion_threshold(graha, speed)
}

/// `find_udayast_events_in_range`.
pub(crate) fn udayast_events<I: PyInstant>(
    system: System,
    from: I,
    until: I,
    grahas: &[Graha],
) -> Vec<Ingress<I>> {
    let mut events = Vec::new();
    for &g in grahas {
        let mut cursor = from;
        let mut was = visible(system, g, cursor);
        while cursor < until {
            let probe = py_min(cursor.add_hours(2), until);
            let now = visible(system, g, probe);
            if now == was {
                cursor = probe;
                continue;
            }
            let (mut lo, mut hi) = (cursor, probe);
            for _ in 0..50 {
                if hi.seconds_since(lo) < 1.0 {
                    break;
                }
                let mid = I::midpoint(lo, hi);
                if visible(system, g, mid) == now {
                    hi = mid;
                } else {
                    lo = mid;
                }
            }
            if hi > until {
                break;
            }
            let (_, east, speed) = elongation(system, g, hi);
            let retrograde = is_retrograde(g, speed);
            events.push(Ingress {
                graha: g,
                at: hi,
                kind: Kind::Udayast {
                    visible: now,
                    east,
                    retrograde,
                },
            });
            was = now;
            cursor = hi.add_seconds(90);
        }
    }
    sort_entries(&mut events);
    events
}

/// The `level=` of an ingress timeline.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    /// Nakshatra-pada entries.
    Pada,
    /// Nakshatra entries.
    Nakshatra,
    /// Rashi entries.
    Rashi,
    /// The patro mix: pada, rashi (not Sun/Moon), udaya/asta and stations.
    Patro,
    /// Heliacal udaya/asta.
    Udayast,
}

impl Level {
    /// The query spelling.
    #[must_use]
    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "pada" => Some(Self::Pada),
            "nakshatra" => Some(Self::Nakshatra),
            "rashi" => Some(Self::Rashi),
            "patro" => Some(Self::Patro),
            "udayast" => Some(Self::Udayast),
            _ => None,
        }
    }

    const fn key(self) -> &'static str {
        match self {
            Self::Pada => "pada",
            Self::Nakshatra => "nakshatra",
            Self::Rashi => "rashi",
            Self::Patro => "patro",
            Self::Udayast => "udayast",
        }
    }
}

/// `find_ingress_entries_in_range`.
fn ingress_entries<I: PyInstant>(
    system: System,
    from: I,
    until: I,
    level: Level,
    grahas: &[Graha],
) -> Vec<Ingress<I>> {
    let finder: fn(System, Graha, I) -> Option<Ingress<I>> = match level {
        Level::Udayast => return udayast_events(system, from, until, grahas),
        Level::Patro => {
            let mut merged = ingress_entries(system, from, until, Level::Pada, grahas);
            let rashi_grahas: Vec<Graha> = grahas
                .iter()
                .copied()
                .filter(|g| !matches!(g, Graha::Sun | Graha::Moon))
                .collect();
            merged.extend(ingress_entries(
                system,
                from,
                until,
                Level::Rashi,
                &rashi_grahas,
            ));
            merged.extend(udayast_events(system, from, until, &FIVE_PLANETS));
            merged.extend(motion_stations(system, from, until, &FIVE_PLANETS));
            sort_entries(&mut merged);
            return merged;
        }
        Level::Pada => next_pada_entry,
        Level::Nakshatra => next_nakshatra_entry,
        Level::Rashi => next_rashi_entry,
    };
    let mut entries = Vec::new();
    for &g in grahas {
        let mut cursor = from;
        while cursor < until {
            let Some(entry) = finder(system, g, cursor) else {
                break;
            };
            let printed = entry.printed_at();
            if printed > until {
                break;
            }
            entries.push(entry);
            cursor = printed.add_seconds(90);
        }
    }
    sort_entries(&mut entries);
    entries
}

/// `_attach_local_time`: local `YYYY-MM-DD HH:MM`, `HH:MM`, and the local civil day JD,
/// read from the printed `entry_time_utc`.
///
/// Python cut a Julian Day entry's local stamp with `[:16]`, which drops a minute
/// digit from a BCE year's 17-character date (`-0044-03-15 06:2`); Rust prints the
/// whole `HH:MM` (`scripts/rust_divergences.py`).
pub(crate) fn attach_local_time<I: PyInstant>(
    entry: &mut Map<String, Value>,
    at: I,
    location: &Location,
) -> f64 {
    let parsed = at.reparse();
    let wall = parsed.wall(&location.zone);
    entry.insert(
        "entry_time_local".into(),
        json!(format!("{} {}", wall.day, wall.hm)),
    );
    entry.insert("entry_time_local_short".into(), json!(wall.hm));
    let jd = parsed.civil_fields(&location.zone).day.to_jd_ut();
    entry.insert("entry_jd".into(), json!(jd));
    jd
}

/// Why a gochar payload could not be built.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[non_exhaustive]
pub enum GocharError {
    /// A caller error (400).
    #[error("{0}")]
    BadRequest(String),
    /// A sunrise could not be found, or the day is outside the ported range.
    #[error(transparent)]
    Daily(#[from] DailyError),
    /// The BS calendar has no such day.
    #[error(transparent)]
    Calendar(#[from] calendar::BsError),
}

/// `build_gochar_ingress(jd_start, jd_end, location, level=, grahas=)`.
///
/// # Errors
///
/// [`GocharError`] when the span runs backwards or a sunrise cannot be found.
pub fn gochar_ingress(
    jd_start: f64,
    jd_end: f64,
    location: &Location,
    level: Level,
    grahas: Option<&[Graha]>,
) -> Result<Value, GocharError> {
    if jd_end < jd_start {
        return Err(GocharError::BadRequest(
            "to_date must be on or after from_date".into(),
        ));
    }
    let default: Vec<Graha> = Graha::ALL
        .into_iter()
        .filter(|g| *g != Graha::Moon)
        .collect();
    let grahas = grahas.unwrap_or(&default);
    let (first, last) = (
        CivilDay::from_jd_ut(jd_start),
        CivilDay::from_jd_ut(jd_end).add_days(1),
    );
    let events = if first.is_datetime_range() && last.is_datetime_range() {
        ingress_events::<UtcInstant>(first, last, location, level, grahas)?
    } else {
        // A span that starts (or ends) before 1582-10-15: Python's sunrises are
        // `UtInstant`s there, and every search runs on Julian Days.
        ingress_events::<JdInstant>(first, last, location, level, grahas)?
    };
    Ok(json!({
        "from_jd": jd_start, "to_jd": jd_end, "level": level.key(),
        "location": location.as_json(), "events": events,
    }))
}

/// `_attach_ingress_local_time` over `find_ingress_entries_in_range`.
fn ingress_events<I: SunriseInstant>(
    first: CivilDay,
    after_last: CivilDay,
    location: &Location,
    level: Level,
    grahas: &[Graha],
) -> Result<Vec<Value>, GocharError> {
    let system = location.system;
    let from = I::sunrise_on(first, location)?;
    let until = I::sunrise_on(after_last, location)?;
    let mut events = Vec::new();
    for entry in ingress_entries(system, from, until, level, grahas) {
        let mut m = entry.to_json();
        let entry_jd = attach_local_time(&mut m, entry.at, location);
        let day = CivilDay::from_jd_ut(entry_jd);
        let vedic = if entry.printed_at().to_jd() < python_sunrise_jd(day, location)? {
            day.add_days(-1).to_jd_ut()
        } else {
            entry_jd
        };
        m.insert("entry_vedic_jd".into(), json!(vedic));
        events.push(Value::Object(m));
    }
    Ok(events)
}

/// The Julian Day of `sun_service.sunrise` as Python holds it: a `datetime`
/// (truncated to the second) from 1582-10-15, the raw Julian Day before.
fn python_sunrise_jd(day: CivilDay, location: &Location) -> Result<f64, DailyError> {
    if day.is_datetime_range() {
        UtcInstant::sunrise_on(day, location).map(UtcInstant::to_jd)
    } else {
        JdInstant::sunrise_on(day, location).map(|t| t.0)
    }
}

/// `_dms_absolute` / `_dms_in_sign`.
fn dms(value: f64, width: usize) -> String {
    let mut d = py_int(value);
    #[expect(clippy::cast_precision_loss, reason = "degrees below 360")]
    let m_frac = (value - d as f64) * 60.0;
    let mut m = py_int(m_frac);
    #[expect(clippy::cast_precision_loss, reason = "minutes below 60")]
    let mut s = py_round_int((m_frac - m as f64) * 60.0);
    if s >= 60 {
        s -= 60;
        m += 1;
    }
    if m >= 60 {
        m -= 60;
        d += 1;
    }
    format!("{d:0width$}°{m:02}'{s:02}\"")
}

/// `nakshatra_fields_from_longitude`: nakshatra, pada, star lord and KP sub-lord.
fn nakshatra_fields(lon: f64, out: &mut Map<String, Value>) {
    let lon = py_mod(lon, 360.0);
    let nak = to_usize(py_int(py_floordiv(lon, NAKSHATRA_SPAN)) % 27);
    #[expect(clippy::cast_precision_loss, reason = "a nakshatra index")]
    let pos = lon - nak as f64 * NAKSHATRA_SPAN;
    let pada = (py_int(pos / PADA_SPAN) + 1).min(4);
    let elapsed = (pos / NAKSHATRA_SPAN) * 120.0;
    let start = nak % 9;
    let mut cumulative = 0.0;
    let mut sub = dasha::SEQUENCE[start];
    for i in 0..9 {
        let lord = dasha::SEQUENCE[(start + i) % 9];
        cumulative += f64::from(dasha::years(lord));
        if elapsed < cumulative {
            sub = lord;
            break;
        }
    }
    let star = dasha::SEQUENCE[nak % 9];
    for (k, v) in [
        ("nakshatra_no", json!(nak + 1)),
        ("nakshatra", json!(NAKSHATRA_NAMES[nak])),
        ("nakshatra_ne", json!(NAKSHATRA_NAMES_NE[nak])),
        ("pada", json!(pada)),
        ("nakshatra_lord", json!(star.key())),
        ("nakshatra_lord_ne", json!(dasha::lord_ne(star))),
        ("nakshatra_lord_en", json!(star.en())),
        ("sub_lord", json!(sub.key())),
        ("sub_lord_ne", json!(dasha::lord_ne(sub))),
        ("sub_lord_en", json!(sub.en())),
    ] {
        out.insert(k.into(), v);
    }
}

/// `EXALT_RASHI_NO` (1-based).
fn exalted(graha: Graha, rashi_no: usize) -> bool {
    graha.exalt_sign().is_some_and(|s| s + 1 == rashi_no)
}

/// `get_gochar_table(dt)`: every graha's row, by [`Graha::ALL`] order.
#[must_use]
pub fn gochar_table<I: PyInstant>(system: System, at: I) -> Vec<(Graha, Map<String, Value>)> {
    let rows = graha_positions(system, at.to_jd());
    Graha::ALL
        .into_iter()
        .map(|g| {
            let pos = rows.iter().find(|r| r.key == g.key());
            let (lon, spd, combust) =
                pos.map_or((0.0, 0.0, false), |p| (p.longitude, p.speed, p.is_combust));
            let rashi = to_usize(py_int(lon / 30.0) % 12);
            let (vedic, ne, symbol) = meta(g);
            let retro = is_retrograde(g, spd);
            let mut m = Map::new();
            for (k, v) in [
                ("name_vedic", json!(vedic)),
                ("name_ne", json!(ne)),
                ("symbol", json!(symbol)),
                ("longitude", json!(py_round(lon, 4))),
                ("dms_absolute", json!(dms(lon, 3))),
                ("rashi_no", json!(rashi + 1)),
                ("rashi", json!(RASHI_NAMES[rashi])),
                ("rashi_ne", json!(RASHI_NAMES_NE[rashi])),
                ("deg_in_rashi", json!(py_round(py_mod(lon, 30.0), 4))),
                ("dms_in_rashi", json!(dms(py_mod(lon, 30.0), 2))),
                ("speed_deg_day", json!(py_round(spd, 4))),
                ("is_retrograde", json!(retro)),
                ("is_combust", json!(combust)),
                ("motion", json!(if retro { "Vakri" } else { "Margi" })),
                ("is_exalted", json!(exalted(g, rashi + 1))),
            ] {
                m.insert(k.into(), v);
            }
            nakshatra_fields(lon, &mut m);
            (g, m)
        })
        .collect()
}

/// `format_bs_date` of a civil day, or `None` off the BS table.
fn bs_label(day: CivilDay) -> Option<String> {
    calendar::locate_patro_day(day)
        .ok()
        .map(|bs| format!("{}-{:02}-{:02}", bs.year, bs.month, bs.day))
}

/// Whether the gochar table also lists the slow grahas' next three rashi entries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Upcoming {
    /// `upcoming=true`.
    Include,
    /// The default.
    Skip,
}

/// `build_gochar(jd, location, include_next_entry=True, include_upcoming=…)`.
///
/// # Errors
///
/// [`GocharError`] when the sunrise cannot be found.
pub fn gochar(jd: f64, location: &Location, upcoming: Upcoming) -> Result<Value, GocharError> {
    let civil = CivilDay::from_jd_ut(jd);
    if civil.is_datetime_range() {
        gochar_on::<UtcInstant>(civil, location, upcoming)
    } else {
        gochar_on::<JdInstant>(civil, location, upcoming)
    }
}

fn gochar_on<I: SunriseInstant>(
    civil: CivilDay,
    location: &Location,
    upcoming: Upcoming,
) -> Result<Value, GocharError> {
    let system = location.system;
    let sunrise = I::sunrise_on(civil, location)?;
    let mut table = Map::new();
    for (g, mut row) in gochar_table(system, sunrise) {
        let rashi = next_rashi_entry(system, g, sunrise).map_or(Value::Null, |e| {
            let mut m = e.to_json();
            attach_local_time(&mut m, e.at, location);
            json!({
                "to_rashi": m["to_rashi"], "to_rashi_ne": m["to_rashi_ne"],
                "entry_time_local": m["entry_time_local"], "entry_time_utc": m["entry_time_utc"],
            })
        });
        let nak = next_nakshatra_entry(system, g, sunrise).map_or(Value::Null, |e| {
            let mut m = e.to_json();
            attach_local_time(&mut m, e.at, location);
            json!({
                "to_nakshatra": m["to_nakshatra"], "to_nakshatra_ne": m["to_nakshatra_ne"],
                "label_ne": m["label_ne"], "entry_time_local": m["entry_time_local"],
                "entry_time_local_short": m["entry_time_local_short"], "entry_time_utc": m["entry_time_utc"],
            })
        });
        let pada = next_pada_entry(system, g, sunrise).map_or(Value::Null, |e| {
            let mut m = e.to_json();
            attach_local_time(&mut m, e.at, location);
            json!({
                "to_nakshatra": m["to_nakshatra"], "to_nakshatra_ne": m["to_nakshatra_ne"],
                "to_pada": m["to_pada"], "to_pada_ne": m["to_pada_ne"], "label_ne": m["label_ne"],
                "entry_time_local": m["entry_time_local"],
                "entry_time_local_short": m["entry_time_local_short"], "entry_time_utc": m["entry_time_utc"],
            })
        });
        row.insert("next_rashi_entry".into(), rashi);
        row.insert("next_nakshatra_entry".into(), nak);
        row.insert("next_pada_entry".into(), pada);
        table.insert(g.key().into(), Value::Object(row));
    }
    let mut out = Map::new();
    out.insert("date_bs".into(), json!(bs_label(civil)));
    out.insert("date_ad".into(), json!(civil.to_string()));
    out.insert("anchor".into(), json!("sunrise"));
    out.insert(
        "computed_at".into(),
        json!({
            "utc": sunrise.to_string(), "local": sunrise.wall(&location.zone).hm,
            "note": "Positions at local true sunrise (Udaya)",
        }),
    );
    out.insert("location".into(), location.as_json());
    out.insert(
        "ayanamsa".into(),
        json!({"name": if location.system.is_drik() { "Lahiri" } else { "Surya Siddhanta" }, "degrees": py_round(location.system.ayanamsha(sunrise.to_jd()), 6)}),
    );
    out.insert("gochar".into(), Value::Object(table));
    out.insert("vedic_stars".into(), json!([]));
    if upcoming == Upcoming::Include {
        out.insert(
            "upcoming_transits".into(),
            Value::Array(
                upcoming_rashi_entries(system, sunrise, &SLOW_GRAHAS, 3)
                    .iter()
                    .map(|e| Value::Object(e.to_json()))
                    .collect(),
            ),
        );
    }
    Ok(Value::Object(out))
}

fn year_upcoming<I: SunriseInstant>(
    year_start: CivilDay,
    location: &Location,
) -> Result<Vec<Value>, GocharError> {
    let system = location.system;
    let sunrise = I::sunrise_on(year_start, location)?;
    Ok(upcoming_rashi_entries(system, sunrise, &SLOW_GRAHAS, 4)
        .iter()
        .map(|e| Value::Object(e.to_json()))
        .collect())
}

/// `build_gochar_year_summary(bs_year, location)`.
///
/// # Errors
///
/// [`GocharError`] when the BS year is off the table or a sunrise cannot be found.
pub fn gochar_year(bs_year: i32, location: &Location) -> Result<Value, GocharError> {
    let system = location.system;
    let year_start = calendar::month_start(bs_year, 1)?;
    let year_end = calendar::month_start(bs_year, 12)?
        .add_days(i32::try_from(calendar::month_length(bs_year, 12)?).unwrap_or(30) - 1);
    let upcoming = if year_start.is_datetime_range() {
        year_upcoming::<UtcInstant>(year_start, location)?
    } else {
        year_upcoming::<JdInstant>(year_start, location)?
    };
    let mut snapshots = Vec::with_capacity(12);
    for bs_month in 1..=12u32 {
        let mid = calendar::month_length(bs_year, bs_month)?.min(15);
        let day = calendar::month_start(bs_year, bs_month)?
            .add_days(i32::try_from(mid).unwrap_or(15) - 1);
        let table = gochar_table(system, JdInstant(python_sunrise_jd(day, location)?));
        let gochar: Map<String, Value> = table
            .into_iter()
            .map(|(g, row)| {
                (
                    g.key().to_owned(),
                    json!({
                        "rashi": row["rashi"], "deg_in_rashi": row["deg_in_rashi"],
                        "motion": row["motion"], "vakri": row["is_retrograde"],
                    }),
                )
            })
            .collect();
        snapshots.push(json!({
            "bs_month": bs_month,
            "snapshot_date_ad": day.to_string(),
            "snapshot_date_bs": format!("{bs_year}-{bs_month:02}-{mid:02}"),
            "gochar": gochar,
        }));
    }
    Ok(json!({
        "bs_year": bs_year,
        "range_start_jd": year_start.to_jd_ut(),
        "range_end_jd": year_end.to_jd_ut(),
        "location": location.as_json(),
        "upcoming_transits": upcoming,
        "monthly_snapshots": snapshots,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The skip in `bisect_index_change` is only exact if no graha ever outruns
    /// `max_daily_motion`: check every 6 hours across 1800–2200, with room to spare.
    #[test]
    fn daily_motion_stays_under_the_bound() {
        let system = System::SuryaSiddhanta;
        let grahas = [
            Graha::Sun,
            Graha::Moon,
            Graha::Mars,
            Graha::Mercury,
            Graha::Jupiter,
            Graha::Venus,
            Graha::Saturn,
            Graha::Rahu,
            Graha::Ketu,
        ];
        let start = 2_378_496.5; // 1800-01-01
        let steps = 400 * 365 * 4;
        for graha in grahas {
            let bound = max_daily_motion(graha) * 0.25;
            let mut fastest = 0.0_f64;
            let mut prev = longitude_for(system, graha, timescale::JdInstant(start));
            for k in 1..=steps {
                let jd = start + f64::from(k) * 0.25;
                let lon = longitude_for(system, graha, timescale::JdInstant(jd));
                let mut step = (lon - prev).abs();
                if step > 180.0 {
                    step = 360.0 - step;
                }
                fastest = fastest.max(step);
                prev = lon;
            }
            assert!(
                fastest < bound * 0.9,
                "{graha:?} moved {fastest}° in 6 h; bound {bound}°"
            );
        }
    }
}
