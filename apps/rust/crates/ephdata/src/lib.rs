//! Our own ephemeris, from the JPL development ephemerides (DE440/DE441).
//!
//! The pipeline, in the order the data flows:
//! - [`daf`]: reads a JPL SPK kernel (type 2, Chebyshev) once, at build time.
//! - [`kernel`]: our compact binary format (`.veph`) and the native evaluator. The
//!   Chebyshev coefficients are kept as the JPL fit made them.
//! - [`frames`], [`deltat`]: our own coordinate transformations (IAU 2006
//!   precession, mean obliquity, ΔT) and the Lahiri zero point.
//! - [`sky`]: Sun, Moon and planets as sidereal longitudes, apparent places.
//! - [`index`]: every anga boundary, sankranti, lunar phase, graha ingress and
//!   station, solved once and stored in a second binary file (`.vidx`), so a request
//!   reads an answer instead of solving for it.

#![expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    clippy::cast_possible_wrap,
    clippy::similar_names,
    clippy::many_single_char_names,
    reason = "numeric code: Julian Days, bit widths and table offsets move between f64 and integers on purpose, every one range-checked by the format or the tests"
)]

pub mod analytic;
pub mod analytic_data;
pub mod daf;
pub mod deltat;
pub mod frames;
pub mod index;
pub mod kernel;
pub mod sky;

pub use index::{Crossing, Index, Kind, Source};
pub use kernel::Kernel;
pub use sky::{Body, Place, Sky};
