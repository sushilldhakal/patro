//! The scored rashifal (`engine/jyotish/rashifal_engine.py`) and its windows
//! (`services/jyotish/rashifal_api.py`): daily, the Aitabar→Sanibar week, the BS
//! month and the BS year (sampled every three days), all read at the observer's
//! own sunrise.

mod frame;
mod layers;
mod payload;
mod personal;
mod personal_tables;
mod tables;
mod text;

use calendar::{BsDate, civil_to_bs, month_length, month_start};
use panchanga::{
    RASHI_NAMES, RASHI_NAMES_NE,
    daily::{DailyError, Location},
};
use serde_json::{Map, Value, json};
use timescale::CivilDay;

use crate::Graha;
use frame::{DayFrame, Hora, build_day_frame};
use payload::{aggregate_sign, frame_summary, ingresses, method_block, sign_payload};
pub use personal::NatalChart;

/// Days between samples in a yearly sweep.
const YEARLY_SAMPLE_STEP: usize = 3;

/// `BS_MONTH_NAMES`.
const BS_MONTH_NAMES: [&str; 12] = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush",
    "Magh", "Falgun", "Chaitra",
];
/// `BS_MONTH_NAMES_NEPALI`.
const BS_MONTH_NAMES_NE: [&str; 12] = [
    "बैशाख",
    "जेठ",
    "आषाढ",
    "श्रावण",
    "भाद्र",
    "आश्विन",
    "कार्तिक",
    "मंसिर",
    "पौष",
    "माघ",
    "फाल्गुन",
    "चैत्र",
];

/// The window a rashifal reads.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Period {
    /// The anchor day.
    Daily,
    /// The Aitabar→Sanibar week containing it.
    Weekly,
    /// The BS month containing it.
    Monthly,
    /// The BS year containing it.
    Yearly,
}

impl Period {
    /// `period=` as the query names it.
    #[must_use]
    pub fn parse(text: &str) -> Option<Self> {
        match text {
            "daily" => Some(Self::Daily),
            "weekly" => Some(Self::Weekly),
            "monthly" => Some(Self::Monthly),
            "yearly" => Some(Self::Yearly),
            _ => None,
        }
    }

    const fn index(self) -> usize {
        self as usize
    }

    /// The query spelling.
    #[must_use]
    pub const fn key(self) -> &'static str {
        match self {
            Self::Daily => "daily",
            Self::Weekly => "weekly",
            Self::Monthly => "monthly",
            Self::Yearly => "yearly",
        }
    }

    /// `_INGRESS_GRAHAS[period]`.
    const fn ingress_grahas(self) -> &'static [Graha] {
        match self {
            Self::Daily => &[],
            Self::Weekly => &[Graha::Moon, Graha::Mercury, Graha::Venus, Graha::Sun],
            Self::Monthly => &[Graha::Sun, Graha::Mercury, Graha::Venus, Graha::Mars],
            Self::Yearly => &[
                Graha::Jupiter,
                Graha::Saturn,
                Graha::Rahu,
                Graha::Ketu,
                Graha::Mars,
            ],
        }
    }
}

/// The five navatara tones, worst first (`TONE_RANK`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Tone {
    Worst,
    Bad,
    Neutral,
    Good,
    Best,
}

impl Tone {
    /// `tone_for_score`.
    pub(crate) fn for_score(score: f64) -> Self {
        if score >= 0.45 {
            Self::Best
        } else if score >= 0.15 {
            Self::Good
        } else if score > -0.15 {
            Self::Neutral
        } else if score > -0.45 {
            Self::Bad
        } else {
            Self::Worst
        }
    }

    pub(crate) fn from_key(key: &str) -> Self {
        match key {
            "worst" => Self::Worst,
            "bad" => Self::Bad,
            "good" => Self::Good,
            "best" => Self::Best,
            _ => Self::Neutral,
        }
    }

    pub(crate) const fn rank(self) -> usize {
        self as usize
    }

    pub(crate) const fn key(self) -> &'static str {
        tables::TONE_KEYS[self as usize]
    }

    /// `_TONE_SCORE`.
    pub(crate) const fn score(self) -> f64 {
        match self {
            Self::Best => 1.0,
            Self::Good => 0.5,
            Self::Neutral => 0.0,
            Self::Bad => -0.5,
            Self::Worst => -1.0,
        }
    }
}

/// Why a rashifal could not be built.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[non_exhaustive]
pub enum RashifalError {
    /// A sunrise could not be found, or the day is outside the ported range.
    #[error(transparent)]
    Daily(#[from] DailyError),
    /// The BS calendar has no such month.
    #[error(transparent)]
    Calendar(#[from] calendar::BsError),
}

/// Monday = 0, as `date.weekday()`.
#[expect(
    clippy::cast_possible_truncation,
    reason = "a Julian Day Number is positive and fits"
)]
fn weekday(day: CivilDay) -> i32 {
    ((day.to_jd_ut() + 0.5) as i64 % 7) as i32
}

/// `_week_start`: the Sunday on or before `day`.
fn week_start(day: CivilDay) -> CivilDay {
    day.add_days(-((weekday(day) + 1) % 7))
}

/// `_bs_label` of the engine: `"2083 मंसिर 5"`, or `None` off the BS table.
pub(crate) fn bs_label_text(day: CivilDay) -> Option<String> {
    civil_to_bs(day).ok().map(|bs| {
        format!(
            "{} {} {}",
            bs.year,
            BS_MONTH_NAMES_NE[bs.month as usize - 1],
            bs.day
        )
    })
}

/// `_bs_label` of the service: the BS date fields of a payload.
fn bs_label(day: CivilDay) -> Result<Value, RashifalError> {
    let bs = civil_to_bs(day)?;
    let m = bs.month as usize - 1;
    Ok(json!({
        "bs_year": bs.year, "bs_month": bs.month, "bs_day": bs.day,
        "bs_month_name_ne": BS_MONTH_NAMES_NE[m], "bs_month_name_en": BS_MONTH_NAMES[m],
    }))
}

fn merge(out: &mut Map<String, Value>, value: Value) {
    if let Value::Object(fields) = value {
        out.extend(fields);
    }
}

/// `_frames_for_range`: every `step` days from `start`, plus `end` itself.
fn frames_for_range(
    start: CivilDay,
    end: CivilDay,
    location: &Location,
    step: usize,
) -> Result<Vec<DayFrame>, RashifalError> {
    let mut frames = Vec::new();
    let mut current = start;
    let step = i32::try_from(step).unwrap_or(1);
    while current <= end {
        frames.push(build_day_frame(current, location, Hora::Skip)?);
        current = current.add_days(step);
    }
    if frames.last().is_some_and(|f| f.date != end) {
        frames.push(build_day_frame(end, location, Hora::Skip)?);
    }
    Ok(frames)
}

/// `_aggregate`.
fn aggregate(period: Period, frames: &[DayFrame], sample_step: usize) -> Map<String, Value> {
    let mid = &frames[frames.len() / 2];
    let moon = mid.moon_sign();
    let mut out = Map::new();
    out.insert("period".into(), json!(period.key()));
    out.insert("anchor".into(), json!("sunrise"));
    out.insert("range_start_ad".into(), json!(frames[0].date.to_string()));
    out.insert(
        "range_end_ad".into(),
        json!(frames[frames.len() - 1].date.to_string()),
    );
    out.insert("days_computed".into(), json!(frames.len()));
    out.insert("moon_index".into(), json!(moon));
    out.insert("moon_label".into(), json!(RASHI_NAMES_NE[moon]));
    out.insert("moon_label_en".into(), json!(RASHI_NAMES[moon]));
    out.insert(
        "signs".into(),
        Value::Array((0..12).map(|r| aggregate_sign(r, frames, period)).collect()),
    );
    out.insert("frame".into(), frame_summary(mid));
    out.insert(
        "ingress".into(),
        ingresses(frames, period.ingress_grahas(), None),
    );
    out.insert(
        "method".into(),
        method_block(period, sample_step, frames.len()),
    );
    out
}

/// The civil days of a BS month (`iter_bs_month_civil_days`).
fn bs_month_days(bs_year: i32, bs_month: u32) -> Result<Vec<CivilDay>, RashifalError> {
    let start = month_start(bs_year, bs_month)?;
    let length = month_length(bs_year, bs_month)?;
    Ok((0..length)
        .map(|offset| start.add_days(i32::try_from(offset).unwrap_or(0)))
        .collect())
}

/// `compute_janma_from_instant`: (nakshatra 1–27, Moon rashi 1–12) at a birth instant.
#[must_use]
pub fn janma(instant: timescale::UtcInstant) -> (u32, i64) {
    janma_at_jd(instant.to_jd())
}

/// [`janma`] at a Julian Day (a birth before 1582-10-15 is a `UtInstant`).
#[must_use]
pub fn janma_at_jd(jd: f64) -> (u32, i64) {
    let moon = astronomy::engine::moon_longitude(jd);
    (
        panchanga::nakshatra(jd).number,
        panchanga::pyfloat::py_int(moon / 30.0) % 12 + 1,
    )
}

/// `rashifal_for_gregorian(greg, location, period=…)`: the scored rashifal for the
/// window `period` places around `day`.
///
/// # Errors
///
/// [`RashifalError`] when a sunrise cannot be found or the BS calendar ends.
pub fn rashifal_for_day(
    day: CivilDay,
    location: &Location,
    period: Period,
) -> Result<Value, RashifalError> {
    match period {
        Period::Daily => {
            let frame = build_day_frame(day, location, Hora::Include)?;
            let moon = frame.moon_sign();
            let mut out = Map::new();
            out.insert("period".into(), json!("daily"));
            out.insert("anchor".into(), json!("sunrise"));
            out.insert("date_ad".into(), json!(day.to_string()));
            merge(&mut out, bs_label(day)?);
            out.insert("vaara_num".into(), json!(frame.vaara_num));
            out.insert("moon_index".into(), json!(moon));
            out.insert("moon_label".into(), json!(RASHI_NAMES_NE[moon]));
            out.insert("moon_label_en".into(), json!(RASHI_NAMES[moon]));
            out.insert(
                "signs".into(),
                Value::Array(
                    (0..12)
                        .map(|r| sign_payload(&frame, r, Period::Daily))
                        .collect(),
                ),
            );
            out.insert("frame".into(), frame_summary(&frame));
            out.insert("method".into(), method_block(Period::Daily, 1, 1));
            Ok(Value::Object(out))
        }
        Period::Weekly => {
            let start = week_start(day);
            let frames = frames_for_range(start, start.add_days(6), location, 1)?;
            let mut out = aggregate(Period::Weekly, &frames, 1);
            merge(&mut out, bs_label(start)?);
            Ok(Value::Object(out))
        }
        Period::Monthly => {
            let bs = civil_to_bs(day)?;
            let frames = bs_month_days(bs.year, bs.month)?
                .into_iter()
                .map(|d| build_day_frame(d, location, Hora::Skip))
                .collect::<Result<Vec<_>, _>>()?;
            let mut out = aggregate(Period::Monthly, &frames, 1);
            let m = bs.month as usize - 1;
            out.insert("bs_year".into(), json!(bs.year));
            out.insert("bs_month".into(), json!(bs.month));
            out.insert("bs_month_name_ne".into(), json!(BS_MONTH_NAMES_NE[m]));
            out.insert("bs_month_name_en".into(), json!(BS_MONTH_NAMES[m]));
            Ok(Value::Object(out))
        }
        Period::Yearly => {
            let BsDate { year, .. } = civil_to_bs(day)?;
            let start = month_start(year, 1)?;
            let end = month_start(year + 1, 1)?.add_days(-1);
            let frames = frames_for_range(start, end, location, YEARLY_SAMPLE_STEP)?;
            let mut out = aggregate(Period::Yearly, &frames, YEARLY_SAMPLE_STEP);
            out.insert("bs_year".into(), json!(year));
            Ok(Value::Object(out))
        }
    }
}

/// `personal_rashifal_for_gregorian(natal, greg, location, period=…)`: the same windows
/// as [`rashifal_for_day`], read against one birth chart. `as_of` (UTC, normally now)
/// is when the Vimshottari dasha is read.
///
/// # Errors
///
/// [`RashifalError`] when a sunrise cannot be found or the BS calendar ends.
pub fn personal_rashifal_for_day(
    natal: &NatalChart,
    day: CivilDay,
    location: &Location,
    period: Period,
    as_of: timescale::UtcInstant,
) -> Result<Value, RashifalError> {
    let tail = |out: &mut Map<String, Value>, frames: &[DayFrame]| {
        out.insert("period".into(), json!(period.key()));
        out.insert("anchor".into(), json!("sunrise"));
        out.insert("range_start_ad".into(), json!(frames[0].date.to_string()));
        out.insert(
            "range_end_ad".into(),
            json!(frames[frames.len() - 1].date.to_string()),
        );
    };
    match period {
        Period::Daily => {
            let frame = build_day_frame(day, location, Hora::Include)?;
            let mut out = personal::personal_day(natal, &frame, Period::Daily, as_of);
            out.insert("period".into(), json!("daily"));
            out.insert("anchor".into(), json!("sunrise"));
            out.insert("date_ad".into(), json!(day.to_string()));
            merge(&mut out, bs_label(day)?);
            out.insert("method".into(), method_block(Period::Daily, 1, 1));
            Ok(Value::Object(out))
        }
        Period::Weekly => {
            let start = week_start(day);
            let frames = frames_for_range(start, start.add_days(6), location, 1)?;
            let mut out = personal::personal_window(natal, &frames, Period::Weekly, as_of);
            merge(&mut out, bs_label(start)?);
            tail(&mut out, &frames);
            out.insert(
                "method".into(),
                method_block(Period::Weekly, 1, frames.len()),
            );
            Ok(Value::Object(out))
        }
        Period::Monthly => {
            let bs = civil_to_bs(day)?;
            let frames = bs_month_days(bs.year, bs.month)?
                .into_iter()
                .map(|d| build_day_frame(d, location, Hora::Skip))
                .collect::<Result<Vec<_>, _>>()?;
            let mut out = personal::personal_window(natal, &frames, Period::Monthly, as_of);
            tail(&mut out, &frames);
            let m = bs.month as usize - 1;
            out.insert("bs_year".into(), json!(bs.year));
            out.insert("bs_month".into(), json!(bs.month));
            out.insert("bs_month_name_ne".into(), json!(BS_MONTH_NAMES_NE[m]));
            out.insert("bs_month_name_en".into(), json!(BS_MONTH_NAMES[m]));
            out.insert(
                "method".into(),
                method_block(Period::Monthly, 1, frames.len()),
            );
            Ok(Value::Object(out))
        }
        Period::Yearly => {
            let BsDate { year, .. } = civil_to_bs(day)?;
            let start = month_start(year, 1)?;
            let end = month_start(year + 1, 1)?.add_days(-1);
            let frames = frames_for_range(start, end, location, YEARLY_SAMPLE_STEP)?;
            let mut out = personal::personal_window(natal, &frames, Period::Yearly, as_of);
            tail(&mut out, &frames);
            out.insert("bs_year".into(), json!(year));
            out.insert(
                "method".into(),
                method_block(Period::Yearly, YEARLY_SAMPLE_STEP, frames.len()),
            );
            Ok(Value::Object(out))
        }
    }
}
