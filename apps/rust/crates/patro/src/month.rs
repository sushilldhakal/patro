//! The BS month grid (`build_month_calendar`, `_month_row_from_panchanga`, `_stamp_month_grid`).

use calendar::BsDate;
use panchanga::daily::{DailyError, Location, build_daily, build_daily_civil, build_daily_light};
use serde_json::{Map, Value, json};
use timescale::CivilDay;

use crate::{
    caches::bs_year_festivals,
    day::{DayBuildOptions, DayError, DetailMode, FestivalMode, SlimMode, build_daily_state},
};

const BS_MONTH_NAMES: [&str; 12] = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush",
    "Magh", "Falgun", "Chaitra",
];
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

/// Whether the grid keeps "international" (World day) observances.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum International {
    /// Keep them (the default).
    #[default]
    Include,
    /// Drop them (`exclude_international=true`).
    Exclude,
}

/// Whether each row of a month grid embeds the day's full state (`full=true`), and
/// whether that embed is trimmed (`slim=true`, `slim_month_payload`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Embed {
    /// The lite grid.
    #[default]
    Lite,
    /// `full=true`: `build_daily_state(include_festivals=True, include_detail=False)`.
    Full,
    /// `full=true&slim=true`.
    FullSlim,
}

/// `MONTH_EMBED_SLIM_DROP_KEYS`.
const MONTH_EMBED_SLIM_DROP_KEYS: [&str; 10] = [
    "rashifal",
    "muhurta",
    "hora",
    "hora_day",
    "choghadiya",
    "tarabala_table",
    "chandrabala_table",
    "nivas_shool",
    "planets_anchor",
    "festivals",
];

/// Python truthiness of a JSON value.
fn truthy(v: Option<&Value>) -> bool {
    match v {
        None | Some(Value::Null) => false,
        Some(Value::Bool(b)) => *b,
        Some(Value::Object(m)) => !m.is_empty(),
        Some(Value::Array(a)) => !a.is_empty(),
        Some(Value::String(s)) => !s.is_empty(),
        Some(Value::Number(n)) => n.as_f64().is_some_and(|f| f != 0.0),
    }
}

/// Which month grid a row belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Grid {
    Bs,
    Gregorian,
}

/// The `full=true` embed of one row, trimmed when slim. The BS grid
/// (`_month_row_from_panchanga`) re-copies the sunrise row's `lunar_calendar` and
/// `lunar_month` into it; the Gregorian grid does not.
fn embed_for(day: CivilDay, location: &Location, raw: &Value, embed: Embed, grid: Grid) -> Value {
    let options = DayBuildOptions {
        detail: DetailMode::Exclude,
        slim: SlimMode::Keep,
        // `build_daily_state_civil(include_festivals=False)` for a Julian Day day.
        festivals: if day.is_datetime_range() {
            FestivalMode::Plain
        } else {
            FestivalMode::Exclude
        },
    };
    let mut state = build_daily_state(day, location, raw, options);
    if let Value::Object(fields) = &mut state {
        for key in ["lunar_calendar", "lunar_month"] {
            if grid == Grid::Bs && truthy(raw.get(key)) {
                fields.insert(key.into(), raw[key].clone());
            }
        }
        if embed == Embed::FullSlim {
            for key in MONTH_EMBED_SLIM_DROP_KEYS {
                fields.shift_remove(key);
            }
            if truthy(fields.get("udaya_lagna")) {
                fields.shift_remove("lagna_spans");
            }
        }
    }
    state
}

/// How much of a day's panchanga a month row needs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum RawDetail {
    /// Only what the row itself reads: no heavy blocks to build and throw away.
    Light,
    /// Everything, for rows that embed the panchanga.
    Full,
}

impl RawDetail {
    fn for_embed(embed: Embed) -> Self {
        if embed == Embed::Lite {
            Self::Light
        } else {
            Self::Full
        }
    }
}

/// `_panchanga_for_patro_day`: the CE builder for a `datetime` day, the signed-axis
/// builder (with the patro date the caller already knows) for any other. A row that
/// carries no embedded panchanga reads only the light payload, which skips the
/// blocks that cost the most and a row discards.
pub(crate) fn patro_day_raw(
    day: CivilDay,
    location: &Location,
    bs: BsDate,
    detail: RawDetail,
) -> Result<Value, DailyError> {
    if day.is_datetime_range() {
        if detail == RawDetail::Light {
            build_daily_light(day, location)
        } else {
            build_daily(day, location)
        }
    } else {
        build_daily_civil(day, location, bs)
    }
}

/// Surya Siddhanta year-axis limits (`browse_limits()` under the Surya Siddhanta).
#[must_use]
pub fn browse_limits() -> Value {
    json!({
        "signed_year_min": -3_891_138, "signed_year_max": 17053, "ephemeris_signed_min": -3_891_137,
        "ephemeris_signed_max": 17052, "ad_year_min": 1, "ad_year_max": 16995, "bc_year_min": 1,
        "bc_year_max": 3_891_194, "bbs_url_year_max": 3_891_137, "festival_stack_min_year": 60,
    })
}

/// `ayana_kranti_mark`.
pub(crate) fn ayana_mark(aayan: &Value) -> &'static str {
    match aayan["kranti_mark"].as_str() {
        Some("उ") => "उ",
        Some("द") => "द",
        _ if aayan["name"] == "Uttarayana" => "उ",
        _ if aayan["name_ne"]
            .as_str()
            .is_some_and(|n| n.contains("उत्तर")) =>
        {
            "उ"
        }
        _ => "द",
    }
}

fn festival_names(day_festivals: &[Value], international: International) -> Value {
    let exclude_international = international == International::Exclude;
    Value::Array(
        day_festivals
            .iter()
            .filter(|f| !(exclude_international && f["category"] == "international"))
            .filter_map(|f| {
                [&f["name_ne"], &f["name_en"], &f["name"]]
                    .into_iter()
                    .find_map(|v| v.as_str().filter(|s| !s.is_empty()))
                    .map(|s| json!(s))
            })
            .collect(),
    )
}

fn abhijit_window(p: &Value) -> Option<Value> {
    let ab = &p["muhurta"]["abhijit"];
    let (start, end) = (ab["start_time"].as_str()?, ab["end_time"].as_str()?);
    if start.is_empty() || end.is_empty() {
        return None;
    }
    let mut out = Map::new();
    out.insert("start_time".into(), json!(start));
    out.insert("end_time".into(), json!(end));
    if let Some(noon) = ab["solar_noon"].as_str().filter(|s| !s.is_empty()) {
        out.insert("solar_noon".into(), json!(noon));
    }
    Some(Value::Object(out))
}

/// `_month_row_from_panchanga` without the `full` embed.
fn row(
    bs_day: u32,
    date_ad: &str,
    p: &Value,
    festivals: &[Value],
    international: International,
) -> Value {
    let get = |block: &str, key: &str| p[block][key].clone();
    let moon = |key: &str, field: &str| p[key].get(field).cloned().unwrap_or(Value::Null);
    let mut r = Map::new();
    for (k, v) in [
        ("day", json!(bs_day)),
        ("date_ad", json!(date_ad)),
        ("weekday", get("vaara", "name_ne")),
        ("weekday_en", get("vaara", "name_english")),
        ("weekday_ne", get("vaara", "name_ne")),
        ("tithi", get("tithi", "name")),
        ("tithi_ne", get("tithi", "name_ne")),
        ("paksha", get("paksha", "name")),
        ("paksha_ne", get("paksha", "name_ne")),
        ("nakshatra", get("nakshatra", "name")),
        ("nakshatra_ne", get("nakshatra", "name_ne")),
        ("yoga", get("yoga", "name")),
        ("yoga_ne", get("yoga", "name_ne")),
        ("karana", get("karana", "name")),
        ("karana_ne", get("karana", "name_ne")),
        ("chandra_rashi", get("chandra_rashi", "name")),
        ("chandra_rashi_ne", get("chandra_rashi", "name_ne")),
        ("sunrise", get("sunrise", "local_time_short")),
        ("sunset", get("sunset", "local_time_short")),
        ("aayan", get("aayan", "name")),
        ("aayan_ne", get("aayan", "name_ne")),
        ("ayana_mark", json!(ayana_mark(&p["aayan"]))),
        ("moonrise", moon("moonrise", "local_time_short")),
        ("moonrise_local", moon("moonrise", "local")),
        ("moonset", moon("moonset", "local_time_short")),
        ("moonset_local", moon("moonset", "local")),
        ("festivals", festival_names(festivals, international)),
    ] {
        r.insert(k.to_owned(), v);
    }
    if let Some(ab) = abhijit_window(p) {
        r.insert("abhijit".into(), ab);
    }
    Value::Object(r)
}

/// Why a month grid could not be built.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum MonthError {
    /// Bad input (400 with this detail).
    BadRequest(String),
    /// Not ported to Rust yet (the caller should answer 501).
    NotPorted(&'static str),
}

impl From<DailyError> for MonthError {
    fn from(e: DailyError) -> Self {
        match e {
            DailyError::BeforeGregorian(_) => Self::NotPorted("days before 1582-10-15"),
            other => Self::BadRequest(other.to_string()),
        }
    }
}

impl From<calendar::BsError> for MonthError {
    fn from(e: calendar::BsError) -> Self {
        Self::BadRequest(e.to_string())
    }
}

/// `build_month_calendar(bs_year, bs_month, location, full=…)`, stamped (`slim` applied).
///
/// # Errors
///
/// [`MonthError::BadRequest`] for an invalid month; [`MonthError::NotPorted`] for years
/// whose days fall before 1582-10-15.
pub fn month_calendar(
    bs_year: i32,
    bs_month: u32,
    location: &Location,
    international: International,
    embed: Embed,
) -> Result<Value, MonthError> {
    if !(1..=12).contains(&bs_month) {
        return Err(MonthError::BadRequest("bs_month must be 1..12".into()));
    }
    let start = calendar::month_start(bs_year, bs_month)?;
    let length = calendar::month_length(bs_year, bs_month)?;
    let year_start = calendar::month_start(bs_year, 1)?;
    let year_end = calendar::month_start(bs_year + 1, 1)?.add_days(-1);
    let with_festivals =
        bs_year >= 60 && year_start.is_datetime_range() && year_end.is_datetime_range();
    let festivals = if with_festivals {
        Some(bs_year_festivals(bs_year, location))
    } else {
        None
    };
    let mut rows = Vec::with_capacity(length as usize);
    let mut mid_lunar = Value::Null;
    for offset in 0..length {
        let day = start.add_days(i32::try_from(offset).unwrap_or(0));
        let bs = BsDate {
            year: bs_year,
            month: bs_month,
            day: offset + 1,
        };
        let p = patro_day_raw(day, location, bs, RawDetail::for_embed(embed))?;
        let todays = festivals
            .as_ref()
            .map(|f| f.on_day(day))
            .unwrap_or_default();
        let mut r = row(offset + 1, &day.to_string(), &p, &todays, international);
        if embed != Embed::Lite
            && let Value::Object(fields) = &mut r
        {
            fields.insert(
                "panchanga".into(),
                embed_for(day, location, &p, embed, Grid::Bs),
            );
        }
        rows.push(r);
        if offset + 1 == length.min(15) {
            mid_lunar = p["lunar_month"].clone();
        }
    }
    let mut out = Map::new();
    out.insert("year_bs".into(), json!(bs_year));
    out.insert("month_bs".into(), json!(bs_month));
    out.insert(
        "month_name".into(),
        json!(BS_MONTH_NAMES[bs_month as usize - 1]),
    );
    out.insert(
        "month_name_ne".into(),
        json!(BS_MONTH_NAMES_NE[bs_month as usize - 1]),
    );
    out.insert("month_start_ad".into(), json!(start.to_string()));
    out.insert("month_length".into(), json!(length));
    out.insert("lunar_month".into(), mid_lunar["name"].clone());
    out.insert("lunar_month_full".into(), mid_lunar["full_name"].clone());
    out.insert(
        "lunar_month_is_adhik".into(),
        mid_lunar.get("is_adhik").cloned().unwrap_or(json!(false)),
    );
    out.insert("lunar_month_type".into(), mid_lunar["type"].clone());
    out.insert("location".into(), location.as_json());
    out.insert("calendar".into(), Value::Array(rows));
    out.insert("grid_mode".into(), json!("full_panchanga"));
    if bs_year <= -1 {
        out.insert("era".into(), json!("bbs"));
        out.insert("bbs".into(), json!(-bs_year));
    }
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "a weekday index is 0-6"
    )]
    let first_weekday = ((start.to_jd_ut() + 0.5) % 7.0) as u32;
    out.insert("first_weekday".into(), json!(first_weekday));
    out.insert("limits".into(), browse_limits());
    Ok(Value::Object(out))
}

/// `instant_row_from_date`: one clock-mode grid row from the at-time payload at
/// `clock` on `day` (no `festivals` yet; Python adds them after `panchanga`).
fn instant_row(
    day: CivilDay,
    bs_day: u32,
    clock: &str,
    location: &Location,
) -> Result<Map<String, Value>, MonthError> {
    let snap = crate::at_time::at_time_on_day(day, clock, location).map_err(|e| match e {
        DayError::NotPorted(_) => MonthError::NotPorted("clock= month grids before 1582-10-15"),
        other => MonthError::BadRequest(other.to_string()),
    })?;
    let name = |block: &str, key: &str| snap[block].get(key).cloned().unwrap_or(Value::Null);
    let sun = |key: &str| snap["sun"].get(key).cloned().unwrap_or(Value::Null);
    let mut r = Map::new();
    for (k, v) in [
        ("day", json!(bs_day)),
        ("date_ad", json!(day.to_string())),
        ("weekday", snap["weekday"].clone()),
        ("weekday_ne", snap["weekday"].clone()),
        ("weekday_en", snap["weekday_en"].clone()),
        ("tithi", snap["tithi"]["name"].clone()),
        ("tithi_ne", name("tithi", "name_ne")),
        ("nakshatra", snap["nakshatra"]["name"].clone()),
        ("nakshatra_ne", name("nakshatra", "name_ne")),
        ("yoga", snap["yoga"]["name"].clone()),
        ("yoga_ne", name("yoga", "name_ne")),
        ("karana", snap["karana"]["name"].clone()),
        ("karana_ne", name("karana", "name_ne")),
        ("sunrise", sun("sunrise")),
        ("sunset", sun("sunset")),
        ("mode", json!("ephemeris")),
        ("query_instant", snap["query_instant"].clone()),
    ] {
        r.insert(k.to_owned(), v);
    }
    let abhijit = match snap.get("abhijit") {
        Some(a) if truthy(Some(a)) => a.clone(),
        _ => snap["muhurta"]["abhijit"].clone(),
    };
    let text = |key: &str| {
        abhijit
            .get(key)
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
    };
    let abhijit_row = match (text("start_time"), text("end_time")) {
        (Some(start), Some(end)) => {
            let mut ab = Map::new();
            ab.insert("start_time".into(), json!(start));
            ab.insert("end_time".into(), json!(end));
            if let Some(noon) = abhijit.get("solar_noon").filter(|v| truthy(Some(v))) {
                ab.insert("solar_noon".into(), noon.clone());
            }
            Some(Value::Object(ab))
        }
        _ => None,
    };
    r.insert("panchanga".into(), snap);
    if let Some(ab) = abhijit_row {
        r.insert("abhijit".into(), ab);
    }
    Ok(r)
}

/// `build_month_calendar_at_clock`: the BS month grid in ephemeris mode, each day's
/// panchanga read at the civil `clock` (`?clock=HH:MM`).
///
/// # Errors
///
/// [`MonthError::BadRequest`] for a bad month or clock, [`MonthError::NotPorted`]
/// for days before 1582-10-15.
pub fn month_calendar_at_clock(
    bs_year: i32,
    bs_month: u32,
    location: &Location,
    clock: &str,
    international: International,
    embed: Embed,
) -> Result<Value, MonthError> {
    if !(1..=12).contains(&bs_month) {
        return Err(MonthError::BadRequest("bs_month must be 1..12".into()));
    }
    let start = calendar::month_start(bs_year, bs_month)?;
    let length = calendar::month_length(bs_year, bs_month)?;
    let year_start = calendar::month_start(bs_year, 1)?;
    let year_end = calendar::month_start(bs_year + 1, 1)?.add_days(-1);
    let festivals =
        (bs_year >= 60 && year_start.is_datetime_range() && year_end.is_datetime_range())
            .then(|| bs_year_festivals(bs_year, location));
    let mut rows = Vec::with_capacity(length as usize);
    for offset in 0..length {
        let day = start.add_days(i32::try_from(offset).unwrap_or(0));
        let mut r = instant_row(day, offset + 1, clock, location)?;
        let todays = festivals
            .as_ref()
            .map(|f| f.on_day(day))
            .unwrap_or_default();
        r.insert("festivals".into(), festival_names(&todays, international));
        match embed {
            Embed::Lite => {
                r.shift_remove("panchanga");
            }
            Embed::FullSlim => {
                if let Some(Value::Object(fields)) = r.get_mut("panchanga") {
                    for key in MONTH_EMBED_SLIM_DROP_KEYS {
                        fields.shift_remove(key);
                    }
                    if truthy(fields.get("udaya_lagna")) {
                        fields.shift_remove("lagna_spans");
                    }
                }
            }
            Embed::Full => {}
        }
        rows.push(Value::Object(r));
    }
    let mid = start.add_days(i32::try_from(length.min(15)).unwrap_or(1) - 1);
    let mid_raw = patro_day_raw(
        mid,
        location,
        BsDate {
            year: bs_year,
            month: bs_month,
            day: length.min(15),
        },
        RawDetail::Light,
    )?;
    let lunar = &mid_raw["lunar_month"];
    let mut out = Map::new();
    out.insert("year_bs".into(), json!(bs_year));
    out.insert("month_bs".into(), json!(bs_month));
    out.insert(
        "month_name".into(),
        json!(BS_MONTH_NAMES[bs_month as usize - 1]),
    );
    out.insert(
        "month_name_ne".into(),
        json!(BS_MONTH_NAMES_NE[bs_month as usize - 1]),
    );
    out.insert("month_start_ad".into(), json!(start.to_string()));
    out.insert("month_length".into(), json!(length));
    out.insert("lunar_month".into(), lunar["name"].clone());
    out.insert("lunar_month_full".into(), lunar["full_name"].clone());
    out.insert(
        "lunar_month_is_adhik".into(),
        lunar.get("is_adhik").cloned().unwrap_or(json!(false)),
    );
    out.insert("lunar_month_type".into(), lunar["type"].clone());
    out.insert("location".into(), location.as_json());
    out.insert("mode".into(), json!("ephemeris"));
    out.insert("clock".into(), json!(clock));
    out.insert("calendar".into(), Value::Array(rows));
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "a weekday index is 0-6"
    )]
    let first_weekday = ((start.to_jd_ut() + 0.5) % 7.0) as u32;
    out.insert("first_weekday".into(), json!(first_weekday));
    out.insert("limits".into(), browse_limits());
    Ok(Value::Object(out))
}

/// The civil day a BS date falls on (used by callers to check ranges).
#[must_use]
pub fn civil_day_ok(day: CivilDay) -> bool {
    day.is_datetime_range()
}

/// `patro_year_supports_gregorian_festival_rules`, on the ported (1582+) range.
fn festival_rules_apply(bs_year: i32) -> Result<bool, MonthError> {
    let year_start = calendar::month_start(bs_year, 1)?;
    let year_end = calendar::month_start(bs_year + 1, 1)?.add_days(-1);
    Ok(bs_year >= 60 && year_start.is_datetime_range() && year_end.is_datetime_range())
}

/// The BS years a Gregorian month touches, and their festivals, one occurrence each
/// (by id and start date: a festival recurs in each BS year).
fn gregorian_month_festivals(
    start: CivilDay,
    end: CivilDay,
    location: &Location,
) -> Result<(Vec<i32>, Vec<Value>), MonthError> {
    let (first_bs, last_bs) = (
        calendar::locate_patro_day(start)?,
        calendar::locate_patro_day(end)?,
    );
    let mut bs_years = vec![first_bs.year];
    if last_bs.year != first_bs.year {
        bs_years.push(last_bs.year);
    }
    let mut festivals: Vec<Value> = Vec::new();
    let mut seen: Vec<(String, String)> = Vec::new();
    for &bs_year in &bs_years {
        if !festival_rules_apply(bs_year)? {
            continue;
        }
        for f in bs_year_festivals(bs_year, location).iter() {
            let occurrence = (
                f["id"].as_str().unwrap_or_default().to_owned(),
                f.get("start_date")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_owned(),
            );
            if !seen.contains(&occurrence) {
                seen.push(occurrence);
                festivals.push(f.clone());
            }
        }
    }
    Ok((bs_years, festivals))
}

const AD_MONTH_NAMES: [&str; 12] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

/// A Gregorian browse era: `ad` (CE) or `bc` (BCE, BC 1 = astronomical year 0).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GregorianEra {
    /// `era=ad`.
    Ad,
    /// `era=bc`.
    Bc,
}

/// `build_ad_month_calendar`: [`gregorian_month_calendar`] for `ad`.
///
/// # Errors
///
/// As [`gregorian_month_calendar`].
pub fn ad_month_calendar(
    ad_year: i32,
    ad_month: u32,
    location: &Location,
    international: International,
    embed: Embed,
) -> Result<Value, MonthError> {
    gregorian_month_calendar(
        GregorianEra::Ad,
        ad_year,
        ad_month,
        location,
        international,
        embed,
    )
}

/// `build_gregorian_browse_month_calendar`: a Gregorian (Julian before 1582-10-15)
/// month with each day's BS date, stamped.
///
/// Two Python bugs are fixed here (`scripts/rust_divergences.py`): a BC December
/// ended at January of the *previous* astronomical year (month length −700, an
/// empty grid), and a month whose middle day has no `datetime` was named by a
/// cut ISO string (`"1500-02"`, `"-0044-0"`) instead of its English name.
///
/// # Errors
///
/// [`MonthError::BadRequest`] for an invalid month or a day off the patro axis.
#[expect(
    clippy::too_many_lines,
    reason = "field-for-field mapping of the Python grid payload"
)]
pub fn gregorian_month_calendar(
    era: GregorianEra,
    browse_year: i32,
    browse_month: u32,
    location: &Location,
    international: International,
    embed: Embed,
) -> Result<Value, MonthError> {
    if !(1..=12).contains(&browse_month) {
        return Err(MonthError::BadRequest("month must be 1..12".into()));
    }
    let astro = match era {
        GregorianEra::Ad => browse_year,
        GregorianEra::Bc => 1 - browse_year,
    };
    let start = CivilDay::new(astro, browse_month, 1);
    let next = if browse_month == 12 {
        CivilDay::new(astro + 1, 1, 1)
    } else {
        CivilDay::new(astro, browse_month + 1, 1)
    };
    #[expect(clippy::cast_possible_truncation, reason = "a month is 28-31 days")]
    let length = (next.to_jd_ut() - start.to_jd_ut()).round() as i32;
    let start = CivilDay::from_jd_ut(start.to_jd_ut());
    let end = start.add_days(length - 1);
    let (bs_years, festivals) = gregorian_month_festivals(start, end, location)?;
    let festivals = festivals::FestivalList::new(festivals);
    let mut rows = Vec::with_capacity(usize::try_from(length).unwrap_or(31));
    let mut mid_lunar = Value::Null;
    for offset in 0..length {
        let day = start.add_days(offset);
        let bs = calendar::locate_patro_day(day)?;
        let p = patro_day_raw(day, location, bs, RawDetail::for_embed(embed))?;
        let todays = if day.is_datetime_range() {
            festivals.on_day(day)
        } else {
            Vec::new()
        };
        let base = row(day.day, &day.to_string(), &p, &todays, international);
        let mut r = Map::new();
        r.insert("day".into(), json!(day.day));
        r.insert("date_ad".into(), json!(day.to_string()));
        r.insert("day_bs".into(), json!(bs.day));
        r.insert("month_bs".into(), json!(bs.month));
        r.insert("year_bs".into(), json!(bs.year));
        if let Value::Object(fields) = base {
            for (k, v) in fields {
                if k != "day" && k != "date_ad" {
                    r.insert(k, v);
                }
            }
        }
        if embed != Embed::Lite {
            r.insert(
                "panchanga".into(),
                embed_for(day, location, &p, embed, Grid::Gregorian),
            );
        }
        rows.push(Value::Object(r));
        if offset == 14.min(length - 1) {
            mid_lunar = p["lunar_month"].clone();
        }
    }
    let label = AD_MONTH_NAMES[start.add_days(14.min(length - 1)).month as usize - 1];
    let mut out = Map::new();
    out.insert(
        "era".into(),
        json!(if era == GregorianEra::Ad { "ad" } else { "bc" }),
    );
    out.insert("month_ad".into(), json!(browse_month));
    out.insert(
        "year_bs".into(),
        if bs_years.len() == 1 {
            json!(bs_years[0])
        } else {
            Value::Null
        },
    );
    out.insert("month_bs".into(), Value::Null);
    out.insert("month_name".into(), json!(label));
    out.insert("month_name_ne".into(), json!(label));
    out.insert("month_start_ad".into(), json!(start.to_string()));
    out.insert("month_length".into(), json!(length));
    out.insert("lunar_month".into(), mid_lunar["name"].clone());
    out.insert("lunar_month_full".into(), mid_lunar["full_name"].clone());
    out.insert(
        "lunar_month_is_adhik".into(),
        mid_lunar.get("is_adhik").cloned().unwrap_or(json!(false)),
    );
    out.insert("lunar_month_type".into(), mid_lunar["type"].clone());
    out.insert("location".into(), location.as_json());
    out.insert("calendar".into(), Value::Array(rows));
    out.insert(
        if era == GregorianEra::Ad {
            "year_ad"
        } else {
            "year_bc"
        }
        .into(),
        json!(browse_year),
    );
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "a weekday index is 0-6"
    )]
    let first_weekday = ((start.to_jd_ut() + 0.5).rem_euclid(7.0)) as u32;
    out.insert("first_weekday".into(), json!(first_weekday));
    out.insert("limits".into(), browse_limits());
    Ok(Value::Object(out))
}
