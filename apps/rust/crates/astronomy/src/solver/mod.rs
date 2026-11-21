//! Root finding for angles that sweep forward: when does an angle reach a value?
//!
//! [`next_crossing`] brackets the crossing from the angle's mean motion and closes the
//! bracket with the Illinois method, a safeguarded secant: a handful of position
//! evaluations per event, where a fixed-step scan and a bisection take dozens.
//! [`near`] tells a replayed bisection when an instant is too close to a known root
//! to decide without evaluating.

mod bracket;
mod newton;

pub use bracket::{NEAR_DAYS, near};
pub use newton::{Crossing, illinois, next_crossing};
