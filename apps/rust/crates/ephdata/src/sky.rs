//! The sky from our kernel: Sun, Moon and planets as apparent sidereal longitudes.
//!
//! Positions are geocentric and apparent (light-time and annual aberration), on the
//! mean ecliptic of date, less the Lahiri ayanamsha. The ayanamsha is a zero point
//! fixed in the ICRS: the point that lay at tropical longitude 23°14′43.89″ on the
//! mean ecliptic of 1956-09-23 (the Indian Calendar Reform Committee's value), carried
//! to any date by our own precession.

use std::path::Path;

use crate::{
    deltat::{J2000, tt_to_et, ut_to_tt},
    frames::{self, Mat3},
    kernel::{C_KM_S, Kernel, KernelError, State},
};

/// Mean Lahiri ayanamsha at the epoch, degrees (the nutation-free value).
const LAHIRI_AT_EPOCH: f64 = 23.245_524_743;
/// 1956-09-23 0h.
const LAHIRI_EPOCH_JD: f64 = 2_435_553.5;

/// A body the sky can place.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Body {
    /// The Sun.
    Sun,
    /// The Moon.
    Moon,
    /// Mercury.
    Mercury,
    /// Venus.
    Venus,
    /// Mars.
    Mars,
    /// Jupiter.
    Jupiter,
    /// Saturn.
    Saturn,
    /// Uranus.
    Uranus,
    /// Neptune.
    Neptune,
    /// Pluto.
    Pluto,
}

impl Body {
    /// The five visible planets of the patro.
    pub const GRAHAS: [Self; 5] = [
        Self::Mercury,
        Self::Venus,
        Self::Mars,
        Self::Jupiter,
        Self::Saturn,
    ];
}

/// Which corrections a place carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Place {
    /// Straight from the kernel, no light-time.
    Geometric,
    /// Light-time corrected (the astrometric place).
    Astrometric,
    /// Light-time and annual aberration (what an observer sees).
    Apparent,
}

/// A place on the ecliptic.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Ecliptic {
    /// Longitude in degrees, [0, 360).
    pub lon: f64,
    /// Latitude in degrees.
    pub lat: f64,
    /// Distance in km.
    pub distance_km: f64,
}

/// Our ephemeris: the kernel plus the segment slots the sky reads.
#[derive(Debug, Clone)]
pub struct Sky {
    kernel: Kernel,
    sun: usize,
    emb: usize,
    earth: usize,
    moon: usize,
    planets: [usize; 8],
    zero_icrs: [f64; 3],
}

fn sub(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

fn add(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

fn norm(a: [f64; 3]) -> f64 {
    (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]).sqrt()
}

fn cross(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

/// SOFA's first-order-exact aberration of a direction by an observer velocity (in c).
fn aberrate(direction: [f64; 3], v: [f64; 3]) -> [f64; 3] {
    let len = norm(direction);
    let p = [direction[0] / len, direction[1] / len, direction[2] / len];
    let bm1 = (1.0 - (v[0] * v[0] + v[1] * v[1] + v[2] * v[2])).sqrt();
    let pdv = p[0] * v[0] + p[1] * v[1] + p[2] * v[2];
    let w1 = 1.0 + pdv / (1.0 + bm1);
    let q = [
        p[0] * bm1 + w1 * v[0],
        p[1] * bm1 + w1 * v[1],
        p[2] * bm1 + w1 * v[2],
    ];
    let n = norm(q);
    [q[0] / n * len, q[1] / n * len, q[2] / n * len]
}

impl Sky {
    /// Opens a `.veph` kernel.
    ///
    /// # Errors
    ///
    /// [`KernelError`] for an unreadable kernel.
    pub fn open(path: &Path) -> Result<Self, KernelError> {
        Self::new(Kernel::open(path)?)
    }

    /// The sky over an already loaded kernel.
    ///
    /// # Errors
    ///
    /// [`KernelError::MissingSegment`] when the kernel lacks a body.
    pub fn new(kernel: Kernel) -> Result<Self, KernelError> {
        let slot = |t, c| kernel.segment(t, c);
        let planets = [
            slot(1, 0)?,
            slot(2, 0)?,
            slot(4, 0)?,
            slot(5, 0)?,
            slot(6, 0)?,
            slot(7, 0)?,
            slot(8, 0)?,
            slot(9, 0)?,
        ];
        let mut sky = Self {
            sun: slot(10, 0)?,
            emb: slot(3, 0)?,
            earth: slot(399, 3)?,
            moon: slot(301, 3)?,
            planets,
            zero_icrs: [1.0, 0.0, 0.0],
            kernel,
        };
        let m0 = frames::ecliptic_of_date((LAHIRI_EPOCH_JD - J2000) / 36_525.0);
        let a0 = LAHIRI_AT_EPOCH.to_radians();
        sky.zero_icrs = frames::apply_transpose(&m0, &[a0.cos(), a0.sin(), 0.0]);
        Ok(sky)
    }

    /// The underlying kernel.
    #[must_use]
    pub const fn kernel(&self) -> &Kernel {
        &self.kernel
    }

    /// The Julian Days (UT) the data covers, with a day of margin for light-time.
    #[must_use]
    pub fn coverage_jd_ut(&self) -> (f64, f64) {
        let (a, b) = self.kernel.coverage();
        (
            crate::deltat::et_to_ut(a) + 1.0,
            crate::deltat::et_to_ut(b) - 1.0,
        )
    }

    fn earth_state(&self, et: f64) -> Result<State, KernelError> {
        let emb = self.kernel.eval(self.emb, et)?;
        let rel = self.kernel.eval(self.earth, et)?;
        Ok(State {
            pos: add(emb.pos, rel.pos),
            vel: add(emb.vel, rel.vel),
        })
    }

    fn barycentric(&self, body: Body, et: f64) -> Result<[f64; 3], KernelError> {
        Ok(match body {
            Body::Sun => self.kernel.eval_pos(self.sun, et)?,
            Body::Moon => add(
                self.kernel.eval_pos(self.emb, et)?,
                self.kernel.eval_pos(self.moon, et)?,
            ),
            other => {
                let i = match other {
                    Body::Mercury => 0,
                    Body::Venus => 1,
                    Body::Mars => 2,
                    Body::Jupiter => 3,
                    Body::Saturn => 4,
                    Body::Uranus => 5,
                    Body::Neptune => 6,
                    _ => 7,
                };
                self.kernel.eval_pos(self.planets[i], et)?
            }
        })
    }

    /// The geocentric ICRS vector (km) of `body` at `et`, with the corrections `place`
    /// names, given the Earth's state.
    fn geocentric_with(
        &self,
        body: Body,
        et: f64,
        earth: &State,
        place: Place,
    ) -> Result<[f64; 3], KernelError> {
        let mut v = sub(self.barycentric(body, et)?, earth.pos);
        if place != Place::Geometric {
            for _ in 0..3 {
                let tau = norm(v) / C_KM_S;
                v = sub(self.barycentric(body, et - tau)?, earth.pos);
            }
        }
        if place == Place::Apparent {
            let b = [
                earth.vel[0] / C_KM_S,
                earth.vel[1] / C_KM_S,
                earth.vel[2] / C_KM_S,
            ];
            v = aberrate(v, b);
        }
        Ok(v)
    }

    fn rotation(jd_tt: f64) -> Mat3 {
        frames::ecliptic_of_date((jd_tt - J2000) / 36_525.0)
    }

    /// The Lahiri ayanamsha in degrees at `jd_ut`.
    #[must_use]
    pub fn ayanamsha(&self, jd_ut: f64) -> f64 {
        self.ayanamsha_with(&Self::rotation(ut_to_tt(jd_ut)))
    }

    fn ayanamsha_with(&self, m: &Mat3) -> f64 {
        let z = frames::apply(m, &self.zero_icrs);
        z[1].atan2(z[0]).to_degrees()
    }

    /// The tropical ecliptic place of `body` on the mean ecliptic of date.
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the data.
    pub fn ecliptic(&self, body: Body, jd_ut: f64, place: Place) -> Result<Ecliptic, KernelError> {
        let jd_tt = ut_to_tt(jd_ut);
        let et = tt_to_et(jd_tt);
        let earth = self.earth_state(et)?;
        let v = self.geocentric_with(body, et, &earth, place)?;
        let (lon, lat, distance_km) = frames::spherical(&frames::apply(&Self::rotation(jd_tt), &v));
        Ok(Ecliptic {
            lon,
            lat,
            distance_km,
        })
    }

    /// The sidereal ecliptic place of `body` on the mean ecliptic of date:
    /// [`Self::ecliptic`]'s longitude minus the ayanamsha from the *same*
    /// rotation, so one rotation serves both instead of two.
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the data.
    pub fn sidereal_place(
        &self,
        body: Body,
        jd_ut: f64,
        place: Place,
    ) -> Result<Ecliptic, KernelError> {
        let jd_tt = ut_to_tt(jd_ut);
        let et = tt_to_et(jd_tt);
        let earth = self.earth_state(et)?;
        let m = Self::rotation(jd_tt);
        let v = self.geocentric_with(body, et, &earth, place)?;
        let (lon, lat, distance_km) = frames::spherical(&frames::apply(&m, &v));
        Ok(Ecliptic {
            lon: lon - self.ayanamsha_with(&m),
            lat,
            distance_km,
        })
    }

    /// The apparent sidereal longitude of `body`, degrees in [0, 360).
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the data.
    pub fn sidereal_longitude(&self, body: Body, jd_ut: f64) -> Result<f64, KernelError> {
        let jd_tt = ut_to_tt(jd_ut);
        let et = tt_to_et(jd_tt);
        let earth = self.earth_state(et)?;
        let m = Self::rotation(jd_tt);
        let v = self.geocentric_with(body, et, &earth, Place::Apparent)?;
        let (lon, _, _) = frames::spherical(&frames::apply(&m, &v));
        Ok((lon - self.ayanamsha_with(&m)).rem_euclid(360.0))
    }

    /// The apparent sidereal longitudes of the Sun and the Moon: the pair every anga
    /// is made from, sharing one Earth state and one rotation.
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the data.
    pub fn sun_moon(&self, jd_ut: f64) -> Result<(f64, f64), KernelError> {
        let jd_tt = ut_to_tt(jd_ut);
        let et = tt_to_et(jd_tt);
        let earth = self.earth_state(et)?;
        let m = Self::rotation(jd_tt);
        let ayan = self.ayanamsha_with(&m);
        let lon = |body| -> Result<f64, KernelError> {
            let v = self.geocentric_with(body, et, &earth, Place::Apparent)?;
            let (l, _, _) = frames::spherical(&frames::apply(&m, &v));
            Ok((l - ayan).rem_euclid(360.0))
        };
        Ok((lon(Body::Sun)?, lon(Body::Moon)?))
    }

    /// Rahu, the Moon's osculating ascending node, as a sidereal longitude (degrees).
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the data.
    pub fn true_node(&self, jd_ut: f64) -> Result<f64, KernelError> {
        let jd_tt = ut_to_tt(jd_ut);
        let et = tt_to_et(jd_tt);
        let rel = self.kernel.eval(self.moon, et)?;
        let m = Self::rotation(jd_tt);
        let r = frames::apply(&m, &rel.pos);
        let v = frames::apply(&m, &rel.vel);
        let h = cross(r, v);
        let node = h[0].atan2(-h[1]).to_degrees();
        Ok((node - self.ayanamsha_with(&m)).rem_euclid(360.0))
    }
}
