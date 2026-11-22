//! Festival sait (साइत) windows at the observer (`engine/festivals/festival_sait.py`).
//!
//! Ceremony saits (`vivah` / `bratabandha` / `griha-pravesh`) need the muhūrta engine,
//! which is not ported yet; [`ceremony_saits`] returns an empty list until it is.

use std::collections::{HashMap, HashSet};

use astronomy::{
    System,
    engine::{Observer, moon_longitude, rise_set_on_day},
    surya_siddhanta::{Body, Crossing},
};
use panchanga::{
    daily::Location, nakshatra_end, nakshatra_number, tithi_end, tithi_number, yoga_end,
    yoga_number,
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, Moment, UtcInstant, Zone};

const MICROS_PER_SECOND: i64 = 1_000_000;
const MIN_SAIT_MICROS: i64 = 12 * 60 * MICROS_PER_SECOND;

const STHIRA_LAGNAS: [u32; 4] = [2, 5, 8, 11];
const DWISWABHAVA_LAGNAS: [u32; 4] = [3, 6, 9, 12];
const SHUBHA_LAGNAS: [u32; 8] = [2, 3, 5, 6, 8, 9, 11, 12];
const VRISHABHA: [u32; 1] = [2];
const CHITRA: u32 = 14;
const VAIDHRITI: u32 = 27;

const RASHI_NAMES: [&str; 12] = [
    "Mesha",
    "Vrishabha",
    "Mithuna",
    "Karka",
    "Simha",
    "Kanya",
    "Tula",
    "Vrishchika",
    "Dhanu",
    "Makara",
    "Kumbha",
    "Meena",
];
const RASHI_NAMES_NE: [&str; 12] = [
    "मेष",
    "वृष",
    "मिथुन",
    "कर्कट",
    "सिंह",
    "कन्या",
    "तुला",
    "वृश्चिक",
    "धनु",
    "मकर",
    "कुम्भ",
    "मीन",
];
const CHANDRA_VASA_DIRECTIONS: [&str; 4] = ["east", "south", "west", "north"];
const NIGHT_KAALS: [&str; 2] = ["pradosh", "purva_ratri"];

/// Python's `_divide_and_round` for `timedelta / n`.
fn timedelta_div(micros: i64, n: i64) -> i64 {
    let (mut q, r) = (micros.div_euclid(n), micros.rem_euclid(n));
    let r2 = r * 2;
    if r2 > n || (r2 == n && q.rem_euclid(2) == 1) {
        q += 1;
    }
    q
}

#[derive(Clone, Copy, PartialEq, Eq)]
struct Window {
    start: UtcInstant,
    end: UtcInstant,
}

impl Window {
    fn duration_micros(self) -> i64 {
        self.end.micros_since(self.start)
    }
}

struct SaitRule {
    ritual: &'static str,
    tithi: u32,
    paksha: &'static str,
    windows: &'static [&'static str],
    lagnas: &'static [&'static [u32]],
    tika: TikaFacing,
    avoid_nakshatras: &'static [u32],
    avoid_yogas: &'static [u32],
}

/// Whether a Tika rite names Chandra Vāsa facing.
#[derive(Clone, Copy, PartialEq, Eq)]
enum TikaFacing {
    Yes,
    No,
}

impl SaitRule {
    fn absolute_tithi(&self) -> u32 {
        if self.paksha == "krishna" {
            self.tithi + 15
        } else {
            self.tithi
        }
    }
}

const GHATASTHAPANA: SaitRule = SaitRule {
    ritual: "ghatasthapana",
    tithi: 1,
    paksha: "shukla",
    windows: &["pratah", "abhijit", "until_madhyahna"],
    lagnas: &[&DWISWABHAVA_LAGNAS, &STHIRA_LAGNAS],
    tika: TikaFacing::No,
    avoid_nakshatras: &[CHITRA],
    avoid_yogas: &[VAIDHRITI],
};
const FULPATI: SaitRule = SaitRule {
    ritual: "fulpati",
    tithi: 7,
    paksha: "shukla",
    windows: &["abhijit", "madhyahna", "until_madhyahna"],
    lagnas: &[&SHUBHA_LAGNAS],
    tika: TikaFacing::No,
    avoid_nakshatras: &[],
    avoid_yogas: &[],
};
const VIJAYA_DASHAMI: SaitRule = SaitRule {
    ritual: "dashain-tika",
    tithi: 10,
    paksha: "shukla",
    windows: &["abhijit", "madhyahna", "until_madhyahna"],
    lagnas: &[&SHUBHA_LAGNAS],
    tika: TikaFacing::Yes,
    avoid_nakshatras: &[],
    avoid_yogas: &[],
};
const LAXMI_PUJA: SaitRule = SaitRule {
    ritual: "laxmi-puja",
    tithi: 15,
    paksha: "krishna",
    windows: &["pradosh", "purva_ratri"],
    lagnas: &[&VRISHABHA, &STHIRA_LAGNAS],
    tika: TikaFacing::No,
    avoid_nakshatras: &[],
    avoid_yogas: &[],
};
const BHAI_TIKA: SaitRule = SaitRule {
    ritual: "bhai-tika",
    tithi: 2,
    paksha: "shukla",
    windows: &["abhijit_aparahna", "until_aparahna"],
    lagnas: &[&SHUBHA_LAGNAS],
    tika: TikaFacing::Yes,
    avoid_nakshatras: &[],
    avoid_yogas: &[],
};

fn sait_rule(id: &str) -> Option<&'static SaitRule> {
    match id {
        "ghatasthapana" => Some(&GHATASTHAPANA),
        "fulpati" => Some(&FULPATI),
        "vijaya-dashami" => Some(&VIJAYA_DASHAMI),
        "laxmi-puja" => Some(&LAXMI_PUJA),
        "bhai-tika" => Some(&BHAI_TIKA),
        _ => None,
    }
}

fn utc(moment: Option<Moment>) -> Option<UtcInstant> {
    match moment {
        Some(Moment::Utc(i)) => Some(i),
        _ => None,
    }
}

fn observer(location: &Location) -> Observer {
    Observer {
        system: location.system,
        latitude: location.lat,
        longitude: location.lon,
        zone: location.zone.clone(),
    }
}

fn lagna_rashi(system: System, jd: f64, lat: f64, lon: f64) -> u32 {
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "ascendant/30 is in 0..12"
    )]
    let i = (system.ascendant(jd, lat, lon) / 30.0) as u32 % 12;
    i + 1
}

fn next_lagna_boundary(system: System, jd: f64, lat: f64, lon: f64) -> f64 {
    let current = lagna_rashi(system, jd, lat, lon);
    let (mut start, mut end) = (jd, jd + 4.0 / 24.0);
    for _ in 0..50 {
        if end - start < 1.0 / 86400.0 {
            return end;
        }
        let mid = start + (end - start) / 2.0;
        if lagna_rashi(system, mid, lat, lon) == current {
            start = mid;
        } else {
            end = mid;
        }
    }
    end
}

struct LagnaSpan {
    number: u32,
    name: &'static str,
    name_ne: &'static str,
    window: Window,
}

/// `build_lagna_spans(..., complete=True)`: every real lagna stretch to next sunrise.
fn complete_lagna_spans(
    system: System,
    sunrise: UtcInstant,
    next_sunrise: UtcInstant,
    lat: f64,
    lon: f64,
) -> Vec<LagnaSpan> {
    let mut spans = Vec::new();
    let mut cursor = sunrise;
    for _ in 0..14 {
        if cursor >= next_sunrise {
            break;
        }
        let cursor_jd = cursor.to_jd();
        let number = lagna_rashi(system, cursor_jd, lat, lon);
        let idx = usize::try_from(number - 1).unwrap_or(0);
        let end_jd = next_lagna_boundary(system, cursor_jd, lat, lon);
        let mut end = cursor.add_days_f64(end_jd - cursor_jd);
        if end > next_sunrise {
            end = next_sunrise;
        }
        if end <= cursor {
            end = cursor.add_seconds(60);
        }
        spans.push(LagnaSpan {
            number,
            name: RASHI_NAMES[idx],
            name_ne: RASHI_NAMES_NE[idx],
            window: Window { start: cursor, end },
        });
        cursor = end;
    }
    spans
}

struct Sky {
    system: System,
    sunrise: UtcInstant,
    sunset: UtcInstant,
    next_sunrise: UtcInstant,
    lagna_spans: Vec<LagnaSpan>,
}

fn local_sky(day: CivilDay, location: &Location) -> Option<Sky> {
    let obs = observer(location);
    let sunrise = utc(rise_set_on_day(Body::Sun, day, &obs, Crossing::Rise))?;
    let sunset = utc(rise_set_on_day(Body::Sun, day, &obs, Crossing::Set))?;
    let next_sunrise = utc(rise_set_on_day(
        Body::Sun,
        day.add_days(1),
        &obs,
        Crossing::Rise,
    ))?;
    let lagna_spans = complete_lagna_spans(
        location.system,
        sunrise,
        next_sunrise,
        location.lat,
        location.lon,
    );
    Some(Sky {
        system: location.system,
        sunrise,
        sunset,
        next_sunrise,
        lagna_spans,
    })
}

fn kaal_windows(sky: &Sky) -> HashMap<&'static str, Window> {
    let day = sky.sunset.micros_since(sky.sunrise);
    let night = sky.next_sunrise.micros_since(sky.sunset);
    let muhurta = timedelta_div(day, 15);
    let fifth = timedelta_div(day, 5);
    let mut out = HashMap::new();
    out.insert(
        "pratah",
        Window {
            start: sky.sunrise,
            end: sky.sunrise.add_micros(timedelta_div(day, 3)),
        },
    );
    out.insert(
        "abhijit",
        Window {
            start: sky.sunrise.add_micros(7 * muhurta),
            end: sky.sunrise.add_micros(8 * muhurta),
        },
    );
    out.insert(
        "madhyahna",
        Window {
            start: sky.sunrise.add_micros(2 * fifth),
            end: sky.sunrise.add_micros(3 * fifth),
        },
    );
    out.insert(
        "aparahna",
        Window {
            start: sky.sunrise.add_micros(3 * fifth),
            end: sky.sunrise.add_micros(4 * fifth),
        },
    );
    out.insert(
        "abhijit_aparahna",
        Window {
            start: sky.sunrise.add_micros(7 * muhurta),
            end: sky.sunrise.add_micros(4 * fifth),
        },
    );
    out.insert(
        "until_madhyahna",
        Window {
            start: sky.sunrise,
            end: sky.sunrise.add_micros(3 * fifth),
        },
    );
    out.insert(
        "until_aparahna",
        Window {
            start: sky.sunrise,
            end: sky.sunrise.add_micros(4 * fifth),
        },
    );
    out.insert(
        "pradosh",
        Window {
            start: sky.sunset,
            end: sky.sunset.add_micros(timedelta_div(night, 5)),
        },
    );
    out.insert(
        "purva_ratri",
        Window {
            start: sky.sunset,
            end: sky.sunset.add_micros(timedelta_div(night, 2)),
        },
    );
    out
}

fn intersect(a: Window, b: Window) -> Option<Window> {
    let start = a.start.max(b.start);
    let end = a.end.min(b.end);
    (end > start).then_some(Window { start, end })
}

fn clip_all(window: Window, spans: &[Window]) -> Vec<Window> {
    spans
        .iter()
        .filter_map(|&span| intersect(window, span))
        .collect()
}

fn subtract(spans: &[Window], holes: &[Window]) -> Vec<Window> {
    let mut out = spans.to_vec();
    for hole in holes {
        let mut cut = Vec::new();
        for span in out {
            if hole.end <= span.start || hole.start >= span.end {
                cut.push(span);
                continue;
            }
            if span.start < hole.start {
                cut.push(Window {
                    start: span.start,
                    end: hole.start,
                });
            }
            if hole.end < span.end {
                cut.push(Window {
                    start: hole.end,
                    end: span.end,
                });
            }
        }
        out = cut;
    }
    out
}

fn spans_where(
    start: UtcInstant,
    end: UtcInstant,
    number_at: impl Fn(UtcInstant) -> u32,
    end_of: impl Fn(UtcInstant) -> UtcInstant,
    wanted: &HashSet<u32>,
) -> Vec<Window> {
    let mut spans = Vec::new();
    let mut cursor = start;
    for _ in 0..6 {
        if cursor >= end {
            break;
        }
        let boundary = end_of(cursor);
        if wanted.contains(&number_at(cursor)) {
            spans.push(Window {
                start: cursor,
                end: boundary.min(end),
            });
        }
        cursor = boundary.add_seconds(1);
    }
    spans
}

fn tithi_spans(system: System, start: UtcInstant, end: UtcInstant, target: u32) -> Vec<Window> {
    let mut wanted = HashSet::new();
    wanted.insert(target);
    spans_where(
        start,
        end,
        |at| tithi_number(system, at.to_jd()),
        |t| tithi_end(system, t),
        &wanted,
    )
}

fn avoided_spans(
    system: System,
    rule: &SaitRule,
    start: UtcInstant,
    end: UtcInstant,
) -> Vec<Window> {
    let mut spans = Vec::new();
    if !rule.avoid_nakshatras.is_empty() {
        let wanted: HashSet<u32> = rule.avoid_nakshatras.iter().copied().collect();
        spans.extend(spans_where(
            start,
            end,
            |at| nakshatra_number(system, at.to_jd()),
            |t| nakshatra_end(system, t),
            &wanted,
        ));
    }
    if !rule.avoid_yogas.is_empty() {
        let wanted: HashSet<u32> = rule.avoid_yogas.iter().copied().collect();
        spans.extend(spans_where(
            start,
            end,
            |at| yoga_number(system, at.to_jd()),
            |t| yoga_end(system, t),
            &wanted,
        ));
    }
    spans
}

fn time_block(start: UtcInstant, end: UtcInstant, zone: &Zone) -> Map<String, Value> {
    let local_start = zone.local(start);
    let local_end = zone.local(end);
    let mut out = Map::new();
    out.insert("start".into(), json!(start.to_string()));
    out.insert("end".into(), json!(end.to_string()));
    out.insert("date_local".into(), json!(local_start.day().to_string()));
    out.insert("start_local".into(), json!(local_start.hm()));
    out.insert("end_local".into(), json!(local_end.hm()));
    out
}

fn chandra_vasa(system: System, at: UtcInstant) -> Value {
    let lon = moon_longitude(system, at.to_jd());
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "moon longitude/30 is in 0..12"
    )]
    let number = ((lon / 30.0) as u32 % 12) + 1;
    let idx = usize::try_from(number - 1).unwrap_or(0);
    json!({
        "direction": CHANDRA_VASA_DIRECTIONS[((number - 1) % 4) as usize],
        "moon_rashi": {
            "number": number,
            "name": RASHI_NAMES[idx],
            "name_ne": RASHI_NAMES_NE[idx],
        },
    })
}

struct Found {
    sait: Map<String, Value>,
    in_primary: bool,
    has_lagna: bool,
}

#[expect(
    clippy::too_many_lines,
    reason = "field-for-field port of Python _sait_on"
)]
fn sait_on(rule: &SaitRule, sky: &Sky, zone: &Zone) -> Option<Found> {
    let system = sky.system;
    let kaals = kaal_windows(sky);
    let tithi = tithi_spans(system, sky.sunrise, sky.next_sunrise, rule.absolute_tithi());
    if tithi.is_empty() {
        return None;
    }
    let clean = subtract(
        &tithi,
        &avoided_spans(system, rule, sky.sunrise, sky.next_sunrise),
    );
    let pass_lists: Vec<Vec<Window>> = if clean == tithi {
        vec![tithi.clone()]
    } else {
        vec![clean, tithi.clone()]
    };

    let first = *kaals.get(rule.windows[0])?;
    let anchor = first
        .start
        .add_micros(timedelta_div(first.end.micros_since(first.start), 2));
    let distance = |hit: Window| -> i64 {
        if hit.start <= anchor && anchor <= hit.end {
            0
        } else {
            hit.start
                .micros_since(anchor)
                .abs()
                .min(hit.end.micros_since(anchor).abs())
        }
    };

    let abhijit_alternate = |kaal: &str, sait: Window| -> Value {
        let Some(&abhijit) = kaals.get("abhijit") else {
            return Value::Null;
        };
        if NIGHT_KAALS.contains(&kaal) || intersect(abhijit, sait).is_some() {
            return Value::Null;
        }
        let parts = clip_all(abhijit, &tithi);
        let Some(part) = parts.first() else {
            return Value::Null;
        };
        let mut alt = time_block(part.start, part.end, zone);
        alt.insert("kaal".into(), json!("abhijit"));
        Value::Object(alt)
    };

    let entry = |kaal: &str, sait: Window, lagna: Option<&LagnaSpan>| -> Found {
        let mut row = Map::new();
        row.insert("ritual".into(), json!(rule.ritual));
        row.insert("kaal".into(), json!(kaal));
        row.insert(
            "window".into(),
            Value::Object(time_block(kaals[kaal].start, kaals[kaal].end, zone)),
        );
        row.insert(
            "sait".into(),
            Value::Object(time_block(sait.start, sait.end, zone)),
        );
        row.insert(
            "lagna".into(),
            lagna.map_or(
                Value::Null,
                |l| json!({"number": l.number, "name": l.name, "name_ne": l.name_ne}),
            ),
        );
        row.insert("alternate".into(), abhijit_alternate(kaal, sait));
        row.insert(
            "facing".into(),
            if rule.tika == TikaFacing::Yes {
                chandra_vasa(system, sait.start)
            } else {
                Value::Null
            },
        );
        Found {
            sait: row,
            in_primary: !clip_all(first, &tithi).is_empty(),
            has_lagna: lagna.is_some(),
        }
    };

    for spans in &pass_lists {
        for &kaal in rule.windows {
            let Some(&open_kaal) = kaals.get(kaal) else {
                continue;
            };
            let open_parts = clip_all(open_kaal, spans);
            for group in rule.lagnas {
                let group_set: HashSet<u32> = group.iter().copied().collect();
                let mut hits: Vec<(Window, &LagnaSpan)> = Vec::new();
                for span in &sky.lagna_spans {
                    if !group_set.contains(&span.number) {
                        continue;
                    }
                    for hit in clip_all(span.window, &open_parts) {
                        if hit.duration_micros() >= MIN_SAIT_MICROS {
                            hits.push((hit, span));
                        }
                    }
                }
                if let Some((hit, span)) = hits
                    .into_iter()
                    .min_by_key(|(hit, _)| (distance(*hit), hit.start))
                {
                    return Some(entry(kaal, hit, Some(span)));
                }
            }
        }
    }

    for spans in &pass_lists {
        for &kaal in rule.windows {
            let Some(&open_kaal) = kaals.get(kaal) else {
                continue;
            };
            let open_parts = clip_all(open_kaal, spans);
            if let Some(&part) = open_parts.first() {
                return Some(entry(kaal, part, None));
            }
        }
    }
    None
}

/// Saits for ritual festivals among `festival_ids` on `day` at `location`.
#[must_use]
pub fn festival_saits(day: CivilDay, festival_ids: &[String], location: &Location) -> Vec<Value> {
    let mut seen = HashSet::new();
    let mut wanted: Vec<(&str, &SaitRule)> = Vec::new();
    for id in festival_ids {
        if let Some(rule) = sait_rule(id)
            && seen.insert(id.as_str())
        {
            wanted.push((id.as_str(), rule));
        }
    }
    if wanted.is_empty() {
        return Vec::new();
    }

    let mut skies: HashMap<i32, Sky> = HashMap::new();
    let mut out = Vec::new();
    for (fid, rule) in wanted {
        let mut best: Option<Found> = None;
        for offset in [0_i32, -1, 1] {
            if let std::collections::hash_map::Entry::Vacant(slot) = skies.entry(offset) {
                let Some(sky) = local_sky(day.add_days(offset), location) else {
                    continue;
                };
                slot.insert(sky);
            }
            let Some(sky) = skies.get(&offset) else {
                continue;
            };
            let Some(found) = sait_on(rule, sky, &location.zone) else {
                continue;
            };
            let better = match &best {
                None => true,
                Some(prev) => {
                    (found.in_primary, found.has_lagna) > (prev.in_primary, prev.has_lagna)
                }
            };
            if better {
                best = Some(found);
            }
            if best.as_ref().is_some_and(|b| b.in_primary && b.has_lagna) {
                break;
            }
        }
        if let Some(found) = best {
            let mut row = Map::new();
            row.insert("kind".into(), json!("festival"));
            row.insert("festival_id".into(), json!(fid));
            row.insert("timezone".into(), json!(location.zone.name()));
            for (k, v) in found.sait {
                row.insert(k, v);
            }
            out.push(Value::Object(row));
        }
    }
    out
}

/// One ceremony's muhurta windows on a day (`muhurta_windows(cat, day, refine=True)`),
/// found by the muhurta engine in the `patro` crate.
#[derive(Debug, Clone)]
pub struct CeremonyWindows {
    /// `vivah`, `bratabandha` or `griha-pravesh`.
    pub category: &'static str,
    /// `(start, end)` of each window, in scan order.
    pub windows: Vec<(UtcInstant, UtcInstant)>,
}

/// The ceremonies a day route times, with the local lagnas each permits (`CEREMONY_SAITS`).
pub const CEREMONY_SAITS: [(&str, &[u32]); 3] = [
    ("vivah", &[2, 3, 6, 7, 9, 12]),
    ("bratabandha", &SHUBHA_LAGNAS),
    ("griha-pravesh", &SHUBHA_LAGNAS),
];

/// `ceremony_saits`: one row per stretch of a muhurta window under a single
/// permitted local lagna, so the times are the minutes that lagna holds the horizon.
#[must_use]
pub fn ceremony_saits(day: CivilDay, location: &Location, found: &[CeremonyWindows]) -> Vec<Value> {
    if found.iter().all(|c| c.windows.is_empty()) {
        return Vec::new();
    }
    let Some(sky) = local_sky(day, location) else {
        return Vec::new();
    };
    let zone = &location.zone;
    let mut out = Vec::new();
    for ceremony in found {
        let Some((_, permitted)) = CEREMONY_SAITS.iter().find(|(c, _)| *c == ceremony.category)
        else {
            continue;
        };
        for &(start, end) in &ceremony.windows {
            let whole = Window { start, end };
            for span in &sky.lagna_spans {
                if !permitted.contains(&span.number) {
                    continue;
                }
                let Some(part) = intersect(whole, span.window) else {
                    continue;
                };
                // Slivers at a lagna change are no sait, as for the festivals.
                if part.duration_micros() < MIN_SAIT_MICROS {
                    continue;
                }
                let mut row = Map::new();
                row.insert("kind".into(), json!("ceremony"));
                row.insert("festival_id".into(), json!(ceremony.category));
                row.insert("timezone".into(), json!(zone.name()));
                row.insert("ritual".into(), json!(ceremony.category));
                row.insert("kaal".into(), Value::Null);
                row.insert("window".into(), Value::Object(time_block(start, end, zone)));
                row.insert(
                    "sait".into(),
                    Value::Object(time_block(part.start, part.end, zone)),
                );
                row.insert(
                    "lagna".into(),
                    json!({"number": span.number, "name": span.name, "name_ne": span.name_ne}),
                );
                row.insert("alternate".into(), Value::Null);
                row.insert("facing".into(), Value::Null);
                out.push(Value::Object(row));
            }
        }
    }
    out
}

/// Day-route attachment: enrich festivals and compute `festival_saits`.
pub fn attach_festival_saits(
    festivals: &mut [Value],
    day: CivilDay,
    location: &Location,
    ceremonies: &[CeremonyWindows],
) -> Vec<Value> {
    crate::details::attach_festival_details(festivals);
    let ids: Vec<String> = festivals
        .iter()
        .filter_map(|f| f.get("id").and_then(Value::as_str).map(str::to_owned))
        .collect();
    let mut saits = festival_saits(day, &ids, location);
    saits.extend(ceremony_saits(day, location, ceremonies));
    saits
}
