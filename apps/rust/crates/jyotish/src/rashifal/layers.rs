//! The scored layers of one rashi against one day frame (`score_sign` and its blocks).

use panchanga::{NAVATARA, pyfloat::py_round};
use serde_json::Value;

use super::{
    Period, Tone,
    frame::DayFrame,
    tables::{
        CYCLE_GRAHA, DOMAIN_HOUSES, DOMAIN_KARAKA, GOCHAR_BENEFIC_HOUSES, GRAHA_PERIOD_WEIGHT,
        HOUSE_STANDING, LAYER_WEIGHTS, MOORTI_BY_HOUSE, MOORTI_SCORE, VEDHA,
    },
};
use crate::{Graha, graha::SIGN_LORD};

/// `NAISARGIKA_SWING`.
pub(crate) const NAISARGIKA_SWING: f64 = 0.25;

/// `clamp(value, -1, 1)`.
pub(crate) fn clamp(value: f64) -> f64 {
    clamp_to(value, -1.0, 1.0)
}

/// `max(low, min(high, value))`.
pub(crate) fn clamp_to(value: f64, low: f64, high: f64) -> f64 {
    low.max(high.min(value))
}

/// `house_from`: bhava of `target` counted from `reference` (1..12).
pub(crate) fn house_from(target: usize, reference: usize) -> usize {
    (target + 12 - reference) % 12 + 1
}

/// `_naisargika_factor`.
fn naisargika_factor(graha: Graha) -> f64 {
    let Some(virupas) = graha.naisargika_virupas() else {
        return 1.0;
    };
    let (low, high) = (8.57, 60.0);
    let share = (virupas - low) / (high - low);
    1.0 + (share - 0.5) * NAISARGIKA_SWING
}

/// One gochar row.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct GocharRow {
    pub(crate) graha: Graha,
    pub(crate) sign: usize,
    pub(crate) house: usize,
    pub(crate) favourable: bool,
    pub(crate) vedha_by: Option<Graha>,
    pub(crate) bindu: Option<u32>,
    pub(crate) retrograde: bool,
    pub(crate) combust: bool,
    pub(crate) weight: f64,
    pub(crate) score: f64,
}

/// `_vedha_blocked`.
fn vedha_blocked(frame: &DayFrame, graha: Graha, house: usize, reference: usize) -> Option<Graha> {
    let vedha_house = VEDHA[graha.index()][house];
    if vedha_house == 0 {
        return None;
    }
    let vedha_sign = (reference + vedha_house - 1) % 12;
    Graha::ALL.into_iter().find(|&other| {
        other != graha
            && frame.sign(other) == vedha_sign
            && !matches!(
                (graha, other),
                (Graha::Sun, Graha::Saturn)
                    | (Graha::Saturn, Graha::Sun)
                    | (Graha::Moon, Graha::Mercury)
                    | (Graha::Mercury, Graha::Moon)
            )
    })
}

/// `_bindu_factor`.
fn bindu_factor(frame: &DayFrame, graha: Graha) -> (Option<u32>, f64) {
    if graha.index() >= 7 {
        return (None, 1.0);
    }
    let bindu = frame.bav[graha.index()][frame.sign(graha)];
    (
        Some(bindu),
        clamp_to(1.0 + (f64::from(bindu) - 4.0) * 0.15, 0.4, 1.6),
    )
}

/// `gochar_rows`.
pub(crate) fn gochar_rows(frame: &DayFrame, reference: usize, period: Period) -> Vec<GocharRow> {
    let weights = &GRAHA_PERIOD_WEIGHT[period.index()];
    Graha::ALL
        .into_iter()
        .map(|graha| {
            let sign = frame.sign(graha);
            let house = house_from(sign, reference);
            let favourable = GOCHAR_BENEFIC_HOUSES[graha.index()].contains(&house);
            let mut base = if favourable { 1.0 } else { -1.0 };
            let blocker = vedha_blocked(frame, graha, house, reference);
            if blocker.is_some() {
                base *= 0.15;
            }
            let (bindu, factor) = bindu_factor(frame, graha);
            let mut score = base * factor;
            let pos = frame.positions[graha.index()];
            if pos.combust {
                score *= 0.45;
            }
            if pos.retrograde
                && matches!(
                    graha,
                    Graha::Mars | Graha::Jupiter | Graha::Saturn | Graha::Mercury | Graha::Venus
                )
            {
                score *= 1.2;
            }
            if graha == Graha::Moon {
                score *= if frame.moon_is_waxing() { 1.15 } else { 0.8 };
            }
            GocharRow {
                graha,
                sign,
                house,
                favourable,
                vedha_by: blocker,
                bindu,
                retrograde: pos.retrograde,
                combust: pos.combust,
                weight: py_round(
                    weights[graha.index()] * frame.natonnata(graha) * naisargika_factor(graha),
                    4,
                ),
                score: py_round(clamp(score), 4),
            }
        })
        .collect()
}

/// `_gochar_score`.
pub(crate) fn gochar_score(rows: &[GocharRow]) -> f64 {
    let total: f64 = rows.iter().fold(0.0, |acc, r| acc + r.weight);
    let total = if total == 0.0 { 1.0 } else { total };
    clamp(rows.iter().fold(0.0, |acc, r| acc + r.score * r.weight) / total)
}

/// `sudarshana_block`: the lagna, Chandra and Surya chakras.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Sudarshana {
    pub(crate) score: f64,
    /// (reference sign, rounded score) for lagna, chandra, surya.
    pub(crate) chakras: [(usize, f64); 3],
}

pub(crate) fn sudarshana_block(frame: &DayFrame, period: Period) -> Sudarshana {
    let refs = [frame.lagna_sign, frame.moon_sign(), frame.sun_sign()];
    let weights = [0.5, 0.3, 0.2];
    let mut total = 0.0;
    let mut chakras = [(0, 0.0); 3];
    for (i, &reference) in refs.iter().enumerate() {
        let value = gochar_score(&gochar_rows(frame, reference, period));
        chakras[i] = (reference, py_round(value, 4));
        total += value * weights[i];
    }
    Sudarshana {
        score: py_round(clamp(total), 4),
        chakras,
    }
}

/// `rashi_lord_block`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct RashiLord {
    pub(crate) score: f64,
    pub(crate) lord: Graha,
    pub(crate) house: usize,
    pub(crate) sign: usize,
    /// Index into the dignity tables.
    pub(crate) dignity: usize,
    pub(crate) combust: bool,
    pub(crate) retrograde: bool,
}

/// `_dignity`: (index into `DIGNITY_KEYS`, score).
pub(crate) fn dignity(graha: Graha, sign: usize, degree_in_sign: f64) -> (usize, f64) {
    if let Some(exalt) = graha.exalt_sign() {
        if sign == exalt {
            return (0, 1.0);
        }
        if sign == (exalt + 6) % 12 {
            return (6, -1.0);
        }
    }
    if let Some((msign, lo, hi)) = graha.moolatrikona()
        && sign == msign
        && lo <= degree_in_sign
        && degree_in_sign <= hi
    {
        return (1, 0.85);
    }
    if graha.own_signs().contains(&sign) {
        return (2, 0.7);
    }
    let lord = SIGN_LORD[sign];
    if lord == graha {
        return (2, 0.7);
    }
    if graha.friends().contains(&lord) {
        return (3, 0.4);
    }
    if graha.enemies().contains(&lord) {
        return (5, -0.45);
    }
    (4, 0.0)
}

pub(crate) fn rashi_lord_block(frame: &DayFrame, rashi: usize) -> RashiLord {
    let lord = SIGN_LORD[rashi];
    let pos = frame.positions[lord.index()];
    let sign = frame.sign(lord);
    let house = house_from(sign, rashi);
    let (dignity, dignity_score) = dignity(lord, sign, pos.deg_in_rashi);
    let mut score = 0.55 * dignity_score + 0.45 * HOUSE_STANDING[house];
    if pos.combust {
        score -= 0.35;
    }
    if pos.retrograde {
        score -= 0.08;
    }
    RashiLord {
        score: py_round(clamp(score), 4),
        lord,
        house,
        sign,
        dignity,
        combust: pos.combust,
        retrograde: pos.retrograde,
    }
}

/// `chandrabala_block`: the navatara of the rashi from the transit Moon's sign.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Chandrabala {
    pub(crate) score: f64,
    pub(crate) tara_num: usize,
    pub(crate) tone: Tone,
}

impl Chandrabala {
    pub(crate) fn labels(&self) -> (&'static str, &'static str, &'static str, &'static str) {
        let (tara, tara_en, quality, quality_en, _) = NAVATARA[(self.tara_num - 1) % 9];
        (tara, quality, tara_en, quality_en)
    }
}

pub(crate) fn chandrabala_block(frame: &DayFrame, rashi: usize) -> Chandrabala {
    let diff = (frame.moon_sign() + 12 - rashi) % 12;
    let tara_num = if diff == 0 {
        1
    } else {
        ((9 - (diff % 9)) % 9) + 1
    };
    let tone = Tone::from_key(NAVATARA[(tara_num - 1) % 9].4);
    Chandrabala {
        score: tone.score(),
        tara_num,
        tone,
    }
}

/// `moorti_block`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Moorti {
    pub(crate) score: f64,
    /// Index into the moorti tables.
    pub(crate) kind: usize,
    pub(crate) house_from_moon: usize,
}

pub(crate) fn moorti_block(frame: &DayFrame, rashi: usize) -> Moorti {
    let house = house_from(frame.moon_sign(), rashi);
    let moorti = MOORTI_BY_HOUSE[house];
    Moorti {
        score: MOORTI_SCORE[moorti],
        kind: moorti,
        house_from_moon: house,
    }
}

/// `ashtakavarga_block`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct AvBlock {
    pub(crate) score: f64,
    pub(crate) sav: u32,
    pub(crate) sav_trikona: f64,
    pub(crate) sav_kendra: f64,
}

/// `sum(...)` of bindus as Python adds ints, then as a float.
fn sum_bindus(frame: &DayFrame, rashi: usize, houses: &[usize]) -> f64 {
    f64::from(
        houses
            .iter()
            .map(|h| frame.sav[(rashi + h - 1) % 12])
            .sum::<u32>(),
    )
}

pub(crate) fn ashtakavarga_block(frame: &DayFrame, rashi: usize) -> AvBlock {
    let own = frame.sav[rashi];
    let trikona = sum_bindus(frame, rashi, &[1, 5, 9]);
    let kendra = sum_bindus(frame, rashi, &[1, 4, 7, 10]);
    let own_term = (f64::from(own) - 28.0) / 8.0;
    let trikona_term = (trikona / 3.0 - 28.0) / 8.0;
    let kendra_term = (kendra / 4.0 - 28.0) / 8.0;
    let score = clamp(0.5 * own_term + 0.3 * trikona_term + 0.2 * kendra_term);
    AvBlock {
        score: py_round(score, 4),
        sav: own,
        sav_trikona: py_round(trikona / 3.0, 2),
        sav_kendra: py_round(kendra / 4.0, 2),
    }
}

/// `cycle_block`: the house the period's clock graha stands in.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Cycle {
    pub(crate) score: f64,
    pub(crate) graha: Graha,
    pub(crate) house: usize,
    pub(crate) sign: usize,
}

pub(crate) fn cycle_block(frame: &DayFrame, rashi: usize, period: Period) -> Cycle {
    let graha = CYCLE_GRAHA[period.index()];
    let sign = frame.sign(graha);
    let house = house_from(sign, rashi);
    Cycle {
        score: py_round(HOUSE_STANDING[house], 4),
        graha,
        house,
        sign,
    }
}

/// `_VARA_LORD`, Sunday first.
const VARA_LORD: [Graha; 7] = [
    Graha::Sun,
    Graha::Moon,
    Graha::Mars,
    Graha::Mercury,
    Graha::Jupiter,
    Graha::Venus,
    Graha::Saturn,
];

/// `vaara_hora_block`.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct VaaraHora {
    pub(crate) score: f64,
    /// Index into the relation tables.
    pub(crate) relation: usize,
    pub(crate) day_lord: Graha,
    pub(crate) rashi_lord: Graha,
    /// `(start, end)` local `HH:MM` of the rashi lord's day hora.
    pub(crate) hora_window: Option<(String, String)>,
}

pub(crate) fn vaara_hora_block(frame: &DayFrame, rashi: usize) -> VaaraHora {
    let lord = SIGN_LORD[rashi];
    let day_lord = VARA_LORD[frame.vaara_num as usize % 7];
    let (score, relation) = if day_lord == lord {
        (0.8, 0)
    } else if lord.friends().contains(&day_lord) {
        (0.5, 1)
    } else if lord.enemies().contains(&day_lord) {
        (-0.5, 3)
    } else {
        (0.0, 2)
    };
    let hora_window = frame
        .hora
        .as_ref()
        .and_then(Value::as_array)
        .and_then(|slots| {
            slots.iter().find(|slot| {
                slot["planet"].as_str() == Some(lord.key()) && slot["phase"].as_str() == Some("day")
            })
        })
        .map(|slot| {
            (
                slot["start_local_time_short"]
                    .as_str()
                    .unwrap_or_default()
                    .to_owned(),
                slot["end_local_time_short"]
                    .as_str()
                    .unwrap_or_default()
                    .to_owned(),
            )
        });
    VaaraHora {
        score,
        relation,
        day_lord,
        rashi_lord: lord,
        hora_window,
    }
}

/// One life domain.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Domain {
    /// Index into the domain tables.
    pub(crate) key: usize,
    /// Rounded to 4 places, as the payload and every later reader see it.
    pub(crate) score: f64,
    /// Unrounded: `percent` and `tone` are read from this.
    pub(crate) raw: f64,
    pub(crate) tenants: Vec<Graha>,
}

/// `domain_scores`.
pub(crate) fn domain_scores(frame: &DayFrame, rashi: usize, rows: &[GocharRow]) -> Vec<Domain> {
    (0..DOMAIN_HOUSES.len())
        .map(|key| {
            let houses = DOMAIN_HOUSES[key];
            let weight_total = houses.iter().fold(0.0, |acc, &(_, w)| acc + w);
            let sav_term = houses.iter().fold(0.0, |acc, &(h, w)| {
                acc + ((f64::from(frame.sav[(rashi + h - 1) % 12]) - 28.0) / 8.0) * w
            }) / weight_total;
            let (mut tenant_total, mut tenant_weight) = (0.0, 0.0);
            let mut tenants = Vec::new();
            for &(house, w) in houses {
                for row in rows.iter().filter(|r| r.house == house) {
                    tenant_total += row.score * w;
                    tenant_weight += w;
                    tenants.push(row.graha);
                }
            }
            let transit_term = if tenant_weight == 0.0 {
                0.0
            } else {
                tenant_total / tenant_weight
            };
            let karakas = DOMAIN_KARAKA[key];
            let karaka_sum = karakas.iter().fold(0.0, |acc, k| {
                acc + rows.iter().find(|r| r.graha == *k).map_or(0.0, |r| r.score)
            });
            #[expect(clippy::cast_precision_loss, reason = "two karakas")]
            let karaka_term = karaka_sum / karakas.len() as f64;
            let raw = clamp(0.40 * sav_term + 0.40 * transit_term + 0.20 * karaka_term);
            Domain {
                key,
                score: py_round(raw, 4),
                raw,
                tenants,
            }
        })
        .collect()
}

/// `score_sign`: every block of one rashi on one day.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Scored {
    pub(crate) rashi: usize,
    /// Rounded to 4 places.
    pub(crate) score: f64,
    /// Unrounded: `percent`, `stars` and `tone` are read from this.
    pub(crate) raw: f64,
    /// `_gochar_score(rows)`, unrounded as the gochar block keeps it.
    pub(crate) gochar: f64,
    pub(crate) rows: Vec<GocharRow>,
    pub(crate) chandrabala: Chandrabala,
    pub(crate) moorti: Moorti,
    pub(crate) ashtakavarga: AvBlock,
    pub(crate) rashi_lord: RashiLord,
    pub(crate) sudarshana: Sudarshana,
    pub(crate) cycle: Cycle,
    pub(crate) vaara: VaaraHora,
    pub(crate) domains: Vec<Domain>,
}

impl Scored {
    /// The block score of a layer, in `LAYER_KEYS` order.
    pub(crate) fn layer_scores(&self) -> [f64; 8] {
        [
            self.gochar,
            self.chandrabala.score,
            self.moorti.score,
            self.ashtakavarga.score,
            self.rashi_lord.score,
            self.sudarshana.score,
            self.cycle.score,
            self.vaara.score,
        ]
    }

    pub(crate) fn percent(&self) -> i64 {
        percent(self.raw)
    }

    pub(crate) fn tone(&self) -> Tone {
        Tone::for_score(self.raw)
    }
}

/// `int(round((score + 1) / 2 * 100))`.
#[expect(
    clippy::manual_midpoint,
    reason = "Python's arithmetic, operation for operation"
)]
pub(crate) fn percent(score: f64) -> i64 {
    panchanga::pyfloat::py_round_int((score + 1.0) / 2.0 * 100.0)
}

pub(crate) fn score_sign(frame: &DayFrame, rashi: usize, period: Period) -> Scored {
    let rows = gochar_rows(frame, rashi, period);
    let mut scored = Scored {
        rashi,
        score: 0.0,
        raw: 0.0,
        gochar: gochar_score(&rows),
        chandrabala: chandrabala_block(frame, rashi),
        moorti: moorti_block(frame, rashi),
        ashtakavarga: ashtakavarga_block(frame, rashi),
        rashi_lord: rashi_lord_block(frame, rashi),
        sudarshana: sudarshana_block(frame, period),
        cycle: cycle_block(frame, rashi, period),
        vaara: vaara_hora_block(frame, rashi),
        domains: domain_scores(frame, rashi, &rows),
        rows,
    };
    let weights = &LAYER_WEIGHTS[period.index()];
    let raw = scored
        .layer_scores()
        .iter()
        .zip(weights)
        .fold(0.0, |acc, (s, w)| acc + s * w);
    scored.raw = clamp(raw);
    scored.score = py_round(scored.raw, 4);
    scored
}
