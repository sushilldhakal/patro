//! Entrance placement and small architectural constants (`engine/vastu/entrance.py`).

use super::{Ctx, Facing};
use crate::{geometry::Rect, zones};

pub(crate) const ENTRANCE_W: f64 = 1.05;
pub(crate) const DOOR_JAMB: f64 = 0.12;
pub(crate) const FOYER_W: f64 = ENTRANCE_W + 2.0 * DOOR_JAMB;
pub(crate) const FOYER_D: f64 = 1.35;

pub(crate) const WIN_NE_W: f64 = 1.45;
pub(crate) const WIN_SW_W: f64 = 0.75;
pub(crate) const WIN_NE_SILL: f64 = 0.85;
pub(crate) const WIN_SW_SILL: f64 = 1.45;
pub(crate) const WIN_NE_H: f64 = 1.35;
pub(crate) const WIN_SW_H: f64 = 0.7;

/// Where the main door's centre lands (`DoorPoint`).
#[derive(Debug, Clone, Copy)]
pub(crate) struct DoorPoint {
    pub(crate) x: f64,
    pub(crate) y: f64,
}

fn pada_center_t(pada_index: u8) -> f64 {
    (f64::from(pada_index) - 0.5) / 8.0
}

fn along_of_t(facing: Facing, t: f64, width: f64, height: f64) -> f64 {
    match facing {
        Facing::North => width * t,
        Facing::South => width * (1.0 - t),
        Facing::East | Facing::West => height * (1.0 - t),
    }
}

/// `face_span(facing, rect)`: the rect's footprint along the facing wall.
pub(crate) fn face_span(facing: Facing, r: Rect) -> (f64, f64) {
    match facing {
        Facing::North | Facing::South => (r.x, r.x + r.w),
        Facing::East | Facing::West => (r.y, r.y + r.h),
    }
}

/// `entrance_width(span)`: the standard leaf, narrowed only when the mouth can't take it.
pub(crate) fn entrance_width(span: f64) -> f64 {
    ENTRANCE_W.min(0.6_f64.max(span - 2.0 * DOOR_JAMB))
}

/// `entrance_padas(facing, width, height)`: sourced best padas, best first, as
/// (metres along the wall, pada id).
pub(crate) fn entrance_padas(
    rules: Ctx<'_>,
    facing: Facing,
    width: f64,
    height: f64,
) -> Vec<(f64, &'static str)> {
    rules
        .entrance_padas_for_wall(facing.wall_letter())
        .into_iter()
        .filter_map(|id| zones::pada(id).map(|p| (p, id)))
        .map(|(p, id)| {
            (
                along_of_t(facing, pada_center_t(p.index), width, height),
                id,
            )
        })
        .collect()
}

fn door_at(facing: Facing, along: f64, width: f64, height: f64) -> DoorPoint {
    match facing {
        Facing::East => DoorPoint { x: width, y: along },
        Facing::West => DoorPoint { x: 0.0, y: along },
        Facing::North => DoorPoint { x: along, y: 0.0 },
        Facing::South => DoorPoint {
            x: along,
            y: height,
        },
    }
}

/// `main_door_point(facing, width, height, hall)`: the door centre on the facing wall.
pub(crate) fn main_door_point(
    rules: Ctx<'_>,
    facing: Facing,
    width: f64,
    height: f64,
    hall: Option<Rect>,
) -> DoorPoint {
    let options = entrance_padas(rules, facing, width, height);
    let Some(hall) = hall else {
        let along = options
            .first()
            .map_or_else(|| along_of_t(facing, 0.5, width, height), |o| o.0);
        return door_at(facing, along, width, height);
    };
    let (lo, hi) = face_span(facing, hall);
    let half_leaf = entrance_width(hi - lo) / 2.0;
    let (lo, hi) = (lo + half_leaf, (lo + half_leaf).max(hi - half_leaf));
    for (along, _) in &options {
        if lo - 1e-6 <= *along && *along <= hi + 1e-6 {
            return door_at(facing, *along, width, height);
        }
    }
    let want = options.first().map_or(f64::midpoint(lo, hi), |o| o.0);
    door_at(facing, hi.min(lo.max(want)), width, height)
}

pub(crate) fn door_height(width: f64) -> f64 {
    width * 2.0
}

/// `next_legal_count(n)`: even, and not a multiple of ten.
pub(crate) fn next_legal_count(n: usize) -> usize {
    let mut t = n.max(2);
    if t % 2 == 1 {
        t += 1;
    }
    if t % 10 == 0 {
        t += 2;
    }
    t
}

pub(crate) fn is_solar_wall(wall: char) -> bool {
    matches!(wall, 'n' | 'e')
}

/// `toilet_forbidden(region)`: the centre, or a sourced avoid zone for toilets.
pub(crate) fn toilet_forbidden(rules: Ctx<'_>, region: &str) -> bool {
    region == "center" || rules.zone_costs("toilet").avoids(region)
}
