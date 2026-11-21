//! Parashari Ashtakavarga (`engine/jyotish/ashtakavarga.py`): bhinnashtakavarga,
//! sarvashtakavarga, Trikona and Ekadhipatya reductions, Shodhya Pinda.

use panchanga::pyfloat::{py_floordiv, py_int, py_mod};

/// A contributor to the Ashtakavarga: the Lagna or one of the seven grahas.
pub const CONTRIBUTORS: [&str; 8] = [
    "lagna", "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn",
];

/// `BENEFIC_HOUSES[target][contributor]`, targets and contributors in the
/// order sun, moon, mars, mercury, jupiter, venus, saturn, lagna.
const BENEFIC_HOUSES: [[&[u32]; 8]; 8] = [
    // sun
    [
        &[1, 2, 4, 7, 8, 9, 10, 11],
        &[3, 6, 10, 11],
        &[1, 2, 4, 7, 8, 9, 10, 11],
        &[3, 5, 6, 9, 10, 11, 12],
        &[5, 6, 9, 11],
        &[6, 7, 12],
        &[1, 2, 4, 7, 8, 9, 10, 11],
        &[3, 4, 6, 10, 11, 12],
    ],
    // moon
    [
        &[3, 6, 7, 8, 10, 11],
        &[1, 3, 6, 7, 10, 11],
        &[2, 3, 5, 6, 9, 10, 11],
        &[1, 3, 4, 5, 7, 8, 10, 11],
        &[1, 4, 7, 8, 10, 11, 12],
        &[3, 4, 5, 7, 9, 10, 11],
        &[3, 5, 6, 11],
        &[3, 6, 10, 11],
    ],
    // mars
    [
        &[3, 5, 6, 10, 11],
        &[3, 6, 11],
        &[1, 2, 4, 7, 8, 10, 11],
        &[3, 5, 6, 11],
        &[6, 10, 11, 12],
        &[6, 8, 11, 12],
        &[1, 4, 7, 8, 9, 10, 11],
        &[1, 3, 6, 10, 11],
    ],
    // mercury
    [
        &[5, 6, 9, 11, 12],
        &[2, 4, 6, 8, 10, 11],
        &[1, 2, 4, 7, 8, 9, 10, 11],
        &[1, 3, 5, 6, 9, 10, 11, 12],
        &[6, 8, 11, 12],
        &[1, 2, 3, 4, 5, 8, 9, 11],
        &[1, 2, 4, 7, 8, 9, 10, 11],
        &[1, 2, 4, 6, 8, 10, 11],
    ],
    // jupiter
    [
        &[1, 2, 3, 4, 7, 8, 9, 10, 11],
        &[2, 5, 7, 9, 11],
        &[1, 2, 4, 7, 8, 10, 11],
        &[1, 2, 4, 5, 6, 9, 10, 11],
        &[1, 2, 3, 4, 7, 8, 10, 11],
        &[2, 5, 6, 9, 10, 11],
        &[3, 5, 6, 12],
        &[1, 2, 4, 5, 6, 7, 9, 10, 11],
    ],
    // venus
    [
        &[8, 11, 12],
        &[1, 2, 3, 4, 5, 8, 9, 11, 12],
        &[3, 5, 6, 9, 11, 12],
        &[3, 5, 6, 9, 11],
        &[5, 8, 9, 10, 11],
        &[1, 2, 3, 4, 5, 8, 9, 10, 11],
        &[3, 4, 5, 8, 9, 10, 11],
        &[1, 2, 3, 4, 5, 8, 9, 11],
    ],
    // saturn
    [
        &[1, 2, 4, 7, 8, 10, 11],
        &[3, 6, 11],
        &[3, 5, 6, 10, 11, 12],
        &[6, 8, 9, 10, 11, 12],
        &[5, 6, 11, 12],
        &[6, 11, 12],
        &[3, 5, 6, 11],
        &[1, 3, 4, 6, 10, 11],
    ],
    // lagna
    [
        &[3, 4, 6, 10, 11, 12],
        &[3, 6, 10, 11, 12],
        &[1, 3, 6, 10, 11],
        &[1, 2, 4, 6, 8, 10, 11],
        &[1, 2, 4, 5, 6, 7, 9, 10, 11],
        &[1, 2, 3, 4, 5, 8, 9],
        &[1, 3, 4, 6, 10, 11],
        &[3, 6, 10, 11],
    ],
];

/// The sign (0-based) of a sidereal longitude: `int(lon % 360 // 30) % 12`.
#[must_use]
pub fn sign_of(longitude: f64) -> usize {
    usize::try_from(py_int(py_floordiv(py_mod(longitude, 360.0), 30.0)) % 12).unwrap_or(0)
}

/// Bhinnashtakavarga per target, signs 0-based.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Ashtakavarga {
    /// Bindus of each graha's BAV (sun, moon, mars, mercury, jupiter, venus, saturn).
    pub bav: [[u32; 12]; 7],
    /// The Lagna's own ashtakavarga (not in the Sarvashtaka).
    pub lagna_bav: [u32; 12],
}

impl Ashtakavarga {
    /// `_bhinna` for every target: `graha_signs` are the seven grahas' signs
    /// (sun … saturn, 0-based) and `lagna_sign` the ascendant's.
    #[must_use]
    pub fn cast(graha_signs: [usize; 7], lagna_sign: usize) -> Self {
        // Contributor order of BENEFIC_HOUSES rows: the seven grahas, then the lagna.
        let mut base = [0usize; 8];
        base[..7].copy_from_slice(&graha_signs);
        base[7] = lagna_sign;
        let bhinna = |target: usize| {
            let mut bindus = [0u32; 12];
            for (contributor, houses) in BENEFIC_HOUSES[target].iter().enumerate() {
                for &house in *houses {
                    bindus[(base[contributor] + house as usize - 1) % 12] += 1;
                }
            }
            bindus
        };
        let mut bav = [[0u32; 12]; 7];
        for (t, row) in bav.iter_mut().enumerate() {
            *row = bhinna(t);
        }
        Self {
            bav,
            lagna_bav: bhinna(7),
        }
    }

    /// Sarvashtakavarga: the seven grahas' bindus summed per sign.
    #[must_use]
    pub fn sarva(&self) -> [u32; 12] {
        let mut sav = [0u32; 12];
        for row in &self.bav {
            for (s, b) in row.iter().enumerate() {
                sav[s] += b;
            }
        }
        sav
    }
}

const TRIKONAS: [[usize; 3]; 4] = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]];
const EKADHIPATYA_PAIRS: [(usize, usize); 5] = [(0, 7), (1, 6), (2, 5), (8, 11), (9, 10)];
const RASIMANA: [u32; 12] = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12];
/// `GRAHAMANA`, sun … saturn.
const GRAHAMANA: [u32; 7] = [5, 5, 8, 5, 10, 7, 5];

/// `_trikona_shodhana` then `_ekadhipatya_shodhana`.
fn reduce(bav: [u32; 12], occupied: &[bool; 12]) -> [u32; 12] {
    let mut out = bav;
    for group in TRIKONAS {
        let low = group.iter().map(|i| out[*i]).min().unwrap_or(0);
        for i in group {
            out[i] -= low;
        }
    }
    for (a, b) in EKADHIPATYA_PAIRS {
        let (va, vb) = (out[a], out[b]);
        match (occupied[a], occupied[b]) {
            (true, true) => {}
            (false, false) => {
                let v = if va == vb { 0 } else { va.min(vb) };
                out[a] = v;
                out[b] = v;
            }
            (true, false) => out[b] = if va < vb { va } else { 0 },
            (false, true) => out[a] = if vb < va { vb } else { 0 },
        }
    }
    out
}

/// `compute_ashtakavarga(planet_longitudes, lagna_longitude)`: raw and reduced rows,
/// Shodhya Pinda per contributor, and every contributor's sign. `graha_lons` are
/// sun … saturn.
#[must_use]
pub fn payload(graha_lons: [f64; 7], lagna_lon: f64) -> serde_json::Value {
    use panchanga::daily::{RASHI_NAMES, RASHI_NAMES_NE};
    use serde_json::{Map, json};
    let signs: [usize; 7] = std::array::from_fn(|i| sign_of(graha_lons[i]));
    let lagna_sign = sign_of(lagna_lon);
    let cast = Ashtakavarga::cast(signs, lagna_sign);
    // Contributor order: lagna, then the seven grahas.
    let raw: [[u32; 12]; 8] = std::array::from_fn(|i| {
        if i == 0 {
            cast.lagna_bav
        } else {
            cast.bav[i - 1]
        }
    });
    let mut occupied = [false; 12];
    for s in signs {
        occupied[s] = true;
    }
    let reduced: [[u32; 12]; 8] = std::array::from_fn(|i| reduce(raw[i], &occupied));
    let rows = |table: &[[u32; 12]; 8]| -> Vec<serde_json::Value> {
        (0..12)
            .map(|sign| {
                let mut bindus = Map::new();
                for (t, name) in CONTRIBUTORS.iter().enumerate() {
                    bindus.insert((*name).into(), json!(table[t][sign]));
                }
                let sarva: u32 = (1..8).map(|t| table[t][sign]).sum();
                json!({
                    "rashi": sign + 1, "rashiEn": RASHI_NAMES[sign], "rashiNe": RASHI_NAMES_NE[sign],
                    "bindus": bindus, "sarvashtaka": sarva,
                })
            })
            .collect()
    };
    let shodhya: Vec<serde_json::Value> = CONTRIBUTORS
        .iter()
        .enumerate()
        .map(|(t, name)| {
            let red = reduced[t];
            let rashi_pinda: u32 = (0..12).map(|s| red[s] * RASIMANA[s]).sum();
            let graha_pinda: u32 = (0..12)
                .map(|s| red[s] * (0..7).filter(|g| signs[*g] == s).map(|g| GRAHAMANA[g]).sum::<u32>())
                .sum();
            json!({"target": name, "rashiPinda": rashi_pinda, "grahaPinda": graha_pinda, "shodhyaPinda": rashi_pinda + graha_pinda})
        })
        .collect();
    let mut sign_map = Map::new();
    sign_map.insert("lagna".into(), json!(lagna_sign + 1));
    for (g, name) in CONTRIBUTORS.iter().skip(1).enumerate() {
        sign_map.insert((*name).into(), json!(signs[g] + 1));
    }
    json!({"raw": rows(&raw), "reduced": rows(&reduced), "shodhyaPinda": shodhya, "signs": sign_map})
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classical_totals_hold() {
        let av = Ashtakavarga::cast([0, 3, 5, 7, 9, 11, 2], 4);
        let totals: Vec<u32> = av.bav.iter().map(|r| r.iter().sum()).collect();
        assert_eq!(totals, [48, 49, 39, 54, 56, 52, 39], "BPHS BAV totals");
        assert_eq!(av.lagna_bav.iter().sum::<u32>(), 49, "lagna total");
        assert_eq!(av.sarva().iter().sum::<u32>(), 337, "sarva total");
    }
}
