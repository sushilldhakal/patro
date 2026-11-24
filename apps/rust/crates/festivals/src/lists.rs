//! Year and day festival lists (`holiday_generator.py`, `occurrence.py`).

use astronomy::engine::Observer;
use panchanga::daily::Location;
use serde_json::{Map, Value, json};
use timescale::CivilDay;

use crate::{
    compute::compute_festival_dates,
    rules::{is_public_holiday, overrides, rule, rules},
};

/// `festival_location`: the location a festival calendar is computed for: the observer's
/// own, snapped to 0.1° so a metro area shares one cache bucket. Festivals are
/// location-based, Nepali cities included (only the solar, sankranti-defined dates are
/// fixed to Nepal, and those do not read this location). The default observer keeps
/// its exact coordinates. Python gave every observer in the Kathmandu zone the
/// Kathmandu calendar, so Pokhara got Kathmandu's tithi edges and Kathmandu's cache
/// entry.
#[must_use]
pub fn festival_location(location: &Location) -> Location {
    let kathmandu = Location::kathmandu();
    if location.zone.name() == kathmandu.zone.name()
        && location.lat.to_bits() == kathmandu.lat.to_bits()
        && location.lon.to_bits() == kathmandu.lon.to_bits()
    {
        // The national listing, in the siddhanta the request asked for.
        return Location {
            system: location.system,
            ..kathmandu
        };
    }
    let round1 = |x: f64| format!("{x:.1}").parse().unwrap_or(x);
    Location {
        lat: round1(location.lat),
        lon: round1(location.lon),
        zone: location.zone.clone(),
        name: "observer".into(),
        city_id: None,
        system: location.system,
    }
}

fn iso(day: CivilDay) -> String {
    day.to_string()
}

fn parse_day(v: &Value) -> Option<CivilDay> {
    let text = v.as_str()?;
    let mut parts = text.splitn(3, '-').map(str::parse::<u32>);
    let (Some(Ok(year)), Some(Ok(month)), Some(Ok(day))) =
        (parts.next(), parts.next(), parts.next())
    else {
        return None;
    };
    Some(CivilDay::new(i32::try_from(year).ok()?, month, day))
}

/// `FestivalOccurrence.from_rule(...).to_payload()`.
fn entry(id: &str, r: &Map<String, Value>, start: CivilDay, end: CivilDay) -> Value {
    #[expect(
        clippy::cast_possible_truncation,
        reason = "a festival spans days, not years"
    )]
    let duration = (end.to_jd_ut() - start.to_jd_ut()).round() as i64 + 1;
    let mut m = Map::new();
    m.insert("id".into(), json!(id));
    m.insert(
        "name_en".into(),
        r.get("name_en").cloned().unwrap_or_else(|| json!(id)),
    );
    m.insert(
        "name_ne".into(),
        r.get("name_ne").cloned().unwrap_or(Value::Null),
    );
    m.insert("start_date".into(), json!(iso(start)));
    m.insert("end_date".into(), json!(iso(end)));
    m.insert("duration_days".into(), json!(duration));
    m.insert(
        "type".into(),
        r.get("type").cloned().unwrap_or_else(|| json!("lunar")),
    );
    m.insert(
        "category".into(),
        r.get("category").cloned().unwrap_or(Value::Null),
    );
    m.insert(
        "importance".into(),
        r.get("importance").cloned().unwrap_or(Value::Null),
    );
    m.insert("is_public_holiday".into(), json!(is_public_holiday(id)));
    m.insert(
        "notes".into(),
        r.get("notes").cloned().unwrap_or(Value::Null),
    );
    if let Some(audience) = r
        .get("audience")
        .filter(|a| a.as_str().is_some_and(|s| !s.is_empty()))
    {
        m.insert("audience".into(), audience.clone());
    }
    Value::Object(m)
}

fn id_of(f: &Value) -> &str {
    f["id"].as_str().unwrap_or_default()
}

fn start_of(f: &Value) -> String {
    f["start_date"].as_str().unwrap_or_default().to_owned()
}

fn is_generic_purnima_vrata(id: &str) -> bool {
    id.starts_with("purnima-vrata-")
}

fn is_named_purnima(id: &str) -> bool {
    if is_generic_purnima_vrata(id) || id.ends_with("-vrata") {
        return false;
    }
    let r = rule(id);
    if r.get("type").and_then(Value::as_str) == Some("lunar")
        && r.get("tithi").and_then(Value::as_i64) == Some(15)
        && r.get("paksha").and_then(Value::as_str) == Some("shukla")
    {
        return true;
    }
    let name_en = r
        .get("name_en")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_lowercase();
    let name_ne = r.get("name_ne").and_then(Value::as_str).unwrap_or_default();
    name_en.contains("purnima") || name_ne.contains("पूर्णिमा") || name_ne.contains("पुन्ही")
}

fn truthy(v: Option<&Value>) -> bool {
    match v {
        None | Some(Value::Null) => false,
        Some(Value::Bool(b)) => *b,
        Some(Value::String(s)) => !s.is_empty(),
        Some(Value::Number(n)) => n.as_f64() != Some(0.0),
        Some(_) => true,
    }
}

/// `filter_redundant_day_festivals`: drop alias and generic vrata rows covered by a named festival.
#[must_use]
pub fn filter_day(active: Vec<Value>) -> Vec<Value> {
    let active: Vec<Value> = active
        .into_iter()
        .filter(|f| is_public_holiday(id_of(f)) || !truthy(rule(id_of(f)).get("alias_of")))
        .collect();
    if active.len() <= 1 {
        return active;
    }
    let present: Vec<String> = active.iter().map(|f| id_of(f).to_owned()).collect();
    let has_named_purnima = present.iter().any(|id| is_named_purnima(id));
    let mut filtered: Vec<Value> = active
        .into_iter()
        .filter(|f| {
            let id = id_of(f);
            if is_public_holiday(id) {
                return true;
            }
            if let Some(by) = rule(id)
                .get("subsumed_by")
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
            {
                if present.iter().any(|p| p == by) {
                    return false;
                }
            }
            if let Some(base) = id.strip_suffix("-vrata") {
                if present.iter().any(|p| p == base) {
                    return false;
                }
            }
            !(has_named_purnima && is_generic_purnima_vrata(id))
        })
        .collect();
    filtered.sort_by_key(|f| truthy(rule(id_of(f)).get("block")));
    filtered
}

/// Festivals active on `day`, after the day filter (`festivals_for_day`).
#[must_use]
pub fn festivals_for_day(all: &[Value], day: CivilDay) -> Vec<Value> {
    let active = all
        .iter()
        .filter(|f| {
            parse_day(&f["start_date"]).is_some_and(|s| s <= day)
                && parse_day(&f["end_date"]).is_some_and(|e| day <= e)
        })
        .cloned()
        .collect();
    filter_day(active)
}

/// A year's festival rows with their date spans read once, for per-day lookups.
///
/// [`festivals_for_day`] re-reads every row's date text on every call; a month or
/// year view calls it once per day. This keeps the parsed spans beside the rows.
#[derive(Debug, Clone)]
pub struct FestivalList {
    rows: Vec<Value>,
    spans: Vec<Option<(CivilDay, CivilDay)>>,
}

impl FestivalList {
    /// The rows, with each one's `start_date`..=`end_date` parsed.
    #[must_use]
    pub fn new(rows: Vec<Value>) -> Self {
        let spans = rows
            .iter()
            .map(|f| Some((parse_day(&f["start_date"])?, parse_day(&f["end_date"])?)))
            .collect();
        Self { rows, spans }
    }

    /// Festivals active on `day`, after the day filter: the same rows, in the same
    /// order, as [`festivals_for_day`] over these rows.
    #[must_use]
    pub fn on_day(&self, day: CivilDay) -> Vec<Value> {
        let active = self
            .rows
            .iter()
            .zip(&self.spans)
            .filter(|(_, span)| span.is_some_and(|(s, e)| s <= day && day <= e))
            .map(|(f, _)| f.clone())
            .collect();
        filter_day(active)
    }
}

impl std::ops::Deref for FestivalList {
    type Target = [Value];

    fn deref(&self) -> &[Value] {
        &self.rows
    }
}

/// `filter_redundant_year_festivals`: keep rows that survive the day filter on one of their days.
fn filter_year(festivals: Vec<Value>) -> Vec<Value> {
    // Day → rows active that day, in first-seen order (the order filter_day sees).
    let mut by_day: std::collections::HashMap<CivilDay, Vec<Value>> =
        std::collections::HashMap::new();
    for f in &festivals {
        let (Some(mut day), Some(end)) = (parse_day(&f["start_date"]), parse_day(&f["end_date"]))
        else {
            continue;
        };
        while day <= end {
            by_day.entry(day).or_default().push(f.clone());
            day = day.add_days(1);
        }
    }
    let kept: std::collections::HashSet<String> = by_day
        .into_values()
        .flat_map(filter_day)
        .map(|f| id_of(&f).to_owned())
        .collect();
    festivals
        .into_iter()
        .filter(|f| kept.contains(id_of(f)))
        .collect()
}

fn sorted_by_start(map: Map<String, Value>) -> Vec<Value> {
    let mut list: Vec<Value> = map.into_iter().map(|(_, v)| v).collect();
    list.sort_by_key(start_of);
    list
}

/// Whether a published date replaces the computed one: only for days no calculation gives.
fn override_applies(o: &Map<String, Value>) -> bool {
    matches!(
        o.get("type").and_then(Value::as_str),
        Some("ad_fixed" | "announced")
    )
}

fn override_entry(id: &str, o: &Map<String, Value>) -> Option<Value> {
    let mut merged = rule(id).clone();
    for (k, v) in o {
        merged.insert(k.clone(), v.clone());
    }
    Some(entry(
        id,
        &merged,
        parse_day(&o["start_date"])?,
        parse_day(&o["end_date"])?,
    ))
}

fn observer(location: &Location) -> Observer {
    location.observer()
}

/// All festivals of a Gregorian year at a (festival) location (`generate_festivals`).
#[must_use]
pub fn generate_festivals(gregorian_year: i32, location: &Location) -> Vec<Value> {
    let obs = observer(location);
    let mut merged = Map::new();
    for (id, r) in rules() {
        let Some(r) = r.as_object() else { continue };
        let Some((start, end)) = compute_festival_dates(r, gregorian_year, &obs) else {
            continue;
        };
        if start.year != gregorian_year && end.year != gregorian_year {
            continue;
        }
        merged.insert(id.clone(), entry(id, r, start, end));
    }
    for bs_year in [gregorian_year + 56, gregorian_year + 57] {
        for (id, o) in overrides(bs_year) {
            let Some(o) = o.as_object() else { continue };
            if truthy(o.get("omit")) || !override_applies(o) {
                continue;
            }
            let (Some(s), Some(e)) = (parse_day(&o["start_date"]), parse_day(&o["end_date"]))
            else {
                continue;
            };
            if s.year == gregorian_year || e.year == gregorian_year {
                if let Some(f) = override_entry(id, o) {
                    merged.insert(id.clone(), f);
                }
            }
        }
    }
    let mut list = filter_year(sorted_by_start(merged));
    list.sort_by_key(start_of);
    list
}

/// All festivals of a BS year at a location (`generate_bs_festivals`): the two Gregorian
/// years' festivals that touch the BS year, then the MoHA overrides for it.
#[must_use]
pub fn generate_bs_festivals(bs_year: i32, location: &Location) -> Vec<Value> {
    // The festival stack stops where Python's `date` does: BS 60 (`BS_PANCHANGA_SIGNED_MIN`).
    if bs_year < 60 {
        return Vec::new();
    }
    let location = festival_location(location);
    let (Ok(year_start), Ok(next_start)) = (
        calendar::month_start(bs_year, 1),
        calendar::month_start(bs_year + 1, 1),
    ) else {
        return Vec::new();
    };
    let year_end = next_start.add_days(-1);
    let mut years = vec![year_start.year, year_end.year];
    years.dedup();
    let mut merged = Map::new();
    for gy in years {
        for f in generate_festivals(gy, &location) {
            let (Some(s), Some(e)) = (parse_day(&f["start_date"]), parse_day(&f["end_date"]))
            else {
                continue;
            };
            if s <= year_end && e >= year_start {
                let replace = merged
                    .get(id_of(&f))
                    .and_then(|x: &Value| parse_day(&x["start_date"]))
                    .is_none_or(|old| s < old);
                if replace {
                    merged.insert(id_of(&f).to_owned(), f);
                }
            }
        }
    }
    let mut merged: Map<String, Value> = sorted_by_start(merged)
        .into_iter()
        .map(|f| (id_of(&f).to_owned(), f))
        .collect();
    for (id, o) in overrides(bs_year) {
        let Some(o) = o.as_object() else { continue };
        if truthy(o.get("omit")) || !override_applies(o) {
            continue;
        }
        if let Some(f) = override_entry(id, o) {
            merged.insert(id.clone(), f);
        }
    }
    filter_year(sorted_by_start(merged))
}
