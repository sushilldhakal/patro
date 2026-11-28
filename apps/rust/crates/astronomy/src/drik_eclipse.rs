//! Solar and lunar eclipses under `siddhanta=drik`, from our own ephemeris ([`DrikSky`]): the
//! geometry of the Sun, the Moon and the Earth's shadow, not the text's rules. The Python server
//! asked Swiss Ephemeris for the same (`sol_eclipse_when_glob`, `lun_eclipse_when`,
//! `sol_eclipse_when_loc`); this answers each of those questions from apparent geocentric
//! positions on the mean equator of date.
//!
//! - Lunar: the Moon's distance from the anti-Sun against the umbra and penumbra radii (Danjon's
//!   rule: the Earth's radius enlarged by 1/85 for the atmosphere). Visible when the Moon is up at
//!   some moment of the eclipse.
//! - Solar, global: the shadow axis' closest pass to the Earth's centre against the penumbra
//!   (eclipse anywhere) and the Earth's radius (central: total or annular by the umbra's sign).
//! - Solar, local: the topocentric Sun and Moon discs overlap; contacts where their limbs touch;
//!   visible when the Sun's upper limb is above the horizon at some moment between them.

use crate::{angles::signed180, drik::DrikSky, surya_siddhanta::Body};

const EARTH_RADIUS_KM: f64 = 6378.14;
const EARTH_FLATTENING: f64 = 1.0 / 298.257;
const SUN_RADIUS_KM: f64 = 696_000.0;
const MOON_RADIUS_KM: f64 = 1737.4;
/// Danjon's enlargement of the Earth's shadow for its atmosphere.
const DANJON: f64 = 1.0 + 1.0 / 85.0;
/// Geocentric altitude of the Sun's upper limb on the horizon (refraction + semi-diameter).
const SUN_UPPER_LIMB: f64 = -0.8333;
/// Half-width (days) searched around a syzygy for the maximum and the contacts.
const WINDOW: f64 = 0.3;
/// Sampling step (days) for "above the horizon at some moment": 5 minutes.
const VISIBILITY_STEP: f64 = 5.0 / 1440.0;

/// What kind of eclipse, worldwide (solar) or for everyone the Moon is up for (lunar).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DrikEclipseType {
    /// The Sun or the Moon wholly covered.
    Total,
    /// A ring of the Sun left around the Moon.
    Annular,
    /// Partly covered (the Moon partly in the umbra).
    Partial,
    /// The Moon only in the penumbra.
    Penumbral,
}

impl DrikEclipseType {
    /// The payload's `type` key.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Total => "total",
            Self::Annular => "annular",
            Self::Partial => "partial",
            Self::Penumbral => "penumbral",
        }
    }
}

/// One eclipse as the year page lists it.
#[derive(Clone, Copy, Debug)]
pub struct DrikEclipse {
    /// Its type.
    pub eclipse_type: DrikEclipseType,
    /// Greatest eclipse (JD UT): solar worldwide, lunar the Moon deepest in the shadow.
    pub max_jd: f64,
    /// Seen from the observer.
    pub visible: bool,
    /// Solar: the observer's first and last contact. Lunar: the umbral (partial) phase.
    pub begin_jd: Option<f64>,
    /// See `begin_jd`.
    pub end_jd: Option<f64>,
    /// Lunar only: the penumbral phase.
    pub penumbral: Option<(f64, f64)>,
}

type Vec3 = [f64; 3];

fn sub(a: Vec3, b: Vec3) -> Vec3 {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
fn dot(a: Vec3, b: Vec3) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
fn norm(a: Vec3) -> f64 {
    dot(a, a).sqrt()
}
fn angle(a: Vec3, b: Vec3) -> f64 {
    (dot(a, b) / (norm(a) * norm(b)))
        .clamp(-1.0, 1.0)
        .acos()
        .to_degrees()
}

/// Geocentric equatorial position, km.
fn vector(sky: &DrikSky, body: Body, jd: f64) -> Vec3 {
    let (ra, dec, dist) = sky.equatorial(body, jd);
    let (ra, dec) = (ra.to_radians(), dec.to_radians());
    [
        dist * dec.cos() * ra.cos(),
        dist * dec.cos() * ra.sin(),
        dist * dec.sin(),
    ]
}

/// The observer on the ellipsoid (sea level), same frame, km.
fn observer(jd: f64, lat: f64, lon: f64) -> Vec3 {
    let phi = lat.to_radians();
    let u = ((1.0 - EARTH_FLATTENING) * phi.tan()).atan();
    let (rho_cos, rho_sin) = (u.cos(), (1.0 - EARTH_FLATTENING) * u.sin());
    let theta = DrikSky::local_sidereal_degrees(jd, lon).to_radians();
    [
        EARTH_RADIUS_KM * rho_cos * theta.cos(),
        EARTH_RADIUS_KM * rho_cos * theta.sin(),
        EARTH_RADIUS_KM * rho_sin,
    ]
}

fn asin_deg(x: f64) -> f64 {
    x.clamp(-1.0, 1.0).asin().to_degrees()
}

/// Root of `f` in `[a, b]` by bisection (`f(a)` and `f(b)` of opposite sign), to ~0.01 s.
fn bisect(f: impl Fn(f64) -> f64, mut a: f64, mut b: f64) -> Option<f64> {
    let (mut fa, fb) = (f(a), f(b));
    if !(fa.is_finite() && fb.is_finite()) || fa.signum() == fb.signum() {
        return None;
    }
    for _ in 0..48 {
        let m = f64::midpoint(a, b);
        let fm = f(m);
        if fm.signum() == fa.signum() {
            (a, fa) = (m, fm);
        } else {
            b = m;
        }
    }
    Some(f64::midpoint(a, b))
}

/// Minimum of a unimodal `f` on `[a, b]` by golden section.
fn minimum(f: impl Fn(f64) -> f64, mut lo: f64, mut hi: f64) -> f64 {
    let ratio = 0.5 * (5f64.sqrt() - 1.0);
    let (mut left, mut right) = (hi - ratio * (hi - lo), lo + ratio * (hi - lo));
    let (mut f_left, mut f_right) = (f(left), f(right));
    while hi - lo > 1e-7 {
        if f_left < f_right {
            (hi, right, f_right) = (right, left, f_left);
            left = hi - ratio * (hi - lo);
            f_left = f(left);
        } else {
            (lo, left, f_left) = (left, right, f_right);
            right = lo + ratio * (hi - lo);
            f_right = f(right);
        }
    }
    f64::midpoint(lo, hi)
}

/// Each new (`target` 0) or full (180) moon in `[start, end)`, JD UT.
fn syzygies(sky: &DrikSky, start: f64, end: f64, target: f64) -> Vec<f64> {
    let elong = |t: f64| {
        signed180(sky.true_position(Body::Moon, t).0 - sky.true_position(Body::Sun, t).0 - target)
    };
    let mut out = Vec::new();
    let mut t = start;
    let mut prev = elong(t);
    while t < end {
        let next = elong(t + 1.0);
        // The elongation grows ~12°/day; a − → + step is the syzygy, + → − is the wrap.
        if prev < 0.0 && next >= 0.0 {
            if let Some(root) = bisect(elong, t, t + 1.0) {
                if root < end {
                    out.push(root);
                }
            }
        }
        t += 1.0;
        prev = next;
    }
    out
}

/// Whether `up` holds at some moment in `[a, b]`.
fn ever(up: impl Fn(f64) -> bool, a: f64, b: f64) -> bool {
    let mut t = a;
    while t < b {
        if up(t) {
            return true;
        }
        t += VISIBILITY_STEP;
    }
    up(b)
}

/// Lunar eclipses whose maximum falls in `[start, end)`.
#[must_use]
pub fn lunar_eclipses(sky: &DrikSky, start: f64, end: f64, lat: f64, lon: f64) -> Vec<DrikEclipse> {
    // (distance of the Moon from the anti-Sun, umbra edge, penumbra edge) for the Moon's limb.
    let shadow = |t: f64| {
        let (s, m) = (vector(sky, Body::Sun, t), vector(sky, Body::Moon, t));
        let anti = [-s[0], -s[1], -s[2]];
        let (ds, dm) = (norm(s), norm(m));
        let (pm, ps) = (
            asin_deg(EARTH_RADIUS_KM / dm),
            asin_deg(EARTH_RADIUS_KM / ds),
        );
        let (ss, sm) = (asin_deg(SUN_RADIUS_KM / ds), asin_deg(MOON_RADIUS_KM / dm));
        (
            angle(m, anti),
            DANJON * pm + ps - ss + sm,
            DANJON * pm + ps + ss + sm,
            sm,
        )
    };
    let mut out = Vec::new();
    for full in syzygies(sky, start - 1.0, end + 1.0, 180.0) {
        let max = minimum(|t| shadow(t).0, full - WINDOW, full + WINDOW);
        if max < start || max >= end {
            continue;
        }
        let (d, umbra, penumbra, sm) = shadow(max);
        if d >= penumbra {
            continue;
        }
        let eclipse_type = if d < umbra - 2.0 * sm {
            DrikEclipseType::Total
        } else if d < umbra {
            DrikEclipseType::Partial
        } else {
            DrikEclipseType::Penumbral
        };
        let contacts = |edge: fn((f64, f64, f64, f64)) -> f64| {
            let g = |t: f64| shadow(t).0 - edge(shadow(t));
            Some((bisect(g, max - WINDOW, max)?, bisect(g, max, max + WINDOW)?))
        };
        let partial = if eclipse_type == DrikEclipseType::Penumbral {
            None
        } else {
            contacts(|s| s.1)
        };
        let penumbral = contacts(|s| s.2);
        let (a, b) = partial.or(penumbral).unwrap_or((max, max));
        let visible = ever(|t| sky.altitude(Body::Moon, t, lat, lon) > 0.0, a, b);
        out.push(DrikEclipse {
            eclipse_type,
            max_jd: max,
            visible,
            begin_jd: partial.map(|p| p.0),
            end_jd: partial.map(|p| p.1),
            penumbral,
        });
    }
    out
}

/// Solar eclipses whose greatest eclipse falls in `[start, end)`, with the observer's contacts.
#[must_use]
pub fn solar_eclipses(sky: &DrikSky, start: f64, end: f64, lat: f64, lon: f64) -> Vec<DrikEclipse> {
    // The shadow axis (Sun → Moon, onwards): its distance from the Earth's centre, and the
    // penumbra and umbra radii on the plane through the centre square to it.
    let axis = |t: f64| {
        let (s, m) = (vector(sky, Body::Sun, t), vector(sky, Body::Moon, t));
        let sm = sub(m, s);
        let len = norm(sm);
        let u = [sm[0] / len, sm[1] / len, sm[2] / len];
        let along = -dot(m, u);
        let foot = [
            m[0] + along * u[0],
            m[1] + along * u[1],
            m[2] + along * u[2],
        ];
        let (f1, f2) = (
            ((SUN_RADIUS_KM + MOON_RADIUS_KM) / len).asin(),
            ((SUN_RADIUS_KM - MOON_RADIUS_KM) / len).asin(),
        );
        (norm(foot), along, f1.tan(), f2.tan())
    };
    // Topocentric: limb-to-limb separation of the discs (negative while they overlap).
    let overlap = |t: f64| {
        let o = observer(t, lat, lon);
        let (s, m) = (
            sub(vector(sky, Body::Sun, t), o),
            sub(vector(sky, Body::Moon, t), o),
        );
        angle(s, m) - asin_deg(SUN_RADIUS_KM / norm(s)) - asin_deg(MOON_RADIUS_KM / norm(m))
    };
    let mut out = Vec::new();
    for new in syzygies(sky, start - 1.0, end + 1.0, 0.0) {
        let max = minimum(|t| axis(t).0, new - WINDOW, new + WINDOW);
        if max < start || max >= end {
            continue;
        }
        let (p, along, tan1, tan2) = axis(max);
        let penumbra = MOON_RADIUS_KM + along * tan1;
        if p >= EARTH_RADIUS_KM + penumbra {
            continue;
        }
        // On the surface under the axis (central) or the plane through the centre (not).
        let surface = if p < EARTH_RADIUS_KM {
            along - (EARTH_RADIUS_KM.powi(2) - p * p).sqrt()
        } else {
            along
        };
        let umbra = MOON_RADIUS_KM - surface * tan2;
        let eclipse_type = if p < EARTH_RADIUS_KM + umbra.abs() {
            if umbra > 0.0 {
                DrikEclipseType::Total
            } else {
                DrikEclipseType::Annular
            }
        } else {
            DrikEclipseType::Partial
        };
        let local = minimum(overlap, max - WINDOW, max + WINDOW);
        let contacts = if overlap(local) < 0.0 {
            bisect(overlap, local - WINDOW, local).zip(bisect(overlap, local, local + WINDOW))
        } else {
            None
        };
        let visible = contacts.is_some_and(|(a, b)| {
            ever(
                |t| sky.altitude(Body::Sun, t, lat, lon) > SUN_UPPER_LIMB,
                a,
                b,
            )
        });
        out.push(DrikEclipse {
            eclipse_type,
            max_jd: max,
            visible,
            begin_jd: contacts.filter(|_| visible).map(|c| c.0),
            end_jd: contacts.filter(|_| visible).map(|c| c.1),
            penumbral: None,
        });
    }
    out
}
