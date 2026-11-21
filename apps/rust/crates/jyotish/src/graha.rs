//! The nine grahas and their classical tables (`engine/jyotish/interpretation.py`).

/// A graha, in the gochar order the rashifal reports them.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Graha {
    /// सूर्य.
    Sun,
    /// चन्द्र.
    Moon,
    /// मंगल.
    Mars,
    /// बुध.
    Mercury,
    /// बृहस्पति.
    Jupiter,
    /// शुक्र.
    Venus,
    /// शनि.
    Saturn,
    /// राहु.
    Rahu,
    /// केतु.
    Ketu,
}

impl Graha {
    /// `GOCHAR_GRAHAS`: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.
    pub const ALL: [Self; 9] = [
        Self::Sun,
        Self::Moon,
        Self::Mars,
        Self::Mercury,
        Self::Jupiter,
        Self::Venus,
        Self::Saturn,
        Self::Rahu,
        Self::Ketu,
    ];

    /// The seven grahas of the Ashtakavarga, in its order.
    pub const SEVEN: [Self; 7] = [
        Self::Sun,
        Self::Moon,
        Self::Mars,
        Self::Mercury,
        Self::Jupiter,
        Self::Venus,
        Self::Saturn,
    ];

    /// Position in [`Graha::ALL`].
    #[must_use]
    pub const fn index(self) -> usize {
        self as usize
    }

    /// The lowercase key the payloads use.
    #[must_use]
    pub const fn key(self) -> &'static str {
        match self {
            Self::Sun => "sun",
            Self::Moon => "moon",
            Self::Mars => "mars",
            Self::Mercury => "mercury",
            Self::Jupiter => "jupiter",
            Self::Venus => "venus",
            Self::Saturn => "saturn",
            Self::Rahu => "rahu",
            Self::Ketu => "ketu",
        }
    }

    /// The graha for a payload key.
    #[must_use]
    pub fn from_key(key: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|g| g.key() == key)
    }

    /// `PLANET_EN`.
    #[must_use]
    pub const fn en(self) -> &'static str {
        match self {
            Self::Sun => "Sun",
            Self::Moon => "Moon",
            Self::Mars => "Mars",
            Self::Mercury => "Mercury",
            Self::Jupiter => "Jupiter",
            Self::Venus => "Venus",
            Self::Saturn => "Saturn",
            Self::Rahu => "Rahu",
            Self::Ketu => "Ketu",
        }
    }

    /// `PLANET_NE`.
    #[must_use]
    pub const fn ne(self) -> &'static str {
        match self {
            Self::Sun => "सूर्य",
            Self::Moon => "चन्द्र",
            Self::Mars => "मंगल",
            Self::Mercury => "बुध",
            Self::Jupiter => "बृहस्पति",
            Self::Venus => "शुक्र",
            Self::Saturn => "शनि",
            Self::Rahu => "राहु",
            Self::Ketu => "केतु",
        }
    }

    /// `EXALT_SIGN`: deep-exaltation sign (0-based); the nodes have none.
    #[must_use]
    pub const fn exalt_sign(self) -> Option<usize> {
        match self {
            Self::Sun => Some(0),
            Self::Moon => Some(1),
            Self::Mars => Some(9),
            Self::Mercury => Some(5),
            Self::Jupiter => Some(3),
            Self::Venus => Some(11),
            Self::Saturn => Some(6),
            Self::Rahu | Self::Ketu => None,
        }
    }

    /// `OWN_SIGNS` (0-based).
    #[must_use]
    pub const fn own_signs(self) -> &'static [usize] {
        match self {
            Self::Sun => &[4],
            Self::Moon => &[3],
            Self::Mars => &[0, 7],
            Self::Mercury => &[2, 5],
            Self::Jupiter => &[8, 11],
            Self::Venus => &[1, 6],
            Self::Saturn => &[9, 10],
            Self::Rahu | Self::Ketu => &[],
        }
    }

    /// `MOOLA`: moolatrikona sign (0-based) and the degree range within it.
    #[must_use]
    pub const fn moolatrikona(self) -> Option<(usize, f64, f64)> {
        match self {
            Self::Sun => Some((4, 0.0, 20.0)),
            Self::Moon => Some((1, 4.0, 30.0)),
            Self::Mars => Some((0, 0.0, 12.0)),
            Self::Mercury => Some((5, 16.0, 20.0)),
            Self::Jupiter => Some((8, 0.0, 10.0)),
            Self::Venus => Some((6, 0.0, 15.0)),
            Self::Saturn => Some((10, 0.0, 20.0)),
            Self::Rahu | Self::Ketu => None,
        }
    }

    /// `FRIENDS` (naisargika).
    #[must_use]
    pub const fn friends(self) -> &'static [Self] {
        match self {
            Self::Sun => &[Self::Moon, Self::Mars, Self::Jupiter],
            Self::Moon => &[Self::Sun, Self::Mercury],
            Self::Mars => &[Self::Sun, Self::Moon, Self::Jupiter],
            Self::Mercury => &[Self::Sun, Self::Venus],
            Self::Jupiter => &[Self::Sun, Self::Moon, Self::Mars],
            Self::Venus => &[Self::Mercury, Self::Saturn],
            Self::Saturn => &[Self::Mercury, Self::Venus],
            Self::Rahu | Self::Ketu => &[],
        }
    }

    /// `ENEMIES` (naisargika).
    #[must_use]
    pub const fn enemies(self) -> &'static [Self] {
        match self {
            Self::Sun => &[Self::Venus, Self::Saturn],
            Self::Mars => &[Self::Mercury],
            Self::Mercury => &[Self::Moon],
            Self::Jupiter => &[Self::Mercury, Self::Venus],
            Self::Venus => &[Self::Sun, Self::Moon],
            Self::Saturn => &[Self::Sun, Self::Moon, Self::Mars],
            Self::Moon | Self::Rahu | Self::Ketu => &[],
        }
    }

    /// `NAISARGIKA` bala in virupas (`engine/jyotish/shadbala.py`); the nodes have none.
    #[must_use]
    pub const fn naisargika_virupas(self) -> Option<f64> {
        match self {
            Self::Sun => Some(60.0),
            Self::Moon => Some(51.43),
            Self::Venus => Some(42.86),
            Self::Jupiter => Some(34.29),
            Self::Mercury => Some(25.71),
            Self::Mars => Some(17.14),
            Self::Saturn => Some(8.57),
            Self::Rahu | Self::Ketu => None,
        }
    }
}

/// `SIGN_LORD`, Mesha first.
pub const SIGN_LORD: [Graha; 12] = [
    Graha::Mars,
    Graha::Venus,
    Graha::Mercury,
    Graha::Moon,
    Graha::Sun,
    Graha::Mercury,
    Graha::Venus,
    Graha::Mars,
    Graha::Jupiter,
    Graha::Saturn,
    Graha::Saturn,
    Graha::Jupiter,
];
