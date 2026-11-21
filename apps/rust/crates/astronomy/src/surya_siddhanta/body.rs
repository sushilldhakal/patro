//! The bodies the text computes, as types instead of strings.

use std::{fmt, str::FromStr};

/// A body with a true position: the seven grahas and Rahu (the Moon's mean ascending node).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Body {
    /// सूर्य
    Sun,
    /// चन्द्र
    Moon,
    /// मङ्गल
    Mars,
    /// बुध
    Mercury,
    /// बृहस्पति
    Jupiter,
    /// शुक्र
    Venus,
    /// शनि
    Saturn,
    /// राहु, the mean ascending node of the Moon.
    Rahu,
}

impl Body {
    /// Every body, in the order the Python module lists them.
    pub const ALL: [Self; 8] = [
        Self::Sun,
        Self::Moon,
        Self::Mars,
        Self::Mercury,
        Self::Jupiter,
        Self::Venus,
        Self::Saturn,
        Self::Rahu,
    ];

    /// The lowercase name the API uses.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Sun => "sun",
            Self::Moon => "moon",
            Self::Mars => "mars",
            Self::Mercury => "mercury",
            Self::Jupiter => "jupiter",
            Self::Venus => "venus",
            Self::Saturn => "saturn",
            Self::Rahu => "rahu",
        }
    }

    /// The star-planet this body is, if it is one.
    #[must_use]
    pub const fn star_planet(self) -> Option<StarPlanet> {
        match self {
            Self::Mars => Some(StarPlanet::Mars),
            Self::Mercury => Some(StarPlanet::Mercury),
            Self::Jupiter => Some(StarPlanet::Jupiter),
            Self::Venus => Some(StarPlanet::Venus),
            Self::Saturn => Some(StarPlanet::Saturn),
            Self::Sun | Self::Moon | Self::Rahu => None,
        }
    }
}

impl fmt::Display for Body {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.name())
    }
}

impl FromStr for Body {
    type Err = ParseBodyError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::ALL
            .into_iter()
            .find(|b| b.name() == s)
            .ok_or_else(|| ParseBodyError(s.to_owned()))
    }
}

/// The five star-planets (तारा ग्रह), which take the four-step manda + शीघ्र procedure.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum StarPlanet {
    /// मङ्गल
    Mars,
    /// बुध
    Mercury,
    /// बृहस्पति
    Jupiter,
    /// शुक्र
    Venus,
    /// शनि
    Saturn,
}

impl StarPlanet {
    /// Mercury and Venus: their mean planet is the Sun and their शीघ्रोच्च moves on its own.
    pub(crate) const fn is_inferior(self) -> bool {
        matches!(self, Self::Mercury | Self::Venus)
    }
}

/// A body with a mean motion per mahayuga: the mean planets, Mercury's and Venus's
/// शीघ्रोच्च, and the Moon's apogee and node.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum MeanBody {
    /// The mean Sun.
    Sun,
    /// The mean Moon.
    Moon,
    /// Mean Mars.
    Mars,
    /// Mercury's शीघ्रोच्च.
    MercurySighra,
    /// Mean Jupiter.
    Jupiter,
    /// Venus's शीघ्रोच्च.
    VenusSighra,
    /// Mean Saturn.
    Saturn,
    /// The Moon's apogee (मन्दोच्च).
    MoonApogee,
    /// The Moon's ascending node, retrograde.
    MoonNode,
}

impl MeanBody {
    /// Every mean body, in the order of the text's table (Burgess I.29–44).
    pub const ALL: [Self; 9] = [
        Self::Sun,
        Self::Moon,
        Self::Mars,
        Self::MercurySighra,
        Self::Jupiter,
        Self::VenusSighra,
        Self::Saturn,
        Self::MoonApogee,
        Self::MoonNode,
    ];

    /// Revolutions per mahayuga (Burgess I.29–44); negative for the retrograde node.
    #[must_use]
    pub const fn revolutions_per_mahayuga(self) -> i64 {
        match self {
            Self::Sun => 4_320_000,
            Self::Moon => 57_753_336,
            Self::Mars => 2_296_832,
            Self::MercurySighra => 17_937_060,
            Self::Jupiter => 364_220,
            Self::VenusSighra => 7_022_376,
            Self::Saturn => 146_568,
            Self::MoonApogee => 488_203,
            Self::MoonNode => -232_238,
        }
    }

    /// The key the Python module uses for this body.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Sun => "sun",
            Self::Moon => "moon",
            Self::Mars => "mars",
            Self::MercurySighra => "mercury_sighra",
            Self::Jupiter => "jupiter",
            Self::VenusSighra => "venus_sighra",
            Self::Saturn => "saturn",
            Self::MoonApogee => "moon_apogee",
            Self::MoonNode => "moon_node",
        }
    }
}

impl fmt::Display for MeanBody {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.name())
    }
}

impl FromStr for MeanBody {
    type Err = ParseBodyError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::ALL
            .into_iter()
            .find(|b| b.name() == s)
            .ok_or_else(|| ParseBodyError(s.to_owned()))
    }
}

/// A name that is not a body the Surya Siddhanta computes.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("surya siddhanta has no body {0:?}")]
pub struct ParseBodyError(String);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_round_trip() {
        for body in Body::ALL {
            assert_eq!(body.name().parse::<Body>(), Ok(body));
        }
        for body in MeanBody::ALL {
            assert_eq!(body.name().parse::<MeanBody>(), Ok(body));
        }
        assert!(
            "pluto".parse::<Body>().is_err(),
            "unknown bodies are refused"
        );
    }
}
