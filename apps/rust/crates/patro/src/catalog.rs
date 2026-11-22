//! Catalog routes: cities, documents, per-element views, and meta endpoints.

use std::path::Path;

use astronomy::{
    System,
    engine::{moon_longitude, rise_set_after},
    surya_siddhanta::{Body, Crossing},
};
use geography::{Cities, CitiesError};
use panchanga::{
    KARANA_NAMES, Paksha,
    daily::{DailyError, Location, build_daily},
    karana, karana_end, karana_start, moon_rashi_end, nakshatra, nakshatra_end, nakshatra_start,
    tithi, tithi_end, tithi_start, yoga, yoga_end, yoga_start,
};
use serde_json::{Map, Value, json};
use timescale::{CivilDay, JdInstant, PyInstant, UtcInstant, Zone};

pub use crate::catalog_documents::DocumentsService;
use crate::month::browse_limits;

/// `services.platform.payload_version.compose(65)`.
pub const CACHE_PAYLOAD_VERSION: i64 = 6506;
/// `api.meta.OFFLINE_MAX_SPAN_YEARS`.
pub const OFFLINE_MAX_SPAN_YEARS: i64 = 90;
/// Cache directive for `/meta/capabilities`.
pub const CAPABILITIES_CACHE_CONTROL: &str =
    "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

const NAKSHATRA_NAMES_NE: [&str; 27] = [
    "अश्विनी",
    "भरणी",
    "कृत्तिका",
    "रोहिणी",
    "मृगशिरा",
    "आर्द्रा",
    "पुनर्वसु",
    "पुष्य",
    "आश्लेषा",
    "मघा",
    "पूर्वाफाल्गुनी",
    "उत्तराफाल्गुनी",
    "हस्त",
    "चित्रा",
    "स्वाती",
    "विशाखा",
    "अनुराधा",
    "ज्येष्ठा",
    "मूल",
    "पूर्वाषाढा",
    "उत्तराषाढा",
    "श्रवण",
    "धनिष्ठा",
    "शतभिषा",
    "पूर्वभाद्रपदा",
    "उत्तरभाद्रपदा",
    "रेवती",
];
const YOGA_NAMES_NE: [&str; 27] = [
    "विष्कुम्भ",
    "प्रीति",
    "आयुष्मान",
    "सौभाग्य",
    "शोभन",
    "अतिगण्ड",
    "सुकर्मा",
    "धृति",
    "शूल",
    "गण्ड",
    "वृद्धि",
    "ध्रुव",
    "व्याघात",
    "हर्षण",
    "वज्र",
    "सिद्धि",
    "व्यतीपात",
    "वरीयान",
    "परिघ",
    "शिव",
    "सिद्ध",
    "साध्य",
    "शुभ",
    "शुक्ल",
    "ब्रह्म",
    "इन्द्र",
    "वैधृति",
];
const KARANA_NAMES_NE: [&str; 11] = [
    "बव",
    "बालव",
    "कौलव",
    "तैतिल",
    "गर",
    "वणिज",
    "विष्टि",
    "शकुनि",
    "चतुष्पाद",
    "नाग",
    "किमस्तुघ्न",
];
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
const WEEKDAY_ABBR: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBR: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/// Request failures from catalog endpoints.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[non_exhaustive]
pub enum CatalogError {
    /// Invalid input (400).
    #[error("{0}")]
    BadRequest(String),
    /// Missing resource (404).
    #[error("{0}")]
    NotFound(String),
    /// Dependency unavailable (503).
    #[error("{0}")]
    ServiceUnavailable(String),
    /// Not ported yet (501).
    #[error("{0}")]
    NotImplemented(String),
    /// Unexpected internal failure (500).
    #[error("{0}")]
    Internal(String),
}

impl From<CitiesError> for CatalogError {
    fn from(value: CitiesError) -> Self {
        Self::ServiceUnavailable(value.to_string())
    }
}

impl From<DailyError> for CatalogError {
    fn from(value: DailyError) -> Self {
        match value {
            DailyError::BeforeGregorian(day) => Self::NotImplemented(format!(
                "{day}: days before 1582-10-15 are not ported to Rust yet"
            )),
            other => Self::BadRequest(other.to_string()),
        }
    }
}

impl From<rusqlite::Error> for CatalogError {
    fn from(value: rusqlite::Error) -> Self {
        Self::ServiceUnavailable(value.to_string())
    }
}

/// Documents service for `data_dir`.
#[must_use]
pub fn documents_service(data_dir: &Path) -> DocumentsService {
    DocumentsService::new(data_dir)
}

/// `GET /v1/cities/search`.
///
/// # Errors
///
/// Propagates [`CitiesError`] when the cities database is missing.
pub fn cities_search(
    cities: &Cities,
    query: &str,
    limit: usize,
    country: Option<&str>,
) -> Result<Value, CatalogError> {
    let rows = cities.search(query, limit, country, Some("NP"))?;
    Ok(json!({
        "query": query,
        "count": rows.len(),
        "cities": rows.into_iter().map(|c| c.to_json()).collect::<Vec<_>>(),
    }))
}

/// `GET /v1/cities/nearest`.
///
/// # Errors
///
/// Propagates [`CitiesError`], or [`CatalogError::NotFound`] when no city matches.
pub fn cities_nearest(
    cities: &Cities,
    lat: f64,
    lon: f64,
    country: Option<&str>,
) -> Result<Value, CatalogError> {
    let city = cities
        .nearest_global(lat, lon, 1, country)?
        .ok_or_else(|| CatalogError::NotFound("No city found in database".to_owned()))?;
    Ok(json!({
        "lat": lat,
        "lon": lon,
        "city": city.to_json(),
    }))
}

/// `GET /v1/cities/popular`.
///
/// # Errors
///
/// Propagates [`CitiesError`] when the cities database is missing.
pub fn cities_popular(cities: &Cities) -> Result<Value, CatalogError> {
    let rows = cities.popular()?;
    Ok(json!({
        "count": rows.len(),
        "cities": rows.into_iter().map(|c| c.to_json()).collect::<Vec<_>>(),
    }))
}

/// `GET /meta/capabilities`.
#[must_use]
pub fn capabilities() -> Value {
    let mut out = browse_limits().as_object().cloned().unwrap_or_default();
    out.insert(
        "cache_payload_version".to_owned(),
        Value::from(CACHE_PAYLOAD_VERSION),
    );
    out.insert(
        "offline_max_span_years".to_owned(),
        Value::from(OFFLINE_MAX_SPAN_YEARS),
    );
    Value::Object(out)
}

/// `GET /about`.
#[must_use]
pub fn about() -> Value {
    json!({
        "name": "Surya Panchanga API",
        "version": "2.2.0",
        "repository": "https://github.com/sushilldhakal/patro",
        "calculation_engine": {
            "framework": "The Surya Siddhanta by default, back to the start of Satya Yuga; Drik (Swiss Ephemeris) on request (?siddhanta=drik)",
            "ephemeris": "JPL (NASA's Jet Propulsion Laboratory) — true sidereal Sun/Moon longitudes",
            "ayanamsa": "Lahiri (Chitrapaksha) — standard for Nepali panchanga",
            "sunrise_model": "Geometric horizon, atmospheric refraction 0.5667°",
            "udaya_tithi": "Tithi at local sunrise is used for festival assignment (traditional Nepali panchanga practice)"
        },
        "panchangas": [
            {"name": "Tithi", "name_ne": "तिथि", "division": "12°", "description": "Lunar day — the angular separation between Moon and Sun divided by 12°."},
            {"name": "Nakshatra", "name_ne": "नक्षत्र", "division": "13°20′", "description": "Lunar mansion — the ecliptic divided into 27 equal segments of 13°20′."},
            {"name": "Yoga", "name_ne": "योग", "division": "13°20′", "description": "Sum of the Sun's and Moon's sidereal longitudes divided into 27 equal segments."},
            {"name": "Karana", "name_ne": "करण", "division": "6°", "description": "Half-tithi — the angular separation divided by 6°."},
            {"name": "Vaara", "name_ne": "वार", "division": Value::Null, "description": "Day of the week counted from local sunrise."}
        ],
        "special_months": {
            "adhik_maas": {
                "description": "Extra intercalary lunar month when NO Sankranti falls within a lunar month.",
                "frequency": "Every 32–33 months"
            },
            "kshaya_maas": {
                "description": "Extremely rare 'lost' lunar month when TWO Sankrantis fall within a single lunar month.",
                "frequency": "Approximately once every 141 years",
                "last_occurrence": "BS 2039 (1983 CE) — Poush–Magha",
                "next_predicted": "2124 CE — Poush"
            }
        }
    })
}

/// `GET /v1/panchanga/elements`.
#[must_use]
pub fn elements_list() -> Value {
    Value::Array(
        element_specs()
            .iter()
            .map(|spec| {
                json!({
                    "id": spec.id,
                    "label_ne": spec.label_ne,
                    "label_en": spec.label_en,
                    "kind": spec.kind.as_str(),
                })
            })
            .collect(),
    )
}

/// `GET /v1/panchanga/element/{name}/day/{date_key}`.
///
/// # Errors
///
/// [`CatalogError::BadRequest`] for a bad date key; [`CatalogError::NotFound`] for an unknown element;
/// [`CatalogError::NotImplemented`] for days before the Gregorian reform.
pub fn element_day(
    name: &str,
    date_key: &str,
    era: &str,
    location: &Location,
) -> Result<Value, CatalogError> {
    let spec = element_spec(name)?;
    let day = greg_day_for_date_key(date_key, era)?;
    let daily = daily_for(day, location)?;
    let raw = daily.tree();
    let mut out = Map::new();
    out.insert("element".to_owned(), Value::String(name.to_owned()));
    out.insert(
        "kind".to_owned(),
        Value::String(spec.kind.as_str().to_owned()),
    );
    out.insert(
        "label_ne".to_owned(),
        Value::String(spec.label_ne.to_owned()),
    );
    out.insert(
        "label_en".to_owned(),
        Value::String(spec.label_en.to_owned()),
    );
    out.insert("date_ad".to_owned(), Value::String(day.to_string()));
    out.insert(
        "sunrise".to_owned(),
        raw.get("sunrise")
            .and_then(Value::as_object)
            .and_then(|m| m.get("local_time_short"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    out.insert(
        "sunset".to_owned(),
        raw.get("sunset")
            .and_then(Value::as_object)
            .and_then(|m| m.get("local_time_short"))
            .cloned()
            .unwrap_or(Value::Null),
    );
    out.insert(
        "location".to_owned(),
        raw.get("location").cloned().unwrap_or(Value::Null),
    );
    out.insert("data".to_owned(), spec.extract(raw));
    Ok(Value::Object(out))
}

/// `GET /v1/panchanga/element/{name}/month/{bs_year}/{bs_month}`.
///
/// # Errors
///
/// [`CatalogError::BadRequest`] for an invalid BS month; [`CatalogError::NotFound`] for an unknown element;
/// daily-build errors for out-of-range days.
pub fn element_month(
    name: &str,
    bs_year: i32,
    bs_month: u32,
    location: &Location,
) -> Result<Value, CatalogError> {
    if !(1..=12).contains(&bs_month) {
        return Err(CatalogError::BadRequest(
            "bs_month must be 1–12.".to_owned(),
        ));
    }
    let spec = element_spec(name)?;
    let start = calendar::month_start(bs_year, bs_month)
        .map_err(|e| CatalogError::BadRequest(e.to_string()))?;
    let length = calendar::month_length(bs_year, bs_month)
        .map_err(|e| CatalogError::BadRequest(e.to_string()))?;
    // Python walks the month on `datetime.date`s and answers 404 for a month that
    // starts before 1582-10-15.
    if !start.is_datetime_range() {
        return Err(CatalogError::NotFound(format!(
            "Civil day CivilDay(year={}, month={}, day={}) is outside datetime.date range",
            start.year, start.month, start.day
        )));
    }
    let mut days = Vec::with_capacity(length as usize);
    for i in 0..length {
        let day = start.add_days(i32::try_from(i).unwrap_or(0));
        let daily = daily_for(day, location)?;
        let raw = daily.tree();
        let vaara = raw.get("vaara").and_then(Value::as_object);
        days.push(json!({
            "date_ad": day.to_string(),
            "bs_day": i + 1,
            "weekday_ne": vaara.and_then(|v| v.get("name_ne")).cloned().unwrap_or(Value::Null),
            "weekday_en": vaara.and_then(|v| v.get("name_english")).cloned().unwrap_or(Value::Null),
            "sunrise": raw.get("sunrise").and_then(Value::as_object).and_then(|v| v.get("local_time_short")).cloned().unwrap_or(Value::Null),
            "sunset": raw.get("sunset").and_then(Value::as_object).and_then(|v| v.get("local_time_short")).cloned().unwrap_or(Value::Null),
            "data": spec.extract(raw),
        }));
    }
    Ok(json!({
        "element": name,
        "kind": spec.kind.as_str(),
        "label_ne": spec.label_ne,
        "label_en": spec.label_en,
        "bs_year": bs_year,
        "bs_month": bs_month,
        "start_ad": start.to_string(),
        "location": location.as_json(),
        "days": days,
    }))
}

/// Bounds for element spans.
/// # Errors
///
/// [`CatalogError::BadRequest`] when the query is missing bounds or names an invalid month/era.
pub fn spans_window(
    start_jd: Option<f64>,
    end_jd: Option<f64>,
    era: Option<&str>,
    year: Option<i32>,
    month: Option<u32>,
) -> Result<(f64, f64), CatalogError> {
    if let (Some(start), Some(end)) = (start_jd, end_jd) {
        return Ok((start, end));
    }
    let (Some(era), Some(year), Some(month)) = (era, year, month) else {
        return Err(CatalogError::BadRequest(
            "Provide start_jd & end_jd, or era + year + month.".to_owned(),
        ));
    };
    if !(1..=12).contains(&month) {
        return Err(CatalogError::BadRequest("month must be 1..12".to_owned()));
    }
    era_month_window(era, year, month)
}

/// `GET /v1/panchanga/element/{name}/spans`.
///
/// # Errors
///
/// [`CatalogError::BadRequest`] for table elements or an invalid range;
/// [`CatalogError::NotFound`] for an unknown element.
pub fn element_spans(
    name: &str,
    start_jd: f64,
    end_jd: f64,
    location: &Location,
) -> Result<Value, CatalogError> {
    let spec = element_spec(name)?;
    if spec.kind != ElementKind::Span {
        return Err(CatalogError::BadRequest(format!(
            "Element '{name}' is a {} element — use day/month, not spans.",
            spec.kind.as_str()
        )));
    }
    if end_jd < start_jd {
        return Err(CatalogError::BadRequest(
            "end must not precede start.".to_owned(),
        ));
    }
    if end_jd - start_jd > 400.0 {
        return Err(CatalogError::BadRequest(
            "Range too large (max ~400 days).".to_owned(),
        ));
    }
    let start_day = CivilDay::from_jd_ut(start_jd);
    let end_day = CivilDay::from_jd_ut(end_jd);
    let spans = if start_day.is_datetime_range() && end_day.is_datetime_range() {
        let fns = SpanFns {
            current: spec.current,
            start_of: spec.start_of,
            end_of: spec.end_of,
            lookback_hours: spec.lookback_hours,
        };
        let start = local_midnight_utc(start_day, location)?;
        let end = local_midnight_utc(end_day, location)?.add_seconds(86_400);
        span_rows(name, &fns, start, end, location)
    } else {
        // `local_wall_instant` of a `CivilDay`: midnight in the zone's modern offset.
        let fns = jd_span_fns(spec.id);
        let midnight = |day: CivilDay| {
            let offset_hours = f64::from(location.zone.reference_offset_seconds()) / 3600.0;
            JdInstant(timescale::julday(
                day.year,
                day.month,
                day.day,
                0.0 - offset_hours,
                day.calendar(),
            ))
        };
        let start = midnight(start_day);
        let end = midnight(end_day).add_seconds(86_400);
        span_rows(name, &fns, start, end, location)
    };
    Ok(json!({
        "element": name,
        "kind": "span",
        "label_ne": spec.label_ne,
        "label_en": spec.label_en,
        "timezone": location.zone.name(),
        "location": location.as_json(),
        "window": {"start": start_day.to_string(), "end": end_day.to_string()},
        "spans": spans,
    }))
}

/// The span searches of one element, for one instant kind.
struct SpanFns<I> {
    current: fn(System, I) -> SpanNow,
    start_of: Option<fn(System, I) -> I>,
    end_of: fn(System, I) -> I,
    lookback_hours: f64,
}

/// [`SpanFns`] on Julian Day instants (a range before 1582-10-15).
fn jd_span_fns(id: &str) -> SpanFns<JdInstant> {
    match id {
        "yoga" => SpanFns {
            current: yoga_current,
            start_of: Some(yoga_start),
            end_of: yoga_end,
            lookback_hours: 30.0,
        },
        "tithi" => SpanFns {
            current: tithi_current,
            start_of: Some(tithi_start),
            end_of: tithi_end,
            lookback_hours: 30.0,
        },
        "karana" => SpanFns {
            current: karana_current,
            start_of: Some(karana_start),
            end_of: karana_end,
            lookback_hours: 30.0,
        },
        "chandra-rashi" => SpanFns {
            current: chandra_rashi_current,
            start_of: None,
            end_of: moon_rashi_end,
            lookback_hours: 72.0,
        },
        _ => SpanFns {
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 30.0,
        },
    }
}

/// `element_spans`' walk from `start` to `end`.
fn span_rows<I: PyInstant>(
    name: &str,
    fns: &SpanFns<I>,
    start: I,
    end: I,
    location: &Location,
) -> Vec<Value> {
    let mut spans = Vec::new();
    let mut cursor = start;
    let mut prev_end: Option<I> = None;
    let mut guard = 0_u32;
    while cursor < end && guard < 4000 {
        guard += 1;
        let system = location.system;
        let current = (fns.current)(system, cursor);
        let mut seg_end = (fns.end_of)(system, cursor);
        if seg_end <= cursor {
            seg_end = cursor.add_hours(1);
        }
        let seg_start = if let Some(end) = prev_end {
            end
        } else if let Some(start_of) = fns.start_of {
            start_of(system, cursor)
        } else {
            find_start_generic(system, cursor, fns.current, fns.lookback_hours)
        };
        let mut span = Map::new();
        span.insert("number".to_owned(), Value::from(current.number));
        span.insert("name".to_owned(), Value::String(current.name));
        span.insert("name_ne".to_owned(), Value::String(current.name_ne));
        span.insert("begins".to_owned(), stamp(seg_start, location));
        span.insert("ends".to_owned(), stamp(seg_end, location));
        for (k, v) in current.extra {
            span.insert(k, v);
        }
        if name == "tithi" {
            if let Some(udaya) = tithi_udaya(seg_start, seg_end, location) {
                for (k, v) in udaya {
                    span.insert(k, v);
                }
            }
        }
        spans.push(Value::Object(span));
        prev_end = Some(seg_end);
        cursor = seg_end.add_seconds(1);
    }
    spans
}

/// `GET /documents`.
///
/// # Errors
///
/// [`CatalogError::ServiceUnavailable`] when `documents.db` cannot be opened.
pub fn documents_list(service: &DocumentsService) -> Result<Value, CatalogError> {
    service.list_documents()
}

/// `GET /documents/{slug}`.
///
/// # Errors
///
/// [`CatalogError::NotFound`] for an unknown slug; SQLite open/read failures as 503.
pub fn document_detail(service: &DocumentsService, slug: &str) -> Result<Value, CatalogError> {
    service.document_detail(slug)
}

/// `GET /documents/{slug}/chapters/{chapter_number}`.
///
/// # Errors
///
/// [`CatalogError::NotFound`] for an unknown document/chapter/verse; SQLite failures as 503.
pub fn document_chapter_detail(
    service: &DocumentsService,
    slug: &str,
    chapter_number: i64,
    limit: Option<i64>,
    cursor: Option<i64>,
    direction: &str,
    verse: Option<&str>,
) -> Result<Value, CatalogError> {
    let verse_text = verse.map(str::trim).unwrap_or_default();
    let paged = limit.is_some() || cursor.is_some() || !verse_text.is_empty();
    if paged {
        service.chapter_page(
            slug,
            chapter_number,
            cursor,
            direction,
            limit,
            (!verse_text.is_empty()).then_some(verse_text),
        )
    } else {
        service.chapter_detail(slug, chapter_number)
    }
}

/// `GET /veda/details/{kind}`.
///
/// # Errors
///
/// [`CatalogError::NotFound`] for an unknown detail kind; SQLite failures as 503.
pub fn veda_detail(
    service: &DocumentsService,
    kind: &str,
    value: &str,
    slug: Option<&str>,
    offset: i64,
    limit: i64,
) -> Result<Value, CatalogError> {
    service.veda_detail(kind, value, slug, offset, limit)
}

/// `GET /veda/details/{kind}/values`.
///
/// # Errors
///
/// [`CatalogError::NotFound`] for an unknown detail kind; SQLite failures as 503.
pub fn veda_detail_values(
    service: &DocumentsService,
    kind: &str,
    slug: Option<&str>,
) -> Result<Value, CatalogError> {
    service.veda_detail_values(kind, slug)
}

/// `GET /veda/daily`.
///
/// # Errors
///
/// [`CatalogError::BadRequest`] for a bad date; [`CatalogError::NotFound`] when no mantra is available.
pub fn veda_daily(service: &DocumentsService, day: Option<&str>) -> Result<Value, CatalogError> {
    let day = if let Some(date) = day {
        parse_gregorian_date(date)?
    } else {
        today_nepal()
    };
    service.veda_daily(day)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ElementKind {
    Span,
    Table,
}

impl ElementKind {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Span => "span",
            Self::Table => "table",
        }
    }
}

#[derive(Debug, Clone)]
struct SpanNow {
    number: u32,
    name: String,
    name_ne: String,
    extra: Map<String, Value>,
}

#[derive(Clone, Copy)]
struct ElementSpec {
    id: &'static str,
    key: &'static str,
    label_ne: &'static str,
    label_en: &'static str,
    kind: ElementKind,
    current: fn(System, UtcInstant) -> SpanNow,
    start_of: Option<fn(System, UtcInstant) -> UtcInstant>,
    end_of: fn(System, UtcInstant) -> UtcInstant,
    lookback_hours: f64,
    extract_fn: Option<fn(&Value) -> Value>,
}

impl ElementSpec {
    fn extract(self, raw: &Value) -> Value {
        if let Some(f) = self.extract_fn {
            f(raw)
        } else {
            raw.get(self.key).cloned().unwrap_or(Value::Null)
        }
    }
}

#[expect(
    clippy::too_many_lines,
    reason = "element registry mirrors Python ELEMENTS entries one-for-one"
)]
fn element_specs() -> &'static [ElementSpec] {
    &[
        ElementSpec {
            id: "nakshatra",
            key: "nakshatra",
            label_ne: "नक्षत्र",
            label_en: "Nakshatra",
            kind: ElementKind::Span,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 30.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "yoga",
            key: "yoga",
            label_ne: "योग",
            label_en: "Yoga",
            kind: ElementKind::Span,
            current: yoga_current,
            start_of: Some(yoga_start),
            end_of: yoga_end,
            lookback_hours: 30.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "tithi",
            key: "tithi",
            label_ne: "तिथि",
            label_en: "Tithi",
            kind: ElementKind::Span,
            current: tithi_current,
            start_of: Some(tithi_start),
            end_of: tithi_end,
            lookback_hours: 30.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "karana",
            key: "karana",
            label_ne: "करण",
            label_en: "Karana",
            kind: ElementKind::Span,
            current: karana_current,
            start_of: Some(karana_start),
            end_of: karana_end,
            lookback_hours: 30.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "chandra-rashi",
            key: "chandra_rashi",
            label_ne: "चन्द्र राशि",
            label_en: "Moon sign",
            kind: ElementKind::Span,
            current: chandra_rashi_current,
            start_of: None,
            end_of: moon_rashi_end,
            lookback_hours: 72.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "choghadiya",
            key: "choghadiya",
            label_ne: "चौघडिया",
            label_en: "Choghadiya",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "hora",
            key: "hora",
            label_ne: "होरा",
            label_en: "Hora",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "tarabala",
            key: "tarabala_table",
            label_ne: "ताराबल",
            label_en: "Tarabala",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "chandrabala",
            key: "chandrabala_table",
            label_ne: "चन्द्रबल",
            label_en: "Chandrabala",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "panchaka-rahita",
            key: "panchaka_rahita",
            label_ne: "पञ्चक रहित",
            label_en: "Panchaka Rahita",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "udaya-lagna",
            key: "udaya_lagna",
            label_ne: "उदय लग्न",
            label_en: "Udaya Lagna",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "lagna",
            key: "udaya_lagna",
            label_ne: "लग्न",
            label_en: "Lagna",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: None,
        },
        ElementSpec {
            id: "pushkara",
            key: "udaya_lagna",
            label_ne: "पुष्कर नवांश",
            label_en: "Pushkara Navamsha",
            kind: ElementKind::Table,
            current: nakshatra_current,
            start_of: Some(nakshatra_start),
            end_of: nakshatra_end,
            lookback_hours: 0.0,
            extract_fn: Some(extract_pushkara),
        },
    ]
}

fn element_spec(name: &str) -> Result<ElementSpec, CatalogError> {
    element_specs()
        .iter()
        .copied()
        .find(|spec| spec.id == name)
        .ok_or_else(|| {
            CatalogError::NotFound(format!(
                "Unknown element '{name}'. Available: {}",
                element_specs()
                    .iter()
                    .map(|s| s.id)
                    .collect::<Vec<_>>()
                    .join(", ")
            ))
        })
}

fn extract_pushkara(raw: &Value) -> Value {
    let mut out = Vec::new();
    let Some(entries) = raw.get("udaya_lagna").and_then(Value::as_array) else {
        return Value::Array(out);
    };
    for entry in entries {
        let Some(obj) = entry.as_object() else {
            continue;
        };
        let Some(pushkara) = obj.get("pushkara_navamsha").and_then(Value::as_array) else {
            continue;
        };
        if pushkara.is_empty() {
            continue;
        }
        out.push(json!({
            "lagna": obj.get("name").cloned().unwrap_or(Value::Null),
            "lagna_ne": obj.get("name_ne").cloned().unwrap_or(Value::Null),
            "start_local_time_short": obj.get("start_local_time_short").cloned().unwrap_or(Value::Null),
            "end_local_time_short": obj.get("end_local_time_short").cloned().unwrap_or(Value::Null),
            "pushkara_navamsha": Value::Array(pushkara.clone()),
        }));
    }
    Value::Array(out)
}

fn tithi_current<I: PyInstant>(system: System, at: I) -> SpanNow {
    let t = tithi(system, at.to_jd());
    let mut extra = Map::new();
    extra.insert(
        "paksha".to_owned(),
        Value::String(t.paksha.name().to_owned()),
    );
    SpanNow {
        number: t.display_number,
        name: t.name().to_owned(),
        name_ne: if t.display_number == 15 {
            if t.paksha == Paksha::Shukla {
                "पूर्णिमा".to_owned()
            } else {
                "औंसी".to_owned()
            }
        } else {
            TITHI_NAMES_NE[usize::try_from(t.display_number - 1).unwrap_or(0)].to_owned()
        },
        extra,
    }
}

fn nakshatra_current<I: PyInstant>(system: System, at: I) -> SpanNow {
    let n = nakshatra(system, at.to_jd());
    let mut extra = Map::new();
    extra.insert("progress".to_owned(), Value::from(py_round(n.progress, 4)));
    let idx = usize::try_from(n.number - 1).unwrap_or(0);
    SpanNow {
        number: n.number,
        name: n.name().to_owned(),
        name_ne: NAKSHATRA_NAMES_NE[idx].to_owned(),
        extra,
    }
}

fn yoga_current<I: PyInstant>(system: System, at: I) -> SpanNow {
    let y = yoga(system, at.to_jd());
    let mut extra = Map::new();
    extra.insert("progress".to_owned(), Value::from(py_round(y.progress, 4)));
    let idx = usize::try_from(y.number - 1).unwrap_or(0);
    SpanNow {
        number: y.number,
        name: y.name().to_owned(),
        name_ne: YOGA_NAMES_NE[idx].to_owned(),
        extra,
    }
}

fn karana_current<I: PyInstant>(system: System, at: I) -> SpanNow {
    let k = karana(system, at.to_jd());
    let name = k.name();
    let idx = KARANA_NAMES.iter().position(|n| *n == name).unwrap_or(0);
    SpanNow {
        number: u32::try_from(idx + 1).unwrap_or(0),
        name: name.to_owned(),
        name_ne: KARANA_NAMES_NE[idx].to_owned(),
        extra: Map::new(),
    }
}

fn chandra_rashi_current<I: PyInstant>(system: System, at: I) -> SpanNow {
    #[expect(
        clippy::cast_possible_truncation,
        reason = "rashi index is 0..11 from a truncated longitude"
    )]
    let index = ((moon_longitude(system, at.to_jd()) / 30.0).trunc() as i64).rem_euclid(12);
    let idx = usize::try_from(index).unwrap_or(0);
    SpanNow {
        number: u32::try_from(idx + 1).unwrap_or(1),
        name: RASHI_NAMES[idx].to_owned(),
        name_ne: RASHI_NAMES_NE[idx].to_owned(),
        extra: Map::new(),
    }
}

fn find_start_generic<I: PyInstant>(
    system: System,
    cursor: I,
    current: fn(System, I) -> SpanNow,
    lookback_hours: f64,
) -> I {
    let target = current(system, cursor).number;
    #[expect(
        clippy::cast_possible_truncation,
        reason = "lookback hours convert to whole seconds for the search window"
    )]
    let mut low = cursor.add_seconds(-((lookback_hours * 3600.0) as i64));
    if current(system, low).number == target {
        return low;
    }
    let mut high = cursor;
    for _ in 0..48 {
        let mid = I::midpoint(low, high);
        if current(system, mid).number == target {
            high = mid;
        } else {
            low = mid;
        }
        if high.micros_since(low).unsigned_abs() < 20_000_000 {
            break;
        }
    }
    high
}

fn local_midnight_utc(day: CivilDay, location: &Location) -> Result<UtcInstant, CatalogError> {
    let offset = location.zone.midnight_offset_seconds(day);
    // Match Python `datetime.combine(day, time(), tzinfo=tz)` → exact UTC wall conversion
    // via whole seconds, not JD float division (which can land off by a few microseconds).
    let utc = UtcInstant::from_utc(day, 0, 0, 0, 0).ok_or_else(|| {
        CatalogError::NotImplemented(
            "element spans before 1582-10-15 are not ported to the Rust server yet".to_owned(),
        )
    })?;
    Ok(utc.add_seconds(-i64::from(offset)))
}

fn tithi_udaya<I: PyInstant>(
    begins: I,
    ends: I,
    location: &Location,
) -> Option<Map<String, Value>> {
    let observer = location.observer();
    let mut days = Vec::new();
    let mut rise = rise_set_after(Body::Sun, begins.moment(), &observer, Crossing::Rise)
        .and_then(I::from_moment);
    let mut last_rise = rise;
    while let Some(r) = rise {
        if r >= ends || days.len() >= 3 {
            last_rise = Some(r);
            break;
        }
        let local_day = r.astimezone(&location.zone).day.to_string();
        days.push(Value::String(local_day));
        rise = rise_set_after(
            Body::Sun,
            r.add_seconds(60).moment(),
            &observer,
            Crossing::Rise,
        )
        .and_then(I::from_moment);
        last_rise = rise;
    }
    if days.is_empty() && last_rise.is_none() {
        return None;
    }
    let mut out = Map::new();
    out.insert("udaya_days".to_owned(), Value::Array(days));
    let day_count = out
        .get("udaya_days")
        .and_then(Value::as_array)
        .map_or(0, Vec::len);
    if day_count == 0 {
        out.insert("udaya".to_owned(), Value::String("kshaya".to_owned()));
        if let Some(next_rise) = last_rise {
            out.insert(
                "kshaya_day".to_owned(),
                Value::String(
                    next_rise
                        .add_seconds(-86_400)
                        .astimezone(&location.zone)
                        .day
                        .to_string(),
                ),
            );
        }
    } else if day_count > 1 {
        out.insert("udaya".to_owned(), Value::String("vriddhi".to_owned()));
    }
    Some(out)
}

/// `_stamp`: `astimezone(tz)` read through `isoformat`/`strftime` — a Julian Day
/// instant's `astimezone` returns itself, so its stamp is its UTC clock.
fn stamp<I: PyInstant>(at: I, location: &Location) -> Value {
    let local = at.astimezone(&location.zone);
    let day = local.day;
    let weekday = weekday_index(day);
    let month = usize::try_from(day.month.saturating_sub(1)).unwrap_or(0);
    let hhmm = local.hm;
    json!({
        "iso": local.iso,
        "weekday": WEEKDAY_ABBR[weekday],
        "date_label": format!("{} {:02}", MONTH_ABBR[month], day.day),
        "time_label": hhmm,
        "display": format!("{hhmm} on {} {:02}", MONTH_ABBR[month], day.day),
    })
}

fn weekday_index(day: CivilDay) -> usize {
    #[expect(
        clippy::cast_possible_truncation,
        reason = "weekday index is 0..6 from a floored Julian day"
    )]
    usize::try_from(((day.to_jd_ut() + 1.5).floor() as i64).rem_euclid(7)).unwrap_or(0)
}

fn py_round(value: f64, digits: usize) -> f64 {
    format!("{value:.digits$}").parse().unwrap_or(value)
}

const TITHI_NAMES_NE: [&str; 15] = [
    "प्रतिपदा",
    "द्वितीया",
    "तृतीया",
    "चतुर्थी",
    "पञ्चमी",
    "षष्ठी",
    "सप्तमी",
    "अष्टमी",
    "नवमी",
    "दशमी",
    "एकादशी",
    "द्वादशी",
    "त्रयोदशी",
    "चतुर्दशी",
    "पूर्णिमा",
];

fn daily_for(
    day: CivilDay,
    location: &Location,
) -> Result<std::sync::Arc<panchanga::daily::Daily>, CatalogError> {
    build_daily(day, location).map_err(CatalogError::from)
}

fn parse_gregorian_date(text: &str) -> Result<CivilDay, CatalogError> {
    let (year, month, day) = parse_ymd(text)?;
    let civil = CivilDay::new(year, month, day);
    if year < 1 || !civil.is_datetime_range() {
        return Err(CatalogError::BadRequest(format!(
            "{text} is before 1 CE; address it with ?jd= on a route that supports it"
        )));
    }
    Ok(civil)
}

fn greg_day_for_date_key(date_key: &str, era: &str) -> Result<CivilDay, CatalogError> {
    crate::date_key::greg_day_for_date_key(date_key, era).map_err(CatalogError::BadRequest)
}

fn parse_ymd(text: &str) -> Result<(i32, u32, u32), CatalogError> {
    let trimmed = text.trim();
    let (year_s, month_s, day_s) = if let Some(rest) = trimmed.strip_prefix('-') {
        let parts = rest.split('-').collect::<Vec<_>>();
        if parts.len() != 3 {
            return Err(CatalogError::BadRequest(format!(
                "'{text}' is not a Y-M-D date; use ?jd= or ?year=&month=&day="
            )));
        }
        (
            format!("-{}", parts[0]),
            parts[1].to_owned(),
            parts[2].to_owned(),
        )
    } else {
        let parts = trimmed.split('-').collect::<Vec<_>>();
        if parts.len() != 3 {
            return Err(CatalogError::BadRequest(format!(
                "'{text}' is not a Y-M-D date; use ?jd= or ?year=&month=&day="
            )));
        }
        (
            parts[0].to_owned(),
            parts[1].to_owned(),
            parts[2].to_owned(),
        )
    };
    let year = year_s.parse::<i32>().map_err(|_| {
        CatalogError::BadRequest(format!(
            "'{text}' is not a Y-M-D date; use ?jd= or ?year=&month=&day="
        ))
    })?;
    let month = month_s.parse::<u32>().map_err(|_| {
        CatalogError::BadRequest(format!(
            "'{text}' is not a Y-M-D date; use ?jd= or ?year=&month=&day="
        ))
    })?;
    let day = day_s.parse::<u32>().map_err(|_| {
        CatalogError::BadRequest(format!(
            "'{text}' is not a Y-M-D date; use ?jd= or ?year=&month=&day="
        ))
    })?;
    Ok((year, month, day))
}

fn era_month_window(era: &str, year: i32, month: u32) -> Result<(f64, f64), CatalogError> {
    let start = match era {
        "bs" => calendar::month_start(year, month)
            .map_err(|e| CatalogError::BadRequest(e.to_string()))?,
        "bbs" => {
            if year < 1 {
                return Err(CatalogError::BadRequest(
                    "bbs url year must be 1..3891137 (पू. वि.सं.)".to_owned(),
                ));
            }
            calendar::month_start(-year, month)
                .map_err(|e| CatalogError::BadRequest(e.to_string()))?
        }
        "ad" => CivilDay::new(year, month, 1),
        "bc" => CivilDay::new(1 - year, month, 1),
        _ => {
            return Err(CatalogError::BadRequest(
                "era must be one of ad, bc, bs, bbs".to_owned(),
            ));
        }
    };
    let next = if month < 12 {
        match era {
            "bs" => calendar::month_start(year, month + 1)
                .map_err(|e| CatalogError::BadRequest(e.to_string()))?,
            "bbs" => calendar::month_start(-year, month + 1)
                .map_err(|e| CatalogError::BadRequest(e.to_string()))?,
            "ad" => CivilDay::new(year, month + 1, 1),
            "bc" => CivilDay::new(1 - year, month + 1, 1),
            _ => start,
        }
    } else {
        match era {
            "bs" => calendar::month_start(year + 1, 1)
                .map_err(|e| CatalogError::BadRequest(e.to_string()))?,
            "bbs" => calendar::month_start(-year + 1, 1)
                .map_err(|e| CatalogError::BadRequest(e.to_string()))?,
            "ad" => CivilDay::new(year + 1, 1, 1),
            "bc" => CivilDay::new(1 - (year + 1), 1, 1),
            _ => start,
        }
    };
    Ok((start.to_jd_ut(), next.add_days(-1).to_jd_ut()))
}

fn today_nepal() -> CivilDay {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64());
    let utc_day = CivilDay::from_jd_ut(2_440_587.5 + now / 86400.0);
    let zone = Zone::kathmandu();
    let instant = UtcInstant::from_jd_truncated(utc_day.to_jd_ut() + 0.5).unwrap_or_else(|| {
        UtcInstant::from_utc(CivilDay::new(2000, 1, 1), 0, 0, 0, 0).expect("valid fallback")
    });
    zone.local(instant).day()
}
