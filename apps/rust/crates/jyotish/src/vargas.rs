//! Parashari divisional (varga) signs (`engine/jyotish/vargas.py`).

use panchanga::pyfloat::{py_floordiv, py_int, py_mod};

/// `VARGA_DIVISIONS`.
pub const VARGA_DIVISIONS: [u32; 20] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60,
];

fn idx(x: f64) -> usize {
    usize::try_from(py_int(x)).unwrap_or(0)
}

/// `int(d // step)`.
fn part(d: f64, step: f64) -> usize {
    idx(py_floordiv(d, step))
}

/// `int(math.floor(d / (30 / n)))`.
fn part_n(d: f64, n: f64) -> usize {
    idx((d / (30.0 / n)).floor())
}

/// Start sign by modality: movable, fixed, dual.
const fn by_modality(sign: usize, starts: [usize; 3]) -> usize {
    starts[sign % 3]
}

/// `varga_rashi_from_longitude(division, longitude)`: the 1-based divisional sign.
#[must_use]
pub fn varga_rashi(division: u32, longitude: f64) -> usize {
    let lon = py_mod(longitude, 360.0);
    let s = idx(py_floordiv(lon, 30.0)) % 12;
    let d = py_mod(lon, 30.0);
    // `_is_odd_sign`: an odd sign is an even 0-based index.
    let odd = s % 2 == 0;
    let from = |start: usize, p: usize| (start + p) % 12 + 1;
    match division {
        2 => {
            let first_half = d < 15.0;
            if odd == first_half { 5 } else { 4 }
        }
        3 => (s + part(d, 10.0) * 4) % 12 + 1,
        4 => (s + 3 * part(d, 7.5)) % 12 + 1,
        5 => from(if odd { 0 } else { 6 }, part(d, 6.0)),
        6 => from(s, part(d, 5.0)),
        7 => from(if odd { s } else { (s + 6) % 12 }, part_n(d, 7.0)),
        8 => from(by_modality(s, [0, 4, 8]), part(d, 3.75)),
        9 => idx(lon * 9.0 / 30.0) % 12 + 1,
        10 => from(if odd { s } else { (s + 8) % 12 }, part(d, 3.0)),
        11 => from(if odd { 0 } else { 6 }, part_n(d, 11.0)),
        12 => from(s, part(d, 2.5)),
        16 => from(by_modality(s, [0, 4, 8]), part_n(d, 16.0)),
        20 => from(by_modality(s, [0, 8, 4]), part(d, 1.5)),
        24 => from(if odd { 4 } else { 3 }, part(d, 1.25)),
        27 => from([0, 3, 6, 9][s % 4], part_n(d, 27.0)),
        30 => trimshamsha(s, d),
        40 => from(if odd { 0 } else { 6 }, part(d, 0.75)),
        45 => from(by_modality(s, [0, 4, 8]), part_n(d, 45.0)),
        60 => from(s, part(d, 0.5)),
        _ => s + 1,
    }
}

/// D30 by the sign (0-based) and the degree within it.
const fn trimshamsha(sign: usize, d: f64) -> usize {
    if sign % 2 == 0 {
        if d < 5.0 {
            1
        } else if d < 10.0 {
            11
        } else if d < 18.0 {
            9
        } else if d < 25.0 {
            3
        } else {
            7
        }
    } else if d < 5.0 {
        2
    } else if d < 12.0 {
        6
    } else if d < 18.0 {
        12
    } else if d < 25.0 {
        10
    } else {
        8
    }
}
