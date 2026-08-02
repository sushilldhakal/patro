# Architecture roadmap — from Panchanga application to calendar engine

**Addendum to [`computation-architecture-audit.md`](computation-architecture-audit.md).**
That document audited `@562c1f3` and drove five migration phases to completion. It is
still accurate and is not superseded. This document does not restate it.

Scope of this addendum: what remains **after** those five phases, and the order in which
to build it. Written against `main @ b6e02ce`.

Read the audit first for: the era-twin elimination (A1), the four live bugs (A0–A0d), the
`positions.py`/`swiss_eph.py` merge, the two-axis cache versioning rationale, and the
"what not to do" list — all of which remain in force.

---

## 1. Current architecture state

### 1.1 What the code actually looks like now

```
route (api/*, 84 endpoints)      era decode + cache key + one builder call
  ↓
EraMiddleware                    era ⇄ JD  (ad / bc / bs / bbs, all four everywhere)
  ↓
JD-native builder                one per concept, no _civil twins
  ↓
domain service                   Panchanga / Planet / Moon / Sun / Rashi / Lagna
  ↓
AstronomyEngine                  sole swisseph owner, two LRU memos
  ↓
Swiss Ephemeris 2.10.03          102 × .se1, 94 MB, BBS 13201 … AD 17191
```

That pipeline is sound, and the audit's target architecture (its §E) is reached. The work
below does not change its shape. It adds two tiers the diagram has no room for — a
**provenance record** beside the engine, and a **snapshot store** between the engine and
the builders — and then lifts culture and content out of the middle.

### 1.2 Measured facts

| | |
|---|---|
| Python LOC (excl. worktrees/venv) | ~40k |
| HTTP endpoints | 84 |
| Files importing `swisseph` (non-test, non-script) | **4** — `engine/astronomy/{engine,jd_calendar,ut_instant}.py`, `services/startup.py` |
| Tests | 458 across 60 files |
| Golden data files | 1 — `tests/data/golden_astronomy_services.json` |
| Cache stores | 4 code paths + 146 MB on disk under `cache/` |
| Committed daily cache | `engine/data/panchanga.db`, 3.1 MB |
| Ephemeris payload | `data/ephemeris/`, 102 files, 94 MB |
| Largest engine file | `engine/vedic/interpretation.py`, 3,427 LOC |

### 1.3 The three tiers that exist, and the two that do not

**Exist and are healthy:** astronomy facts (`AstronomyEngine` + the six JD-keyed
services), panchanga derivation (`engine/vedic/*` builders), presentation
(`services/presentation/*`).

**Do not exist:**

- **Provenance.** Nothing records *which* ephemeris files, ΔT model, or ayanamsha
  configuration produced a stored value.
- **Snapshot.** Nothing stores raw astronomy. The cheapest-to-derive, most-expensive-to-
  compute layer is the one layer never persisted on its own.

Everything in §4 follows from those two absences.

---

## 2. Completed migrations — carried forward, not repeated

The audit records phases 0–5 in detail. Summarised only so this document stands alone:

| Phase | Outcome | Still true at `b6e02ce` |
|---|---|---|
| 0 | Twin-equivalence tests | yes — `tests/test_era_twin_equivalence.py` |
| 1 | One retrograde definition (`engine/astronomy/motion.py`) | yes, grep-guarded by `tests/test_motion.py` |
| 2 | JD-keyed services; `positions.py` + `swiss_eph.py` deleted | yes |
| 3 | All 8 era-twin builder pairs merged onto JD-native bodies | yes |
| 4 | Two-axis versioning (`services/payload_version.py`) | yes, `ASTRONOMY_VERSION = 3` |
| 5 | swisseph leaks closed, 4 sunrise entry points → 1, `anchor` field | yes |

Plus the era-surface widening that followed phase 5: all four eras on every era-aware
endpoint, year validation by **JD span against installed files** rather than a hardcoded
`1943..2090`.

**Four of the ten phases in the original brief were already satisfied by this work.** The
roadmap in §4 is what is left, re-sequenced by dependency rather than by the brief's
numbering.

---

## 3. Remaining weaknesses

Only weaknesses the audit did not already cover. Each is stated as an observable fact
with its file reference, then its consequence.

### W1 — `ObserverLocation` is missing a field the engine reads

`engine/astronomy/location.py:11` declares `lat, lon, timezone, name, city_id`.
`engine/astronomy/sun.py:239` reads:

```python
getattr(location, "altitude", None) or default_altitude(location.lat, location.lon)
```

The `getattr` is not defensive coding around an optional field — it reads a field that
**does not exist on the dataclass**, and always falls through to the estimator. So:

- Altitude is never caller-supplied. Every observer gets `default_altitude(lat, lon)`.
- Altitude is absent from `ObserverLocation.cache_key()`, which is
  `f"{lat:.4f}_{lon:.4f}_{timezone}"` — two observers at the same coordinates with
  different elevations are one cache entry.
- The horizon dip at `engine/astronomy/engine.py:89` (`-1.76·√h`) exists *specifically*
  because altitude changes rise/set. At Kathmandu's ~1400 m the dip is ~1.1 arcminutes of
  time-equivalent — non-trivial, and the audit's own cache-version log (entry 21) records
  a past bug in exactly this term. The physics is correct; the plumbing is guesswork.

Consequence: the most latitude/altitude-sensitive number the API publishes is derived
from a field the type system says is not there.

### W2 — Historical timezone modelling is Nepal-shaped

`engine/astronomy/timescale.py:92` hardcodes three Nepal civil eras (KMT ≤1919,
IST 1920–1985, NPT ≥1986). Everything else gets tzdata. Pre-1 CE gets the zone's
**modern standard offset**, applied silently — `engine/astronomy/engine.py:783`
(`_utc_offset_days`) probes `datetime(2000, 6, 15)` when the civil day cannot be
represented.

That approximation is correct in spirit and documented in the code. Two problems remain:

- It is a **special case, not a model.** A second location needing pre-tzdata treatment
  (Kolkata pre-1906, Lhasa, any BCE observer) has nowhere to declare it.
- It is **unlabelled in output.** A payload for 500 BCE does not say "civil offset is a
  modern-standard approximation". A consumer cannot distinguish it from a real one.

### W3 — ΔT is entirely implicit

`grep -rni 'deltat|delta_t|jd_et' engine/ services/` returns **zero hits**. Every call is
`swe.calc_ut`, so Swiss Ephemeris applies its own ΔT internally, unversioned and
unrecorded.

This is correct and invisible for modern dates. For the BCE range the engine now serves it
is the dominant unquantified error:

| Epoch | ΔT magnitude | Uncertainty (Morrison & Stephenson) | Effect on sunrise |
|---|---|---|---|
| 2000 CE | ~64 s | seconds | negligible |
| 1 CE | ~2.7 h | ± minutes | seconds |
| 1000 BCE | ~7.5 h | ± ~30 min | minutes |
| 3000 BCE | ~19 h | ± ~2 h | **tens of minutes** |

Sunrise error propagates directly into the udaya-tithi decision, and therefore into the
vara, the muhurta windows, and every festival date hanging off them. At 3000 BCE, a
±2 h ΔT uncertainty is capable of moving the anga boundary across sunrise. **These numbers
are indicative and must be re-derived against the shipped Swiss Ephemeris ΔT
implementation during Phase 3 — they are the reason for that phase, not its output.**

Reproducibility consequence: pyswisseph ships its ΔT model *inside the library*. A
`pip install -U pyswisseph` can change every BCE answer with no version bump anywhere in
this repo, and no way to detect it after the fact.

### W4 — Versioning records a counter, not the inputs

`services/payload_version.py` is well-built: two orthogonal axes, `compose()` monotonic in
both, guarded by `tests/test_payload_version.py`. Nothing there needs redesign. The gap is
what it *contains*.

`ASTRONOMY_VERSION = 3` is a hand-maintained integer. Given a cached row, the system
cannot answer:

- Which `.se1` files were installed? (`--extended` and `--far-ce` provisioning options
  exist — hosts genuinely differ.)
- Which pyswisseph / Swiss Ephemeris build? (2.10.03 today.)
- Which ayanamsha? (Five modes exposed: `lahiri, nepal, raman, kp, true_citra`.)
- Which ΔT model? (See W3 — currently unanswerable in principle.)
- Which correction constants? (`GAURISHANKAR_MERIDIAN = 86.25`,
  `REFERENCE_LATITUDE`, the `-1.76·√h` dip coefficient — all module-level literals.)

So "old calculations remain reproducible" is **currently false**, and it is false in the
one direction that matters: a silent dependency change is undetectable.

Related, smaller: `_cache_version` is stamped *inside* `payload_json`
(`services/panchanga_cache.py:281`, checked at `:289`), not as a column. Correct, but it
means invalidation and auditing require deserialising every row rather than one SQL
predicate. That becomes a real cost at 9.4M rows.

### W5 — The version changelog is prose in a comment block

`services/panchanga_cache.py` opens with ~40 numbered entries documenting every payload
change since version 7. It is genuinely excellent engineering discipline and should not be
deleted. It is also unreachable by code: it cannot be diffed against a cached row, served
to a client asking "why did this date change?", or used to decide whether a given store is
affected by a given fix.

### W6 — The snapshot tier does not exist

All four caches store **rendered, localised, festival-annotated payloads**. Consequences:

- A Nepali-text change, a festival-rule change, or a presentation tweak discards
  the ephemeris work — the most expensive part — along with the cheap part.
- The same JD computed for Kathmandu and Pokhara recomputes Sun/Moon/planet longitudes
  from scratch, though **those are location-independent** and `AstronomyEngine._calc` says
  so explicitly (`engine.py:179`). The in-process memo captures this within one request;
  nothing captures it across requests or across a batch job.
- Adding a second tradition (§4, Phase 7) multiplies the payload cache by the number of
  traditions, because the tradition is baked into the stored artifact.

This is the structural blocker for offline mobile, for multi-tradition, and for any
precomputation at historical scale. It is the largest single item in this roadmap.

### W7 — Golden tests validate against former selves

458 tests is strong coverage, and the era-twin and payload-version suites are exactly the
right kind of guard. But `tests/data/golden_astronomy_services.json` was captured **from
the pre-refactor modules** (audit §F, phase 2b). It pins drift, not correctness.

The audit's own record is the argument: four live bugs, every one found by migration
scaffolding, **none by the test suite** — because the suite agreed with the bug.

External comparisons exist only as prose in code comments (e.g. the Drik mean-node
verification at `engine/astronomy/engine.py:126`, the horizon-dip reasoning at `:89`).
Valuable, unexecutable.

No golden set exists for: sankranti instants, eclipse contact times, the ayanamsha curve
over the precession cycle, or published Nepali patro sunrise tables.

### W8 — Culture is welded to computation

- `engine/vedic/sait_rules.py` (614 LOC) encodes Nepali muhurta convention inline —
  its docstring says so ("conservative and traditionally defensible").
- `engine/vedic/muhurta_engine.py:548` already swaps a nakshatra allow-list "for a named
  tradition mode" — **the only precedent in the tree**, and the right shape. It has not
  been generalised.
- `rules/engine.py` is a festival matcher over JSON ("no DSL, no v4 catalog"), not a
  tradition layer.
- No Ekadashi Smarta/Vaishnava split exists anywhere.

Adding a tradition today means editing calculation code — the failure mode the engineering
rules explicitly forbid.

### W9 — Precomputation does not extrapolate

`scripts/precompute_panchanga.py` walks `datetime.date` objects, per-city, per-year,
producing full payloads. It works for the shipped surface (a handful of BS years across
`POPULAR_CITY_IDS`). Against the stated target it does not: **~9.4M days × N locations ×
full-payload cost**, with the location-independent astronomy recomputed for every location.

### W10 — Content sits inside the calculation engine

`engine/vedic/interpretation.py` is 3,427 LOC of bilingual interpretive prose — the single
largest file in the tree, inside the engine package. Not a correctness risk. A hard blocker
for shipping a small offline engine to mobile, and for adding a third language without
touching calculation code.

---

## 4. Implementation roadmap

Ten phases, sequenced by **dependency**, with the brief's phase numbers preserved. Two
deliberate deviations from the brief's ordering, both stated with reasons in §4.11.

Each phase is independently shippable and independently revertible.

### Phase 0 — This document
**Status: complete.** No code changed.

### Phase 1 — Observer model hardening
*Fixes W1, opens W2.*

Make `ObserverLocation` carry `id, name, latitude, longitude, altitude, timezone,
timezone_history`. Delete the `getattr` hole. Extend `cache_key()` to include altitude.
Generalise the Nepal timezone-era table into a `timezone_history` structure that Nepal is
one instance of.

**Invariant to establish and then never violate:** astronomy consumes
`(latitude, longitude, altitude, UT)`; civil display consumes `timezone`. The current code
mostly honours this; Phase 1 makes it structural rather than customary.

Backward compatibility: `altitude` defaults to `default_altitude(lat, lon)` — the value
every caller gets today — so behaviour is unchanged for every existing call. `lat`/`lon`
stay as accessor names alongside the fuller `latitude`/`longitude`.

**Files:** `engine/astronomy/location.py`, `sun.py:239`, `moon.py:24`, `timescale.py`,
`services/panchanga_cache.py` (cache key + version bump), new `tests/test_observer_model.py`.

**Risk: low.** Additive, but the cache-key change forces one cold rebuild.

### Phase 2 — Calculation provenance
*Fixes W4, W5. Depends on Phase 1 (the observer is part of what gets recorded).*

A `CalculationProvenance` value object carrying: engine version, Swiss Ephemeris version,
installed `.se1` file set, ayanamsha configuration, ΔT model identifier (a placeholder
until Phase 3 makes it real), correction constants, algorithm versions. Hashed to a stable
`provenance_hash`.

`payload_version.compose()` keeps its two axes and its monotonicity guarantee — the
provenance hash rides alongside, it does not replace them. The comment changelog (W5) is
lifted into a machine-readable registry with the prose preserved as its `description`
field.

**Must land before Phase 8.** Precomputing millions of rows whose provenance is
unrecoverable is worse than not precomputing them.

**Files:** `services/payload_version.py`, `engine/astronomy/engine.py`,
`engine/vedic/patro_year_axis.py:46`, `services/panchanga_cache.py`,
`tests/test_payload_version.py`.

**Risk: low.** Additive metadata; no computed value changes.

### Phase 3 — Explicit ΔT
*Fixes W3. Depends on Phase 2 (ΔT is a provenance field).*

Investigation and design first, per the brief. Document which ΔT model Swiss Ephemeris
2.10.03 actually applies, how it switches across epochs, and the measured accuracy
envelope — re-deriving the indicative table in W3 against the shipped implementation.
Then a `DeltaTProvider` seam (`ModernDeltaT` / `HistoricalDeltaT` / `CustomDeltaT`) with
the default provider delegating to Swiss Ephemeris, so **no current answer changes**.

Output includes a published uncertainty envelope for BCE results. A calendar engine that
serves 3000 BCE without stating its error bars is not scientifically honest, whatever its
internals look like.

**Risk: low if the default stays delegating; high the moment it does not.** The seam is
the deliverable; a different model is a separate, versioned decision.

### Phase 4 — Astronomical snapshot layer
*Fixes W6. Depends on Phases 1–3 (key = observer; identity = provenance).*

`AstronomicalSnapshot`, keyed `(jd_ut, observer_id, provenance_hash)`, storing raw
astronomy only: sun/moon/planet longitudes, sunrise, sunset, moonrise, moonset, ayanamsha.

**Strictly no** tithi, festival, muhurta, or interpretation. That boundary is the whole
point, and it is the one the existing `engine/astronomy/panchanga.py` misfiling (audit
context; addressed in Phase 9) should not be allowed to blur.

Immutable, versioned by provenance hash, reproducible.

**Design note worth settling early:** location-independent facts (planet longitudes) and
location-dependent facts (rise/set, ayanamsha is neither) have different cardinality. A
single flat table stores each planet longitude once per observer. Splitting the store
along that seam is what makes Phase 8 tractable — decide it in Phase 4, not in Phase 8.

**Risk: medium-high.** The largest change in this roadmap.

### Phase 5 — Cache architecture on snapshots
*Depends on Phase 4.*

Retarget the derivation pipeline: snapshot → panchanga derivation → rule engine →
presentation. Existing payload caches become the *last* tier rather than the only one.

Existing API responses must be byte-identical. The audit's twin-equivalence approach — a
before/after payload snapshot across bs/ad/bce, zero diffs — is the verification method,
and it worked for eight builder merges.

**Risk: medium.** High blast radius, but mechanical if Phase 4's boundary is clean.

### Phase 6 — Scientific golden tests
*Fixes W7. Should ideally precede Phase 7.*

`tests/golden/`, separate from the regression suite, validating against **external**
authority: sunrise/sunset tables, sankranti instants, eclipse contact times, ayanamsha
values across the precession cycle, tithi boundaries.

Each golden case records its source and its tolerance. A test that cannot state where its
expected value came from is a regression test wearing a lab coat.

**Risk: low. Highest value-per-unit-effort in this roadmap** — and the only phase that can
find an error the current suite is structurally blind to.

### Phase 7 — Tradition rule engine
*Fixes W8. Depends on Phase 6.*

Three questions, three layers:

| Layer | Question |
|---|---|
| Astronomy | What happened in the sky? |
| Panchanga | What astronomical category does that produce? |
| Tradition | How does a community interpret it? |

Extract Nepali rules, festival rules, sait rules and Ekadashi rules into declarative sets.
Generalise the `muhurta_engine.py:548` precedent. Nepal becomes the default tradition, not
the hardcoded one — and its output must be unchanged, which is what Phase 6 exists to prove.

**Risk: medium.** Extraction is only safe with external truth tests underneath, hence the
ordering.

### Phase 8 — Precomputation pipeline
*Fixes W9. Depends on Phases 1, 2, 4.*

Worker pipeline over **snapshots**, not payloads: JD range → snapshots → derived panchanga
→ caches. Exploits Phase 4's cardinality split so location-independent astronomy is
computed once and shared.

**Risk: medium.** Mostly operational once the tiers below it are right.

### Phase 9 — Package cleanup
*Deliberately late, per the brief.*

`engine/astronomy/{panchanga,rashi,lagna}.py` → `engine/panchanga/`, with compatibility
imports. Pure `git mv` plus shims; no behaviour change.

**Risk: low, and lower still after Phase 5** — which will have rewritten most of the
affected call sites anyway.

### Phase 10 — Content separation
*Fixes W10. Independent of Phases 1–9 — schedulable whenever convenient.*

Lift `engine/vedic/interpretation.py`'s explanations, descriptions and translations out of
the calculation core. Prepares mobile, offline packages, and additional languages.

**Risk: low.** Large diff, near-zero logic.

### 4.11 Two deviations from the brief's ordering

1. **Phase 6 (golden tests) should land before Phase 7 (traditions).** Extracting cultural
   rules from calculation code is exactly the refactor most likely to change an answer
   invisibly. Self-referential tests will not catch it, because they were captured from
   the code being changed. If the two must overlap, the golden cases for the specific
   rules being extracted must land first.

2. **Phase 2 (provenance) must precede Phase 8 (precomputation), not merely be listed
   before it.** Millions of unattributable rows are a liability, not an asset — they
   cannot be selectively invalidated when a dependency shifts, so the only remedy is
   discarding all of them.

Phases 9 and 10 are correctly placed late and are the safest work in the document; they
are good filler when a larger phase is blocked on review.

---

## 5. Risks

### 5.1 Programme risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Phase 4 leaks derived data into the snapshot.** One "just add tithi, it's cheap" and the tier is worth nothing. | high | high | Schema-level prohibition + a grep-guard test, exactly as `tests/test_motion.py` guards against a sixth retrograde copy |
| R2 | **Phase 5 changes a published value silently.** Retargeting every cache is the highest-blast-radius change here. | medium | high | Before/after payload diff across bs/ad/bce, zero-diff gate — the method that carried eight builder merges in the prior migration |
| R3 | **Phase 7 shifts Nepali output while "only extracting".** | medium | high | Phase 6 first, non-negotiable |
| R4 | **Provenance ossifies.** A `CalculationProvenance` nobody updates is worse than a counter, because it looks authoritative. | medium | medium | Derive every field mechanically — read the `.se1` directory, read `swe.version` — never hand-maintain |
| R5 | **Scope creep into features.** Ten phases of architecture is a long time without user-visible output. | high | medium | Engineering rule 2. Each phase ships alone; none requires the next to be useful |
| R6 | **Storage growth.** Snapshots + payload caches, at 9.4M-day ambitions, against 146 MB of payload cache today. | medium | medium | Settle retention and the location-independent split in Phase 4's design, before writing rows |
| R7 | **BCE accuracy claims outrun the physics.** The engine will happily serve 3000 BCE to arcsecond-looking precision that ΔT uncertainty does not support. | high | high | Phase 3 must publish the envelope, and the payload must carry it |

### 5.2 What this roadmap deliberately does not do

Carried forward from the audit's "what not to do" (§G), still binding:

- No new memo layer on the services — `AstronomyEngine`'s two caches are tuned.
- No moving `swisseph` calls — they are correctly placed, in four files.
- No rewriting `api/*` — handlers shrink on their own as tiers land.
- No deleting `CivilDay` — it is the correct proleptic representation.
- No touching `services/holiday_generator.py` for consistency reasons — it already reuses
  `get_udaya_tithi`.

Added here:

- **No re-running the audit's phases 1–5.** They are done. Re-doing them is churn against
  a tested, documented, recently-migrated tree.
- **No changing a computed value except in Phase 3**, and there only behind an explicit,
  versioned, documented decision — never as a side effect of restructuring.

### 5.3 Pre-flight

The working tree at the time of writing carries uncommitted changes to
`engine/vedic/solar_corrections.py`, `services/panchanga_cache.py` and
`tests/test_solar_corrections.py` (+80/−8). These must land or be stashed before Phase 1
touches `panchanga_cache.py`.

---

## 6. Expected impact

### 6.1 Per phase

| Phase | Correctness | Reproducibility | Performance | Extensibility | Files |
|---|---|---|---|---|---|
| 1 Observer | altitude becomes real, not estimated | — | — | historical tz becomes modellable | ~6 |
| 2 Provenance | — | **the core win** | — | — | ~5 |
| 3 ΔT | BCE error bars become known and published | ΔT becomes a recorded input | — | alternative models become possible | ~4 + design doc |
| 4 Snapshot | — | snapshots are immutable and attributable | foundation for all of it | multi-tradition becomes affordable | ~8 new |
| 5 Cache rebuild | — | — | **content changes stop discarding astronomy** | derivation becomes swappable | ~15 |
| 6 Golden tests | **only phase that can find an unknown error** | — | — | safety net for 7 | ~10 new |
| 7 Traditions | — | — | — | **Smarta / Vaishnava / Drik become configuration** | ~12 |
| 8 Pipeline | — | — | **historical scale becomes reachable** | — | ~6 |
| 9 Packages | — | — | — | honest module boundaries | ~20 (mechanical) |
| 10 Content | — | — | smaller engine bundle | mobile offline; more languages | ~5 |

### 6.2 Against the stated capability targets

| Target | Today | After |
|---|---|---|
| Modern Nepali Panchanga | **working, and the reference implementation** | unchanged — this is the compatibility constraint, not a goal |
| BCE calculations | compute correctly; accuracy unquantified | quantified and published (Phase 3) |
| 25,772-year precession cycle | reachable per-request; not storable | precomputable and attributable (4, 8) |
| Web API | 84 endpoints, healthy | faster on the derivation path (5) |
| iOS/Android offline | blocked — engine and content are one tree | unblocked (4, 10) |
| Historical reproducibility | **not achievable** — a silent dependency bump is undetectable | achievable (2, 3) |
| Multiple Vedic traditions | requires editing calculation code | configuration (7) |

### 6.3 The single most valuable change

**Phase 6.** Everything else improves structure — reproducibility, scale, extensibility —
and structure is worth real money here. But the audit's own record is decisive: four live
bugs, all found by migration scaffolding, none by 458 tests, because the tests were
captured from the code that had the bugs.

Until external truth tests exist, every other phase is a refactor whose correctness is
argued rather than demonstrated. Phase 6 is late in the dependency order because Phases 1–5
change what there is to test. It should not be later than that.

---

## 7. Next action

Phase 1 — observer model hardening. Files listed in §4, Phase 1. Awaiting approval.
