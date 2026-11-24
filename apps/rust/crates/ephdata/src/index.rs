//! The event index: every boundary solved once, stored, and read back.
//!
//! Tables, all in one `.vidx` file:
//! - one per [`Kind`] (tithi, karana, nakshatra, pada, yoga, the Moon's rashi, the
//!   Sun's nakshatra, sankranti, the Sun's degree, lunar phase): the angle only
//!   ever grows, so the multiples run in order and each boundary costs 4 bytes (its
//!   millisecond offset inside a 32-day block); the multiple is *derived* from the
//!   position in the table, never stored.
//! - one [`Series`] per graha: rashi ingress (with the rashi, since a graha can
//!   turn back across a boundary) and retrograde stations.
//!
//! Five kinds are not stored at all, because each is an exact sub-sequence of another:
//! tithi is every 2nd karana, nakshatra every 4th pada, the Moon's rashi every 9th
//! pada, sankranti every 30th Sun degree and phase every 15th karana. They are read as
//! strided views of the stored table.
//!
//! A block table gives O(1) access to the 32-day window of any instant, so a lookup
//! is a few comparisons whatever the span of the file.
//!
//! ```text
//! 0   "VIDX0002"
//! 8   u32 table count, u32 block days
//! 16  f64 first JD, f64 last JD, f64 block origin JD, u32 block count, u32 reserved
//! 48  per table, 40 bytes:
//!       u16 id, u16 span count, u32 first multiple, u32 events, u32 reserved,
//!       u64 block-table offset, u64 time offset, u64 payload offset (0 = none)
//! ..  per table: (blocks+1) u32 first-event indexes, events u32 ms offsets,
//!       events u8 payloads (series only), each part padded to 8 bytes
//! ```

use std::{io::Write, path::Path};

use crate::{
    kernel::KernelError,
    sky::{Body, Sky},
};

const MAGIC: &[u8; 8] = b"VIDX0002";
const HEADER: usize = 48;
const ENTRY: usize = 40;
const BLOCK_DAYS: u32 = 32;
const MS_PER_DAY: f64 = 86_400_000.0;

/// An angle that counts in equal spans of the Sun's and the Moon's longitudes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Kind {
    /// Moon − Sun in 12° spans.
    Tithi,
    /// Moon − Sun in 6° spans.
    Karana,
    /// The Moon in 13°20′ spans.
    Nakshatra,
    /// The Moon in 3°20′ spans.
    Pada,
    /// Sun + Moon in 13°20′ spans.
    Yoga,
    /// The Moon in 30° spans.
    MoonRashi,
    /// The Sun in 13°20′ spans.
    SunNakshatra,
    /// The Sun in 30° spans.
    Sankranti,
    /// The Sun in 1° spans.
    SunDegree,
    /// Moon − Sun in 90° spans: new moon, first quarter, full moon, last quarter.
    Phase,
}

impl Kind {
    /// Every kind, in table order.
    pub const ALL: [Self; 10] = [
        Self::Tithi,
        Self::Karana,
        Self::Nakshatra,
        Self::Pada,
        Self::Yoga,
        Self::MoonRashi,
        Self::SunNakshatra,
        Self::Sankranti,
        Self::SunDegree,
        Self::Phase,
    ];

    const fn table(self) -> usize {
        self as usize
    }

    /// The kind whose table holds this kind's boundaries, and how many of its
    /// boundaries make one of this kind's (a stored kind is its own base, stride 1).
    const fn base(self) -> (Self, u32) {
        match self {
            Self::Tithi => (Self::Karana, 2),
            Self::Nakshatra => (Self::Pada, 4),
            Self::MoonRashi => (Self::Pada, 9),
            Self::Sankranti => (Self::SunDegree, 30),
            Self::Phase => (Self::Karana, 15),
            other => (other, 1),
        }
    }

    /// Degrees in one span.
    #[must_use]
    pub const fn span(self) -> f64 {
        match self {
            Self::Tithi => 12.0,
            Self::Karana => 6.0,
            Self::Nakshatra | Self::Yoga | Self::SunNakshatra => 360.0 / 27.0,
            Self::Pada => 360.0 / 108.0,
            Self::MoonRashi | Self::Sankranti => 30.0,
            Self::SunDegree => 1.0,
            Self::Phase => 90.0,
        }
    }

    /// Spans in the circle.
    #[must_use]
    pub const fn count(self) -> u32 {
        match self {
            Self::Tithi => 30,
            Self::Karana => 60,
            Self::Nakshatra | Self::Yoga | Self::SunNakshatra => 27,
            Self::Pada => 108,
            Self::MoonRashi | Self::Sankranti => 12,
            Self::SunDegree => 360,
            Self::Phase => 4,
        }
    }

    /// The angle this kind counts, from the sidereal longitudes of Sun and Moon.
    #[must_use]
    pub fn angle(self, sun: f64, moon: f64) -> f64 {
        match self {
            Self::Tithi | Self::Karana | Self::Phase => (moon - sun).rem_euclid(360.0),
            Self::Nakshatra | Self::Pada | Self::MoonRashi => moon,
            Self::Yoga => (sun + moon).rem_euclid(360.0),
            Self::SunNakshatra | Self::Sankranti | Self::SunDegree => sun,
        }
    }

    /// The span a longitude is in.
    #[must_use]
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "a span index is small"
    )]
    pub fn multiple(self, sun: f64, moon: f64) -> u32 {
        ((self.angle(sun, moon) / self.span()).floor() as u32).min(self.count() - 1)
    }
}

/// A graha with its own event series.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Graha {
    /// Mercury.
    Mercury,
    /// Venus.
    Venus,
    /// Mars.
    Mars,
    /// Jupiter.
    Jupiter,
    /// Saturn.
    Saturn,
    /// Rahu, the Moon's osculating ascending node (Ketu is opposite).
    Rahu,
}

impl Graha {
    /// Every graha, in table order.
    pub const ALL: [Self; 6] = [
        Self::Mercury,
        Self::Venus,
        Self::Mars,
        Self::Jupiter,
        Self::Saturn,
        Self::Rahu,
    ];

    fn longitude(self, sky: &Sky, jd: f64) -> Result<f64, KernelError> {
        match self {
            Self::Mercury => sky.sidereal_longitude(Body::Mercury, jd),
            Self::Venus => sky.sidereal_longitude(Body::Venus, jd),
            Self::Mars => sky.sidereal_longitude(Body::Mars, jd),
            Self::Jupiter => sky.sidereal_longitude(Body::Jupiter, jd),
            Self::Saturn => sky.sidereal_longitude(Body::Saturn, jd),
            Self::Rahu => sky.true_node(jd),
        }
    }
}

/// Where the builder reads positions from: our own kernel for Drik, the text's own
/// arithmetic for Surya Siddhanta. Longitudes are sidereal degrees.
pub trait Source: Sync {
    /// The span of Julian Days (UT) the source answers for.
    fn coverage_jd_ut(&self) -> (f64, f64);

    /// The Sun's and the Moon's longitudes.
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the source's span.
    fn sun_moon(&self, jd: f64) -> Result<(f64, f64), KernelError>;

    /// A graha's longitude (Rahu's is the node the source uses).
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the source's span.
    fn graha_longitude(&self, graha: Graha, jd: f64) -> Result<f64, KernelError>;
}

impl Source for Sky {
    fn coverage_jd_ut(&self) -> (f64, f64) {
        Self::coverage_jd_ut(self)
    }

    fn sun_moon(&self, jd: f64) -> Result<(f64, f64), KernelError> {
        Self::sun_moon(self, jd)
    }

    fn graha_longitude(&self, graha: Graha, jd: f64) -> Result<f64, KernelError> {
        graha.longitude(self, jd)
    }
}

/// A series of events that carry a payload.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Series {
    /// The graha enters a rashi; the payload is the rashi (0 = Mesha).
    Ingress(Graha),
    /// The graha turns: payload 1 when it turns retrograde, 0 when it turns direct.
    /// (Rahu has none.)
    Station(Graha),
}

impl Series {
    const fn table(self) -> usize {
        match self {
            Self::Ingress(g) => 10 + g as usize,
            Self::Station(g) => 16 + g as usize,
        }
    }
}

const TABLES: usize = 22;

/// One boundary: when, and which span begins.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Crossing {
    /// The Julian Day (UT) the new span begins.
    pub jd: f64,
    /// The span that begins (0-based).
    pub multiple: u32,
}

#[derive(Debug, Clone, Copy, Default)]
struct TableMeta {
    first_multiple: u32,
    events: u32,
    blocks_off: usize,
    times_off: usize,
    payload_off: usize,
}

/// The index, read from a `.vidx` file.
#[derive(Debug, Clone)]
pub struct Index {
    bytes: Vec<u8>,
    first_jd: f64,
    last_jd: f64,
    origin: f64,
    blocks: u32,
    tables: [TableMeta; TABLES],
    views: [View; TABLES],
}

/// A table as it is read: the stored one, or every `stride`-th boundary of it.
#[derive(Debug, Clone, Copy, Default)]
struct View {
    table: TableMeta,
    stride: usize,
    /// The stored boundary the first event of this view is.
    first: usize,
    first_multiple: u32,
    count: u32,
    events: usize,
}

fn view_of(base: &TableMeta, stride: u32, base_count: u32) -> View {
    let r = stride.max(1) as usize;
    let first = (r - base.first_multiple as usize % r) % r;
    let stored = base.events as usize;
    View {
        table: *base,
        stride: r,
        first,
        first_multiple: (((base.first_multiple as usize + first) % base_count.max(1) as usize) / r)
            as u32,
        count: base_count / stride.max(1),
        events: if stored > first {
            (stored - first).div_ceil(r)
        } else {
            0
        },
    }
}

// ---------------------------------------------------------------- reading

fn u32_at(b: &[u8], at: usize) -> u32 {
    u32::from_le_bytes(b[at..at + 4].try_into().unwrap_or([0; 4]))
}

fn u64_at(b: &[u8], at: usize) -> usize {
    usize::try_from(u64::from_le_bytes(
        b[at..at + 8].try_into().unwrap_or([0; 8]),
    ))
    .unwrap_or(0)
}

fn f64_at(b: &[u8], at: usize) -> f64 {
    f64::from_le_bytes(b[at..at + 8].try_into().unwrap_or([0; 8]))
}

impl Index {
    /// Reads a `.vidx` file.
    ///
    /// # Errors
    ///
    /// [`KernelError::Io`] or [`KernelError::Format`].
    pub fn open(path: &Path) -> Result<Self, KernelError> {
        Self::from_bytes(std::fs::read(path)?)
    }

    /// Parses `.vidx` bytes.
    ///
    /// # Errors
    ///
    /// [`KernelError::Format`] for malformed bytes.
    pub fn from_bytes(bytes: Vec<u8>) -> Result<Self, KernelError> {
        let bad = KernelError::Format;
        if bytes.len() < HEADER || &bytes[..8] != MAGIC {
            return Err(bad("wrong magic"));
        }
        let n = u32_at(&bytes, 8) as usize;
        if n != TABLES || u32_at(&bytes, 12) != BLOCK_DAYS || bytes.len() < HEADER + ENTRY * n {
            return Err(bad("unexpected table directory"));
        }
        let mut tables = [TableMeta::default(); TABLES];
        for (i, t) in tables.iter_mut().enumerate() {
            let e = HEADER + ENTRY * i;
            let id = u16::from_le_bytes([bytes[e], bytes[e + 1]]) as usize;
            if id != i {
                return Err(bad("tables out of order"));
            }
            *t = TableMeta {
                first_multiple: u32_at(&bytes, e + 4),
                events: u32_at(&bytes, e + 8),
                blocks_off: u64_at(&bytes, e + 16),
                times_off: u64_at(&bytes, e + 24),
                payload_off: u64_at(&bytes, e + 32),
            };
        }
        let mut views = [View::default(); TABLES];
        for kind in Kind::ALL {
            let (base, stride) = kind.base();
            views[kind.table()] = view_of(&tables[base.table()], stride, base.count());
        }
        for (i, t) in tables.iter().enumerate().skip(10) {
            views[i] = view_of(t, 1, 12);
        }
        let index = Self {
            first_jd: f64_at(&bytes, 16),
            last_jd: f64_at(&bytes, 24),
            origin: f64_at(&bytes, 32),
            blocks: u32_at(&bytes, 40),
            tables,
            views,
            bytes,
        };
        for t in &index.tables {
            let end = t.times_off + t.events as usize * 4;
            if index.bytes.len() < end
                || index.bytes.len() < t.blocks_off + (index.blocks as usize + 1) * 4
            {
                return Err(bad("truncated table"));
            }
        }
        Ok(index)
    }

    /// The span of Julian Days (UT) whose events are complete.
    #[must_use]
    pub const fn coverage(&self) -> (f64, f64) {
        (self.first_jd, self.last_jd)
    }

    /// The size of the file in bytes.
    #[must_use]
    pub fn size(&self) -> usize {
        self.bytes.len()
    }

    /// How many events a kind has.
    #[must_use]
    pub const fn len(&self, kind: Kind) -> usize {
        self.views[kind.table()].events
    }

    /// Whether the index holds no events at all.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.len(Kind::Karana) == 0
    }

    fn block_start(&self, t: &TableMeta, block: usize) -> usize {
        u32_at(&self.bytes, t.blocks_off + block * 4) as usize
    }

    fn offset(&self, t: &TableMeta, i: usize) -> u32 {
        u32_at(&self.bytes, t.times_off + i * 4)
    }

    /// The time of stored event `i`.
    fn time_of(&self, t: &TableMeta, i: usize) -> f64 {
        // The block of event i: the last block whose first index is <= i.
        let (mut lo, mut hi) = (0usize, self.blocks as usize + 1);
        while lo < hi {
            let mid = usize::midpoint(lo, hi);
            if self.block_start(t, mid) <= i {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        let block = lo.saturating_sub(1);
        self.origin
            + f64::from(BLOCK_DAYS) * block as f64
            + f64::from(self.offset(t, i)) / MS_PER_DAY
    }

    /// The number of stored events at or before `jd` (the index of the first one after).
    fn after(&self, t: &TableMeta, jd: f64) -> usize {
        let rel = (jd - self.origin) / f64::from(BLOCK_DAYS);
        if rel < 0.0 {
            return 0;
        }
        let block = rel.floor() as usize;
        if block >= self.blocks as usize {
            return t.events as usize;
        }
        let (mut lo, mut hi) = (self.block_start(t, block), self.block_start(t, block + 1));
        let ms = (jd - self.origin - f64::from(BLOCK_DAYS) * block as f64) * MS_PER_DAY;
        while lo < hi {
            let mid = usize::midpoint(lo, hi);
            if f64::from(self.offset(t, mid)) <= ms {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        lo
    }

    /// The events of `v` at or before `jd`: the index of the first one after it.
    fn after_view(&self, v: &View, jd: f64) -> usize {
        let stored = self.after(&v.table, jd);
        if stored <= v.first {
            0
        } else {
            (stored - v.first).div_ceil(v.stride)
        }
    }

    fn view_time(&self, v: &View, k: usize) -> f64 {
        self.time_of(&v.table, v.first + k * v.stride)
    }

    fn view_crossing(&self, v: &View, k: usize) -> Crossing {
        Crossing {
            jd: self.view_time(v, k),
            multiple: ((v.first_multiple as usize + k) % v.count as usize) as u32,
        }
    }

    /// The first boundary of `kind` strictly after `jd`.
    #[must_use]
    pub fn next_event(&self, kind: Kind, jd: f64) -> Option<Crossing> {
        let v = &self.views[kind.table()];
        let k = self.after_view(v, jd);
        (k < v.events).then(|| self.view_crossing(v, k))
    }

    /// The last boundary of `kind` at or before `jd`.
    #[must_use]
    pub fn prev_event(&self, kind: Kind, jd: f64) -> Option<Crossing> {
        let v = &self.views[kind.table()];
        let k = self.after_view(v, jd);
        (k > 0).then(|| self.view_crossing(v, k - 1))
    }

    /// Every boundary of `kind` with `from < jd <= to`, in order.
    #[must_use]
    pub fn events_between(&self, kind: Kind, from: f64, to: f64) -> Vec<Crossing> {
        let v = &self.views[kind.table()];
        let (a, b) = (self.after_view(v, from), self.after_view(v, to));
        (a..b).map(|k| self.view_crossing(v, k)).collect()
    }

    /// The first boundary after `jd` at which `kind` enters span `multiple`: the
    /// multiples run in order, so this is index arithmetic, not a search.
    #[must_use]
    pub fn next_entry(&self, kind: Kind, multiple: u32, jd: f64) -> Option<Crossing> {
        let v = &self.views[kind.table()];
        let k = self.after_view(v, jd);
        let now = (v.first_multiple as usize + k) % v.count as usize;
        let ahead = (multiple as usize + v.count as usize - now) % v.count as usize;
        let at = k + ahead;
        (at < v.events).then(|| self.view_crossing(v, at))
    }

    /// The last boundary at or before `jd` at which `kind` entered span `multiple`.
    #[must_use]
    pub fn prev_entry(&self, kind: Kind, multiple: u32, jd: f64) -> Option<Crossing> {
        let v = &self.views[kind.table()];
        let k = self.after_view(v, jd);
        if k == 0 {
            return None;
        }
        let last = (v.first_multiple as usize + k - 1) % v.count as usize;
        let back = (last + v.count as usize - multiple as usize) % v.count as usize;
        k.checked_sub(1 + back).map(|at| self.view_crossing(v, at))
    }

    fn payload(&self, v: &View, k: usize) -> u8 {
        self.bytes[v.table.payload_off + k]
    }

    /// The first event of a series after `jd`: its time and payload.
    #[must_use]
    pub fn next_series(&self, series: Series, jd: f64) -> Option<(f64, u8)> {
        let v = &self.views[series.table()];
        let k = self.after_view(v, jd);
        (k < v.events).then(|| (self.view_time(v, k), self.payload(v, k)))
    }

    /// The last event of a series at or before `jd`.
    #[must_use]
    pub fn prev_series(&self, series: Series, jd: f64) -> Option<(f64, u8)> {
        let v = &self.views[series.table()];
        let k = self.after_view(v, jd);
        (k > 0).then(|| (self.view_time(v, k - 1), self.payload(v, k - 1)))
    }

    /// Every event of a series with `from < jd <= to`.
    #[must_use]
    pub fn series_between(&self, series: Series, from: f64, to: f64) -> Vec<(f64, u8)> {
        let v = &self.views[series.table()];
        let (a, b) = (self.after_view(v, from), self.after_view(v, to));
        (a..b)
            .map(|k| (self.view_time(v, k), self.payload(v, k)))
            .collect()
    }
}

// --------------------------------------------------------------- building

/// Events found for a stretch of time, before they are packed.
#[derive(Debug, Default)]
struct Found {
    kinds: [Vec<(f64, u32)>; 10],
    series: [Vec<(f64, u8)>; 12],
}

fn wrap180(x: f64) -> f64 {
    (x + 180.0).rem_euclid(360.0) - 180.0
}

/// Finds where `g` crosses zero upward in `[a, b]` (`g(a) < 0 <= g(b)`), by the
/// Illinois form of regula falsi, to `1e-9` day (~86 µs).
fn root_up(a: f64, b: f64, g: &impl Fn(f64) -> f64) -> f64 {
    let (mut a, mut b) = (a, b);
    let (mut fa, mut fb) = (g(a), g(b));
    let mut side = 0;
    for _ in 0..80 {
        if (b - a).abs() < 1e-9 || (fb - fa).abs() < f64::MIN_POSITIVE {
            break;
        }
        let c = (a * fb - b * fa) / (fb - fa);
        let fc = g(c);
        if fc < 0.0 {
            a = c;
            fa = fc;
            if side == -1 {
                fb *= 0.5;
            }
            side = -1;
        } else {
            b = c;
            fb = fc;
            if side == 1 {
                fa *= 0.5;
            }
            side = 1;
        }
    }
    b
}

/// Bisection for a sign change of `g` between `a` and `b` (any direction).
fn bisect(a: f64, b: f64, g: &impl Fn(f64) -> f64) -> f64 {
    let (mut a, mut b) = (a, b);
    let fa = g(a);
    for _ in 0..60 {
        if (b - a).abs() < 1e-9 {
            break;
        }
        let m = f64::midpoint(a, b);
        if (g(m) < 0.0) == (fa < 0.0) {
            a = m;
        } else {
            b = m;
        }
    }
    f64::midpoint(a, b)
}

/// Linear-kind step: every anga's boundary is a crossing of one of two angles.
const STEP: f64 = 0.125;
/// Graha step: no graha crosses a rashi twice in half a day except at a station.
const GRAHA_STEP: f64 = 0.5;
const STATION_DELTA: f64 = 1e-3;

fn scan_angas(sky: &impl Source, from: f64, to: f64, out: &mut Found) -> Result<(), KernelError> {
    let steps = ((to - from) / STEP).ceil() as usize;
    let at = |i: usize| from + i as f64 * STEP;
    let (mut s0, mut m0) = sky.sun_moon(at(0))?;
    for i in 0..steps {
        let (t0, t1) = (at(i), at(i + 1));
        let (s1, m1) = sky.sun_moon(t1)?;
        for kind in Kind::ALL {
            let (c0, c1) = (kind.multiple(s0, m0), kind.multiple(s1, m1));
            if c0 == c1 {
                continue;
            }
            let target = f64::from(c1) * kind.span();
            let g = |t: f64| {
                sky.sun_moon(t)
                    .map_or(f64::NAN, |(s, m)| wrap180(kind.angle(s, m) - target))
            };
            let jd = root_up(t0, t1, &g);
            out.kinds[kind.table()].push((jd, c1));
        }
        (s0, m0) = (s1, m1);
    }
    Ok(())
}

fn scan_grahas(sky: &impl Source, from: f64, to: f64, out: &mut Found) -> Result<(), KernelError> {
    let steps = ((to - from) / GRAHA_STEP).ceil() as usize;
    let at = |i: usize| from + i as f64 * GRAHA_STEP;
    for graha in Graha::ALL {
        let lon = |t: f64| sky.graha_longitude(graha, t);
        let mut prev = lon(at(0))?;
        let mut prev_diff = 0.0;
        for i in 0..steps {
            let (t0, t1) = (at(i), at(i + 1));
            let cur = lon(t1)?;
            let (c0, c1) = ((prev / 30.0).floor() as i32, (cur / 30.0).floor() as i32);
            if c0 != c1 {
                let forward = (c0 + 1) % 12 == c1;
                let boundary = f64::from(if forward { c1 } else { c0 }) * 30.0;
                let sign = if forward { 1.0 } else { -1.0 };
                let g = |t: f64| {
                    sign * wrap180(sky.graha_longitude(graha, t).unwrap_or(f64::NAN) - boundary)
                };
                let jd = bisect(t0, t1, &g);
                out.series[graha as usize].push((jd, c1 as u8));
            }
            let diff = wrap180(cur - prev);
            if graha != Graha::Rahu && i > 0 && diff * prev_diff < 0.0 {
                // Coarse bracket first (the speed changes sign across it), then the
                // fitted extremum: the station is flat, so a speed difference is as
                // noisy as the longitudes it subtracts.
                let speed = |t: f64| {
                    let d = wrap180(
                        sky.graha_longitude(graha, t + STATION_DELTA)
                            .unwrap_or(f64::NAN)
                            - sky
                                .graha_longitude(graha, t - STATION_DELTA)
                                .unwrap_or(f64::NAN),
                    );
                    d / (2.0 * STATION_DELTA)
                };
                let (a, b) = (t0 - GRAHA_STEP, t1);
                if speed(a) * speed(b) < 0.0 {
                    let coarse = bisect(a, b, &speed);
                    let jd = fitted_station(&lon, coarse);
                    out.series[6 + graha as usize].push((jd, u8::from(prev_diff > 0.0)));
                }
            }
            prev_diff = diff;
            prev = cur;
        }
    }
    Ok(())
}

/// The extremum of a graha's longitude near `coarse`: a degree-6 least-squares fit to
/// 21 longitudes spanning ±0.4 day, and the root of its derivative. Measured against
/// other windows and degrees the root is stable to ~0.1 ms from degree 5 up (a
/// quartic or a wider window is off by seconds for Mercury).
fn fitted_station(lon: &impl Fn(f64) -> Result<f64, KernelError>, coarse: f64) -> f64 {
    const N: usize = 21;
    const D: usize = 7;
    const HALF: f64 = 0.4;
    let Ok(base) = lon(coarse) else { return coarse };
    let mut us = [0.0; N];
    let mut ys = [0.0; N];
    for i in 0..N {
        us[i] = (i as f64 - 10.0) / 10.0;
        match lon(coarse + us[i] * HALF) {
            Ok(v) => ys[i] = wrap180(v - base),
            Err(_) => return coarse,
        }
    }
    // normal equations for c0..c6 in u = x / HALF, so the powers stay near 1
    let mut m = [[0.0; D + 1]; D];
    for (u, y) in us.iter().zip(&ys) {
        let mut pow = [1.0; D];
        for k in 1..D {
            pow[k] = pow[k - 1] * u;
        }
        for r in 0..D {
            for c in 0..D {
                m[r][c] += pow[r] * pow[c];
            }
            m[r][D] += pow[r] * y;
        }
    }
    for col in 0..D {
        let pivot = (col..D)
            .max_by(|a, b| m[*a][col].abs().total_cmp(&m[*b][col].abs()))
            .unwrap_or(col);
        m.swap(col, pivot);
        if m[col][col].abs() < 1e-300 {
            return coarse;
        }
        for r in 0..D {
            if r != col {
                let f = m[r][col] / m[col][col];
                for c in col..=D {
                    m[r][c] -= f * m[col][c];
                }
            }
        }
    }
    let c: Vec<f64> = (0..D).map(|r| m[r][D] / m[r][r]).collect();
    // p'(u) and p''(u) by Horner, Newton from the coarse station (u = 0)
    let deriv = |u: f64| (1..D).rev().fold(0.0, |acc, k| acc * u + k as f64 * c[k]);
    let second = |u: f64| {
        (2..D)
            .rev()
            .fold(0.0, |acc, k| acc * u + (k * (k - 1)) as f64 * c[k])
    };
    let mut u = 0.0_f64;
    for _ in 0..40 {
        let dd = second(u);
        if dd.abs() < 1e-300 {
            return coarse;
        }
        let step = deriv(u) / dd;
        u -= step;
        if step.abs() < 1e-13 {
            break;
        }
    }
    if u.abs() < 1.0 {
        coarse + u * HALF
    } else {
        coarse
    }
}

/// Builds the index for `[from, to]` (Julian Days, UT) on `threads` threads,
/// calling `progress(done, total)` as stretches finish.
///
/// # Errors
///
/// [`KernelError::OutOfRange`] when the range leaves the kernel's data.
pub fn build(
    sky: &impl Source,
    from: f64,
    to: f64,
    threads: usize,
    progress: &(dyn Fn(usize, usize) + Sync),
) -> Result<Vec<u8>, KernelError> {
    let (lo, hi) = sky.coverage_jd_ut();
    if from < lo + 2.0 || to > hi - 2.0 || from >= to {
        return Err(KernelError::OutOfRange(from));
    }
    let origin = (from / f64::from(BLOCK_DAYS)).floor() * f64::from(BLOCK_DAYS);
    // Cut the range into stretches on a multiple of both steps, a few per thread.
    let pieces = threads.max(1) * 8;
    let width = (((to - from) / pieces as f64) / 4.0).ceil() * 4.0;
    let ranges: Vec<(f64, f64)> = (0..pieces)
        .map(|k| {
            (
                from + k as f64 * width,
                (from + (k + 1) as f64 * width).min(to),
            )
        })
        .filter(|(a, b)| a < b)
        .collect();
    let next = std::sync::atomic::AtomicUsize::new(0);
    let done = std::sync::atomic::AtomicUsize::new(0);
    let results: std::sync::Mutex<Vec<(usize, Found)>> = std::sync::Mutex::new(Vec::new());
    let failed: std::sync::Mutex<Option<KernelError>> = std::sync::Mutex::new(None);
    std::thread::scope(|scope| {
        for _ in 0..threads.max(1) {
            scope.spawn(|| {
                loop {
                    let k = next.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                    let Some(&(a, b)) = ranges.get(k) else { break };
                    let mut found = Found::default();
                    // The graha scan starts a step early so a station on the seam is seen.
                    let outcome = scan_angas(sky, a, b, &mut found).and_then(|()| {
                        let mut g = Found::default();
                        scan_grahas(sky, a - 2.0 * GRAHA_STEP, b + 2.0 * GRAHA_STEP, &mut g)?;
                        for (i, s) in g.series.iter().enumerate() {
                            found.series[i].extend(s.iter().filter(|(t, _)| *t >= a && *t < b));
                        }
                        Ok(())
                    });
                    match outcome {
                        Ok(()) => {
                            if let Ok(mut r) = results.lock() {
                                r.push((k, found));
                            }
                        }
                        Err(e) => {
                            if let Ok(mut f) = failed.lock() {
                                *f = Some(e);
                            }
                            break;
                        }
                    }
                    let d = done.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
                    progress(d, ranges.len());
                }
            });
        }
    });
    if let Some(e) = failed.into_inner().ok().flatten() {
        return Err(e);
    }
    let mut parts = results.into_inner().unwrap_or_default();
    parts.sort_by_key(|(k, _)| *k);
    let mut all = Found::default();
    for (_, f) in parts {
        for i in 0..10 {
            all.kinds[i].extend(f.kinds[i].iter().copied());
        }
        for i in 0..12 {
            all.series[i].extend(f.series[i].iter().copied());
        }
    }
    pack(&all, from, to, origin)
}

impl Index {
    /// The events of `[from, to]` as a smaller index file of the same format: what the
    /// server sends a client for years the client does not carry. The slice starts on a
    /// 32-day block of the stored file, so every time is copied bit for bit.
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] when the span leaves what this index covers.
    pub fn slice(&self, from: f64, to: f64) -> Result<Vec<u8>, KernelError> {
        let (lo, hi) = self.coverage();
        if from < lo || to > hi || from >= to {
            return Err(KernelError::OutOfRange(from));
        }
        let block = f64::from(BLOCK_DAYS);
        let origin = ((from - self.origin) / block).floor() * block + self.origin;
        let mut found = Found::default();
        for kind in Kind::ALL {
            if kind.base().0 == kind {
                found.kinds[kind.table()] = self
                    .events_between(kind, origin, to)
                    .into_iter()
                    .map(|c| (c.jd, c.multiple))
                    .collect();
            }
        }
        for g in Graha::ALL {
            found.series[g as usize] = self.series_between(Series::Ingress(g), origin, to);
            found.series[6 + g as usize] = self.series_between(Series::Station(g), origin, to);
        }
        pack(&found, from, to, origin)
    }
}

fn pad8(out: &mut Vec<u8>) {
    while out.len() % 8 != 0 {
        out.push(0);
    }
}

/// A table ready to write: span count, first multiple, times, optional payloads.
type PackedTable = (u32, u32, Vec<f64>, Option<Vec<u8>>);

fn pack(found: &Found, from: f64, to: f64, origin: f64) -> Result<Vec<u8>, KernelError> {
    let blocks = (((to - origin) / f64::from(BLOCK_DAYS)).ceil() as usize) + 1;
    let mut tables: Vec<PackedTable> = Vec::new();
    for kind in Kind::ALL {
        if kind.base().0 != kind {
            // read as a strided view of its base table: nothing to store
            tables.push((kind.count(), 0, Vec::new(), None));
            continue;
        }
        let ev = &found.kinds[kind.table()];
        let first = ev.first().map_or(0, |e| e.1);
        // Multiples must run in order: that is what lets them go unstored.
        for (i, e) in ev.iter().enumerate() {
            if e.1 != (first + i as u32) % kind.count() {
                return Err(KernelError::Sequence {
                    kind: format!("{kind:?}"),
                    jd: e.0,
                    at: i,
                });
            }
        }
        tables.push((kind.count(), first, ev.iter().map(|e| e.0).collect(), None));
    }
    for table in 10..TABLES {
        let ev = &found.series[table - 10];
        tables.push((
            12,
            0,
            ev.iter().map(|e| e.0).collect(),
            Some(ev.iter().map(|e| e.1).collect()),
        ));
    }
    let mut out = Vec::new();
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(&(TABLES as u32).to_le_bytes());
    out.extend_from_slice(&BLOCK_DAYS.to_le_bytes());
    out.extend_from_slice(&from.to_le_bytes());
    out.extend_from_slice(&to.to_le_bytes());
    out.extend_from_slice(&origin.to_le_bytes());
    out.extend_from_slice(&(blocks as u32).to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    let dir = out.len();
    out.resize(dir + ENTRY * TABLES, 0);
    for (id, (count, first, times, payload)) in tables.iter().enumerate() {
        for w in times.windows(2) {
            if w[1] < w[0] {
                return Err(KernelError::Format("events out of order"));
            }
        }
        pad8(&mut out);
        let blocks_off = out.len();
        let block_of =
            |t: f64| (((t - origin) / f64::from(BLOCK_DAYS)).floor() as usize).min(blocks - 1);
        let mut starts = vec![0u32; blocks + 1];
        for t in times {
            starts[block_of(*t) + 1] += 1;
        }
        for b in 0..blocks {
            starts[b + 1] += starts[b];
        }
        for s in &starts {
            out.extend_from_slice(&s.to_le_bytes());
        }
        pad8(&mut out);
        let times_off = out.len();
        for t in times {
            let b = block_of(*t);
            let ms = ((t - origin - f64::from(BLOCK_DAYS) * b as f64) * MS_PER_DAY).round();
            if !(0.0..=f64::from(u32::MAX)).contains(&ms) {
                return Err(KernelError::Format("offset overflows a block"));
            }
            out.extend_from_slice(&(ms as u32).to_le_bytes());
        }
        pad8(&mut out);
        let payload_off = payload.as_ref().map_or(0, |p| {
            let at = out.len();
            out.extend_from_slice(p);
            at
        });
        let e = dir + ENTRY * id;
        out[e..e + 2].copy_from_slice(&(id as u16).to_le_bytes());
        out[e + 2..e + 4].copy_from_slice(&(*count as u16).to_le_bytes());
        out[e + 4..e + 8].copy_from_slice(&first.to_le_bytes());
        out[e + 8..e + 12].copy_from_slice(&(times.len() as u32).to_le_bytes());
        out[e + 16..e + 24].copy_from_slice(&(blocks_off as u64).to_le_bytes());
        out[e + 24..e + 32].copy_from_slice(&(times_off as u64).to_le_bytes());
        out[e + 32..e + 40].copy_from_slice(&(payload_off as u64).to_le_bytes());
    }
    pad8(&mut out);
    Ok(out)
}

/// Writes index bytes to `path`.
///
/// # Errors
///
/// [`KernelError::Io`] when the file cannot be written.
pub fn write(path: &Path, bytes: &[u8]) -> Result<(), KernelError> {
    let mut f = std::fs::File::create(path)?;
    f.write_all(bytes)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A karana every 0.45 days from Julian Day `2_460_000.25`, starting at karana 56;
    /// a Sun degree every 30.4/30 days from Julian Day `2_460_005.5`, starting at degree 300 (the
    /// start of rashi 10); a Mars ingress series with a turn-back.
    fn synthetic() -> (Index, Vec<f64>, Vec<f64>) {
        let (from, to): (f64, f64) = (2_460_000.0, 2_460_400.0);
        let origin = (from / 32.0).floor() * 32.0;
        let mut found = Found::default();
        let karanas: Vec<f64> = (0..900)
            .map(|i| 2_460_000.25 + f64::from(i) * 0.45)
            .take_while(|t| *t < to)
            .collect();
        for (i, t) in karanas.iter().enumerate() {
            found.kinds[Kind::Karana.table()].push((*t, (56 + i as u32) % 60));
        }
        let degrees: Vec<f64> = (0..390)
            .map(|i| 2_460_005.5 + f64::from(i) * 30.4 / 30.0)
            .take_while(|t| *t < to)
            .collect();
        for (i, t) in degrees.iter().enumerate() {
            found.kinds[Kind::SunDegree.table()].push((*t, (300 + i as u32) % 360));
        }
        // Mars goes Simha(4) -> Kanya(5), turns back to Simha(4), then on to Kanya(5)
        found.series[Graha::Mars as usize] = vec![
            (2_460_100.5, 4),
            (2_460_150.25, 5),
            (2_460_190.75, 4),
            (2_460_250.0, 5),
        ];
        found.series[6 + Graha::Mars as usize] = vec![(2_460_160.0, 1), (2_460_230.0, 0)];
        let bytes = pack(&found, from, to, origin).expect("packs");
        (Index::from_bytes(bytes).expect("parses"), karanas, degrees)
    }

    #[test]
    fn next_and_prev_bracket_every_instant() {
        let (ix, karanas, _) = synthetic();
        for k in 0..2000 {
            let jd = 2_460_000.0 + f64::from(k) * 0.1993;
            let next = ix.next_event(Kind::Karana, jd);
            let prev = ix.prev_event(Kind::Karana, jd);
            let want_next = karanas.iter().find(|t| **t > jd);
            if let (Some(n), Some(w)) = (next, want_next) {
                assert!(
                    (n.jd - w).abs() < 1.0 / 86_400_000.0,
                    "next after {jd}: {} vs {w}",
                    n.jd
                );
            }
            if let (Some(p), Some(n)) = (prev, next) {
                assert!(p.jd <= jd + 1e-9 && jd < n.jd, "prev at {jd}");
                assert!(
                    n.jd - p.jd < 0.45 + 2e-8,
                    "consecutive boundaries 0.45 d apart"
                );
            }
        }
        assert!(
            ix.prev_event(Kind::Karana, 2_460_000.0).is_none(),
            "before the first"
        );
        assert!(
            ix.next_event(Kind::Karana, 2_460_399.9).is_none(),
            "after the last"
        );
    }

    #[test]
    fn multiples_run_in_order_and_wrap() {
        let (ix, _, _) = synthetic();
        let all = ix.events_between(Kind::Karana, 2_459_999.0, 2_460_400.0);
        assert_eq!(all.len(), ix.len(Kind::Karana));
        for (i, c) in all.iter().enumerate() {
            assert_eq!(c.multiple, (56 + i as u32) % 60, "event {i}");
        }
        assert_eq!(all[4].multiple, 0, "56, 57, 58, 59, 0: wrapped");
    }

    #[test]
    fn a_kind_that_is_not_stored_is_a_strided_view() {
        let (ix, karanas, degrees) = synthetic();
        // Tithi = every 2nd karana, the ones with an even multiple, numbered /2
        let tithis = ix.events_between(Kind::Tithi, 2_459_999.0, 2_460_400.0);
        let want: Vec<(f64, u32)> = karanas
            .iter()
            .enumerate()
            .filter(|(i, _)| (56 + i) % 2 == 0)
            .map(|(i, t)| (*t, ((56 + i as u32) % 60) / 2))
            .collect();
        assert_eq!(tithis.len(), want.len());
        for (c, (t, m)) in tithis.iter().zip(&want) {
            assert!(
                (c.jd - t).abs() < 1.0 / 86_400_000.0 && c.multiple == *m,
                "{c:?} vs {t} {m}"
            );
        }
        assert_eq!(ix.len(Kind::Tithi), want.len());
        // Phase = every 15th karana; Sankranti = every 30th Sun degree
        let phases = ix.events_between(Kind::Phase, 2_459_999.0, 2_460_400.0);
        assert!(phases.iter().all(|c| c.multiple < 4) && !phases.is_empty());
        let sankranti = ix.events_between(Kind::Sankranti, 2_459_999.0, 2_460_400.0);
        let first_of_rashi: Vec<f64> = degrees
            .iter()
            .enumerate()
            .filter(|(i, _)| (300 + i) % 30 == 0)
            .map(|(_, t)| *t)
            .collect();
        assert_eq!(sankranti.len(), first_of_rashi.len());
        assert_eq!(
            sankranti[0].multiple, 10,
            "the stored sequence starts at degree 300"
        );
        assert!(
            sankranti
                .iter()
                .zip(&first_of_rashi)
                .all(|(c, t)| (c.jd - t).abs() < 1.0 / 86_400_000.0),
            "the same instants as the stored degrees"
        );
        // an entry is index arithmetic on the view
        let mesha = ix
            .next_entry(Kind::Sankranti, 0, 2_460_000.0)
            .expect("mesha");
        assert!((mesha.jd - first_of_rashi[2]).abs() < 1e-3, "{mesha:?}");
        assert!(
            ix.prev_entry(Kind::Sankranti, 10, 2_460_001.0).is_none(),
            "none before the first"
        );
        let back = ix
            .prev_entry(Kind::Sankranti, 11, 2_460_200.0)
            .expect("prev");
        assert!((back.jd - first_of_rashi[1]).abs() < 1e-3, "{back:?}");
    }

    #[test]
    fn a_series_keeps_its_payloads_and_order() {
        let (ix, _, _) = synthetic();
        let ingress = Series::Ingress(Graha::Mars);
        let all = ix.series_between(ingress, 2_460_000.0, 2_460_400.0);
        assert_eq!(
            all.iter().map(|e| e.1).collect::<Vec<_>>(),
            [4, 5, 4, 5],
            "turns back across Simha"
        );
        assert_eq!(ix.next_series(ingress, 2_460_160.0).map(|e| e.1), Some(4));
        assert_eq!(ix.prev_series(ingress, 2_460_160.0).map(|e| e.1), Some(5));
        let station = Series::Station(Graha::Mars);
        assert_eq!(
            ix.next_series(station, 2_460_000.0).map(|e| e.1),
            Some(1),
            "retrograde first"
        );
        assert_eq!(
            ix.next_series(station, 2_460_161.0).map(|e| e.1),
            Some(0),
            "then direct"
        );
    }

    #[test]
    fn a_boundary_out_of_sequence_is_refused() {
        let mut found = Found::default();
        found.kinds[Kind::Karana.table()] = vec![(2_460_001.0, 3), (2_460_002.0, 5)];
        assert!(pack(&found, 2_460_000.0, 2_460_040.0, 2_459_968.0).is_err());
    }

    #[test]
    fn anga_kinds_agree_with_the_calendar() {
        assert_eq!(
            Kind::Tithi.multiple(10.0, 130.0),
            10,
            "120 degrees ahead: the 11th tithi"
        );
        assert_eq!(Kind::Nakshatra.multiple(0.0, 14.0), 1);
        assert_eq!(Kind::Yoga.multiple(350.0, 20.0), 0, "sum wraps past 360");
        assert_eq!(Kind::MoonRashi.multiple(0.0, 359.9), 11);
        // every derived kind divides its base's count evenly: the views stay in step
        for kind in Kind::ALL {
            let (base, stride) = kind.base();
            assert_eq!(base.count() % stride, 0, "{kind:?}");
            assert_eq!(base.count() / stride, kind.count(), "{kind:?}");
            assert!(
                (base.span() * f64::from(stride) - kind.span()).abs() < 1e-9,
                "{kind:?}"
            );
        }
    }
}
