//! Deciding which side of a known root an instant lies on.
//!
//! A search that bisects on "has the index changed yet?" makes the same choice at
//! every midpoint as "is the midpoint past the root?", except within a hair of the
//! root, where floating-point noise in the positions decides. With the root known
//! to well under [`NEAR_DAYS`], a caller can replay such a bisection with plain
//! comparisons and evaluate the real predicate only inside that hair, landing on
//! exactly the instant the full bisection lands on.

/// Half-width (days, about 1.7 ms) of the band around a root inside which the real
/// predicate is evaluated. Roots are solved to about 2e-9 days, ten times finer.
pub const NEAR_DAYS: f64 = 2e-8;

/// Whether `jd` lies within [`NEAR_DAYS`] of `root`.
#[must_use]
pub fn near(jd: f64, root: f64) -> bool {
    (jd - root).abs() < NEAR_DAYS
}
