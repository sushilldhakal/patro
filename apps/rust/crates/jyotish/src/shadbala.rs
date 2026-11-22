//! षड्बल: the sixfold strength of the seven grahas in virupas, with graha-yuddha
//! (`engine/jyotish/shadbala.py`, `engine/jyotish/graha_yuddha.py`).

use panchanga::{
    daily::{DailyError, Location},
    graha_positions,
    pyfloat::{py_floordiv, py_int, py_mod, py_round},
    vara,
};
use serde_json::{Map, Value, json};
use timescale::UtcInstant;

use crate::{Graha, ashtakavarga::sign_of, graha::SIGN_LORD};

/// The seven grahas, in the table's order.
const PLANETS: [Graha; 7] = Graha::SEVEN;
/// `VARA_LORD`, Sunday first.
const VARA_LORD: [Graha; 7] = [
    Graha::Sun,
    Graha::Moon,
    Graha::Mars,
    Graha::Mercury,
    Graha::Jupiter,
    Graha::Venus,
    Graha::Saturn,
];
/// `CHALDEAN` hora order.
const CHALDEAN: [Graha; 7] = [
    Graha::Saturn,
    Graha::Jupiter,
    Graha::Mars,
    Graha::Sun,
    Graha::Venus,
    Graha::Mercury,
    Graha::Moon,
];
const BALA_LABELS: [(&str, &str); 6] = [
    ("sthana", "Sthana"),
    ("dig", "Dig"),
    ("kala", "Kala"),
    ("cheshta", "Cheshta"),
    ("naisargika", "Naisargika"),
    ("drik", "Drik"),
];

pub(crate) fn name_ne(p: Graha) -> &'static str {
    // `PLANET_NAMES` of the shadbala module (मंगल, बृहस्पति: the PLANET_NE spellings).
    p.ne()
}

/// `REQUIRED` minimum shadbala, virupas.
const fn required(p: Graha) -> f64 {
    match p {
        Graha::Sun | Graha::Jupiter => 390.0,
        Graha::Moon => 360.0,
        Graha::Mars | Graha::Saturn => 300.0,
        Graha::Mercury => 420.0,
        Graha::Venus => 330.0,
        Graha::Rahu | Graha::Ketu => 0.0,
    }
}

/// `EXALT_DEG`: deep-exaltation longitude.
pub(crate) const fn exalt_deg(p: Graha) -> f64 {
    match p {
        Graha::Sun => 10.0,
        Graha::Moon => 33.0,
        Graha::Mars => 298.0,
        Graha::Mercury => 165.0,
        Graha::Jupiter => 95.0,
        Graha::Venus => 357.0,
        _ => 200.0,
    }
}

fn idx(x: f64) -> usize {
    usize::try_from(py_int(x)).unwrap_or(0)
}

fn d2_hora(lon: f64) -> usize {
    let s = sign_of(lon);
    let first = py_mod(lon, 30.0) < 15.0;
    match (s % 2 == 0, first) {
        (true, true) | (false, false) => 4,
        _ => 3,
    }
}

fn d3(lon: f64) -> usize {
    (sign_of(lon) + idx(py_floordiv(py_mod(lon, 30.0), 10.0)) * 4) % 12
}

fn d7(lon: f64) -> usize {
    let s = sign_of(lon);
    let part = idx(py_floordiv(py_mod(lon, 30.0), 30.0 / 7.0));
    let start = if s % 2 == 0 { s } else { s + 6 };
    (start + part) % 12
}

fn d9(lon: f64) -> usize {
    idx(py_floordiv(py_mod(lon, 360.0) * 9.0, 30.0)) % 12
}

fn d12(lon: f64) -> usize {
    (sign_of(lon) + idx(py_floordiv(py_mod(lon, 30.0), 2.5))) % 12
}

fn d30_lord(lon: f64) -> Graha {
    let within = py_mod(lon, 30.0);
    let bounds: [(f64, Graha); 5] = if sign_of(lon) % 2 == 0 {
        [
            (5.0, Graha::Mars),
            (10.0, Graha::Saturn),
            (18.0, Graha::Jupiter),
            (25.0, Graha::Mercury),
            (30.0, Graha::Venus),
        ]
    } else {
        [
            (5.0, Graha::Venus),
            (12.0, Graha::Mercury),
            (18.0, Graha::Jupiter),
            (25.0, Graha::Saturn),
            (30.0, Graha::Mars),
        ]
    };
    bounds
        .iter()
        .find(|(limit, _)| within < *limit)
        .map_or(bounds[4].1, |b| b.1)
}

pub(crate) fn natural_rel(p: Graha, other: Graha) -> i32 {
    if p.friends().contains(&other) {
        1
    } else if p.enemies().contains(&other) {
        -1
    } else {
        0
    }
}

pub(crate) fn temporal_rel(p: Graha, other: Graha, d1: &[usize; 9]) -> i32 {
    let dist = (d1[other.index()] + 12 - d1[p.index()]) % 12 + 1;
    if matches!(dist, 2 | 3 | 4 | 10 | 11 | 12) {
        1
    } else {
        -1
    }
}

/// `_COMPOUND`: Adhi-Mitra 20 … Adhi-Shatru 2.
fn compound(score: i32) -> f64 {
    match score {
        2 => 20.0,
        1 => 15.0,
        0 => 10.0,
        -1 => 4.0,
        _ => 2.0,
    }
}

fn dignity(p: Graha, sign: usize, d1: &[usize; 9], chart: Varga, lon: f64) -> f64 {
    if sign == sign_of(exalt_deg(p)) {
        return 45.0;
    }
    let lord = SIGN_LORD[sign];
    if lord == p {
        if chart == Varga::Rashi
            && let Some((ms, lo, hi)) = p.moolatrikona()
        {
            let within = py_mod(lon, 30.0);
            if sign == ms && lo <= within && within < hi {
                return 45.0;
            }
        }
        return 30.0;
    }
    compound(natural_rel(p, lord) + temporal_rel(p, lord, d1))
}

/// Whether a dignity is read in the rashi chart (D1, where moolatrikona counts) or a
/// divisional one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Varga {
    Rashi,
    Divisional,
}

fn saptavargaja(p: Graha, lon: f64, d1: &[usize; 9]) -> f64 {
    let mut total = 0.0;
    for (i, sign) in [
        sign_of(lon),
        d2_hora(lon),
        d3(lon),
        d7(lon),
        d9(lon),
        d12(lon),
    ]
    .into_iter()
    .enumerate()
    {
        let chart = if i == 0 {
            Varga::Rashi
        } else {
            Varga::Divisional
        };
        total += dignity(p, sign, d1, chart, lon);
    }
    let lord30 = d30_lord(lon);
    total += if lord30 == p {
        30.0
    } else {
        compound(natural_rel(p, lord30) + temporal_rel(p, lord30, d1))
    };
    total
}

fn arc180(x: f64) -> f64 {
    let arc = py_mod(x, 360.0).abs();
    if arc > 180.0 { 360.0 - arc } else { arc }
}

fn uchcha(p: Graha, lon: f64) -> f64 {
    let debil = py_mod(exalt_deg(p) + 180.0, 360.0);
    arc180(lon - debil) / 3.0
}

fn oja(p: Graha, lon: f64) -> f64 {
    let pref_odd = !matches!(p, Graha::Moon | Graha::Venus);
    let rashi = (sign_of(lon) % 2 == 0) == pref_odd;
    let nav = (d9(lon) % 2 == 0) == pref_odd;
    (if rashi { 15.0 } else { 0.0 }) + if nav { 15.0 } else { 0.0 }
}

fn kendradi(sign: usize, lagna: usize) -> f64 {
    match (sign + 12 - lagna) % 12 + 1 {
        1 | 4 | 7 | 10 => 60.0,
        2 | 5 | 8 | 11 => 30.0,
        _ => 15.0,
    }
}

fn drekkana(p: Graha, lon: f64) -> f64 {
    let i = idx(py_floordiv(py_mod(lon, 30.0), 10.0));
    let hit = match p {
        Graha::Sun | Graha::Mars | Graha::Jupiter => i == 0,
        Graha::Mercury | Graha::Saturn => i == 1,
        Graha::Moon | Graha::Venus => i == 2,
        _ => false,
    };
    if hit { 15.0 } else { 0.0 }
}

fn dig(p: Graha, lon: f64, lagna: f64) -> f64 {
    let offset = match p {
        Graha::Sun | Graha::Mars => 270.0,
        Graha::Saturn => 180.0,
        Graha::Moon | Graha::Venus => 90.0,
        _ => 0.0,
    };
    (180.0 - arc180(lon - py_mod(lagna + offset, 360.0))) / 3.0
}

fn nathonnatha(p: Graha, birth: f64, noon: f64) -> f64 {
    let day = 60.0 * (1.0 - (birth - noon).abs().min(720.0) / 720.0);
    match p {
        Graha::Mercury => 60.0,
        Graha::Sun | Graha::Jupiter | Graha::Venus => day,
        _ => 60.0 - day,
    }
}

fn benefic(p: Graha) -> bool {
    matches!(
        p,
        Graha::Moon | Graha::Mercury | Graha::Jupiter | Graha::Venus
    )
}

fn paksha(p: Graha, sun: f64, moon: f64) -> f64 {
    let mut sep = py_mod(moon - sun, 360.0);
    if sep > 180.0 {
        sep = 360.0 - sep;
    }
    let value = sep / 3.0;
    if benefic(p) { value } else { 60.0 - value }
}

fn tribhaga(p: Graha, birth: f64, sunrise: f64, sunset: f64) -> f64 {
    let jup = if p == Graha::Jupiter { 60.0 } else { 0.0 };
    let (third, lords) = if sunrise <= birth && birth < sunset {
        let length = (sunset - sunrise) / 3.0;
        let third = if length == 0.0 {
            0
        } else {
            idx((birth - sunrise) / length).min(2)
        };
        (third, [Graha::Mercury, Graha::Sun, Graha::Saturn])
    } else {
        let elapsed = if birth >= sunset {
            birth - sunset
        } else {
            birth + (1440.0 - sunset)
        };
        let length = ((1440.0 - sunset) + sunrise) / 3.0;
        let third = if length == 0.0 {
            0
        } else {
            idx(elapsed / length).min(2)
        };
        (third, [Graha::Moon, Graha::Mars, Graha::Venus])
    };
    (if lords[third] == p { 60.0 } else { 0.0 }) + jup
}

fn hora(p: Graha, birth: f64, sunrise: f64, weekday: usize) -> f64 {
    let i = idx(py_floordiv(py_mod(birth - sunrise, 1440.0), 60.0));
    let start = CHALDEAN
        .iter()
        .position(|g| *g == VARA_LORD[weekday])
        .unwrap_or(0);
    if CHALDEAN[(start + i) % 7] == p {
        60.0
    } else {
        0.0
    }
}

/// `eps` is the obliquity in degrees (the text's 24°, or drik's of date).
fn ayana(p: Graha, lon: f64, ayan: f64, eps: f64) -> f64 {
    let trop = py_mod(lon + ayan, 360.0);
    let mut decl = (eps.to_radians().sin() * trop.to_radians().sin())
        .asin()
        .to_degrees();
    let mut value = if p == Graha::Mercury {
        (decl.abs() / eps * 60.0).clamp(0.0, 60.0)
    } else {
        if matches!(p, Graha::Moon | Graha::Saturn) {
            decl = -decl;
        }
        ((decl + eps) / (2.0 * eps) * 60.0).clamp(0.0, 60.0)
    };
    if p == Graha::Sun {
        value *= 2.0;
    }
    value
}

fn cheshta(p: Graha, speed: f64) -> f64 {
    let mean = match p {
        Graha::Mars => 0.524,
        Graha::Mercury => 1.383,
        Graha::Jupiter => 0.083,
        Graha::Venus => 1.2,
        Graha::Saturn => 0.033,
        _ => 1.0,
    };
    if speed < 0.0 {
        return 60.0;
    }
    let ratio = speed / mean;
    if ratio <= 1.0 {
        45.0 - 15.0 * ratio
    } else {
        15.0_f64.max(30.0 - 15.0 * (ratio - 1.0))
    }
}

/// `_drishti(aspecting, x)`: the graduated aspect or a special full one.
pub(crate) fn drishti(aspecting: Graha, x: f64) -> f64 {
    base_drishti(x).max(special_full(aspecting, x))
}

fn base_drishti(x: f64) -> f64 {
    let x = py_mod(x, 360.0);
    if x <= 30.0 || x >= 300.0 {
        return if x <= 30.0 {
            0.0
        } else {
            base_drishti(360.0 - x)
        };
    }
    if x <= 60.0 {
        return (x - 30.0) / 2.0;
    }
    if x <= 90.0 {
        return (x - 60.0) + 15.0;
    }
    if x <= 120.0 {
        return 45.0 - (x - 90.0) / 2.0;
    }
    if x <= 180.0 {
        return 30.0 + (x - 120.0) / 2.0;
    }
    base_drishti(360.0 - x)
}

fn special_full(planet: Graha, x: f64) -> f64 {
    let x = py_mod(x, 360.0);
    let centres: &[f64] = match planet {
        Graha::Mars => &[90.0, 210.0],
        Graha::Jupiter => &[120.0, 240.0],
        Graha::Saturn => &[60.0, 270.0],
        _ => &[],
    };
    if centres
        .iter()
        .any(|c| (py_mod(x - c + 180.0, 360.0) - 180.0).abs() <= 15.0)
    {
        60.0
    } else {
        0.0
    }
}

fn drik(p: Graha, lons: &[f64; 9]) -> f64 {
    let mut total = 0.0;
    for o in PLANETS {
        if o == p {
            continue;
        }
        let angle = py_mod(lons[p.index()] - lons[o.index()], 360.0);
        let d = base_drishti(angle).max(special_full(o, angle));
        total += if benefic(o) { d } else { -d };
    }
    total / 4.0
}

fn status(ratio: f64) -> &'static str {
    if ratio >= 1.5 {
        "Exceptional"
    } else if ratio >= 1.2 {
        "Strong"
    } else if ratio >= 1.0 {
        "Adequate"
    } else if ratio >= 0.9 {
        "Borderline"
    } else {
        "Weak"
    }
}

/// Minutes past local midnight of a wall clock (`h*60 + m + s/60`).
fn minutes(hms: &str) -> f64 {
    let p: Vec<f64> = hms.split(':').map(|x| x.parse().unwrap_or(0.0)).collect();
    p[0] * 60.0 + p[1] + p[2] / 60.0
}

/// `_ingress_weekday`: the weekday the Sun last crossed `target`.
fn ingress_weekday(birth: UtcInstant, target: f64, location: &Location, max_days: u32) -> usize {
    let sun = |t: UtcInstant| astronomy::engine::sun_longitude(location.system, t.to_jd());
    let mut day = birth;
    for _ in 0..max_days {
        let prev = day.add_seconds(-86_400);
        let rel_day = py_mod(sun(day) - target, 360.0);
        let rel_prev = py_mod(sun(prev) - target, 360.0);
        if rel_prev > 300.0 && rel_day < 60.0 {
            break;
        }
        day = prev;
    }
    vara(day.to_jd(), &location.zone).number as usize
}

/// One planet's breakdown (rounded as the payload shows it) and sub-balas.
struct Row {
    p: Graha,
    breakdown: [f64; 6],
    uchcha: f64,
    cheshta: f64,
    sthana_sub: [f64; 5],
    kala_sub: [f64; 9],
}

impl Row {
    fn total(&self) -> f64 {
        self.breakdown.iter().fold(0.0, |a, b| a + b)
    }

    fn top_weakest(&self) -> (&'static str, &'static str) {
        let (mut top, mut low) = (0, 0);
        for (i, v) in self.breakdown.iter().enumerate() {
            if *v > self.breakdown[top] {
                top = i;
            }
            if *v < self.breakdown[low] {
                low = i;
            }
        }
        (BALA_LABELS[top].1, BALA_LABELS[low].1)
    }
}

/// `compute_yuddha_bala`: wars between tara grahas within 1°.
fn yuddha(rows: &[Row], lons: &[f64; 9]) -> (Vec<Value>, Vec<(Graha, f64)>) {
    const TARA: [Graha; 5] = [
        Graha::Mars,
        Graha::Mercury,
        Graha::Jupiter,
        Graha::Venus,
        Graha::Saturn,
    ];
    let disc = |g: Graha| -> f64 {
        match g {
            Graha::Mars => 9.4,
            Graha::Mercury => 6.6,
            Graha::Jupiter => 190.4,
            Graha::Venus => 16.6,
            Graha::Saturn => 158.0,
            _ => 1.0,
        }
    };
    let tri = |g: Graha| {
        rows.iter().find(|r| r.p == g).map_or(0.0, |r| {
            let kala: f64 = r.kala_sub[..7].iter().fold(0.0, |a, b| a + b);
            r.breakdown[0] + r.breakdown[1] + kala
        })
    };
    let mut wars = Vec::new();
    let mut by: Vec<(Graha, f64)> = Vec::new();
    let mut add = |g: Graha, v: f64| {
        if let Some(e) = by.iter_mut().find(|e| e.0 == g) {
            e.1 = py_round(e.1 + v, 2);
        } else {
            by.push((g, py_round(v, 2)));
        }
    };
    for (i, &a) in TARA.iter().enumerate() {
        for &b in &TARA[i + 1..] {
            let (la, lb) = (lons[a.index()], lons[b.index()]);
            let mut sep = py_mod((la - lb).abs(), 360.0);
            if sep > 180.0 {
                sep = 360.0 - sep;
            }
            if sep >= 1.0 {
                continue;
            }
            let (winner, loser) = if la <= lb { (a, b) } else { (b, a) };
            let tri_diff = (tri(winner) - tri(loser)).abs();
            let disc_diff = (disc(winner) - disc(loser)).abs();
            let virupas = if disc_diff > 0.0 {
                tri_diff / disc_diff
            } else {
                0.0
            };
            wars.push(json!({
                "winner": winner.key(), "loser": loser.key(),
                "yuddhaVirupas": py_round(virupas, 2), "separationDeg": py_round(sep, 4),
            }));
            add(winner, virupas);
            add(loser, -virupas);
        }
    }
    (wars, by)
}

/// `compute_shadbala(instant, lat=, lon=, timezone_name=)`.
///
/// # Errors
///
/// [`DailyError`] when the day's sunrise or sunset cannot be found.
#[expect(clippy::too_many_lines, reason = "the Python table, row for row")]
pub fn shadbala(instant: UtcInstant, location: &Location) -> Result<Value, DailyError> {
    let jd = instant.to_jd();
    let ayan = location.system.ayanamsha(jd);
    let mut lons = [0.0; 9];
    let mut speeds = [0.0; 9];
    for row in graha_positions(location.system, jd) {
        if let Some(g) = Graha::from_key(row.key) {
            lons[g.index()] = row.longitude;
            speeds[g.index()] = row.speed;
        }
    }
    let mut d1 = [0usize; 9];
    for p in PLANETS {
        d1[p.index()] = sign_of(lons[p.index()]);
    }
    let lagna_lon = location.system.ascendant(jd, location.lat, location.lon);
    let lagna_sign = sign_of(lagna_lon);

    let local = location.zone.local(instant);
    let times = panchanga::sun_times(local.day(), location)?;
    let birth = minutes(&local.hms());
    let sunrise = minutes(&location.zone.local(times.sunrise).hms());
    let sunset = minutes(&location.zone.local(times.sunset).hms());
    #[expect(
        clippy::manual_midpoint,
        reason = "Python's (a + b) / 2, operation for operation"
    )]
    let noon = (sunrise + sunset) / 2.0;
    let weekday = vara(times.sunrise.to_jd(), &location.zone).number as usize;
    #[expect(clippy::cast_precision_loss, reason = "a sign index")]
    let masa_target = d1[Graha::Sun.index()] as f64 * 30.0;
    let masa = ingress_weekday(instant, masa_target, location, 40);
    let varsha = ingress_weekday(instant, 0.0, location, 400);

    let mut rows: Vec<Row> = PLANETS
        .iter()
        .map(|&p| {
            let lp = lons[p.index()];
            let (u, sv, oj, ke, dr) = (
                uchcha(p, lp),
                saptavargaja(p, lp, &d1),
                oja(p, lp),
                kendradi(d1[p.index()], lagna_sign),
                drekkana(p, lp),
            );
            let sthana = u + sv + oj + ke + dr;
            let dg = dig(p, lp, lagna_lon);
            let na = nathonnatha(p, birth, noon);
            let pa = paksha(p, lons[Graha::Sun.index()], lons[Graha::Moon.index()]);
            let tr = tribhaga(p, birth, sunrise, sunset);
            let vara_b = if VARA_LORD[weekday] == p { 45.0 } else { 0.0 };
            let masa_b = if VARA_LORD[masa] == p { 30.0 } else { 0.0 };
            let varsha_b = if VARA_LORD[varsha] == p { 15.0 } else { 0.0 };
            let ho = hora(p, birth, sunrise, weekday);
            let ay = ayana(p, lp, ayan, location.system.obliquity_degrees(jd));
            let kala = na + pa + tr + vara_b + masa_b + varsha_b + ho + ay + 0.0;
            let ch = match p {
                Graha::Sun => ay,
                Graha::Moon => pa,
                _ => cheshta(p, speeds[p.index()]),
            };
            let nai = p.naisargika_virupas().unwrap_or(0.0);
            let dk = drik(p, &lons);
            let r2 = |x: f64| py_round(x, 2);
            Row {
                p,
                breakdown: [r2(sthana), r2(dg), r2(kala), r2(ch), r2(nai), r2(dk)],
                uchcha: u,
                cheshta: ch,
                sthana_sub: [r2(u), r2(sv), r2(oj), r2(ke), r2(dr)],
                kala_sub: [
                    r2(na),
                    r2(pa),
                    r2(tr),
                    r2(varsha_b),
                    r2(masa_b),
                    r2(vara_b),
                    r2(ho),
                    r2(ay),
                    0.0,
                ],
            }
        })
        .collect();

    let (wars, by) = yuddha(&rows, &lons);
    for row in &mut rows {
        if let Some((_, delta)) = by.iter().find(|(g, _)| *g == row.p)
            && *delta != 0.0
        {
            row.kala_sub[8] = py_round(*delta, 2);
            row.breakdown[2] = py_round(row.breakdown[2] + delta, 2);
        }
    }

    let mut out_rows: Vec<(f64, Value, &'static str, f64)> = rows
        .iter()
        .map(|r| {
            let total = r.total();
            let req = required(r.p);
            let mut total_virupas = py_round(total, 2);
            let mut ratio_raw = total / req;
            let yuddha_touched = by.iter().any(|(g, d)| *g == r.p && *d != 0.0);
            if yuddha_touched {
                total_virupas = py_round(total, 2);
                ratio_raw = py_round(total_virupas / req, 4);
            }
            let ratio = py_round(ratio_raw, 4);
            let st = status(if yuddha_touched { ratio } else { ratio_raw });
            let (top, low) = r.top_weakest();
            let u = r.uchcha.clamp(0.0, 60.0);
            let c = r.cheshta.clamp(0.0, 60.0);
            let mut breakdown = Map::new();
            for (i, (k, _)) in BALA_LABELS.iter().enumerate() {
                breakdown.insert((*k).into(), json!(r.breakdown[i]));
            }
            let s = r.sthana_sub;
            let k = r.kala_sub;
            let rupas = if yuddha_touched {
                py_round(total_virupas / 60.0, 2)
            } else {
                py_round(total / 60.0, 2)
            };
            let value = json!({
                "key": r.p.key(), "name": r.p.en(), "name_ne": name_ne(r.p),
                "total_virupas": total_virupas, "rupas": rupas,
                "required": req, "ratio": ratio, "status": st,
                "top_bala": top, "weakest_bala": low, "breakdown": breakdown,
                "ishta_phala": py_round((u * c).sqrt(), 2),
                "kashta_phala": py_round(((60.0 - u) * (60.0 - c)).sqrt(), 2),
                "sub_balas": {
                    "sthana": {
                        "uchcha": s[0], "saptavargaja": s[1], "oja_yugma": s[2],
                        "kendradi": s[3], "drekkana": s[4],
                    },
                    "kala": {
                        "nathonnatha": k[0], "paksha": k[1], "tribhaga": k[2],
                        "varshadhipati": k[3], "masadhipati": k[4], "varadhipati": k[5],
                        "horadhipati": k[6], "ayana": k[7], "yuddha": k[8],
                    },
                },
            });
            (ratio, value, st, total_virupas)
        })
        .collect();
    out_rows.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let mut counts = Map::new();
    for k in ["Exceptional", "Strong", "Adequate", "Borderline", "Weak"] {
        let n = out_rows.iter().filter(|r| r.2 == k).count();
        counts.insert(k.into(), json!(n));
    }
    let meeting = out_rows.iter().filter(|r| r.0 >= 1.0).count();
    #[expect(clippy::cast_precision_loss, reason = "seven rows")]
    let avg = out_rows.iter().fold(0.0, |a, r| a + r.3) / out_rows.len() as f64;
    let summary_ref = |v: &Value| {
        json!({
            "key": v["key"], "name": v["name"], "name_ne": v["name_ne"],
            "status": v["status"], "ratio": v["ratio"],
        })
    };
    let strongest = summary_ref(&out_rows[0].1);
    let weakest = summary_ref(&out_rows[out_rows.len() - 1].1);
    let by_planet: Map<String, Value> = by
        .iter()
        .map(|(g, v)| (g.key().to_owned(), json!(v)))
        .collect();
    Ok(json!({
        "planets": out_rows.into_iter().map(|r| r.1).collect::<Vec<_>>(),
        "summary": {
            "strongest": strongest, "weakest": weakest,
            "average_rupas": py_round(avg / 60.0, 2), "average_virupas": py_round(avg, 2),
            "meeting_threshold": meeting, "total_planets": 7, "counts": counts,
        },
        "method": "Parashari Shadbala (Surya Siddhanta sidereal longitudes)",
        "yuddha": {"wars": wars, "byPlanet": by_planet},
    }))
}
