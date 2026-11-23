# Surya Siddhanta, offline: a position table the client reads

Drik already works this way: the server loads `kernel.veph` (positions) and
`events.vidx` (boundaries) once, and a request is a lookup instead of a
computation. The Surya Siddhanta has no kernel to load — its positions are
analytic formulas, evaluated fresh on every request. This crate gives it the
same shape: **generate the positions once, into a file; the server serves
slices of the file; the client interpolates and derives everything else
locally.** The Rust server stops doing per-request SS maths for the
day-to-day views, and the phone does the work for its own user.

## What the file holds

`STAB0002`, one sample every few hours over a year range. The rule is
**minimum store, maximum impact**: the file holds only what the client
cannot get back from the samples themselves, at the cheapest width that
keeps the accuracy.

```text
0   "STAB0002"
8   u32 body count (= 8), u32 sample count
16  f64 first JD (UT), f64 step in days
32  f64 mean Sun (nirayana) at the first JD, f64 its exact rate °/day
48  per sample, 36 bytes:
      8 bodies × u32 sidereal longitude, counts of 1e-6°
      f32 Moon speed °/day
```

Bodies are in `Body::ALL` order: Sun, Moon, Mars, Mercury, Jupiter, Venus,
Saturn, Rahu. Ketu is Rahu + 180° and is never stored. Longitudes are stored
**wrapped** (0–360°): an unwrapped longitude over 200 years reaches ~26
million degrees, where an f32 has ~2° of resolution. The reader unwraps the
two bracketing samples against each other, which is unambiguous because no
body moves 180° in one step.

Why each field is there, and what was cut:

- **Longitude as a u32 count of 1e-6°** (0.0036″ resolution, twenty times
  finer than an f32 at 360°) — the same 4 bytes an f32 would take, but
  exact to the last count. (A u24 at 1e-5° was tried first: 36,000,000
  counts do not fit in 24 bits.)
- **One speed, the Moon's only.** The speed beside a longitude is the
  **instantaneous derivative**, not the speed the API shows: the text
  defines speed as the ±0.5-day central difference, and for the Moon that
  differs from the true derivative by more than the interpolation budget
  (its higher derivatives are large — a table built with the
  central-difference speed measured a 4″ Moon error at every step from 24 h
  down to 3 h). Hermite needs the true derivative. Every other body's
  speed is the central difference of its own neighbouring samples, which
  the reader takes for free: their higher derivatives are small enough
  that the differenced slope is within ~0.2″ of the true derivative
  (Mercury, the worst case — `check` proves it). Storing seven speeds the
  reader can derive would be 28 bytes a sample for nothing. A client that
  wants the displayed speed takes the central difference of the table
  itself at ±0.5 days, which matches the API's definition.
- **Mean Sun (nirayana) as one anchor + rate in the header.** The nirayana
  mean Sun is exactly linear in JD (360° × 4,320,000 revolutions per
  mahayuga, over 1,577,917,828 days), so one anchor and one rate reproduce
  it for the whole file. Storing it per sample was 587 KB of a straight
  line. The sayana mean Sun — what lagna and sunrise need — is the
  nirayana value plus the ayanamsha, which the reader already computes.
  (The sayana value is *not* linear: it carries the ayanamsha's own
  ~50″/year drift, so a sayana anchor + rate would drift 0.013° a year
  out. That was a real bug in the first v2 build, caught by the TypeScript
  test.)
- **No ayanamsha stored.** It is a slow sine the reader computes from three
  constants — 600 revolutions per mahayuga, 1,577,917,828 days per
  mahayuga, 714,402,296,627 days from creation to Kali, and the Kali epoch
  JD 588465.289537 — in about ten lines (`frame::ayanamsha` on the server,
  `ayanamshaAt` in the TypeScript client). Every step stays below 2^53,
  so the integer part of the revolution count is exact in a double and the
  client reproduces the server to ~1e-8°. Storing it per sample would have
  been 4 bytes a sample for a number that changes 50″ a year.

Everything else the client needs is a closed formula over these numbers
(see "What the client computes").

## Interpolation

Cubic Hermite per body, from the (longitude, speed) pair at the two
bracketing samples — the Moon's stored speed, and the other bodies'
differenced speeds, make the curve match the true motion, not just the
points. The ayanamsha comes from the text's formula at the instant asked
for, and the mean Sun from the header anchor plus its exact rate, plus the
ayanamsha for the sayana value. `check` measures the error against the
direct formulas over the whole range.

The honest accuracy limit is not the interpolation but the text's own
arithmetic: `revolution_fraction` adds the ahargana to the ~7.14e11 days
from creation to Kali, and an f64 there moves in steps of ~1.6e-4 days
(~14 s), so a longitude jumps by up to speed × 1.6e-4 days between adjacent
steps — about 7″ for the Moon. The server computes the same steps (its
goldens compare bit-exactly because Python does the same arithmetic), so no
table can match the function closer than its own step. Measured worst errors
over 2000 random instants in 2000–2001: Moon ~4–5″, Sun ~0.4″, Mercury
~0.6″, the rest under 0.5″, at every step from 24 h down to 6 h — a finer
step does not help, because the steps are in the function, not the table.
`check` budgets each body at its fastest speed × 2e-4 days + 0.5″.
A tithi moves ~0.5°/hour, so a few arcseconds is ~30 ms of boundary time —
far inside any display need, and the same size as the server's own steps.

Sizes (36 bytes/sample): 1900–2100 at 12 h is ~5.3 MB, at 6 h ~11 MB. The
12 h step is the default: finer steps measure no better, for the reason
above. The server sends a slice for the dates asked for — a year is ~26 KB
at 12 h, a day 144 bytes plus the 48-byte header — and the app caches it.
The full file lives on the server only, next to `kernel.veph`.

## What the client computes

All of this is pure arithmetic over interpolated longitudes, a JD, and the
user's latitude/longitude. The only SS formula ported is the ayanamsha
(three constants, ten lines — see "What the file holds").

- **Graha rashi / nakshatra / pada**: longitude ÷ 30°, ÷ 13°20′, ÷ 3°20′.
- **Tithi**: (Moon − Sun) ÷ 12°. **Karana**: the same elongation ÷ 6°.
  **Yoga**: (Sun + Moon) ÷ 13°20′.
- **Lagna**: RAMC from the stored mean Sun (`wrap(mean_sun + 360·frac(JD +
  lon/360 + 0.5) − 180)`) and the standard ascendant formula with the text's
  24° obliquity, minus the stored ayanamsha. This is `frame::ascendant`
  with its inputs read from the table instead of computed.
- **Sunrise / sunset**: the Sun's RA/Dec from its interpolated longitude
  (24° obliquity), the hour-angle formula, iterated against the table so the
  Sun's motion during the day is accounted for. The horizon is the text's
  own: the Sun's centre on the geometric horizon (0°), not the −0.833° upper
  limb the drik path uses.
- **Boundary times** (when a tithi or nakshatra changes): scan the day in
  5-minute steps over interpolated positions and bisect the crossing. A day
  is 288 evaluations of pure interpolation — trivial on a phone, and it is
  why v1 needs no `.vidx` for the Siddhanta: the index exists for drik
  because a Chebyshev evaluation is heavy; a table lookup is not.

## What the server still does

- Serves table slices (`GET /v1/siddhanta/table?from_jd&to_jd`): read the
  file, return the header plus the sample window. Lookup only, no maths.
- Keeps the computed API as the authority for everything the table cannot
  answer: kundali, dashas, muhurta searches, gochar, festivals, and any
  instant outside the table's range. The offline path covers the
  day-to-day views (panchanga, graha, tithi, nakshatra, lagna) — the traffic
  that scales with users.
- The table is generated by `siddhanta-table build` (this crate's binary),
  exactly like `ephdata extract` builds `kernel.veph`. Regenerate it when
  the SS code changes; `check` proves the file still matches the formulas.

## Deliberately not in v1

- No event index (`.vidx`) for the Siddhanta — the client scans, see above.
- No latitudes: nakshatra/pada/tithi/graha rashi and lagna need longitudes
  only. Latitudes (and with them eclipses, graha RA/Dec extras) stay
  server-side until a use needs them on the client.
- No kundali/dasha/muhurta on the client: those need rise/set searches over
  whole days, divisional charts and the full rule set, not just positions.

## The fallback file: Chebyshev coefficients (CHEB0001)

The STAB table is the server's lookup. The fallback is for when the client
cannot reach the server at all: a file small enough to ship *inside* the
app, evaluated on the phone with no server involved. Same motion, different
representation — a mathematical one, the way JPL stores the ephemeris: each
body, over each 32-day segment, is one Chebyshev polynomial, and the client
evaluates it with Clenshaw's recurrence.

### Why not one reading + mean speed

The first instinct was that the slow bodies (Saturn, Jupiter, Mars, Rahu)
move at mostly their mean speed, so one reading plus a rate should carry
them, and only the Moon needs frequent readings. Measured against the direct
formulas, that is wrong by degrees within a month:

| body | error after 30 days | error after 90 days |
| --- | --- | --- |
| Sun | 0.42° | 0.37° |
| Moon | 0.04° | 3.62° |
| Mars | 5.69° | 10.97° |
| Mercury | 22.96° | 14.16° |
| Jupiter | 4.46° | 14.04° |
| Venus | 10.88° | 26.00° |
| Saturn | 2.60° | 5.10° |
| Rahu | 0.00° | 0.00° |

A planet's apparent speed is not its mean speed: Mars and Jupiter go
retrograde for months at a time, Mercury and Venus swing wildly near
inferior conjunction, and the equation of centre alone is ~2° for the Sun
and ~10° for Mars. Only Rahu is exactly linear (its longitude is a uniform
node motion) — one reading plus a rate is exact for Rahu and for nothing
else. The correct form of the instinct is Chebyshev: a slow body is *smooth*,
so it needs *few coefficients*; the Moon is fast, so it needs many. The
degree per body is the measurement of that.

### Format

```text
0   "CHEB0001"
8   u32 body count (= 8), u32 segment count
16  f64 first JD (UT), f64 segment length in days (32)
32  f64 mean Sun (nirayana) at the first JD, f64 its exact rate °/day
48  8 × u8 Chebyshev degree per body, in Body::ALL order
56  per segment, per body: (degree + 1) f32 coefficients
```

The coefficients fit the *unwrapped* longitude over the segment; the reader
evaluates and wraps to 0–360°. The ayanamsha is not stored (same ten-line
formula as the STAB reader), the mean Sun is the same header anchor + rate,
and the speed is the derivative of the fitted polynomial (±0.05-day central
difference of the evaluation — the polynomial is smooth, so that difference
is accurate). Ketu is still Rahu + 180°, never stored.

### Measured degrees and the lesson in measuring them

Degrees (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu):

```text
[4, 22, 15, 28, 13, 19, 8, 4]
```

Mercury needs 28 in its worst segments: near an inferior conjunction its
geocentric longitude swings and reverses inside one 32-day window. The Moon
needed 22, not 17: its longitude carries the text's own ~14 s steps (up to
9" jumps), and a degree-17 polynomial leaves ~4" of fit error on top of
them.

The degrees were *not* measured once. Three segments from the year 2000
said `[4, 14, 4, 9, 4, 4, 4, 4]` — and the full-range check then failed
Venus at 121". Twenty-one segments spread across 1900–2100 said
`[4, 16, 6, 11, 10, 14, 8, 4]` — and the check then failed Mercury at 8"
and Mars at 4.6". One hundred spread segments said
`[4, 17, 15, 28, 13, 19, 8, 4]`, the check failed only the Moon at 13.6",
and degree 22 for the Moon closed it. A degree that only holds on a sample
of segments is not a degree: `cheb-measure` samples segments across the
whole range, and `cheb-check` re-verifies the file over random instants
across the whole range. Raise the degrees if it ever fails.

### Sizes and accuracy

| file | size | worst error, 5000 random instants |
| --- | --- | --- |
| STAB 1900–2100 (5,285,892 B) | 5.3 MB | Moon 4.37" |
| CHEB 1900–2100 (1,110,836 B) | 1.11 MB | Moon 8.95", Mercury 1.42", rest under 1" |
| CHEB 2026–2035 (55,716 B) | 55 KB | Moon 10.26" over 1000 instants |

Budgets are the same as `check`: fastest speed × 2e-4 days + 0.5". The
10-year file is the one shipped with the apps (see below).

### On the client

- `packages/domain/src/astronomy/chebyshev.ts` — `parseChebTable`,
  `chebPositionsAt` (same `SiddhantaPositions` shape as the STAB reader, so
  the same derivations run on either source), and `clenshaw`.
- `packages/domain/src/astronomy/siddhanta-source.ts` — `PositionSource`
  (anything that can answer "where are the grahas at this instant"),
  `stabSource`, `chebSource`, and `loadSiddhantaSource`: the server's slice
  for the year, unless the server is slow (past the timeout, default 8 s),
  errors, or is unreachable — then the bundled CHEB file, if the app ships
  one. The derivations in `siddhanta-offline.ts` (`lagnaAt`,
  `sunriseSunset`, `nextTithiBoundary`, `displaySpeedAt`) now take a
  `PositionSource` instead of a table, so they run unchanged on either.
- `apps/mobile/assets/siddhanta.cheb.json` — the 2026–2035 file, base64
  (the snapshot push cannot carry binary files), loaded by
  `apps/mobile/lib/siddhanta-offline.ts` (`bundledSiddhantaCheb`,
  `loadSiddhantaSourceFor`). `apps/web/public/siddhanta.cheb.json` is the
  same file for the web app, fetched from its static assets. Regenerate both
  when the app ships a new version: `siddhanta-table cheb-build
  data/siddhanta-2026-2035.cheb 2026 2035`, then base64 into the JSON.
- Nothing is wired into any screen yet: the fallback is ready and tested
  (6 new tests in `packages/domain/test/chebyshev.test.ts`, including the
  loader's server/slow/unreachable cases), and a screen adopts it by calling
  `loadSiddhantaSourceFor` instead of `fetchPanchanga`.

### Our own Swiss Ephemeris for Drik

Swiss Ephemeris is a calculation library plus compressed JPL data: it took
DE431 (~2.8 GB), kept the Chebyshev coefficients, dropped what it did not
need, and packed the rest into ~99 MB of `.se1` files (planets `sepl_*`,
Moon `semo_*`, asteroids `seas_*`), with a stated agreement of about 1
milliarcsecond against the source. It also falls back to an analytical
ephemeris (Moshier) when a `.se1` file is missing — so a Swiss result does
not always come from the compressed files, and the source has to be stated
when validating.

We already do the same for Drik, on the server. `kernel.veph`
(`VEPH0002`, `crates/ephdata/src/kernel.rs`) is our own compressed
ephemeris: JPL DE441 Chebyshev data (newer than Swiss's DE431), extracted
by `ephdata extract` from the SPK, keeping only the 12 segments the sky
needs (Sun, Earth–Moon barycentre, Earth, Moon, Mercury, Venus, Mars,
Jupiter, Saturn, Uranus, Neptune, Pluto), cut to the date range the app
needs, and bit-packed — every coefficient rounded to a fixed step in km
(1 m by default) and given only the bits its largest value needs, the same
class of compression Swiss uses. The JPL fit itself is not resampled: every
coefficient is kept. `crates/ephdata` is the calculation library beside it
(the apparent place with light-time, aberration, precession and nutation,
Lahiri ayanamsha, ΔT), and `events.vidx` is the precomputed index (every
anga boundary, sankranti, ingress and station), built by `ephdata index`.
The `ephdata` binary is the build and check tool (`extract`, `index`,
`lon`, `dump`, `check`, `sample`, `stations`).

What Swiss has that we do not:

- **30,000 years of coverage** (its files are split into ~600-year
  periods). Ours covers only the years the app needs — that is the "only
  the things we need" part, already applied at extraction time.
- **Asteroid files.** Nothing in Patro uses asteroids, so none are kept.
- **A fallback when the data is missing.** Swiss falls back to Moshier;
  we return 503 when the kernel is absent. That is the real gap, and the
  CHEB file below is what closes it on the client side.

The client-side Drik file is `CHEB0002`, built by the `drik-*` commands
in this binary — the same shape as the Surya file, different data, and a
different header. The coefficients are fitted to the exact functions the
server's Drik path uses (`Sky::sidereal_longitude` for the seven bodies,
`Sky::true_node` for Rahu), so the file agrees with the server to the fit
error, not to a second implementation. The header carries the ayanamsha
and the mean Sun as straight lines fitted from the kernel over the file's
range (Lahiri precession is linear to far under an arcsecond over 200
years; the build measures the fit and refuses a bad one), because there is
no closed-form Lahiri formula in the reader to fall back on — the file
carries the two numbers instead of the reader guessing them. The client
reads both scalars from the header (`chebScalars`), and the Drik frame
(true mean obliquity of date, rigorous Greenwich sidereal time, −0.833°
horizon) rides on the source (`drik-source.ts`), so the shared derivations
— tithi, nakshatra, lagna, sunrise — run correctly for Drik too. Uranus,
Neptune and Pluto stay in the kernel only: no panchanga derivation reads
them, and the fallback is a panchanga file.

```text
siddhanta-table drik-measure <kernel.veph> [segments] [segment_days]
siddhanta-table drik-build <kernel.veph> <out.cheb> <first_year> <last_year> [segment_days] [degrees]
siddhanta-table drik-check <kernel.veph> <table.cheb> [random_samples]
siddhanta-table drik-fixtures <kernel.veph> <table.cheb> <out.json> [count]
siddhanta-table drik-sun <kernel.veph> <out.json> [days]
```

`drik-measure` spreads segments across the kernel's own coverage (21 by
default — three under-measure, the same lesson as the Surya file, where
three segments from one year missed Venus at 121"). The budget is a flat
0.5" — the kernel's motion is smooth, with none of the text's ~14 s steps,
so only the fit itself is budgeted, and the measure samples every 0.05
days so it sees the peaks the check will. The kernel must extend at least
a day beyond the table's range on both sides (light-time looks back from
the first instant, and the table's year boundaries are midnight while the
kernel's are noon); the commands say so plainly when it does not, instead
of failing with the kernel's out-of-range error.

No Drik file is built here: this workspace has no kernel data (the HTTP
goldens cannot run for the same reason). The builder and its test run on a
synthetic kernel — circular orbits in the ecliptic plane, the Moon inclined
5.14° so its node is defined, written by `drik-synthetic` — and the
TypeScript fixtures (`packages/domain/test/fixtures/drik-2000.*`) come from
it. On the synthetic kernel the year 2000 file is 3,624 bytes at measured
degrees `[5, 23, 6, 12, 5, 7, 4, 4]`, and `drik-check` passes over 500
random instants (worst: Mars 0.40", Sun 0.33", Moon 0.32"). The real file's
degrees and size come from `drik-measure` on the real kernel, where the
kernel lives; the Moon there carries the real perturbations (evection,
variation, annual equation), so expect it to need more than the synthetic
23, and the Sun to need more than 5 — its geocentric longitude carries the
Earth's monthly wobble around the EMB (±6.5"), which the Surya Sun does
not have. The 5 new tests in `packages/domain/test/drik.test.ts` prove the
reader, the frame and the loader against the synthetic file; the real file
is verified the same way, by `drik-check` and the fixtures, where it is
built. Ship it as `apps/mobile/assets/drik.cheb.json` and
`apps/web/public/drik.cheb.json` (base64, like the Surya file) when it
exists; no screen is wired to it yet.

### Arun/Barun

Uranus (Arun) and Neptune (Barun) are not in the Surya file at all: the
Surya Siddhanta's grahas are the eight stored here, and the text has no
Uranus or Neptune. They are in the Drik kernel (segments 7 and 8), and the
server can answer them — but the Drik CHEB file stores the same eight
grahas as the Surya one, because no panchanga derivation reads Uranus or
Neptune. They would come from the kernel, not from a fallback file.
