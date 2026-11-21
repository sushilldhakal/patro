//! The `/kundali/detail` payload (`engine/jyotish/kundali_detail.py`
//! `assemble_kundali_detail`, with `bhava_bala.py`, `vimshopaka.py`,
//! `shanti_recommendation.py`, `tribhagi.py` and `yogini.py`): a birth-instant
//! panchanga plus shadbala, three dasha trees, bhava bala, vimshopaka,
//! ashtakavarga, the yoga checklist, graha shanti, 20 varga charts, upagrahas,
//! avakahada and birth facts.
//!
//! Three parts read "now" (which dashas to show, how many cycles to compute,
//! Saturn's transit): the caller passes it, so tests can fix it.

use panchanga::{
    at_time::{planetary_snapshot, vedic_day},
    daily::Location,
    pyfloat::{py_floordiv, py_int, py_mod, py_round, py_round_int},
};
use serde_json::{Map, Value, json};
use timescale::{UtcInstant, Zone};

use crate::{
    Graha, ashtakavarga,
    chart::{
        Chart, ChartInputs, DUSTHANA, Dignity, RawPlanet, angular_sep, build_chart, combust_orb,
        dignity, nakshatra_of, shadbala_facts, sign_of,
    },
    dasha::{self, Aware, System, VIMSHOTTARI, YEAR_DAYS, YOGINI},
    gochar::gochar_table,
    graha::SIGN_LORD,
    shadbala::{self, drishti, natural_rel, temporal_rel},
    vargas::{VARGA_DIVISIONS, varga_rashi},
    yogas::{full_yoga_catalog, yogas_api},
};

/// What the detail is built from.
#[derive(Debug, Clone, Copy)]
pub struct DetailInputs<'a> {
    /// The birth instant.
    pub instant: UtcInstant,
    /// The observer.
    pub location: &'a Location,
    /// The zone the birth instant is read in (`instant_local.tzinfo`).
    pub zone: &'a Zone,
    /// The real-world moment the running dasha and Saturn's transit are read at.
    pub now: UtcInstant,
}

/// A failure the route answers as a server error.
#[derive(Debug, thiserror::Error)]
#[error("{0}")]
pub struct DetailError(pub String);

const NAK_LORD: [Graha; 9] = dasha::SEQUENCE;

fn usize_of(x: i64) -> usize {
    usize::try_from(x).unwrap_or(0)
}

/// `_dms_parts`.
fn dms_parts(longitude: f64) -> Value {
    let lon = py_mod(longitude, 360.0);
    let rashi = usize_of(py_int(py_floordiv(lon, 30.0))) + 1;
    let d = py_mod(lon, 30.0);
    let mut deg = py_int(d);
    #[expect(clippy::cast_precision_loss, reason = "under 30 degrees")]
    let m_float = (d - deg as f64) * 60.0;
    let mut minute = py_int(m_float);
    #[expect(clippy::cast_precision_loss, reason = "under 60 minutes")]
    let mut sec = py_round_int((m_float - minute as f64) * 60.0);
    if sec >= 60 {
        sec -= 60;
        minute += 1;
    }
    if minute >= 60 {
        minute -= 60;
        deg += 1;
    }
    json!({"rashiNum": rashi, "deg": deg, "min": minute, "sec": sec})
}

/// `_kp_sub_lord`.
fn kp_sub_lord(longitude: f64) -> Graha {
    let lon = py_mod(longitude, 360.0);
    let span = 360.0 / 27.0;
    let nak = usize_of(py_int(py_floordiv(lon, span))).min(26);
    #[expect(clippy::cast_precision_loss, reason = "a nakshatra index")]
    let pos = lon - nak as f64 * span;
    let elapsed = (pos / span) * 120.0;
    let start = nak % 9;
    let mut cumulative = 0.0;
    for i in 0..9 {
        let lord = dasha::SEQUENCE[(start + i) % 9];
        cumulative += f64::from(dasha::years(lord));
        if elapsed < cumulative {
            return lord;
        }
    }
    dasha::SEQUENCE[start]
}

/// `_dignity_api`.
fn dignity_api(g: Graha, longitude: f64, varga_rashi: usize, division: u32) -> Value {
    if g.exalt_sign().is_none() {
        return Value::Null;
    }
    #[expect(clippy::cast_precision_loss, reason = "a sign number")]
    let raw = if division == 1 {
        dignity(g, longitude)
    } else {
        dignity(g, (varga_rashi - 1) as f64 * 30.0 + 1.0)
    };
    match raw {
        Some(Dignity::Exalted) => json!("exalted"),
        Some(Dignity::Debilitated) => json!("debilitated"),
        Some(Dignity::Moolatrikona) => json!("moolatrikona"),
        Some(Dignity::Own) => json!("own"),
        Some(Dignity::Friend) => json!("friend_house"),
        Some(Dignity::Enemy) => json!("enemy_house"),
        Some(Dignity::Neutral) => json!("neutral_house"),
        None => Value::Null,
    }
}

/// `_relation`.
fn relation(g: Graha, owner: Graha) -> Value {
    if g.exalt_sign().is_none() {
        Value::Null
    } else if g == owner {
        json!("self")
    } else if g.friends().contains(&owner) {
        json!("friend")
    } else if g.enemies().contains(&owner) {
        json!("enemy")
    } else {
        json!("neutral")
    }
}

/// `_build_varga_charts(points)`: the lagna, then the grahas.
fn varga_charts(lagna_lon: f64, planets: &[RawPlanet; 9]) -> Value {
    let points: Vec<(Option<Graha>, f64, bool)> = std::iter::once((None, lagna_lon, false))
        .chain(Graha::ALL.into_iter().map(|g| {
            (
                Some(g),
                planets[g.index()].longitude,
                planets[g.index()].retrograde,
            )
        }))
        .collect();
    let key = |g: Option<Graha>| g.map_or("lagna", Graha::key);
    let mut entries = Map::new();
    for division in VARGA_DIVISIONS {
        let rows: Vec<Value> = points
            .iter()
            .map(|&(g, lon, retro)| {
                let vr = varga_rashi(division, lon);
                let (nak, pada) = nakshatra_of(lon);
                let owner = SIGN_LORD[vr - 1];
                json!({
                    "key": key(g),
                    "vargaRashi": vr,
                    "dms": dms_parts(lon),
                    "nakshatraIndex": nak,
                    "pada": pada,
                    "nakshatraLord": NAK_LORD[nak % 9].key(),
                    "subLord": kp_sub_lord(lon).key(),
                    "ownerKey": owner.key(),
                    "relation": g.map_or(Value::Null, |g| relation(g, owner)),
                    "dignity": g.map_or(Value::Null, |g| dignity_api(g, lon, vr, division)),
                    "retrograde": g.is_some() && retro,
                })
            })
            .collect();
        entries.insert(division.to_string(), Value::Array(rows));
    }
    let mut point_map = Map::new();
    for &(g, lon, retro) in &points {
        let mut m = Map::new();
        m.insert("longitude".into(), json!(lon));
        if retro {
            m.insert("retrograde".into(), json!(true));
        }
        point_map.insert(key(g).into(), Value::Object(m));
    }
    let mut owned = Map::new();
    for g in Graha::ALL {
        let signs: Vec<usize> = (1..=12).filter(|r| SIGN_LORD[r - 1] == g).collect();
        owned.insert(g.key().into(), json!(signs));
    }
    json!({
        "divisions": VARGA_DIVISIONS,
        "points": point_map,
        "entries": entries,
        "ownedRashis": owned,
    })
}

/// `_cycles_for_horizon(birth, cycle_years)`.
fn cycles_for_horizon(birth: UtcInstant, cycle_years: f64, now: UtcInstant) -> usize {
    let elapsed = (now.seconds_since(birth) / (365.2425 * 86400.0)).max(0.0);
    let needed = elapsed + 10.0;
    usize_of(py_int((needed / cycle_years).ceil())).max(1)
}

/// One mahadasha row before payload: lord key, Nepali name, start, end, years.
struct Maha {
    lord: &'static str,
    lord_ne: &'static str,
    start: UtcInstant,
    end: UtcInstant,
    years: Value,
}

fn utc_iso(at: UtcInstant) -> String {
    Aware { utc: at, offset: 0 }.iso()
}

fn aware(at: UtcInstant) -> Aware {
    Aware { utc: at, offset: 0 }
}

/// `mahadashas_from_birth` over `system`, `full(i)` the years of lord `i`.
fn mahadashas(
    system: &System,
    start_index: usize,
    balance_years: f64,
    full: &dyn Fn(usize) -> Value,
    birth: UtcInstant,
    cycles: usize,
) -> Vec<Maha> {
    let n = system.keys.len();
    let first_end = birth.add_days_f64(balance_years * YEAR_DAYS);
    let mut out = vec![Maha {
        lord: system.keys[start_index],
        lord_ne: system.names_ne[start_index],
        start: birth,
        end: first_end,
        years: json!(balance_years),
    }];
    let mut cursor = first_end;
    for step in 1..n * cycles {
        let i = (start_index + step) % n;
        let years = full(i);
        let end = cursor.add_days_f64(years.as_f64().unwrap_or(0.0) * YEAR_DAYS);
        out.push(Maha {
            lord: system.keys[i],
            lord_ne: system.names_ne[i],
            start: cursor,
            end,
            years,
        });
        cursor = end;
    }
    out
}

fn sequence_payload(rows: &[Maha]) -> Value {
    Value::Array(
        rows.iter()
            .map(|m| {
                json!({
                    "lord": m.lord, "lord_ne": m.lord_ne,
                    "start": utc_iso(m.start), "end": utc_iso(m.end), "years": m.years,
                })
            })
            .collect(),
    )
}

/// How a dasha tree subdivides: the sub-period cycle and the lord years it scales by.
struct TreeSpec<'a> {
    system: &'a System,
    depth: usize,
}

/// `_tree_node`.
fn tree_node(
    spec: &TreeSpec<'_>,
    lord: &str,
    start: Aware,
    end: Aware,
    depth: usize,
    parent_full: Option<f64>,
) -> Value {
    let i = spec
        .system
        .keys
        .iter()
        .position(|k| *k == lord)
        .unwrap_or(0);
    let mut node = Map::new();
    node.insert("lord".into(), json!(lord));
    node.insert("lord_ne".into(), json!(spec.system.names_ne[i]));
    node.insert("start".into(), json!(start.iso()));
    node.insert("end".into(), json!(end.iso()));
    if depth > 1 {
        let visible = end.utc.seconds_since(start.utc) / (YEAR_DAYS * 86400.0);
        let full = parent_full.unwrap_or(visible);
        let children: Vec<Value> =
            dasha::sub_periods_aware(spec.system, lord, start, end, parent_full)
                .unwrap_or_default()
                .into_iter()
                .map(|(ci, cs, ce)| {
                    let child_full = full * spec.system.years[ci] / spec.system.cycle_years;
                    tree_node(
                        spec,
                        spec.system.keys[ci],
                        cs,
                        ce,
                        depth - 1,
                        Some(child_full),
                    )
                })
                .collect();
        node.insert("children".into(), Value::Array(children));
    }
    Value::Object(node)
}

/// `_build_dasha_tree(dasha, tree_depth, maha_count=3, md_full_years=…)`.
fn dasha_tree(
    mut header: Map<String, Value>,
    rows: &[Maha],
    spec: &TreeSpec<'_>,
    now: UtcInstant,
) -> Value {
    let current = rows.iter().position(|m| m.start <= now && now < m.end);
    let window: &[Maha] = match current {
        None => &rows[..rows.len().min(3)],
        Some(ci) => {
            let start = ci.saturating_sub(1).min(rows.len().saturating_sub(3));
            &rows[start..(start + 3).min(rows.len())]
        }
    };
    let tree: Vec<Value> = window
        .iter()
        .map(|m| {
            let i = spec
                .system
                .keys
                .iter()
                .position(|k| *k == m.lord)
                .unwrap_or(0);
            let md_full = spec.system.years[i];
            tree_node(
                spec,
                m.lord,
                aware(m.start),
                aware(m.end),
                spec.depth,
                Some(md_full),
            )
        })
        .collect();
    header.insert("tree".into(), Value::Array(tree));
    header.insert("tree_depth".into(), json!(spec.depth));
    Value::Object(header)
}

fn header(pairs: Vec<(&str, Value)>) -> Map<String, Value> {
    pairs.into_iter().map(|(k, v)| (k.to_owned(), v)).collect()
}

/// The three dasha trees: Vimshottari, Tribhagi, Yogini.
fn dasha_trees(
    moon_lon: f64,
    birth: UtcInstant,
    now: UtcInstant,
) -> (Value, Value, Value, dasha::Timeline) {
    let span = 360.0 / 27.0;
    let lon = py_mod(moon_lon, 360.0);
    let nak = usize_of(py_int(py_floordiv(lon, span)));
    let pos = py_mod(lon, span);
    let fraction = pos / span;

    // Vimshottari.
    let cycles = cycles_for_horizon(birth, 120.0, now);
    let timeline = dasha::vimshottari_timeline(moon_lon, birth, cycles);
    let vim_payload = dasha::vimshottari_payload(moon_lon, birth, cycles);
    let vim_rows: Vec<Maha> = timeline
        .periods
        .iter()
        .enumerate()
        .map(|(i, p)| Maha {
            lord: p.lord.key(),
            lord_ne: dasha::lord_ne(p.lord),
            start: p.start,
            end: p.end,
            years: if i == 0 {
                json!(timeline.balance_years)
            } else {
                json!(dasha::years(p.lord))
            },
        })
        .collect();
    let vim_header = match vim_payload {
        Value::Object(m) => m,
        _ => Map::new(),
    };
    let vimshottari = dasha_tree(
        vim_header,
        &vim_rows,
        &TreeSpec {
            system: &VIMSHOTTARI,
            depth: 3,
        },
        now,
    );

    // Tribhagi: Vimshottari at a third, from the janma-nakshatra lord.
    let lord = dasha::SEQUENCE[nak % 9];
    let start_idx = VIMSHOTTARI
        .keys
        .iter()
        .position(|k| *k == lord.key())
        .unwrap_or(0);
    let third = |i: usize| VIMSHOTTARI.years[i] / 3.0;
    let tri_balance = (1.0 - fraction) * third(start_idx);
    let tri_turns = cycles_for_horizon(birth, 120.0 / 3.0, now);
    let tri_rows = mahadashas(
        &VIMSHOTTARI,
        start_idx,
        tri_balance,
        &|i| json!(third(i)),
        birth,
        tri_turns,
    );
    let third_part = usize_of(py_int(pos / (span / 3.0))).min(2);
    let tri_header = header(vec![
        ("system", json!("tribhagi")),
        ("nakshatra_index", json!(nak)),
        ("tribhaga", json!(third_part + 1)),
        ("mahadasha_lord", json!(lord.key())),
        ("mahadasha_lord_ne", json!(dasha::lord_ne(lord))),
        ("balance_years", json!(tri_balance)),
        ("balance_label", json!(dasha::years_label(tri_balance))),
        ("sequence", sequence_payload(&tri_rows)),
    ]);
    let tribhagi = tribhagi_tree(tri_header, &tri_rows, now);

    // Yogini.
    let y_start = (nak + 3) % 8;
    let y_balance = (1.0 - fraction) * YOGINI.years[y_start];
    let y_cycles = cycles_for_horizon(birth, 36.0, now);
    #[expect(clippy::cast_possible_truncation, reason = "yogini years are 1..8")]
    let y_rows = mahadashas(
        &YOGINI,
        y_start,
        y_balance,
        &|i| json!(YOGINI.years[i] as i64),
        birth,
        y_cycles,
    );
    let y_header = header(vec![
        ("system", json!("yogini")),
        ("nakshatra_index", json!(nak)),
        ("mahadasha_lord", json!(YOGINI.keys[y_start])),
        ("mahadasha_lord_ne", json!(YOGINI.names_ne[y_start])),
        ("balance_years", json!(y_balance)),
        ("balance_label", json!(dasha::years_label(y_balance))),
        ("cycle_years", json!(36)),
        ("sequence", sequence_payload(&y_rows)),
    ]);
    let yogini = dasha_tree(
        y_header,
        &y_rows,
        &TreeSpec {
            system: &YOGINI,
            depth: 2,
        },
        now,
    );
    (vimshottari, tribhagi, yogini, timeline)
}

/// Tribhagi's tree: Vimshottari sub-periods under mahadashas a third as long.
fn tribhagi_tree(mut header: Map<String, Value>, rows: &[Maha], now: UtcInstant) -> Value {
    let spec = TreeSpec {
        system: &VIMSHOTTARI,
        depth: 3,
    };
    let current = rows.iter().position(|m| m.start <= now && now < m.end);
    let window: &[Maha] = match current {
        None => &rows[..rows.len().min(3)],
        Some(ci) => {
            let start = ci.saturating_sub(1).min(rows.len().saturating_sub(3));
            &rows[start..(start + 3).min(rows.len())]
        }
    };
    let tree: Vec<Value> = window
        .iter()
        .map(|m| {
            let i = VIMSHOTTARI
                .keys
                .iter()
                .position(|k| *k == m.lord)
                .unwrap_or(0);
            tree_node(
                &spec,
                m.lord,
                aware(m.start),
                aware(m.end),
                3,
                Some(VIMSHOTTARI.years[i] / 3.0),
            )
        })
        .collect();
    header.insert("tree".into(), Value::Array(tree));
    header.insert("tree_depth".into(), json!(3));
    Value::Object(header)
}

// ── Bhava Bala (bhava_bala.py) ─────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq, Eq)]
enum SignType {
    Human,
    Quadruped,
    Watery,
    Insect,
}

fn sign_type_at(degree: f64) -> SignType {
    let degree = py_mod(degree, 360.0);
    let sign = usize_of(py_int(py_floordiv(degree, 30.0)));
    let within = py_mod(degree, 30.0);
    match sign {
        8 => {
            if within < 15.0 {
                SignType::Human
            } else {
                SignType::Quadruped
            }
        }
        9 => {
            if within < 15.0 {
                SignType::Quadruped
            } else {
                SignType::Watery
            }
        }
        0 | 1 | 4 => SignType::Quadruped,
        2 | 5 | 6 | 10 => SignType::Human,
        3 | 11 => SignType::Watery,
        _ => SignType::Insect,
    }
}

fn dig_bala(house: usize, madhya: f64) -> f64 {
    let strong = match sign_type_at(madhya) {
        SignType::Human => 1,
        SignType::Quadruped => 10,
        SignType::Watery => 4,
        SignType::Insect => 7,
    };
    let weak = (strong - 1 + 6) % 12 + 1;
    let dist = house.abs_diff(weak);
    let dist = dist.min(12 - dist);
    #[expect(clippy::cast_precision_loss, reason = "0..6")]
    let d = dist as f64;
    10.0 * d
}

fn shadbala_benefic(g: Graha) -> bool {
    matches!(
        g,
        Graha::Moon | Graha::Mercury | Graha::Jupiter | Graha::Venus
    )
}

/// `compute_bhava_bala(lagna_lon, planet_lons, shadbala)`.
#[expect(
    clippy::too_many_lines,
    reason = "the twelve bhavas, then the three summaries"
)]
fn bhava_bala(lagna_lon: f64, lons: &[f64; 9], shadbala_payload: &Value) -> Value {
    let virupas = |g: Graha| -> f64 {
        shadbala_payload["planets"]
            .as_array()
            .and_then(|rows| rows.iter().find(|r| r["key"] == g.key()))
            .and_then(|r| r["total_virupas"].as_f64())
            .unwrap_or(0.0)
    };
    let norm = |x: f64| py_mod(x, 360.0);
    let mut houses: Vec<Value> = Vec::with_capacity(12);
    let mut totals: Vec<f64> = Vec::with_capacity(12);
    for house in 1..=12usize {
        #[expect(clippy::cast_precision_loss, reason = "a house number")]
        let madhya = norm(lagna_lon + (house - 1) as f64 * 30.0);
        let sign = usize_of(py_int(py_floordiv(madhya, 30.0))) % 12;
        let lord = SIGN_LORD[sign];
        let bhavadhipati = virupas(lord);
        let disha = dig_bala(house, madhya);
        let mut drishti_base = 0.0;
        for g in Graha::SEVEN {
            let d = drishti(g, norm(madhya - lons[g.index()]));
            drishti_base += if shadbala_benefic(g) { d } else { -d };
        }
        let mut special = 0.0;
        let mut qualifiers = vec![lord];
        for g in [Graha::Jupiter, Graha::Venus, Graha::Mercury] {
            if !qualifiers.contains(&g) {
                qualifiers.push(g);
            }
        }
        for g in qualifiers {
            let lon = lons[g.index()];
            if usize_of(py_int(py_floordiv(norm(lon), 30.0))) == sign {
                special += 60.0;
            } else {
                special += drishti(g, norm(madhya - lon));
            }
        }
        let drishti_total = drishti_base + special;
        let total = bhavadhipati + disha + drishti_total;
        totals.push(total);
        houses.push(json!({
            "house": house,
            "madhyaLongitude": py_round(madhya, 4),
            "lordKey": lord.key(),
            "lordName": lord.en(),
            "bhavadhipati": py_round(bhavadhipati, 2),
            "disha": py_round(disha, 2),
            "drishti": py_round(drishti_total, 2),
            "drishtiBase": py_round(drishti_base, 2),
            "specialAddition": py_round(special, 2),
            "totalVirupas": py_round(total, 2),
            "totalPinda": py_round(total, 2),
            "rupas": py_round(total / 60.0, 2),
            "percent": py_round(total / 500.0 * 100.0, 2),
        }));
    }
    let pinda = |i: usize| houses[i]["totalPinda"].as_f64().unwrap_or(0.0);
    let mut strongest = 0;
    let mut weakest = 0;
    for i in 1..12 {
        if pinda(i) > pinda(strongest) {
            strongest = i;
        }
        if pinda(i) < pinda(weakest) {
            weakest = i;
        }
    }
    let mut rulership = Map::new();
    for g in Graha::SEVEN {
        let ruled: Vec<f64> = houses
            .iter()
            .filter(|h| h["lordKey"] == g.key())
            .filter_map(|h| h["percent"].as_f64())
            .collect();
        if !ruled.is_empty() {
            #[expect(clippy::cast_precision_loss, reason = "one or two houses")]
            let n = ruled.len() as f64;
            rulership.insert(
                g.key().into(),
                json!(py_round(ruled.iter().sum::<f64>() / n, 2)),
            );
        }
    }
    let mut bhava_percent = Map::new();
    for g in Graha::SEVEN {
        let off = norm(lons[g.index()] - lagna_lon + 15.0);
        let house = usize_of(py_int(py_floordiv(off, 30.0))) + 1;
        let signed = py_mod(off, 30.0) - 15.0;
        bhava_percent.insert(
            g.key().into(),
            json!({
                "house": house,
                "offsetFromMadhya": py_round(signed, 4),
                "percent": py_round(((1.0 - signed.abs() / 15.0) * 100.0).max(0.0), 2),
            }),
        );
    }
    json!({
        "houses": houses,
        "strongest": houses[strongest],
        "weakest": houses[weakest],
        "rulershipPercent": rulership,
        "referenceVirupas": 500.0,
        "planetBhavaPercent": bhava_percent,
    })
}

// ── Vimshopaka (vimshopaka.py) ─────────────────────────────────────────────

/// A Vimshopaka classification: key, label, Nepali label, (division, Swavishwa points).
type Classification = (
    &'static str,
    &'static str,
    &'static str,
    &'static [(u32, f64)],
);

const CLASSIFICATIONS: [Classification; 4] = [
    (
        "shadvarga",
        "Shadvarga (6)",
        "षड्वर्ग (६)",
        &[(1, 6.0), (2, 2.0), (3, 4.0), (9, 5.0), (12, 2.0), (30, 1.0)],
    ),
    (
        "saptavarga",
        "Saptavarga (7)",
        "सप्तवर्ग (७)",
        &[
            (1, 5.0),
            (2, 2.0),
            (3, 3.0),
            (7, 2.5),
            (9, 4.5),
            (12, 2.0),
            (30, 1.0),
        ],
    ),
    (
        "dashavarga",
        "Dashavarga (10)",
        "दशवर्ग (१०)",
        &[
            (1, 3.0),
            (2, 1.5),
            (3, 1.5),
            (7, 1.5),
            (9, 3.0),
            (10, 1.5),
            (12, 1.5),
            (16, 1.5),
            (30, 1.5),
            (60, 3.5),
        ],
    ),
    (
        "shodashavarga",
        "Shodashavarga (16)",
        "षोडशवर्ग (१६)",
        &[
            (1, 3.5),
            (2, 1.0),
            (3, 1.0),
            (4, 0.5),
            (7, 0.5),
            (9, 3.0),
            (10, 0.5),
            (12, 0.5),
            (16, 2.0),
            (20, 0.5),
            (24, 0.5),
            (27, 0.5),
            (30, 1.0),
            (40, 0.5),
            (45, 0.5),
            (60, 4.0),
        ],
    ),
];

fn vimshopaka(lons: &[f64; 9]) -> Value {
    let mut d1 = [0usize; 9];
    for g in Graha::SEVEN {
        d1[g.index()] = sign_of(lons[g.index()]);
    }
    let vishwa = |p: Graha, sign: usize| -> f64 {
        let lord = SIGN_LORD[sign];
        let exalt = sign_of(shadbala::exalt_deg(p));
        if lord == p || sign == exalt {
            return 20.0;
        }
        if sign == (exalt + 6) % 12 {
            return 0.0;
        }
        match natural_rel(p, lord) + temporal_rel(p, lord, &d1) {
            2 => 18.0,
            1 => 15.0,
            0 => 10.0,
            -1 => 7.0,
            _ => 5.0,
        }
    };
    let grade = |s: f64| {
        if s >= 15.0 {
            "full"
        } else if s >= 10.0 {
            "mediocre"
        } else if s >= 5.0 {
            "little"
        } else {
            "incapable"
        }
    };
    let planets: Vec<Value> = Graha::SEVEN
        .into_iter()
        .map(|p| {
            let mut scores = Map::new();
            for (key, _, _, table) in CLASSIFICATIONS {
                let mut total = 0.0;
                for &(division, points) in table {
                    let sign = varga_rashi(division, lons[p.index()]) - 1;
                    total += points * vishwa(p, sign) / 20.0;
                }
                scores.insert(key.into(), json!({"score": py_round(total, 2), "grade": grade(total)}));
            }
            json!({"key": p.key(), "name": p.en(), "name_ne": shadbala::name_ne(p), "scores": scores})
        })
        .collect();
    let classifications: Vec<Value> = CLASSIFICATIONS
        .iter()
        .map(|(key, label, label_ne, table)| {
            json!({
                "key": key, "label": label, "label_ne": label_ne,
                "divisions": table.iter().map(|(d, _)| *d).collect::<Vec<_>>(),
            })
        })
        .collect();
    json!({
        "classifications": classifications,
        "planets": planets,
        "max_score": 20,
        "method": "Vimshopaka Bala (Parashari, 20-point varga strength)",
    })
}

// ── Avakahada and birth facts ─────────────────────────────────────────────

/// `_AVAKAHADA_ROWS`: name, English name, aksharas, charan rashis, yoni, gana.
/// An Avakahada row: name, English name, aksharas, charan rashis, yoni, gana.
type AvakahadaRow = (
    &'static str,
    &'static str,
    [&'static str; 4],
    [usize; 4],
    &'static str,
    &'static str,
);

const AVAKAHADA: [AvakahadaRow; 27] = [
    (
        "अश्विनी",
        "Ashwini",
        ["चू", "चे", "चो", "ला"],
        [1, 1, 1, 1],
        "अश्व",
        "देव",
    ),
    (
        "भरणी",
        "Bharani",
        ["ली", "लू", "ले", "लो"],
        [1, 1, 1, 1],
        "गज",
        "नर",
    ),
    (
        "कृत्तिका",
        "Krittika",
        ["अ", "ई", "उ", "ए"],
        [1, 2, 2, 2],
        "अज",
        "राक्षस",
    ),
    (
        "रोहिणी",
        "Rohini",
        ["ओ", "वा", "वी", "वू"],
        [2, 2, 2, 2],
        "सर्प",
        "नर",
    ),
    (
        "मृगशिरा",
        "Mrigashira",
        ["वे", "वो", "का", "की"],
        [2, 2, 3, 3],
        "सर्प",
        "देव",
    ),
    (
        "आर्द्रा",
        "Ardra",
        ["कु", "घ", "ङ", "छ"],
        [3, 3, 3, 3],
        "श्वान",
        "नर",
    ),
    (
        "पुनर्वसु",
        "Punarvasu",
        ["के", "को", "हा", "ही"],
        [3, 3, 3, 4],
        "मार्जार",
        "देव",
    ),
    (
        "पुष्य",
        "Pushya",
        ["हु", "हे", "हो", "डा"],
        [4, 4, 4, 4],
        "अज",
        "देव",
    ),
    (
        "आश्लेषा",
        "Ashlesha",
        ["डी", "डू", "डे", "डो"],
        [4, 4, 4, 4],
        "मार्जार",
        "राक्षस",
    ),
    (
        "मघा",
        "Magha",
        ["मा", "मी", "मू", "मे"],
        [5, 5, 5, 5],
        "मूषक",
        "राक्षस",
    ),
    (
        "पूर्वाफाल्गुनी",
        "Purva Phalguni",
        ["मो", "टा", "टी", "टू"],
        [5, 5, 5, 5],
        "मूषक",
        "नर",
    ),
    (
        "उत्तराफाल्गुनी",
        "Uttara Phalguni",
        ["टे", "टो", "पा", "पी"],
        [5, 6, 6, 6],
        "गौ",
        "नर",
    ),
    (
        "हस्त",
        "Hasta",
        ["पू", "ष", "ण", "ठ"],
        [6, 6, 6, 6],
        "महिष",
        "देव",
    ),
    (
        "चित्रा",
        "Chitra",
        ["पे", "पो", "रा", "री"],
        [6, 6, 7, 7],
        "व्याघ्र",
        "राक्षस",
    ),
    (
        "स्वाती",
        "Swati",
        ["रू", "रे", "रो", "ता"],
        [7, 7, 7, 7],
        "महिष",
        "देव",
    ),
    (
        "विशाखा",
        "Vishakha",
        ["ती", "तू", "ते", "तो"],
        [7, 7, 7, 8],
        "व्याघ्र",
        "राक्षस",
    ),
    (
        "अनुराधा",
        "Anuradha",
        ["ना", "नी", "नू", "ने"],
        [8, 8, 8, 8],
        "मृग",
        "देव",
    ),
    (
        "ज्येष्ठा",
        "Jyeshtha",
        ["नो", "या", "यी", "यू"],
        [8, 8, 8, 8],
        "मृग",
        "राक्षस",
    ),
    (
        "मूल",
        "Mula",
        ["ये", "यो", "भा", "भी"],
        [9, 9, 9, 9],
        "श्वान",
        "राक्षस",
    ),
    (
        "पूर्वाषाढा",
        "Purva Ashadha",
        ["भू", "धा", "फा", "ढा"],
        [9, 9, 9, 9],
        "वानर",
        "नर",
    ),
    (
        "उत्तराषाढा",
        "Uttara Ashadha",
        ["भे", "भो", "जा", "जी"],
        [9, 10, 10, 10],
        "नकुल",
        "नर",
    ),
    (
        "श्रवण",
        "Shravana",
        ["खी", "खू", "खे", "खो"],
        [10, 10, 10, 10],
        "वानर",
        "देव",
    ),
    (
        "धनिष्ठा",
        "Dhanishta",
        ["गा", "गी", "गु", "गे"],
        [10, 10, 11, 11],
        "सिंह",
        "राक्षस",
    ),
    (
        "शतभिषा",
        "Shatabhisha",
        ["गो", "सा", "सी", "सू"],
        [11, 11, 11, 11],
        "अश्व",
        "राक्षस",
    ),
    (
        "पूर्वाभाद्रपदा",
        "Purva Bhadrapada",
        ["से", "सो", "दा", "दी"],
        [11, 11, 11, 12],
        "सिंह",
        "नर",
    ),
    (
        "उत्तराभाद्रपदा",
        "Uttara Bhadrapada",
        ["दू", "थ", "झ", "ञ"],
        [12, 12, 12, 12],
        "गौ",
        "नर",
    ),
    (
        "रेवती",
        "Revati",
        ["दे", "दो", "च", "ची"],
        [12, 12, 12, 12],
        "गज",
        "देव",
    ),
];
const ELEM_NE: [&str; 4] = ["अग्नि", "पृथ्वी", "वायु", "जल"];
const ELEM_EN: [&str; 4] = ["Fire", "Earth", "Air", "Water"];
const VARNA_NE: [&str; 4] = ["क्षत्रिय", "वैश्य", "शूद्र", "विप्र"];
const VARNA_EN: [&str; 4] = ["Kshatriya", "Vaishya", "Shudra", "Brahmin"];
const PAYA_NE: [&str; 4] = ["सुवर्ण", "रजत", "ताम्र", "लोह"];
const PAYA_EN: [&str; 4] = ["Gold", "Silver", "Copper", "Iron"];
const NAKSHATRA_PAYA: [usize; 27] = [
    0, 0, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0,
];
const YUNJA_NE: [&str; 3] = ["आदि", "मध्य", "अन्त्य"];
const YUNJA_EN: [&str; 3] = ["Adi", "Madhya", "Antya"];
const NADI_NE: [&str; 3] = ["आद्य", "मध्य", "अन्त्य"];
const NADI_EN: [&str; 3] = ["Aadi", "Madhya", "Antya"];
const VASHYA_NE: [&str; 12] = [
    "चतुष्पद",
    "चतुष्पद",
    "मानव",
    "जलचर",
    "वनचर",
    "मानव",
    "मानव",
    "कीट",
    "मानव",
    "जलचर",
    "मानव",
    "जलचर",
];
const VASHYA_EN: [&str; 12] = [
    "Quadruped",
    "Quadruped",
    "Manava",
    "Aquatic",
    "Wild",
    "Manava",
    "Manava",
    "Insect",
    "Manava",
    "Aquatic",
    "Manava",
    "Aquatic",
];
const ASANA_NE: [&str; 4] = ["खट्वाङ्ग", "मञ्च", "भद्रपीठ", "शयन"];
const ASANA_EN: [&str; 4] = ["Khattvanga", "Mancha", "Bhadrasana", "Shayana"];
const TARA_NE: [&str; 9] = [
    "जन्म",
    "सम्पत्",
    "विपत्",
    "क्षेम",
    "प्रत्यक्",
    "साधक",
    "निधन",
    "मित्र",
    "परम मित्र",
];
const TARA_EN: [&str; 9] = [
    "Janma",
    "Sampat",
    "Vipat",
    "Kshema",
    "Pratyak",
    "Sadhaka",
    "Naidhana",
    "Mitra",
    "Parama Mitra",
];

fn bi(ne: &str, en: &str) -> Value {
    json!({"ne": ne, "en": en})
}

/// `_build_avakahada(moon_lon, moon_rashi, lagna_rashi)`.
fn avakahada(moon_lon: f64, moon_rashi: usize, lagna_rashi: usize) -> Value {
    let (nak, pada) = nakshatra_of(moon_lon);
    let (name_ne, name_en, aksharas, charan, yoni, gana) = AVAKAHADA[nak];
    let pi = pada.clamp(1, 4) - 1;
    let varna = (charan[pi] - 1) % 4;
    let bhava = (moon_rashi + 12 - lagna_rashi) % 12 + 1;
    let rashi_paya = match bhava {
        1 | 6 | 11 => 0,
        2 | 5 | 9 => 1,
        3 | 7 | 10 => 2,
        _ => 3,
    };
    let np = NAKSHATRA_PAYA[nak];
    let yunja = if nak < 9 {
        0
    } else if nak < 18 {
        1
    } else {
        2
    };
    let (gana_ne, gana_en) = match gana {
        "देव" => ("देव", "Deva"),
        "नर" => ("मनुष्य", "Manushya"),
        _ => ("राक्षस", "Rakshasa"),
    };
    json!({
        "nakshatra": bi(name_ne, name_en),
        "nakshatraIndex": nak,
        "pada": pada,
        "rashiPaya": bi(PAYA_NE[rashi_paya], PAYA_EN[rashi_paya]),
        "nakshatraPaya": bi(PAYA_NE[np], PAYA_EN[np]),
        "tattva": bi(ELEM_NE[(moon_rashi - 1) % 4], ELEM_EN[(moon_rashi - 1) % 4]),
        "yunja": bi(YUNJA_NE[yunja], YUNJA_EN[yunja]),
        "vashya": bi(VASHYA_NE[moon_rashi - 1], VASHYA_EN[moon_rashi - 1]),
        "tara": bi(TARA_NE[nak % 9], TARA_EN[nak % 9]),
        "gana": bi(gana_ne, gana_en),
        "akshara": bi(aksharas[pi], aksharas[pi]),
        "nadi": bi(NADI_NE[nak % 3], NADI_EN[nak % 3]),
        "asana": bi(ASANA_NE[pi], ASANA_EN[pi]),
        "yoni": bi(yoni, yoni),
        "jati": bi(VARNA_NE[varna], VARNA_EN[varna]),
    })
}

/// `_ghadi_from_seconds` (`seconds_to_ghadi_pala`'s three fields).
fn ghadi(total_seconds: f64) -> Value {
    let g = py_int(py_floordiv(total_seconds, 1440.0));
    let remaining = py_mod(total_seconds, 1440.0);
    let pala = py_int(py_floordiv(remaining, 24.0));
    let vipala = py_int(py_mod(remaining, 24.0) * (60.0 / 24.0));
    json!({"ghadi": g, "pala": pala, "vipala": vipala})
}

/// `_signed_solar_minutes(solar_corrections.belaantar)`.
fn belaantar_minutes(panchanga: &Value) -> f64 {
    let detail = &panchanga["detail"];
    let sc = detail
        .get("solar_corrections")
        .filter(|v| !v.is_null())
        .or_else(|| panchanga.get("solar_corrections"));
    let Some(block) = sc
        .and_then(|s| s.get("belaantar"))
        .filter(|b| b.as_object().is_some_and(|m| !m.is_empty()))
    else {
        return 0.0;
    };
    let total =
        block["minutes"].as_f64().unwrap_or(0.0) + block["seconds"].as_f64().unwrap_or(0.0) / 60.0;
    if block["sign"] == "rin" {
        -total
    } else {
        total
    }
}

fn clock_minutes(clock: Option<&str>) -> Option<i64> {
    let clock = clock?.trim();
    let mut parts = clock.split(':');
    let h: i64 = parts.next()?.parse().ok()?;
    let m: i64 = parts.next()?.parse().ok()?;
    Some(h * 60 + m)
}

/// `_choghadiya_at_birth(panchanga, birth_clock)`.
fn choghadiya_at_birth(panchanga: &Value, birth_clock: &str) -> Value {
    let sunrise = panchanga["sun"]["sunrise"].as_str();
    let sunset = panchanga["sun"]["sunset"].as_str();
    let (Some(sr), Some(birth)) = (clock_minutes(sunrise), clock_minutes(Some(birth_clock))) else {
        return Value::Null;
    };
    let Some(ss) = clock_minutes(sunset) else {
        return Value::Null;
    };
    #[expect(clippy::cast_precision_loss, reason = "minutes of a day")]
    let mut day_g = (ss - sr) as f64 / 24.0;
    while day_g < 0.0 {
        day_g += 60.0;
    }
    let day_g = day_g.min(60.0);
    let vaara = panchanga["vaara"]["number"]
        .as_u64()
        .and_then(|v| u32::try_from(v).ok())
        .unwrap_or(0);
    let segments = panchanga::choghadiya_segments(day_g, vaara);
    #[expect(clippy::cast_precision_loss, reason = "minutes of a day")]
    let mut g = (birth - sr) as f64 / 24.0;
    while g < 0.0 {
        g += 60.0;
    }
    let g = g.min(60.0);
    let Some(seg) = segments.as_array().and_then(|s| {
        s.iter().find(|x| {
            x["start_g"].as_f64().is_some_and(|a| a <= g)
                && x["end_g"].as_f64().is_some_and(|b| g < b)
        })
    }) else {
        return Value::Null;
    };
    let name_ne = seg["name_ne"].as_str().unwrap_or("");
    let bad = seg["bad"].as_bool().unwrap_or(false);
    let quality = if bad {
        "अशुभ"
    } else if matches!(name_ne, "लाभ" | "अमृत" | "शुभ") {
        "शुभ"
    } else {
        "सामान्य"
    };
    let name_en = match name_ne {
        "उद्वेग" => json!("Udvega"),
        "चर" => json!("Chara"),
        "लाभ" => json!("Labha"),
        "अमृत" => json!("Amrita"),
        "काल" => json!("Kala"),
        "शुभ" => json!("Shubha"),
        "रोग" => json!("Roga"),
        _ => Value::Null,
    };
    json!({"nameNe": name_ne, "nameEn": name_en, "quality": quality, "bad": bad})
}

/// `_format_upagrahas`.
fn upagrahas(rows: &[Value]) -> Value {
    Value::Array(
        rows.iter()
            .map(|row| {
                let lon = row["longitude"].as_f64().unwrap_or(0.0);
                let (nak, pada) = nakshatra_of(lon);
                json!({
                    "key": row["key"],
                    "name": row.get("name").cloned().unwrap_or(Value::Null),
                    "name_ne": row.get("name_ne").cloned().unwrap_or(Value::Null),
                    "longitude": lon,
                    "dms": dms_parts(lon),
                    "nakshatraIndex": nak,
                    "pada": pada,
                    "nakshatraLord": NAK_LORD[nak % 9].key(),
                })
            })
            .collect(),
    )
}

// ── Graha Shanti (shanti_recommendation.py) ────────────────────────────────

fn finding(
    step: u32,
    title: (&str, &str),
    graha: Graha,
    remedy: &str,
    reason_ne: &str,
    reason_en: &str,
    tier: &str,
) -> Value {
    json!({
        "step": step,
        "stepTitleNe": title.0,
        "stepTitleEn": title.1,
        "graha": graha.key(),
        "grahaNe": graha.ne(),
        "remedy": remedy,
        "reasonNe": reason_ne,
        "reasonEn": reason_en,
        "tier": tier,
    })
}

#[expect(clippy::too_many_lines, reason = "the four classical steps, in order")]
fn graha_shanti(chart: &Chart, saturn_rashi: Option<usize>) -> Value {
    let lords_of = |houses: &[usize]| -> Vec<Graha> {
        let mut out = Vec::new();
        for h in houses {
            let l = chart.lord(*h);
            if !out.contains(&l) {
                out.push(l);
            }
        }
        out
    };
    let dusthana = lords_of(&DUSTHANA);
    let maraka = lords_of(&[2, 7]);
    let benefic = lords_of(&[1, 5, 9]);
    // A graha is never conjunct itself: Saturn as a Capricorn/Aquarius Lagnesha made
    // Python report "Saturn is conjunct Saturn" (scripts/rust_divergences.py).
    let conjunct = |a: Graha, b: Graha| a != b && chart.p(a).house == chart.p(b).house;
    let mut findings = Vec::new();

    let step1 = (
        "महादशा/अन्तर्दशा स्वामी परीक्षण",
        "Dasha / Antardasha Lord Assessment",
    );
    if let Some(d) = &chart.dasha {
        let mut lords = vec![d.maha_lord];
        if d.antar_lord != d.maha_lord {
            lords.push(d.antar_lord);
        }
        for lord in lords {
            let pf = chart.p(lord);
            let mut reasons: Vec<(&str, &str)> = Vec::new();
            if dusthana.contains(&lord) {
                reasons.push(("६, ८ वा १२ भावको स्वामी", "owns house 6, 8 or 12"));
            }
            if maraka.contains(&lord) {
                reasons.push(("मारक (२ वा ७ भावको स्वामी)", "a maraka (owns house 2 or 7)"));
            }
            if pf.is(Dignity::Debilitated) {
                reasons.push(("नीच राशिमा", "debilitated"));
            }
            if pf.combust {
                reasons.push(("सूर्यसँग अस्त", "combust with the Sun"));
            }
            if reasons.is_empty() {
                continue;
            }
            let ne: Vec<&str> = reasons.iter().map(|r| r.0).collect();
            let en: Vec<&str> = reasons.iter().map(|r| r.1).collect();
            findings.push(finding(
                1,
                step1,
                lord,
                "shanti",
                &format!(
                    "वर्तमान दशा/अन्तर्दशा स्वामी {} {} — यसको जप, दान र नवग्रह शान्ति अनिवार्य।",
                    lord.ne(),
                    ne.join(" र ")
                ),
                &format!(
                    "The current dasha/antardasha lord {} is {} — its japa, daan and navagraha shanti are mandatory.",
                    lord.en(),
                    en.join(" and ")
                ),
                "critical",
            ));
        }
    }

    let step2 = (
        "लग्नेश/योगकारक बल परीक्षण",
        "Lagnesha / Yogakaraka Strength Assessment",
    );
    for &g in &benefic {
        let pf = chart.p(g);
        let weak =
            pf.shadbala_ratio.is_some_and(|r| r < 1.0) || pf.is(Dignity::Debilitated) || pf.combust;
        if !weak {
            continue;
        }
        findings.push(finding(
            2,
            step2,
            g,
            "strengthen",
            &format!(
                "{} लग्नेश/पञ्चमेश/नवमेश भई कमजोर छ — रत्न धारण र मन्त्र पाठद्वारा सबल बनाउनुपर्छ (दान गरिँदैन)।",
                g.ne()
            ),
            &format!(
                "{}, a Lagnesha/5th/9th lord, is weak — strengthen with a gem and mantra japa (no daan for this planet).",
                g.en()
            ),
            "core",
        ));
    }

    let step3 = (
        "राहु/केतु/शनि/मङ्गल/बृहस्पतिद्वारा शुभ ग्रह, चन्द्र वा सूर्यको पीडा परीक्षण",
        "Rahu/Ketu/Saturn/Mars/Jupiter Affliction Check (incl. Vish/Grahan/Angarak/Guru-Chandal Yoga)",
    );
    let mut reported: Vec<(Graha, Graha)> = Vec::new();
    for g in [Graha::Rahu, Graha::Ketu, Graha::Saturn] {
        let Some(&afflicted) = benefic.iter().find(|b| conjunct(g, **b)) else {
            continue;
        };
        reported.push((g, afflicted));
        findings.push(finding(
            3,
            step3,
            g,
            "pacify",
            &format!(
                "{} लग्नेश/पञ्चमेश/नवमेश {}सँग एउटै भावमा युति गरी पीडित गरिरहेको छ — यसको वैदिक जप, हवन र दानद्वारा शान्त गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                g.ne(),
                afflicted.ne()
            ),
            &format!(
                "{} is conjunct {} (Lagnesha/5th/9th lord) in the same house, afflicting it — pacify with Vedic japa, homa and daan (never wear this planet's gem).",
                g.en(),
                afflicted.en()
            ),
            if matches!(afflicted, Graha::Sun | Graha::Moon) { "critical" } else { "core" },
        ));
    }
    let moon = chart.p(Graha::Moon);
    if conjunct(Graha::Saturn, Graha::Moon) || chart.aspects(Graha::Saturn, moon.house) {
        if !reported.contains(&(Graha::Saturn, Graha::Moon)) {
            reported.push((Graha::Saturn, Graha::Moon));
            findings.push(finding(
                3,
                step3,
                Graha::Saturn,
                "pacify",
                "शनि र चन्द्रको युति/दृष्टिले विष योग बनेको छ (मानसिक अशान्ति, चिन्ता, ढिलाइ) — शनिको वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                "Saturn's conjunction or aspect on the Moon forms Vish Yoga (mental unrest, anxiety, delays) — pacify Saturn with japa, homa and daan (never wear its gem).",
                "critical",
            ));
        }
        findings.push(finding(
            3,
            step3,
            Graha::Moon,
            "soothe",
            "शनिसँगको विष योगले चन्द्र (मन) पीडित भएको छ — चन्द्रको जप र रुद्राभिषेकद्वारा शान्ति गर्नुपर्छ।",
            "Saturn's Vish Yoga is afflicting the Moon (the mind) — soothe it with Moon japa and Rudrabhishek.",
            "critical",
        ));
    }
    for node in [Graha::Rahu, Graha::Ketu] {
        for lum in [Graha::Sun, Graha::Moon] {
            if !conjunct(node, lum) {
                continue;
            }
            if !reported.contains(&(node, lum)) {
                reported.push((node, lum));
                findings.push(finding(
                    3,
                    step3,
                    node,
                    "pacify",
                    &format!(
                        "{n}ले {l}सँग ग्रहण योग बनाएको छ — {n}को वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                        n = node.ne(),
                        l = lum.ne()
                    ),
                    &format!(
                        "{n}'s conjunction with {l} forms Grahan (eclipse) Yoga — pacify {n} with japa, homa and daan (never wear its gem).",
                        n = node.en(),
                        l = lum.en()
                    ),
                    "critical",
                ));
            }
            findings.push(finding(
                3,
                step3,
                lum,
                "soothe",
                &format!(
                    "{}सँगको ग्रहण योगले {} पीडित भएको छ — यसको आफ्नै शान्ति/जपद्वारा सुधार्नुपर्छ।",
                    node.ne(),
                    lum.ne()
                ),
                &format!(
                    "{}'s Grahan Yoga is afflicting {} — soothe it with its own japa and shanti.",
                    node.en(),
                    lum.en()
                ),
                "critical",
            ));
        }
    }
    if conjunct(Graha::Mars, Graha::Rahu) {
        if !reported.contains(&(Graha::Rahu, Graha::Mars)) {
            reported.push((Graha::Rahu, Graha::Mars));
            findings.push(finding(
                3,
                step3,
                Graha::Rahu,
                "pacify",
                "राहु र मङ्गलको युतिले अङ्गारक योग बनेको छ (दुर्घटना, आवेश, विवाद) — राहुको वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                "Rahu's conjunction with Mars forms Angarak Yoga (accidents, impulsiveness, disputes) — pacify Rahu with japa, homa and daan (never wear its gem).",
                "core",
            ));
        }
        findings.push(finding(
            3,
            step3,
            Graha::Mars,
            "soothe",
            "अङ्गारक योगले मङ्गल पीडित/उग्र भएको छ — मङ्गलको जप र दानद्वारा सुधार्नुपर्छ।",
            "Angarak Yoga leaves Mars afflicted and volatile — soothe it with its own japa and daan.",
            "core",
        ));
    }
    if conjunct(Graha::Jupiter, Graha::Rahu) {
        if !reported.contains(&(Graha::Rahu, Graha::Jupiter)) {
            reported.push((Graha::Rahu, Graha::Jupiter));
            findings.push(finding(
                3,
                step3,
                Graha::Rahu,
                "pacify",
                "राहु र बृहस्पतिको युतिले गुरु-चाण्डाल योग बनेको छ (सल्लाह/नैतिकतामा भ्रम) — राहुको वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
                "Rahu's conjunction with Jupiter forms Guru-Chandal Yoga (confused judgement/ethics) — pacify Rahu with japa, homa and daan (never wear its gem).",
                "core",
            ));
        }
        findings.push(finding(
            3,
            step3,
            Graha::Jupiter,
            "soothe",
            "गुरु-चाण्डाल योगले बृहस्पति पीडित भएको छ — बृहस्पतिको जप र दानद्वारा सुधार्नुपर्छ।",
            "Guru-Chandal Yoga leaves Jupiter afflicted — soothe it with its own japa and daan.",
            "core",
        ));
    }

    let step4 = (
        "शनिको गोचर (साढेसाती/ढैया/अष्टम)",
        "Saturn's Transit (Sade Sati / Dhaiya / 8th-from-Lagna)",
    );
    if let Some(sat) = saturn_rashi {
        let from_moon = (sat + 12 - (chart.moon_sign + 1)) % 12 + 1;
        let from_lagna = (sat + 12 - (chart.lagna_sign + 1)) % 12 + 1;
        let phase = match from_moon {
            12 => Some(("साढेसातीको पहिलो ढैया", "First phase of Sade Sati")),
            1 => Some((
                "साढेसातीको उत्कर्ष (चन्द्र राशिमाथि)",
                "Peak phase of Sade Sati (over natal Moon)",
            )),
            2 => Some(("साढेसातीको अन्तिम ढैया", "Final phase of Sade Sati")),
            4 => Some(("कण्टक शनि (चतुर्थ ढैया)", "Kantak Shani (4th-from-Moon Dhaiya)")),
            8 => Some((
                "अर्धाष्टम शनि (अष्टम ढैया)",
                "Ardhashtama Shani (8th-from-Moon Dhaiya)",
            )),
            _ if from_lagna == 8 => Some((
                "लग्नबाट अष्टम शनि गोचर",
                "Saturn transiting the 8th from Lagna",
            )),
            _ => None,
        };
        if let Some((ne, en)) = phase {
            findings.push(finding(
                4,
                step4,
                Graha::Saturn,
                "pacify_transit",
                &format!(
                    "शनि हाल {ne} अवस्थामा गोचर गरिरहेका छन् — शमी समिधा हवन, तोरीको तेल दान र जपद्वारा शान्ति गर्नुपर्छ।"
                ),
                &format!(
                    "Saturn is currently transiting in {en} — pacify with Shami-wood homa, mustard-oil daan and japa."
                ),
                "critical",
            ));
        }
    }
    json!({"findings": findings})
}

/// `assemble_kundali_detail(instant_local, location, panchanga)`.
///
/// # Errors
///
/// [`DetailError`] when the birth day's sunrise cannot be found or Shadbala fails.
#[expect(clippy::too_many_lines, reason = "one field per payload key")]
pub fn assemble(inputs: &DetailInputs<'_>, panchanga: &Value) -> Result<Value, DetailError> {
    let DetailInputs {
        instant,
        location,
        zone,
        now,
    } = *inputs;
    let snapshot = planetary_snapshot(instant, location.lat, location.lon);
    let lagna_lon = snapshot["lagna"]["longitude"].as_f64().unwrap_or(0.0);
    let lagna_rashi = sign_of(lagna_lon) + 1;
    let raw: [RawPlanet; 9] = std::array::from_fn(|i| {
        let row = &snapshot["planets"][Graha::ALL[i].key()];
        RawPlanet {
            longitude: row["longitude"].as_f64().unwrap_or(0.0),
            retrograde: row
                .get("is_retrograde")
                .or_else(|| row.get("retrograde"))
                .and_then(Value::as_bool)
                .unwrap_or(false),
        }
    });
    let lons: [f64; 9] = std::array::from_fn(|i| raw[i].longitude);
    let shadbala_payload =
        shadbala::shadbala(instant, location).map_err(|e| DetailError(e.to_string()))?;
    let moon_lon = lons[Graha::Moon.index()];
    let sun_lon = lons[Graha::Sun.index()];
    let (vimshottari, tribhagi, yogini, timeline) = dasha_trees(moon_lon, instant, now);

    let day = vedic_day(instant, location, zone).map_err(|e| DetailError(e.to_string()))?;
    let is_day = day.sunrise <= instant && instant < day.sunset;

    let upagraha_rows: Vec<Value> = panchanga["detail"]["upagrahas"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    let upagraha_lon = |key: &str| {
        upagraha_rows
            .iter()
            .find(|r| r["key"] == key)
            .and_then(|r| r["longitude"].as_f64())
    };
    let sb_facts = shadbala_facts(&shadbala_payload);
    let chart = build_chart(
        &raw,
        &ChartInputs {
            lagna_lon,
            shadbala: &sb_facts,
            timeline: Some(&timeline),
            now,
            is_day: Some(is_day),
            gulika_lon: upagraha_lon("gulika"),
            mandi_lon: upagraha_lon("mandi"),
        },
    );

    let local = zone.local(instant);
    let birth_clock = local.hm();
    let mut delta = instant.seconds_since(day.sunrise);
    if delta < 0.0 {
        delta += 86400.0;
    }
    let correction = belaantar_minutes(panchanga);
    let corrected = (delta - correction * 60.0).max(0.0);
    let (moon_nak, moon_pada) = nakshatra_of(moon_lon);
    let yoga_index = panchanga["yoga"]["number"].as_i64().unwrap_or(1) - 1;

    let ashtakavarga = ashtakavarga::payload(std::array::from_fn(|i| lons[i]), lagna_lon);
    let bhava = bhava_bala(lagna_lon, &lons, &shadbala_payload);
    let yuddha = match shadbala_payload.get("yuddha") {
        Some(v) if v.as_object().is_some_and(|m| !m.is_empty()) => v.clone(),
        _ => json!({"wars": [], "byPlanet": {}}),
    };

    let mut combustion = Map::new();
    for g in Graha::ALL {
        let value = match g {
            Graha::Sun | Graha::Rahu | Graha::Ketu => Value::Null,
            Graha::Moon => json!(angular_sep(moon_lon, sun_lon) < 12.0),
            _ => {
                let orb = combust_orb(g, raw[g.index()]);
                json!(orb.is_some_and(|o| angular_sep(lons[g.index()], sun_lon) < o))
            }
        };
        combustion.insert(g.key().into(), value);
    }

    let saturn_rashi = gochar_table(now)
        .into_iter()
        .find(|(g, _)| *g == Graha::Saturn)
        .and_then(|(_, m)| m.get("rashi_no").and_then(Value::as_u64))
        .and_then(|r| usize::try_from(r).ok());
    let shanti = graha_shanti(&chart, saturn_rashi);
    let yogas = yogas_api(&full_yoga_catalog(&chart));
    let varga = varga_charts(lagna_lon, &raw);
    let upagrahas = upagrahas(&upagraha_rows);
    let avakahada = avakahada(moon_lon, sign_of(moon_lon) + 1, lagna_rashi);
    let chogh = choghadiya_at_birth(panchanga, &birth_clock);

    Ok(json!({
        "panchanga": panchanga,
        "shadbala": shadbala_payload,
        "dasha": vimshottari,
        "tribhagiDasha": tribhagi,
        "yoginiDasha": yogini,
        "yuddha": yuddha,
        "bhavaBala": bhava,
        "vimshopaka": vimshopaka(&lons),
        "ashtakavarga": ashtakavarga,
        "yogas": yogas,
        "grahaShanti": shanti,
        "vargaCharts": varga,
        "upagrahas": upagrahas,
        "avakahada": avakahada,
        "birthMeta": {
            "birthClock": birth_clock,
            "isDayBirth": is_day,
            "ishtaKala": ghadi(delta),
            "ahoratriIshtaKala": ghadi(corrected),
            "choghadiyaAtBirth": chogh,
            "solarCorrectionMinutes": py_round(correction, 4),
            "moonNakshatra": {"index": moon_nak, "number": moon_nak + 1, "pada": moon_pada},
            "yoga": {"index": yoga_index, "number": yoga_index + 1},
        },
        "combustion": combustion,
        "lagnaRashi": lagna_rashi,
        "ayanamsha": "surya_siddhanta",
        "location": location.as_json(),
        "birth_instant": local.to_string(),
    }))
}
