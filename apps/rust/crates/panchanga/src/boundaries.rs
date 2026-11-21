//! When each anga begins and ends, read from the astronomy event engine.
//!
//! The engine knows every boundary to a fraction of a millisecond. The API's
//! contract, inherited from the Python server, is the instant a one-second
//! bisection on microsecond `datetime`s lands on (up to a second after the true
//! boundary). Those bisections are replayed here with plain comparisons against the
//! known boundary, evaluating the anga only within a hair of it, so every answer is
//! the same microsecond as before at a fraction of the cost. The full bisections
//! remain in [`reference`] as the oracle the tests compare against.

use std::cell::OnceCell;

use astronomy::{
    angles::Anga,
    engine::{moon_longitude, sun_longitude},
    events::{next_event, prev_event},
    position::SuryaSiddhanta,
    solver::near,
};
use timescale::PyInstant;

use crate::angas::{
    NAKSHATRA_SPAN, TITHI_SPAN, elongation, karana, nakshatra, py_mod, trunc, yoga,
};

const ONE_SECOND_MICROS: i64 = 1_000_000;
const MAX_STEPS: usize = 50;
const PADA_SPAN: f64 = NAKSHATRA_SPAN / 4.0;

/// The bisection both searches share: `before(mid)` keeps the midpoint on the
/// `start` side. Returns the `end` bound once the bracket is under a second.
fn bisect<I: PyInstant>(mut start: I, mut end: I, before: impl Fn(I) -> bool) -> I {
    for _ in 0..MAX_STEPS {
        if end.micros_since(start) < ONE_SECOND_MICROS {
            return end;
        }
        let mid = I::midpoint(start, end);
        if before(mid) {
            start = mid;
        } else {
            end = mid;
        }
    }
    end
}

/// The boundaries of `anga` either side of `jd`, or `None` when `jd` is too close
/// to one for the replay to decide (the full bisection runs instead).
fn bracketing(anga: Anga, jd: f64) -> Option<(f64, f64)> {
    let prev = prev_event(&SuryaSiddhanta, anga, jd).jd;
    let next = next_event(&SuryaSiddhanta, anga, jd).jd;
    (!near(jd, prev) && !near(jd, next)).then_some((prev, next))
}

/// First instant (within a second) after `from` where `anga` changes, searching
/// `hours` ahead; `index` is the anga as the API reads it, used only next to the
/// boundary.
pub(crate) fn span_end<I: PyInstant>(
    from: I,
    hours: i64,
    anga: Anga,
    index: impl Fn(f64) -> u32,
) -> I {
    let from_jd = from.to_jd();
    let Some((_, root)) = bracketing(anga, from_jd) else {
        return reference::span_end(from, hours, index);
    };
    let current = OnceCell::new();
    bisect(from, from.add_hours(hours), |mid| {
        let jd = mid.to_jd();
        if near(jd, root) {
            index(jd) == *current.get_or_init(|| index(from_jd))
        } else {
            jd < root
        }
    })
}

/// First instant (within a second) of the span of `anga` holding `at`, searching
/// 30 hours back.
fn span_start<I: PyInstant>(at: I, anga: Anga, index: impl Fn(f64) -> u32) -> I {
    let at_jd = at.to_jd();
    let Some((root, _)) = bracketing(anga, at_jd) else {
        return reference::span_start(at, index);
    };
    let current = OnceCell::new();
    // The span start keeps the *current* index on the end side.
    bisect(at.add_hours(-30), at, |mid| {
        let jd = mid.to_jd();
        if near(jd, root) {
            index(jd) != *current.get_or_init(|| index(at_jd))
        } else {
            jd < root
        }
    })
}

/// The full bisections, evaluating the anga at every midpoint: the behaviour the
/// replay must reproduce, kept for the comparison tests.
#[doc(hidden)]
pub mod reference {
    use timescale::PyInstant;

    use super::bisect;

    /// First instant (within a second) after `from` where `index` changes.
    pub fn span_end<I: PyInstant>(from: I, hours: i64, index: impl Fn(f64) -> u32) -> I {
        let current = index(from.to_jd());
        bisect(from, from.add_hours(hours), |mid| {
            index(mid.to_jd()) == current
        })
    }

    /// First instant (within a second) of the span holding `at`, 30 hours back.
    pub fn span_start<I: PyInstant>(at: I, index: impl Fn(f64) -> u32) -> I {
        let current = index(at.to_jd());
        bisect(at.add_hours(-30), at, |mid| index(mid.to_jd()) != current)
    }
}

fn tithi_index(jd: f64) -> u32 {
    trunc(elongation(jd) / TITHI_SPAN)
}

/// End of the tithi in force at `at`.
#[must_use]
pub fn tithi_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, Anga::Tithi, tithi_index)
}

/// Start of the tithi in force at `at`.
#[must_use]
pub fn tithi_start<I: PyInstant>(at: I) -> I {
    span_start(at, Anga::Tithi, tithi_index)
}

/// End of the Moon's nakshatra at `at`.
#[must_use]
pub fn nakshatra_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, Anga::Nakshatra, |jd| nakshatra(jd).number)
}

/// Start of the Moon's nakshatra at `at`.
#[must_use]
pub fn nakshatra_start<I: PyInstant>(at: I) -> I {
    span_start(at, Anga::Nakshatra, |jd| nakshatra(jd).number)
}

/// End of the yoga at `at`.
#[must_use]
pub fn yoga_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, Anga::Yoga, |jd| yoga(jd).number)
}

/// Start of the yoga at `at`.
#[must_use]
pub fn yoga_start<I: PyInstant>(at: I) -> I {
    span_start(at, Anga::Yoga, |jd| yoga(jd).number)
}

/// End of the karana at `at`.
#[must_use]
pub fn karana_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, Anga::Karana, |jd| karana(jd).number - 1)
}

/// Start of the karana at `at`.
#[must_use]
pub fn karana_start<I: PyInstant>(at: I) -> I {
    span_start(at, Anga::Karana, |jd| karana(jd).number - 1)
}

/// When the Moon leaves its rashi (searching 60 hours ahead).
#[must_use]
pub fn moon_rashi_end<I: PyInstant>(at: I) -> I {
    span_end(at, 60, Anga::MoonRashi, |jd| {
        trunc(moon_longitude(jd) / 30.0) % 12
    })
}

/// When the Moon leaves its nakshatra pada (searching 8 hours ahead).
#[must_use]
pub fn moon_pada_end<I: PyInstant>(at: I) -> I {
    span_end(at, 8, Anga::Pada, |jd| {
        let moon = moon_longitude(jd);
        let mut number = trunc(moon / NAKSHATRA_SPAN) + 1;
        if number > 27 {
            number = 1;
        }
        let pada = (trunc(py_mod(moon, NAKSHATRA_SPAN) / PADA_SPAN) + 1).min(4);
        (number - 1) * 4 + (pada - 1)
    })
}

/// When the Sun leaves its nakshatra.
#[must_use]
pub fn sun_nakshatra_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, Anga::SunNakshatra, |jd| {
        let number = trunc(sun_longitude(jd) / NAKSHATRA_SPAN) + 1;
        if number > 27 { 1 } else { number }
    })
}
