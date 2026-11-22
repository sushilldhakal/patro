//! When each anga begins and ends, read straight from the astronomy event engine.
//!
//! The engine solves every boundary to a fraction of a millisecond and keeps them in
//! sorted tables, so "when does this tithi end" is a binary search. A span ends on
//! the first whole second at or after its boundary (the first second the new anga is
//! in force); Julian Day instants keep the exact boundary.

use astronomy::{
    System,
    angles::Anga,
    events::{next_event, prev_event},
    solver::Crossing,
};
use timescale::PyInstant;

/// The first instant like `like` (same kind and zone) after the boundary; `like`
/// itself when the engine found none.
fn at<I: PyInstant>(crossing: Crossing, like: I) -> I {
    if crossing.jd.is_finite() {
        like.at_boundary(crossing.jd).unwrap_or(like)
    } else {
        like
    }
}

/// When `anga` next changes after `from`.
pub(crate) fn span_end<I: PyInstant>(system: System, from: I, anga: Anga) -> I {
    at(next_event(&system, anga, from.to_jd()), from)
}

/// When the span of `anga` holding `now` began.
fn span_start<I: PyInstant>(system: System, now: I, anga: Anga) -> I {
    at(prev_event(&system, anga, now.to_jd()), now)
}

/// End of the tithi in force at `now`.
#[must_use]
pub fn tithi_end<I: PyInstant>(system: System, now: I) -> I {
    span_end(system, now, Anga::Tithi)
}

/// Start of the tithi in force at `now`.
#[must_use]
pub fn tithi_start<I: PyInstant>(system: System, now: I) -> I {
    span_start(system, now, Anga::Tithi)
}

/// End of the Moon's nakshatra at `now`.
#[must_use]
pub fn nakshatra_end<I: PyInstant>(system: System, now: I) -> I {
    span_end(system, now, Anga::Nakshatra)
}

/// Start of the Moon's nakshatra at `now`.
#[must_use]
pub fn nakshatra_start<I: PyInstant>(system: System, now: I) -> I {
    span_start(system, now, Anga::Nakshatra)
}

/// End of the yoga at `now`.
#[must_use]
pub fn yoga_end<I: PyInstant>(system: System, now: I) -> I {
    span_end(system, now, Anga::Yoga)
}

/// Start of the yoga at `now`.
#[must_use]
pub fn yoga_start<I: PyInstant>(system: System, now: I) -> I {
    span_start(system, now, Anga::Yoga)
}

/// End of the karana at `now`.
#[must_use]
pub fn karana_end<I: PyInstant>(system: System, now: I) -> I {
    span_end(system, now, Anga::Karana)
}

/// Start of the karana at `now`.
#[must_use]
pub fn karana_start<I: PyInstant>(system: System, now: I) -> I {
    span_start(system, now, Anga::Karana)
}

/// When the Moon leaves its rashi.
#[must_use]
pub fn moon_rashi_end<I: PyInstant>(system: System, now: I) -> I {
    span_end(system, now, Anga::MoonRashi)
}

/// When the Moon leaves its nakshatra pada.
#[must_use]
pub fn moon_pada_end<I: PyInstant>(system: System, now: I) -> I {
    span_end(system, now, Anga::Pada)
}

/// When the Sun leaves its nakshatra.
#[must_use]
pub fn sun_nakshatra_end<I: PyInstant>(system: System, now: I) -> I {
    span_end(system, now, Anga::SunNakshatra)
}
