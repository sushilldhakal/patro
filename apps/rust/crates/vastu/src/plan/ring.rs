//! Maṇḍala ring placement: rooms round the edge, the Brahmasthāna in the middle
//! (`engine/vastu/ring.py`).

use super::{
    Ctx, Facing, Space, UNIT,
    entrance::{FOYER_D, FOYER_W, entrance_padas, face_span},
    priority, snap,
};
use crate::geometry::{Rect, overlap_area};

/// The eight peripheral cells, in compass order (`RING_ZONES`).
pub(crate) const RING_ZONES: [&str; 8] = [
    "northwest",
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
];

const EPS: f64 = 0.02;

/// One floor's ring geometry (`RingPlan`). `cells` keeps Python's dict order.
#[derive(Debug, Clone)]
pub(crate) struct RingPlan {
    pub(crate) cells: Vec<(&'static str, Rect)>,
    pub(crate) corridors: [Rect; 4],
    pub(crate) brahmasthana: Rect,
}

impl RingPlan {
    pub(crate) fn cell(&self, zone: &str) -> Rect {
        self.cells
            .iter()
            .find(|(z, _)| *z == zone)
            .map(|(_, r)| *r)
            .expect("ring zones are the eight cells")
    }
}

/// A placement: the rect and its compass zone.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Placement {
    pub(crate) rect: Rect,
    pub(crate) zone: &'static str,
}

/// A Python dict keyed by space id: re-assigning a key keeps its position.
#[derive(Debug, Clone)]
pub(crate) struct IdMap<V> {
    pub(crate) items: Vec<(String, V)>,
}

impl<V> Default for IdMap<V> {
    fn default() -> Self {
        Self { items: Vec::new() }
    }
}

impl<V: Clone> IdMap<V> {
    pub(crate) fn get(&self, id: &str) -> Option<&V> {
        self.items.iter().find(|(k, _)| k == id).map(|(_, v)| v)
    }

    pub(crate) fn contains(&self, id: &str) -> bool {
        self.items.iter().any(|(k, _)| k == id)
    }

    pub(crate) fn insert(&mut self, id: &str, v: V) {
        if let Some(slot) = self.items.iter_mut().find(|(k, _)| k == id) {
            slot.1 = v;
        } else {
            self.items.push((id.to_owned(), v));
        }
    }

    /// `del d[id]`: `false` when the key is already gone (Python's `KeyError`).
    fn remove(&mut self, id: &str) -> bool {
        let before = self.items.len();
        self.items.retain(|(k, _)| k != id);
        self.items.len() != before
    }
}

/// Python raised `KeyError` here (two spaces share an id, so the band search
/// deletes the same key twice); the server answers 500.
#[derive(Debug, Clone)]
pub(crate) struct KeyError(pub(crate) String);

/// `SolveResult`: what was placed, and what could not be.
#[derive(Debug, Clone)]
pub(crate) struct SolveResult {
    pub(crate) placed: IdMap<Placement>,
    pub(crate) dropped: Vec<Space>,
}

fn cut(v: f64) -> f64 {
    (v / UNIT).round_ties_even() * UNIT
}

/// `ring_plan(width, height, corridor_w)`: 8 cells, the central ninth, the "#".
pub(crate) fn ring_plan(width: f64, height: f64, corridor_w: f64) -> RingPlan {
    let (x0, x1) = (width / 3.0, 2.0 * width / 3.0);
    let (y0, y1) = (height / 3.0, 2.0 * height / 3.0);
    let d = 0.6_f64.max(corridor_w.min(x0 * 0.5).min(y0 * 0.5));
    let xs = [0.0, cut(x0 - d), cut(x0), cut(x1), cut(x1 + d), width];
    let ys = [0.0, cut(y0 - d), cut(y0), cut(y1), cut(y1 + d), height];
    let bx = |i: usize, j: usize, k: usize, m: usize| {
        Rect::new(xs[i], ys[j], xs[k] - xs[i], ys[m] - ys[j])
    };
    let cells = vec![
        ("northwest", bx(0, 0, 1, 1)),
        ("north", bx(2, 0, 3, 1)),
        ("northeast", bx(4, 0, 5, 1)),
        ("west", bx(0, 2, 1, 3)),
        ("east", bx(4, 2, 5, 3)),
        ("southwest", bx(0, 4, 1, 5)),
        ("south", bx(2, 4, 3, 5)),
        ("southeast", bx(4, 4, 5, 5)),
    ];
    let corridors = [
        bx(1, 0, 2, 5),
        bx(3, 0, 4, 5),
        Rect::new(0.0, ys[1], width, ys[2] - ys[1]),
        Rect::new(0.0, ys[3], width, ys[4] - ys[3]),
    ];
    RingPlan {
        cells,
        corridors,
        brahmasthana: bx(2, 2, 3, 3),
    }
}

fn fits(rules: Ctx<'_>, r: Rect, kind: &str) -> bool {
    let ideal = rules.ideal(kind);
    r.w.min(r.h) + EPS >= ideal.min_side && r.w * r.h + EPS >= ideal.min_area
}

fn want_area(rules: Ctx<'_>, kind: &str) -> f64 {
    let min_area = rules.ideal(kind).min_area;
    rules
        .tiers(kind)
        .map_or(min_area, |t| (t.preferred.0 * t.preferred.1).max(min_area))
}

fn snap_in(r: Rect) -> Rect {
    use panchanga::pyfloat::py_round;
    let x = py_round(r.x / UNIT, 6).ceil() * UNIT;
    let y = py_round(r.y / UNIT, 6).ceil() * UNIT;
    let x2 = py_round((r.x + r.w) / UNIT, 6).floor() * UNIT;
    let y2 = py_round((r.y + r.h) / UNIT, 6).floor() * UNIT;
    Rect::new(x, y, 0.0_f64.max(x2 - x), 0.0_f64.max(y2 - y))
}

/// Which way a shared cell is cut.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Axis {
    /// Strips side by side along the cell's width.
    AlongWidth,
    /// Strips stacked along its height.
    AlongHeight,
}

impl Axis {
    const fn other(self) -> Self {
        match self {
            Self::AlongWidth => Self::AlongHeight,
            Self::AlongHeight => Self::AlongWidth,
        }
    }
}

fn split_along(rules: Ctx<'_>, cell: Rect, kinds: &[&str], axis: Axis) -> Option<Vec<Rect>> {
    let along_w = axis == Axis::AlongWidth;
    let span = if along_w { cell.w } else { cell.h };
    let cross = if along_w { cell.h } else { cell.w };
    let start = if along_w { cell.x } else { cell.y };

    let mut floors = Vec::with_capacity(kinds.len());
    for kind in kinds {
        let ideal = rules.ideal(kind);
        if cross + EPS < ideal.min_side {
            return None;
        }
        floors.push(ideal.min_side.max(ideal.min_area / cross) + UNIT);
    }
    let surplus = span - floors.iter().sum::<f64>();
    if surplus < -EPS {
        return None;
    }
    let weights: Vec<f64> = kinds.iter().map(|k| want_area(rules, k)).collect();
    let total: f64 = weights.iter().sum();

    let mut cuts = vec![start];
    let mut acc = 0.0;
    let n = kinds.len();
    for (floor, w) in floors.iter().zip(&weights).take(n - 1) {
        acc += floor + surplus * (w / total);
        cuts.push(((start + acc) / UNIT).round_ties_even() * UNIT);
    }
    cuts.push(start + span);

    let mut out = Vec::with_capacity(n);
    for (i, kind) in kinds.iter().enumerate() {
        let (lo, hi) = (cuts[i], cuts[i + 1]);
        let piece = if along_w {
            Rect::new(lo, cell.y, hi - lo, cell.h)
        } else {
            Rect::new(cell.x, lo, cell.w, hi - lo)
        };
        if !fits(rules, piece, kind) {
            return None;
        }
        out.push(piece);
    }
    Some(out)
}

/// `_PERIMETER_AXIS`: an edge cell must be cut across the outer wall it owns.
fn perimeter_axis(zone: &str) -> Option<Axis> {
    match zone {
        "north" | "south" => Some(Axis::AlongWidth),
        "east" | "west" => Some(Axis::AlongHeight),
        _ => None,
    }
}

fn split_cell(rules: Ctx<'_>, cell: Rect, kinds: &[&str], zone: &str) -> Option<Vec<Rect>> {
    match kinds {
        [] => return Some(Vec::new()),
        [one] => return fits(rules, cell, one).then(|| vec![cell]),
        _ => {}
    }
    if let Some(forced) = perimeter_axis(zone) {
        return split_along(rules, cell, kinds, forced);
    }
    let first = if cell.w >= cell.h {
        Axis::AlongWidth
    } else {
        Axis::AlongHeight
    };
    split_along(rules, cell, kinds, first)
        .or_else(|| split_along(rules, cell, kinds, first.other()))
}

/// The open floor the main door opens into (`EntranceHall`).
#[derive(Debug, Clone)]
pub(crate) struct EntranceHall {
    pub(crate) lobby: Rect,
    pub(crate) blocked: Vec<(&'static str, Rect)>,
}

fn face_runs(plan: &RingPlan, facing: Facing) -> [Rect; 2] {
    let [west, east, north, south] = plan.corridors;
    match facing {
        Facing::North | Facing::South => [west, east],
        Facing::East | Facing::West => [north, south],
    }
}

fn clip(cell: Rect, c: Rect) -> Option<Rect> {
    let (x0, y0) = (cell.x.max(c.x), cell.y.max(c.y));
    let x1 = (cell.x + cell.w).min(c.x + c.w);
    let y1 = (cell.y + cell.h).min(c.y + c.h);
    if x1 - x0 <= EPS || y1 - y0 <= EPS {
        return None;
    }
    Some(Rect::new(x0, y0, x1 - x0, y1 - y0))
}

/// `entrance_halls(plan, facing, width, height)`: both ways to widen the mouth,
/// best-pada side first.
pub(crate) fn entrance_halls(
    rules: Ctx<'_>,
    plan: &RingPlan,
    facing: Facing,
    width: f64,
    height: f64,
) -> Vec<EntranceHall> {
    let along_max = match facing {
        Facing::North | Facing::South => width,
        Facing::East | Facing::West => height,
    };
    let padas = entrance_padas(rules, facing, width, height);
    let want_along = padas.first().map_or(along_max / 2.0, |p| p.0);

    let runs = face_runs(plan, facing);
    let run_dist = |r: &Rect| {
        let (a, b) = face_span(facing, *r);
        (f64::midpoint(a, b) - want_along).abs()
    };
    let run = if run_dist(&runs[1]) < run_dist(&runs[0]) {
        runs[1]
    } else {
        runs[0]
    };
    let (lo, hi) = face_span(facing, run);
    let grow = 0.0_f64.max(FOYER_W.min(along_max) - (hi - lo));

    let band = match facing {
        Facing::North => plan.cell("north").h,
        Facing::South => plan.cell("south").h,
        Facing::West => plan.cell("west").w,
        Facing::East => plan.cell("east").w,
    };
    let d = UNIT.max(FOYER_D.min(band));

    let mut out: Vec<EntranceHall> = Vec::new();
    let mid = f64::midpoint(lo, hi);
    for low in [want_along < mid, want_along >= mid] {
        let mut lo2 = if low { 0.0_f64.max(lo - grow) } else { lo };
        let mut hi2 = if low { hi } else { along_max.min(hi + grow) };
        let short = grow - ((lo - lo2) + (hi2 - hi));
        if short > 1e-9 {
            lo2 = 0.0_f64.max(lo2 - short);
            hi2 = along_max.min(hi2 + short);
        }
        let hall = hall_at(plan, facing, width, height, (lo2, hi2), d);
        if !out.iter().any(|h| h.lobby == hall.lobby) {
            out.push(hall);
        }
    }
    out
}

fn hall_at(
    plan: &RingPlan,
    facing: Facing,
    width: f64,
    height: f64,
    (lo, hi): (f64, f64),
    depth: f64,
) -> EntranceHall {
    let span = hi - lo;
    let lobby = snap(match facing {
        Facing::North => Rect::new(lo, 0.0, span, depth),
        Facing::South => Rect::new(lo, height - depth, span, depth),
        Facing::West => Rect::new(0.0, lo, depth, span),
        Facing::East => Rect::new(width - depth, lo, depth, span),
    });
    let blocked = plan
        .cells
        .iter()
        .filter_map(|(zone, cell)| clip(*cell, lobby).map(|bite| (*zone, bite)))
        .collect();
    EntranceHall { lobby, blocked }
}

fn zone_rank(rules: Ctx<'_>, kind: &str, zone: &str, mode: &str) -> f64 {
    rules.zone_costs(kind).cost(zone, mode).0
}

/// `_SPANS`: a corner cell plus the middle cell beside it.
const SPANS: [(&str, [&str; 2]); 8] = [
    ("north", ["northwest", "north"]),
    ("north", ["north", "northeast"]),
    ("south", ["southwest", "south"]),
    ("south", ["south", "southeast"]),
    ("west", ["northwest", "west"]),
    ("west", ["west", "southwest"]),
    ("east", ["northeast", "east"]),
    ("east", ["east", "southeast"]),
];

fn union(plan: &RingPlan, zones: [&str; 2]) -> Rect {
    let rs = zones.map(|z| plan.cell(z));
    let x0 = rs[0].x.min(rs[1].x);
    let y0 = rs[0].y.min(rs[1].y);
    let x1 = (rs[0].x + rs[0].w).max(rs[1].x + rs[1].w);
    let y1 = (rs[0].y + rs[0].h).max(rs[1].y + rs[1].h);
    Rect::new(x0, y0, x1 - x0, y1 - y0)
}

/// Floor reserved in a cell before rooms share it (stair, entrance lobby).
pub(crate) type Reserved = Vec<(&'static str, Vec<Rect>)>;

fn reserved_in<'a>(taken: &'a Reserved, zone: &str) -> &'a [Rect] {
    taken
        .iter()
        .find(|(z, _)| *z == zone)
        .map_or(&[], |(_, v)| v.as_slice())
}

/// A side band: (zone, rect, the two cells it is made of).
type Band = (&'static str, Rect, [&'static str; 2]);

struct Board<'a> {
    rules: Ctx<'a>,
    plan: &'a RingPlan,
    taken: &'a Reserved,
    mode: &'a str,
    keep_clear: Option<Rect>,
}

impl Board<'_> {
    fn free_of(free: &[(&'static str, f64)], zone: &str) -> f64 {
        free.iter()
            .find(|(z, _)| *z == zone)
            .map_or(0.0, |(_, f)| *f)
    }

    fn span_options(&self, space: &Space, free: &[(&'static str, f64)]) -> Vec<Band> {
        let mut options: Vec<(u8, f64, Band)> = Vec::new();
        for deep in [false, true] {
            for (zone, zones) in SPANS {
                if zones.iter().any(|z| self.taken.iter().any(|(t, _)| t == z)) {
                    continue;
                }
                if zones
                    .iter()
                    .any(|z| Self::free_of(free, z) + EPS < self.plan.cell(z).area())
                {
                    continue;
                }
                let mut rect = union(self.plan, zones);
                if deep {
                    rect = deepened(rect, zone, self.plan.brahmasthana);
                }
                if self.keep_clear.is_some_and(|k| overlap_area(rect, k) > EPS) {
                    continue;
                }
                if !fits(self.rules, rect, &space.kind) {
                    continue;
                }
                options.push((
                    u8::from(deep),
                    zone_rank(self.rules, &space.kind, zone, self.mode),
                    (zone, rect, zones),
                ));
            }
        }
        options.sort_by(|a, b| {
            (a.0, a.1)
                .partial_cmp(&(b.0, b.1))
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        options.into_iter().map(|(_, _, band)| band).collect()
    }

    fn assign_bands(
        &self,
        ordered: &[Space],
        usable: &[(&'static str, Option<Rect>)],
        free: &[(&'static str, f64)],
    ) -> Result<IdMap<Band>, KeyError> {
        let fits_a_cell = |kind: &str| {
            let ideal = self.rules.ideal(kind);
            usable.iter().any(|(z, cell)| {
                cell.is_some_and(|c| {
                    c.w.min(c.h) + EPS >= ideal.min_side
                        && Self::free_of(free, z) + EPS >= ideal.min_area
                })
            })
        };
        let mut big: Vec<(&Space, usize, Vec<Band>)> = Vec::new();
        let mut small_ahead = 0;
        for space in ordered {
            if fits_a_cell(&space.kind) {
                small_ahead += 1;
                continue;
            }
            let options = self.span_options(space, free);
            if !options.is_empty() {
                big.push((space, small_ahead, options));
            }
        }
        if big.is_empty() {
            return Ok(IdMap::default());
        }
        let untouched = usable
            .iter()
            .filter(|(z, cell)| cell.is_some_and(|c| Self::free_of(free, z) + EPS >= c.area()))
            .count();

        let mut search = Search {
            big: &big,
            untouched,
            best_flags: None,
            best_choice: IdMap::default(),
        };
        search.run(0, &[], &[], &mut IdMap::default())?;
        Ok(search.best_choice)
    }
}

struct Search<'a, 'b> {
    big: &'a [(&'b Space, usize, Vec<Band>)],
    untouched: usize,
    best_flags: Option<Vec<u8>>,
    best_choice: IdMap<Band>,
}

impl Search<'_, '_> {
    fn run(
        &mut self,
        i: usize,
        used: &[&'static str],
        flags: &[u8],
        choice: &mut IdMap<Band>,
    ) -> Result<(), KeyError> {
        if let Some(best) = &self.best_flags
            && flags < &best[..flags.len().min(best.len())]
        {
            return Ok(());
        }
        if i == self.big.len() {
            if self
                .best_flags
                .as_ref()
                .is_none_or(|b| flags > b.as_slice())
            {
                self.best_flags = Some(flags.to_vec());
                self.best_choice = choice.clone();
            }
            return Ok(());
        }
        let (space, ahead, options) = &self.big[i];
        for option in options {
            let zones = option.2;
            if zones.iter().any(|z| used.contains(z)) {
                continue;
            }
            // `untouched - len(used) - len(zones) < ahead`, in Python's signed ints.
            if self.untouched < used.len() + zones.len() + ahead {
                continue;
            }
            choice.insert(&space.id, *option);
            let mut used2 = used.to_vec();
            for z in zones {
                if !used2.contains(&z) {
                    used2.push(z);
                }
            }
            let mut flags2 = flags.to_vec();
            flags2.push(1);
            self.run(i + 1, &used2, &flags2, choice)?;
            if !choice.remove(&space.id) {
                return Err(KeyError(space.id.clone()));
            }
        }
        let mut flags2 = flags.to_vec();
        flags2.push(0);
        self.run(i + 1, used, &flags2, choice)
    }
}

fn deepened(band: Rect, side: &str, centre: Rect) -> Rect {
    match side {
        "north" => Rect::new(band.x, band.y, band.w, centre.y - band.y),
        "south" => {
            let bottom = centre.y + centre.h;
            Rect::new(band.x, bottom, band.w, band.y + band.h - bottom)
        }
        "west" => Rect::new(band.x, band.y, centre.x - band.x, band.h),
        _ => {
            let right = centre.x + centre.w;
            Rect::new(right, band.y, band.x + band.w - right, band.h)
        }
    }
}

fn remainder(cell: Rect, c: Rect) -> Option<Rect> {
    let pieces = [
        Rect::new(cell.x, cell.y, c.x - cell.x, cell.h),
        Rect::new(c.x + c.w, cell.y, cell.x + cell.w - (c.x + c.w), cell.h),
        Rect::new(cell.x, cell.y, cell.w, c.y - cell.y),
        Rect::new(cell.x, c.y + c.h, cell.w, cell.y + cell.h - (c.y + c.h)),
    ];
    let mut best: Option<Rect> = None;
    for piece in pieces {
        if piece.w <= EPS || piece.h <= EPS {
            continue;
        }
        if best.is_none_or(|b| piece.area() > b.area()) {
            best = Some(piece);
        }
    }
    best.map(snap_in)
}

/// `ring_layout(spaces, width, height, mode, corridor_w, reserved, keep_clear)`.
#[expect(
    clippy::too_many_lines,
    reason = "mirrors ring.ring_layout one step for one step"
)]
pub(crate) fn ring_layout(
    rules: Ctx<'_>,
    spaces: &[Space],
    (width, height): (f64, f64),
    mode: &str,
    corridor_w: f64,
    taken: &Reserved,
    keep_clear: Option<Rect>,
) -> Result<(SolveResult, RingPlan), KeyError> {
    let plan = ring_plan(width, height, corridor_w);

    let mut usable: Vec<(&'static str, Option<Rect>)> = Vec::new();
    let mut free: Vec<(&'static str, f64)> = Vec::new();
    for (zone, cell) in &plan.cells {
        let mut room_for = Some(*cell);
        for c in reserved_in(taken, zone) {
            let Some(r) = room_for else { break };
            room_for = remainder(r, *c);
        }
        usable.push((zone, room_for));
        free.push((zone, room_for.map_or(0.0, |r| r.area())));
    }
    let free_mut = |free: &mut Vec<(&'static str, f64)>, zone: &str| -> usize {
        free.iter().position(|(z, _)| *z == zone).unwrap_or(0)
    };

    let mut buckets: Vec<(&'static str, Vec<Space>)> =
        RING_ZONES.iter().map(|z| (*z, Vec::new())).collect();
    let mut spans: IdMap<Placement> = IdMap::default();
    let mut dropped: Vec<Space> = Vec::new();
    let mut ordered = spaces.to_vec();
    ordered.sort_by_key(|s| priority(&s.kind));

    let board = Board {
        rules,
        plan: &plan,
        taken,
        mode,
        keep_clear,
    };
    for (space_id, (zone, rect, used_zones)) in board.assign_bands(&ordered, &usable, &free)?.items
    {
        spans.insert(&space_id, Placement { rect, zone });
        for z in used_zones {
            let i = free_mut(&mut free, z);
            free[i].1 = 0.0;
        }
    }

    for space in &ordered {
        if spans.contains(&space.id) {
            continue;
        }
        let ideal = rules.ideal(&space.kind);
        let need = ideal.min_area;
        let mut best: Option<&'static str> = None;
        let mut best_key: Option<(f64, u8, f64)> = None;
        for zone in RING_ZONES {
            let cell = usable
                .iter()
                .find(|(z, _)| *z == zone)
                .and_then(|(_, c)| *c);
            let Some(cell) = cell else { continue };
            if cell.w.min(cell.h) + EPS < ideal.min_side {
                continue;
            }
            let f = Board::free_of(&free, zone);
            if f + EPS < need {
                continue;
            }
            let shared = buckets
                .iter()
                .find(|(z, _)| *z == zone)
                .is_some_and(|(_, m)| !m.is_empty());
            let key = (
                zone_rank(rules, &space.kind, zone, mode),
                u8::from(shared),
                -f,
            );
            if best_key.is_none_or(|b| key < b) {
                best = Some(zone);
                best_key = Some(key);
            }
        }
        let Some(best) = best else {
            let options = board.span_options(space, &free);
            if let Some((zone, rect, used_zones)) = options.first().copied() {
                spans.insert(&space.id, Placement { rect, zone });
                for z in used_zones {
                    let i = free_mut(&mut free, z);
                    free[i].1 = 0.0;
                }
                continue;
            }
            dropped.push(space.clone());
            continue;
        };
        if let Some((_, members)) = buckets.iter_mut().find(|(z, _)| *z == best) {
            members.push(space.clone());
        }
        let i = free_mut(&mut free, best);
        free[i].1 -= need;
    }

    let mut placed = spans;
    for (zone, members) in buckets {
        let cell = usable
            .iter()
            .find(|(z, _)| *z == zone)
            .and_then(|(_, c)| *c);
        let mut members = members;
        members.sort_by_key(|s| priority(&s.kind));
        while !members.is_empty() {
            let kinds: Vec<&str> = members.iter().map(|s| s.kind.as_str()).collect();
            let rects = cell.and_then(|c| split_cell(rules, c, &kinds, zone));
            if let Some(rects) = rects {
                for (space, rect) in members.iter().zip(rects) {
                    placed.insert(&space.id, Placement { rect, zone });
                }
                break;
            }
            if let Some(last) = members.pop() {
                dropped.push(last);
            }
        }
    }
    Ok((SolveResult { placed, dropped }, plan))
}
