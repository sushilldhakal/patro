//! Drik frames and positions from our own ephemeris (`ephdata`): no tables of the
//! text's, no Swiss Ephemeris. Everything here is a few evaluations of [`ephdata::Sky`].
//!
//! The ecliptic places `Sky` returns are apparent and on the mean equinox of date, so
//! the equator used for hour angles is the mean equator of date as well: mean
//! obliquity (IAU 2006) and mean sidereal time, one consistent frame. Nutation (up to
//! 17″) is left out; it moves a rise or an ascendant by about a second.

use std::sync::{Arc, LazyLock};

use ephdata::{Body as SkyBody, Index, Place, Sky, deltat::J2000, frames::mean_obliquity};

use crate::{
    angles::{signed180, wrap360},
    cache::Cache,
    position::{Ephemeris, OwnDrik},
    solver::illinois,
    surya_siddhanta::{Body, Crossing},
};

/// Half-width (days) of the central difference that gives speeds (as the text's path).
const SPEED_HALF_STEP: f64 = 0.5;
/// Geocentric altitude of the Sun's upper limb at rising: refraction 34′ + semi-diameter 16′.
const SUN_HORIZON: f64 = -0.8333;
/// Standard refraction at the horizon, degrees (the Moon's horizon adds its parallax).
const REFRACTION: f64 = 0.5667;
/// Equatorial radius of the Earth, km.
const EARTH_RADIUS_KM: f64 = 6378.14;
/// Scan step (days) and window for the fallback search.
const SCAN_STEP: f64 = 1.0 / 48.0;
const SCAN_WINDOW: f64 = 1.6;
const BISECTIONS: usize = 32;
/// Half-width (days) of the bracket around a predicted crossing.
const BRACKET: f64 = 0.03;
/// Prediction passes for the Moon, whose right ascension moves quickly.
const MOVING_BODY_PASSES: usize = 4;
/// Degrees the sidereal time advances in a solar day.
const SIDEREAL_RATE: f64 = 360.985_647_366_29;

type RiseKey = (u8, u8, u64, u64, u64, usize);

static RISE_SET: LazyLock<Cache<RiseKey, Option<f64>>> = LazyLock::new(|| Cache::new(1 << 16));

/// Our own sky and, when the server has it, the stored events: the data behind
/// [`System::Drik`](crate::System::Drik). Immutable once built.
#[derive(Debug)]
pub struct DrikSky {
    own: OwnDrik,
}

fn sky_body(body: Body) -> Option<SkyBody> {
    Some(match body {
        Body::Sun => SkyBody::Sun,
        Body::Moon => SkyBody::Moon,
        Body::Mars => SkyBody::Mars,
        Body::Mercury => SkyBody::Mercury,
        Body::Jupiter => SkyBody::Jupiter,
        Body::Venus => SkyBody::Venus,
        Body::Saturn => SkyBody::Saturn,
        Body::Rahu => return None,
    })
}

const fn body_id(body: Body) -> u8 {
    body as u8
}

impl DrikSky {
    /// A drik sky over `sky`, reading boundaries from `index` where it has them.
    #[must_use]
    pub fn new(sky: Arc<Sky>, index: Option<Arc<Index>>) -> Self {
        let own = OwnDrik::new(sky);
        Self {
            own: match index {
                Some(index) => own.with_index(index),
                None => own,
            },
        }
    }

    /// The position source (an [`Ephemeris`]) behind this sky.
    #[must_use]
    pub const fn ephemeris(&self) -> &OwnDrik {
        &self.own
    }

    /// The kernel's sky.
    #[must_use]
    pub fn sky(&self) -> &Sky {
        self.own.sky()
    }

    /// The stored events, if loaded.
    #[must_use]
    pub fn index(&self) -> Option<&Index> {
        self.own.index()
    }

    /// The span (JD UT) the kernel covers.
    #[must_use]
    pub fn coverage_jd_ut(&self) -> (f64, f64) {
        self.sky().coverage_jd_ut()
    }

    /// Sidereal (Lahiri) longitude and latitude of `body`, degrees; NaN outside the kernel.
    #[must_use]
    pub fn true_position(&self, body: Body, jd_ut: f64) -> (f64, f64) {
        let Some(sky_body) = sky_body(body) else {
            return (self.sky().true_node(jd_ut).unwrap_or(f64::NAN), 0.0);
        };
        match self.sky().ecliptic(sky_body, jd_ut, Place::Apparent) {
            Ok(e) => (wrap360(e.lon - self.sky().ayanamsha(jd_ut)), e.lat),
            Err(_) => (f64::NAN, f64::NAN),
        }
    }

    /// Longitude and speed (degrees per day) by a central difference.
    #[must_use]
    pub fn true_longitude_and_speed(&self, body: Body, jd_ut: f64) -> (f64, f64) {
        let at = |t: f64| self.true_position(body, t).0;
        let ahead = at(jd_ut + SPEED_HALF_STEP);
        let behind = at(jd_ut - SPEED_HALF_STEP);
        (
            at(jd_ut),
            signed180(ahead - behind) / (2.0 * SPEED_HALF_STEP),
        )
    }

    /// The Lahiri ayanamsha, degrees.
    #[must_use]
    pub fn ayanamsha(&self, jd_ut: f64) -> f64 {
        self.sky().ayanamsha(jd_ut)
    }

    /// Mean sidereal time at Greenwich, degrees (IAU 2006; UT stands for UT1).
    #[must_use]
    pub fn greenwich_sidereal_degrees(jd_ut: f64) -> f64 {
        let du = jd_ut - J2000;
        let era = 360.0 * (0.779_057_273_264_0 + 1.002_737_811_911_354_6 * du).rem_euclid(1.0);
        let t = (ephdata::deltat::ut_to_tt(jd_ut) - J2000) / 36_525.0;
        let arcsec = 0.014_506
            + t * (4_612.156_534
                + t * (1.391_581_7
                    + t * (-0.000_000_44 + t * (-0.000_029_956 + t * -0.000_000_036_8))));
        wrap360(era + arcsec / 3600.0)
    }

    /// Local mean sidereal time, degrees.
    #[must_use]
    pub fn local_sidereal_degrees(jd_ut: f64, longitude: f64) -> f64 {
        wrap360(Self::greenwich_sidereal_degrees(jd_ut) + longitude)
    }

    /// Mean obliquity of date, radians.
    #[must_use]
    pub fn obliquity_of(jd_ut: f64) -> f64 {
        mean_obliquity((ephdata::deltat::ut_to_tt(jd_ut) - J2000) / 36_525.0)
    }

    /// (right ascension, declination, distance in km) on the mean equator of date.
    #[must_use]
    pub fn equatorial(&self, body: Body, jd_ut: f64) -> (f64, f64, f64) {
        let Some(sky_body) = sky_body(body) else {
            let lon = self.true_position(Body::Rahu, jd_ut).0 + self.ayanamsha(jd_ut);
            let (ra, dec) = ra_dec(lon, 0.0, Self::obliquity_of(jd_ut));
            return (ra, dec, f64::NAN);
        };
        match self.sky().ecliptic(sky_body, jd_ut, Place::Apparent) {
            Ok(e) => {
                let (ra, dec) = ra_dec(e.lon, e.lat, Self::obliquity_of(jd_ut));
                (ra, dec, e.distance_km)
            }
            Err(_) => (f64::NAN, f64::NAN, f64::NAN),
        }
    }

    /// Geocentric altitude of a body's centre, degrees.
    #[must_use]
    pub fn altitude(&self, body: Body, jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
        let (ra, dec, _) = self.equatorial(body, jd_ut);
        altitude_of(
            ra,
            dec,
            Self::local_sidereal_degrees(jd_ut, longitude),
            latitude,
        )
    }

    /// The rising point of the ecliptic on the equinox of date, degrees.
    #[must_use]
    pub fn ascendant_sayana(jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
        let ramc = Self::local_sidereal_degrees(jd_ut, longitude).to_radians();
        let (eps, phi) = (Self::obliquity_of(jd_ut), latitude.to_radians());
        let asc = ramc
            .cos()
            .atan2(-(ramc.sin() * eps.cos() + phi.tan() * eps.sin()));
        wrap360(asc.to_degrees())
    }

    /// The sidereal (Lahiri) ascendant, degrees.
    #[must_use]
    pub fn ascendant(&self, jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
        wrap360(Self::ascendant_sayana(jd_ut, latitude, longitude) - self.ayanamsha(jd_ut))
    }

    /// Apparent − mean solar time, in days (Meeus 28.1 on the apparent Sun).
    #[must_use]
    pub fn equation_of_time_days(&self, jd_ut: f64) -> f64 {
        let t = (ephdata::deltat::ut_to_tt(jd_ut) - J2000) / 36_525.0;
        let mean = 280.466_46 + t * (36_000.769_83 + t * 0.000_303_2);
        let (ra, _, _) = self.equatorial(Body::Sun, jd_ut);
        signed180(mean - 0.005_718_3 - ra) / 360.0
    }

    /// The horizon altitude of a body's centre at rise or set.
    fn horizon(&self, body: Body, jd_ut: f64) -> f64 {
        match body {
            Body::Sun => SUN_HORIZON,
            Body::Moon => {
                let (_, _, distance) = self.equatorial(Body::Moon, jd_ut);
                0.7275 * (EARTH_RADIUS_KM / distance).asin().to_degrees() - REFRACTION
            }
            _ => -REFRACTION,
        }
    }

    /// The first rise or set of `body` after `jd_start`, or `None` when it does not
    /// cross within 1.6 days. Memoized per start, place and system.
    #[must_use]
    pub fn next_rise_or_set(
        &self,
        body: Body,
        jd_start: f64,
        latitude: f64,
        longitude: f64,
        crossing: Crossing,
    ) -> Option<f64> {
        let key = (
            body_id(body),
            u8::from(crossing == Crossing::Set),
            jd_start.to_bits(),
            latitude.to_bits(),
            longitude.to_bits(),
            std::ptr::from_ref(self) as usize,
        );
        RISE_SET.get_or_insert_with(key, || {
            self.direct_crossing(body, jd_start, latitude, longitude, crossing)
                .or_else(|| self.scan(body, jd_start, latitude, longitude, crossing))
        })
    }

    fn above(&self, body: Body, t: f64, latitude: f64, longitude: f64) -> f64 {
        self.altitude(body, t, latitude, longitude) - self.horizon(body, t)
    }

    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "the window over the step is the constant 76.8, truncated"
    )]
    fn scan(
        &self,
        body: Body,
        jd_start: f64,
        latitude: f64,
        longitude: f64,
        crossing: Crossing,
    ) -> Option<f64> {
        let rising = crossing == Crossing::Rise;
        let above = |t: f64| self.above(body, t, latitude, longitude);
        let (mut t0, mut a0) = (jd_start, above(jd_start));
        for _ in 0..(SCAN_WINDOW / SCAN_STEP) as usize {
            let t1 = t0 + SCAN_STEP;
            let a1 = above(t1);
            let crossed = if rising {
                a0 < 0.0 && 0.0 <= a1
            } else {
                a0 >= 0.0 && 0.0 > a1
            };
            if crossed {
                let (mut lo, mut hi) = (t0, t1);
                for _ in 0..BISECTIONS {
                    let mid = f64::midpoint(lo, hi);
                    if (above(mid) >= 0.0) == rising {
                        hi = mid;
                    } else {
                        lo = mid;
                    }
                }
                return Some(f64::midpoint(lo, hi));
            }
            (t0, a0) = (t1, a1);
        }
        None
    }

    fn direct_crossing(
        &self,
        body: Body,
        jd_start: f64,
        latitude: f64,
        longitude: f64,
        crossing: Crossing,
    ) -> Option<f64> {
        let rising = crossing == Crossing::Rise;
        let passes = if body == Body::Sun {
            1
        } else {
            MOVING_BODY_PASSES
        };
        let lst_start = Self::local_sidereal_degrees(jd_start, longitude);
        let phi = latitude.to_radians();
        let mut estimate = jd_start + 0.5;
        for _ in 0..passes {
            let (ra, dec, _) = self.equatorial(body, estimate);
            let (d, h) = (dec.to_radians(), self.horizon(body, estimate).to_radians());
            let cos_h0 = (h.sin() - phi.sin() * d.sin()) / (phi.cos() * d.cos());
            if cos_h0.is_nan() || cos_h0.abs() >= 0.85 {
                return None;
            }
            let h0 = cos_h0.acos().to_degrees();
            let target = if rising { -h0 } else { h0 };
            estimate = jd_start + wrap360(target + ra - lst_start) / SIDEREAL_RATE;
        }
        let (lo, hi) = (estimate - BRACKET, estimate + BRACKET);
        let day_earlier = estimate - 1.0;
        if lo <= jd_start
            || day_earlier + 2.0 * BRACKET >= jd_start
            || hi >= jd_start + SCAN_WINDOW - SCAN_STEP
        {
            return None;
        }
        let sign = if rising { 1.0 } else { -1.0 };
        let g = |t: f64| sign * self.above(body, t, latitude, longitude);
        let (g_lo, g_hi) = (g(lo), g(hi));
        if !(g_lo < 0.0 && g_hi > 0.0) {
            return None;
        }
        Some(illinois(g, lo, g_lo, hi, g_hi))
    }
}

/// Altitude (degrees) of a place at right ascension `ra` and declination `dec` for an
/// observer at `latitude` with local sidereal time `lst`.
fn altitude_of(ra: f64, dec: f64, lst: f64, latitude: f64) -> f64 {
    let hour = (lst - ra).to_radians();
    let (phi, d) = (latitude.to_radians(), dec.to_radians());
    (phi.sin() * d.sin() + phi.cos() * d.cos() * hour.cos())
        .asin()
        .to_degrees()
}

/// (right ascension, declination) in degrees of an ecliptic place for obliquity `eps`.
pub(crate) fn ra_dec(lon: f64, lat: f64, eps: f64) -> (f64, f64) {
    let (lam, beta) = (lon.to_radians(), lat.to_radians());
    let ra = (lam.sin() * eps.cos() - beta.tan() * eps.sin()).atan2(lam.cos());
    let dec = (beta.sin() * eps.cos() + beta.cos() * eps.sin() * lam.sin()).asin();
    (wrap360(ra.to_degrees()), dec.to_degrees())
}

impl Ephemeris for DrikSky {
    fn name(&self) -> &'static str {
        self.own.name()
    }

    fn pos(&self, jd_ut: f64) -> crate::position::Pos {
        self.own.pos(jd_ut)
    }

    fn index(&self) -> Option<&Index> {
        self.own.index()
    }
}
