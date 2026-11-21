//! Plan checks: doors, reachability, privacy, stair, kitchen-dining, wet rooms,
//! toilet zone (`engine/vastu/validate.py`).

use std::collections::{HashMap, HashSet};

use super::{Conflict, Ctx, Room, Space, entrance::toilet_forbidden, is_wet};
use crate::geometry::{Rect, shared_seg};

/// `ValidationReport`.
#[derive(Debug, Clone)]
#[expect(
    clippy::struct_excessive_bools,
    reason = "the five flags of the API's ValidationReport"
)]
pub(crate) struct Report {
    pub(crate) all_reachable: bool,
    pub(crate) every_room_has_door: bool,
    pub(crate) stair_connects: bool,
    pub(crate) kitchen_near_dining: bool,
    pub(crate) private_through_private: bool,
    pub(crate) issues: Vec<Conflict>,
}

fn overlap_loose(a: Rect, b: Rect) -> bool {
    let w = (a.x + a.w).min(b.x + b.w) - a.x.max(b.x);
    let h = (a.y + a.h).min(b.y + b.h) - a.y.max(b.y);
    w > 0.12 && h > 0.12
}

fn is_room(r: &Room) -> bool {
    !r.is_open()
}

fn needs_reachability(rules: Ctx<'_>, r: &Room) -> bool {
    is_room(r) || rules.ideal_opt(&r.kind).is_some()
}

fn neighbors(room: &Room, floor: &[Room]) -> Vec<String> {
    let mut out: Vec<String> = room.doors.iter().map(|d| d.connects_to.clone()).collect();
    for other in floor {
        if other.id == room.id {
            continue;
        }
        if other.doors.iter().any(|d| d.connects_to == room.id) {
            out.push(other.id.clone());
        }
        if room.is_open() && other.is_open() && shared_seg(room.rect, other.rect).is_some() {
            out.push(other.id.clone());
        }
        if room.life != "circulation"
            && other.is_open()
            && (shared_seg(room.rect, other.rect).is_some() || overlap_loose(room.rect, other.rect))
        {
            out.push(other.id.clone());
        }
    }
    out
}

/// `validate_concept(floors, leftover, storeys)`.
#[expect(
    clippy::too_many_lines,
    reason = "mirrors validate.validate_concept check for check"
)]
pub(crate) fn validate_concept(
    rules: Ctx<'_>,
    floors: &[(i64, Vec<Room>)],
    leftover: &[Space],
    storeys: i64,
) -> Report {
    let mut issues = Vec::new();
    let missing_door = floors
        .iter()
        .flat_map(|(_, rooms)| rooms)
        .any(|r| is_room(r) && r.doors.is_empty());
    if missing_door {
        issues.push(Conflict::new(
            "doors".into(),
            "warn",
            "vastu.plan.valid.missing_door",
        ));
    }

    let mut all_reachable = true;
    for (storey, rooms) in floors {
        let Some(hall) = rooms.iter().find(|r| {
            matches!(
                r.kind.as_str(),
                "hall" | "foyer" | "landing" | "brahmasthan" | "verandah"
            )
        }) else {
            all_reachable = false;
            issues.push(Conflict::new(
                format!("reach-{storey}"),
                "warn",
                "vastu.plan.valid.no_hall",
            ));
            continue;
        };
        let mut by_id: HashMap<&str, &Room> = HashMap::new();
        for r in rooms {
            by_id.insert(r.id.as_str(), r);
        }
        let mut seen: HashSet<String> = HashSet::from([hall.id.clone()]);
        let mut q = vec![hall.id.clone()];
        while let Some(id) = q.pop() {
            let Some(node) = by_id.get(id.as_str()) else {
                continue;
            };
            for nxt in neighbors(node, rooms) {
                if seen.insert(nxt.clone()) {
                    q.push(nxt);
                }
            }
        }
        for room in rooms {
            if needs_reachability(rules, room) && !seen.contains(&room.id) {
                all_reachable = false;
                issues.push(Conflict::new(
                    format!("iso-{}", room.id),
                    "warn",
                    "vastu.plan.valid.isolated",
                ));
            }
        }
    }

    let mut private_through_private = false;
    for (_, rooms) in floors {
        for room in rooms {
            if room.life != "private" || room.doors.is_empty() {
                continue;
            }
            let only_private = room.doors.iter().all(|d| {
                rooms
                    .iter()
                    .find(|r| r.id == d.connects_to)
                    .is_some_and(|r| r.life == "private")
            });
            let hits_hub = room.doors.iter().any(|d| {
                ["hall", "center", "verandah", "foyer"]
                    .iter()
                    .any(|k| d.connects_to.contains(k))
            });
            if only_private && !hits_hub {
                private_through_private = true;
            }
        }
    }
    if private_through_private {
        issues.push(Conflict::new(
            "privacy".into(),
            "warn",
            "vastu.plan.valid.private_through",
        ));
    }

    let has_stair_every_floor = floors
        .iter()
        .all(|(_, rooms)| rooms.iter().any(|r| r.kind == "staircase"));
    let stair_connects =
        storeys == 1 || has_stair_every_floor || leftover.iter().any(|s| s.kind == "staircase");
    if storeys > 1 && !has_stair_every_floor {
        issues.push(Conflict::new(
            "stair".into(),
            "warn",
            "vastu.plan.valid.stair",
        ));
    }

    let mut kitchen_near_dining = true;
    for (_, rooms) in floors {
        let kitchen = rooms.iter().find(|r| r.kind == "kitchen");
        let dining = rooms.iter().find(|r| r.kind == "dining");
        let (Some(kitchen), Some(dining)) = (kitchen, dining) else {
            continue;
        };
        let touch =
            kitchen.adjacent_to.contains(&dining.id) || dining.adjacent_to.contains(&kitchen.id);
        let via_hall = kitchen
            .doors
            .iter()
            .any(|d| dining.doors.iter().any(|e| d.connects_to == e.connects_to));
        let on_open = |room: &Room| {
            room.doors.iter().any(|d| {
                rooms
                    .iter()
                    .find(|r| r.id == d.connects_to)
                    .is_some_and(Room::is_open)
            })
        };
        let both_on_court = on_open(kitchen) && on_open(dining);
        kitchen_near_dining = touch || via_hall || both_on_court;
        if !kitchen_near_dining {
            issues.push(Conflict::new(
                "kit-din".into(),
                "info",
                "vastu.plan.valid.kitchen_dining",
            ));
        }
    }

    let wets: Vec<&Room> = floors
        .iter()
        .flat_map(|(_, rooms)| rooms)
        .filter(|r| is_wet(&r.kind))
        .collect();
    if !wets.is_empty() && !wets.iter().all(|r| !r.doors.is_empty()) {
        issues.push(Conflict::new(
            "wet-access".into(),
            "info",
            "vastu.plan.valid.wet_access",
        ));
    }

    let bad_toilet = floors.iter().flat_map(|(_, rooms)| rooms).any(|r| {
        matches!(r.kind.as_str(), "toilet" | "combined") && toilet_forbidden(rules, &r.vastu_region)
    });
    if bad_toilet {
        issues.push(Conflict::new(
            "toilet-zone".into(),
            "warn",
            "vastu.plan.valid.toilet_zone",
        ));
    }

    Report {
        all_reachable,
        every_room_has_door: !missing_door,
        stair_connects,
        kitchen_near_dining,
        private_through_private,
        issues,
    }
}
