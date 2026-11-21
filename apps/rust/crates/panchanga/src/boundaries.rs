//! When each anga begins and ends: bisection in instant space, to one second.
//!
//! The Python server bisects on `datetime`s, so the search runs on
//! [`UtcInstant`]s with the same microsecond arithmetic and rounding, and lands on
//! the same instant. Each search keeps the current index on one side and moves the
//! other bound to the midpoint, at most 50 times, until the bracket is under a second.

use astronomy::engine::{moon_longitude, sun_longitude};
use timescale::PyInstant;

use crate::angas::{
    NAKSHATRA_SPAN, TITHI_SPAN, elongation, karana, nakshatra, py_mod, trunc, yoga,
};

const ONE_SECOND_MICROS: i64 = 1_000_000;
const MAX_STEPS: usize = 50;
const PADA_SPAN: f64 = NAKSHATRA_SPAN / 4.0;

fn index_at<I: PyInstant>(at: I, index: &impl Fn(f64) -> u32) -> u32 {
    index(at.to_jd())
}

/// First instant (within a second) after `from` where `index` changes, searching `hours` ahead.
pub(crate) fn span_end<I: PyInstant>(from: I, hours: i64, index: impl Fn(f64) -> u32) -> I {
    let current = index_at(from, &index);
    let (mut start, mut end) = (from, from.add_hours(hours));
    for _ in 0..MAX_STEPS {
        if end.micros_since(start) < ONE_SECOND_MICROS {
            return end;
        }
        let mid = I::midpoint(start, end);
        if index_at(mid, &index) == current {
            start = mid;
        } else {
            end = mid;
        }
    }
    end
}

/// First instant (within a second) of the span holding `at`, searching 30 hours back.
fn span_start<I: PyInstant>(at: I, index: impl Fn(f64) -> u32) -> I {
    let current = index_at(at, &index);
    let (mut start, mut end) = (at.add_hours(-30), at);
    for _ in 0..MAX_STEPS {
        if end.micros_since(start) < ONE_SECOND_MICROS {
            return end;
        }
        let mid = I::midpoint(start, end);
        if index_at(mid, &index) == current {
            end = mid;
        } else {
            start = mid;
        }
    }
    end
}

fn tithi_index(jd: f64) -> u32 {
    trunc(elongation(jd) / TITHI_SPAN)
}

/// End of the tithi in force at `at`.
#[must_use]
pub fn tithi_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, tithi_index)
}

/// Start of the tithi in force at `at`.
#[must_use]
pub fn tithi_start<I: PyInstant>(at: I) -> I {
    span_start(at, tithi_index)
}

/// End of the Moon's nakshatra at `at`.
#[must_use]
pub fn nakshatra_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, |jd| nakshatra(jd).number)
}

/// Start of the Moon's nakshatra at `at`.
#[must_use]
pub fn nakshatra_start<I: PyInstant>(at: I) -> I {
    span_start(at, |jd| nakshatra(jd).number)
}

/// End of the yoga at `at`.
#[must_use]
pub fn yoga_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, |jd| yoga(jd).number)
}

/// Start of the yoga at `at`.
#[must_use]
pub fn yoga_start<I: PyInstant>(at: I) -> I {
    span_start(at, |jd| yoga(jd).number)
}

/// End of the karana at `at`.
#[must_use]
pub fn karana_end<I: PyInstant>(at: I) -> I {
    span_end(at, 30, |jd| karana(jd).number - 1)
}

/// Start of the karana at `at`.
#[must_use]
pub fn karana_start<I: PyInstant>(at: I) -> I {
    span_start(at, |jd| karana(jd).number - 1)
}

/// When the Moon leaves its rashi (searching 60 hours ahead).
#[must_use]
pub fn moon_rashi_end<I: PyInstant>(at: I) -> I {
    span_end(at, 60, |jd| trunc(moon_longitude(jd) / 30.0) % 12)
}

/// When the Moon leaves its nakshatra pada (searching 8 hours ahead).
#[must_use]
pub fn moon_pada_end<I: PyInstant>(at: I) -> I {
    span_end(at, 8, |jd| {
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
    span_end(at, 30, |jd| {
        let number = trunc(sun_longitude(jd) / NAKSHATRA_SPAN) + 1;
        if number > 27 { 1 } else { number }
    })
}
