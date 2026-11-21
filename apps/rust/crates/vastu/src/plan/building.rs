//! Rooms compiled into a wall / hole / vertex graph (`engine/vastu/building.py`).

use std::collections::HashMap;

use serde_json::{Value, json};

use super::{
    Ctx, Facing, Room,
    entrance::{
        WIN_NE_H, WIN_NE_SILL, WIN_NE_W, WIN_SW_H, WIN_SW_SILL, WIN_SW_W, door_height,
        entrance_width, face_span, is_solar_wall, main_door_point, next_legal_count,
    },
};
use crate::geometry::{Seg, edges, max_by_first, on_perimeter, segs_overlap, shared_seg};

const WALL_T: f64 = 0.18;

/// Which axis a wall runs along.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Line {
    Horizontal,
    Vertical,
}

const DOOR_W: f64 = 0.9;

#[derive(Debug, Clone)]
struct Vertex {
    id: String,
    x: f64,
    y: f64,
}

#[derive(Debug, Clone)]
struct Wall {
    id: String,
    a: String,
    b: String,
    role: &'static str,
}

#[derive(Debug, Clone)]
struct Hole {
    id: String,
    wall_id: String,
    offset: f64,
    width: f64,
    kind: &'static str,
    swing: &'static str,
    from: String,
    to: String,
    height: Option<f64>,
    sill: Option<f64>,
}

#[expect(
    clippy::cast_possible_truncation,
    reason = "plot coordinates times 200 are far inside i64"
)]
fn key(x: f64, y: f64) -> String {
    format!(
        "{}_{}",
        (x * 200.0).round_ties_even() as i64,
        (y * 200.0).round_ties_even() as i64
    )
}

fn facing_edge(facing: Facing, width: f64, height: f64) -> Seg {
    match facing {
        Facing::East => Seg::new('e', width, 0.0, width, height),
        Facing::West => Seg::new('w', 0.0, 0.0, 0.0, height),
        Facing::North => Seg::new('n', 0.0, 0.0, width, 0.0),
        Facing::South => Seg::new('s', 0.0, height, width, height),
    }
}

fn point_on_edge(room: &Room, wall: char, t: f64) -> (f64, f64) {
    let r = room.rect;
    match wall {
        'n' => (r.x + t * r.w, r.y),
        's' => (r.x + t * r.w, r.y + r.h),
        'e' => (r.x + r.w, r.y + t * r.h),
        _ => (r.x, r.y + t * r.h),
    }
}

fn collinear_union(a: (f64, f64, f64, f64), b: (f64, f64, f64, f64)) -> bool {
    let (ax1, ay1, ax2, ay2) = a;
    let (bx1, by1, bx2, by2) = b;
    let a_horiz = (ay1 - ay2).abs() < 1e-6;
    let b_horiz = (by1 - by2).abs() < 1e-6;
    if a_horiz != b_horiz {
        return false;
    }
    let (a0, a1, b0, b1) = if a_horiz {
        if (ay1 - by1).abs() > 1e-6 {
            return false;
        }
        (ax1.min(ax2), ax1.max(ax2), bx1.min(bx2), bx1.max(bx2))
    } else {
        if (ax1 - bx1).abs() > 1e-6 {
            return false;
        }
        (ay1.min(ay2), ay1.max(ay2), by1.min(by2), by1.max(by2))
    };
    a1.min(b1) - a0.max(b0) >= -1e-6
}

fn wid_of(a: &str, b: &str) -> String {
    if a < b {
        format!("w_{a}_{b}")
    } else {
        format!("w_{b}_{a}")
    }
}

/// The graph under construction. Walls live in an arena (`store`); `order` is
/// Python's `walls` list, `wall_at` its id → wall dict.
struct Layer {
    verts: Vec<Vertex>,
    vert_at: HashMap<String, usize>,
    store: Vec<Wall>,
    order: Vec<usize>,
    wall_at: HashMap<String, usize>,
    holes: Vec<Hole>,
}

impl Layer {
    fn vertex(&mut self, x: f64, y: f64) -> usize {
        let vid = format!("v_{}", key(x, y));
        if let Some(&i) = self.vert_at.get(&vid) {
            return i;
        }
        self.verts.push(Vertex {
            id: vid.clone(),
            x,
            y,
        });
        let i = self.verts.len() - 1;
        self.vert_at.insert(vid, i);
        i
    }

    fn v(&self, id: &str) -> &Vertex {
        &self.verts[self.vert_at[id]]
    }

    fn span(&self, w: usize, line: Line) -> (f64, f64) {
        let (ea, eb) = (self.v(&self.store[w].a), self.v(&self.store[w].b));
        if line == Line::Horizontal {
            (ea.x.min(eb.x), ea.x.max(eb.x))
        } else {
            (ea.y.min(eb.y), ea.y.max(eb.y))
        }
    }

    /// `wall(x1, y1, x2, y2, role)`: find, merge into, or create the wall.
    #[expect(
        clippy::too_many_lines,
        reason = "mirrors compile_layer's wall() branch for branch"
    )]
    fn wall(&mut self, (x1, y1, x2, y2): (f64, f64, f64, f64), role: &'static str) -> usize {
        let a = self.vertex(x1, y1);
        let b = self.vertex(x2, y2);
        let (aid, bid) = (self.verts[a].id.clone(), self.verts[b].id.clone());
        if aid == bid {
            // A degenerate wall: returned, never registered.
            self.store.push(Wall {
                id: format!("w_{aid}"),
                a: aid,
                b: bid,
                role,
            });
            return self.store.len() - 1;
        }
        let wid = wid_of(&aid, &bid);
        if let Some(&hit) = self.wall_at.get(&wid) {
            if role == "exterior" {
                self.store[hit].role = "exterior";
            }
            return hit;
        }

        let mut mergeable: Vec<usize> = Vec::new();
        for &existing in &self.order.clone() {
            let (ea, eb) = (
                self.v(&self.store[existing].a).clone(),
                self.v(&self.store[existing].b).clone(),
            );
            if !collinear_union((ea.x, ea.y, eb.x, eb.y), (x1, y1, x2, y2)) {
                continue;
            }
            let eid = self.store[existing].id.clone();
            if self.holes.iter().any(|h| h.wall_id == eid) {
                let horiz = (ea.y - eb.y).abs() < 1e-6;
                let espan = self.span(
                    existing,
                    if horiz {
                        Line::Horizontal
                    } else {
                        Line::Vertical
                    },
                );
                let nspan = if horiz {
                    (x1.min(x2), x1.max(x2))
                } else {
                    (y1.min(y2), y1.max(y2))
                };
                if espan.0 <= nspan.0 + 1e-6 && espan.1 >= nspan.1 - 1e-6 {
                    if role == "exterior" {
                        self.store[existing].role = "exterior";
                    }
                    self.wall_at.insert(wid, existing);
                    return existing;
                }
                continue;
            }
            mergeable.push(existing);
        }

        if let Some(&survivor) = mergeable.first() {
            let (fa, fb) = (
                self.v(&self.store[survivor].a).clone(),
                self.v(&self.store[survivor].b).clone(),
            );
            let horiz = (fa.y - fb.y).abs() < 1e-6;
            let fixed = if horiz { fa.y } else { fa.x };
            let (mut lo, mut hi) = if horiz {
                (x1.min(x2), x1.max(x2))
            } else {
                (y1.min(y2), y1.max(y2))
            };
            let mut exterior = role == "exterior";
            for &existing in &mergeable {
                let espan = self.span(
                    existing,
                    if horiz {
                        Line::Horizontal
                    } else {
                        Line::Vertical
                    },
                );
                lo = lo.min(espan.0);
                hi = hi.max(espan.1);
                exterior = exterior || self.store[existing].role == "exterior";
                let old = wid_of(&self.store[existing].a, &self.store[existing].b);
                self.wall_at.remove(&old);
            }
            for other in &mergeable[1..] {
                if let Some(pos) = self.order.iter().position(|w| w == other) {
                    self.order.remove(pos);
                }
            }
            let (na, nb) = if horiz {
                (self.vertex(lo, fixed), self.vertex(hi, fixed))
            } else {
                (self.vertex(fixed, lo), self.vertex(fixed, hi))
            };
            let (na, nb) = (self.verts[na].id.clone(), self.verts[nb].id.clone());
            let new_wid = wid_of(&na, &nb);
            let s = &mut self.store[survivor];
            s.a = na;
            s.b = nb;
            s.role = if exterior { "exterior" } else { "interior" };
            self.wall_at.insert(new_wid, survivor);
            return survivor;
        }

        self.store.push(Wall {
            id: wid.clone(),
            a: aid,
            b: bid,
            role,
        });
        let w = self.store.len() - 1;
        self.wall_at.insert(wid, w);
        self.order.push(w);
        w
    }

    /// `add_hole(w, at_x, at_y, width, type, from, to, height, sill)`.
    fn add_hole(&mut self, w: usize, at: (f64, f64), width_m: f64, opening: Opening<'_>) -> bool {
        let (va, vb) = (
            self.v(&self.store[w].a).clone(),
            self.v(&self.store[w].b).clone(),
        );
        let length = ((vb.x - va.x).powi(2) + (vb.y - va.y).powi(2)).sqrt();
        if length < 0.4 {
            return false;
        }
        let t = ((at.0 - va.x) * (vb.x - va.x) + (at.1 - va.y) * (vb.y - va.y)) / (length * length);
        let offset = 0.82_f64.min(0.18_f64.max(t));
        if width_m / length > 0.85 {
            return false;
        }
        let wall_id = self.store[w].id.clone();
        if self
            .holes
            .iter()
            .any(|h| h.wall_id == wall_id && (h.offset - offset).abs() < 0.12)
        {
            return false;
        }
        let is_window = opening.kind == "window";
        let swing = if is_window || offset <= 0.5 {
            "left"
        } else {
            "right"
        };
        self.holes.push(Hole {
            id: format!("h_{}", self.holes.len()),
            wall_id,
            offset,
            width: width_m,
            kind: opening.kind,
            swing,
            from: opening.from.to_owned(),
            to: opening.to.to_owned(),
            height: opening
                .height
                .or_else(|| (!is_window).then(|| door_height(width_m))),
            sill: opening.sill,
        });
        true
    }

    fn windows(&self) -> usize {
        self.holes.iter().filter(|h| h.kind == "window").count()
    }
}

/// What kind of opening a hole is, and between which rooms.
#[derive(Clone, Copy)]
struct Opening<'a> {
    kind: &'static str,
    from: &'a str,
    to: &'a str,
    height: Option<f64>,
    sill: Option<f64>,
}

fn seg4(s: &Seg) -> (f64, f64, f64, f64) {
    (s.x1, s.y1, s.x2, s.y2)
}

/// Whether a window placement may ignore the per-wall cap.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Force {
    Yes,
    No,
}

/// `compile_layer(width, height, facing, rooms)`: the floor's building layer JSON.
#[expect(
    clippy::too_many_lines,
    reason = "mirrors compile_layer one pass for one pass"
)]
pub(crate) fn compile_layer(
    rules: Ctx<'_>,
    width: f64,
    height: f64,
    facing: Facing,
    rooms: &[Room],
) -> Value {
    let mut layer = Layer {
        verts: Vec::new(),
        vert_at: HashMap::new(),
        store: Vec::new(),
        order: Vec::new(),
        wall_at: HashMap::new(),
        holes: Vec::new(),
    };
    let closed: Vec<&Room> = rooms.iter().filter(|r| !r.is_open()).collect();
    let open_rooms: Vec<&Room> = rooms.iter().filter(|r| r.is_open()).collect();

    layer.wall((0.0, 0.0, width, 0.0), "exterior");
    layer.wall((width, 0.0, width, height), "exterior");
    layer.wall((0.0, height, width, height), "exterior");
    layer.wall((0.0, 0.0, 0.0, height), "exterior");

    for room in &closed {
        for e in edges(room.rect) {
            let role = if on_perimeter(&e, width, height) {
                "exterior"
            } else {
                "interior"
            };
            layer.wall(seg4(&e), role);
        }
    }
    for room in &open_rooms {
        let closed_segs: Vec<Seg> = closed
            .iter()
            .filter_map(|other| shared_seg(room.rect, other.rect))
            .collect();
        for e in edges(room.rect) {
            if on_perimeter(&e, width, height) {
                layer.wall(seg4(&e), "exterior");
                continue;
            }
            for seg in &closed_segs {
                if seg.wall == e.wall {
                    layer.wall(seg4(seg), "interior");
                }
            }
        }
    }

    let mut pairs_done: Vec<(String, String)> = Vec::new();
    let same_pair =
        |p: &(String, String), a: &str, b: &str| (p.0 == a && p.1 == b) || (p.0 == b && p.1 == a);
    for room in rooms {
        for door in &room.doors {
            if pairs_done
                .iter()
                .any(|p| same_pair(p, &room.id, &door.connects_to))
            {
                continue;
            }
            let pt = point_on_edge(room, door.wall, door.t);
            let Some(edge) = edges(room.rect).into_iter().find(|e| e.wall == door.wall) else {
                continue;
            };
            let role = if on_perimeter(&edge, width, height) {
                "exterior"
            } else {
                "interior"
            };
            let w = layer.wall(seg4(&edge), role);
            let opening = Opening {
                kind: "door",
                from: &room.id,
                to: &door.connects_to,
                height: None,
                sill: None,
            };
            if layer.add_hole(w, pt, door.width, opening) {
                pairs_done.push((room.id.clone(), door.connects_to.clone()));
            }
        }
    }

    for room in &closed {
        if !room.doors.is_empty() {
            continue;
        }
        for space in &open_rooms {
            let Some(seg) = shared_seg(room.rect, space.rect) else {
                continue;
            };
            let w = layer.wall(seg4(&seg), "interior");
            let opening = Opening {
                kind: "door",
                from: &room.id,
                to: &space.id,
                height: None,
                sill: None,
            };
            layer.add_hole(
                w,
                (f64::midpoint(seg.x1, seg.x2), f64::midpoint(seg.y1, seg.y2)),
                DOOR_W,
                opening,
            );
            break;
        }
    }

    let face = facing_edge(facing, width, height);
    let mut entry: Option<&Room> = rooms
        .iter()
        .find(|r| matches!(r.kind.as_str(), "foyer" | "landing"));
    if entry.is_none() {
        let on_face = open_rooms.iter().flat_map(|r| {
            edges(r.rect)
                .into_iter()
                .map(|e| segs_overlap(&e, &face))
                .filter(|got| *got > 0.4)
                .map(move |got| (got, *r))
        });
        entry = max_by_first(on_face, |(got, _)| *got).map(|(_, r)| r);
    }
    let door = main_door_point(rules, facing, width, height, entry.map(|r| r.rect));
    if let Some(entry) = entry {
        let (lo, hi) = face_span(facing, entry.rect);
        for e in edges(entry.rect) {
            if segs_overlap(&e, &face) < 0.4 {
                continue;
            }
            let w = layer.wall(seg4(&e), "exterior");
            let opening = Opening {
                kind: "entrance",
                from: &entry.id,
                to: "outside",
                height: None,
                sill: None,
            };
            layer.add_hole(w, (door.x, door.y), entrance_width(hi - lo), opening);
        }
    }

    let mut candidates: Vec<(char, Seg, &Room)> = Vec::new();
    for room in &closed {
        if matches!(room.kind.as_str(), "staircase" | "toilet") {
            continue;
        }
        for e in edges(room.rect) {
            if !on_perimeter(&e, width, height) {
                continue;
            }
            if entry.is_some() && segs_overlap(&e, &face) > 0.5 {
                continue;
            }
            if e.length() < 1.2 {
                continue;
            }
            candidates.push((e.wall, e, room));
        }
    }

    let place_window = |layer: &mut Layer, c: &(char, Seg, &Room), t: f64, force: Force| {
        let (wall_id, edge, room) = c;
        let solar = is_solar_wall(*wall_id);
        if !solar && force == Force::No && candidates.iter().filter(|x| x.0 == *wall_id).count() > 2
        {
            return false;
        }
        let along = edge.length();
        let width_m =
            (if solar { WIN_NE_W } else { WIN_SW_W }).min(along * if solar { 0.42 } else { 0.28 });
        if width_m < 0.55 {
            return false;
        }
        let at = (
            edge.x1 + (edge.x2 - edge.x1) * t,
            edge.y1 + (edge.y2 - edge.y1) * t,
        );
        let w = layer.wall(seg4(edge), "exterior");
        let opening = Opening {
            kind: "window",
            from: &room.id,
            to: "outside",
            height: Some(if solar { WIN_NE_H } else { WIN_SW_H }),
            sill: Some(if solar { WIN_NE_SILL } else { WIN_SW_SILL }),
        };
        layer.add_hole(w, at, width_m, opening)
    };

    for c in candidates.iter().filter(|x| is_solar_wall(x.0)) {
        place_window(&mut layer, c, 0.5, Force::No);
        if c.1.length() > 3.6 {
            place_window(&mut layer, c, 0.28, Force::No);
        }
    }
    let thermal: Vec<&(char, Seg, &Room)> =
        candidates.iter().filter(|x| !is_solar_wall(x.0)).collect();
    for c in thermal.iter().take(thermal.len().div_ceil(2)) {
        place_window(&mut layer, c, 0.55, Force::No);
    }

    let snapshot: Vec<Hole> = layer
        .holes
        .iter()
        .filter(|h| h.kind == "window")
        .cloned()
        .collect();
    for hole in snapshot {
        let Some(&src) = layer
            .order
            .iter()
            .find(|&&w| layer.store[w].id == hole.wall_id)
        else {
            continue;
        };
        let (a, b) = (
            layer.v(&layer.store[src].a).clone(),
            layer.v(&layer.store[src].b).clone(),
        );
        let mid_x = a.x + (b.x - a.x) * hole.offset;
        let mid_y = a.y + (b.y - a.y) * hole.offset;
        let vertical = (a.x - b.x).abs() < 0.06;
        let matches = |c: &&(char, Seg, &Room)| {
            let (wall_id, edge, _) = c;
            if vertical {
                matches!(wall_id, 'e' | 'w')
                    && (edge.y1 + (edge.y2 - edge.y1) * 0.5 - mid_y).abs() < 1.2
                    && *wall_id != if a.x < width / 2.0 { 'w' } else { 'e' }
            } else {
                matches!(wall_id, 'n' | 's')
                    && (edge.x1 + (edge.x2 - edge.x1) * 0.5 - mid_x).abs() < 1.2
                    && *wall_id != if a.y < height / 2.0 { 'n' } else { 's' }
            }
        };
        if let Some(pair) = candidates.iter().find(|c| matches(c)) {
            place_window(&mut layer, pair, 0.5, Force::Yes);
        }
    }

    let mut win_count = layer.windows();
    let want_win = next_legal_count(win_count);
    for c in &candidates {
        if win_count >= want_win {
            break;
        }
        if place_window(&mut layer, c, 0.72, Force::Yes) {
            win_count += 1;
        }
    }

    json!({
        "vertices": layer.verts.iter().map(|v| json!({"id": v.id, "x": v.x, "y": v.y})).collect::<Vec<_>>(),
        "walls": layer.order.iter().map(|&w| {
            let w = &layer.store[w];
            json!({"id": w.id, "a": w.a, "b": w.b, "thickness": WALL_T, "role": w.role})
        }).collect::<Vec<_>>(),
        "holes": layer.holes.iter().map(|h| json!({
            "id": h.id, "wall_id": h.wall_id, "offset": h.offset, "width": h.width,
            "type": h.kind, "swing": h.swing, "from_": h.from, "to": h.to,
            "height": h.height, "sill": h.sill,
        })).collect::<Vec<_>>(),
    })
}
