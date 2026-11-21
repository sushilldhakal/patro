//! One position engine behind one trait, whichever siddhanta answers.
//!
//! Everything above this layer (angas, events, sankrantis, the year tables) asks an
//! [`Ephemeris`] for the Sun and the Moon and never cares which system computed them.

#[cfg(feature = "drik")]
mod drik;
mod surya_siddhanta;

#[cfg(feature = "drik")]
pub use drik::Drik;
pub use surya_siddhanta::SuryaSiddhanta;

/// The Sun and the Moon at one instant: sidereal longitudes in [0, 360).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Pos {
    /// The Sun's sidereal longitude.
    pub sun: f64,
    /// The Moon's sidereal longitude.
    pub moon: f64,
}

/// A source of Sun and Moon positions.
pub trait Ephemeris: Sync {
    /// A short stable name, part of every cache key built on these positions.
    fn name(&self) -> &'static str;

    /// The Sun and the Moon at `jd_ut`.
    fn pos(&self, jd_ut: f64) -> Pos;
}
