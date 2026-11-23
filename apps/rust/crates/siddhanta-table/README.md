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

`STAB0001`, one sample every few hours over a year range:

```text
0   "STAB0001"
8   u32 body count (= 8), u32 sample count
16  f64 first JD (UT), f64 step in days
32  per sample, 72 bytes:
      8 bodies × (f32 sidereal longitude 0–360°, f32 speed °/day)
      f32 ayanamsha°, f32 mean Sun (sayana)°
```

Bodies are in `Body::ALL` order: Sun, Moon, Mars, Mercury, Jupiter, Venus,
Saturn, Rahu. Ketu is Rahu + 180° and is never stored. Longitudes are stored
**wrapped** (0–360°): an unwrapped longitude over 200 years reaches ~26
million degrees, where an f32 has ~2° of resolution. The reader unwraps the
two bracketing samples against each other, which is unambiguous because no
body moves 180° in one step.

The speed beside each longitude is the **instantaneous derivative**, not the
speed the API shows: the text defines speed as the ±0.5-day central
difference, and for the Moon that differs from the true derivative by more
than the interpolation budget (its higher derivatives are large — a table
built with the central-difference speed measured a 4″ Moon error at every
step from 24 h down to 3 h). Hermite needs the true derivative. A client
that wants the displayed speed takes the central difference of the table
itself at ±0.5 days, which matches the API's definition.

Two values are stored that a client could in principle compute, so that it
never has to port a Surya Siddhanta formula at all:

- **ayanamsha** — needed for lagna (nirayana = sayana − ayanamsha).
- **mean Sun (sayana)** — needed for sidereal time and the equation of time,
  hence for lagna and sunrise/sunset. It is exactly linear in JD, so linear
  interpolation is exact for it.

Everything else the client needs is a closed formula over these numbers
(see "What the client computes").

## Interpolation

Cubic Hermite per body, from the (longitude, speed) pair at the two
bracketing samples — the speeds are stored precisely so the curve matches the
true motion, not just the points. Ayanamsha and the mean Sun interpolate
linearly (the ayanamsha is a sine with a ~7200-year period; the mean Sun is
linear). `check` measures the error against the direct formulas over the
whole range.

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

Sizes (72 bytes/sample): 1900–2100 at 12 h is ~10 MB, at 6 h ~21 MB. The
12 h step is the default: finer steps measure no better, for the reason
above.
for the dates asked for — a year is ~35 KB at 12 h, a day 288 bytes — and the
app caches it. The full file lives on the server only, next to `kernel.veph`.

## What the client computes

All of this is pure arithmetic over interpolated longitudes, a JD, and the
user's latitude/longitude. No SS formula is ported.

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
