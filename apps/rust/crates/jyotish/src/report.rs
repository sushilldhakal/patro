//! The deterministic kundali report (`iter_report` / `build_sections` in
//! `engine/jyotish/interpretation.py`): a meta record, ~25 sections in English or
//! Nepali, each graded by a supports-vs-contradicts confidence, then `done`.
//!
//! Every section is authored per language; only the English confidence factors
//! pass through Python's phrase translator in Nepali (`_localize_text_ne`), whose
//! tables are generated (`scripts/gen_report_tables.py`) and whose `\b` follows
//! Python's `re` (Devanagari vowel signs are not word characters there).

#![expect(
    clippy::fn_params_excessive_bools,
    reason = "every composer takes Python's `ne` language flag one-for-one"
)]

use std::{fmt::Write as _, sync::LazyLock};

use panchanga::pyfloat::py_round_int;
use regex::{Captures, Regex};
use serde_json::{Map, Value, json};
use timescale::UtcInstant;

use crate::{
    Graha,
    chart::{Chart, DUSTHANA, Dignity, KENDRA_TRIKONA, natural_benefic, natural_malefic},
    dasha::{self, DashaPeriod, YEAR_DAYS},
    report_tables::{
        BS_MONTH_NE, DASHA_THEME, DASHA_THEME_NE, DIGNITY_PHRASE, DIGNITY_PHRASE_NE, EN_MONTH_NE,
        HOUSE_THEME, HOUSE_THEME_NE, KARAKA, KARAKA_NE, NAKSHATRA_EN, NAKSHATRA_NE,
        NE_REPLACEMENTS, NE_WORD_MAP, PLAIN_THEME_EN, PLAIN_THEME_NE, PLANET_NE, RASHI_EN,
        RASHI_NE, SIGN_TRAIT_EN, SIGN_TRAIT_NE,
    },
    vargas::varga_rashi,
    yogas::YogaRow,
};

// ── Small helpers ──────────────────────────────────────────────────────────

fn en(g: Graha) -> &'static str {
    g.en()
}

fn ne_name(g: Graha) -> &'static str {
    PLANET_NE[g.index()]
}

/// `_ord`.
fn ord(n: usize) -> String {
    match n {
        1 => "1st".into(),
        2 => "2nd".into(),
        3 => "3rd".into(),
        _ => format!("{n}th"),
    }
}

/// `_ord_ne`.
fn ord_ne(n: usize) -> String {
    format!("{n} औं")
}

fn dignity_index(d: Dignity) -> usize {
    match d {
        Dignity::Exalted => 0,
        Dignity::Debilitated => 1,
        Dignity::Moolatrikona => 2,
        Dignity::Own => 3,
        Dignity::Friend => 4,
        Dignity::Enemy => 5,
        Dignity::Neutral => 6,
    }
}

/// `DIGNITY_PHRASE.get(d, fallback)`.
fn phrase(d: Option<Dignity>, fallback: &'static str) -> &'static str {
    d.map_or(fallback, |d| DIGNITY_PHRASE[dignity_index(d)])
}

/// `DIGNITY_PHRASE_NE.get(d, fallback)`.
fn phrase_ne(d: Option<Dignity>, fallback: &'static str) -> &'static str {
    d.map_or(fallback, |d| DIGNITY_PHRASE_NE[dignity_index(d)])
}

/// `DIGNITY_SCORE`.
const fn score(d: Option<Dignity>) -> i32 {
    match d {
        Some(Dignity::Exalted | Dignity::Moolatrikona | Dignity::Own) => 2,
        Some(Dignity::Friend) => 1,
        Some(Dignity::Enemy) => -1,
        Some(Dignity::Debilitated) => -2,
        Some(Dignity::Neutral) | None => 0,
    }
}

/// `_SHADBALA_STATUS_NE.get(s, s)`.
fn status_ne(s: &str) -> &str {
    match s {
        "Exceptional" => "असाधारण",
        "Strong" => "बलियो",
        "Adequate" => "पर्याप्त",
        "Borderline" => "सीमान्त",
        "Weak" => "कमजोर",
        other => other,
    }
}

fn strong_status(s: Option<&str>) -> bool {
    matches!(s, Some("Strong" | "Exceptional"))
}

fn weak_status(s: Option<&str>) -> bool {
    matches!(s, Some("Weak" | "Borderline"))
}

/// `_plain_theme`.
fn plain(g: Graha, ne: bool) -> &'static str {
    if ne {
        PLAIN_THEME_NE[g.index()]
    } else {
        PLAIN_THEME_EN[g.index()]
    }
}

/// `s.split(',')[0]`.
fn head(s: &str) -> &str {
    s.split(',').next().unwrap_or(s)
}

/// `str.capitalize()`: the first character upper-cased, the rest lower-cased.
fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    chars.next().map_or_else(String::new, |c| {
        c.to_uppercase()
            .chain(chars.flat_map(char::to_lowercase))
            .collect()
    })
}

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/// `_fmt_date`: `"12 Jun 2027"` (the instant's UTC date).
fn fmt_date(at: UtcInstant) -> String {
    let (day, ..) = at.fields();
    format!(
        "{} {} {}",
        day.day,
        MONTHS[(day.month - 1) as usize],
        day.year
    )
}

/// `_fmt_date_ne`: the Bikram Sambat date, Gregorian with Nepali month names off the BS table.
fn fmt_date_ne(at: UtcInstant) -> String {
    let (day, ..) = at.fields();
    if let Ok(bs) = calendar::civil_to_bs(day) {
        format!(
            "{} {} {}",
            bs.day,
            BS_MONTH_NE[(bs.month - 1) as usize],
            bs.year
        )
    } else {
        let mut s = fmt_date(at);
        for (en, ne) in EN_MONTH_NE {
            s = s.replace(en, ne);
        }
        s
    }
}

/// `_date(dt, ne)`.
fn date(at: UtcInstant, ne: bool) -> String {
    if ne { fmt_date_ne(at) } else { fmt_date(at) }
}

// ── Confidence ─────────────────────────────────────────────────────────────

/// `Confidence`: independent supporting and contradicting factors.
#[derive(Debug, Clone, Default)]
struct Confidence {
    supports: Vec<String>,
    contradicts: Vec<String>,
}

impl Confidence {
    fn support(&mut self, f: impl Into<String>) {
        self.supports.push(f.into());
    }

    fn against(&mut self, f: impl Into<String>) {
        self.contradicts.push(f.into());
    }

    fn level(&self) -> &'static str {
        let (s, c) = (self.supports.len(), self.contradicts.len());
        if s == 0 && c == 0 {
            return "tentative";
        }
        if s >= 1 && c >= 1 && s.abs_diff(c) <= 1 {
            return "mixed";
        }
        let net = i64::try_from(s).unwrap_or(0) - i64::try_from(c).unwrap_or(0);
        match net {
            3.. => "strong",
            2 => "moderate",
            ..=-2 => "mixed",
            _ => "tentative",
        }
    }

    fn factors(&self) -> Vec<String> {
        self.supports
            .iter()
            .chain(&self.contradicts)
            .cloned()
            .collect()
    }
}

struct Ctx<'a> {
    chart: &'a Chart,
    yogas: Vec<&'a YogaRow>,
    now: UtcInstant,
    ne: bool,
}

impl Ctx<'_> {
    fn maha(&self) -> Option<Graha> {
        self.chart.dasha.as_ref().map(|d| d.maha_lord)
    }

    fn antar(&self) -> Option<Graha> {
        self.chart.dasha.as_ref().map(|d| d.antar_lord)
    }

    /// `_planet_confidence`.
    fn planet_conf(&self, g: Graha) -> Confidence {
        let mut conf = Confidence::default();
        let pf = self.chart.p(g);
        let sc = score(pf.dignity);
        if sc >= 2 {
            conf.support(format!("D1: {} {}", en(g), phrase(pf.dignity, "")));
        } else if sc == 1 {
            conf.support(format!("D1: {} in a friendly sign", en(g)));
        } else if sc <= -2 {
            conf.against(format!("D1: {} {}", en(g), DIGNITY_PHRASE[1]));
        } else if sc == -1 {
            conf.against(format!("D1: {} in an enemy sign", en(g)));
        }
        if pf.vargottama {
            conf.support("D9: vargottama (same sign in navamsa — reinforced)");
        } else {
            #[expect(clippy::cast_precision_loss, reason = "a sign number")]
            let d9 = crate::chart::dignity(g, (pf.navamsa * 30 + 1) as f64);
            if matches!(
                d9,
                Some(Dignity::Exalted | Dignity::Own | Dignity::Moolatrikona)
            ) {
                conf.support(format!("D9: {} dignified in navamsa", en(g)));
            } else if d9 == Some(Dignity::Debilitated) {
                conf.against(format!("D9: {} weak in navamsa", en(g)));
            }
        }
        let status = pf.shadbala_status.as_deref();
        if strong_status(status) {
            conf.support(format!("Shadbala: {}", status.unwrap_or("")));
        } else if weak_status(status) {
            conf.against(format!("Shadbala: {}", status.unwrap_or("")));
        }
        if Some(g) == self.maha() || Some(g) == self.antar() {
            let role = if Some(g) == self.maha() {
                "mahadasha"
            } else {
                "antardasha"
            };
            conf.support(format!("Dasha: {} runs the current {role}", en(g)));
        }
        conf
    }

    /// `_house_confidence`.
    fn house_conf(&self, house: usize) -> Confidence {
        let mut conf = Confidence::default();
        let lord = self.chart.lord(house);
        let lf = self.chart.p(lord);
        let sc = score(lf.dignity);
        if sc >= 2 {
            conf.support(format!(
                "D1: {} lord {} well dignified",
                ord(house),
                en(lord)
            ));
        } else if sc <= -2 {
            conf.against(format!("D1: {} lord {} debilitated", ord(house), en(lord)));
        }
        if DUSTHANA.contains(&lf.house) {
            conf.against(format!(
                "D1: {} lord falls in the {} (a difficult house)",
                ord(house),
                ord(lf.house)
            ));
        } else if KENDRA_TRIKONA.contains(&lf.house) {
            conf.support(format!(
                "D1: {} lord in a strong angle/trine (the {})",
                ord(house),
                ord(lf.house)
            ));
        }
        let status = lf.shadbala_status.as_deref();
        if strong_status(status) {
            conf.support(format!(
                "Shadbala: {} lord {}",
                ord(house),
                status.unwrap_or("")
            ));
        } else if weak_status(status) {
            conf.against(format!(
                "Shadbala: {} lord {}",
                ord(house),
                status.unwrap_or("")
            ));
        }
        let occ = &self.chart.house_occupants[house];
        let benefics: Vec<&str> = occ
            .iter()
            .filter(|g| natural_benefic(**g))
            .map(|g| en(*g))
            .collect();
        let malefics: Vec<&str> = occ
            .iter()
            .filter(|g| natural_malefic(**g))
            .map(|g| en(*g))
            .collect();
        if !benefics.is_empty() {
            conf.support(format!(
                "D1: natural benefic(s) present — {}",
                benefics.join(", ")
            ));
        }
        let upachaya = [3, 6, 10, 11].contains(&house);
        if !malefics.is_empty() && !upachaya {
            conf.against(format!(
                "D1: natural malefic(s) present — {}",
                malefics.join(", ")
            ));
        } else if !malefics.is_empty() && upachaya {
            conf.support(format!(
                "D1: malefic(s) in an upachaya house (strengthening here) — {}",
                malefics.join(", ")
            ));
        }
        conf
    }

    /// `_planet_line`.
    fn planet_line(&self, g: Graha) -> String {
        let pf = self.chart.p(g);
        let deg = panchanga::pyfloat::py_int(pf.deg_in_sign);
        #[expect(clippy::cast_precision_loss, reason = "under 30 degrees")]
        let minute = py_round_int((pf.deg_in_sign - deg as f64) * 60.0).rem_euclid(60);
        let node = matches!(g, Graha::Rahu | Graha::Ketu);
        let mut bits: Vec<String> = Vec::new();
        if self.ne {
            bits.push(format!(
                "{} {} राशिमा {deg}°{minute:02}′ (जन्म तारा {}, चरण {}), तपाईंको {} भावमा छ",
                ne_name(g),
                RASHI_NE[pf.sign],
                NAKSHATRA_NE[pf.nakshatra],
                pf.pada,
                ord_ne(pf.house)
            ));
            if pf.dignity.is_some() {
                bits.push(format!("र यहाँ {} छ", phrase_ne(pf.dignity, "")));
            }
            if pf.retrograde && !node {
                bits.push("अहिले उल्टो गति (वक्री) मा छ, त्यसैले यसका विषय भित्री रूपमा फर्किन्छन्".into());
            }
            if pf.combust {
                bits.push("सूर्यको धेरै नजिक (अस्त) छ, त्यसैले बाह्य फल पाउन बढी प्रयास चाहिन्छ".into());
            }
            if pf.vargottama {
                bits.push(
                    "दुवै मुख्य चार्टमा उही राशिमा (वर्गोत्तम) छ — जसले यसलाई उल्लेखनीय रूपमा बलियो बनाउँछ"
                        .into(),
                );
            }
            let mut line = bits.join("; ");
            line.push('।');
            return line;
        }
        bits.push(format!(
            "{} is in {} at {deg}°{minute:02}′ (birth star {}, quarter {}), in your {} house",
            en(g),
            RASHI_EN[pf.sign],
            NAKSHATRA_EN[pf.nakshatra],
            pf.pada,
            ord(pf.house)
        ));
        if pf.dignity.is_some() {
            bits.push(format!("and is {} there", phrase(pf.dignity, "")));
        }
        if pf.retrograde && !node {
            bits.push("moving backwards for now (retrograde), so its themes turn inward and get revisited".into());
        }
        if pf.combust {
            bits.push(
                "very close to the Sun (combust), so its outer results take extra effort".into(),
            );
        }
        if pf.vargottama {
            bits.push("in the same sign in both main charts (vargottama), which makes it noticeably stronger".into());
        }
        let mut line = bits.join("; ");
        line.push('.');
        line
    }

    /// `_signified_house_planet`.
    fn signified(&self, house: usize, ne: bool) -> String {
        let lord = self.chart.lord(house);
        let lf = self.chart.p(lord);
        let occ = &self.chart.house_occupants[house];
        let status = lf.shadbala_status.as_deref();
        if ne {
            let mut parts = vec![format!(
                "जीवनको यो क्षेत्र {} सँग सम्बन्धित छ।",
                HOUSE_THEME_NE[house]
            )];
            parts.push(format!(
                "यो क्षेत्र सम्हाल्ने ग्रह {} अहिले {} सँग सम्बन्धित भागमा छ, र यहाँ {} छ{}।",
                ne_name(lord),
                head(HOUSE_THEME_NE[lf.house]),
                phrase_ne(lf.dignity, "रहेको"),
                status.map_or_else(String::new, |s| format!(" (समग्र बल {})", status_ne(s)))
            ));
            if !occ.is_empty() {
                parts.push(format!(
                    "यस क्षेत्रमा अहिले रहेका ग्रह: {}।",
                    occ.iter()
                        .map(|g| ne_name(*g))
                        .collect::<Vec<_>>()
                        .join(", ")
                ));
            }
            return parts.join(" ");
        }
        let mut parts = vec![format!(
            "This area of life is about {}.",
            HOUSE_THEME[house]
        )];
        parts.push(format!(
            "The planet in charge of it, {}, currently sits in the part of your chart about {}, and is {} there{}.",
            en(lord),
            head(HOUSE_THEME[lf.house]),
            phrase(lf.dignity, "placed"),
            status.map_or_else(String::new, |s| format!(" (overall strength {})", s.to_lowercase()))
        ));
        if !occ.is_empty() {
            parts.push(format!(
                "Planets currently in this area: {}.",
                occ.iter().map(|g| en(*g)).collect::<Vec<_>>().join(", ")
            ));
        }
        parts.join(" ")
    }

    /// `_strongest`: highest (ratio or 0, dignity score), first on ties.
    fn strongest(&self) -> Graha {
        let key = |g: Graha| {
            (
                self.chart.p(g).shadbala_ratio.unwrap_or(0.0),
                score(self.chart.p(g).dignity),
            )
        };
        let mut best = Graha::SEVEN[0];
        for g in Graha::SEVEN.into_iter().skip(1) {
            if key(g).partial_cmp(&key(best)) == Some(std::cmp::Ordering::Greater) {
                best = g;
            }
        }
        best
    }

    /// `_weakest`: lowest (ratio or 99, dignity score), first on ties.
    fn weakest(&self) -> Graha {
        let key = |g: Graha| {
            let r = self
                .chart
                .p(g)
                .shadbala_ratio
                .filter(|r| *r != 0.0)
                .unwrap_or(99.0);
            (r, score(self.chart.p(g).dignity))
        };
        let mut best = Graha::SEVEN[0];
        for g in Graha::SEVEN.into_iter().skip(1) {
            if key(g).partial_cmp(&key(best)) == Some(std::cmp::Ordering::Less) {
                best = g;
            }
        }
        best
    }
}

/// A section before serialization.
struct Section {
    id: &'static str,
    title_en: &'static str,
    title_ne: &'static str,
    body: Vec<String>,
    conf: Option<Confidence>,
    items: Option<Vec<Map<String, Value>>>,
    optional: bool,
}

impl Section {
    fn new(
        id: &'static str,
        title_en: &'static str,
        title_ne: &'static str,
        body: Vec<String>,
    ) -> Self {
        Self {
            id,
            title_en,
            title_ne,
            body: body.into_iter().filter(|p| !p.is_empty()).collect(),
            conf: None,
            items: None,
            optional: false,
        }
    }

    fn conf(mut self, conf: Confidence) -> Self {
        self.conf = Some(conf);
        self
    }

    fn items(mut self, items: Vec<Map<String, Value>>) -> Self {
        self.items = Some(items);
        self
    }

    /// The record fields, Nepali factors localized as `_localize_section` does.
    fn to_map(&self, ne: bool) -> Map<String, Value> {
        let loc = |f: &String| if ne { localize_ne(f) } else { f.clone() };
        let mut m = Map::new();
        m.insert("id".into(), json!(self.id));
        m.insert("title_en".into(), json!(self.title_en));
        m.insert("title_ne".into(), json!(self.title_ne));
        m.insert("body".into(), json!(self.body));
        if let Some(c) = &self.conf {
            m.insert("confidence".into(), json!(c.level()));
            m.insert(
                "factors".into(),
                json!(c.factors().iter().map(loc).collect::<Vec<_>>()),
            );
        }
        if let Some(items) = &self.items {
            let items: Vec<Value> = items
                .iter()
                .map(|it| {
                    let mut it = it.clone();
                    if ne
                        && let Some(Value::Array(factors)) = it.get("factors")
                        && !factors.is_empty()
                    {
                        let f: Vec<Value> = factors
                            .iter()
                            .map(|x| json!(localize_ne(x.as_str().unwrap_or(""))))
                            .collect();
                        it.insert("factors".into(), Value::Array(f));
                    }
                    Value::Object(it)
                })
                .collect();
            m.insert("items".into(), Value::Array(items));
        }
        if self.optional {
            m.insert("optional".into(), json!(true));
        }
        m
    }
}

fn item(label: String, confidence: &str, text: String) -> Map<String, Value> {
    let mut m = Map::new();
    m.insert("label".into(), Value::String(label));
    m.insert("confidence".into(), json!(confidence));
    m.insert("text".into(), Value::String(text));
    m
}

fn item_factors(
    label: String,
    confidence: &str,
    factors: Vec<String>,
    text: String,
) -> Map<String, Value> {
    let mut m = Map::new();
    m.insert("label".into(), Value::String(label));
    m.insert("confidence".into(), json!(confidence));
    m.insert(
        "factors".into(),
        Value::Array(factors.into_iter().map(Value::String).collect()),
    );
    m.insert("text".into(), Value::String(text));
    m
}

// ── Nepali localization of factors ─────────────────────────────────────────

/// Python `re`'s word character: Unicode letters and digits, not combining marks.
fn py_word(c: char) -> bool {
    if c.is_ascii() {
        return c.is_ascii_alphanumeric() || c == '_';
    }
    if ('\u{0900}'..='\u{097F}').contains(&c) {
        let u = c as u32;
        return matches!(u, 0x0904..=0x0939 | 0x093D | 0x0950 | 0x0958..=0x0961 | 0x0966..=0x096F | 0x0971..=0x097F);
    }
    c.is_alphanumeric()
}

/// `re.sub(r"\b…\b", rep, text)` where `re` holds the pattern without its `\b`s and
/// every match starts and ends on a word character.
fn sub_bounded(text: &str, re: &Regex, rep: &dyn Fn(&Captures<'_>) -> String) -> String {
    let mut out = String::with_capacity(text.len());
    let mut pos = 0;
    let mut copied = 0;
    while pos <= text.len() {
        let Some(caps) = re.captures_at(text, pos) else {
            break;
        };
        let Some(m) = caps.get(0) else {
            break;
        };
        let before_ok = !text[..m.start()].chars().next_back().is_some_and(py_word);
        let after_ok = !text[m.end()..].chars().next().is_some_and(py_word);
        if before_ok && after_ok && !m.as_str().is_empty() {
            out.push_str(&text[copied..m.start()]);
            out.push_str(&rep(&caps));
            copied = m.end();
            pos = m.end();
        } else {
            pos = m.start() + text[m.start()..].chars().next().map_or(1, char::len_utf8);
        }
    }
    out.push_str(&text[copied..]);
    out
}

struct NeRegex {
    ord_house: Regex,
    house_n: Regex,
    ord_lord: Regex,
    ordinal: Regex,
    pada: Regex,
    literals: Vec<(Regex, &'static str)>,
    months: Vec<(Regex, &'static str)>,
    words: Vec<(Regex, &'static str)>,
    space: Regex,
}

static NE_REGEX: LazyLock<NeRegex> = LazyLock::new(|| {
    let re = |p: &str| Regex::new(p).expect("valid pattern");
    NeRegex {
        ord_house: re(r"(?i)(\d+)(?:st|nd|rd|th) house"),
        house_n: re(r"(?i)House (\d+)"),
        ord_lord: re(r"(?i)(\d+)(?:st|nd|rd|th) lord"),
        ordinal: re(r"(?i)(\d+)(?:st|nd|rd|th)"),
        pada: re(r"(?i)pada (\d+)"),
        literals: [
            ("is at", "मा अवस्थित छ"),
            ("occupying the", ""),
            ("house (\\d+)", "\u{0}"),
            ("in the", "मा"),
            ("and the Sun is in", "र सूर्य"),
            ("to the foreground", "अगाडि"),
            ("with dates", "मिति सहित"),
        ]
        .into_iter()
        .map(|(p, r)| (re(&format!("(?i){p}")), r))
        .collect(),
        months: EN_MONTH_NE.iter().map(|(e, n)| (re(e), *n)).collect(),
        words: NE_WORD_MAP
            .iter()
            .map(|(e, n)| (re(&format!("(?i){}", regex::escape(e))), *n))
            .collect(),
        space: re(r"\s+"),
    }
});

/// `_apply_ne_regex`.
fn apply_ne_regex(text: &str) -> String {
    let r = &*NE_REGEX;
    let digits = |c: &Captures<'_>| c.get(1).map_or("", |m| m.as_str()).to_owned();
    let mut out = sub_bounded(text, &r.ord_house, &|c| format!("{} औं भाव", digits(c)));
    out = sub_bounded(&out, &r.house_n, &|c| format!("{} औं भाव", digits(c)));
    out = sub_bounded(&out, &r.ord_lord, &|c| {
        format!("{} औं भावका स्वामी", digits(c))
    });
    out = sub_bounded(&out, &r.ordinal, &|c| format!("{} औं", digits(c)));
    out = sub_bounded(&out, &r.pada, &|c| format!("चरण {}", digits(c)));
    for (re, rep) in &r.literals {
        out = if *rep == "\u{0}" {
            sub_bounded(&out, re, &|c| format!("{} औं भाव", digits(c)))
        } else {
            sub_bounded(&out, re, &|_| (*rep).to_owned())
        };
    }
    for (re, rep) in r.months.iter().chain(&r.words) {
        out = sub_bounded(&out, re, &|_| (*rep).to_owned());
    }
    out = out.replace("भitr", "भित्र").replace("यसभitr", "यसभित्र");
    r.space.replace_all(&out, " ").trim().to_owned()
}

/// `_localize_text_ne`.
fn localize_ne(text: &str) -> String {
    let mut out = text.to_owned();
    for (en, ne) in NE_REPLACEMENTS {
        if !en.is_empty() && out.contains(en) {
            out = out.replace(en, ne);
        }
    }
    apply_ne_regex(&out)
}

// ── Sections ───────────────────────────────────────────────────────────────

fn days_between(start: UtcInstant, end: UtcInstant) -> f64 {
    #[expect(clippy::cast_precision_loss, reason = "days of a lifetime")]
    let days = end.micros_since(start).div_euclid(86_400_000_000) as f64;
    days
}

/// `_age_at(birth, when)`.
fn age_at(birth: UtcInstant, when: UtcInstant) -> i64 {
    let (b, ..) = birth.fields();
    let (w, ..) = when.fields();
    let years =
        i64::from(w.year) - i64::from(b.year) - i64::from((w.month, w.day) < (b.month, b.day));
    years.max(0)
}

fn life_journey(ctx: &Ctx<'_>) -> Option<Section> {
    let d = ctx.chart.dasha.as_ref()?;
    let ne = ctx.ne;
    let now = ctx.now;
    let birth = d.full.first()?.start;
    let mut items = Vec::new();
    for (idx, m) in d.full.iter().enumerate() {
        let (a0, a1) = (age_at(birth, m.start), age_at(birth, m.end));
        if a0 > 100 {
            break;
        }
        let lord = m.lord;
        let past = m.end <= now;
        let current = m.start <= now && now < m.end;
        let span = format!("{} → {}", date(m.start, ne), date(m.end, ne));
        let span_years = days_between(m.start, m.end) / YEAR_DAYS;
        let dur = if span_years >= 1.5 {
            let n = py_round_int(span_years);
            if ne {
                format!("{n} वर्ष")
            } else {
                format!("{n} yrs")
            }
        } else {
            let n = py_round_int(span_years * 12.0);
            if ne {
                format!("{n} महिना")
            } else {
                format!("{n} mo")
            }
        };
        let balance = idx == 0 && span_years < f64::from(dasha::years(lord)) - 0.5;
        let (label, text) = if ne {
            let status = if past {
                "विगत"
            } else if current {
                "वर्तमान · अहिले यहीँ"
            } else {
                "आगामी"
            };
            let theme = DASHA_THEME_NE[lord.index()];
            let gloss = if past {
                format!("यस अवधिले {theme} वरिपरि अनुभव र आधार निर्माण गर्‍यो।")
            } else if current {
                format!("अहिले तपाईं यही अध्यायमा हुनुहुन्छ — {theme} अघि सारिन्छ।")
            } else {
                format!("यो आउँदो अध्यायले {theme} लाई अगाडि ल्याउनेछ।")
            };
            let bal = if balance {
                " (जन्मकालीन शेष)"
            } else {
                ""
            };
            (
                format!(
                    "{} को जीवन-कालखण्ड{bal} · उमेर {a0}–{a1} ({status})",
                    ne_name(lord)
                ),
                format!("{span} ({dur}): {gloss}"),
            )
        } else {
            let status = if past {
                "past"
            } else if current {
                "present · you are here"
            } else {
                "ahead"
            };
            let theme = DASHA_THEME[lord.index()];
            let gloss = if past {
                format!("This chapter built experience around {theme}.")
            } else if current {
                format!("You are living this chapter now — {theme} is foregrounded.")
            } else {
                format!("This coming chapter brings {theme} to the fore.")
            };
            let bal = if balance { " (balance at birth)" } else { "" };
            (
                format!("{} life period{bal} · age {a0}–{a1} ({status})", en(lord)),
                format!("{span} ({dur}): {gloss}"),
            )
        };
        items.push(item(label, ctx.planet_conf(lord).level(), text));
    }
    let body = if ne {
        "तपाईंको जीवन ठूला-ठूला कालखण्ड (जसलाई ज्योतिषमा महादशा भनिन्छ) मा बाँडिएको हुन्छ, र हरेक कालखण्डले जीवनको फरक पक्षमा जोड दिन्छ। तल जन्मदेखि बाँचिसकेका विगतका कालखण्ड, हाल चलिरहेको कालखण्ड र आगामी कालखण्डहरू उमेरसहित दिइएको छ — कुन बेला जीवनमा के कुरामा जोड पर्छ भन्ने एकै नजरमा हेर्न।"
    } else {
        "Your life is divided into long chapters (called mahadashas in astrology), and each one emphasises a different part of life. Below are the chapters you have already lived, the one running now, and the ones ahead — with ages — so you can see at a glance which stage of life emphasises what."
    };
    Some(
        Section::new(
            "life_journey",
            "Life journey — past, present & future",
            "जीवन यात्रा — विगत, वर्तमान र भविष्य",
            vec![body.into()],
        )
        .items(items),
    )
}

/// `_next_period_for` → `_window_phrase`.
fn window_phrase(ctx: &Ctx<'_>, lord: Graha) -> Option<String> {
    let d = ctx.chart.dasha.as_ref()?;
    let now = ctx.now;
    let pick = |rows: &[DashaPeriod]| rows.iter().find(|p| p.lord == lord && p.end > now).copied();
    let w = pick(&d.bhuktis).or_else(|| pick(&d.full))?;
    let running = w.start <= now && now < w.end;
    let span = format!("{} → {}", date(w.start, ctx.ne), date(w.end, ctx.ne));
    Some(if ctx.ne {
        let when = if running {
            "हाल चलिरहेको अनुकूल समय"
        } else {
            "आगामी अनुकूल समय"
        };
        format!("{when} ({span})")
    } else {
        let when = if running {
            "a good period running now"
        } else {
            "an upcoming good period"
        };
        format!("{when} ({span})")
    })
}

fn pursue(ctx: &Ctx<'_>) -> Section {
    let ne = ctx.ne;
    let mut items = Vec::new();
    let mut add =
        |area_ne: &str, area_en: &str, lord: Graha, pursue_ne: String, pursue_en: String| {
            let conf = ctx.planet_conf(lord);
            let window = window_phrase(ctx, lord);
            let (label, text) = if ne {
                let timing =
                    window.map_or_else(String::new, |w| format!(" सबैभन्दा राम्रो समय: {w}।"));
                (area_ne.to_owned(), format!("{pursue_ne}{timing}"))
            } else {
                let timing =
                    window.map_or_else(String::new, |w| format!(" Best time for this: {w}."));
                (area_en.to_owned(), format!("{pursue_en}{timing}"))
            };
            items.push(item(label, conf.level(), text));
        };
    let strong = ctx.strongest();
    add(
        "तपाईंको सबैभन्दा बलियो पक्ष",
        "Your strongest area",
        strong,
        format!(
            "तपाईं स्वाभाविक रूपमा {} मा राम्रो हुनुहुन्छ — यहीँ मिहिनेत सबैभन्दा छिटो फल दिन्छ, त्यसैले यसमै सबैभन्दा बढी लगानी गर्नुहोस्।",
            plain(strong, true)
        ),
        format!(
            "You are naturally good at {} — effort pays off fastest here, so put most of your energy into it.",
            plain(strong, false)
        ),
    );
    let c = ctx.chart;
    add(
        "करियर र कर्म",
        "Career & work",
        c.lord(10),
        "करियर, स्थिति र सार्वजनिक भूमिकामा ठूला कदम चाल्नुहोस्।".into(),
        "Make your bigger moves in career, status and public role.".into(),
    );
    add(
        "धन र लाभ",
        "Wealth & gains",
        c.lord(11),
        "आम्दानीका स्रोत, सञ्जाल र आकांक्षा विस्तार गर्नुहोस्।".into(),
        "Expand income streams, networks and aspirations.".into(),
    );
    add(
        "सम्बन्ध र साझेदारी",
        "Relationships & partnership",
        c.lord(7),
        "विवाह, साझेदारी वा सार्वजनिक सहकार्यलाई अघि बढाउनुहोस्।".into(),
        "Advance marriage, partnership or public collaboration.".into(),
    );
    add(
        "शिक्षा, धर्म र मार्गदर्शन",
        "Learning, dharma & mentors",
        c.lord(9),
        "उच्च शिक्षा, यात्रा, गुरुसंग र आध्यात्मिक अभ्यासलाई समय दिनुहोस्।".into(),
        "Invest in higher learning, travel, mentors and spiritual practice.".into(),
    );
    let body = if ne {
        "यो खण्डले तपाईंले कुन कुरामा ध्यान दिने र त्यसका लागि कुन समय सबैभन्दा राम्रो छ भन्ने देखाउँछ। तल हरेक जीवन-क्षेत्रसँगै त्यसका लागि अनुकूल समय दिइएको छ — ठूला निर्णय ती समयसँग मिलाउनुहोस्।"
    } else {
        "This section shows what to focus on and the best time for each one. Every life area below comes with the period that most favours it — try to line up your bigger decisions with those good times."
    };
    Section::new(
        "pursue_and_when",
        "What to pursue & when",
        "के कुरामा लाग्ने र कहिले",
        vec![body.into()],
    )
    .items(items)
}

/// `VARGA_DOMAIN`.
const VARGA_DOMAIN: [(u32, &str, &str, &str, &str); 13] = [
    (
        9,
        "Navamsa",
        "नवांश",
        "marriage, dharma, fortune and the inner strength of every planet",
        "विवाह, धर्म, भाग्य र हरेक ग्रहको भित्री बल",
    ),
    (
        10,
        "Dasamsa",
        "दशांश",
        "career, profession, status and public achievement",
        "करियर, पेशा, प्रतिष्ठा र सार्वजनिक उपलब्धि",
    ),
    (
        7,
        "Saptamsa",
        "सप्तांश",
        "children, progeny and creative continuity",
        "सन्तान, वंश र सिर्जनात्मक निरन्तरता",
    ),
    (
        4,
        "Chaturthamsa",
        "चतुर्थांश",
        "home, land, property and inner contentment",
        "घर, जग्गा, सम्पत्ति र आन्तरिक सन्तुष्टि",
    ),
    (
        12,
        "Dwadashamsa",
        "द्वादशांश",
        "parents, lineage and inherited karma",
        "आमाबुबा, वंश र पैतृक कर्म",
    ),
    (
        24,
        "Chaturvimsamsa",
        "चतुर्विंशांश",
        "education, learning and scholarship",
        "शिक्षा, विद्या र प्रज्ञा",
    ),
    (
        2,
        "Hora",
        "होरा",
        "wealth, resources and material sustenance",
        "धन, स्रोत र भौतिक निर्वाह",
    ),
    (
        3,
        "Drekkana",
        "द्रेष्काण",
        "siblings, courage and personal initiative",
        "भाइबहिनी, साहस र व्यक्तिगत पहल",
    ),
    (
        16,
        "Shodashamsa",
        "षोडशांश",
        "vehicles, comforts and material pleasures",
        "सवारी, सुविधा र भौतिक सुख",
    ),
    (
        20,
        "Vimsamsa",
        "विंशांश",
        "spiritual practice, devotion and religious merit",
        "आध्यात्मिक साधना, भक्ति र धार्मिक पुण्य",
    ),
    (
        27,
        "Bhamsa",
        "सप्तविंशांश",
        "innate strengths, weaknesses and stamina",
        "जन्मजात बल, कमजोरी र सहनशीलता",
    ),
    (
        30,
        "Trimsamsa",
        "त्रिंशांश",
        "adversity, health risks and moral fibre",
        "प्रतिकूलता, स्वास्थ्य जोखिम र नैतिक बल",
    ),
    (
        60,
        "Shashtiamsa",
        "षष्ट्यंश",
        "the sum of past-life karma standing behind the whole chart",
        "सम्पूर्ण कुण्डलीभित्रको पूर्वजन्म कर्मको योग",
    ),
];

/// `_divisional_item`.
#[expect(
    clippy::too_many_lines,
    reason = "both languages of one card, side by side"
)]
fn divisional_item(
    ctx: &Ctx<'_>,
    (division, en_label, ne_label, en_dom, ne_dom): (u32, &str, &str, &str, &str),
) -> Map<String, Value> {
    let ne = ctx.ne;
    let mut dignified = Vec::new();
    let mut debilitated = Vec::new();
    let mut same_sign = Vec::new();
    let mut factors = Vec::new();
    for g in Graha::SEVEN {
        let pf = ctx.chart.p(g);
        let vsign = varga_rashi(division, pf.longitude) - 1;
        #[expect(clippy::cast_precision_loss, reason = "a sign number")]
        let dign = crate::chart::dignity(g, (vsign * 30 + 15) as f64);
        let repeats = pf.sign == vsign;
        let mut notes: Vec<&str> = Vec::new();
        if matches!(
            dign,
            Some(Dignity::Exalted | Dignity::Own | Dignity::Moolatrikona)
        ) {
            dignified.push(g);
            notes.push(if ne {
                phrase_ne(dign, "")
            } else {
                phrase(dign, "")
            });
        } else if dign == Some(Dignity::Debilitated) {
            debilitated.push(g);
            notes.push(if ne {
                DIGNITY_PHRASE_NE[1]
            } else {
                DIGNITY_PHRASE[1]
            });
        }
        if repeats {
            same_sign.push(g);
            notes.push(match (division == 9, ne) {
                (true, true) => "वर्गोत्तम",
                (true, false) => "vargottama",
                (false, true) => "जन्म राशि दोहोर्‍याउँछ",
                (false, false) => "keeps its natal sign",
            });
        }
        if !notes.is_empty() {
            let name = if ne { ne_name(g) } else { en(g) };
            factors.push(format!("{name}: {}", notes.join(", ")));
        }
    }
    let mut strong_keys: Vec<Graha> = Vec::new();
    for g in dignified.iter().chain(&same_sign) {
        if !strong_keys.contains(g) {
            strong_keys.push(*g);
        }
    }
    let strong_ct = strong_keys.len();
    let weak_ct = debilitated.len();
    let level = if strong_ct >= 3 && weak_ct == 0 {
        "strong"
    } else if strong_ct >= weak_ct + 2 || (strong_ct > 0 && weak_ct == 0) {
        "moderate"
    } else if strong_ct > 0 && weak_ct > 0 {
        "mixed"
    } else {
        "tentative"
    };
    let (verdict_en, verdict_ne) = match level {
        "strong" => ("strong and well-supported", "बलियो र राम्रोसँग समर्थित"),
        "moderate" => ("reasonably supported", "ठीकठाकसँग समर्थित"),
        "mixed" => (
            "mixed — some support and some challenges",
            "मिश्रित — केही समर्थन, केही चुनौती",
        ),
        _ => (
            "average, without a standout signal",
            "सामान्य, कुनै विशेष संकेतबिना",
        ),
    };
    let text = if ne {
        let strong_names = strong_keys
            .iter()
            .map(|g| ne_name(*g))
            .collect::<Vec<_>>()
            .join(", ");
        let weak_names = debilitated
            .iter()
            .map(|g| ne_name(*g))
            .collect::<Vec<_>>()
            .join(", ");
        let mut t = format!("D{division} ({ne_label}) चक्रले तपाईंको {ne_dom} देखाउँछ।");
        if !strong_names.is_empty() {
            write!(t, " यहाँ {strong_names} बलियो छन्, जसले यस क्षेत्रलाई सघाउँछ।").ok();
        }
        if !weak_names.is_empty() {
            write!(
                t,
                " {weak_names} भने केही दबाबमा छन्, त्यसैले यता थप ध्यान चाहिन्छ।"
            )
            .ok();
        }
        write!(t, " समग्रमा यो क्षेत्र {verdict_ne} देखिन्छ।").ok();
        t
    } else {
        let strong_names = strong_keys
            .iter()
            .map(|g| en(*g))
            .collect::<Vec<_>>()
            .join(", ");
        let weak_names = debilitated
            .iter()
            .map(|g| en(*g))
            .collect::<Vec<_>>()
            .join(", ");
        let mut t = format!("The D{division} chart ({en_label}) shows your {en_dom}.");
        if !strong_names.is_empty() {
            let verb = if strong_keys.len() == 1 { "is" } else { "are" };
            write!(
                t,
                " {strong_names} {verb} strong here, which helps this area."
            )
            .ok();
        }
        if !weak_names.is_empty() {
            let verb = if debilitated.len() == 1 { "is" } else { "are" };
            write!(
                t,
                " {weak_names} {verb} under some strain, so this part needs more care."
            )
            .ok();
        }
        write!(t, " Overall, this area looks {verdict_en}.").ok();
        t
    };
    let label = if ne {
        format!("D{division} — {ne_label}")
    } else {
        format!("D{division} — {en_label}")
    };
    item_factors(label, level, factors, text)
}

/// `_yoga_involved`.
fn yoga_involved(ctx: &Ctx<'_>, key: &str) -> Vec<Graha> {
    match key {
        "gajakesari" => return vec![Graha::Jupiter, Graha::Moon],
        "budhaditya" => return vec![Graha::Sun, Graha::Mercury],
        "chandra_mangala" => return vec![Graha::Moon, Graha::Mars],
        "kemadruma" => return vec![Graha::Moon],
        "dhana_2_11" => return vec![ctx.chart.lord(2), ctx.chart.lord(11)],
        _ => {}
    }
    if let Some(rest) = key
        .strip_prefix("mahapurusha_")
        .or_else(|| key.strip_prefix("neechabhanga_"))
    {
        // `key.split("_", 1)[1]`, then `chart.planet(...)` skips non-grahas.
        return Graha::from_key(rest).into_iter().collect();
    }
    if let Some(rest) = key.strip_prefix("raja_") {
        return rest.split('_').filter_map(Graha::from_key).collect();
    }
    Vec::new()
}

/// `_yoga_report_item`.
#[expect(
    clippy::too_many_lines,
    reason = "both languages of one card, side by side"
)]
fn yoga_item(ctx: &Ctx<'_>, y: &YogaRow) -> Map<String, Value> {
    let ne = ctx.ne;
    let involved = yoga_involved(ctx, &y.key);
    let mut factors = Vec::new();
    let (mut strong_ct, mut weak_ct) = (0, 0);
    for g in &involved {
        let pf = ctx.chart.p(*g);
        let ds = score(pf.dignity);
        let sb = pf.shadbala_status.as_deref();
        if ds >= 2 || strong_status(sb) || pf.vargottama {
            strong_ct += 1;
        }
        if ds <= -2 || weak_status(sb) || pf.combust {
            weak_ct += 1;
        }
        let mut bit = if ne {
            format!("{}: {}", ne_name(*g), phrase_ne(pf.dignity, "स्थित"))
        } else {
            format!("{}: {}", en(*g), phrase(pf.dignity, "placed"))
        };
        if let Some(s) = sb {
            if ne {
                write!(bit, ", षड्बल {}", status_ne(s)).ok();
            } else {
                write!(bit, ", Shadbala {s}").ok();
            }
        }
        if pf.vargottama {
            bit += if ne {
                ", वर्गोत्तम"
            } else {
                ", vargottama"
            };
        }
        if pf.combust {
            bit += if ne { ", अस्त" } else { ", combust" };
        }
        factors.push(bit);
    }
    let activated = involved
        .iter()
        .any(|g| Some(*g) == ctx.maha() || Some(*g) == ctx.antar());
    if activated {
        factors.push(
            if ne {
                "वर्तमान दशाले सक्रिय गरेको"
            } else {
                "Activated by the current dasha"
            }
            .into(),
        );
    }
    let level = match y.polarity {
        "caution" => {
            if weak_ct > 0 {
                "mixed"
            } else {
                "tentative"
            }
        }
        "mixed" => "mixed",
        _ => {
            if strong_ct > 0 && weak_ct == 0 {
                if strong_ct >= 2 || activated {
                    "strong"
                } else {
                    "moderate"
                }
            } else if weak_ct > 0 {
                "mixed"
            } else {
                "moderate"
            }
        }
    };
    let mut parts: Vec<&str> = Vec::new();
    if y.polarity != "caution" {
        if strong_ct > 0 && weak_ct == 0 {
            parts.push(if ne {
                "यसका ग्रह यहाँ बलिया छन्, त्यसैले फल भरपर्दो छ"
            } else {
                "Its planets are strong here, so the result is dependable"
            });
        } else if weak_ct > 0 && strong_ct == 0 {
            parts.push(if ne {
                "यसका ग्रह कमजोर छन्, त्यसैले फल देखिन थप प्रयास चाहिन्छ"
            } else {
                "Its planets are on the weaker side, so the result needs extra effort to show"
            });
        } else if strong_ct > 0 && weak_ct > 0 {
            parts.push(if ne {
                "बल मिश्रित छ — केही समर्थन, केही घर्षण"
            } else {
                "Strength is mixed — some support, some friction"
            });
        }
    }
    if activated {
        parts.push(if ne {
            "अहिलेको दशाले यसलाई सक्रिय गरिरहेको छ"
        } else {
            "the running dasha is activating it now"
        });
    }
    let mut text = if ne {
        y.text_ne.clone()
    } else {
        y.text.clone()
    };
    if !parts.is_empty() {
        let synth = parts.join("; ");
        text.push(' ');
        text.push_str(&synth);
        text.push(if ne { '।' } else { '.' });
    }
    let mut m = Map::new();
    m.insert("label".into(), json!(if ne { &y.name_ne } else { &y.name }));
    m.insert("confidence".into(), json!(level));
    m.insert("polarity".into(), json!(y.polarity));
    m.insert("text".into(), json!(text));
    m.insert("factors".into(), json!(factors));
    m
}

fn strength_word(level: &str, ne: bool) -> &'static str {
    match (level, ne) {
        ("strong", false) => "a strong, well-supported",
        ("moderate", false) => "a moderately supported",
        ("mixed", false) => "a mixed, conditional",
        (_, false) => "a tentative",
        ("strong", true) => "बलियो, राम्रोसँग समर्थित",
        ("moderate", true) => "मध्यम रूपमा समर्थित",
        ("mixed", true) => "मिश्रित, सशर्त",
        (_, true) => "अनिश्चित",
    }
}

#[path = "report_sections.rs"]
mod sections;

/// The meta record (`_meta` + `_localize_meta`).
fn meta(ctx: &Ctx<'_>) -> Map<String, Value> {
    let c = ctx.chart;
    let ne = ctx.ne;
    let sign = |s: usize| json!({"sign": s + 1, "name_en": RASHI_EN[s], "name_ne": RASHI_NE[s]});
    let moon = c.p(Graha::Moon);
    let maha = c.dasha.as_ref().map_or(Value::Null, |d| {
        json!({
            "lord": d.maha_lord.key(),
            "lord_en": en(d.maha_lord),
            "lord_ne": ne_name(d.maha_lord),
            "ends": date(d.maha_end, ne),
            "antardasha": d.antar_lord.key(),
            "antardasha_en": en(d.antar_lord),
            "antardasha_ne": ne_name(d.antar_lord),
            "antardasha_ends": date(d.antar_end, ne),
            "window": [utc_iso(d.maha_start), utc_iso(d.maha_end)],
        })
    });
    let mut m = Map::new();
    m.insert("lagna".into(), sign(c.lagna_sign));
    m.insert("moon_sign".into(), sign(c.moon_sign));
    m.insert("sun_sign".into(), sign(c.sun_sign));
    m.insert(
        "nakshatra".into(),
        json!({
            "name_en": NAKSHATRA_EN[moon.nakshatra],
            "name_ne": NAKSHATRA_NE[moon.nakshatra],
            "pada": moon.pada,
            "lord_en": en(dasha::SEQUENCE[moon.nakshatra % 9]),
        }),
    );
    m.insert("mahadasha".into(), maha);
    m.insert("yoga_count".into(), json!(ctx.yogas.len()));
    m.insert("generated_at".into(), json!(utc_iso(ctx.now)));
    if ne {
        m.insert(
            "method".into(),
            json!("पराशरी नियममा आधारित निष्कर्ष — विश्वास स्तर सहित"),
        );
        m.insert(
            "disclaimer".into(),
            json!("चिन्तन र सांस्कृतिक अन्तर्दृष्टिका लागि। प्रवृत्ति र सम्भावना देखाउँछ, निश्चितता होइन; व्यावसायिक सल्लाहको विकल्प होइन।"),
        );
    } else {
        m.insert(
            "method".into(),
            json!("Deterministic Parashari interpretation with confidence weighting"),
        );
        m.insert(
            "disclaimer".into(),
            json!("For reflection and cultural insight. Describes tendencies and probabilities, not certainties; not a substitute for professional advice."),
        );
    }
    m
}

fn utc_iso(at: UtcInstant) -> String {
    at.at_offset(0).to_string()
}

/// `iter_report(…)`: the meta record, one record per section, then `done`.
#[must_use]
pub fn iter_report(chart: &Chart, catalog: &[YogaRow], now: UtcInstant, lang: &str) -> Vec<Value> {
    let ne = !lang.starts_with("en");
    let ctx = Ctx {
        chart,
        yogas: catalog.iter().filter(|y| y.present).collect(),
        now,
        ne,
    };
    let mut records = Vec::new();
    let mut m = Map::new();
    m.insert("kind".into(), json!("meta"));
    m.extend(meta(&ctx));
    records.push(Value::Object(m));
    let sections = sections::build(&ctx);
    let total = sections.len();
    for (i, s) in sections.iter().enumerate() {
        let mut m = Map::new();
        m.insert("kind".into(), json!("section"));
        m.insert("index".into(), json!(i));
        m.insert("total".into(), json!(total));
        m.extend(s.to_map(ne));
        records.push(Value::Object(m));
    }
    records.push(json!({"kind": "done", "total": total}));
    records
}

/// The birth context the report reads when the panchanga could be built
/// (`_birth_context`): day birth and Gulika / Mandi longitudes.
#[derive(Debug, Clone, Copy, Default)]
pub struct BirthContext {
    /// Born between sunrise and sunset.
    pub is_day: Option<bool>,
    /// Gulika's longitude.
    pub gulika_lon: Option<f64>,
    /// Mandi's longitude.
    pub mandi_lon: Option<f64>,
}

/// `kundali_report(instant, location, lang=…)`'s records: the chart at `instant`
/// (Vimshottari over one cycle), read at `now`.
///
/// # Errors
///
/// [`crate::kundali_detail::DetailError`] when Shadbala cannot be computed.
pub fn kundali_report(
    instant: UtcInstant,
    location: &panchanga::daily::Location,
    context: BirthContext,
    now: UtcInstant,
    lang: &str,
) -> Result<Vec<Value>, crate::kundali_detail::DetailError> {
    use crate::chart::{ChartInputs, RawPlanet, build_chart, shadbala_facts};
    let snapshot = panchanga::at_time::planetary_snapshot(instant, location.lat, location.lon);
    let raw: [RawPlanet; 9] = std::array::from_fn(|i| {
        let row = &snapshot["planets"][Graha::ALL[i].key()];
        RawPlanet {
            longitude: row["longitude"].as_f64().unwrap_or(0.0),
            retrograde: row
                .get("is_retrograde")
                .or_else(|| row.get("retrograde"))
                .and_then(Value::as_bool)
                .unwrap_or(false),
        }
    });
    let moon_lon = raw[Graha::Moon.index()].longitude;
    let timeline = dasha::vimshottari_timeline(moon_lon, instant, 1);
    let shadbala = crate::shadbala::shadbala(instant, location)
        .map_err(|e| crate::kundali_detail::DetailError(e.to_string()))?;
    let facts = shadbala_facts(&shadbala);
    let chart = build_chart(
        &raw,
        &ChartInputs {
            lagna_lon: snapshot["lagna"]["longitude"].as_f64().unwrap_or(0.0),
            shadbala: &facts,
            timeline: Some(&timeline),
            now,
            is_day: context.is_day,
            gulika_lon: context.gulika_lon,
            mandi_lon: context.mandi_lon,
        },
    );
    let catalog = crate::yogas::full_yoga_catalog(&chart);
    Ok(iter_report(&chart, &catalog, now, lang))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn python_word_boundaries() {
        assert_eq!(
            apply_ne_regex("D1: 10th lord Saturn"),
            "D1: 10 औं भावका स्वामी Saturn"
        );
        assert_eq!(apply_ne_regex("Strong  x"), "बलियो x");
        assert_eq!(capitalize("career, status"), "Career, status");
    }
}
