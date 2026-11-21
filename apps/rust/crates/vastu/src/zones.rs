//! The Vastu coordinate system (`engine/vastu/spatial.py`) and the placement costs
//! derived from the room index (`engine/vastu/zone_rules.py`).

/// The eight outer octants, clockwise from north (`_DIR8_ORDER`).
pub(crate) const DIR8_ORDER: [&str; 8] = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
];

/// The 32 perimeter padas, clockwise from Soma (`PADA32_IDS`).
const PADA32_IDS: [&str; 32] = [
    "soma",
    "bhujaga",
    "aditi",
    "diti",
    "shikhi",
    "parjanya",
    "jayanta",
    "mahendra",
    "surya",
    "satya",
    "bhrisha",
    "aakasha",
    "anila",
    "pushan",
    "vitatha",
    "grihakshata",
    "yama",
    "gandharva",
    "bhringraj",
    "mriga",
    "pitra",
    "dauvarika",
    "sugriva",
    "pushpadanta",
    "varuna",
    "asura",
    "shosha",
    "papayakshma",
    "roga",
    "naga",
    "mukhya",
    "bhallata",
];

const DIR16_IDS: [&str; 16] = [
    "n", "nne", "ne", "ene", "e", "ese", "se", "sse", "s", "ssw", "sw", "wsw", "w", "wnw", "nw",
    "nnw",
];

/// One perimeter pada.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Pada {
    pub(crate) id: &'static str,
    pub(crate) bearing: f64,
    pub(crate) wall: char,
    pub(crate) index: u8,
}

fn pada_at_slot(slot: usize) -> Pada {
    // N1 is Roga, the first north-wall cell.
    let n1 = 28;
    let i = (slot + 32 - n1) % 32;
    let wall = ['N', 'E', 'S', 'W'][i / 8];
    Pada {
        id: PADA32_IDS[slot],
        bearing: f64::from(u8::try_from(slot).unwrap_or(0)) * 11.25,
        wall,
        index: u8::try_from(i % 8 + 1).unwrap_or(1),
    }
}

/// `PADA32_BY_ID`.
pub(crate) fn pada(id: &str) -> Option<Pada> {
    PADA32_IDS.iter().position(|p| *p == id).map(pada_at_slot)
}

fn bearing_of(zone_ref: &str) -> Option<f64> {
    let (granularity, zone_id) = zone_ref.split_once(':').unwrap_or((zone_ref, ""));
    match granularity {
        "dir8" => DIR8_ORDER
            .iter()
            .position(|d| *d == zone_id)
            .map(|i| f64::from(u8::try_from(i).unwrap_or(0)) * 45.0),
        "dir16" => DIR16_IDS
            .iter()
            .position(|d| *d == zone_id)
            .map(|i| f64::from(u8::try_from(i).unwrap_or(0)) * 22.5),
        "pada32" => pada(zone_id).map(|p| p.bearing),
        // inner4 describes a relationship to the Brahmasthan, not an outer octant.
        _ => None,
    }
}

/// Index into [`DIR8_ORDER`] of the octant a bearing falls in (`round(b / 45) % 8`).
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "a bearing in [0, 360) rounds to 0..=8"
)]
pub(crate) fn dir8_index(bearing: f64) -> usize {
    ((bearing / 45.0).round_ties_even() as usize) % 8
}

/// `dir8_for_zone_ref`: which octant a finer zone falls in, as a [`DIR8_ORDER`] index.
pub(crate) fn dir8_for_zone_ref(zone_ref: &str) -> Option<usize> {
    bearing_of(zone_ref).map(dir8_index)
}

/// Index of a dir8 id in [`DIR8_ORDER`] (`None` for `center`).
pub(crate) fn dir8_pos(zone: &str) -> Option<usize> {
    DIR8_ORDER.iter().position(|d| *d == zone)
}

/// Preferred / acceptable / avoid octants as bit sets over [`DIR8_ORDER`].
#[derive(Debug, Clone, Copy)]
pub(crate) struct ZoneCosts {
    pub(crate) preferred: u8,
    pub(crate) acceptable: u8,
    pub(crate) avoid: u8,
}

impl ZoneCosts {
    /// "No verified rule available": every octant acceptable.
    pub(crate) const fn no_data() -> Self {
        Self {
            preferred: 0,
            acceptable: u8::MAX,
            avoid: 0,
        }
    }

    fn has(set: u8, zone: &str) -> bool {
        dir8_pos(zone).is_some_and(|i| set & (1 << i) != 0)
    }

    pub(crate) fn avoids(self, zone: &str) -> bool {
        Self::has(self.avoid, zone)
    }

    /// `vastu_cost(subject, zone, mode)`: (cost, relaxed), lower is better.
    pub(crate) fn cost(self, zone: &str, mode: &str) -> (f64, bool) {
        if zone == "center" {
            return (200.0, true);
        }
        if Self::has(self.preferred, zone) {
            return (0.0, false);
        }
        if Self::has(self.acceptable, zone) {
            return if mode == "strict" {
                (80.0, true)
            } else {
                (2.0, false)
            };
        }
        if Self::has(self.avoid, zone) {
            return (200.0, true);
        }
        if mode == "strict" {
            (80.0, true)
        } else {
            (5.0, false)
        }
    }
}
