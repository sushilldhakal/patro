//! The angas as one table: which angle each one counts, and in what span.

use crate::position::Pos;

use super::wrap360;

const NAKSHATRA_SPAN: f64 = 360.0 / 27.0;

/// An angle that counts in equal spans: each anga, the Moon's and the Sun's rashi
/// and nakshatra. A boundary is where the angle reaches a multiple of the span.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Anga {
    /// Moon − Sun in 12° spans (30 a lunation).
    Tithi,
    /// Moon − Sun in 6° spans (60 a lunation).
    Karana,
    /// The Moon in 13°20′ spans.
    Nakshatra,
    /// The Moon in 3°20′ spans (108 padas, four to a nakshatra).
    Pada,
    /// Sun + Moon in 13°20′ spans.
    Yoga,
    /// The Moon in 30° spans.
    MoonRashi,
    /// The Sun in 13°20′ spans.
    SunNakshatra,
    /// The Sun in 30° spans: each boundary is a sankranti.
    Sankranti,
    /// The Sun in 1° spans (the degree within its rashi, for baana).
    SunDegree,
}

impl Anga {
    /// Every anga, for building the event tables.
    pub const ALL: [Self; 9] = [
        Self::Tithi,
        Self::Karana,
        Self::Nakshatra,
        Self::Pada,
        Self::Yoga,
        Self::MoonRashi,
        Self::SunNakshatra,
        Self::Sankranti,
        Self::SunDegree,
    ];

    /// The angle this anga counts, in [0, 360).
    #[must_use]
    pub fn angle(self, p: &Pos) -> f64 {
        match self {
            Self::Tithi | Self::Karana => wrap360(p.moon - p.sun),
            Self::Nakshatra | Self::Pada | Self::MoonRashi => p.moon,
            Self::Yoga => wrap360(p.sun + p.moon),
            Self::SunNakshatra | Self::Sankranti | Self::SunDegree => p.sun,
        }
    }

    /// Degrees in one span.
    #[must_use]
    pub const fn span(self) -> f64 {
        match self {
            Self::Tithi => 12.0,
            Self::Karana => 6.0,
            Self::Nakshatra | Self::Yoga | Self::SunNakshatra => NAKSHATRA_SPAN,
            Self::Pada => NAKSHATRA_SPAN / 4.0,
            Self::MoonRashi | Self::Sankranti => 30.0,
            Self::SunDegree => 1.0,
        }
    }

    /// How many spans make the circle.
    #[must_use]
    pub const fn count(self) -> u32 {
        match self {
            Self::Tithi => 30,
            Self::Karana => 60,
            Self::Nakshatra | Self::Yoga | Self::SunNakshatra => 27,
            Self::Pada => 108,
            Self::MoonRashi | Self::Sankranti => 12,
            Self::SunDegree => 360,
        }
    }

    /// Mean motion of the angle, degrees a day (the solver's first step).
    #[must_use]
    pub const fn mean_rate(self) -> f64 {
        match self {
            Self::Tithi | Self::Karana => 12.190_75,
            Self::Nakshatra | Self::Pada | Self::MoonRashi => 13.176_36,
            Self::Yoga => 14.162,
            Self::SunNakshatra | Self::Sankranti | Self::SunDegree => 0.985_6,
        }
    }

    /// The 0-based span the angle is in.
    #[must_use]
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "the angle is in [0, 360), so the ratio is below the count"
    )]
    pub fn index(self, p: &Pos) -> u32 {
        (self.angle(p) / self.span()) as u32 % self.count()
    }
}
