//! True positions: the manda and शीघ्र corrections of chapter II.

use super::{
    body::{Body, MeanBody, StarPlanet},
    modulo::{signed, wrap},
    yuga::{mean_longitude, planet_apsis, planet_node},
};

/// Epicycle circumference in degrees at the end of the even and the odd quadrant.
#[derive(Debug, Clone, Copy)]
struct Epicycle {
    even: f64,
    odd: f64,
}

impl Epicycle {
    /// The epicycle shrinks from its even- to its odd-quadrant size with |sin anomaly|.
    fn at(self, anomaly: f64) -> f64 {
        self.even - (self.even - self.odd) * anomaly.to_radians().sin().abs()
    }
}

/// The equation's owner: the Sun, the Moon, or a star-planet.
#[derive(Debug, Clone, Copy)]
enum Luminary {
    Sun,
    Moon,
    Planet(StarPlanet),
}

const fn manda_epicycle(of: Luminary) -> Epicycle {
    let (even, odd) = match of {
        Luminary::Sun => (14.0, 13.0 + 40.0 / 60.0),
        Luminary::Moon => (32.0, 31.0 + 40.0 / 60.0),
        Luminary::Planet(StarPlanet::Mars) => (75.0, 72.0),
        Luminary::Planet(StarPlanet::Mercury) => (30.0, 28.0),
        Luminary::Planet(StarPlanet::Jupiter) => (33.0, 32.0),
        Luminary::Planet(StarPlanet::Venus) => (12.0, 11.0),
        Luminary::Planet(StarPlanet::Saturn) => (49.0, 48.0),
    };
    Epicycle { even, odd }
}

const fn sighra_epicycle(planet: StarPlanet) -> Epicycle {
    let (even, odd) = match planet {
        StarPlanet::Mars => (235.0, 232.0),
        StarPlanet::Mercury => (133.0, 132.0),
        StarPlanet::Jupiter => (70.0, 72.0),
        StarPlanet::Venus => (262.0, 260.0),
        StarPlanet::Saturn => (39.0, 40.0),
    };
    Epicycle { even, odd }
}

/// Greatest latitudes (Burgess I.68–70), degrees.
const MOON_MAX_LATITUDE: f64 = 4.5;
const fn max_latitude(planet: StarPlanet) -> f64 {
    match planet {
        StarPlanet::Mars => 1.5,
        StarPlanet::Jupiter => 1.0,
        StarPlanet::Mercury | StarPlanet::Venus | StarPlanet::Saturn => 2.0,
    }
}

/// Correction (degrees) to add: negative while the planet runs from its apsis to 180° past it.
fn manda_equation(of: Luminary, longitude: f64, apsis: f64) -> f64 {
    let anomaly = longitude - apsis;
    let c = manda_epicycle(of).at(anomaly);
    -(c / 360.0 * anomaly.to_radians().sin()).asin().to_degrees()
}

/// The शीघ्र correction to add, and the शीघ्र कर्ण as a fraction of the radius.
#[derive(Debug, Clone, Copy)]
struct Sighra {
    correction: f64,
    karna: f64,
}

fn sighra_equation(planet: StarPlanet, longitude: f64, sighrocca: f64) -> Sighra {
    let anomaly = sighrocca - longitude;
    let c = sighra_epicycle(planet).at(anomaly) / 360.0;
    let a = anomaly.to_radians();
    let (across, along) = (c * a.sin(), 1.0 + c * a.cos());
    Sighra {
        correction: across.atan2(along).to_degrees(),
        karna: across.hypot(along),
    }
}

/// (true longitude, latitude) of a star-planet by the four steps of chapter II.
fn star_planet(planet: StarPlanet, jd_ut: f64) -> (f64, f64) {
    let sun = mean_longitude(MeanBody::Sun, jd_ut);
    let (mean, sighrocca) = match planet {
        StarPlanet::Mercury => (sun, mean_longitude(MeanBody::MercurySighra, jd_ut)),
        StarPlanet::Venus => (sun, mean_longitude(MeanBody::VenusSighra, jd_ut)),
        StarPlanet::Mars => (mean_longitude(MeanBody::Mars, jd_ut), sun),
        StarPlanet::Jupiter => (mean_longitude(MeanBody::Jupiter, jd_ut), sun),
        StarPlanet::Saturn => (mean_longitude(MeanBody::Saturn, jd_ut), sun),
    };
    let of = Luminary::Planet(planet);
    let apsis = planet_apsis(Some(planet), jd_ut);
    let p1 = mean + sighra_equation(planet, mean, sighrocca).correction / 2.0;
    let p2 = p1 + manda_equation(of, p1, apsis) / 2.0;
    let p3 = mean + manda_equation(of, p2, apsis);
    let Sighra { correction, karna } = sighra_equation(planet, p3, sighrocca);
    let true_longitude = wrap(p3 + correction);
    // Latitude: from the manda planet (superior) or the शीघ्रोच्च (inferior), scaled by the कर्ण.
    let from = if planet.is_inferior() { sighrocca } else { p3 };
    let argument = from - planet_node(planet, jd_ut);
    let latitude = max_latitude(planet) * argument.to_radians().sin() / karna;
    (true_longitude, latitude)
}

/// (निरयण true longitude, latitude) in degrees. Rahu is the mean ascending node.
///
/// Memoized per `(body, jd)` in `cache::positions`: the text is pure
/// arithmetic, so a repeat at the same JD returns the cached value.
#[must_use]
pub fn true_position(body: Body, jd_ut: f64) -> (f64, f64) {
    crate::cache::memo_position(0, body as u8, jd_ut, || true_position_uncached(body, jd_ut))
}

fn true_position_uncached(body: Body, jd_ut: f64) -> (f64, f64) {
    match body {
        Body::Sun => {
            let mean = mean_longitude(MeanBody::Sun, jd_ut);
            (
                wrap(mean + manda_equation(Luminary::Sun, mean, planet_apsis(None, jd_ut))),
                0.0,
            )
        }
        Body::Moon => {
            let mean = mean_longitude(MeanBody::Moon, jd_ut);
            let apogee = mean_longitude(MeanBody::MoonApogee, jd_ut);
            let true_longitude = wrap(mean + manda_equation(Luminary::Moon, mean, apogee));
            let node = mean_longitude(MeanBody::MoonNode, jd_ut);
            (
                true_longitude,
                MOON_MAX_LATITUDE * (true_longitude - node).to_radians().sin(),
            )
        }
        Body::Rahu => (mean_longitude(MeanBody::MoonNode, jd_ut), 0.0),
        Body::Mars => star_planet(StarPlanet::Mars, jd_ut),
        Body::Mercury => star_planet(StarPlanet::Mercury, jd_ut),
        Body::Jupiter => star_planet(StarPlanet::Jupiter, jd_ut),
        Body::Venus => star_planet(StarPlanet::Venus, jd_ut),
        Body::Saturn => star_planet(StarPlanet::Saturn, jd_ut),
    }
}

/// Half-width (days) of the central difference that gives speeds.
pub const SPEED_HALF_STEP: f64 = 0.5;

/// (true longitude in degrees, speed in degrees per day) by a central difference.
#[must_use]
pub fn true_longitude_and_speed(body: Body, jd_ut: f64) -> (f64, f64) {
    let lon = true_position(body, jd_ut).0;
    let ahead = true_position(body, jd_ut + SPEED_HALF_STEP).0;
    let behind = true_position(body, jd_ut - SPEED_HALF_STEP).0;
    (lon, signed(ahead - behind) / (2.0 * SPEED_HALF_STEP))
}
