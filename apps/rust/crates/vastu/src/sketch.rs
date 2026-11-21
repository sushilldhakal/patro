//! Compass-zone assignment for the plot sketch plus the Āyādi width check
//! (`engine/vastu/sketch.py`, rule tables from `engine/vastu/sketch_rules.py`).
//!
//! Plot sizes are metres throughout.

use std::collections::HashMap;

use serde_json::{Value, json};

const ALL_ZONES: [&str; 9] = [
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
    "north",
    "center",
];

/// One kind's (preferred, acceptable, avoid) zones, Viśvakarmā Prakāśa mapping.
struct ZoneRule {
    preferred: &'static [&'static str],
    acceptable: &'static [&'static str],
    avoid: &'static [&'static str],
}

const fn rule(
    preferred: &'static [&'static str],
    acceptable: &'static [&'static str],
    avoid: &'static [&'static str],
) -> ZoneRule {
    ZoneRule {
        preferred,
        acceptable,
        avoid,
    }
}

/// `SPACE_ZONE_RULES`, in the source's order.
const SPACE_ZONE_RULES: [(&str, ZoneRule); 24] = [
    (
        "puja",
        rule(
            &["northeast"],
            &["east", "north"],
            &["south", "southwest", "southeast", "center"],
        ),
    ),
    (
        "kitchen",
        rule(&["southeast"], &["east", "south"], &["northeast", "center"]),
    ),
    (
        "living",
        rule(&["north"], &["east", "northeast"], &["southwest"]),
    ),
    ("dining", rule(&["west"], &["east"], &["northeast"])),
    (
        "kitchen_dining",
        rule(&["southeast"], &["east", "south"], &["northeast", "center"]),
    ),
    (
        "master_bedroom",
        rule(&["southwest"], &["south", "west"], &["northeast"]),
    ),
    (
        "bedroom",
        rule(
            &["south", "northwest"],
            &["west"],
            &["northeast", "southeast"],
        ),
    ),
    (
        "toilet",
        rule(
            &["northwest", "south"],
            &["west"],
            &["northeast", "southwest", "center", "east"],
        ),
    ),
    (
        "bathroom",
        rule(&["east"], &["north"], &["northeast", "southwest", "center"]),
    ),
    (
        "combined",
        rule(
            &["northwest", "south"],
            &["west"],
            &["northeast", "southwest", "center", "east"],
        ),
    ),
    ("study", rule(&["west"], &["north", "east"], &["southwest"])),
    (
        "office",
        rule(&["north"], &["west", "northwest"], &["southeast"]),
    ),
    (
        "store",
        rule(&["south"], &["west"], &["northeast", "southwest"]),
    ),
    ("laundry", rule(&["northwest"], &["west"], &["northeast"])),
    (
        "staircase",
        rule(
            &["south", "west"],
            &["northwest"],
            &["northeast", "center", "southwest"],
        ),
    ),
    (
        "garage",
        rule(&["northwest", "southeast"], &["west"], &["northeast"]),
    ),
    (
        "guest",
        rule(&["northwest"], &["west", "north"], &["southwest"]),
    ),
    (
        "family",
        rule(&["north"], &["west", "northwest"], &["southeast"]),
    ),
    (
        "balcony",
        rule(&["north", "east", "northeast"], &["west"], &["southwest"]),
    ),
    (
        "courtyard",
        rule(&["center", "northeast"], &["north"], &["southwest"]),
    ),
    (
        "garden",
        rule(&["northeast", "north", "east"], &["west"], &["southwest"]),
    ),
    (
        "servant",
        rule(
            &["northwest", "west"],
            &["south"],
            &["northeast", "southwest"],
        ),
    ),
    (
        "gym",
        rule(&["west", "south"], &["northwest"], &["northeast"]),
    ),
    (
        "library",
        rule(&["north", "northeast", "west"], &["east"], &["southeast"]),
    ),
];

/// `IDEAL_SIZE` of the sketch: (minSide, minArea, minArea as Python prints it).
const IDEAL_SIZE: [(&str, f64, f64); 24] = [
    ("master_bedroom", 2.9, 10.5),
    ("bedroom", 2.7, 9.0),
    ("guest", 2.7, 9.0),
    ("living", 2.9, 12.0),
    ("family", 2.8, 10.0),
    ("dining", 2.4, 7.0),
    ("kitchen", 2.4, 7.0),
    ("kitchen_dining", 2.9, 13.0),
    ("puja", 1.8, 3.5),
    ("study", 2.4, 6.5),
    ("office", 2.4, 7.0),
    ("store", 1.6, 3.0),
    ("laundry", 1.6, 3.0),
    ("staircase", 1.15, 2.8),
    ("garage", 2.8, 12.0),
    ("balcony", 1.2, 2.5),
    ("courtyard", 2.0, 6.0),
    ("garden", 2.0, 6.0),
    ("servant", 2.2, 6.0),
    ("gym", 2.6, 8.0),
    ("library", 2.4, 6.5),
    ("toilet", 1.0, 1.5),
    ("bathroom", 1.5, 2.8),
    ("combined", 1.5, 3.0),
];

const ASSIGN_ORDER: [&str; 23] = [
    "puja",
    "kitchen",
    "master_bedroom",
    "living",
    "dining",
    "bedroom",
    "guest",
    "family",
    "study",
    "office",
    "combined",
    "bathroom",
    "toilet",
    "staircase",
    "store",
    "laundry",
    "garage",
    "courtyard",
    "garden",
    "balcony",
    "library",
    "gym",
    "servant",
];

const HOST_KINDS: [&str; 6] = [
    "master_bedroom",
    "bedroom",
    "guest",
    "living",
    "dining",
    "family",
];

const DEFAULT_STOREY: [(&str, i64); 24] = [
    ("puja", 0),
    ("kitchen", 0),
    ("living", 0),
    ("dining", 0),
    ("kitchen_dining", 0),
    ("garage", 0),
    ("store", 0),
    ("laundry", 0),
    ("courtyard", 0),
    ("garden", 0),
    ("servant", 0),
    ("staircase", 0),
    ("master_bedroom", 1),
    ("bedroom", 1),
    ("toilet", 1),
    ("bathroom", 1),
    ("combined", 1),
    ("study", 1),
    ("office", 1),
    ("family", 1),
    ("guest", 1),
    ("balcony", 1),
    ("gym", 2),
    ("library", 2),
];

const STAIR_WIDTH_M: f64 = 1.25;
const MAX_PRIMARIES_PER_ZONE: usize = 2;
const HASTA_METERS: f64 = 0.4572;

/// Whether `kind` is one the sketch has a rule for (`kind in SPACE_ZONE_RULES`).
#[must_use]
pub fn known_kind(kind: &str) -> bool {
    SPACE_ZONE_RULES.iter().any(|(k, _)| *k == kind)
}

fn zone_rule(kind: &str) -> &'static ZoneRule {
    SPACE_ZONE_RULES
        .iter()
        .find(|(k, _)| *k == kind)
        .map(|(_, r)| r)
        .expect("sketch kinds are validated against SPACE_ZONE_RULES by the route")
}

fn ideal(kind: &str) -> (f64, f64) {
    IDEAL_SIZE
        .iter()
        .find(|(k, _, _)| *k == kind)
        .map(|(_, s, a)| (*s, *a))
        .expect("sketch kinds are validated against SPACE_ZONE_RULES by the route")
}

/// Vastu mode of the sketch.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// Preferred zones only, then any zone.
    Strict,
    /// Preferred, then acceptable, then any zone.
    Flexible,
}

/// The house requirement the sketch places (`HousePlan`).
#[derive(Debug, Clone)]
pub struct HousePlan {
    /// Bedroom count.
    pub bedrooms: i64,
    /// Toilet count.
    pub toilets: i64,
    /// Bathroom count.
    pub bathrooms: i64,
    /// Combined toilet + bath count.
    pub combined: i64,
    /// Which bedroom (1-based) is the master.
    pub master_bedroom: i64,
    /// Other rooms, by kind.
    pub extras: Vec<String>,
    /// Strict or flexible.
    pub mode: Mode,
    /// Storeys asked for.
    pub storeys: i64,
    /// Per-kind floor choice (`ground`/`first`/`third`/`any`).
    pub floors: HashMap<String, String>,
}

#[derive(Debug, Clone)]
struct Space {
    id: String,
    kind: String,
    index: Option<i64>,
}

#[derive(Debug, Clone)]
struct Assignment {
    id: String,
    kind: String,
    zone: &'static str,
    fit: &'static str,
    storey: i64,
    index: Option<i64>,
}

#[expect(
    clippy::cast_possible_truncation,
    reason = "Math.round of a small count or a hasta length"
)]
fn js_round(x: f64) -> i64 {
    (x + 0.5).floor() as i64
}

fn clamp_storeys(n: i64) -> i64 {
    match n {
        n if n >= 3 => 3,
        2 => 2,
        _ => 1,
    }
}

#[expect(clippy::cast_precision_loss, reason = "counts are tiny")]
fn clamp_count(n: i64, lo: i64, hi: i64) -> i64 {
    hi.min(lo.max(js_round(n as f64)))
}

fn is_wet(kind: &str) -> bool {
    matches!(kind, "toilet" | "bathroom" | "combined")
}

fn is_primary(kind: &str) -> bool {
    kind != "staircase" && !is_wet(kind)
}

fn box_fits(w: f64, h: f64, size: (f64, f64)) -> bool {
    w.min(h) + 0.02 >= size.0 && w * h + 0.02 >= size.1
}

fn after_stair(w: f64, h: f64) -> (f64, f64) {
    if w >= h {
        (w - STAIR_WIDTH_M, h)
    } else {
        (w, h - STAIR_WIDTH_M)
    }
}

fn ensuite_boxes(w: f64, h: f64, host: &str, wet: &str) -> bool {
    let wet_size = ideal(wet);
    let wet_short = wet_size.0;
    let wet_long = if wet == "toilet" {
        1.5
    } else {
        wet_short.max(wet_size.1 / wet_short)
    };
    let long = w.max(h);
    let short = w.min(h);
    let host_size = ideal(host);
    if long - wet_short < host_size.0 {
        return false;
    }
    if short + 0.02 < wet_long && wet == "toilet" {
        return false;
    }
    let main_long = long - wet_short;
    let (main, bath) = if w >= h {
        ((main_long, short), (wet_short, short))
    } else {
        ((short, main_long), (short, wet_short))
    };
    box_fits(main.0, main.1, host_size) && box_fits(bath.0, bath.1, wet_size)
}

fn primaries_fit(w: f64, h: f64, kinds: &[&str]) -> bool {
    match kinds {
        [] => return true,
        [one] => return box_fits(w, h, ideal(one)),
        _ => {}
    }
    let long = w.max(h);
    let cross = w.min(h);
    let needs: Vec<f64> = kinds
        .iter()
        .map(|k| {
            let s = ideal(k);
            s.0.max(s.1 / cross)
        })
        .collect();
    if needs.iter().sum::<f64>() > long + 0.02 {
        return false;
    }
    kinds
        .iter()
        .zip(&needs)
        .all(|(k, need)| box_fits(*need, cross, ideal(k)))
}

fn resolve_storey(space: &Space, plan: &HousePlan) -> i64 {
    let top = clamp_storeys(plan.storeys) - 1;
    let level = match plan.floors.get(&space.kind).map(String::as_str) {
        Some("ground") => 0,
        Some("first") => 1,
        Some("third") => 2,
        _ => {
            let mut level = DEFAULT_STOREY
                .iter()
                .find(|(k, _)| *k == space.kind)
                .map_or(0, |(_, l)| *l);
            let idx = space.index.unwrap_or(1);
            if space.kind == "bedroom" && idx >= 3 {
                level = 2;
            }
            if is_wet(&space.kind) && idx >= 2 {
                level = (idx - 1).min(2);
            }
            level
        }
    };
    if matches!(space.kind.as_str(), "garage" | "garden" | "courtyard") {
        return 0;
    }
    level.min(top)
}

fn push_counted(out: &mut Vec<Space>, kind: &str, n: i64) {
    for i in 1..=n {
        out.push(Space {
            id: format!("{kind}_{i}"),
            kind: kind.to_owned(),
            index: Some(i),
        });
    }
}

fn expand_planned_spaces(plan: &HousePlan) -> Vec<Space> {
    let mut out = Vec::new();
    let beds = clamp_count(plan.bedrooms, 1, 5);
    let master = plan.master_bedroom.max(1).min(beds);
    for i in 1..=beds {
        let (id, kind) = if i == master {
            (format!("master_{i}"), "master_bedroom")
        } else {
            (format!("bedroom_{i}"), "bedroom")
        };
        out.push(Space {
            id,
            kind: kind.to_owned(),
            index: Some(i),
        });
    }
    push_counted(&mut out, "toilet", clamp_count(plan.toilets, 1, 5));
    push_counted(&mut out, "bathroom", clamp_count(plan.bathrooms, 1, 5));
    push_counted(&mut out, "combined", clamp_count(plan.combined, 0, 5));
    for kind in &plan.extras {
        if matches!(
            kind.as_str(),
            "bedroom" | "master_bedroom" | "toilet" | "bathroom" | "combined"
        ) {
            continue;
        }
        out.push(Space {
            id: kind.clone(),
            kind: kind.clone(),
            index: None,
        });
    }
    out
}

fn occupants<'a>(zone: &str, placed: &'a [Assignment]) -> Vec<&'a str> {
    placed
        .iter()
        .filter(|row| row.zone == zone)
        .map(|row| row.kind.as_str())
        .collect()
}

fn can_share(zone: &str, space: &Space, placed: &[Assignment]) -> bool {
    let rule = zone_rule(&space.kind);
    if rule.avoid.contains(&zone) {
        return false;
    }
    if zone == "center" {
        return space.kind == "courtyard";
    }
    let here = occupants(zone, placed);
    let primaries: Vec<&str> = here.iter().copied().filter(|k| is_primary(k)).collect();
    let wets = here.iter().filter(|k| is_wet(k)).count();
    if is_wet(&space.kind) {
        if wets > 0 || primaries.len() > 1 {
            return false;
        }
        return primaries.len() != 1 || HOST_KINDS.contains(&primaries[0]);
    }
    if primaries.is_empty() {
        return wets <= 1;
    }
    if primaries.len() < MAX_PRIMARIES_PER_ZONE {
        return wets == 0;
    }
    false
}

fn room_fits_zone(zone: &str, space: &Space, placed: &[Assignment], plot: (f64, f64)) -> bool {
    let (mut w, mut h) = (plot.0 / 3.0, plot.1 / 3.0);
    let here = occupants(zone, placed);
    if here.contains(&"staircase") && space.kind != "staircase" {
        (w, h) = after_stair(w, h);
    }
    let host = here.iter().copied().find(|k| is_primary(k));
    let wet = here.iter().copied().find(|k| is_wet(k));
    if is_wet(&space.kind)
        && let Some(host) = host
    {
        return ensuite_boxes(w, h, host, &space.kind);
    }
    if is_primary(&space.kind)
        && let Some(wet) = wet
    {
        return ensuite_boxes(w, h, &space.kind, wet);
    }
    if space.kind == "staircase" {
        return box_fits(STAIR_WIDTH_M, w.max(h), ideal("staircase"));
    }
    let mut primaries: Vec<&str> = here.iter().copied().filter(|k| is_primary(k)).collect();
    if is_primary(&space.kind) && !primaries.is_empty() {
        primaries.push(&space.kind);
        return primaries_fit(w, h, &primaries);
    }
    box_fits(w, h, ideal(&space.kind))
}

fn pick_zone(
    space: &Space,
    placed: &[Assignment],
    mode: Mode,
    plot: (f64, f64),
) -> Option<&'static str> {
    let rule = zone_rule(&space.kind);
    let ok = |z: &str| can_share(z, space, placed) && room_fits_zone(z, space, placed, plot);
    let pools: [Vec<&'static str>; 3] = [
        rule.preferred.iter().copied().filter(|z| ok(z)).collect(),
        if mode == Mode::Flexible {
            rule.acceptable.iter().copied().filter(|z| ok(z)).collect()
        } else {
            Vec::new()
        },
        ALL_ZONES
            .iter()
            .copied()
            .filter(|z| *z != "center" && ok(z))
            .collect(),
    ];
    for pool in pools {
        let Some(first) = pool.first().copied() else {
            continue;
        };
        let mut best = first;
        let mut best_load = usize::MAX;
        for zone in pool {
            let n = occupants(zone, placed).len();
            if n < best_load {
                best = zone;
                best_load = n;
            }
        }
        return Some(best);
    }
    None
}

fn assign_zones(
    spaces: Vec<Space>,
    plan: &HousePlan,
    storey: i64,
    plot: (f64, f64),
    initial: Vec<Assignment>,
) -> (Vec<Assignment>, Vec<Space>) {
    // Unlisted kinds sort first, as Array.indexOf's -1 did.
    let order = |s: &Space| {
        ASSIGN_ORDER
            .iter()
            .position(|k| *k == s.kind)
            .map_or(-1, |i| i64::try_from(i).unwrap_or(i64::MAX))
    };
    let mut ordered = spaces;
    ordered.sort_by_key(order);
    let mut placed = initial;
    let mut overflow = Vec::new();
    for space in ordered {
        let Some(zone) = pick_zone(&space, &placed, plan.mode, plot) else {
            overflow.push(space);
            continue;
        };
        let rule = zone_rule(&space.kind);
        let fit = if !occupants(zone, &placed).is_empty() {
            "shared"
        } else if rule.preferred.contains(&zone) {
            "preferred"
        } else {
            "acceptable"
        };
        placed.push(Assignment {
            id: space.id,
            kind: space.kind,
            zone,
            fit,
            storey,
            index: space.index,
        });
    }
    (placed, overflow)
}

fn assign_vastu_spaces(plan: &HousePlan, plot: (f64, f64)) -> (Vec<Assignment>, Vec<Space>) {
    let asked = clamp_storeys(plan.storeys);
    let mut buckets: [Vec<Space>; 3] = [Vec::new(), Vec::new(), Vec::new()];
    let mut stair: Option<Space> = None;
    for space in expand_planned_spaces(plan) {
        if space.kind == "staircase" {
            stair = Some(space);
            continue;
        }
        let storey = usize::try_from(resolve_storey(&space, plan)).unwrap_or(0);
        buckets[storey].push(space);
    }
    let stair_zone = zone_rule("staircase")
        .preferred
        .first()
        .copied()
        .unwrap_or("southwest");
    let mut assignments = Vec::new();
    let mut leftover: Vec<Space> = Vec::new();
    for storey in 0..asked {
        let mut batch = std::mem::take(&mut leftover);
        batch.append(&mut buckets[usize::try_from(storey).unwrap_or(0)]);
        let seed = stair
            .as_ref()
            .map(|s| Assignment {
                id: format!("{}_{storey}", s.id),
                kind: s.kind.clone(),
                zone: stair_zone,
                fit: "preferred",
                storey,
                index: s.index,
            })
            .into_iter()
            .collect();
        let (placed, rest) = assign_zones(batch, plan, storey, plot, seed);
        assignments.extend(placed);
        leftover = rest;
    }
    (assignments, leftover)
}

fn ayadi_remainder(width_hasta: f64) -> i64 {
    let hasta = js_round(width_hasta);
    ((hasta * 8) % 12 + 12) % 12
}

fn nearest_auspicious_width_hasta(width_hasta: f64) -> i64 {
    let base = js_round(width_hasta);
    #[expect(clippy::cast_precision_loss, reason = "hasta counts are small")]
    let rem = |h: i64| ayadi_remainder(h as f64);
    for delta in 1..7 {
        if rem(base - delta) != 0 {
            return base - delta;
        }
        if rem(base + delta) != 0 {
            return base + delta;
        }
    }
    base
}

fn ayadi_for_plot(width: f64, height: f64) -> Value {
    let length_hasta = height / HASTA_METERS;
    let width_hasta = width / HASTA_METERS;
    let remainder = ayadi_remainder(width_hasta);
    let auspicious = remainder != 0;
    let suggested = (!auspicious).then(|| nearest_auspicious_width_hasta(width_hasta));
    #[expect(clippy::cast_precision_loss, reason = "hasta counts are small")]
    let suggested_meters = suggested.map(|s| s as f64 * HASTA_METERS);
    json!({
        "length_hasta": length_hasta,
        "width_hasta": width_hasta,
        "remainder": remainder,
        "auspicious": auspicious,
        "suggested_hasta": suggested,
        "suggested_meters": suggested_meters,
    })
}

fn entrance_corner(facing: &str) -> &'static str {
    match facing {
        "north" | "east" => "northeast",
        "south" => "southeast",
        _ => "northwest",
    }
}

/// `build_sketch(plan, plot, facing)`: the response body of `POST /vastu/sketch`.
#[must_use]
pub fn build_sketch(plan: &HousePlan, width: f64, height: f64, facing: &str) -> Value {
    let (assignments, leftover) = assign_vastu_spaces(plan, (width, height));
    json!({
        "storeys": clamp_storeys(plan.storeys),
        "assignments": assignments.iter().map(|a| json!({
            "id": a.id,
            "kind": a.kind,
            "index": a.index,
            "zone": a.zone,
            "fit": a.fit,
            "storey": a.storey,
            "min_area": ideal(&a.kind).1,
        })).collect::<Vec<_>>(),
        "leftover": leftover.iter().map(|s| json!({"id": s.id, "kind": s.kind, "index": s.index})).collect::<Vec<_>>(),
        "ayadi": ayadi_for_plot(width, height),
        "entrance": {"facing": facing, "preferred_corner": entrance_corner(facing)},
    })
}
