//! Which siddhanta answers: the Surya Siddhanta, or drik from our own ephemeris.
//!
//! A `System` is a small `Copy` value passed explicitly to everything that needs a
//! position, a frame or a horizon crossing. There is no global and no thread-local, so
//! threads that build months in parallel each carry their own. The Surya Siddhanta
//! variant forwards to the text's functions unchanged; drik reads [`DrikSky`].

use ephdata::Index;

use crate::{
    drik::DrikSky,
    position::{Ephemeris, Pos},
    surya_siddhanta::{
        self, Body, Crossing, SPEED_HALF_STEP, next_ascendant_crossing, next_lagna_change,
    },
};

/// The siddhanta a request is answered by.
#[derive(Debug, Clone, Copy, Default)]
pub enum System {
    /// The text's own model (the server's default).
    #[default]
    SuryaSiddhanta,
    /// Our own ephemeris, loaded once at startup.
    Drik(&'static DrikSky),
}

impl PartialEq for System {
    fn eq(&self, other: &Self) -> bool {
        self.key() == other.key()
    }
}
impl Eq for System {}
impl std::hash::Hash for System {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.key().hash(state);
    }
}

impl System {
    /// A value that tells systems apart, for cache keys: 0 for the Surya Siddhanta,
    /// the address of the loaded sky for drik.
    #[must_use]
    pub fn key(self) -> usize {
        match self {
            Self::SuryaSiddhanta => 0,
            Self::Drik(sky) => std::ptr::from_ref(sky) as usize,
        }
    }

    /// Whether this is drik.
    #[must_use]
    pub const fn is_drik(self) -> bool {
        matches!(self, Self::Drik(_))
    }

    /// The API's name for the siddhanta.
    #[must_use]
    pub const fn label(self) -> &'static str {
        match self {
            Self::SuryaSiddhanta => "surya_siddhanta",
            Self::Drik(_) => "drik",
        }
    }

    /// The drik sky, when this is drik.
    #[must_use]
    pub const fn drik(self) -> Option<&'static DrikSky> {
        match self {
            Self::SuryaSiddhanta => None,
            Self::Drik(sky) => Some(sky),
        }
    }

    /// (sidereal longitude, latitude) in degrees, unwrapped as the text returns it.
    #[must_use]
    pub fn true_position(self, body: Body, jd_ut: f64) -> (f64, f64) {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::true_position(body, jd_ut),
            Self::Drik(sky) => sky.true_position(body, jd_ut),
        }
    }

    /// (longitude, speed in degrees per day).
    #[must_use]
    pub fn true_longitude_and_speed(self, body: Body, jd_ut: f64) -> (f64, f64) {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::true_longitude_and_speed(body, jd_ut),
            Self::Drik(sky) => sky.true_longitude_and_speed(body, jd_ut),
        }
    }

    /// Days kept clear of the kernel's ends: a day's panchanga reads the next sunrise,
    /// the next lunar month's boundaries and a sankranti search, all ahead of the day.
    pub const EDGE_MARGIN_DAYS: f64 = 90.0;

    /// Whether this system answers for the Julian Day `jd_ut`: the Surya Siddhanta for
    /// any day, drik inside its kernel (less [`Self::EDGE_MARGIN_DAYS`] at each end).
    #[must_use]
    pub fn supports_jd(self, jd_ut: f64) -> bool {
        match self {
            Self::SuryaSiddhanta => true,
            Self::Drik(sky) => {
                let (first, last) = sky.coverage_jd_ut();
                jd_ut.is_finite()
                    && jd_ut >= first + Self::EDGE_MARGIN_DAYS
                    && jd_ut <= last - Self::EDGE_MARGIN_DAYS
            }
        }
    }

    /// The first and last Gregorian-or-Julian years drik answers for, `None` for the text.
    #[must_use]
    pub fn supported_years(self) -> Option<(i32, i32)> {
        let (first, last) = self.drik()?.coverage_jd_ut();
        let year = |jd: f64| timescale::CivilDay::from_jd_ut(jd).year;
        Some((
            year(first + Self::EDGE_MARGIN_DAYS),
            year(last - Self::EDGE_MARGIN_DAYS),
        ))
    }

    /// The ayanamsha (sayana − nirayana), degrees.
    #[must_use]
    pub fn ayanamsha(self, jd_ut: f64) -> f64 {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::ayanamsha(jd_ut),
            Self::Drik(sky) => sky.ayanamsha(jd_ut),
        }
    }

    /// (right ascension, declination) in degrees of a sayana ecliptic place at `jd_ut`:
    /// the text's 24° obliquity, or drik's mean obliquity of date.
    #[must_use]
    pub fn equatorial(self, sayana_longitude: f64, latitude: f64, jd_ut: f64) -> (f64, f64) {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::equatorial(sayana_longitude, latitude),
            Self::Drik(_) => {
                crate::drik::ra_dec(sayana_longitude, latitude, DrikSky::obliquity_of(jd_ut))
            }
        }
    }

    /// The obliquity of the ecliptic, degrees: the text's fixed 24°, or drik's mean obliquity of date.
    #[must_use]
    pub fn obliquity_degrees(self, jd_ut: f64) -> f64 {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::OBLIQUITY,
            Self::Drik(_) => DrikSky::obliquity_of(jd_ut).to_degrees(),
        }
    }

    /// Local sidereal time as an angle, degrees.
    #[must_use]
    pub fn local_sidereal_degrees(self, jd_ut: f64, longitude: f64) -> f64 {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::local_sidereal_degrees(jd_ut, longitude),
            Self::Drik(_) => DrikSky::local_sidereal_degrees(jd_ut, longitude),
        }
    }

    /// The sidereal ascendant, degrees.
    #[must_use]
    pub fn ascendant(self, jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::ascendant(jd_ut, latitude, longitude),
            Self::Drik(sky) => sky.ascendant(jd_ut, latitude, longitude),
        }
    }

    /// The sayana ascendant, degrees.
    #[must_use]
    pub fn ascendant_sayana(self, jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::ascendant_sayana(jd_ut, latitude, longitude),
            Self::Drik(_) => DrikSky::ascendant_sayana(jd_ut, latitude, longitude),
        }
    }

    /// Apparent − mean solar time, days.
    #[must_use]
    pub fn equation_of_time_days(self, jd_ut: f64) -> f64 {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::equation_of_time_days(jd_ut),
            Self::Drik(sky) => sky.equation_of_time_days(jd_ut),
        }
    }

    /// Geometric altitude of a body's centre, degrees.
    #[must_use]
    pub fn altitude(self, body: Body, jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::altitude(body, jd_ut, latitude, longitude),
            Self::Drik(sky) => sky.altitude(body, jd_ut, latitude, longitude),
        }
    }

    /// The first rise or set of `body` after `jd_start`. The text's horizon is the
    /// centre on the geometric horizon; drik's is the upper limb with refraction (and the
    /// Moon's parallax).
    #[must_use]
    pub fn next_rise_or_set(
        self,
        body: Body,
        jd_start: f64,
        latitude: f64,
        longitude: f64,
        crossing: Crossing,
    ) -> Option<f64> {
        match self {
            Self::SuryaSiddhanta => surya_siddhanta::next_rise_or_set(
                body, jd_start, latitude, longitude, crossing, 0.0,
            ),
            Self::Drik(sky) => sky.next_rise_or_set(body, jd_start, latitude, longitude, crossing),
        }
    }

    /// Every retrograde or direct station of a planet with `from < jd <= to`, as
    /// `(jd, turned_retrograde)`, read from the stored events: `None` when this system
    /// stores none for the span (the text, or a span outside the index) or the body has
    /// no stations (the luminaries and the node).
    #[must_use]
    pub fn station_events(self, body: Body, from: f64, to: f64) -> Option<Vec<(f64, bool)>> {
        use ephdata::index::{Graha, Series};
        let graha = match body {
            Body::Mercury => Graha::Mercury,
            Body::Venus => Graha::Venus,
            Body::Mars => Graha::Mars,
            Body::Jupiter => Graha::Jupiter,
            Body::Saturn => Graha::Saturn,
            Body::Sun | Body::Moon | Body::Rahu => return None,
        };
        let index = self.drik()?.index()?;
        let (a, b) = index.coverage();
        (from.is_finite() && to.is_finite() && from >= a && to <= b).then(|| {
            index
                .series_between(Series::Station(graha), from, to)
                .into_iter()
                .map(|(jd, payload)| (jd, payload == 1))
                .collect()
        })
    }

    /// The first instant after `jd_from` the sidereal ascendant reaches `target`.
    #[must_use]
    pub fn next_ascendant_crossing(
        self,
        jd_from: f64,
        latitude: f64,
        longitude: f64,
        target: f64,
    ) -> Option<f64> {
        match self {
            Self::SuryaSiddhanta => next_ascendant_crossing(jd_from, latitude, longitude, target),
            Self::Drik(sky) => crate::drik_lagna::next_ascendant_crossing(
                sky, jd_from, latitude, longitude, target,
            ),
        }
    }

    /// The first instant after `jd_from` the ascendant enters the next 30° sign.
    #[must_use]
    pub fn next_lagna_change(self, jd_from: f64, latitude: f64, longitude: f64) -> Option<f64> {
        match self {
            Self::SuryaSiddhanta => next_lagna_change(jd_from, latitude, longitude),
            Self::Drik(sky) => {
                let current = sky.ascendant(jd_from, latitude, longitude);
                let target = ((current / 30.0).floor() + 1.0) * 30.0;
                crate::drik_lagna::next_ascendant_crossing(
                    sky, jd_from, latitude, longitude, target,
                )
            }
        }
    }

    /// Half-width of the speed difference, days (shared by both systems).
    pub const SPEED_HALF_STEP: f64 = SPEED_HALF_STEP;
}

impl Ephemeris for System {
    fn name(&self) -> &'static str {
        match self {
            Self::SuryaSiddhanta => "surya_siddhanta",
            Self::Drik(sky) => sky.name(),
        }
    }

    fn pos(&self, jd_ut: f64) -> Pos {
        match self {
            Self::SuryaSiddhanta => Pos {
                sun: crate::engine::sun_longitude(*self, jd_ut),
                moon: crate::engine::moon_longitude(*self, jd_ut),
            },
            Self::Drik(sky) => sky.pos(jd_ut),
        }
    }

    fn index(&self) -> Option<&Index> {
        match self {
            Self::SuryaSiddhanta => None,
            Self::Drik(sky) => sky.index(),
        }
    }
}
