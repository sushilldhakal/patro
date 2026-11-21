//! Drik (observational) positions from the Swiss Ephemeris, Lahiri ayanamsha.

use ephemeris::{body, calc_ut, flag};

use super::{Ephemeris, Pos};
use crate::angles::wrap360;

/// `SE_SIDM_LAHIRI`.
const LAHIRI: i32 = 1;

/// Positions from the Swiss Ephemeris with the Lahiri ayanamsha.
#[derive(Debug, Clone, Copy, Default)]
pub struct Drik;

fn longitude(jd_ut: f64, which: i32) -> f64 {
    calc_ut(jd_ut, which, flag::SWIEPH | flag::SIDEREAL, Some(LAHIRI))
        .map_or(f64::NAN, |xx| wrap360(xx[0]))
}

impl Ephemeris for Drik {
    fn name(&self) -> &'static str {
        "drik_lahiri"
    }

    fn pos(&self, jd_ut: f64) -> Pos {
        Pos {
            sun: longitude(jd_ut, body::SUN),
            moon: longitude(jd_ut, body::MOON),
        }
    }
}
