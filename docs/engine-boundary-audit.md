# Engine boundary audit

**Phase 5.** Status: COMPLETE, and the duplicate it found has since been **migrated** (§4).

> ⚠️ **Units correction (2026-08-02).** This document originally reported the Meeus-vs-
> ephemeris difference as "~8 seconds" of equinox timing. That was a units error: the Sun
> moves 0.0411°/**hour**, so 0.0057° is 0.14 hr = **8.4 minutes**, not 8 seconds. The `×60`
> in the original calculation converts hours to minutes, and the result was mislabelled as
> seconds. Every "8 s" below should read **8.4 min**. This materially changed the decision —
> 8.4 minutes *is* visible in a boundary printed to the minute — and the migration was
> carried out rather than deferred.

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
| 1950-03-20 | 359.31304° | 359.31344° | −0.00040° | −0.6 min |
| 2000-03-20 | 0.18505° | 0.18257° | +0.00249° | +3.6 min |
| 2026-03-20 | 359.89115° | 359.88544° | +0.00571° | +8.3 min |
| 2050-03-20 | 0.07501° | 0.06928° | +0.00573° | +8.4 min |
| 2100-03-20 | 359.95386° | 359.95496° | −0.00110° | −1.6 min |

**Worst 0.0057°, about 8.4 MINUTES of equinox timing** (corrected — see the note at the top). Not a live defect — no season label
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

### DECIDED 2026-08-02: MIGRATED (option B)

**The Meeus implementation has been removed.** `solar_apparent_longitude` now delegates to
`default_engine.sun_longitude(jd, sidereal=False)`.

The deferral recorded here on 2026-08-02 had a trigger — the `equinox_solstice` golden
dataset being populated. Phase 9 populated it from a mathematical definition against Swiss
Ephemeris, so the trigger fired and the migration was carried out the same day. Re-measuring
for the migration also exposed the units error corrected above, which reversed the
cost/benefit: an 8.4-minute shift is visible, and carrying a lower-precision approximation
of the authority to preserve it is not defensible.

| | |
|---|---|
| **What exists** | A second solar-longitude implementation (`tropical_seasons.solar_apparent_longitude`, Meeus ch. 25) running outside the astronomy layer and bypassing Swiss Ephemeris. |
| **Measured difference (pre-migration)** | ≤ **0.0057°** across 1950–2100 = **8.4 minutes** of season-boundary timing. |
| **Expected migration impact** | Season-boundary instants move ≤ 8 s. A *printed* boundary changes only when it falls within 8 s of a minute rollover — roughly 1-in-7 per boundary, 6 boundaries a year. If any printed value moves, `PANCHANGA_PAYLOAD_VERSION` must be bumped and the change reviewed as a behaviour change. The byte-identical harness does **not** currently cover `tropical_seasons`, so the true blast radius must be measured first. |
| **Also unblocked by migrating** | Tropical seasons become BCE-capable (today `_julian_day` uses `datetime.timestamp()`, so the module is CE-only — the one astronomy path in the engine that is not BCE-safe), and the Meeus coefficients become visible to `EnvironmentProvenance`. |
| **Trigger (FIRED)** | `tests/golden/data/equinox_solstice.json`, populated in Phase 9 from the definition "tropical solar longitude = 0/90/180/270°". |
| **Why not sooner** | Without external equinox instants, the migration could only be verified against the implementation being replaced. That is precisely how the prior audit's self-captured goldens hid four live bugs. |

**Now guarded at zero.** `tests/test_engine_boundary.py::test_no_hand_rolled_solar_longitude_remains`
fails if a hand-rolled series reappears, and `test_tropical_seasons_now_uses_the_ephemeris`
asserts exact equality with the engine rather than mere agreement. The dead `RAD` constant
and `math` import went with the series.

Also resolved by migrating: tropical seasons are no longer the one astronomy path outside
`EnvironmentProvenance`, since the ephemeris call is now provenanced like every other.
`_julian_day` still uses `datetime.timestamp()`, so the module remains CE-only at its
*entry point* — that is a separate, smaller gap than a whole second solar model.

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
