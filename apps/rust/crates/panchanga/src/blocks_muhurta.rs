//! The muhurta block: Rahu Kalam, Yamaganda, Gulika, Abhijit, and the extended
//! auspicious / inauspicious timings (`muhurta.py`, `muhurta_timings.py`).

use astronomy::{angles::Anga, engine::sun_longitude};
use serde::Serialize;
use timescale::{PyInstant, UtcInstant, Zone};

use crate::{
    angas::{NAKSHATRA_SPAN, Paksha, karana, nakshatra, tithi, yoga},
    boundaries::{
        karana_end, nakshatra_end, nakshatra_start, span_end, sun_nakshatra_end, tithi_end,
        tithi_start, yoga_end, yoga_start,
    },
    daily::from_sunrise,
    pyfloat::{py_floordiv, py_int, py_mod, py_round},
};

const RAHU_KALAM_PERIOD: [u32; 7] = [8, 2, 7, 5, 6, 4, 3];
const YAMAGANDA_PERIOD: [u32; 7] = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PERIOD: [u32; 7] = [7, 6, 5, 4, 3, 2, 1];

/// Amrit / Varjyam ghati offsets per nakshatra (one each), Ashwini first.
const AMRITA_VARJYAM: [(u32, u32); 27] = [
    (42, 50),
    (48, 24),
    (54, 30),
    (52, 4),
    (38, 14),
    (35, 11),
    (54, 30),
    (44, 20),
    (56, 32),
    (54, 30),
    (44, 20),
    (42, 18),
    (45, 21),
    (44, 20),
    (38, 14),
    (38, 14),
    (34, 10),
    (38, 14),
    (44, 20),
    (48, 20),
    (44, 24),
    (34, 10),
    (34, 10),
    (42, 18),
    (40, 16),
    (48, 24),
    (54, 30),
];
/// Sarvartha Siddhi nakshatra indexes by weekday (Sunday first).
const SARVARTHA_SIDDHI: [&[usize]; 7] = [
    &[3, 7, 11, 12, 20, 25],
    &[3, 4, 7, 16, 21],
    &[0, 2, 8, 12, 25],
    &[2, 3, 4, 12, 16, 24, 25],
    &[6, 7, 16, 26],
    &[0, 6, 16, 21, 26],
    &[3, 14, 21],
];
const GANDA_MOOLA: [usize; 6] = [0, 8, 9, 17, 18, 26];
const AADAL_COUNTS: [usize; 8] = [2, 7, 9, 14, 16, 21, 23, 28];
const VIDAAL_COUNTS: [usize; 8] = [3, 6, 10, 13, 17, 20, 24, 27];
/// Dur muhurta indexes in the 30-muhurta day, by weekday (Sunday first).
const DUR_MUHURTA: [&[u32]; 7] = [&[13], &[11, 8], &[3, 21], &[7], &[11, 5], &[8, 3], &[1, 15]];
const ABHIJIT_ORDER: [usize; 28] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 27, 21, 22, 23, 24,
    25, 26,
];
const TITHI_RANDHRA_GHATIS: [(u32, i64); 6] = [(1, 5), (4, 8), (6, 9), (8, 14), (9, 25), (12, 10)];
const TITHI_VISHA_GHATI: [u32; 15] = [15, 5, 6, 7, 8, 9, 10, 14, 16, 18, 20, 20, 10, 14, 0];
/// Yoga visha opening ghatis (`None`: Vyatipata, the whole span).
const YOGA_VISHA: [(u32, Option<u32>); 7] = [
    (1, Some(5)),
    (6, Some(6)),
    (9, Some(5)),
    (10, Some(6)),
    (13, Some(9)),
    (15, Some(3)),
    (17, None),
];
const GHATI_SECONDS: i64 = 24 * 60;

/// Whether a timing entry is auspicious.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Tone {
    Good,
    Bad,
}

/// Whether a segment stops at its end or runs on past the day (`until_full_night`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Tail {
    Ends,
    RunsOn,
}

/// `_add_seconds`: whole seconds by floor, then truncated microseconds.
fn add_seconds_trunc(at: UtcInstant, seconds: f64) -> UtcInstant {
    let whole = py_floordiv(seconds, 1.0);
    #[expect(
        clippy::cast_possible_truncation,
        reason = "seconds within days fit i64"
    )]
    let whole_i = whole as i64;
    let micro = py_int((seconds - whole) * 1_000_000.0);
    at.add_micros(whole_i * 1_000_000 + micro)
}

/// A daily inauspicious period (Rahu Kalam, Yamaganda, Gulika).
#[derive(Debug, Serialize)]
pub(crate) struct PeriodBlock {
    lord: &'static str,
    period_no: u32,
    start_time: String,
    end_time: String,
    start_local: String,
    end_local: String,
    start_utc: String,
    end_utc: String,
    is_auspicious: bool,
}

fn period_block<I: PyInstant>(
    sunrise: I,
    sunset: I,
    period: u32,
    zone: &Zone,
    lord: &'static str,
) -> PeriodBlock {
    let hora_s = sunset.seconds_since(sunrise) / 8.0;
    let start = sunrise.add_seconds_f64(f64::from(period - 1) * hora_s);
    let end = sunrise.add_seconds_f64(f64::from(period) * hora_s);
    let (sl, el) = (start.wall(zone), end.wall(zone));
    PeriodBlock {
        lord,
        period_no: period,
        start_time: sl.hm,
        end_time: el.hm,
        start_local: sl.iso,
        end_local: el.iso,
        start_utc: start.to_string(),
        end_utc: end.to_string(),
        is_auspicious: false,
    }
}

/// The Abhijit muhurta (absent on Wednesdays).
#[derive(Debug, Serialize)]
pub(crate) struct Abhijit {
    name: &'static str,
    muhurta_no: u32,
    start_time: String,
    end_time: String,
    start_local: String,
    end_local: String,
    start_utc: String,
    end_utc: String,
    solar_noon: String,
    duration_minutes: f64,
    is_auspicious: bool,
}

fn abhijit<I: PyInstant>(sunrise: I, sunset: I, zone: &Zone, vaara: u32) -> Option<Abhijit> {
    if vaara % 7 == 3 {
        return None;
    }
    let total = sunset.seconds_since(sunrise);
    let muhurta_s = total / 15.0;
    let noon = sunrise.add_seconds_f64(total / 2.0);
    let start = sunrise.add_seconds_f64(7.0 * muhurta_s);
    let end = sunrise.add_seconds_f64(8.0 * muhurta_s);
    let (sl, el) = (start.wall(zone), end.wall(zone));
    Some(Abhijit {
        name: "Abhijit",
        muhurta_no: 8,
        start_time: sl.hm,
        end_time: el.hm,
        start_local: sl.iso,
        end_local: el.iso,
        start_utc: start.to_string(),
        end_utc: end.to_string(),
        solar_noon: noon.wall(zone).hm,
        duration_minutes: py_round(muhurta_s / 60.0, 1),
        is_auspicious: true,
    })
}

/// The muhurta block of the daily payload.
#[derive(Debug, Serialize)]
pub struct Muhurta {
    hora_duration_minutes: f64,
    #[serde(rename = "muhurta_duration_minutes")]
    each_minutes: f64,
    rahu_kalam: PeriodBlock,
    yamaganda: PeriodBlock,
    gulika: PeriodBlock,
    abhijit: Option<Abhijit>,
    #[serde(skip_serializing_if = "Option::is_none")]
    auspicious_timings: Option<Vec<Entry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    inauspicious_timings: Option<Vec<Entry>>,
}

impl Muhurta {
    /// Local solar noon (`HH:MM`), when the day has an Abhijit muhurta.
    #[must_use]
    pub fn solar_noon(&self) -> Option<&str> {
        self.abhijit.as_ref().map(|a| a.solar_noon.as_str())
    }

    /// The Abhijit muhurta's local start, end and solar noon (`HH:MM`), if the day has one.
    #[must_use]
    pub fn abhijit_times(&self) -> Option<(&str, &str, &str)> {
        self.abhijit.as_ref().map(|a| {
            (
                a.start_time.as_str(),
                a.end_time.as_str(),
                a.solar_noon.as_str(),
            )
        })
    }
}

/// `build_muhurta_block` alone: the periods and Abhijit without the extended timings.
/// A Julian Day sunrise gets only this (Python enriches the block, with
/// `enrich_muhurta_block`, only for `datetime` instants), and so does a month row
/// that does not carry the timings.
pub(crate) fn muhurta_basic<I: PyInstant>(
    sunrise: I,
    sunset: I,
    vaara: u32,
    zone: &Zone,
) -> Muhurta {
    let total = sunset.seconds_since(sunrise);
    let w = vaara as usize % 7;
    Muhurta {
        hora_duration_minutes: py_round(total / 8.0 / 60.0, 1),
        each_minutes: py_round(total / 15.0 / 60.0, 1),
        rahu_kalam: period_block(sunrise, sunset, RAHU_KALAM_PERIOD[w], zone, "Rahu"),
        yamaganda: period_block(sunrise, sunset, YAMAGANDA_PERIOD[w], zone, "Yama"),
        gulika: period_block(
            sunrise,
            sunset,
            GULIKA_PERIOD[w],
            zone,
            "Gulika (Manda-putra)",
        ),
        abhijit: abhijit(sunrise, sunset, zone, vaara),
        auspicious_timings: None,
        inauspicious_timings: None,
    }
}

/// The span of a panchanga day and its observer, shared by the timing helpers.
struct Day<'a> {
    sunrise: UtcInstant,
    sunset: UtcInstant,
    next_sunrise: UtcInstant,
    zone: &'a Zone,
}

/// One timing window of the day.
#[derive(Debug, Serialize)]
pub(crate) struct Segment {
    start_time: String,
    end_time: String,
    start_local_time: String,
    start_local_time_short: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    until_full_night: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    end_local_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    end_local_time_short: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    spans_midnight: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    subtitle_en: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    subtitle_ne: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    is_auspicious: Option<bool>,
}

impl Day<'_> {
    /// `_segment`.
    fn segment(&self, start: UtcInstant, end: UtcInstant, tail: Tail) -> Segment {
        let until_full_night = tail == Tail::RunsOn;
        let day_end = self.next_sunrise;
        let local = self.zone.local(start);
        let ends_inside = end < day_end;
        Segment {
            start_time: start.to_string(),
            end_time: end.to_string(),
            start_local_time: local.to_string(),
            start_local_time_short: local.hm(),
            until_full_night: (until_full_night || end >= day_end).then_some(true),
            end_local_time: ends_inside
                .then(|| from_sunrise(end, self.sunrise, self.zone).local_time),
            end_local_time_short: ends_inside.then(|| self.zone.local(end).hm()),
            spans_midnight: (end.fields().0 != start.fields().0).then_some(true),
            subtitle_en: None,
            subtitle_ne: None,
            is_auspicious: None,
        }
    }

    /// `_clip_segment` to the day (sunrise → next sunrise).
    fn clip(&self, start: UtcInstant, end: UtcInstant) -> Option<Segment> {
        let (vs, ve) = (start.max(self.sunrise), end.min(self.next_sunrise));
        (vs < ve).then(|| {
            self.segment(
                vs,
                ve,
                if ve >= self.next_sunrise && end > self.next_sunrise {
                    Tail::RunsOn
                } else {
                    Tail::Ends
                },
            )
        })
    }
}

/// The older four-field segment of the Rahu, Yamaganda, Gulika and Abhijit entries.
#[derive(Debug, Serialize)]
pub(crate) struct PlainSegment {
    start_local_time_short: String,
    end_local_time_short: String,
    start_time: String,
    end_time: String,
}

/// A segment of a timing entry.
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub(crate) enum Part {
    Window(Segment),
    Plain(PlainSegment),
}

/// One named timing with its windows.
#[derive(Debug, Serialize)]
pub(crate) struct Entry {
    key: &'static str,
    name_en: &'static str,
    name_ne: &'static str,
    is_auspicious: bool,
    segments: Vec<Part>,
}

fn entry(
    key: &'static str,
    name_en: &'static str,
    name_ne: &'static str,
    segments: Vec<Segment>,
    tone: Tone,
) -> Entry {
    Entry {
        key,
        name_en,
        name_ne,
        is_auspicious: tone == Tone::Good,
        segments: segments.into_iter().map(Part::Window).collect(),
    }
}

struct Interval {
    index: usize,
    number: u32,
    display: u32,
    paksha: Paksha,
    start: UtcInstant,
    end: UtcInstant,
}

fn moon_intervals(day: &Day<'_>) -> Vec<Interval> {
    let mut out = Vec::new();
    let mut cursor = day.sunrise;
    while cursor < day.next_sunrise {
        let n = nakshatra(cursor.to_jd()).number;
        let (start, end) = (nakshatra_start(cursor), nakshatra_end(cursor));
        out.push(Interval {
            index: n as usize - 1,
            number: n,
            display: 0,
            paksha: Paksha::Shukla,
            start,
            end,
        });
        if end >= day.next_sunrise {
            break;
        }
        cursor = end.add_seconds(90);
    }
    out
}

fn sun_intervals(day: &Day<'_>) -> Vec<Interval> {
    let mut out = Vec::new();
    let mut cursor = day.sunrise;
    while cursor < day.next_sunrise {
        let mut n = py_int(sun_longitude(cursor.to_jd()) / NAKSHATRA_SPAN) + 1;
        if n > 27 {
            n = 1;
        }
        let n = u32::try_from(n).unwrap_or(1);
        let end = sun_nakshatra_end(cursor).min(day.next_sunrise);
        out.push(Interval {
            index: n as usize - 1,
            number: n,
            display: 0,
            paksha: Paksha::Shukla,
            start: cursor,
            end,
        });
        if end >= day.next_sunrise {
            break;
        }
        cursor = end.add_seconds(90);
    }
    out
}

fn tithi_intervals(day: &Day<'_>) -> Vec<Interval> {
    let mut out = Vec::new();
    let mut cursor = day.sunrise;
    for _ in 0..40 {
        if cursor >= day.next_sunrise {
            break;
        }
        let t = tithi(cursor.to_jd());
        let end = tithi_end(cursor);
        out.push(Interval {
            index: 0,
            number: t.number,
            display: t.display_number,
            paksha: t.paksha,
            start: tithi_start(cursor),
            end,
        });
        if end >= day.next_sunrise {
            break;
        }
        cursor = end.add_seconds(90);
    }
    out
}

fn yoga_intervals(day: &Day<'_>) -> Vec<Interval> {
    let mut out = Vec::new();
    let mut cursor = day.sunrise;
    for _ in 0..40 {
        if cursor >= day.next_sunrise {
            break;
        }
        let n = yoga(cursor.to_jd()).number;
        let end = yoga_end(cursor);
        out.push(Interval {
            index: 0,
            number: n,
            display: 0,
            paksha: Paksha::Shukla,
            start: yoga_start(cursor),
            end,
        });
        if end >= day.next_sunrise {
            break;
        }
        cursor = end.add_seconds(90);
    }
    out
}

fn period_windows(day: &Day<'_>, nak: &Interval, offset: u32) -> Option<Segment> {
    let duration = nak.end.seconds_since(nak.start);
    let period = duration * 4.0 / 60.0;
    let start = add_seconds_trunc(nak.start, duration * f64::from(offset) / 60.0);
    day.clip(start, add_seconds_trunc(start, period))
}

fn vishti_spans(day: &Day<'_>) -> Vec<Segment> {
    let mut out = Vec::new();
    let mut cursor = day.sunrise;
    while cursor < day.next_sunrise {
        if karana(cursor.to_jd()).name() != "Vishti" {
            cursor = karana_end(cursor).add_seconds(90);
            continue;
        }
        let end = karana_end(cursor).min(day.next_sunrise);
        out.extend(day.clip(cursor, end));
        cursor = end.add_seconds(90);
    }
    out
}

fn count_with_abhijit(sun: usize, moon: usize) -> usize {
    let (Some(s), Some(m)) = (
        ABHIJIT_ORDER.iter().position(|i| *i == sun),
        ABHIJIT_ORDER.iter().position(|i| *i == moon),
    ) else {
        return 0;
    };
    let total = ABHIJIT_ORDER.len();
    if s <= m {
        let count = (m - s + 1) % total;
        if count == 0 { total } else { count }
    } else {
        total - s + m + 1
    }
}

fn overlap_windows(
    day: &Day<'_>,
    moons: &[Interval],
    suns: &[Interval],
    counts: &[usize; 8],
) -> Vec<Segment> {
    let mut out = Vec::new();
    for moon in moons {
        for sun in suns {
            let (start, end) = (moon.start.max(sun.start), moon.end.min(sun.end));
            if start >= end || !counts.contains(&count_with_abhijit(sun.index, moon.index)) {
                continue;
            }
            out.extend(day.clip(start, end));
        }
    }
    out
}

fn baana_segments(day: &Day<'_>) -> Vec<Segment> {
    let band = |jd: f64| u32::try_from(py_int(py_mod(sun_longitude(jd), 30.0))).unwrap_or(0);
    let mut out = Vec::new();
    let mut cursor = day.sunrise;
    for _ in 0..48 {
        if cursor >= day.next_sunrise {
            break;
        }
        let degree = band(cursor.to_jd()) + 1;
        let band_end = span_end(cursor, Anga::SunDegree);
        let meta = match degree {
            1 | 10 | 19 | 28 => Some(("Mrityu", "मृत्यु")),
            2 | 11 | 20 | 29 => Some(("Agni", "अग्नि")),
            4 | 13 | 21 => Some(("Raja", "राज")),
            6 | 15 | 24 => Some(("Chora", "चोर")),
            8 | 17 | 26 => Some(("Roga", "रोग")),
            _ => None,
        };
        if let Some((en, ne)) = meta {
            if let Some(mut seg) = day.clip(cursor, band_end) {
                seg.subtitle_en = Some(en);
                seg.subtitle_ne = Some(ne);
                seg.is_auspicious = Some(false);
                out.push(seg);
            }
        }
        if band_end >= day.next_sunrise {
            break;
        }
        cursor = band_end.add_seconds(30);
    }
    out
}

fn push_if(
    list: &mut Vec<Entry>,
    key: &'static str,
    en: &'static str,
    ne: &'static str,
    segments: Vec<Segment>,
    tone: Tone,
) {
    if !segments.is_empty() {
        list.push(entry(key, en, ne, segments, tone));
    }
}

/// `build_extended_muhurta_timings`: (auspicious, inauspicious) entries.
#[expect(
    clippy::too_many_lines,
    reason = "one list of classical timings, kept in the Python order"
)]
fn extended(day: &Day<'_>, vaara: u32) -> (Vec<Entry>, Vec<Entry>) {
    let day_s = day.sunset.seconds_since(day.sunrise);
    let night_s = day.next_sunrise.seconds_since(day.sunset);
    let (day_part, night_part) = (day_s / 15.0, night_s / 15.0);
    let sandhya_s = 3.0 * (night_s / 30.0);
    let w = vaara as usize % 7;
    let (mut good, mut bad) = (Vec::new(), Vec::new());
    let moons = moon_intervals(day);
    let suns = sun_intervals(day);

    let amrit: Vec<Segment> = moons
        .iter()
        .filter_map(|n| period_windows(day, n, AMRITA_VARJYAM[n.index % 27].0))
        .collect();
    let varjyam: Vec<Segment> = moons
        .iter()
        .filter_map(|n| period_windows(day, n, AMRITA_VARJYAM[n.index % 27].1))
        .collect();
    push_if(
        &mut good,
        "amrit_kalam",
        "Amrit Kalam",
        "अमृत काल",
        amrit,
        Tone::Good,
    );
    push_if(&mut bad, "varjyam", "Varjyam", "वर्ज्यम्", varjyam, Tone::Bad);
    let sarvartha: Vec<Segment> = moons
        .iter()
        .filter(|n| SARVARTHA_SIDDHI[w].contains(&n.index))
        .filter_map(|n| day.clip(n.start, n.end))
        .collect();
    push_if(
        &mut good,
        "sarvartha_siddhi",
        "Sarvartha Siddhi Yoga",
        "सर्वार्थ सिद्धि योग",
        sarvartha,
        Tone::Good,
    );

    let fixed = |start: UtcInstant, end: UtcInstant| vec![day.segment(start, end, Tail::Ends)];
    let vij = add_seconds_trunc(day.sunrise, 10.0 * day_part);
    good.push(entry(
        "vijaya_muhurta",
        "Vijaya Muhurta",
        "विजय मुहूर्त",
        fixed(vij, add_seconds_trunc(vij, day_part)),
        Tone::Good,
    ));
    good.push(entry(
        "godhuli_muhurta",
        "Godhuli Muhurta",
        "गोधूलि मुहूर्त",
        fixed(day.sunset, add_seconds_trunc(day.sunset, night_s / 30.0)),
        Tone::Good,
    ));
    good.push(entry(
        "pratah_sandhya",
        "Pratah Sandhya",
        "प्रातः सन्ध्या",
        fixed(add_seconds_trunc(day.sunrise, -sandhya_s), day.sunrise),
        Tone::Good,
    ));
    good.push(entry(
        "sayahna_sandhya",
        "Sayahna Sandhya",
        "सायं सन्ध्या",
        fixed(day.sunset, add_seconds_trunc(day.sunset, sandhya_s)),
        Tone::Good,
    ));
    let nish = add_seconds_trunc(day.sunset, 7.0 * night_part);
    good.push(entry(
        "nishita_muhurta",
        "Nishita Muhurta",
        "निशिता मुहूर्त",
        fixed(nish, add_seconds_trunc(nish, night_part)),
        Tone::Good,
    ));
    good.push(entry(
        "brahma_muhurta",
        "Brahma Muhurta",
        "ब्रह्म मुहूर्त",
        fixed(
            add_seconds_trunc(day.sunrise, -2.0 * night_part),
            add_seconds_trunc(day.sunrise, -night_part),
        ),
        Tone::Good,
    ));

    let dur: Vec<Segment> = DUR_MUHURTA[w]
        .iter()
        .filter_map(|&i| {
            let (base, part, n) = if i < 15 {
                (day.sunrise, day_part, i)
            } else {
                (day.sunset, night_part, i - 15)
            };
            day.clip(
                add_seconds_trunc(base, f64::from(n) * part),
                add_seconds_trunc(base, f64::from(n + 1) * part),
            )
        })
        .collect();
    push_if(
        &mut bad,
        "dur_muhurtam",
        "Dur Muhurtam",
        "दुर्मुहूर्तम्",
        dur,
        Tone::Bad,
    );
    push_if(
        &mut bad,
        "bhadra",
        "Bhadra",
        "भद्रा",
        vishti_spans(day),
        Tone::Bad,
    );
    let ganda: Vec<Segment> = moons
        .iter()
        .filter(|n| GANDA_MOOLA.contains(&n.index))
        .filter_map(|n| day.clip(n.start, n.end))
        .collect();
    push_if(
        &mut bad,
        "ganda_moola",
        "Ganda Moola",
        "गण्ड मूल",
        ganda,
        Tone::Bad,
    );
    push_if(
        &mut bad,
        "aadal_yoga",
        "Aadal Yoga",
        "आडाल योग",
        overlap_windows(day, &moons, &suns, &AADAL_COUNTS),
        Tone::Bad,
    );
    push_if(
        &mut bad,
        "vidaal_yoga",
        "Vidaal Yoga",
        "विडाल योग",
        overlap_windows(day, &moons, &suns, &VIDAAL_COUNTS),
        Tone::Bad,
    );
    push_if(
        &mut bad,
        "baana",
        "Baana",
        "बाण",
        baana_segments(day),
        Tone::Bad,
    );

    let dagdha = [12, 11, 5, 3, 6, 8, 9][w];
    let (mut bad_tithi, mut randhra, mut visha) = (Vec::new(), Vec::new(), Vec::new());
    for t in tithi_intervals(day) {
        let malefic = [4, 9, 14].contains(&t.display)
            || (t.display == 15 && t.paksha == Paksha::Krishna)
            || dagdha == t.display;
        if malefic {
            bad_tithi.extend(day.clip(t.start, t.end));
        }
        if let Some(&(_, ghatis)) = TITHI_RANDHRA_GHATIS.iter().find(|(d, _)| *d == t.display) {
            randhra.extend(day.clip(t.start, t.start.add_seconds(ghatis * GHATI_SECONDS)));
        }
        let offset = TITHI_VISHA_GHATI[t.display as usize - 1];
        let t_dur = t.end.seconds_since(t.start);
        let v_start = add_seconds_trunc(t.start, t_dur * f64::from(offset) / 60.0);
        visha.extend(day.clip(v_start, add_seconds_trunc(v_start, t_dur * 4.0 / 60.0)));
    }
    push_if(&mut bad, "tithi", "Tithi", "तिथि", bad_tithi, Tone::Bad);
    push_if(
        &mut bad,
        "tithi_randhra",
        "Tithi Randhra",
        "तिथि रन्ध्र",
        randhra,
        Tone::Bad,
    );
    push_if(
        &mut bad,
        "visha_tithi",
        "Tithi Visha",
        "तिथि विष",
        visha,
        Tone::Bad,
    );
    let visha_yoga: Vec<Segment> = yoga_intervals(day)
        .iter()
        .filter_map(|y| {
            let (_, ghatis) = YOGA_VISHA.iter().find(|(n, _)| *n == y.number)?;
            let end = match ghatis {
                None => y.end,
                Some(g) => {
                    add_seconds_trunc(y.start, y.end.seconds_since(y.start) * f64::from(*g) / 60.0)
                }
            };
            day.clip(y.start, end)
        })
        .collect();
    push_if(
        &mut bad,
        "visha_yoga",
        "Yoga Visha",
        "योग विष",
        visha_yoga,
        Tone::Bad,
    );
    (good, bad)
}

/// An entry for a daily period or Abhijit, with its older four-field segment.
fn legacy_entry(
    key: &'static str,
    en: &'static str,
    ne: &'static str,
    window: Option<(&str, &str, &str, &str)>,
    tone: Tone,
) -> Option<Entry> {
    let (start_time, end_time, start_local, end_local) = window?;
    Some(Entry {
        key,
        name_en: en,
        name_ne: ne,
        is_auspicious: tone == Tone::Good,
        segments: vec![Part::Plain(PlainSegment {
            start_local_time_short: start_time.to_owned(),
            end_local_time_short: end_time.to_owned(),
            start_time: start_local.to_owned(),
            end_time: end_local.to_owned(),
        })],
    })
}

/// `build_muhurta_block` + `enrich_muhurta_block`.
pub(crate) fn muhurta(
    sunrise: UtcInstant,
    sunset: UtcInstant,
    next_sunrise: UtcInstant,
    vaara: u32,
    zone: &Zone,
) -> Muhurta {
    let total = sunset.seconds_since(sunrise);
    let w = vaara as usize % 7;
    let rahu = period_block(sunrise, sunset, RAHU_KALAM_PERIOD[w], zone, "Rahu");
    let yama = period_block(sunrise, sunset, YAMAGANDA_PERIOD[w], zone, "Yama");
    let gulika = period_block(
        sunrise,
        sunset,
        GULIKA_PERIOD[w],
        zone,
        "Gulika (Manda-putra)",
    );
    let abhijit = abhijit(sunrise, sunset, zone, vaara);
    let day = Day {
        sunrise,
        sunset,
        next_sunrise,
        zone,
    };
    let (mut good, mut bad) = extended(&day, vaara);
    if let Some(e) = legacy_entry(
        "abhijit",
        "Abhijit Muhurta",
        "अभिजित् मुहूर्त",
        abhijit.as_ref().map(|a| {
            (
                a.start_time.as_str(),
                a.end_time.as_str(),
                a.start_local.as_str(),
                a.end_local.as_str(),
            )
        }),
        Tone::Good,
    ) {
        good.insert(2.min(good.len()), e);
    }
    for (key, en, ne, block) in [
        ("rahu_kalam", "Rahu Kaal", "राहु काल", &rahu),
        ("yamaganda", "Yamaganda", "यमगण्ड", &yama),
        ("gulika", "Gulika Kaal", "गुलिक काल", &gulika),
    ] {
        let window = Some((
            block.start_time.as_str(),
            block.end_time.as_str(),
            block.start_local.as_str(),
            block.end_local.as_str(),
        ));
        if let Some(e) = legacy_entry(key, en, ne, window, Tone::Bad) {
            bad.insert(0, e);
        }
    }
    Muhurta {
        hora_duration_minutes: py_round(total / 8.0 / 60.0, 1),
        each_minutes: py_round(total / 15.0 / 60.0, 1),
        rahu_kalam: rahu,
        yamaganda: yama,
        gulika,
        abhijit,
        auspicious_timings: Some(good),
        inauspicious_timings: Some(bad),
    }
}
