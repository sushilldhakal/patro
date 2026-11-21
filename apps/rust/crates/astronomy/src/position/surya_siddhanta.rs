//! The Surya Siddhanta as an [`Ephemeris`]: the text's own true Sun and Moon.

use crate::engine::{moon_longitude, sun_longitude};

use super::{Ephemeris, Pos};

/// Positions by the Surya Siddhanta (the server's default system).
#[derive(Debug, Clone, Copy, Default)]
pub struct SuryaSiddhanta;

impl Ephemeris for SuryaSiddhanta {
    fn name(&self) -> &'static str {
        "surya_siddhanta"
    }

    fn pos(&self, jd_ut: f64) -> Pos {
        Pos {
            sun: sun_longitude(jd_ut),
            moon: moon_longitude(jd_ut),
        }
    }
}
