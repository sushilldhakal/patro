//! The muhurta block: Rahu Kalam, Yamaganda, Gulika, Abhijit, and the extended
//! auspicious / inauspicious timings (`muhurta.py`, `muhurta_timings.py`).

use astronomy::{angles::Anga, engine::sun_longitude};
use serde_json::{Map, Value, json};
use timescale::{JdInstant, PyInstant, UtcInstant, Zone};

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

fn period_block<I: PyInstant>(
    sunrise: I,
    sunset: I,
    period: u32,
    zone: &Zone,
    lord: &str,
) -> Value {
    let hora_s = sunset.seconds_since(sunrise) / 8.0;
    let start = sunrise.add_seconds_f64(f64::from(period - 1) * hora_s);
    let end = sunrise.add_seconds_f64(f64::from(period) * hora_s);
    let (sl, el) = (start.wall(zone), end.wall(zone));
    json!({
        "lord": lord, "period_no": period, "start_time": sl.hm, "end_time": el.hm,
        "start_local": sl.iso, "end_local": el.iso,
        "start_utc": start.to_string(), "end_utc": end.to_string(), "is_auspicious": false,
    })
}

fn abhijit<I: PyInstant>(sunrise: I, sunset: I, zone: &Zone, vaara: u32) -> Value {
    if vaara % 7 == 3 {
        return Value::Null;
    }
    let total = sunset.seconds_since(sunrise);
    let muhurta_s = total / 15.0;
    let noon = sunrise.add_seconds_f64(total / 2.0);
    let start = sunrise.add_seconds_f64(7.0 * muhurta_s);
    let end = sunrise.add_seconds_f64(8.0 * muhurta_s);
    let (sl, el) = (start.wall(zone), end.wall(zone));
    json!({
        "name": "Abhijit", "muhurta_no": 8, "start_time": sl.hm, "end_time": el.hm,
        "start_local": sl.iso, "end_local": el.iso,
        "start_utc": start.to_string(), "end_utc": end.to_string(),
        "solar_noon": noon.wall(zone).hm, "duration_minutes": py_round(muhurta_s / 60.0, 1), "is_auspicious": true,
    })
}

/// `build_muhurta_block` alone, for a Julian Day sunrise: Python enriches the block
/// (`enrich_muhurta_block`) only for `datetime` instants.
pub(crate) fn muhurta_civil(
    sunrise: JdInstant,
    sunset: JdInstant,
    vaara: u32,
    zone: &Zone,
) -> Value {
    let total = sunset.seconds_since(sunrise);
    let w = vaara as usize % 7;
    json!({
        "hora_duration_minutes": py_round(total / 8.0 / 60.0, 1),
        "muhurta_duration_minutes": py_round(total / 15.0 / 60.0, 1),
        "rahu_kalam": period_block(sunrise, sunset, RAHU_KALAM_PERIOD[w], zone, "Rahu"),
        "yamaganda": period_block(sunrise, sunset, YAMAGANDA_PERIOD[w], zone, "Yama"),
        "gulika": period_block(sunrise, sunset, GULIKA_PERIOD[w], zone, "Gulika (Manda-putra)"),
        "abhijit": abhijit(sunrise, sunset, zone, vaara),
    })
}

/// The span of a panchanga day and its observer, shared by the timing helpers.
struct Day<'a> {
    sunrise: UtcInstant,
    sunset: UtcInstant,
    next_sunrise: UtcInstant,
    zone: &'a Zone,
}

impl Day<'_> {
    /// `_segment`.
    fn segment(&self, start: UtcInstant, end: UtcInstant, tail: Tail) -> Value {
        let until_full_night = tail == Tail::RunsOn;
        let day_end = self.next_sunrise;
        let local = self.zone.local(start);
        let mut out = Map::new();
        out.insert("start_time".into(), json!(start.to_string()));
        out.insert("end_time".into(), json!(end.to_string()));
        out.insert("start_local_time".into(), json!(local.to_string()));
        out.insert("start_local_time_short".into(), json!(local.hm()));
        if until_full_night || end >= day_end {
            out.insert("until_full_night".into(), json!(true));
        }
        if end < day_end {
            out.insert(
                "end_local_time".into(),
                json!(from_sunrise(end, self.sunrise, self.zone).local_time),
            );
            out.insert(
                "end_local_time_short".into(),
                json!(self.zone.local(end).hm()),
            );
        }
        if end.fields().0 != start.fields().0 {
            out.insert("spans_midnight".into(), json!(true));
        }
        Value::Object(out)
    }

    /// `_clip_segment` to the day (sunrise → next sunrise).
    fn clip(&self, start: UtcInstant, end: UtcInstant) -> Option<Value> {
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

fn entry(key: &str, name_en: &str, name_ne: &str, segments: Vec<Value>, tone: Tone) -> Value {
    let auspicious = tone == Tone::Good;
    json!({"key": key, "name_en": name_en, "name_ne": name_ne, "is_auspicious": auspicious, "segments": Value::Array(segments)})
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

fn period_windows(day: &Day<'_>, nak: &Interval, offset: u32) -> Option<Value> {
    let duration = nak.end.seconds_since(nak.start);
    let period = duration * 4.0 / 60.0;
    let start = add_seconds_trunc(nak.start, duration * f64::from(offset) / 60.0);
    day.clip(start, add_seconds_trunc(start, period))
}

fn vishti_spans(day: &Day<'_>) -> Vec<Value> {
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
) -> Vec<Value> {
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

fn baana_segments(day: &Day<'_>) -> Vec<Value> {
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
            if let Some(Value::Object(mut seg)) = day.clip(cursor, band_end) {
                seg.insert("subtitle_en".into(), json!(en));
                seg.insert("subtitle_ne".into(), json!(ne));
                seg.insert("is_auspicious".into(), json!(false));
                out.push(Value::Object(seg));
            }
        }
        if band_end >= day.next_sunrise {
            break;
        }
        cursor = band_end.add_seconds(30);
    }
    out
}

fn push_if(list: &mut Vec<Value>, key: &str, en: &str, ne: &str, segments: Vec<Value>, tone: Tone) {
    if !segments.is_empty() {
        list.push(entry(key, en, ne, segments, tone));
    }
}

/// `build_extended_muhurta_timings`: (auspicious, inauspicious) entries.
#[expect(
    clippy::too_many_lines,
    reason = "one list of classical timings, kept in the Python order"
)]
fn extended(day: &Day<'_>, vaara: u32) -> (Vec<Value>, Vec<Value>) {
    let day_s = day.sunset.seconds_since(day.sunrise);
    let night_s = day.next_sunrise.seconds_since(day.sunset);
    let (day_part, night_part) = (day_s / 15.0, night_s / 15.0);
    let sandhya_s = 3.0 * (night_s / 30.0);
    let w = vaara as usize % 7;
    let (mut good, mut bad) = (Vec::new(), Vec::new());
    let moons = moon_intervals(day);
    let suns = sun_intervals(day);

    let amrit: Vec<Value> = moons
        .iter()
        .filter_map(|n| period_windows(day, n, AMRITA_VARJYAM[n.index % 27].0))
        .collect();
    let varjyam: Vec<Value> = moons
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
    let sarvartha: Vec<Value> = moons
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

    let dur: Vec<Value> = DUR_MUHURTA[w]
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
    let ganda: Vec<Value> = moons
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
    let visha_yoga: Vec<Value> = yoga_intervals(day)
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

fn legacy_entry(key: &str, en: &str, ne: &str, block: &Value, tone: Tone) -> Option<Value> {
    block.get("start_time")?.as_str()?;
    let seg = json!({
        "start_local_time_short": block["start_time"], "end_local_time_short": block["end_time"],
        "start_time": block["start_local"], "end_time": block["end_local"],
    });
    Some(entry(key, en, ne, vec![seg], tone))
}

/// `build_muhurta_block` + `enrich_muhurta_block`.
pub(crate) fn muhurta(
    sunrise: UtcInstant,
    sunset: UtcInstant,
    next_sunrise: UtcInstant,
    vaara: u32,
    zone: &Zone,
) -> Value {
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
        &abhijit,
        Tone::Good,
    ) {
        good.insert(2.min(good.len()), e);
    }
    for (key, en, ne, block) in [
        ("rahu_kalam", "Rahu Kaal", "राहु काल", &rahu),
        ("yamaganda", "Yamaganda", "यमगण्ड", &yama),
        ("gulika", "Gulika Kaal", "गुलिक काल", &gulika),
    ] {
        if let Some(e) = legacy_entry(key, en, ne, block, Tone::Bad) {
            bad.insert(0, e);
        }
    }
    json!({
        "hora_duration_minutes": py_round(total / 8.0 / 60.0, 1),
        "muhurta_duration_minutes": py_round(total / 15.0 / 60.0, 1),
        "rahu_kalam": rahu, "yamaganda": yama, "gulika": gulika, "abhijit": abhijit,
        "auspicious_timings": good, "inauspicious_timings": bad,
    })
}
