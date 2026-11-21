//! Chart facts (`engine/jyotish/interpretation.py`: `PlanetFact`, `Chart`,
//! `build_chart`): each graha's sign, whole-sign house, dignity, navamsa,
//! nakshatra, combustion and Shadbala standing, the house lords and occupants,
//! and the dasha running at a moment.

use panchanga::pyfloat::{py_floordiv, py_int, py_mod};
use serde_json::Value;
use timescale::UtcInstant;

use crate::{
    Graha,
    dasha::{self, Timeline},
    graha::SIGN_LORD,
};

/// `KENDRA`.
pub const KENDRA: [usize; 4] = [1, 4, 7, 10];
/// `TRIKONA`.
pub const TRIKONA: [usize; 3] = [1, 5, 9];
/// `KENDRA | TRIKONA`.
pub const KENDRA_TRIKONA: [usize; 6] = [1, 4, 5, 7, 9, 10];
/// `DUSTHANA`.
pub const DUSTHANA: [usize; 3] = [6, 8, 12];
/// `KAMA_TRIKONA`.
pub const KAMA_TRIKONA: [usize; 3] = [3, 7, 11];
/// `PANAPARA`.
pub const PANAPARA: [usize; 4] = [2, 5, 8, 11];
/// `APOKLIMA`.
pub const APOKLIMA: [usize; 4] = [3, 6, 9, 12];
/// `MOVABLE_SIGNS` (0-based).
pub const MOVABLE_SIGNS: [usize; 4] = [0, 3, 6, 9];
/// `FIXED_SIGNS` (0-based).
pub const FIXED_SIGNS: [usize; 4] = [1, 4, 7, 10];
/// `DUAL_SIGNS` (0-based).
pub const DUAL_SIGNS: [usize; 4] = [2, 5, 8, 11];

/// `x in set`.
#[must_use]
pub fn within(x: usize, set: &[usize]) -> bool {
    set.contains(&x)
}

/// `NATURAL_BENEFICS`.
#[must_use]
pub const fn natural_benefic(g: Graha) -> bool {
    matches!(
        g,
        Graha::Jupiter | Graha::Venus | Graha::Mercury | Graha::Moon
    )
}

/// `NATURAL_MALEFICS`.
#[must_use]
pub const fn natural_malefic(g: Graha) -> bool {
    matches!(
        g,
        Graha::Sun | Graha::Mars | Graha::Saturn | Graha::Rahu | Graha::Ketu
    )
}

/// `DIGNITY_PLANETS`: the seven grahas (not the nodes).
#[must_use]
pub const fn dignity_planet(g: Graha) -> bool {
    !matches!(g, Graha::Rahu | Graha::Ketu)
}

/// `NATURAL_BENEFICS` in Python's set order is irrelevant to every use (membership,
/// `any`, `all`); this is the canonical order.
pub const BENEFICS: [Graha; 4] = [Graha::Jupiter, Graha::Venus, Graha::Mercury, Graha::Moon];
/// `NATURAL_MALEFICS`.
pub const MALEFICS: [Graha; 5] = [
    Graha::Sun,
    Graha::Mars,
    Graha::Saturn,
    Graha::Rahu,
    Graha::Ketu,
];

/// A graha's classical dignity at a longitude (`_dignity`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dignity {
    /// उच्च.
    Exalted,
    /// नीच.
    Debilitated,
    /// मूलत्रिकोण.
    Moolatrikona,
    /// स्वगृही.
    Own,
    /// मित्र राशि.
    Friend,
    /// शत्रु राशि.
    Enemy,
    /// सम राशि.
    Neutral,
}

impl Dignity {
    /// The payload label.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Exalted => "exalted",
            Self::Debilitated => "debilitated",
            Self::Moolatrikona => "moolatrikona",
            Self::Own => "own",
            Self::Friend => "friend",
            Self::Enemy => "enemy",
            Self::Neutral => "neutral",
        }
    }
}

/// `_norm`.
#[must_use]
pub fn norm(d: f64) -> f64 {
    py_mod(d, 360.0)
}

fn to_index(x: i64) -> usize {
    usize::try_from(x).unwrap_or(0)
}

/// `sign_of`: 0-based sign.
#[must_use]
pub fn sign_of(longitude: f64) -> usize {
    to_index(py_int(py_floordiv(norm(longitude), 30.0)) % 12)
}

/// `navamsa_sign`: 0-based D9 sign.
#[must_use]
pub fn navamsa_sign(longitude: f64) -> usize {
    to_index(py_int(norm(longitude) / (10.0 / 3.0)) % 12)
}

/// `nakshatra_of`: 0-based nakshatra and 1-based pada.
#[must_use]
pub fn nakshatra_of(longitude: f64) -> (usize, usize) {
    let span = 360.0 / 27.0;
    let lon = norm(longitude);
    let idx = to_index(py_int(lon / span) % 27);
    let pada = to_index(py_int(py_mod(lon, span) / (span / 4.0))) + 1;
    (idx, pada)
}

/// `house_of` / `house_from`: 1-based whole-sign count from `reference` to `target`.
#[must_use]
pub const fn house_from(target_sign: usize, reference_sign: usize) -> usize {
    (target_sign + 12 - reference_sign % 12) % 12 + 1
}

/// `_angular_sep`.
#[must_use]
pub fn angular_sep(a: f64, b: f64) -> f64 {
    let d = py_mod((norm(a) - norm(b)).abs(), 360.0);
    d.min(360.0 - d)
}

/// `combust_orb(planet, retrograde)`: the tighter orb for retrograde Mercury and Venus.
#[must_use]
pub const fn combust_orb(g: Graha, raw: RawPlanet) -> Option<f64> {
    let retrograde = raw.retrograde;
    match g {
        Graha::Mercury if retrograde => Some(12.0),
        Graha::Venus if retrograde => Some(8.0),
        Graha::Moon => Some(12.0),
        Graha::Mars => Some(17.0),
        Graha::Mercury => Some(13.0),
        Graha::Jupiter => Some(11.0),
        Graha::Venus => Some(9.0),
        Graha::Saturn => Some(15.0),
        Graha::Sun | Graha::Rahu | Graha::Ketu => None,
    }
}

/// `_dignity(planet, longitude)`; `None` for the nodes.
#[must_use]
pub fn dignity(g: Graha, longitude: f64) -> Option<Dignity> {
    let exalt = g.exalt_sign()?;
    let sign = sign_of(longitude);
    let deg = py_mod(norm(longitude), 30.0);
    if sign == exalt {
        return Some(Dignity::Exalted);
    }
    if sign == (exalt + 6) % 12 {
        return Some(Dignity::Debilitated);
    }
    if let Some((moola, lo, hi)) = g.moolatrikona()
        && sign == moola
        && lo <= deg
        && deg < hi
    {
        return Some(Dignity::Moolatrikona);
    }
    Some(sign_relation(g, sign))
}

/// The own/friend/enemy/neutral tail shared by `_dignity` and `_navamsa_dignity`.
fn sign_relation(g: Graha, sign: usize) -> Dignity {
    if g.own_signs().contains(&sign) {
        return Dignity::Own;
    }
    let dispositor = SIGN_LORD[sign];
    if dispositor == g {
        Dignity::Own
    } else if g.friends().contains(&dispositor) {
        Dignity::Friend
    } else if g.enemies().contains(&dispositor) {
        Dignity::Enemy
    } else {
        Dignity::Neutral
    }
}

/// One graha's facts (`PlanetFact`).
#[derive(Debug, Clone, PartialEq)]
pub struct PlanetFact {
    /// The graha.
    pub key: Graha,
    /// Sidereal longitude.
    pub longitude: f64,
    /// 0-based sign.
    pub sign: usize,
    /// 1-based whole-sign house from the lagna.
    pub house: usize,
    /// Retrograde.
    pub retrograde: bool,
    /// Classical dignity (`None` for the nodes).
    pub dignity: Option<Dignity>,
    /// 0-based navamsa sign.
    pub navamsa: usize,
    /// Same sign in D1 and D9.
    pub vargottama: bool,
    /// Degrees within the sign.
    pub deg_in_sign: f64,
    /// 0-based nakshatra.
    pub nakshatra: usize,
    /// 1-based pada.
    pub pada: usize,
    /// Within its combustion orb of the Sun.
    pub combust: bool,
    /// Shadbala status, when the graha has a row.
    pub shadbala_status: Option<String>,
    /// Shadbala ratio, when the graha has a row.
    pub shadbala_ratio: Option<f64>,
    /// Shadbala `breakdown.dig`, when numeric.
    pub dig_bala: Option<f64>,
}

impl PlanetFact {
    /// `_navamsa_dignity`: the navamsa sign's dignity (no degree bands).
    #[must_use]
    pub fn navamsa_dignity(&self) -> Option<Dignity> {
        let exalt = self.key.exalt_sign()?;
        let sign = self.navamsa;
        if sign == exalt {
            return Some(Dignity::Exalted);
        }
        if (sign + 6) % 12 == exalt {
            return Some(Dignity::Debilitated);
        }
        Some(sign_relation(self.key, sign))
    }

    /// `dignity in {…}`.
    #[must_use]
    pub fn dignity_in(&self, set: &[Dignity]) -> bool {
        self.dignity.is_some_and(|d| set.contains(&d))
    }

    /// `pf.dignity == d`.
    #[must_use]
    pub fn is(&self, d: Dignity) -> bool {
        self.dignity == Some(d)
    }
}

/// The running dasha (`_dasha_detail`).
#[derive(Debug, Clone, PartialEq)]
pub struct DashaNow {
    /// Mahadasha lord.
    pub maha_lord: Graha,
    /// Antardasha (bhukti) lord.
    pub antar_lord: Graha,
    /// The running mahadasha's span.
    pub maha_start: UtcInstant,
    /// Its end.
    pub maha_end: UtcInstant,
    /// The running bhukti's start (the mahadasha's when no bhukti runs).
    pub antar_start: UtcInstant,
    /// Its end.
    pub antar_end: UtcInstant,
    /// The running mahadasha's bhuktis.
    pub bhuktis: Vec<dasha::DashaPeriod>,
    /// The next (up to) three mahadashas.
    pub upcoming: Vec<dasha::DashaPeriod>,
    /// Every mahadasha from birth.
    pub full: Vec<dasha::DashaPeriod>,
}

/// All of a chart's derived facts (`Chart`). Every graha is present, as in every
/// chart the API builds.
#[derive(Debug, Clone, PartialEq)]
pub struct Chart {
    /// 0-based lagna sign.
    pub lagna_sign: usize,
    /// Lagna longitude.
    pub lagna_lon: f64,
    /// 0-based Moon sign.
    pub moon_sign: usize,
    /// 0-based Sun sign.
    pub sun_sign: usize,
    /// The nine grahas, in [`Graha::ALL`] order.
    pub planets: Vec<PlanetFact>,
    /// Occupants per house (index 1–12), in graha order.
    pub house_occupants: [Vec<Graha>; 13],
    /// Lord per house (index 1–12; index 0 unused).
    pub house_lord: [Graha; 13],
    /// The dasha running at the chart's "now".
    pub dasha: Option<DashaNow>,
    /// Day birth, when known.
    pub is_day: Option<bool>,
    /// Gulika's house, when known.
    pub gulika_house: Option<usize>,
    /// Mandi's house, when known.
    pub mandi_house: Option<usize>,
}

impl Chart {
    /// `P[g]`.
    #[must_use]
    pub fn p(&self, g: Graha) -> &PlanetFact {
        &self.planets[g.index()]
    }

    /// `chart.house_lord[h]`.
    #[must_use]
    pub fn lord(&self, house: usize) -> Graha {
        self.house_lord[house]
    }

    /// `g in chart.aspects_to(target_house)`: the 7th, plus Mars 4/8, Jupiter and the
    /// nodes 5/9, Saturn 3/10.
    #[must_use]
    pub fn aspects(&self, g: Graha, target_house: usize) -> bool {
        let house = self.p(g).house;
        let offsets: &[usize] = match g {
            Graha::Mars => &[4, 7, 8],
            Graha::Jupiter | Graha::Rahu | Graha::Ketu => &[5, 7, 9],
            Graha::Saturn => &[3, 7, 10],
            _ => &[7],
        };
        offsets
            .iter()
            .any(|off| (house - 1 + (off - 1)) % 12 + 1 == target_house)
    }

    /// `chart.aspects_to(house)`, in graha order.
    #[must_use]
    pub fn aspects_to(&self, house: usize) -> Vec<Graha> {
        Graha::ALL
            .into_iter()
            .filter(|g| self.aspects(*g, house))
            .collect()
    }
}

/// The raw inputs of [`build_chart`] for one graha.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RawPlanet {
    /// Sidereal longitude.
    pub longitude: f64,
    /// Retrograde.
    pub retrograde: bool,
}

/// One Shadbala row's fields the chart reads.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct ShadbalaFacts {
    /// `status`.
    pub status: Option<String>,
    /// `ratio`.
    pub ratio: Option<f64>,
    /// `breakdown.dig`, when numeric.
    pub dig: Option<f64>,
}

/// The per-graha facts of a `compute_shadbala` payload's `planets` rows.
#[must_use]
pub fn shadbala_facts(shadbala: &Value) -> [ShadbalaFacts; 9] {
    let mut out: [ShadbalaFacts; 9] = Default::default();
    for row in shadbala
        .get("planets")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let Some(g) = row
            .get("key")
            .and_then(Value::as_str)
            .and_then(Graha::from_key)
        else {
            continue;
        };
        out[g.index()] = ShadbalaFacts {
            status: row.get("status").and_then(Value::as_str).map(str::to_owned),
            ratio: row.get("ratio").and_then(Value::as_f64),
            dig: row
                .get("breakdown")
                .and_then(|b| b.get("dig"))
                .and_then(Value::as_f64),
        };
    }
    out
}

/// What [`build_chart`] reads besides the grahas.
#[derive(Debug, Clone, Copy)]
pub struct ChartInputs<'a> {
    /// Lagna longitude.
    pub lagna_lon: f64,
    /// Shadbala facts per graha.
    pub shadbala: &'a [ShadbalaFacts; 9],
    /// The Vimshottari timeline (UTC), for the running dasha.
    pub timeline: Option<&'a Timeline>,
    /// The chart's "now".
    pub now: UtcInstant,
    /// Day birth.
    pub is_day: Option<bool>,
    /// Gulika longitude.
    pub gulika_lon: Option<f64>,
    /// Mandi longitude.
    pub mandi_lon: Option<f64>,
}

/// `build_chart(planets, lagna, shadbala, dasha, now, …)`.
#[must_use]
pub fn build_chart(planets: &[RawPlanet; 9], inputs: &ChartInputs<'_>) -> Chart {
    let lagna_sign = sign_of(inputs.lagna_lon);
    let sun_lon = planets[Graha::Sun.index()].longitude;
    let mut house_occupants: [Vec<Graha>; 13] = Default::default();
    let mut facts = Vec::with_capacity(9);
    for g in Graha::ALL {
        let raw = planets[g.index()];
        let lon = raw.longitude;
        let sign = sign_of(lon);
        let house = house_from(sign, lagna_sign);
        let d9 = navamsa_sign(lon);
        let (nakshatra, pada) = nakshatra_of(lon);
        let sb = &inputs.shadbala[g.index()];
        let combust = combust_orb(g, raw).is_some_and(|orb| angular_sep(lon, sun_lon) < orb);
        facts.push(PlanetFact {
            key: g,
            longitude: lon,
            sign,
            house,
            retrograde: raw.retrograde,
            dignity: dignity(g, lon),
            navamsa: d9,
            vargottama: sign == d9,
            deg_in_sign: py_mod(norm(lon), 30.0),
            nakshatra,
            pada,
            combust,
            shadbala_status: sb.status.clone(),
            shadbala_ratio: sb.ratio,
            dig_bala: sb.dig,
        });
        house_occupants[house].push(g);
    }
    let mut house_lord = [Graha::Sun; 13];
    for (h, lord) in house_lord.iter_mut().enumerate().skip(1) {
        *lord = SIGN_LORD[(lagna_sign + h - 1) % 12];
    }
    let moon_sign = facts[Graha::Moon.index()].sign;
    let sun_sign = facts[Graha::Sun.index()].sign;
    Chart {
        lagna_sign,
        lagna_lon: inputs.lagna_lon,
        moon_sign,
        sun_sign,
        planets: facts,
        house_occupants,
        house_lord,
        dasha: inputs.timeline.and_then(|t| dasha_now(t, inputs.now)),
        is_day: inputs.is_day,
        gulika_house: inputs
            .gulika_lon
            .map(|l| house_from(sign_of(l), lagna_sign)),
        mandi_house: inputs.mandi_lon.map(|l| house_from(sign_of(l), lagna_sign)),
    }
}

/// `_dasha_detail`'s lords: the mahadasha containing `now`, and the bhukti of it
/// containing `now` (its first bhukti otherwise).
fn dasha_now(timeline: &Timeline, now: UtcInstant) -> Option<DashaNow> {
    let index = timeline.periods.iter().position(|p| p.contains(now))?;
    let current = &timeline.periods[index];
    let bhuktis = dasha::sub_periods(
        current.lord,
        current.start,
        current.end,
        Some(f64::from(dasha::years(current.lord))),
    );
    let antar = bhuktis
        .iter()
        .find(|b| b.contains(now))
        .or_else(|| bhuktis.first())
        .copied();
    Some(DashaNow {
        maha_lord: current.lord,
        antar_lord: antar.map_or(current.lord, |b| b.lord),
        maha_start: current.start,
        maha_end: current.end,
        antar_start: antar.map_or(current.start, |b| b.start),
        antar_end: antar.map_or(current.end, |b| b.end),
        bhuktis,
        upcoming: timeline
            .periods
            .iter()
            .skip(index + 1)
            .take(3)
            .copied()
            .collect(),
        full: timeline.periods.clone(),
    })
}
