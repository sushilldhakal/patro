//! सूर्य सिद्धान्त: graha positions computed the way the Surya Siddhanta prescribes.
//!
//! Pure arithmetic, no ephemeris files and no ΔT: the text's own model, followed as
//! written (Burgess's translation, chapters I–V), so it answers for any day of the
//! current mahayuga, back to the start of सत्य युग and beyond.
//!
//! A port of `apps/api/engine/astronomy/siddhanta/surya_siddhanta_math.py` that
//! returns the same numbers; `PORTING.md` maps every Python function to its Rust
//! equivalent.
//!
//! How a position is found:
//!
//! 1. **Ahargana**: civil days since the Kali epoch, midnight on the Ujjain meridian
//!    at the start of 18 Feb 3102 BCE (Julian).
//! 2. **Mean longitude**: revolutions per mahayuga (or per kalpa, for apsides and
//!    nodes) × days ÷ days per mahayuga, kept exact with integers.
//! 3. **True longitude**: the manda correction for the Sun and Moon, the four-step
//!    manda + शीघ्र procedure of chapter II for the five star-planets.
//! 4. **Ayanamsha**: the libration of the equinox, swinging ±27°.
//!
//! Positions are निरयण (sidereal) by construction; sayana ones add the ayanamsha.

mod body;
mod eclipse;
mod frame;
mod lagna;
mod modulo;
mod position;
mod rise_set;
mod yuga;

pub use body::{Body, MeanBody, ParseBodyError, StarPlanet};
pub use eclipse::{
    Eclipse, EclipseKind, EclipseMeasures, EclipseType, LocalSolarEclipse, LunarEclipse,
    SolarEclipse, eclipse_measures, elongation, lunar_eclipse_at, moon_latitude_minutes,
    next_eclipse, next_syzygy, solar_eclipse_global, solar_eclipse_local,
};
pub use frame::{
    OBLIQUITY, altitude, ascendant, ascendant_sayana, ayanamsha, equation_of_time_days, equatorial,
    local_sidereal_degrees,
};
pub use lagna::{next_ascendant_crossing, next_lagna_change};
pub use position::{SPEED_HALF_STEP, true_longitude_and_speed, true_position};
pub use rise_set::{Crossing, next_rise_or_set};
pub use yuga::{
    DAYS_CREATION_TO_KALI, KALI_EPOCH_JD, KALPA_DAYS, MAHAYUGA_DAYS, MAHAYUGA_YEARS,
    SATYA_YUGA_START_JD, YEAR_DAYS, ahargana, apsis_longitude, mean_longitude,
    mean_sign_ingresses_since_kali, node_longitude,
};

/// Which way a search runs in time.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
pub enum Direction {
    /// Later than the starting moment.
    #[default]
    Forward,
    /// Earlier than the starting moment.
    Backward,
}
