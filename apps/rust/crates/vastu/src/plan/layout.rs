//! Room placement and door passes for one floor (`engine/vastu/layout.py`).

use std::collections::{HashMap, HashSet};

use super::{
    Conflict, Ctx, Door, Facing, OpenFloor, Room, Space, Stair, dir8_zone_of_point,
    disjoint_reserved, life_zone_of,
    ring::{KeyError, Reserved, entrance_halls, ring_layout, ring_plan},
};
use crate::geometry::{
    Rect, max_by_first, min_by_first, shared_seg, sort_by_key_f64, split_by, touches,
};

const STAIR_W: f64 = 1.25;
const STAIR_L: f64 = 2.5;
const MERGE_EPS: f64 = 0.05;
const DOOR_W: f64 = 0.9;
pub(crate) const CORRIDOR_W: f64 = 0.85;
const GROWTH_SLACK: f64 = 0.05;
const MIN_REMAINDER: f64 = 0.45;

/// The old 9-zone mandala, still used to name the stair room's region (`mandala`).
fn mandala_cells(width: f64, height: f64) -> [(&'static str, Rect); 8] {
    let (x1, x2) = (width / 3.0, 2.0 * width / 3.0);
    let (y1, y2) = (height / 3.0, 2.0 * height / 3.0);
    let cw = CORRIDOR_W.min(x1 * 0.3);
    let ch = CORRIDOR_W.min(y1 * 0.3);
    [
        ("northwest", Rect::new(0.0, 0.0, x1, y1 - ch)),
        ("north", Rect::new(x1, 0.0, x2 - x1, y1 - ch)),
        ("northeast", Rect::new(x2, 0.0, width - x2, y1 - ch)),
        ("west", Rect::new(0.0, y1, x1 - cw, y2 - y1)),
        ("east", Rect::new(x2 + cw, y1, width - x2 - cw, y2 - y1)),
        ("southwest", Rect::new(0.0, y2 + ch, x1, height - y2 - ch)),
        ("south", Rect::new(x1, y2 + ch, x2 - x1, height - y2 - ch)),
        (
            "southeast",
            Rect::new(x2, y2 + ch, width - x2, height - y2 - ch),
        ),
    ]
}

fn clip_t(t: f64) -> f64 {
    0.82_f64.min(0.18_f64.max(t))
}

/// `add_door(room, wall, t, connects_to)`.
fn add_door(room: &mut Room, wall: char, t: f64, connects_to: &str) {
    let id = format!("door_{}_{}_{}", room.id, wall, room.doors.len());
    room.doors.push(Door {
        id,
        room_id: room.id.clone(),
        wall,
        t: clip_t(t),
        width: DOOR_W,
        swing: if matches!(wall, 'n' | 'w') {
            "in_right"
        } else {
            "in_left"
        },
        connects_to: connects_to.to_owned(),
    });
}

fn make_room(space: &Space, rect: Rect, storey: i64, region: &str) -> Room {
    Room {
        id: format!("{}_f{storey}", space.id),
        kind: space.kind.clone(),
        floor: storey,
        rect,
        life: life_zone_of(&space.kind),
        vastu_region: region.to_owned(),
        index: space.index,
        doors: Vec::new(),
        adjacent_to: Vec::new(),
    }
}

fn open_piece(id: String, rect: Rect, storey: i64, court: OpenFloor) -> Room {
    Room {
        id,
        kind: "brahmasthan".to_owned(),
        floor: storey,
        rect,
        life: if court == OpenFloor::Courtyard {
            "outdoor"
        } else {
            "circulation"
        },
        vastu_region: "center".to_owned(),
        index: None,
        doors: Vec::new(),
        adjacent_to: Vec::new(),
    }
}

/// `connect_foyer`: only a foyer boxed in by closed rooms needs a door.
fn connect_foyer(foyer: usize, rooms: &mut [Room]) {
    let frect = rooms[foyer].rect;
    let fid = rooms[foyer].id.clone();
    if rooms
        .iter()
        .filter(|r| r.id != fid && r.is_open())
        .any(|o| shared_seg(frect, o.rect).is_some())
    {
        return;
    }
    let mut hosts: Vec<&Room> = rooms
        .iter()
        .filter(|r| !super::is_wet(&r.kind) && !r.is_open() && shared_seg(r.rect, frect).is_some())
        .collect();
    hosts.sort_by_key(|s| u8::from(!matches!(s.kind.as_str(), "dining" | "living")));
    let Some(host) = hosts.first() else { return };
    let dx = host.rect.x + host.rect.w / 2.0 - (frect.x + frect.w / 2.0);
    let dy = host.rect.y + host.rect.h / 2.0 - (frect.y + frect.h / 2.0);
    let wall = if dx.abs() > dy.abs() {
        if dx > 0.0 { 'e' } else { 'w' }
    } else if dy > 0.0 {
        's'
    } else {
        'n'
    };
    let host_id = host.id.clone();
    add_door(&mut rooms[foyer], wall, 0.5, &host_id);
}

/// `door_onto_open(room, open_rooms)`: biggest open neighbour sharing a wall.
fn door_onto_open(room: &mut Room, ranked: &[(String, Rect)]) {
    if !room.doors.is_empty() {
        return;
    }
    for (id, rect) in ranked {
        if let Some(seg) = shared_seg(room.rect, *rect) {
            add_door(room, seg.wall, 0.5, id);
            return;
        }
    }
}

/// Union-find root with path halving (`seal_circulation`'s `find`).
fn find(parent: &mut HashMap<String, String>, x: &str) -> String {
    let mut x = x.to_owned();
    loop {
        let p = parent.get(&x).cloned().unwrap_or_else(|| x.clone());
        if p == x {
            return x;
        }
        let gp = parent.get(&p).cloned().unwrap_or_else(|| p.clone());
        parent.insert(x.clone(), gp.clone());
        x = gp;
    }
}

/// `seal_circulation`: every connected cluster of open floor gets one way in.
fn seal_circulation(rooms: &mut [Room]) {
    let hosts: Vec<(String, Rect)> = rooms
        .iter()
        .filter(|r| !r.is_open())
        .map(|r| (r.id.clone(), r.rect))
        .collect();
    let opens: Vec<usize> = (0..rooms.len()).filter(|&i| rooms[i].is_open()).collect();

    let mut parent: HashMap<String, String> = opens
        .iter()
        .map(|&i| (rooms[i].id.clone(), rooms[i].id.clone()))
        .collect();
    for a in 0..opens.len() {
        for b in a + 1..opens.len() {
            if touches(rooms[opens[a]].rect, rooms[opens[b]].rect) {
                let ra = find(&mut parent, &rooms[opens[a]].id);
                let rb = find(&mut parent, &rooms[opens[b]].id);
                if ra != rb {
                    parent.insert(ra, rb);
                }
            }
        }
    }
    let mut clusters: Vec<(String, Vec<usize>)> = Vec::new();
    for &i in &opens {
        let root = find(&mut parent, &rooms[i].id);
        if let Some(slot) = clusters.iter_mut().find(|(r, _)| *r == root) {
            slot.1.push(i);
        } else {
            clusters.push((root, vec![i]));
        }
    }

    let mut touching: HashSet<String> = HashSet::new();
    for r in rooms.iter() {
        for d in &r.doors {
            touching.insert(d.connects_to.clone());
        }
        if !r.doors.is_empty() {
            touching.insert(r.id.clone());
        }
    }

    for (_, cluster) in clusters {
        if cluster.iter().any(|&i| touching.contains(&rooms[i].id)) {
            continue;
        }
        if cluster.iter().map(|&i| rooms[i].rect.area()).sum::<f64>() < 0.3 {
            continue;
        }
        let Some(space) = max_by_first(cluster.iter().copied(), |&i| rooms[i].rect.area()) else {
            continue;
        };
        for (hid, hrect) in &hosts {
            if let Some(seg) = shared_seg(rooms[space].rect, *hrect) {
                add_door(&mut rooms[space], seg.wall, 0.5, hid);
                break;
            }
        }
    }
}

fn by_id_last(rooms: &[Room]) -> HashMap<&str, usize> {
    let mut m = HashMap::new();
    for (i, r) in rooms.iter().enumerate() {
        m.insert(r.id.as_str(), i);
    }
    m
}

fn reachable_from(rooms: &[Room], root_id: &str) -> HashSet<String> {
    let by_id = by_id_last(rooms);
    let mut seen: HashSet<String> = HashSet::from([root_id.to_owned()]);
    let mut queue = vec![root_id.to_owned()];
    while let Some(cur_id) = queue.pop() {
        let Some(&ci) = by_id.get(cur_id.as_str()) else {
            continue;
        };
        let cur = &rooms[ci];
        for d in &cur.doors {
            if d.connects_to != "outside" && !seen.contains(&d.connects_to) {
                seen.insert(d.connects_to.clone());
                queue.push(d.connects_to.clone());
            }
        }
        for r in rooms {
            if seen.contains(&r.id) {
                continue;
            }
            if r.doors.iter().any(|d| d.connects_to == cur.id)
                || (cur.is_open() && r.is_open() && shared_seg(cur.rect, r.rect).is_some())
            {
                seen.insert(r.id.clone());
                queue.push(r.id.clone());
            }
        }
    }
    seen
}

/// `ensure_reachable(rooms, root_id)`: bridge in whatever the BFS can't reach.
fn ensure_reachable(rules: Ctx<'_>, rooms: &mut [Room], root_id: &str) {
    if !rooms.iter().any(|r| r.id == root_id) {
        return;
    }
    for _ in 0..rooms.len() * 2 {
        let seen = reachable_from(rooms, root_id);
        let stuck: Vec<usize> = (0..rooms.len())
            .filter(|&i| !seen.contains(&rooms[i].id))
            .collect();
        if stuck.is_empty() {
            return;
        }
        let reached_opens: Vec<usize> = (0..rooms.len())
            .filter(|&i| seen.contains(&rooms[i].id) && rooms[i].is_open())
            .collect();
        let mut bridge: Option<(usize, usize)> = None;
        'outer: for &room in &stuck {
            if !rooms[room].is_open() {
                continue;
            }
            for &n in &reached_opens {
                if shared_seg(rooms[room].rect, rooms[n].rect).is_some() {
                    bridge = Some((room, n));
                    break 'outer;
                }
            }
        }
        if bridge.is_none() {
            'outer2: for &room in &stuck {
                let r = &rooms[room];
                if !(r.life != "circulation" || rules.ideal_opt(&r.kind).is_some()) {
                    continue;
                }
                for (n, other) in rooms.iter().enumerate() {
                    if seen.contains(&other.id) && shared_seg(r.rect, other.rect).is_some() {
                        bridge = Some((room, n));
                        break 'outer2;
                    }
                }
            }
        }
        let Some((room, n)) = bridge else { return };
        let Some(seg) = shared_seg(rooms[room].rect, rooms[n].rect) else {
            return;
        };
        let nid = rooms[n].id.clone();
        add_door(&mut rooms[room], seg.wall, 0.5, &nid);
    }
}

fn is_merge_target(room: &Room) -> bool {
    !matches!(room.life, "circulation" | "outdoor" | "vertical") && !super::is_wet(&room.kind)
}

fn forms_rectangle_with(r: Rect, cell: Rect) -> bool {
    let same_height = (r.h - cell.h).abs() < MERGE_EPS && (r.y - cell.y).abs() < MERGE_EPS;
    let same_width = (r.w - cell.w).abs() < MERGE_EPS && (r.x - cell.x).abs() < MERGE_EPS;
    let touches_left = (r.x - (cell.x + cell.w)).abs() < MERGE_EPS;
    let touches_right = (cell.x - (r.x + r.w)).abs() < MERGE_EPS;
    let touches_top = (r.y - (cell.y + cell.h)).abs() < MERGE_EPS;
    let touches_bottom = (cell.y - (r.y + r.h)).abs() < MERGE_EPS;
    (same_height && (touches_left || touches_right))
        || (same_width && (touches_top || touches_bottom))
}

fn merged_rect(r: Rect, cell: Rect) -> Rect {
    let same_row = (r.h - cell.h).abs() < MERGE_EPS && (r.y - cell.y).abs() < MERGE_EPS;
    if same_row {
        Rect::new(r.x.min(cell.x), r.y, r.w + cell.w, r.h)
    } else {
        Rect::new(r.x, r.y.min(cell.y), r.w, r.h + cell.h)
    }
}

fn growth_priority(rules: Ctx<'_>, room: &Room, cell: Rect) -> Option<(u8, f64)> {
    let merged_area = merged_rect(room.rect, cell).area();
    let tiers = rules.tiers(&room.kind);
    if let Some(t) = tiers
        && merged_area > t.preferred_area() + GROWTH_SLACK
    {
        return None;
    }
    let below = tiers.is_some_and(|t| room.rect.area() < t.comfortable_area());
    Some((u8::from(!below), -merged_area))
}

/// `try_merge_into_neighbor(rooms, cell, center_id)`.
fn try_merge_into_neighbor(
    rules: Ctx<'_>,
    rooms: &mut [Room],
    cell: Rect,
    center_id: &str,
) -> bool {
    let candidates = rooms.iter().enumerate().filter_map(|(i, room)| {
        if !(is_merge_target(room) && forms_rectangle_with(room.rect, cell)) {
            return None;
        }
        growth_priority(rules, room, cell).map(|p| (i, p))
    });
    let mut best = min_by_first(candidates, |(_, p)| *p).map(|(i, _)| i);
    if best.is_none()
        && let Some(ci) = rooms.iter().position(|r| r.id == center_id)
        && forms_rectangle_with(rooms[ci].rect, cell)
        && growth_priority(rules, &rooms[ci], cell).is_some()
    {
        best = Some(ci);
    }
    let Some(b) = best else { return false };
    rooms[b].rect = merged_rect(rooms[b].rect, cell);
    true
}

fn reclaim_priority(rules: Ctx<'_>, room: &Room, merged: Rect) -> (u8, f64) {
    let area = merged.area();
    match rules.tiers(&room.kind) {
        Some(t) if t.preferred_area() > 0.0 => (0, area / t.preferred_area()),
        _ => (1, area),
    }
}

fn strip_slices(strip: Rect, room: Rect) -> Option<(Vec<Rect>, Rect)> {
    for horizontal in [true, false] {
        let (flush, lo, hi, rlo, rhi) = if horizontal {
            (
                (room.y + room.h - strip.y).abs() < MERGE_EPS
                    || (strip.y + strip.h - room.y).abs() < MERGE_EPS,
                strip.x,
                strip.x + strip.w,
                room.x,
                room.x + room.w,
            )
        } else {
            (
                (room.x + room.w - strip.x).abs() < MERGE_EPS
                    || (strip.x + strip.w - room.x).abs() < MERGE_EPS,
                strip.y,
                strip.y + strip.h,
                room.y,
                room.y + room.h,
            )
        };
        if !flush {
            continue;
        }
        if rlo < lo - MERGE_EPS || rhi > hi + MERGE_EPS {
            continue;
        }
        let (lo2, hi2) = (lo.max(rlo), hi.min(rhi));
        if hi2 - lo2 < MIN_REMAINDER {
            continue;
        }
        let cuts = [(lo, lo2), (hi2, hi)];
        if cuts
            .iter()
            .any(|(a, b)| 0.0 < b - a && b - a < MIN_REMAINDER)
        {
            continue;
        }
        let rest: Vec<Rect>;
        let merged;
        if horizontal {
            rest = cuts
                .iter()
                .filter(|(a, b)| b - a >= MIN_REMAINDER)
                .map(|(a, b)| Rect::new(*a, strip.y, b - a, strip.h))
                .collect();
            merged = Rect::new(room.x, room.y.min(strip.y), room.w, room.h + strip.h);
        } else {
            rest = cuts
                .iter()
                .filter(|(a, b)| b - a >= MIN_REMAINDER)
                .map(|(a, b)| Rect::new(strip.x, *a, strip.w, b - a))
                .collect();
            merged = Rect::new(room.x.min(strip.x), room.y, room.w + strip.w, room.h);
        }
        return Some((rest, merged));
    }
    None
}

fn open_cluster(pieces: &[(String, Rect)], root_id: &str) -> HashSet<String> {
    let by_id: HashMap<&str, Rect> = pieces.iter().map(|(k, v)| (k.as_str(), *v)).collect();
    if !by_id.contains_key(root_id) {
        return HashSet::new();
    }
    let mut seen: HashSet<String> = HashSet::from([root_id.to_owned()]);
    let mut queue = vec![root_id.to_owned()];
    while let Some(cur_id) = queue.pop() {
        let cur = by_id[cur_id.as_str()];
        for (pid, rect) in pieces {
            if !seen.contains(pid) && shared_seg(cur, *rect).is_some() {
                seen.insert(pid.clone());
                queue.push(pid.clone());
            }
        }
    }
    seen
}

fn stranded(closed: &[(String, Rect)], opens: &[(String, Rect)]) -> usize {
    closed
        .iter()
        .filter(|(_, rect)| !opens.iter().any(|(_, o)| shared_seg(*rect, *o).is_some()))
        .count()
}

fn open_along_long_side(strip_idx: usize, rooms: &[Room]) -> bool {
    let strip = rooms[strip_idx].rect;
    let horizontal = strip.w >= strip.h;
    let eps = 0.04;
    for (i, room) in rooms.iter().enumerate() {
        if !room.is_open() || i == strip_idx {
            continue;
        }
        let r = room.rect;
        let (flush, span) = if horizontal {
            (
                (r.y + r.h - strip.y).abs() < eps || (strip.y + strip.h - r.y).abs() < eps,
                (r.x + r.w).min(strip.x + strip.w) - r.x.max(strip.x),
            )
        } else {
            (
                (r.x + r.w - strip.x).abs() < eps || (strip.x + strip.w - r.x).abs() < eps,
                (r.y + r.h).min(strip.y + strip.h) - r.y.max(strip.y),
            )
        };
        if flush && span > 0.45 {
            return true;
        }
    }
    false
}

fn ranked_opens(rooms: &[Room]) -> Vec<(String, Rect)> {
    let mut ranked: Vec<(String, Rect)> = rooms
        .iter()
        .filter(|r| r.is_open())
        .map(|r| (r.id.clone(), r.rect))
        .collect();
    sort_by_key_f64(&mut ranked, |(_, r)| -r.area());
    ranked
}

fn door_targets(rooms: &[Room]) -> HashSet<String> {
    let ranked = ranked_opens(rooms);
    let mut chosen = HashSet::new();
    for room in rooms.iter().filter(|r| !r.is_open()) {
        for (id, rect) in &ranked {
            if shared_seg(room.rect, *rect).is_some() {
                chosen.insert(id.clone());
                break;
            }
        }
    }
    chosen
}

fn network_no_worse(
    rooms: &[Room],
    dropped: &Room,
    host_id: &str,
    merged: Rect,
    rest: &[Rect],
    center_id: &str,
) -> bool {
    let opens_now: Vec<(String, Rect)> = rooms
        .iter()
        .filter(|r| r.is_open())
        .map(|r| (r.id.clone(), r.rect))
        .collect();
    let closed_now: Vec<(String, Rect)> = rooms
        .iter()
        .filter(|r| !r.is_open())
        .map(|r| (r.id.clone(), r.rect))
        .collect();
    let mut opens_after: Vec<(String, Rect)> = rooms
        .iter()
        .filter(|r| r.is_open() && r.id != dropped.id)
        .map(|r| (r.id.clone(), r.rect))
        .collect();
    opens_after.extend(
        rest.iter()
            .enumerate()
            .map(|(i, rect)| (format!("{}~{i}", dropped.id), *rect)),
    );
    let closed_after: Vec<(String, Rect)> = rooms
        .iter()
        .filter(|r| !r.is_open() && r.id != dropped.id)
        .map(|r| (r.id.clone(), if r.id == host_id { merged } else { r.rect }))
        .collect();
    let mut was = open_cluster(&opens_now, center_id);
    was.remove(&dropped.id);
    let now = open_cluster(&opens_after, center_id);
    if was.iter().any(|id| !now.contains(id)) {
        return false;
    }
    stranded(&closed_after, &opens_after) <= stranded(&closed_now, &opens_now)
}

/// `absorb_dead_corridors`: hand unused corridor strips to the rooms beside them.
fn absorb_dead_corridors(rules: Ctx<'_>, rooms: &mut Vec<Room>, center_id: &str, storey: i64) {
    for _ in 0..rooms.len() * 2 {
        let mut strips: Vec<usize> = (0..rooms.len())
            .filter(|&i| rooms[i].kind == "brahmasthan" && rooms[i].id != center_id)
            .collect();
        sort_by_key_f64(&mut strips, |&i| rooms[i].rect.area());
        if !absorb_one(rules, rooms, &strips, center_id, storey) {
            return;
        }
    }
}

/// A reclaim option: (priority, host room index, leftover strips, grown rect).
type Reclaim = ((u8, f64), usize, Vec<Rect>, Rect);

fn absorb_one(
    rules: Ctx<'_>,
    rooms: &mut Vec<Room>,
    strips: &[usize],
    center_id: &str,
    storey: i64,
) -> bool {
    let live = door_targets(rooms);
    for &si in strips {
        if live.contains(&rooms[si].id) || open_along_long_side(si, rooms) {
            continue;
        }
        let strip_rect = rooms[si].rect;
        let mut options: Vec<Reclaim> = Vec::new();
        for (ri, room) in rooms.iter().enumerate() {
            if !is_merge_target(room) {
                continue;
            }
            let Some((rest, merged)) = strip_slices(strip_rect, room.rect) else {
                continue;
            };
            options.push((reclaim_priority(rules, room, merged), ri, rest, merged));
        }
        options.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        for (_, ri, rest, merged) in options {
            let host_id = rooms[ri].id.clone();
            if !network_no_worse(rooms, &rooms[si], &host_id, merged, &rest, center_id) {
                continue;
            }
            rooms[ri].rect = merged;
            let strip = rooms.remove(si);
            for (i, rect) in rest.into_iter().enumerate() {
                rooms.push(Room {
                    id: format!("{}_part{i}", strip.id),
                    kind: strip.kind.clone(),
                    floor: storey,
                    rect,
                    life: strip.life,
                    vastu_region: strip.vastu_region.clone(),
                    index: None,
                    doors: Vec::new(),
                    adjacent_to: Vec::new(),
                });
            }
            return true;
        }
    }
    false
}

/// The site: plot size in metres and the entrance wall.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Site {
    pub(crate) width: f64,
    pub(crate) height: f64,
    pub(crate) facing: Facing,
}

/// One floor's rooms, what could not be placed, and the Vastu relaxations.
pub(crate) type FloorResult = (Vec<Room>, Vec<Space>, Vec<Conflict>);

/// `build_floor(storey, program, site, mode, stair, want_court)`.
#[expect(
    clippy::too_many_lines,
    reason = "mirrors layout.build_floor one step for one step"
)]
pub(crate) fn build_floor(
    rules: Ctx<'_>,
    storey: i64,
    program: Vec<Space>,
    site: Site,
    mode: &str,
    stair: Option<&Stair>,
    court: OpenFloor,
) -> Result<FloorResult, KeyError> {
    let (width, height) = (site.width, site.height);
    let mut rooms: Vec<Room> = Vec::new();
    let mut relaxed: Vec<Conflict> = Vec::new();
    let mut leftover: Vec<Space> = Vec::new();
    let center_id = format!("center_{storey}");
    let plan = ring_plan(width, height, CORRIDOR_W);
    let halls = entrance_halls(rules, &plan, site.facing, width, height);

    let mut to_place: Vec<Space> = Vec::new();
    for space in program {
        if matches!(space.kind.as_str(), "staircase" | "courtyard") {
            continue;
        }
        if space.kind == "combined" && mode == "strict" {
            relaxed.push(Conflict::new(
                format!("sep-{}", space.id),
                "info",
                "vastu.plan.valid.wet_separate",
            ));
            leftover.push(space);
            continue;
        }
        to_place.push(space);
    }

    let mut best = None;
    for hall in &halls {
        let mut held: Reserved = Vec::new();
        let mut reserve = |zone: &'static str, r: Rect| {
            if let Some(slot) = held.iter_mut().find(|(z, _)| *z == zone) {
                slot.1.push(r);
            } else {
                held.push((zone, vec![r]));
            }
        };
        for (zone, bite) in &hall.blocked {
            reserve(zone, *bite);
        }
        if let Some(s) = stair {
            reserve(ring_zone_of(s.rect, width, height), s.rect);
        }
        let (attempt, attempt_ring) = ring_layout(
            rules,
            &to_place,
            (width, height),
            mode,
            CORRIDOR_W,
            &held,
            Some(hall.lobby),
        )?;
        let better = match &best {
            None => true,
            Some((n, _, _, _)) => attempt.dropped.len() < *n,
        };
        if better {
            best = Some((attempt.dropped.len(), attempt, attempt_ring, hall.clone()));
        }
    }
    let Some((_, result, ring, entry_hall)) = best else {
        return Ok((rooms, leftover, relaxed));
    };
    let brahma = ring.brahmasthana;

    rooms.push(open_piece(center_id.clone(), brahma, storey, court));
    let mut hard = vec![brahma];
    if let Some(s) = stair {
        hard.push(s.rect);
    }
    hard.push(entry_hall.lobby);
    hard.extend(result.placed.items.iter().map(|(_, p)| p.rect));
    let mut all = hard.clone();
    all.extend(ring.corridors);
    for (i, rect) in disjoint_reserved(&all)
        .into_iter()
        .skip(hard.len())
        .enumerate()
    {
        rooms.push(open_piece(
            format!("corridor{i}_{storey}"),
            rect,
            storey,
            court,
        ));
    }
    let lobby = entry_hall.lobby;
    let foyer_id = if storey == 0 {
        format!("foyer_{storey}")
    } else {
        format!("landing_{storey}")
    };
    rooms.push(Room {
        id: foyer_id.clone(),
        kind: if storey == 0 { "foyer" } else { "landing" }.to_owned(),
        floor: storey,
        rect: lobby,
        life: "circulation",
        vastu_region: dir8_zone_of_point(
            lobby.x + lobby.w / 2.0,
            lobby.y + lobby.h / 2.0,
            width,
            height,
        )
        .to_owned(),
        index: None,
        doors: Vec::new(),
        adjacent_to: Vec::new(),
    });
    let foyer_idx = rooms.len() - 1;
    for space in &to_place {
        let Some(placement) = result.placed.get(&space.id) else {
            continue;
        };
        let room = make_room(space, placement.rect, storey, placement.zone);
        if rules.zone_costs(&space.kind).cost(placement.zone, mode).1 {
            relaxed.push(Conflict::new(
                format!("relax-{}", room.id),
                "info",
                "vastu.plan.valid.vastu_relaxed",
            ));
        }
        rooms.push(room);
    }
    leftover.extend(result.dropped);

    if let Some(s) = stair {
        rooms.push(Room {
            id: format!("stair_{storey}"),
            kind: "staircase".to_owned(),
            floor: storey,
            rect: s.rect,
            life: "vertical",
            vastu_region: region_of_shaft(s.rect, width, height).to_owned(),
            index: None,
            doors: Vec::new(),
            adjacent_to: vec![center_id.clone()],
        });
    }

    let mut scraps = vec![Rect::new(0.0, 0.0, width, height)];
    for rect in rooms.iter().map(|r| r.rect).collect::<Vec<_>>() {
        scraps = scraps
            .into_iter()
            .flat_map(|piece| split_by(piece, rect, 0.02))
            .collect();
    }
    for (i, scrap) in scraps.into_iter().enumerate() {
        if court == OpenFloor::Indoor
            && try_merge_into_neighbor(rules, &mut rooms, scrap, &center_id)
        {
            continue;
        }
        rooms.push(open_piece(
            format!("fill{i}_{storey}"),
            scrap,
            storey,
            court,
        ));
    }

    if court == OpenFloor::Indoor {
        absorb_dead_corridors(rules, &mut rooms, &center_id, storey);
    }

    // The foyer keeps its index: only strips (never the foyer) are removed above,
    // and they sit after it only if appended later; find it again by id to be safe.
    let foyer_idx = rooms
        .iter()
        .position(|r| r.id == foyer_id && r.kind != "brahmasthan")
        .unwrap_or(foyer_idx);
    let ranked = ranked_opens(&rooms);
    connect_foyer(foyer_idx, &mut rooms);
    for room in &mut rooms {
        if room.is_open() {
            continue;
        }
        door_onto_open(room, &ranked);
    }
    seal_circulation(&mut rooms);
    ensure_reachable(rules, &mut rooms, &foyer_id);

    for room in &mut rooms {
        if matches!(room.kind.as_str(), "brahmasthan" | "foyer") && room.id != center_id {
            let cx = room.rect.x + room.rect.w / 2.0;
            let cy = room.rect.y + room.rect.h / 2.0;
            dir8_zone_of_point(cx, cy, width, height).clone_into(&mut room.vastu_region);
        }
    }

    for i in 0..rooms.len() {
        for j in i + 1..rooms.len() {
            if shared_seg(rooms[i].rect, rooms[j].rect).is_some() {
                let (a, b) = (rooms[i].id.clone(), rooms[j].id.clone());
                rooms[i].adjacent_to.push(b);
                rooms[j].adjacent_to.push(a);
            }
        }
    }
    Ok((rooms, leftover, relaxed))
}

fn region_of_shaft(rect: Rect, width: f64, height: f64) -> &'static str {
    let (cx, cy) = (rect.x + rect.w / 2.0, rect.y + rect.h / 2.0);
    for (zid, z) in mandala_cells(width, height) {
        if z.x <= cx && cx <= z.x + z.w && z.y <= cy && cy <= z.y + z.h {
            return zid;
        }
    }
    "south"
}

fn ring_zone_of(rect: Rect, width: f64, height: f64) -> &'static str {
    let plan = ring_plan(width, height, CORRIDOR_W);
    let (cx, cy) = (rect.x + rect.w / 2.0, rect.y + rect.h / 2.0);
    let mut best = "south";
    let mut best_d = f64::INFINITY;
    for (zone, cell) in &plan.cells {
        if cell.x <= cx && cx <= cell.x + cell.w && cell.y <= cy && cy <= cell.y + cell.h {
            return zone;
        }
        let d = (cx - (cell.x + cell.w / 2.0)).powi(2) + (cy - (cell.y + cell.h / 2.0)).powi(2);
        if d < best_d {
            best = zone;
            best_d = d;
        }
    }
    best
}

/// `stair_on_site(site, want)`: the shaft, pinned inside a ring cell.
pub(crate) fn stair_on_site(site: Site) -> Stair {
    let zone = if site.facing == Facing::South {
        "west"
    } else {
        "south"
    };
    let cell = ring_plan(site.width, site.height, CORRIDOR_W).cell(zone);
    let w = STAIR_W.min(cell.w * 0.5);
    let l = STAIR_L.min(cell.h);
    let rect = if zone == "south" {
        Rect::new(cell.x + cell.w - w, cell.y, w, l)
    } else {
        Rect::new(cell.x + cell.w - w, cell.y + cell.h - l, w, l)
    };
    Stair {
        rect,
        host_id: zone,
    }
}
