//! Drik positions from our own ephemeris (`ephdata`): JPL Chebyshev data evaluated
//! natively, Lahiri ayanamsha, apparent places. No Swiss Ephemeris.

use std::sync::Arc;

use ephdata::{Index, Sky};

use super::{Ephemeris, Pos};

/// Sun and Moon from our own kernel, optionally with the precomputed event index.
#[derive(Debug, Clone)]
pub struct OwnDrik {
    sky: Arc<Sky>,
    index: Option<Arc<Index>>,
}

impl OwnDrik {
    /// Positions computed on demand.
    #[must_use]
    pub const fn new(sky: Arc<Sky>) -> Self {
        Self { sky, index: None }
    }

    /// With every boundary read from `index` where it has them.
    #[must_use]
    pub fn with_index(mut self, index: Arc<Index>) -> Self {
        self.index = Some(index);
        self
    }

    /// The underlying sky.
    #[must_use]
    pub fn sky(&self) -> &Sky {
        &self.sky
    }
}

impl Ephemeris for OwnDrik {
    fn name(&self) -> &'static str {
        "drik_own_lahiri"
    }

    fn pos(&self, jd_ut: f64) -> Pos {
        self.sky.sun_moon(jd_ut).map_or(
            Pos {
                sun: f64::NAN,
                moon: f64::NAN,
            },
            |(sun, moon)| Pos { sun, moon },
        )
    }

    fn index(&self) -> Option<&Index> {
        self.index.as_deref()
    }
}
