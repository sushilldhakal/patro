# Timescale contract, and what ΔT costs at historical dates

**Phase 3.** Status: investigated and documented. **No code architecture added** — see §5
for why the planned `DeltaTProvider` was not built.

---

## 1. The contract, in one line

> **Every ephemeris call in this engine takes Universal Time. Julian Day means JD(UT)
> everywhere — in code, in cache keys, in payloads. Terrestrial Time never appears.**

Verified, not asserted: all 25 swisseph call sites in `engine/astronomy/engine.py` use the
UT-taking variant.

| Call | Count | Time argument |
|---|---|---|
| `swe.calc_ut` | 6 | UT |
| `swe.rise_trans_true_hor` | 5 | UT |
| `swe.houses` | 3 | UT (sidereal time derived internally) |
| `swe.get_ayanamsa_ut` | 3 | UT |
| `swe.sol_eclipse_when_glob` / `_loc` | 3 | UT |
| `swe.lun_eclipse_when` / `_loc` | 3 | UT |
| `swe.pheno_ut` | 1 | UT |
| `swe.time_equ` | 1 | UT |
| `swe.julday` / `revjul` / `cotrans` | 3 | calendar / frame conversion, no timescale |

**Zero** uses of the bare TT variants (`swe.calc`, `swe.get_ayanamsa`). `tests/test_timescale_contract.py`
greps for them and fails if one appears.

### Why this matters

Swiss Ephemeris offers both `calc` (TT) and `calc_ut` (UT). Mixing them silently offsets
results by ΔT — 64 seconds today, **21 hours** at 3000 BCE. The roadmap (W3) anticipated a
"separate UTC/UT1/TT/ΔT" cleanup on the assumption that hidden mixing existed.

**It does not.** The contract is already uniform. The work was to *find that out* and to
write it down so it stays true, not to build layers around a problem that was never there.

### Where ΔT enters

Only inside Swiss Ephemeris. Given JD(UT), it computes `TT = UT + ΔT` internally and
evaluates the JPL ephemeris at TT. Our code never sees TT and never needs to.

`UTC` vs `UT1` is likewise not our concern: the difference is bounded by ±0.9 s by
definition (leap seconds keep it so), which is far below every tolerance in this system and
vanishingly small next to the historical uncertainties in §3.

---

## 2. The ΔT model in force

Recorded automatically by `EnvironmentProvenance` (Phase 2) — these values are read from
the running library, not typed here:

| | |
|---|---|
| Model | `MOD_DELTAT_STEPHENSON_ETC_2016` (id 5) — Stephenson, Morrison & Hohenkerk 2016 |
| Tidal acceleration | **−25.936** ″/cy² (auto-selected to match DE441; note the documented `TIDAL_DEFAULT` is −25.8) |
| JPL ephemeris | **DE441** |

Stephenson/Morrison/Hohenkerk 2016 is the current best published reconstruction, built from
Babylonian, Chinese, Arab and European eclipse records. There is no better option to switch
to, which is the practical reason §5 declines to build a provider abstraction.

Measured ΔT at the probe instants provenance records:

| Epoch | ΔT |
|---|---|
| 2000 CE | 63.8 s |
| 1900 CE | −2.0 s |
| 1 CE | 2.94 h |
| 1001 BCE | 7.09 h |
| 3001 BCE | 20.92 h |

---

## 3. What ΔT uncertainty costs — the honest error bars

This is the section that matters for the 25,772-year ambition. **A calendar engine that
serves 3000 BCE without stating its error bars is not scientifically honest.**

ΔT is *measured*, not derived — it depends on the Earth's irregular rotation, which is
reconstructed from ancient eclipse observations. Published 1σ uncertainties grow rapidly
going back.

### The mechanism, and the asymmetry

ΔT connects two clocks: **UT** (Earth rotation — where the observer is pointing) and **TT**
(ephemeris time — where the bodies are). An error in ΔT means the sky is evaluated at the
wrong moment relative to the observer's rotation.

The consequences are very unequal, and the asymmetry is the useful result:

| | Rate | Effect of ±2 h ΔT error at 3000 BCE |
|---|---|---|
| **Sunrise / sunset** | ~2.6 s per hour of ΔT | **±5 s** — negligible |
| **Sun longitude** | 0.041°/h | ±0.084° |
| **Moon longitude** | **0.55°/h** | **±1.0°** |
| **Moon − Sun elongation** | 0.51°/h | **±1.0°** |

*(Sunrise and elongation figures are measured, not modelled — perturbing ΔT via
`swe.set_delta_t_userdef` and re-running the real engine.)*

**Sunrise is robust.** A naive estimate suggests ~19 s; the measured value is ~5 s, because
the Sun's declination shift partly cancels the hour-angle shift. Either way it is far below
the minute-level resolution any panchanga publishes. **The udaya (sunrise) anchor is not the
weak link at BCE dates.**

**The Moon is the weak link.** It moves 13×faster than the Sun, so it absorbs nearly all the
error.

### Translated into panchanga terms

| Epoch | ΔT 1σ | Elongation error | As fraction of a tithi (12°) | Tithi *end time* error |
|---|---|---|---|---|
| 2000 CE | ~0 | ~0 | ~0 | ~0 |
| 1 CE | ±0.06 h | ±0.037° | 0.3% | ~4 min |
| 1000 BCE | ±0.5 h | ±0.27° | 2.2% | ~30 min |
| 2000 BCE | ±1.2 h | ±0.59° | 4.9% | ~70 min |
| **3000 BCE** | **±2.0 h** | **±1.00°** | **8.3%** | **~2 h** |

**How to read this.** At 3000 BCE the tithi *number* is reliable except when the day's
sunrise falls within ~8% of a tithi boundary — roughly a 1-in-12 chance on any given day.
Tithi, nakshatra and yoga *end times* carry roughly ±2 hours. Nakshatra (13.333° span) is
slightly more robust than tithi; yoga (sum of longitudes, so the Moon still dominates) is
comparable to tithi.

Verified empirically at 3000 BCE: perturbing ΔT across its full ±2 h band moves the
Sun–Moon elongation from 186.42° to 188.46° — 2.04°, matching the model — while the tithi
number happens to hold at 16 because that day sits mid-tithi. Near a boundary it would flip.

### What this does *not* affect

Vara (weekday), which is a count of civil days on the Julian Day axis, and every calendar
label derived from the civil date. Those are exact at any epoch.

---

## 4. Julian / Gregorian and BCE handling — verified sound

No change needed; recorded so Phase 3 is not revisited.

- **Calendar cutover.** `engine/astronomy/jd_calendar.py` labels days Julian before
  1582-10-15 and Gregorian from it on — the historical convention, matching Swiss Ephemeris'
  own `swe_date_conversion`. Labelling pre-1582 days proleptic-Gregorian instead would shift
  them (255 BCE by 4 days, 1000 BCE by 9), enough to change the tithi.
- **BCE years** use the astronomical convention (1 BCE = year 0, 2 BCE = −1), carried by
  `CivilDay`, which `datetime.date` cannot represent.
- **The two calendars coincide through 201–300 CE**, so a spot check in that window cannot
  detect a cutover bug. Documented in `jd_calendar.py`; do not validate BCE work there.
- **Civil offsets before tzdata coverage** fall back to the zone's modern standard offset
  (`engine.py:_utc_offset_days`). At ±5 s of ΔT-driven sunrise error, this approximation —
  worth minutes — is the *dominant* civil-time error at BCE dates, not ΔT. See roadmap W2;
  generalising it is open work.

---

## 5. Why there is no `DeltaTProvider`

The roadmap proposed a provider seam (`ModernDeltaT` / `HistoricalDeltaT` / `CustomDeltaT`).
**Not built.** The reasoning, so a later reader can reopen it deliberately:

1. **One implementation, no second candidate.** Stephenson/Morrison/Hohenkerk 2016 is the
   current best published model. A seam with one implementation is an abstraction with no
   client — the thing the engineering rules explicitly forbid.
2. **The escape hatch already exists.** `swe.set_delta_t_userdef()` overrides ΔT completely,
   and Phase 2's provenance probes *detect* such an override (verified: the probes change,
   the model constant does not). Anyone needing a custom ΔT has a supported route today, and
   it is already recorded when used.
3. **The contract is uniform**, so there is no mixing to abstract away.
4. **Cost of deferring is near zero.** Adding a provider later is a local change inside
   `AstronomyEngine`; nothing above it would need to move, because nothing above it knows
   ΔT exists.

**Reopen this if** a golden test (Phase 6) shows a systematic BCE bias traceable to ΔT, or
a newer reconstruction is published. Until then the honest engineering is to use the best
model, record which model ran, and publish the error bars — all of which is now done.

---

## 6. What Phase 3 produced

| | |
|---|---|
| Code architecture added | **none** — the anticipated problem did not exist |
| Documentation | this file |
| Enforcement | `tests/test_timescale_contract.py` — fails if a TT-variant call appears |
| Scientific output | measured ΔT error bars for BCE panchanga (§3) |
| Behaviour change | none |

The measurements in §3 should be surfaced to API consumers requesting deep-historical dates
— an `uncertainty` block on BCE payloads. That is an **additive public API change**, so it
is deliberately *not* done here; it belongs to Phase 9 with the rest of the API surface.
