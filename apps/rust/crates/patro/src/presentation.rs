//! Printable month views (`services/panchanga/presentation`): the Surya-style patro
//! grid of `/nepal/patro/{bs_year}/{bs_month}`.

use panchanga::daily::Location;
use serde_json::{Value, json};

use crate::{
    day::{DayError, calendar_header},
    month::{Embed, International, MonthError, month_calendar},
};

impl From<DayError> for MonthError {
    fn from(e: DayError) -> Self {
        match e {
            DayError::NotPorted(_) => Self::NotPorted("days before 1582-10-15"),
            other => Self::BadRequest(other.to_string()),
        }
    }
}

/// `build_patro_month` (`to_patro_month(build_month_calendar(...), header=...)`).
///
/// # Errors
///
/// As [`month_calendar`] and [`calendar_header`].
pub fn patro_month(bs_year: i32, bs_month: u32, location: &Location) -> Result<Value, MonthError> {
    let month = month_calendar(
        bs_year,
        bs_month,
        location,
        International::Include,
        Embed::Lite,
    )?;
    let header = calendar_header(bs_year, bs_month, location)?;
    Ok(patro_grid(bs_year, bs_month, &month, &header))
}

fn first_name(list: &[Value]) -> Value {
    list.first().map_or(Value::Null, |f| {
        let name = &f["name"];
        if falsy(name) {
            f["name_en"].clone()
        } else {
            name.clone()
        }
    })
}

/// `to_patro_month(month_payload, header=…)`: rows from the lite grid, or from the
/// embedded day state when the month was built with `full=true`.
pub(crate) fn patro_grid(bs_year: i32, bs_month: u32, month: &Value, header: &Value) -> Value {
    let days: Vec<Value> = month["calendar"]
        .as_array()
        .map(|rows| {
            rows.iter()
                .map(|row| {
                    let names: Vec<Value> =
                        row["festivals"].as_array().cloned().unwrap_or_default();
                    let p = &row["panchanga"];
                    let (tithi, nak, sunrise, festivals): (Value, Value, Value, Vec<Value>) =
                        if falsy(p) {
                            let tithi = row["tithi"].clone();
                            (
                                tithi,
                                row["nakshatra"].clone(),
                                row["sunrise"].clone(),
                                names.iter().map(|n| json!({"name": n})).collect(),
                            )
                        } else {
                            let tithi = tithi_display(&p["tithi"], &p["paksha"])
                                .map_or(Value::Null, Value::String);
                            let nak = if falsy(&p["nakshatra"]) {
                                Value::Null
                            } else {
                                p["nakshatra"]["name"].clone()
                            };
                            let sunrise = or(&p["sun"]["sunrise"], &row["sunrise"]).clone();
                            (
                                tithi,
                                nak,
                                sunrise,
                                p["festivals"].as_array().cloned().unwrap_or_default(),
                            )
                        };
                    let label = if names.is_empty() {
                        first_name(&festivals)
                    } else {
                        first_name(&names.iter().map(|n| json!({"name": n})).collect::<Vec<_>>())
                    };
                    let festival_names: Vec<Value> = if names.is_empty() {
                        festivals
                            .iter()
                            .filter(|f| !falsy(&f["name"]))
                            .map(|f| f["name"].clone())
                            .collect()
                    } else {
                        names
                    };
                    json!({
                        "bs_day": row["day"], "ad_date": row["date_ad"],
                        "weekday": row["weekday_en"], "weekday_ne": row["weekday"],
                        "tithi": tithi, "tithi_ne": row["tithi_ne"],
                        "nakshatra": nak, "sunrise": sunrise, "sunset": row["sunset"],
                        "festival": label,
                        "festivals": festival_names,
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    let falsy_s = |v: &Value| v.is_null() || v.as_str().is_some_and(str::is_empty);
    let shaka = if falsy_s(&header["shaka_sambat"]) {
        Value::Null
    } else {
        header["shaka_sambat"].clone()
    };
    json!({
        "bs_year": bs_year,
        "bs_month": month["month_name"],
        "bs_month_index": bs_month,
        "month_info": {
            "adhik_maas": month.get("lunar_month_is_adhik").cloned().unwrap_or(json!(false)),
            "lunar_month": month["lunar_month"],
            "lunar_month_full": month["lunar_month_full"],
            "days_in_month": month["month_length"],
            "month_start_ad": month["month_start_ad"],
        },
        "header": {
            "shaka": shaka,
            "nepal_sambat": header["nepal_sambat"],
            "bikram_sambat": bs_year.to_string(),
            "ad_month": header["gregorian"],
            "lunar_month": month["lunar_month"],
        },
        "location": month["location"],
        "days": days,
        "meta": {"format": "patro_month", "engine_version": "2.2.0", "view": "printable_grid"},
    })
}

/// The `format=` renderings of `/nepal/patro/{bs_year}/{bs_month}` besides `patro`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MonthStyle {
    /// `canonical`: the patro grid as is.
    Canonical,
    /// `surya`: the patro grid, `meta.format = "surya_month"`.
    Surya,
    /// `toyanath`: Devanagari-first rows (`to_toyanath_month`).
    Toyanath,
    /// `dayblock`: one printable text block per day (`render_month_stream`).
    Dayblock,
}

/// The two print languages of the day blocks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Locale {
    /// English.
    En,
    /// Nepali.
    Ne,
}

/// `build_payload()` for a non-`patro` format.
///
/// # Errors
///
/// As [`month_calendar`] and [`calendar_header`].
pub fn styled_month(
    bs_year: i32,
    bs_month: u32,
    location: &Location,
    style: MonthStyle,
    locale: Locale,
) -> Result<Value, MonthError> {
    match style {
        MonthStyle::Canonical => patro_month(bs_year, bs_month, location),
        MonthStyle::Surya => {
            let mut p = patro_month(bs_year, bs_month, location)?;
            p["meta"]["format"] = json!("surya_month");
            Ok(p)
        }
        MonthStyle::Toyanath => {
            let month = month_calendar(
                bs_year,
                bs_month,
                location,
                International::Include,
                Embed::Lite,
            )?;
            Ok(toyanath_month(&month))
        }
        MonthStyle::Dayblock => {
            let month = month_calendar(
                bs_year,
                bs_month,
                location,
                International::Include,
                Embed::Full,
            )?;
            let header = calendar_header(bs_year, bs_month, location)?;
            Ok(month_stream(&month, &header, location, locale))
        }
    }
}

fn falsy(v: &Value) -> bool {
    match v {
        Value::Null => true,
        Value::Bool(b) => !b,
        Value::String(s) => s.is_empty(),
        Value::Array(a) => a.is_empty(),
        Value::Object(o) => o.is_empty(),
        Value::Number(n) => n.as_f64() == Some(0.0),
    }
}

/// `a or b`.
fn or<'a>(a: &'a Value, b: &'a Value) -> &'a Value {
    if falsy(a) { b } else { a }
}

/// `to_toyanath_month`.
pub(crate) fn toyanath_month(month: &Value) -> Value {
    let rows: Vec<Value> = month["calendar"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|day| {
            let gate = match &day["day"] {
                Value::Null => json!(""),
                v => json!(panchanga::daily::nepali_digits(v)),
            };
            json!({
                "gate": gate,
                "gate_en": day["day"],
                "miti_ad": day["date_ad"],
                "vaara_ne": day["weekday"],
                "tithi_ne": or(&day["tithi_ne"], &day["tithi"]),
                "tithi_en": day["tithi"],
                "nakshatra": day["nakshatra"],
                "sunrise": day["sunrise"],
                "sunset": day["sunset"],
                "parva": day.get("festivals").cloned().unwrap_or_else(|| json!([])),
            })
        })
        .collect();
    json!({
        "meta": {"format": "toyanath", "view": "monthly_patro", "derived_from": "patro_month"},
        "shirshak": {
            "bs_year": month["year_bs"],
            "bs_month": month["month_bs"],
            "mahina_ne": month["month_name_ne"],
            "mahina_en": month["month_name"],
            "chandra_mahina": month["lunar_month"],
            "adhik": month.get("lunar_month_is_adhik").cloned().unwrap_or(json!(false)),
            "sthan": month["location"]["name"],
        },
        "panktiharu": rows,
    })
}

const DAY_SEPARATOR: &str = "────────────────────";

fn label(locale: Locale, en: &'static str, ne: &'static str) -> &'static str {
    if locale == Locale::Ne { ne } else { en }
}

/// `_pick(locale, ne, en)`.
fn pick<'a>(locale: Locale, ne: &'a Value, en: &'a Value) -> Option<&'a str> {
    let (first, second) = if locale == Locale::Ne {
        (ne, en)
    } else {
        (en, ne)
    };
    or(first, second).as_str().filter(|s| !s.is_empty())
}

fn text(v: &Value) -> Option<&str> {
    v.as_str().filter(|s| !s.is_empty())
}

/// `end_time_hhmm`.
pub(crate) fn end_time(stamp: &Value) -> Option<String> {
    let s = text(stamp)?;
    if let Some((_, t)) = s.split_once(' ') {
        return Some(t.to_owned());
    }
    if s.len() >= 5 && s.as_bytes().get(2) == Some(&b':') {
        return s.get(..5).map(str::to_owned);
    }
    Some(s.to_owned())
}

/// `muhurta_window`.
pub(crate) fn window(block: &Value) -> Option<String> {
    Some(format!(
        "{}-{}",
        text(&block["start_time"])?,
        text(&block["end_time"])?
    ))
}

/// `tithi_display_name`.
pub(crate) fn tithi_display(tithi: &Value, paksha: &Value) -> Option<String> {
    let name = text(&tithi["name"])?;
    let Some(p) = text(paksha) else {
        return Some(name.to_owned());
    };
    let label = if p.to_lowercase().contains("shukla") {
        "Shukla"
    } else {
        "Krishna"
    };
    Some(format!("{label} {name}"))
}

fn sun_line(sunrise: Option<&str>, sunset: Option<&str>, locale: Locale) -> String {
    let (r, s) = (sunrise.unwrap_or("-"), sunset.unwrap_or("-"));
    if locale == Locale::Ne {
        format!("सूर्योदय {r} | सूर्यास्त {s}")
    } else {
        format!("Sunrise {r} | Sunset {s}")
    }
}

fn named_line(
    locale: Locale,
    en: &'static str,
    ne: &'static str,
    name: Option<&str>,
    end: Option<&str>,
) -> String {
    let l = label(locale, en, ne);
    match (name, end) {
        (None, _) => format!("{l}: -"),
        (Some(n), Some(e)) => format!("{l}: {n} ({} {e})", label(locale, "ends", "समाप्त")),
        (Some(n), None) => format!("{l}: {n}"),
    }
}

/// `_tithi_without_paksha`.
fn tithi_without_paksha(name: Option<&str>, paksha: Option<&str>) -> Option<String> {
    let name = name?;
    for prefix in ["Shukla ", "Krishna ", "शुक्ल ", "कृष्ण "] {
        if let Some(rest) = name.strip_prefix(prefix) {
            return Some(rest.to_owned());
        }
    }
    if let Some(p) = paksha
        && name.to_lowercase().starts_with(&p.to_lowercase())
    {
        let rest: String = name.chars().skip(p.chars().count()).collect();
        return Some(rest.trim_matches(|c| c == ' ' || c == ',').to_owned());
    }
    Some(name.to_owned())
}

/// `_paksha_tithi_line`.
fn paksha_line(paksha: Option<&str>, tithi: Option<&str>, locale: Locale) -> String {
    match (paksha, tithi) {
        (None, None) => "-".into(),
        (Some(p), Some(t)) if locale == Locale::Ne => format!("{p}, {t}"),
        (Some(p), Some(t)) => {
            let p_en = if p.contains("Paksha") {
                p.to_owned()
            } else {
                format!("{p} Paksha")
            };
            format!("{p_en}, {t}")
        }
        (p, t) => p.or(t).unwrap_or("-").to_owned(),
    }
}

/// `render_day_block_from_state`: the canonical day as one print block.
#[expect(
    clippy::too_many_lines,
    reason = "one line of the print block after another"
)]
pub(crate) fn day_block(state: &Value, location: &Location, locale: Locale) -> String {
    let paksha_en = &state["paksha"];
    let tithi = &state["tithi"];
    let tithi_name_v = tithi_display(tithi, paksha_en).map_or(Value::Null, Value::String);
    let bs_day = text(&state["date_bs"])
        .and_then(|s| {
            let parts: Vec<&str> = s.split('-').collect();
            (parts.len() == 3).then(|| {
                let d = parts[2].trim_start_matches('0');
                if d.is_empty() {
                    parts[2].to_owned()
                } else {
                    d.to_owned()
                }
            })
        })
        .unwrap_or_else(|| "-".into());
    let bs_day = if locale == Locale::Ne {
        panchanga::daily::nepali_digits(&bs_day)
    } else {
        bs_day
    };
    let month_label = text(&state["lunar_month"]["name"])
        .or_else(|| text(&state["bs_date"]["month_name"]))
        .unwrap_or("-");
    let paksha = pick(locale, &state["paksha_ne"], paksha_en);
    let tithi_only = tithi_without_paksha(pick(locale, &tithi["name_ne"], &tithi_name_v), paksha);
    let nak = &state["nakshatra"];
    let yoga = &state["yoga"];
    let karana = &state["karana"];
    let muhurta = &state["muhurta"];
    let sun = &state["sun"];
    let mut lines = vec![
        format!("{bs_day}, {month_label}"),
        paksha_line(paksha, tithi_only.as_deref(), locale),
        String::new(),
        sun_line(text(&sun["sunrise"]), text(&sun["sunset"]), locale),
        format!(
            "{}: {}",
            label(locale, "Moon", "चन्द्र"),
            pick(locale, &state["chandra_rashi_ne"], &state["chandra_rashi"]).unwrap_or("-")
        ),
        named_line(
            locale,
            "Nakshatra",
            "नक्षत्र",
            pick(locale, &nak["name_ne"], &nak["name"]),
            end_time(&nak["end"]).as_deref(),
        ),
        String::new(),
        format!(
            "{} {}: {}",
            label(locale, "Tithi", "तिथि"),
            label(locale, "ends", "समाप्त"),
            end_time(&tithi["end"]).as_deref().unwrap_or("-")
        ),
        named_line(
            locale,
            "Yoga",
            "योग",
            pick(locale, &yoga["name_ne"], &yoga["name"]),
            end_time(&yoga["end"]).as_deref(),
        ),
        format!(
            "{}: {}",
            label(locale, "Karana", "करण"),
            pick(locale, &karana["name_ne"], &karana["name"]).unwrap_or("-")
        ),
        String::new(),
    ];
    for (key, en, ne) in [
        ("rahu_kalam", "Rahu Kalam", "राहु काल"),
        ("yamaganda", "Yamaganda", "यमगण्ड"),
        ("gulika", "Gulika", "गुलिक"),
    ] {
        lines.push(format!(
            "{}: {}",
            label(locale, en, ne),
            window(&muhurta[key]).as_deref().unwrap_or("-")
        ));
    }
    if let Some(w) = window(&muhurta["abhijit"]) {
        lines.push(format!("{}: {w}", label(locale, "Abhijit", "अभिजित")));
    }
    // `_festival_line` over `festival_list(festivals)`.
    if let Some(fests) = state["festivals"].as_array().filter(|f| !f.is_empty()) {
        let listed: Vec<(Value, Value)> = fests
            .iter()
            .map(|f| {
                let name = or(&f["name"], &f["name_en"]);
                let name = if name.is_null() {
                    json!("")
                } else {
                    name.clone()
                };
                let ne = if falsy(&f["name_ne"]) {
                    Value::Null
                } else {
                    f["name_ne"].clone()
                };
                (name, ne)
            })
            .collect();
        let names: Vec<&str> = listed
            .iter()
            .filter_map(|(en, ne)| pick(locale, ne, en))
            .collect();
        let fest = label(locale, "Festival", "पर्व");
        if names.is_empty() {
            if let Some(primary) = listed.first().and_then(|(en, _)| text(en)) {
                lines.extend([String::new(), format!("{fest}: {primary}")]);
            }
        } else {
            lines.extend([String::new(), format!("{fest}: {}", names.join(", "))]);
        }
    }
    let mut special = Vec::new();
    let lunar = &state["lunar_month"];
    if lunar["is_adhik"].as_bool() == Some(true) {
        special.push(label(locale, "Adhik Maas", "अधिक मास").to_owned());
    }
    if lunar["type"] == "kshaya" {
        special.push(label(locale, "Kshaya Maas", "क्षय मास").to_owned());
    }
    if let Some(day) = text(&state["date_ad"]).and_then(crate::festivals::parse_iso_day)
        && let Ok(events) = crate::festivals::sankrantis_on_date(day, &location.zone)
        && let Some(ev) = events.first()
    {
        let sign = pick(locale, &ev["to_rashi_ne"], &ev["to_rashi"]).unwrap_or("");
        let ts = text(&ev["timestamp"]["local_display"]).unwrap_or("");
        special.push(format!(
            "{}: {sign} ({ts})",
            label(locale, "Sankranti", "सङ्क्रान्ति")
        ));
    }
    if !special.is_empty() {
        lines.push(String::new());
        lines.extend(special);
    }
    lines.join("\n").trim_end().to_owned()
}

/// `_compact_day_block`: a lite row's block.
fn compact_block(row: &Value, month_name: Option<&str>, locale: Locale) -> String {
    let day = match &row["day"] {
        Value::Null => "None".to_owned(),
        v if locale == Locale::Ne => panchanga::daily::nepali_digits(v),
        v => v.to_string(),
    };
    let tithi = if locale == Locale::Ne {
        text(&row["tithi_ne"]).unwrap_or("None").to_owned()
    } else {
        text(&row["tithi"]).unwrap_or("-").to_owned()
    };
    let mut lines = vec![
        format!("{day}, {}", month_name.unwrap_or("-")),
        tithi,
        String::new(),
        sun_line(text(&row["sunrise"]), text(&row["sunset"]), locale),
        format!(
            "{}: {}",
            label(locale, "Nakshatra", "नक्षत्र"),
            text(&row["nakshatra"]).unwrap_or("-")
        ),
    ];
    let fests: Vec<&str> = row["festivals"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    if !fests.is_empty() {
        lines.extend([
            String::new(),
            format!("{}: {}", label(locale, "Festival", "पर्व"), fests.join(", ")),
        ]);
    }
    lines.join("\n")
}

/// `render_month_stream(month, header=…, locale=…)`.
pub(crate) fn month_stream(
    month: &Value,
    header: &Value,
    location: &Location,
    locale: Locale,
) -> Value {
    let month_name = pick(locale, &month["month_name_ne"], &month["month_name"]);
    let year = &month["year_bs"];
    let name = month_name.unwrap_or("None");
    let title = if locale == Locale::Ne {
        format!("{name} {}", panchanga::daily::nepali_digits(year))
    } else {
        format!("{name} {year}")
    };
    let blocks: Vec<String> = month["calendar"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|row| {
            let state = &row["panchanga"];
            if falsy(state) {
                return compact_block(row, month_name, locale);
            }
            let mut state = state.clone();
            if falsy(&state["festivals"]) && !falsy(&row["festivals"]) {
                let fests: Vec<Value> = row["festivals"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .map(|n| json!({"name": n}))
                    .collect();
                state["festivals"] = Value::Array(fests);
            }
            day_block(&state, location, locale)
        })
        .collect();
    let header_text = format!("📅 {title}");
    let sep = format!("\n\n{DAY_SEPARATOR}\n\n");
    let full = if blocks.is_empty() {
        header_text
    } else {
        format!("{header_text}{sep}{}", blocks.join(&sep))
    };
    json!({
        "meta": {
            "format": "dayblock_month",
            "locale": if locale == Locale::Ne { "ne" } else { "en" },
            "engine_version": "2.2.0",
            "view": "linear_panchanga_stream",
        },
        "header": {
            "title": title,
            "bs_year": year,
            "bs_month": month["month_bs"],
            "month_name": month_name,
            "lunar_month": month["lunar_month"],
            "location": month["location"]["name"],
            "shaka": header["shaka_sambat"],
            "nepal_sambat": header["nepal_sambat"],
            "gregorian": header["gregorian"],
        },
        "days": blocks,
        "text": full,
    })
}

/// `generate_ad_month_patro(ad_year, ad_month, location)`: every day's daily panchanga
/// with the festivals active on it, both BS years' occurrences kept once each.
///
/// # Errors
///
/// [`MonthError::BadRequest`] for a month off the BS table; [`MonthError::NotPorted`]
/// before 1582-10-15.
pub fn ad_month_patro(
    ad_year: i32,
    ad_month: u32,
    location: &Location,
) -> Result<Value, MonthError> {
    use timescale::CivilDay;
    let first = CivilDay::new(ad_year, ad_month, 1);
    let next = if ad_month == 12 {
        CivilDay::new(ad_year + 1, 1, 1)
    } else {
        CivilDay::new(ad_year, ad_month + 1, 1)
    };
    let last = next.add_days(-1);
    let bs_of = |d: CivilDay| {
        calendar::civil_to_bs(d)
            .map(|b| b.year)
            .map_err(|e| MonthError::BadRequest(e.to_string()))
    };
    let mut years = vec![bs_of(first)?, bs_of(last)?];
    years.dedup();
    let mut seen: Vec<(String, String)> = Vec::new();
    let mut rows: Vec<Value> = Vec::new();
    for y in years {
        for f in crate::caches::bs_year_festivals(y, location).iter() {
            let key = (
                f["id"].as_str().unwrap_or("").to_owned(),
                f["start_date"].as_str().unwrap_or("").to_owned(),
            );
            if !seen.contains(&key) {
                seen.push(key);
                rows.push(f.clone());
            }
        }
    }
    let covers = |row: &Value, day: CivilDay| {
        let parse = |k: &str| row[k].as_str().and_then(crate::festivals::parse_iso_day);
        matches!((parse("start_date"), parse("end_date")), (Some(a), Some(b)) if a <= day && day <= b)
    };
    let mut days = Vec::new();
    let mut day = first;
    while day <= last {
        let daily = panchanga::daily::build_daily(day, location).map_err(|e| match e {
            panchanga::daily::DailyError::BeforeGregorian(_) => {
                MonthError::NotPorted("days before 1582-10-15")
            }
            other => MonthError::BadRequest(other.to_string()),
        })?;
        let mut m = serde_json::Map::new();
        m.insert("date_ad".into(), json!(day.to_string()));
        if let Value::Object(fields) = daily {
            m.extend(fields);
        }
        m.insert("_from_cache".into(), json!(false));
        let active: Vec<Value> = rows.iter().filter(|r| covers(r, day)).cloned().collect();
        m.insert(
            "festivals".into(),
            Value::Array(festivals::filter_redundant_day_festivals(active)),
        );
        days.push(Value::Object(m));
        day = day.add_days(1);
    }
    Ok(json!({"ad_year": ad_year, "ad_month": ad_month, "count": days.len(), "days": days}))
}
