//! Astronomy for Vedic Patro: graha positions and everything derived from them.
//!
//! [`surya_siddhanta`] is the text's own model, the default calculation system of
//! the patro; [`engine`] is what the panchanga builders ask of it. A drik (Swiss Ephemeris) module will sit beside it.

pub mod engine;
pub mod surya_siddhanta;
