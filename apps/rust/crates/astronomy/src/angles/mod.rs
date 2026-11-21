//! Angles on the circle and the angas defined on them.
//!
//! Every anga, sankranti and rashi change is the same question: when does one
//! angle (Moon − Sun, Moon, Sun + Moon, Sun) reach the next multiple of a fixed
//! span? [`Anga`] is that table; the event engine answers the question once for all.

mod anga;
mod angular_math;

pub use anga::Anga;
pub use angular_math::{signed180, wrap360};
