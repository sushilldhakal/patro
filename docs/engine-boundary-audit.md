# Engine boundary audit

**Phase 5.** Status: audited. **One finding needs a decision (§4); nothing else moved.**

Three layers, and the question for each boundary is whether code sits on the right side:

```
astronomy      where were the bodies?          engine/astronomy/
calendar math  what anga does that produce?    engine/astronomy/{panchanga,rashi,lagna}.py  ← misfiled
cultural rules how does a community read it?   engine/vedic/, rules/
```

---

## 1. Swiss Ephemeris containment — clean

`swisseph` is imported by exactly **five** files, and `tests/test_timescale_contract.py`
fails if that set changes:

| File | Why |
|---|---|
| `engine/astronomy/engine.py` | the ephemeris gateway |
| `engine/astronomy/jd_calendar.py` | `julday`/`revjul` calendar conversion |
| `engine/astronomy/ut_instant.py` | JD ↔ instant conversion |
| `engine/astronomy/provenance.py` | reads version/DE/ΔT identity (Phase 2) |
| `services/startup.py` | sets the ephemeris path at boot |

No leakage. The prior audit closed the last two leaks; nothing has reopened.

---

## 2. Cultural rules inside astronomy — none found

The concern was that festival or regional logic had leaked into the astronomy layer.
Measured: `grep -ciE "festival|nepal|tradition|vrata|smarta|vaishnav|region"` returns **0**
across `panchanga.py`, `rashi.py` and `lagna.py`.

What those files actually contain is span constants (`TITHI_SPAN = 12.0`,
`NAKSHATRA_SPAN = 360/27`), name tables, and index arithmetic. That is **calendar
mathematics** — definitional, not cultural. A tithi *is* 12° of elongation in every
tradition; which tithi a community observes for a festival is the cultural part, and that
lives in `engine/vedic/` and `rules/`.

### Regional *defaults* do appear, and are left alone

| Site | What | Verdict |
|---|---|---|
| `sun.py`, `moon.py` | `LAT_KATHMANDU` / `LON_KATHMANDU` as default parameters | **defaults, not rules.** A product choice about what happens when a caller supplies nothing. Harmless and explicit. |
| `paths.py` | `KATHMANDU_CITY_ID = 1283240` | cache-snap constant, no astronomy effect |
| `timescale.py` | Nepal KMT/IST/NPT eras, Nepal bounding box | **the one real smell** — a special case rather than a model. Already tracked as roadmap **W2**; generalising it has no current consumer, so it stays open rather than being built speculatively. |

---

## 3. Duplicated calculations — one real, two false positives

### False positives, checked and dismissed

- **`graha_detail._moon_sun_elongation` vs `PanchangaService.elongation`** — different
  semantics, not duplicates. The former returns *unsigned* 0–180° (for combustion/asta
  proximity), the latter *signed* 0–360° (tithi and karana are cuts of it). Both derive
  from the same engine longitudes.
- **`shadbala._ayana` declination** — a deliberately simplified formula assuming zero
  ecliptic latitude, which is what the traditional ayana-bala computation specifies. Not a
  degraded copy of `engine.equatorial_from_ecliptic`; a different quantity.

### Real: a second Sun-longitude implementation

`engine/vedic/tropical_seasons.solar_apparent_longitude` implements **Meeus chapter 25**
low-precision solar longitude in pure Python, bypassing Swiss Ephemeris entirely. It drives
the tropical (sāyana) six-season boundaries — equinoxes and solstices.

Measured against the ephemeris:

| Date | Meeus | Swiss | Δ | as equinox timing |
|---|---|---|---|---|
| 1950-03-20 | 359.31304° | 359.31344° | −0.00040° | −0.6 s |
| 2000-03-20 | 0.18505° | 0.18257° | +0.00249° | +3.6 s |
| 2026-03-20 | 359.89115° | 359.88544° | +0.00571° | +8.3 s |
| 2050-03-20 | 0.07501° | 0.06928° | +0.00573° | +8.4 s |
| 2100-03-20 | 359.95386° | 359.95496° | −0.00110° | −1.6 s |

**Worst 0.0057°, about 8 seconds of equinox timing.** Not a live defect — no season label
on any day plausibly turns on 8 seconds. But three structural problems:

1. **Ownership is wrong.** Astronomy computed outside the astronomy layer, so the UT
   contract, the memoisation, and the ephemeris identity do not apply to it.
2. **It is CE-only by construction.** `_julian_day()` uses `datetime.timestamp()`, so it
   cannot represent BCE at all. Every other astronomy path in this engine has been BCE-safe
   since the era-twin migration. Tropical seasons are silently the exception.
3. **It is invisible to provenance.** The Meeus coefficients are correction constants by any
   reasonable definition, and Phase 2's `EnvironmentProvenance` does not know they exist. A
   cached season boundary cannot say what produced it.

**This is the §4 decision.**

---

## 4. Decision required: `tropical_seasons`

Replacing the Meeus series with `sun_service.longitude(jd, sidereal=False)` would:

- ✅ remove the duplicate, put the calculation behind the UT contract and provenance
- ✅ make tropical seasons BCE-capable like everything else
- ⚠️ **change computed season-boundary instants by up to ~8 seconds**

That last point is a **behaviour change**, which is a declared stop condition. It is
almost certainly invisible in output — season boundaries are published to the minute, and
an 8-second shift changes a printed boundary only when it falls within 8 seconds of a
minute rollover (~1-in-7 chance per boundary, 6 boundaries a year). The byte-identical
harness does not cover `tropical_seasons`, so the true blast radius should be measured
before deciding.

**Options:**

| | Effect |
|---|---|
| **A. Leave it.** | Zero risk. Duplicate persists, tropical seasons stay CE-only and unprovenanced. |
| **B. Migrate to the ephemeris.** | Removes the duplicate and the BCE gap. Season boundaries move ≤8 s; needs a payload-version bump if any printed value changes. |
| **C. Migrate behind a flag,** default off. | Worst of both — two implementations *and* a branch. Not recommended. |

**Recommendation: B**, sequenced after Phase 6. Golden tests for equinox/solstice instants
would let the migration be verified against external truth rather than against the
implementation being replaced — which is exactly the trap the prior audit's self-captured
goldens fell into.

---

## 5. The boundary naming issue — deliberately not fixed

`engine/astronomy/{panchanga,rashi,lagna}.py` are calendar mathematics living in the
astronomy package. The roadmap's Phase 9 proposes moving them to `engine/panchanga/`.

Left alone, because it is a pure rename with no correctness content, it would touch every
importer, and Phase 8 may relocate these files anyway. Doing it now risks a second move
later. It costs nothing to defer and the layering is documented here in the meantime.

---

## 6. Summary

| Check | Result |
|---|---|
| swisseph confined to the astronomy layer | ✅ 5 files, test-guarded |
| Cultural rules in astronomy | ✅ none |
| Regional defaults in astronomy | ⚠️ present, harmless; tz eras tracked as W2 |
| Astronomy in the cultural layer | ⚠️ **1 case** — `tropical_seasons` (§4) |
| Duplicated calculations | ⚠️ **1 real**, 2 false positives dismissed |
| Code moved this phase | **none** — see §4, §5 |
