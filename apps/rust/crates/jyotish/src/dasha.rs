//! Vimshottari dasha periods (`engine/jyotish/dasha.py`, `engine/jyotish/vimshottari.py`).
//!
//! Python keeps a birth moment in the birth zone's `ZoneInfo`, and `datetime ±
//! timedelta` between datetimes sharing one `tzinfo` is wall-clock arithmetic (as
//! are their comparisons). So periods here are naive wall-clock instants in that
//! zone, and [`iso`] prints them with the zone's offset at that wall time.

use panchanga::pyfloat::{py_floordiv, py_int, py_mod};
use timescale::{UtcInstant, Zone};

use crate::Graha;

/// `YEAR_DAYS`: the mean Gregorian year every dasha year is.
pub const YEAR_DAYS: f64 = 365.2425;

/// `DASHA_SEQUENCE`.
pub const SEQUENCE: [Graha; 9] = [
    Graha::Ketu,
    Graha::Venus,
    Graha::Sun,
    Graha::Moon,
    Graha::Mars,
    Graha::Rahu,
    Graha::Jupiter,
    Graha::Saturn,
    Graha::Mercury,
];

/// `DASHA_YEARS`.
#[must_use]
pub const fn years(lord: Graha) -> u32 {
    match lord {
        Graha::Ketu | Graha::Mars => 7,
        Graha::Venus => 20,
        Graha::Sun => 6,
        Graha::Moon => 10,
        Graha::Rahu => 18,
        Graha::Jupiter => 16,
        Graha::Saturn => 19,
        Graha::Mercury => 17,
    }
}

/// `DASHA_LORD_NE` (गुरु, मङ्गल — not the `PLANET_NE` spellings).
#[must_use]
pub const fn lord_ne(lord: Graha) -> &'static str {
    match lord {
        Graha::Ketu => "केतु",
        Graha::Venus => "शुक्र",
        Graha::Sun => "सूर्य",
        Graha::Moon => "चन्द्र",
        Graha::Mars => "मङ्गल",
        Graha::Rahu => "राहु",
        Graha::Jupiter => "गुरु",
        Graha::Saturn => "शनि",
        Graha::Mercury => "बुध",
    }
}

fn sequence_index(lord: Graha) -> usize {
    SEQUENCE.iter().position(|g| *g == lord).unwrap_or(0)
}

/// One lord's span, on the birth zone's wall clock.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DashaPeriod {
    /// The dasha lord.
    pub lord: Graha,
    /// Start (wall clock).
    pub start: UtcInstant,
    /// End (wall clock).
    pub end: UtcInstant,
    /// Length in years (mahadashas only).
    pub years: Option<f64>,
}

impl DashaPeriod {
    /// `start <= instant < end`.
    #[must_use]
    pub fn contains(&self, instant: UtcInstant) -> bool {
        self.start <= instant && instant < self.end
    }
}

/// `running`: the period in force at `instant`.
#[must_use]
pub fn running(periods: &[DashaPeriod], instant: UtcInstant) -> Option<&DashaPeriod> {
    periods.iter().find(|p| p.contains(instant))
}

/// `add_years`.
fn add_years(instant: UtcInstant, years: f64) -> UtcInstant {
    instant.add_days_f64(years * YEAR_DAYS)
}

/// A Vimshottari timeline from birth.
#[derive(Debug, Clone, PartialEq)]
pub struct Timeline {
    /// Nakshatra (0–26) of the birth Moon.
    pub nakshatra_index: usize,
    /// The first mahadasha's lord.
    pub mahadasha_lord: Graha,
    /// What is left of the first mahadasha at birth, in years.
    pub balance_years: f64,
    /// Mahadashas from birth.
    pub periods: Vec<DashaPeriod>,
}

/// `vimshottari_timeline(moon_lon, birth, cycles=…)`.
#[must_use]
pub fn vimshottari_timeline(moon_longitude: f64, birth: UtcInstant, cycles: usize) -> Timeline {
    let span = 360.0 / 27.0;
    let lon = py_mod(moon_longitude, 360.0);
    let nakshatra_index = usize::try_from(py_int(py_floordiv(lon, span))).unwrap_or(0);
    let lord = SEQUENCE[nakshatra_index % 9];
    let fraction_elapsed = py_mod(lon, span) / span;
    let balance_years = (1.0 - fraction_elapsed) * f64::from(years(lord));
    let start = sequence_index(lord);
    let first_end = add_years(birth, balance_years);
    let mut periods = vec![DashaPeriod {
        lord,
        start: birth,
        end: first_end,
        years: Some(balance_years),
    }];
    let mut cursor = first_end;
    for step in 1..SEQUENCE.len() * cycles {
        let next = SEQUENCE[(start + step) % SEQUENCE.len()];
        let full = f64::from(years(next));
        let end = add_years(cursor, full);
        periods.push(DashaPeriod {
            lord: next,
            start: cursor,
            end,
            years: Some(full),
        });
        cursor = end;
    }
    Timeline {
        nakshatra_index,
        mahadasha_lord: lord,
        balance_years,
        periods,
    }
}

/// `sub_periods(VIMSHOTTARI, lord, start, end, parent_full_years=…)`: laid out over
/// the parent's full length ending at `end`, those before `start` dropped.
#[must_use]
pub fn sub_periods(
    lord: Graha,
    start: UtcInstant,
    end: UtcInstant,
    parent_full_years: Option<f64>,
) -> Vec<DashaPeriod> {
    let visible_years = end.seconds_since(start) / (YEAR_DAYS * 86400.0);
    let mut full_years = parent_full_years.unwrap_or(visible_years);
    if full_years <= 0.0 {
        full_years = visible_years;
    }
    let mut cursor = end.sub_days_f64(full_years * YEAR_DAYS);
    let first = sequence_index(lord);
    let count = SEQUENCE.len();
    let mut children: Vec<DashaPeriod> = Vec::new();
    for step in 0..count {
        let sub = SEQUENCE[(first + step) % count];
        let length_days = f64::from(years(sub)) * full_years / 120.0 * YEAR_DAYS;
        let child_end = if step == count - 1 {
            end
        } else {
            cursor.add_days_f64(length_days)
        };
        if child_end <= start {
            cursor = child_end;
            continue;
        }
        children.push(DashaPeriod {
            lord: sub,
            start: cursor.max(start),
            end: child_end,
            years: None,
        });
        cursor = child_end;
    }
    if let Some(last) = children.last_mut() {
        last.end = end;
    }
    children
}

/// `datetime.isoformat()` of a wall-clock instant in `zone` (`fold=0` offsets).
#[must_use]
pub fn iso(wall: UtcInstant, zone: &Zone) -> String {
    let (day, h, m, s, us) = wall.fields();
    let utc = zone
        .local_to_utc(day, h, m, s, us)
        .unwrap_or_else(|| wall.add_seconds(-i64::from(zone.reference_offset_seconds())));
    #[expect(
        clippy::cast_possible_truncation,
        reason = "a UTC offset is a few hours of seconds"
    )]
    let offset = wall.seconds_since(utc).round() as i32;
    utc.at_offset(offset).to_string()
}

/// `_format_years_label`: `"1 वर्ष 8 महिना 3 दिन"`.
#[must_use]
pub fn years_label(years: f64) -> String {
    use panchanga::pyfloat::{py_floordiv, py_round_int};
    let total_days = py_round_int(years * YEAR_DAYS);
    let month_days = YEAR_DAYS / 12.0;
    #[expect(clippy::cast_precision_loss, reason = "a few thousand days")]
    let total = total_days as f64;
    let y = py_int(py_floordiv(total, YEAR_DAYS));
    #[expect(clippy::cast_precision_loss, reason = "a handful of years")]
    let rem = total_days - py_round_int(y as f64 * YEAR_DAYS);
    #[expect(clippy::cast_precision_loss, reason = "a few hundred days")]
    let rem_f = rem as f64;
    let m = py_int(py_floordiv(rem_f, month_days));
    #[expect(clippy::cast_precision_loss, reason = "under twelve months")]
    let d = py_round_int(rem_f - m as f64 * month_days);
    let mut parts = Vec::new();
    if y > 0 {
        parts.push(format!("{y} वर्ष"));
    }
    if m > 0 {
        parts.push(format!("{m} महिना"));
    }
    if d > 0 || parts.is_empty() {
        parts.push(format!("{d} दिन"));
    }
    parts.join(" ")
}

/// `vimshottari_dasha(moon_lon, birth_utc, cycles=…)`: the header and the
/// mahadasha sequence (the birth balance as a float, later lords' whole years).
#[must_use]
pub fn vimshottari_payload(
    moon_longitude: f64,
    birth_utc: UtcInstant,
    cycles: usize,
) -> serde_json::Value {
    use serde_json::json;
    let utc = Zone::get("UTC").unwrap_or_else(|_| Zone::kathmandu());
    let t = vimshottari_timeline(moon_longitude, birth_utc, cycles);
    let sequence: Vec<serde_json::Value> = t
        .periods
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let years = if i == 0 {
                json!(t.balance_years)
            } else {
                json!(self::years(p.lord))
            };
            json!({
                "lord": p.lord.key(), "lord_ne": lord_ne(p.lord),
                "start": iso(p.start, &utc), "end": iso(p.end, &utc), "years": years,
            })
        })
        .collect();
    json!({
        "nakshatra_index": t.nakshatra_index,
        "mahadasha_lord": t.mahadasha_lord.key(),
        "mahadasha_lord_ne": lord_ne(t.mahadasha_lord),
        "balance_years": t.balance_years,
        "balance_label": years_label(t.balance_years),
        "sequence": sequence,
    })
}

/// A dasha system's cycle for sub-periods: lord names, their years and Nepali names.
#[derive(Debug, Clone, Copy)]
pub struct System {
    /// Lord keys in cycle order.
    pub keys: &'static [&'static str],
    /// Full years per lord, in the same order.
    pub years: &'static [f64],
    /// Nepali names, in the same order.
    pub names_ne: &'static [&'static str],
    /// The cycle's length in years.
    pub cycle_years: f64,
}

/// `VIMSHOTTARI`.
pub const VIMSHOTTARI: System = System {
    keys: &[
        "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
    ],
    years: &[7.0, 20.0, 6.0, 10.0, 7.0, 18.0, 16.0, 19.0, 17.0],
    names_ne: &["केतु", "शुक्र", "सूर्य", "चन्द्र", "मङ्गल", "राहु", "गुरु", "शनि", "बुध"],
    cycle_years: 120.0,
};

/// `YOGINI`.
pub const YOGINI: System = System {
    keys: &[
        "mangala", "pingala", "dhanya", "bhramari", "bhadrika", "ulka", "siddha", "sankata",
    ],
    years: &[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
    names_ne: &[
        "मङ्गला",
        "पिङ्गला",
        "धन्या",
        "भ्रमरी",
        "भाद्रिका",
        "उल्का",
        "सिद्धा",
        "संकटा",
    ],
    cycle_years: 36.0,
};

/// An instant with the fixed UTC offset its Python `datetime` carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Aware {
    /// The instant.
    pub utc: UtcInstant,
    /// Its `tzinfo` offset, seconds east of UTC.
    pub offset: i64,
}

impl Aware {
    /// `isoformat()`.
    #[must_use]
    pub fn iso(self) -> String {
        self.utc
            .at_offset(i32::try_from(self.offset).unwrap_or(0))
            .to_string()
    }
}

/// `sub_periods(system, lord, start, end)` on aware datetimes with fixed offsets:
/// (lord index, start, end). `None` when `lord` is not in the cycle
/// (Python's `tuple.index(x): x not in tuple`).
#[must_use]
pub fn sub_periods_aware(
    system: &System,
    lord: &str,
    start: Aware,
    end: Aware,
    parent_full_years: Option<f64>,
) -> Option<Vec<(usize, Aware, Aware)>> {
    let first = system.keys.iter().position(|k| *k == lord)?;
    let visible = end.utc.seconds_since(start.utc) / (YEAR_DAYS * 86400.0);
    let mut full = parent_full_years.unwrap_or(visible);
    if full <= 0.0 {
        full = visible;
    }
    let mut cursor = Aware {
        utc: end.utc.sub_days_f64(full * YEAR_DAYS),
        offset: end.offset,
    };
    let count = system.keys.len();
    let mut children = Vec::new();
    for step in 0..count {
        let i = (first + step) % count;
        let length = system.years[i] * full / system.cycle_years * YEAR_DAYS;
        let child_end = if step == count - 1 {
            end
        } else {
            Aware {
                utc: cursor.utc.add_days_f64(length),
                offset: cursor.offset,
            }
        };
        if child_end.utc <= start.utc {
            cursor = child_end;
            continue;
        }
        let child_start = if cursor.utc >= start.utc {
            cursor
        } else {
            start
        };
        children.push((i, child_start, child_end));
        cursor = child_end;
    }
    if let Some(last) = children.last_mut() {
        last.2 = end;
    }
    Some(children)
}
