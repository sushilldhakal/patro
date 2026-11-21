//! `POST /vastu/house-plan`: the requirement in, a placed floor plan out
//! (`services/vastu/vastu_house_plan.py`, `engine/vastu/layout.build_concept`,
//! `engine/vastu/scoring.py`).

use panchanga::pyfloat::py_round;
use serde_json::{Value, json};

pub use crate::plan::{Facing, Requirement};
use crate::{
    data::Rules,
    plan::{
        Conflict, OpenFloor, Room, Space,
        building::compile_layer,
        clamp_storeys, expand_planned_spaces,
        layout::{Site, build_floor, stair_on_site},
        resolve_storey,
        validate::{Report, validate_concept},
    },
};

const FT_TO_M: f64 = 0.3048;

/// Requests the Python engine fails on with an unhandled exception (answered 500).
#[derive(Debug, thiserror::Error)]
pub enum PlanError {
    /// An extra room kind has no size entry: `IDEAL_SIZE[kind]` raises `KeyError`.
    #[error("unknown room kind: {0}")]
    UnknownKind(String),
    /// Two rooms share an id (an extra listed twice) and the band search deletes
    /// the same key twice.
    #[error("duplicate room id: {0}")]
    DuplicateId(String),
}

/// The plot as the engine sees it.
#[derive(Debug, Clone, Copy)]
pub struct Plot {
    /// East–west extent in the request's unit.
    pub width: f64,
    /// North–south extent in the request's unit.
    pub depth: f64,
    /// Whether the unit is feet (else metres).
    pub unit: Unit,
    /// The entrance wall.
    pub facing: Facing,
}

/// The plot's unit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Unit {
    /// Metres.
    Metres,
    /// Feet, converted to metres on the way in.
    Feet,
}

fn to_meters(v: f64, unit: Unit) -> f64 {
    if unit == Unit::Feet { v * FT_TO_M } else { v }
}

fn room_json(r: &Room) -> Value {
    json!({
        "id": r.id,
        "kind": r.kind,
        "floor": r.floor,
        "x": r.rect.x, "y": r.rect.y, "w": r.rect.w, "h": r.rect.h,
        "life": r.life,
        "vastu_region": r.vastu_region,
        "index": r.index,
        "doors": r.doors.iter().map(|d| json!({
            "id": d.id, "room_id": d.room_id, "wall": d.wall.to_string(), "t": d.t,
            "width": d.width, "swing": d.swing, "connects_to": d.connects_to,
        })).collect::<Vec<_>>(),
        "windows": [],
        "adjacent_to": r.adjacent_to,
    })
}

fn conflict_json(c: &Conflict) -> Value {
    json!({"id": c.id, "severity": c.severity, "message_key": c.message_key})
}

fn score_json(
    floors: &[(i64, Vec<Room>)],
    relaxed: &[Conflict],
    v: &Report,
    leftover: usize,
) -> Value {
    let all_rooms: Vec<&Room> = floors
        .iter()
        .flat_map(|(_, rooms)| rooms)
        .filter(|r| !matches!(r.life, "circulation" | "outdoor" | "vertical"))
        .collect();
    let relaxed_ids: Vec<&str> = relaxed
        .iter()
        .filter_map(|c| c.id.strip_prefix("relax-"))
        .collect();
    let satisfied: Vec<&str> = all_rooms
        .iter()
        .filter(|r| !relaxed_ids.contains(&r.id.as_str()))
        .map(|r| r.id.as_str())
        .collect();
    let relaxed_rooms: Vec<&str> = all_rooms
        .iter()
        .filter(|r| relaxed_ids.contains(&r.id.as_str()))
        .map(|r| r.id.as_str())
        .collect();
    #[expect(clippy::cast_precision_loss, reason = "room counts are tiny")]
    let vastu_score = if all_rooms.is_empty() {
        100.0
    } else {
        100.0 * satisfied.len() as f64 / all_rooms.len() as f64
    };
    let checks = [
        v.every_room_has_door,
        v.stair_connects,
        !v.private_through_private,
        v.kitchen_near_dining,
    ];
    let planning_score =
        100.0 * f64::from(u8::try_from(checks.iter().filter(|c| **c).count()).unwrap_or(0)) / 4.0;
    #[expect(clippy::cast_precision_loss, reason = "issue counts are tiny")]
    let circulation_score = if v.all_reachable {
        100.0
    } else {
        0.0_f64
            .max(100.0 - 20.0 * v.issues.iter().filter(|i| i.id.starts_with("iso-")).count() as f64)
    };
    let overall = 0.5 * vastu_score + 0.3 * planning_score + 0.2 * circulation_score;
    let mut conflicts: Vec<String> = v.issues.iter().map(|i| i.message_key.to_owned()).collect();
    if leftover > 0 {
        conflicts.push(format!(
            "{leftover} requested space(s) could not be placed on this plot."
        ));
    }
    json!({
        "score": py_round(overall, 1),
        "vastu_score": py_round(vastu_score, 1),
        "planning_score": py_round(planning_score, 1),
        "circulation_score": py_round(circulation_score, 1),
        "satisfied_rules": satisfied,
        "relaxed_rules": relaxed_rooms,
        "conflicts": conflicts,
    })
}

/// `build_house_plan(site, requirement)`; `plot_echo` is the validated `site` as
/// the response repeats it.
///
/// # Errors
///
/// [`PlanError`] wherever Python raises (it answers 500).
pub fn build(
    rules: &Rules,
    plot: Plot,
    req: &Requirement,
    plot_echo: &Value,
) -> Result<Value, PlanError> {
    let site = Site {
        width: to_meters(plot.width, plot.unit),
        height: to_meters(plot.depth, plot.unit),
        facing: plot.facing,
    };
    let storeys = clamp_storeys(req.storeys);
    let all_spaces = expand_planned_spaces(req);
    if let Some(bad) = all_spaces.iter().find(|s| {
        !matches!(s.kind.as_str(), "staircase" | "courtyard") && rules.ideal_opt(&s.kind).is_none()
    }) {
        return Err(PlanError::UnknownKind(bad.kind.clone()));
    }
    let stair = (storeys > 1).then(|| stair_on_site(site));
    let court = if all_spaces.iter().any(|s| s.kind == "courtyard") {
        OpenFloor::Courtyard
    } else {
        OpenFloor::Indoor
    };
    let mut buckets: [Vec<Space>; 3] = [Vec::new(), Vec::new(), Vec::new()];
    for space in all_spaces {
        if space.kind == "staircase" {
            continue;
        }
        let i = usize::try_from(resolve_storey(&space, req)).unwrap_or(0);
        buckets[i].push(space);
    }

    let mut floors: Vec<(i64, Vec<Room>)> = Vec::new();
    let mut layers: Vec<Value> = Vec::new();
    let mut relaxed: Vec<Conflict> = Vec::new();
    let mut overflow: Vec<Space> = Vec::new();
    for i in 0..storeys {
        let mut batch = std::mem::take(&mut overflow);
        batch.append(&mut buckets[usize::try_from(i).unwrap_or(0)]);
        let (rooms, floor_leftover, floor_relaxed) =
            build_floor(rules, i, batch, site, &req.mode, stair.as_ref(), court)
                .map_err(|e| PlanError::DuplicateId(e.0))?;
        layers.push(compile_layer(
            rules,
            site.width,
            site.height,
            site.facing,
            &rooms,
        ));
        floors.push((i, rooms));
        relaxed.extend(floor_relaxed);
        overflow = floor_leftover;
    }
    let leftover = overflow;
    let validation = validate_concept(rules, &floors, &leftover, storeys);
    let score = score_json(&floors, &relaxed, &validation, leftover.len());

    let stair_out = stair.map_or(Value::Null, |s| {
        json!({
            "id": "stair_shaft", "x": s.rect.x, "y": s.rect.y, "w": s.rect.w, "h": s.rect.h,
            "rise": "n", "floors": [0, 1, 2], "host_id": s.host_id,
        })
    });
    Ok(json!({
        "rule_version": rules.version(),
        "plot": plot_echo,
        "width": site.width,
        "height": site.height,
        "facing": site.facing.as_str(),
        "mode": req.mode,
        "floors": floors.iter().zip(layers).map(|((storey, rooms), layer)| json!({
            "storey": storey,
            "rooms": rooms.iter().map(room_json).collect::<Vec<_>>(),
            "layer": layer,
        })).collect::<Vec<_>>(),
        "stair": stair_out,
        "leftover": leftover.iter().map(|s| json!({"id": s.id, "kind": s.kind, "index": s.index})).collect::<Vec<_>>(),
        "validation": {
            "all_reachable": validation.all_reachable,
            "every_room_has_door": validation.every_room_has_door,
            "stair_connects": validation.stair_connects,
            "kitchen_near_dining": validation.kitchen_near_dining,
            "private_through_private": validation.private_through_private,
            "issues": validation.issues.iter().map(conflict_json).collect::<Vec<_>>(),
        },
        "vastu_relaxed": relaxed.iter().map(conflict_json).collect::<Vec<_>>(),
        "score": score,
    }))
}

/// `analyze_requirements(requirement, plot_width, plot_depth, unit)`.
#[must_use]
pub fn analyze(
    rules: &Rules,
    req: &Requirement,
    plot_width: f64,
    plot_depth: f64,
    unit: Unit,
) -> Value {
    let mut issues = Vec::new();
    let area = plot_width * plot_depth;
    let area_sqft = if unit == Unit::Feet {
        area
    } else {
        area * 10.7639
    };
    if area_sqft < 400.0 {
        issues.push(json!({
            "severity": "warn",
            "message": format!(
                "Plot area (~{area_sqft:.0} sqft) is small for {} bedroom(s) plus the requested extras — expect a tight fit once a later phase actually places rooms.",
                req.bedrooms
            ),
        }));
    }
    let mut unique: Vec<String> = Vec::new();
    for s in req.room_subjects() {
        if !unique.contains(&s) {
            unique.push(s);
        }
    }
    for s in &unique {
        if !rules.subjects().contains(s) {
            issues.push(json!({
                "severity": "info",
                "message": format!("No Vastu zone-use data available for '{s}' yet — reporting empty best/avoid zones, not a guess."),
            }));
        }
    }
    json!({
        "rule_version": rules.version(),
        "rooms": unique.iter().map(|s| room_zones(rules, s)).collect::<Vec<_>>(),
        "issues": issues,
    })
}

/// `_room_zones(subject)`: distinct best and avoid zones, in query order.
#[must_use]
pub fn room_zones(rules: &Rules, subject: &str) -> Value {
    let mut best: Vec<&str> = Vec::new();
    let mut avoid: Vec<&str> = Vec::new();
    for m in rules.by_subject(subject) {
        let list = if m.polarity == "best" {
            &mut best
        } else if m.polarity == "avoid" {
            &mut avoid
        } else {
            continue;
        };
        if !list.contains(&m.zone.as_str()) {
            list.push(&m.zone);
        }
    }
    json!({"subject": subject, "best_zones": best, "avoid_zones": avoid})
}
