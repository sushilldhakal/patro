//! The Vastu reference data: zone-use content, the room index and room sizes.
//!
//! Python seeds `data/vastu_zone_uses.json` and `data/vastu_room_index.json` into a
//! SQLite file and queries it (`services/vastu/vastu_rules_db.py`); the queries are
//! small, so this reads both files once and answers the same questions in memory,
//! in the same order SQLite returns them.

use std::{collections::HashMap, path::Path};

use serde_json::{Map, Value, json};

use crate::zones::{self, DIR8_ORDER, ZoneCosts};

/// Why the reference data could not be loaded.
#[derive(Debug, thiserror::Error)]
pub enum RulesError {
    /// A source file is missing or unreadable.
    #[error("cannot read {path}: {source}")]
    Read {
        /// The file.
        path: String,
        /// The I/O error.
        source: std::io::Error,
    },
    /// A source file is not the JSON shape the server expects.
    #[error("bad Vastu data in {0}")]
    Shape(String),
}

/// One room-index row (`vastu_room_index`).
#[derive(Debug, Clone)]
pub struct Mapping {
    /// Room, feature or opening id (`kitchen`, `main_door`).
    pub subject: String,
    subject_type: String,
    /// Zone reference, `granularity:id`.
    pub zone: String,
    /// `best` or `avoid`.
    pub polarity: String,
    phrase_en: String,
    phrase_ne: Option<String>,
    zone_note: Option<String>,
}

/// A room's minimum / comfortable / preferred footprints (`data/vastu_room_sizes.json`).
#[derive(Debug, Clone, Copy)]
pub(crate) struct Tiers {
    pub(crate) minimum: (f64, f64),
    pub(crate) comfortable: (f64, f64),
    pub(crate) preferred: (f64, f64),
}

impl Tiers {
    pub(crate) fn comfortable_area(&self) -> f64 {
        self.comfortable.0 * self.comfortable.1
    }

    pub(crate) fn preferred_area(&self) -> f64 {
        self.preferred.0 * self.preferred.1
    }
}

/// The placement gate's minimum (`architecture.IdealSize`).
#[derive(Debug, Clone, Copy)]
pub(crate) struct IdealSize {
    pub(crate) min_side: f64,
    pub(crate) min_area: f64,
}

/// Everything the Vastu routes read, loaded once.
#[derive(Debug)]
pub struct Rules {
    version: String,
    zones: Vec<(String, String, Value)>,
    mappings: Vec<Mapping>,
    subjects: Vec<String>,
    sizes: HashMap<String, Tiers>,
    costs: HashMap<String, ZoneCosts>,
}

fn read_json(path: &Path) -> Result<Value, RulesError> {
    let text = std::fs::read_to_string(path).map_err(|source| RulesError::Read {
        path: path.display().to_string(),
        source,
    })?;
    serde_json::from_str(&text).map_err(|_| RulesError::Shape(path.display().to_string()))
}

fn bilingual(z: &Map<String, Value>, key: &str) -> Value {
    // `field(z, key, lang)` is None for a missing or empty value, and the row is
    // only emitted when its Nepali half is truthy.
    let Some(v) = z.get(key).filter(|v| truthy(v)) else {
        return Value::Null;
    };
    let ne = v.get("ne").cloned().unwrap_or(Value::Null);
    if !truthy(&ne) {
        return Value::Null;
    }
    json!({"ne": ne, "en": v.get("en").cloned().unwrap_or(Value::Null)})
}

fn truthy(v: &Value) -> bool {
    match v {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::String(s) => !s.is_empty(),
        Value::Object(o) => !o.is_empty(),
        Value::Array(a) => !a.is_empty(),
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
    }
}

fn opt_str(v: Option<&Value>) -> Option<String> {
    v.and_then(Value::as_str).map(str::to_owned)
}

type ZoneRow = (String, String, Value);

/// The zone-uses file: its version and one API row per zone, by zone reference.
fn load_zones(zones_data: &Value, zone_path: &Path) -> Result<(String, Vec<ZoneRow>), RulesError> {
    let shape = |p: &Path| RulesError::Shape(p.display().to_string());
    let version = match zones_data.get("version") {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Number(n)) => n.to_string(),
        _ => "0".to_owned(),
    };
    let sources = zones_data.get("sources").cloned().unwrap_or(json!([]));
    let verification = zones_data
        .get("verification_status")
        .and_then(Value::as_str)
        .unwrap_or("unverified")
        .to_owned();
    let mut zones = Vec::new();
    for z in zones_data
        .get("zones")
        .and_then(Value::as_array)
        .ok_or_else(|| shape(zone_path))?
    {
        let z = z.as_object().ok_or_else(|| shape(zone_path))?;
        let gran = opt_str(z.get("granularity")).ok_or_else(|| shape(zone_path))?;
        let id = opt_str(z.get("id")).ok_or_else(|| shape(zone_path))?;
        let half = |key: &str| -> Result<Value, RulesError> {
            let v = z.get(key).ok_or_else(|| shape(zone_path))?;
            Ok(json!({"ne": v.get("ne").cloned().unwrap_or(Value::Null),
                      "en": v.get("en").cloned().unwrap_or(Value::Null)}))
        };
        let zone_ref = format!("{gran}:{id}");
        let row = json!({
            "zoneRef": zone_ref,
            "granularity": gran,
            "id": id,
            "name": bilingual(z, "name"),
            "deity": bilingual(z, "deity"),
            "importance": bilingual(z, "importance"),
            "best": half("best")?,
            "avoid": half("avoid")?,
            "sources": sources,
            "verificationStatus": verification,
        });
        zones.push((zone_ref, gran, row));
    }
    // ORDER BY zone_ref (the primary key, so no ties).
    zones.sort_by(|a, b| a.0.cmp(&b.0));
    Ok((version, zones))
}

/// The room-sizes file: minimum / comfortable / preferred per kind.
fn load_sizes(sizes_data: &Value, sizes_path: &Path) -> Result<HashMap<String, Tiers>, RulesError> {
    let shape = |p: &Path| RulesError::Shape(p.display().to_string());
    let mut sizes = HashMap::new();
    for (kind, t) in sizes_data
        .get("sizes")
        .and_then(Value::as_object)
        .ok_or_else(|| shape(sizes_path))?
    {
        let pair = |tier: &str| -> Result<(f64, f64), RulesError> {
            let v = t.get(tier).ok_or_else(|| shape(sizes_path))?;
            let w = v.get("width").and_then(Value::as_f64);
            let d = v.get("depth").and_then(Value::as_f64);
            w.zip(d).ok_or_else(|| shape(sizes_path))
        };
        sizes.insert(
            kind.clone(),
            Tiers {
                minimum: pair("minimum")?,
                comfortable: pair("comfortable")?,
                preferred: pair("preferred")?,
            },
        );
    }
    Ok(sizes)
}

impl Rules {
    /// Reads the three source files from the data directory.
    ///
    /// # Errors
    ///
    /// A missing file or one that is not the expected JSON shape.
    pub fn load(data_dir: &Path) -> Result<Self, RulesError> {
        let zone_path = data_dir.join("vastu_zone_uses.json");
        let index_path = data_dir.join("vastu_room_index.json");
        let sizes_path = data_dir.join("vastu_room_sizes.json");
        let zones_data = read_json(&zone_path)?;
        let index_data = read_json(&index_path)?;
        let sizes_data = read_json(&sizes_path)?;
        let shape = |p: &Path| RulesError::Shape(p.display().to_string());
        let (version, zones) = load_zones(&zones_data, &zone_path)?;

        let mut mappings = Vec::new();
        for m in index_data
            .get("mappings")
            .and_then(Value::as_array)
            .ok_or_else(|| shape(&index_path))?
        {
            let field = |k: &str| opt_str(m.get(k)).ok_or_else(|| shape(&index_path));
            mappings.push(Mapping {
                subject: field("subject")?,
                subject_type: field("subject_type")?,
                zone: field("zone")?,
                polarity: field("polarity")?,
                phrase_en: field("matched_phrase_en")?,
                phrase_ne: opt_str(m.get("matched_phrase_ne")),
                zone_note: opt_str(m.get("zone_note")),
            });
        }
        let mut subjects: Vec<String> = mappings.iter().map(|m| m.subject.clone()).collect();
        subjects.sort();
        subjects.dedup();

        let sizes = load_sizes(&sizes_data, &sizes_path)?;

        let mut rules = Self {
            version,
            zones,
            mappings,
            subjects,
            sizes,
            costs: HashMap::new(),
        };
        let mut costs = HashMap::new();
        for subject in &rules.subjects {
            costs.insert(subject.clone(), rules.compute_costs(subject));
        }
        rules.costs = costs;
        Ok(rules)
    }

    /// `rule_version()`: the zone-uses file's version.
    #[must_use]
    pub fn version(&self) -> &str {
        &self.version
    }

    /// `get_all_zones(granularity)`, ordered by zone reference.
    #[must_use]
    pub fn all_zones(&self, granularity: Option<&str>) -> Vec<Value> {
        self.zones
            .iter()
            .filter(|(_, g, _)| granularity.is_none_or(|want| want == g))
            .map(|(_, _, row)| row.clone())
            .collect()
    }

    /// `get_zone(granularity, zone_id)`.
    #[must_use]
    pub fn zone(&self, granularity: &str, zone_id: &str) -> Option<Value> {
        let key = format!("{granularity}:{zone_id}");
        self.zones
            .iter()
            .find(|(r, _, _)| *r == key)
            .map(|(_, _, row)| row.clone())
    }

    /// `get_by_subject(subject)`: `ORDER BY polarity, zone_ref`, ties in file order.
    #[must_use]
    pub fn by_subject(&self, subject: &str) -> Vec<&Mapping> {
        let mut rows: Vec<&Mapping> = self
            .mappings
            .iter()
            .filter(|m| m.subject == subject)
            .collect();
        rows.sort_by(|a, b| (&a.polarity, &a.zone).cmp(&(&b.polarity, &b.zone)));
        rows
    }

    /// `all_subjects()`: distinct, sorted.
    #[must_use]
    pub fn subjects(&self) -> &[String] {
        &self.subjects
    }

    /// A room-index row in the API's shape (`_mapping_row`).
    #[must_use]
    pub fn mapping_json(m: &Mapping) -> Value {
        json!({
            "subject": m.subject,
            "subjectType": m.subject_type,
            "zone": m.zone,
            "polarity": m.polarity,
            "matchedPhrase": {"en": m.phrase_en, "ne": m.phrase_ne},
            "zoneNote": m.zone_note,
        })
    }

    pub(crate) fn tiers(&self, kind: &str) -> Option<&Tiers> {
        self.sizes.get(kind)
    }

    /// `IDEAL_SIZE.get(kind)`.
    pub(crate) fn ideal_opt(&self, kind: &str) -> Option<IdealSize> {
        self.sizes.get(kind).map(|t| IdealSize {
            min_side: t.minimum.0,
            min_area: t.minimum.0 * t.minimum.1,
        })
    }

    /// `IDEAL_SIZE[kind]` for a kind already checked to exist.
    pub(crate) fn ideal(&self, kind: &str) -> IdealSize {
        self.ideal_opt(kind)
            .expect("house-plan kinds are checked against the size table up front")
    }

    /// `zone_costs_for_subject(subject)` (with the `kitchen_dining` alias).
    pub(crate) fn zone_costs(&self, subject: &str) -> ZoneCosts {
        let subject = if subject == "kitchen_dining" {
            "kitchen"
        } else {
            subject
        };
        self.costs
            .get(subject)
            .copied()
            .unwrap_or_else(ZoneCosts::no_data)
    }

    fn compute_costs(&self, subject: &str) -> ZoneCosts {
        let mut best = 0_u8;
        let mut avoid = 0_u8;
        for m in self.mappings.iter().filter(|m| m.subject == subject) {
            let Some(zone) = zones::dir8_for_zone_ref(&m.zone) else {
                continue;
            };
            let bit = 1 << zone;
            if m.polarity == "best" {
                best |= bit;
            } else {
                avoid |= bit;
            }
        }
        avoid &= !best;
        let all = u8::MAX >> (8 - DIR8_ORDER.len());
        ZoneCosts {
            preferred: best,
            acceptable: all & !best & !avoid,
            avoid,
        }
    }

    /// Ranked best entrance padas on a wall (`entrance_padas_for_wall`).
    pub(crate) fn entrance_padas_for_wall(&self, wall: char) -> Vec<&'static str> {
        let mut candidates: Vec<(u8, &'static str)> = Vec::new();
        for m in self.by_subject("main_door") {
            if m.polarity != "best" {
                continue;
            }
            let Some(("pada32", id)) = m.zone.split_once(':') else {
                continue;
            };
            if let Some(p) = zones::pada(id)
                && p.wall == wall
            {
                candidates.push((p.index, p.id));
            }
        }
        candidates.sort_unstable();
        candidates.into_iter().map(|(_, id)| id).collect()
    }
}
