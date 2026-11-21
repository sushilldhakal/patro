//! `DayFrame` and `build_day_frame`: everything one sunrise contributes, computed once
//! and read twelve times.

use astronomy::surya_siddhanta::{Body, ascendant, ayanamsha, equatorial, true_position};
use panchanga::{
    daily::{DailyError, Location},
    graha_positions, hora_slots,
    pyfloat::{py_floordiv, py_int, py_mod, py_round},
    sun_times, sunrise_on, vara,
};
use serde_json::Value;
use timescale::CivilDay;

use crate::{Graha, ashtakavarga::Ashtakavarga, ashtakavarga::sign_of};

/// Grahas the day lord is diurnal / nocturnal for (`DIURNAL_GRAHAS`, `NOCTURNAL_GRAHAS`).
const NATONNATA_SWING: f64 = 0.6;

/// One graha at the frame's sunrise.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Placement {
    pub(crate) longitude: f64,
    pub(crate) deg_in_rashi: f64,
    pub(crate) retrograde: bool,
    pub(crate) combust: bool,
}

/// `DayFrame`.
#[derive(Debug, Clone)]
pub(crate) struct DayFrame {
    pub(crate) date: CivilDay,
    pub(crate) jd_sunrise: f64,
    /// Sunday = 0.
    pub(crate) vaara_num: u32,
    /// By [`Graha::index`].
    pub(crate) positions: [Placement; 9],
    /// Sign (0-based) of each graha, by [`Graha::index`].
    pub(crate) graha_sign: [usize; 9],
    pub(crate) lagna_sign: usize,
    pub(crate) tithi_index: i64,
    pub(crate) day_fraction: f64,
    pub(crate) sav: [u32; 12],
    /// Bhinnashtakavarga of the seven grahas (sun … saturn).
    pub(crate) bav: [[u32; 12]; 7],
    /// The 24 hora slots (daily only).
    pub(crate) hora: Option<Value>,
}

impl DayFrame {
    /// The same sunrise read against another Ashtakavarga (the natal chart's), without
    /// the hora window.
    pub(crate) fn with_ashtakavarga(&self, sav: [u32; 12], bav: &[[u32; 12]; 7]) -> Self {
        Self {
            date: self.date,
            jd_sunrise: self.jd_sunrise,
            vaara_num: self.vaara_num,
            positions: self.positions,
            graha_sign: self.graha_sign,
            lagna_sign: self.lagna_sign,
            tithi_index: self.tithi_index,
            day_fraction: self.day_fraction,
            sav,
            bav: *bav,
            hora: None,
        }
    }

    pub(crate) fn sign(&self, graha: Graha) -> usize {
        self.graha_sign[graha.index()]
    }

    pub(crate) fn moon_sign(&self) -> usize {
        self.sign(Graha::Moon)
    }

    pub(crate) fn sun_sign(&self) -> usize {
        self.sign(Graha::Sun)
    }

    pub(crate) fn moon_is_waxing(&self) -> bool {
        self.tithi_index < 15
    }

    pub(crate) fn paksha(&self) -> &'static str {
        if self.moon_is_waxing() {
            "shukla"
        } else {
            "krishna"
        }
    }

    /// `natonnata`: the diurnal / nocturnal strength factor.
    pub(crate) fn natonnata(&self, graha: Graha) -> f64 {
        let share = match graha {
            Graha::Sun | Graha::Jupiter | Graha::Venus => self.day_fraction,
            Graha::Moon | Graha::Mars | Graha::Saturn => 1.0 - self.day_fraction,
            _ => return 1.0,
        };
        1.0 + (share - 0.5) * NATONNATA_SWING
    }
}

/// `day_fraction_for`: the share of 24 hours the Sun is up, from `cos H = -tan φ tan δ`.
fn day_fraction_for(latitude: f64, declination: f64) -> f64 {
    let product = -latitude.to_radians().tan() * declination.to_radians().tan();
    if product <= -1.0 {
        return 1.0;
    }
    if product >= 1.0 {
        return 0.0;
    }
    product.acos().to_degrees() / 180.0
}

/// `sun_service.declination`: the Sun's क्रान्ति under the Surya Siddhanta, to 4 places.
fn sun_declination(jd: f64) -> f64 {
    let (lon, lat) = true_position(Body::Sun, jd);
    let (_, dec) = equatorial(lon + ayanamsha(jd), lat);
    py_round(dec, 4)
}

/// Key order of `spashta_table` → [`Graha`].
fn graha_for_key(key: &str) -> Graha {
    Graha::from_key(key).unwrap_or(Graha::Sun)
}

/// Whether a frame pays for the sunset and next-sunrise solves of the hora window.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Hora {
    /// Daily: the lucky-hora window is shown.
    Include,
    /// Aggregate windows: no hora.
    Skip,
}

/// `build_day_frame(greg, location, with_hora=…)`.
pub(crate) fn build_day_frame(
    day: CivilDay,
    location: &Location,
    hora: Hora,
) -> Result<DayFrame, DailyError> {
    let sunrise = sunrise_on(day, location)?;
    let jd_sunrise = sunrise.to_jd();

    let mut positions = [Placement {
        longitude: 0.0,
        deg_in_rashi: 0.0,
        retrograde: false,
        combust: false,
    }; 9];
    let mut graha_sign = [0usize; 9];
    for row in graha_positions(jd_sunrise) {
        let g = graha_for_key(row.key);
        positions[g.index()] = Placement {
            longitude: row.longitude,
            deg_in_rashi: row.deg_in_rashi,
            retrograde: row.is_retrograde,
            combust: row.is_combust,
        };
        graha_sign[g.index()] = sign_of(row.longitude);
    }

    let asc = ascendant(jd_sunrise, location.lat, location.lon);
    let lagna_sign = usize::try_from(py_int(asc / 30.0) % 12).unwrap_or(0);
    let lagna_longitude = py_round(asc, 6);

    let elongation = py_mod(
        positions[Graha::Moon.index()].longitude - positions[Graha::Sun.index()].longitude,
        360.0,
    );
    let tithi_index = py_int(py_floordiv(elongation, 12.0));

    let day_fraction = day_fraction_for(location.lat, sun_declination(jd_sunrise));

    let mut seven = [0usize; 7];
    for (i, g) in Graha::SEVEN.iter().enumerate() {
        seven[i] = graha_sign[g.index()];
    }
    let av = Ashtakavarga::cast(seven, sign_of(lagna_longitude));

    let vaara_num = vara(jd_sunrise, &location.zone).number;

    let hora = if hora == Hora::Include {
        sun_times(day, location).ok().map(|t| {
            hora_slots(
                t.sunrise,
                t.sunset,
                t.next_sunrise,
                vaara_num,
                &location.zone,
            )
        })
    } else {
        None
    };

    Ok(DayFrame {
        date: day,
        jd_sunrise,
        vaara_num,
        positions,
        graha_sign,
        lagna_sign,
        tithi_index,
        day_fraction: py_round(day_fraction, 6),
        sav: av.sarva(),
        bav: av.bav,
        hora,
    })
}
