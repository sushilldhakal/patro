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
