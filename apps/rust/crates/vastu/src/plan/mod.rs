//! The house-plan engine behind `POST /vastu/house-plan`.
//!
//! Module boundaries follow the Python files: `architecture.py` and the shared
//! types live here, then `entrance.py`, `ring.py`, `layout.py`, `building.py` and
//! `validate.py` in their own modules.

pub(crate) mod building;
pub(crate) mod entrance;
pub(crate) mod layout;
pub(crate) mod ring;
pub(crate) mod validate;

use std::collections::HashMap;

use crate::{
    data::Rules,
    geometry::{Rect, split_by},
    zones::{DIR8_ORDER, dir8_index},
};

/// Metres per fine-grid cell (`solver.UNIT`).
pub(crate) const UNIT: f64 = 0.1;

/// Which wall the entrance faces.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Facing {
    /// North wall.
    North,
    /// East wall.
    East,
    /// South wall.
    South,
    /// West wall.
    West,
}

impl Facing {
    /// The API spelling.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::North => "north",
            Self::East => "east",
            Self::South => "south",
            Self::West => "west",
        }
    }

    /// From the API spelling.
    #[must_use]
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "north" => Some(Self::North),
            "east" => Some(Self::East),
            "south" => Some(Self::South),
            "west" => Some(Self::West),
            _ => None,
        }
    }

    pub(crate) const fn wall_letter(self) -> char {
        match self {
            Self::North => 'N',
            Self::East => 'E',
            Self::South => 'S',
            Self::West => 'W',
        }
    }
}

/// Whether the house has a courtyard: then open floor stays open floor instead of
/// being folded into rooms (`want_court`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum OpenFloor {
    Courtyard,
    Indoor,
}

/// One space the requirement asks for (`PlannedSpace`).
#[derive(Debug, Clone)]
pub(crate) struct Space {
    pub(crate) id: String,
    pub(crate) kind: String,
    pub(crate) index: Option<i64>,
}

/// A door hung on a room (`PlannedDoor`).
#[derive(Debug, Clone)]
pub(crate) struct Door {
    pub(crate) id: String,
    pub(crate) room_id: String,
    pub(crate) wall: char,
    pub(crate) t: f64,
    pub(crate) width: f64,
    pub(crate) swing: &'static str,
    pub(crate) connects_to: String,
}

/// A placed room or piece of open floor (`PlannedRoom`).
#[derive(Debug, Clone)]
pub(crate) struct Room {
    pub(crate) id: String,
    pub(crate) kind: String,
    pub(crate) floor: i64,
    pub(crate) rect: Rect,
    pub(crate) life: &'static str,
    pub(crate) vastu_region: String,
    pub(crate) index: Option<i64>,
    pub(crate) doors: Vec<Door>,
    pub(crate) adjacent_to: Vec<String>,
}

impl Room {
    /// `life in ("circulation", "outdoor")`.
    pub(crate) fn is_open(&self) -> bool {
        matches!(self.life, "circulation" | "outdoor")
    }
}

/// The stair shaft, the same footprint on every storey (`StairShaft`).
#[derive(Debug, Clone)]
pub(crate) struct Stair {
    pub(crate) rect: Rect,
    pub(crate) host_id: &'static str,
}

/// `PlanConflict`.
#[derive(Debug, Clone)]
pub(crate) struct Conflict {
    pub(crate) id: String,
    pub(crate) severity: &'static str,
    pub(crate) message_key: &'static str,
}

impl Conflict {
    pub(crate) fn new(id: String, severity: &'static str, message_key: &'static str) -> Self {
        Self {
            id,
            severity,
            message_key,
        }
    }
}

/// The house requirement (`HouseRequirement`), counts already validated.
#[derive(Debug, Clone)]
pub struct Requirement {
    /// Bedroom count.
    pub bedrooms: i64,
    /// Which bedroom (1-based) is the master.
    pub master_bedroom_index: i64,
    /// Toilet count.
    pub toilets: i64,
    /// Bathroom count.
    pub bathrooms: i64,
    /// Combined toilet + bath count.
    pub combined_toilet_bath: i64,
    /// Other rooms, by kind.
    pub extras: Vec<String>,
    /// `strict`, `balanced` or `flexible`.
    pub mode: String,
    /// Storeys asked for.
    pub storeys: i64,
    /// Per-kind floor choice.
    pub floors: HashMap<String, String>,
}

impl Requirement {
    /// `room_subjects()`: every room subject asked for, in order.
    #[must_use]
    pub fn room_subjects(&self) -> Vec<String> {
        let mut out = Vec::new();
        for i in 1..=self.bedrooms {
            out.push(if i == self.master_bedroom_index {
                "master_bedroom".to_owned()
            } else {
                "bedroom".to_owned()
            });
        }
        for (n, kind) in [
            (self.toilets, "toilet"),
            (self.bathrooms, "bathroom"),
            (self.combined_toilet_bath, "combined"),
        ] {
            for _ in 0..n {
                out.push(kind.to_owned());
            }
        }
        out.extend(self.extras.iter().filter(|e| !counted_kind(e)).cloned());
        out
    }
}

fn counted_kind(kind: &str) -> bool {
    matches!(
        kind,
        "bedroom" | "master_bedroom" | "toilet" | "bathroom" | "combined"
    )
}

pub(crate) fn is_wet(kind: &str) -> bool {
    matches!(kind, "toilet" | "bathroom" | "combined")
}

/// `PLACE_ORDER`: rooms placed first claim the best zone.
const PLACE_ORDER: [&str; 19] = [
    "puja",
    "kitchen",
    "kitchen_dining",
    "master_bedroom",
    "living",
    "dining",
    "bedroom",
    "guest",
    "family",
    "study",
    "office",
    "store",
    "laundry",
    "garage",
    "garden",
    "balcony",
    "library",
    "gym",
    "servant",
];

pub(crate) fn priority(kind: &str) -> usize {
    PLACE_ORDER
        .iter()
        .position(|k| *k == kind)
        .unwrap_or(PLACE_ORDER.len())
}

/// `life_zone_of(kind)`.
pub(crate) fn life_zone_of(kind: &str) -> &'static str {
    match kind {
        "hall" | "foyer" | "landing" | "brahmasthan" | "verandah" | "living" => "circulation",
        "staircase" => "vertical",
        "garden" | "courtyard" | "balcony" | "garage" => "outdoor",
        "kitchen" | "kitchen_dining" | "store" | "laundry" | "toilet" | "bathroom" | "combined" => {
            "service"
        }
        "master_bedroom" | "bedroom" | "guest" => "private",
        "dining" | "family" | "study" | "puja" | "office" | "library" => "semi",
        _ => "public",
    }
}

pub(crate) fn clamp_storeys(n: i64) -> i64 {
    match n {
        n if n >= 3 => 3,
        2 => 2,
        _ => 1,
    }
}

fn clamp_count(n: i64, lo: i64, hi: i64) -> i64 {
    hi.min(lo.max(n))
}

/// `expand_planned_spaces(req)`: counts to individual spaces.
pub(crate) fn expand_planned_spaces(req: &Requirement) -> Vec<Space> {
    let mut out = Vec::new();
    let beds = clamp_count(req.bedrooms, 1, 5);
    let master = req.master_bedroom_index.max(1).min(beds);
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
    // A combined room absorbs one slot from both the toilet and the bathroom count.
    let combined_n = clamp_count(req.combined_toilet_bath, 0, 5);
    let toilets_n = 0.max(clamp_count(req.toilets, 1, 5) - combined_n);
    let bathrooms_n = 0.max(clamp_count(req.bathrooms, 0, 5) - combined_n);
    for (n, kind) in [
        (toilets_n, "toilet"),
        (bathrooms_n, "bathroom"),
        (combined_n, "combined"),
    ] {
        for i in 1..=n {
            out.push(Space {
                id: format!("{kind}_{i}"),
                kind: kind.to_owned(),
                index: Some(i),
            });
        }
    }
    for kind in &req.extras {
        if counted_kind(kind) {
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

fn default_storey(kind: &str) -> i64 {
    match kind {
        "master_bedroom" | "bedroom" | "toilet" | "bathroom" | "combined" | "study" | "office"
        | "family" | "guest" | "balcony" => 1,
        "gym" | "library" => 2,
        _ => 0,
    }
}

/// `resolve_storey(space, req)`: which storey (0-based) a space lands on.
pub(crate) fn resolve_storey(space: &Space, req: &Requirement) -> i64 {
    let max_storey = clamp_storeys(req.storeys) - 1;
    let level = match req.floors.get(&space.kind).map(String::as_str) {
        Some("ground") => 0,
        Some("first") => 1,
        Some("third") => 2,
        _ => {
            let mut level = default_storey(&space.kind);
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
    level.min(max_storey)
}

/// `round(metres / UNIT)`, clamped at zero (`to_units`).
pub(crate) fn to_units(metres: f64) -> f64 {
    (metres / UNIT).round_ties_even().max(0.0)
}

/// `to_metres(units)`.
pub(crate) fn to_metres(units: f64) -> f64 {
    units * UNIT
}

/// `solver.snap(rect)`: every edge rounded to the placement grid.
pub(crate) fn snap(r: Rect) -> Rect {
    Rect::new(
        to_metres(to_units(r.x)),
        to_metres(to_units(r.y)),
        to_metres(to_units(r.w)),
        to_metres(to_units(r.h)),
    )
}

/// `dir8_zone_of_point(x, y, width, height)`: the octant of a point seen from the
/// plot's centre (x grows east, y grows south).
pub(crate) fn dir8_zone_of_point(x: f64, y: f64, width: f64, height: f64) -> &'static str {
    let dx = x - width / 2.0;
    let dy = y - height / 2.0;
    let bearing = panchanga::pyfloat::py_mod(dx.atan2(-dy) * (180.0 / std::f64::consts::PI), 360.0);
    DIR8_ORDER[dir8_index(bearing)]
}

/// `disjoint_reserved(rects)`: each rect carved down to what earlier rects left.
pub(crate) fn disjoint_reserved(rects: &[Rect]) -> Vec<Rect> {
    let mut acc: Vec<Rect> = Vec::new();
    for rect in rects {
        let mut pieces = vec![snap(*rect)];
        for taken in &acc {
            pieces = pieces
                .into_iter()
                .flat_map(|piece| split_by(piece, *taken, 0.02))
                .collect();
        }
        acc.extend(pieces);
    }
    acc
}

/// What each room's size lookups need: the rule data.
pub(crate) type Ctx<'a> = &'a Rules;
