//! Nivas and shool: directional abodes and homa indicators (`nivas_shool.py`).

use serde::Serialize;
use timescale::{PyInstant, Zone};

use crate::{
    angas::{karana, nakshatra, tithi},
    boundaries::{karana_end, moon_rashi_end, nakshatra_end, tithi_end},
    daily::{from_sunrise, py_min},
    text_tables::{
        AGNIVASA, BHADRA_LOKA, DIRECTIONS, HOMAHUTI_GRAHAS, KUMBHACHAKRA_PARTS, RAHU_VASA,
        SHIVAVASA,
    },
};
use astronomy::engine::{moon_longitude, sun_longitude};

use crate::{angas::NAKSHATRA_SPAN, pyfloat::py_int};

/// Disha shool direction index (0 E, 1 W, 2 N, 3 S) by Python weekday (Monday first).
const DISHA_SHOOLA: [usize; 7] = [0, 2, 2, 3, 1, 0, 1];

/// A compass direction.
#[derive(Debug, Clone, Serialize)]
struct Direction {
    #[serde(rename = "direction_key")]
    key: &'static str,
    name_en: &'static str,
    name_ne: &'static str,
}

fn direction(i: usize) -> Direction {
    let (key, name_en, name_ne) = DIRECTIONS[i % 4];
    Direction {
        key,
        name_en,
        name_ne,
    }
}

/// Disha shool: the day's forbidden direction and the four safe ones.
#[derive(Debug, Serialize)]
struct DishaShool {
    #[serde(flatten)]
    forbidden: Direction,
    auspicious_directions: Vec<Direction>,
}

fn disha_shool(weekday_py: usize) -> DishaShool {
    let i = DISHA_SHOOLA[weekday_py % 7];
    DishaShool {
        forbidden: direction(i),
        auspicious_directions: (0..4).filter(|j| *j != i).map(direction).collect(),
    }
}

#[derive(Debug, Clone, Serialize)]
struct Agnivasa {
    name_en: &'static str,
    name_ne: &'static str,
    subtitle_en: &'static str,
    subtitle_ne: &'static str,
    is_auspicious: bool,
}

fn agnivasa(tithi_absolute: u32, weekday_py: usize) -> Agnivasa {
    let vaara = [2, 3, 4, 5, 6, 7, 1][weekday_py % 7];
    let (name_en, name_ne, subtitle_en, subtitle_ne, is_auspicious) =
        AGNIVASA[[0, 1, 2, 0][((tithi_absolute + vaara + 1) % 4) as usize]];
    Agnivasa {
        name_en,
        name_ne,
        subtitle_en,
        subtitle_ne,
        is_auspicious,
    }
}

#[derive(Debug, Clone, Serialize)]
struct Shivavasa {
    name_en: &'static str,
    name_ne: &'static str,
    is_auspicious: bool,
}

fn shivavasa(tithi_absolute: u32) -> Shivavasa {
    let paksha_tithi = (tithi_absolute - 1) % 15 + 1;
    let (name_en, name_ne, is_auspicious) =
        SHIVAVASA[[6, 0, 1, 2, 3, 4, 5][((paksha_tithi * 2 + 5) % 7) as usize]];
    Shivavasa {
        name_en,
        name_ne,
        is_auspicious,
    }
}

#[derive(Debug, Clone, Serialize)]
struct Kumbha {
    name_en: &'static str,
    name_ne: &'static str,
    is_auspicious: bool,
    index: usize,
}

fn kumbha(paksha_tithi: u32, weekday_py: usize) -> Kumbha {
    let index = (weekday_py + paksha_tithi as usize) % 7;
    let (name_en, name_ne, is_auspicious) = KUMBHACHAKRA_PARTS[index];
    Kumbha {
        name_en,
        name_ne,
        is_auspicious,
        index,
    }
}

#[derive(Debug, Clone, Serialize)]
struct Homahuti {
    key: &'static str,
    symbol: &'static str,
    name_en: &'static str,
    name_ne: &'static str,
    is_auspicious: bool,
}

fn homahuti<I: PyInstant>(at: I) -> Homahuti {
    let jd = at.to_jd();
    let mut sun_nak = py_int(sun_longitude(jd) / NAKSHATRA_SPAN) + 1;
    if sun_nak > 27 {
        sun_nak = 1;
    }
    let moon_nak = i64::from(nakshatra(jd).number);
    let distance = usize::try_from((moon_nak - sun_nak).rem_euclid(27)).unwrap_or(0);
    let (key, symbol, name_en, name_ne, is_auspicious) = HOMAHUTI_GRAHAS[(distance / 3) % 9];
    Homahuti {
        key,
        symbol,
        name_en,
        name_ne,
        is_auspicious,
    }
}

fn moon_rashi_number<I: PyInstant>(at: I) -> usize {
    usize::try_from(py_int(moon_longitude(at.to_jd()) / 30.0) % 12).unwrap_or(0) + 1
}

fn chandra_vasa<I: PyInstant>(at: I) -> Direction {
    direction([2, 0, 3, 1][moon_rashi_number(at) % 4])
}

/// How a timed span ends: with its end clock, or running to the next sunrise.
#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
enum SpanEnd {
    At {
        end_time: String,
        end_local_time: String,
        end_local_time_short: String,
    },
    Until {
        until_full_night: bool,
    },
}

/// A span of the day with its start clock, its own fields and its end.
#[derive(Debug, Clone, Serialize)]
struct Timed<T> {
    start_time: String,
    start_local_time_short: String,
    #[serde(flatten)]
    value: T,
    #[serde(flatten)]
    end: SpanEnd,
}

/// The span in force at sunrise (the first one), or the bare value when none.
#[derive(Debug, Serialize)]
#[serde(untagged)]
enum Current<T> {
    Span(Timed<T>),
    Bare(T),
}

/// A block of spans with the one in force.
#[derive(Debug, Serialize)]
struct Spans<T> {
    current: Current<T>,
    segments: Vec<Timed<T>>,
}

fn spans<T: Clone>(segments: Vec<Timed<T>>, fallback: impl FnOnce() -> T) -> Spans<T> {
    let current = segments
        .first()
        .cloned()
        .map_or_else(|| Current::Bare(fallback()), Current::Span);
    Spans { current, segments }
}

#[derive(Debug, Serialize)]
struct Bhadra {
    name_en: &'static str,
    name_ne: &'static str,
    subtitle_en: &'static str,
    subtitle_ne: &'static str,
    is_auspicious: bool,
    loka: &'static str,
}

#[derive(Debug, Serialize)]
struct Bhadravasa {
    active: bool,
    segments: Vec<Timed<Bhadra>>,
}

/// The nivas and shool block: abodes by tithi, nakshatra and Moon sign.
#[derive(Debug, Serialize)]
pub(crate) struct NivasShool {
    homahuti: Spans<Homahuti>,
    disha_shool: DishaShool,
    rahu_vasa: Direction,
    agnivasa: Spans<Agnivasa>,
    shivavasa: Spans<Shivavasa>,
    chandra_vasa: Spans<Direction>,
    bhadravasa: Bhadravasa,
    kumbha_chakra: Spans<Kumbha>,
}

struct Window<'a, I> {
    sunrise: I,
    next_sunrise: I,
    zone: &'a Zone,
}

impl<I: PyInstant> Window<'_, I> {
    fn boundaries(&self, find_end: impl Fn(I) -> I) -> Vec<I> {
        let mut points = vec![self.sunrise];
        let mut cursor = self.sunrise;
        while cursor < self.next_sunrise {
            let end = py_min(find_end(cursor), self.next_sunrise);
            if end < self.next_sunrise && !points.contains(&end) {
                points.push(end);
            }
            if end >= self.next_sunrise {
                break;
            }
            cursor = end.add_seconds(90);
        }
        points
    }

    fn end_of(&self, end: I) -> SpanEnd {
        if end >= self.next_sunrise {
            return SpanEnd::Until {
                until_full_night: true,
            };
        }
        SpanEnd::At {
            end_time: end.to_string(),
            end_local_time: from_sunrise(end, self.sunrise, self.zone).local_time,
            end_local_time_short: end.wall(self.zone).hm,
        }
    }

    fn span<T>(&self, start: I, end: I, value: T) -> Timed<T> {
        Timed {
            start_time: start.to_string(),
            start_local_time_short: start.wall(self.zone).hm,
            value,
            end: self.end_of(end),
        }
    }

    fn timed<T>(&self, bounds: &[I], value: impl Fn(I) -> T) -> Vec<Timed<T>> {
        bounds
            .iter()
            .enumerate()
            .map(|(i, &start)| {
                let end = bounds.get(i + 1).copied().unwrap_or(self.next_sunrise);
                self.span(start, end, value(start))
            })
            .collect()
    }

    fn vishti(&self) -> Vec<Timed<Bhadra>> {
        let mut out = Vec::new();
        let mut cursor = self.sunrise;
        while cursor < self.next_sunrise {
            if karana(cursor.to_jd()).name() != "Vishti" {
                cursor = karana_end(cursor).add_seconds(90);
                continue;
            }
            let end = py_min(karana_end(cursor), self.next_sunrise);
            let (loka_index, loka) = match moon_rashi_number(cursor) {
                1 | 2 | 3 | 8 => (0, "swarga"),
                6 | 7 | 9 | 10 => (2, "patala"),
                _ => (1, "prithvi"),
            };
            let (name_en, name_ne, subtitle_en, subtitle_ne, is_auspicious) =
                BHADRA_LOKA[loka_index];
            out.push(self.span(
                cursor,
                end,
                Bhadra {
                    name_en,
                    name_ne,
                    subtitle_en,
                    subtitle_ne,
                    is_auspicious,
                    loka,
                },
            ));
            cursor = end.add_seconds(90);
        }
        out
    }
}

/// `build_nivas_shool_block` for the day from sunrise to the next sunrise.
pub(crate) fn nivas_shool<I: PyInstant>(
    sunrise: I,
    next_sunrise: I,
    weekday_py: usize,
    zone: &Zone,
) -> NivasShool {
    let w = Window {
        sunrise,
        next_sunrise,
        zone,
    };
    let tithi_bounds = w.boundaries(tithi_end);
    let nak_bounds = w.boundaries(nakshatra_end);
    let rashi_bounds = w.boundaries(moon_rashi_end);
    let tithi_at = |at: I| tithi(at.to_jd());
    let agni = w.timed(&tithi_bounds, |at| {
        agnivasa(tithi_at(at).number, weekday_py)
    });
    let shiva = w.timed(&tithi_bounds, |at| shivavasa(tithi_at(at).number));
    let kumbh = w.timed(&tithi_bounds, |at| {
        kumbha(tithi_at(at).display_number, weekday_py)
    });
    let mut homa_bounds: Vec<I> = tithi_bounds.iter().chain(&nak_bounds).copied().collect();
    homa_bounds.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    homa_bounds.dedup();
    let homa = w.timed(&homa_bounds, homahuti);
    let chandra = w.timed(&rashi_bounds, chandra_vasa);
    let bhadra = w.vishti();
    let (key, name_en, name_ne) = RAHU_VASA[weekday_py % 7];
    NivasShool {
        homahuti: spans(homa, || homahuti(sunrise)),
        disha_shool: disha_shool(weekday_py),
        rahu_vasa: Direction {
            key,
            name_en,
            name_ne,
        },
        agnivasa: spans(agni, || agnivasa(tithi_at(sunrise).number, weekday_py)),
        shivavasa: spans(shiva, || shivavasa(tithi_at(sunrise).number)),
        chandra_vasa: spans(chandra, || chandra_vasa(sunrise)),
        bhadravasa: Bhadravasa {
            active: !bhadra.is_empty(),
            segments: bhadra,
        },
        kumbha_chakra: spans(kumbh, || {
            kumbha(tithi_at(sunrise).display_number, weekday_py)
        }),
    }
}
