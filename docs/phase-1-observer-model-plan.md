# Phase 1 — Observer model hardening: implementation plan

**Status: plan only. No code written. Awaiting approval.**

Companion to [`architecture-roadmap.md`](architecture-roadmap.md) §4 Phase 1, which this
document supersedes in detail. Target: `main @ b6e02ce`.

> **Read §0 first.** Investigation changed the premise of this phase in two ways that
> affect scope, risk, and one of the stated success criteria. I recommend narrowing Phase 1
> and deferring two of the seven proposed fields.

---

## 0. What investigation changed

### 0.1 Altitude is not "estimated" — it is deliberately, validatedly zero

The roadmap's W1 said altitude "always falls through to the estimator" and implied the
estimator was a weakness. Reading `engine/astronomy/sun.py:46`:

```python
def default_altitude(latitude: float, longitude: float) -> float:
    """Observer altitude when the caller didn't supply one.
    Sea level everywhere. ..."""
    return 0.0
```

It returns **0.0 unconditionally**, and the docstring explains why: feeding Kathmandu's real
1400 m produced a ~1.1° geometric horizon dip that moved sunrise ~7 min early and sunset
~7 min late — a flat 14h00m day. The valley's true horizon is the surrounding hills, which
sit *above* the astronomical horizon, so the sea-cliff dip is unphysical there. Sea level is
what matches published Nepali panchang.

This is pinned by four existing tests in `tests/test_horizon_dip.py`, including one that
verifies the opt-in path still reproduces Drik Panchang's 06:32/17:09 when a caller *does*
pass `altitude=1400.0`.

**Three consequences:**

1. **Phase 1 becomes a provable no-op.** Every observer's altitude is `0.0` today. Declaring
   a field that defaults to `0.0` cannot change a single computed value. This is the
   strongest possible position for a "no behaviour change" phase, and it should be stated as
   a test, not a hope.
2. **Two corrections to the roadmap are needed** (§9). W1's framing was wrong, and its
   arcminute figure should read ~1.1 **degrees**.
3. **`ALT_KATHMANDU = 1400.0` at `sun.py:43` is dead** — defined, referenced nowhere. It is
   a loaded gun: the next reader will wire it into `default_altitude` and silently regress
   sunrise by 7 minutes. Phase 1 should address it (§2).

### 0.2 Adding altitude to `cache_key()` would be pure cost

`ObserverLocation.cache_key()` is `f"{lat:.4f}_{lon:.4f}_{timezone}"`. It reaches **33 call
sites**, most of which are *disk cache filenames* (`festivals_cache_path`,
`sait_cache_path`, `bs_cache_path`, …). Changing its format orphans the 146 MB under
`cache/`.

Since altitude is a **constant 0.0** for every observer, adding it unconditionally would:

- orphan 146 MB of cache and force a full cold rebuild,
- add **zero** discriminating power (a constant cannot distinguish anything),
- and force a `PANCHANGA_PAYLOAD_VERSION` bump for a change that alters no value.

The correct design is a **conditional suffix**: append altitude only when it differs from
the default. Every key produced today stays byte-identical; explicit altitudes get their own
bucket the moment anyone supplies one. This is strictly more correct than the unconditional
version *and* costs nothing.

**I therefore recommend against two items in the brief:** "update cache keys" (as an
unconditional format change) and "cache version updated correctly" (as a bump). Neither is
needed, and doing them would be a self-inflicted cold rebuild. Detail in §5.

---

## 1. Objective

### What Phase 1 accomplishes

Make observer altitude an **explicit, typed, first-class field** on `ObserverLocation`,
delete the `getattr` that reads a field the dataclass does not declare, and make the cache
key correct for the case where altitude stops being constant.

Nothing else. No calculation changes, no payload changes, no cache invalidation.

### Why it is needed

`engine/astronomy/sun.py:239` reads:

```python
getattr(location, "altitude", None) or default_altitude(location.lat, location.lon)
```

This is not defensive coding around an optional field. `ObserverLocation`
(`engine/astronomy/location.py:11`) declares `lat, lon, timezone, name, city_id` — there is
**no `altitude` attribute at all**. The `getattr` always misses and always falls through.

So the type system asserts that observers have no altitude, while the rise/set path — the
most elevation-sensitive number the API publishes — reads one anyway. The two statements
cannot both be right.

### What architectural problem it solves

Three, in order of importance:

1. **A silent contract violation.** A `getattr` with a default is invisible to type checkers,
   IDEs, and readers. It is a private protocol between two files that the shared type does
   not describe. Any refactor that trusts the dataclass is working from a false model.
2. **An unreachable capability.** `AstronomyEngine` supports per-observer altitude
   end-to-end (`_horizon_dip_degrees` at `engine.py:89`, threaded through every rise/set
   entry point, verified against Drik Panchang by `test_horizon_dip.py`). The *only* thing
   that cannot express it is `ObserverLocation` — so the capability exists but no API caller
   can reach it.
3. **The Phase 4 blocker.** `AstronomicalSnapshot` is keyed by `observer_id`. An observer
   identity that omits a field the astronomy consumes would produce snapshots that collide
   across physically different observers. Phase 1 is the cheapest possible time to fix this
   — before anything is stored.

### What it explicitly does not do

- Does **not** change any computed value.
- Does **not** wire real elevations from GeoNames. (`services/cities_db.py:635` has no
  elevation column — there is no data source, and §0.1 shows doing so would be a
  *regression*, not an improvement.)
- Does **not** add `timezone_history` (§3.4 — recommended deferral).
- Does **not** add an opaque `id` (§3.5 — recommended deferral).
- Does **not** rename `lat`/`lon` to `latitude`/`longitude` (§3.6 — recommended against).

---

## 2. Files to change

### 2.1 Changed

| # | File | Why | Size | Risk | API compat |
|---|---|---|---|---|---|
| 1 | `engine/astronomy/location.py` | Add `altitude: float = 0.0` to the frozen dataclass (**appended last**, §7 R3). Conditional altitude suffix in `cache_key()`. `as_dict()` **unchanged** (§4.2). Thread `altitude` through `resolve_location` and `resolve_location_from_query`. | ~+25 / −2 | **low** | none |
| 2 | `engine/astronomy/sun.py` | Delete the `getattr` at `:239`; read `location.altitude`. Delete the dead `ALT_KATHMANDU` at `:43`, or annotate it as a documented opt-in reference constant. Keep `default_altitude()` — it is the resolver for callers holding bare floats, and 12 call sites use it. | ~+3 / −4 | **low** | none |
| 3 | `services/panchanga_cache.py` | `resolve_cache_keys()` — the near-Kathmandu snap at `:198` compares lat/lon/timezone and collapses to `city:1283240`. It must not collapse observers with different altitudes. One added condition. **No version bump** (§5.4). | ~+3 | **low** | none |
| 4 | `tests/test_observer_model.py` | **New.** The no-op proof plus field semantics (§6.1). | ~+140 | none | none |
| 5 | `tests/test_horizon_dip.py` | **Additive only.** New case: an `ObserverLocation` with explicit altitude reaches the dip, matching the existing bare-float case. Existing four cases untouched. | ~+20 | none | none |
| 6 | `docs/architecture-roadmap.md` | Correct W1 (§9). Non-negotiable — the roadmap currently states something investigation disproved. | ~+8 / −6 | none | none |

**Six files. Roughly +200 / −12 lines, of which ~160 are tests.** The production delta is
about 30 lines. That is the correct size for this phase, and its smallness is the evidence
that the existing architecture is sound.

### 2.2 Reviewed and intentionally left unchanged

| File / group | Why unchanged |
|---|---|
| `engine/astronomy/engine.py` | Already takes `alt: float` on every rise/set entry point and applies `_horizon_dip_degrees`. The engine was never the problem. |
| `engine/astronomy/moon.py` | Uses `default_altitude` with bare floats (`:71`, `:85`, `:99`, `:111`) — no `ObserverLocation` in scope. Correct as-is. |
| `engine/astronomy/timescale.py` | Would only change if `timezone_history` were added. Recommended deferred (§3.4). |
| `services/cities_db.py` | No elevation column; adding one is a data-import project and, per §0.1, not desirable anyway. |
| **35 `as_dict()` call sites** (`api/kundali.py`, `api/panchanga.py:1085`, `services/panchanga_api.py` ×7, `engine/vedic/*` ×10, …) | Untouched **because** `as_dict()` is unchanged. This is the single decision that keeps "existing API responses remain unchanged" literally true (§4.2). |
| **33 `cache_key()` call sites** (`services/holiday_generator.py` ×14, `sait_generator.py`, `startup.py`, `patro_generator.py`, …) | Untouched **because** the conditional suffix leaves every key produced today byte-identical (§5.1). |
| ~70 files importing `ObserverLocation` / `DEFAULT_LOCATION` / `resolve_location` | A trailing field with a default is transparent to all of them. Verified: **every** construction site uses keyword arguments (§7 R3). |
| `services/{response_cache,year_cache,blob_db_cache,sait_db_cache,kundali_report_cache}.py` | All key off `resolve_cache_keys` or `cache_key()`. Unchanged by construction. |
| `api/deps.py` | `location_params` exposes `lat/lon/timezone/city/city_id`. Adding an `altitude` query parameter is a **product** decision and new API surface — out of scope. |
| `engine/vedic/solar_corrections.py` | Has an `akshamsha` (latitude-correction) concept that reads adjacent to altitude but is unrelated — a display correction on the Gaurishankar meridian. Currently dirty in the working tree (§4.6). |

---

## 3. Data model changes

### 3.1 Proposed model

```
ObserverLocation (frozen dataclass)

  lat        float   = 27.7172           existing, unchanged
  lon        float   = 85.3240           existing, unchanged
  timezone   str     = "Asia/Kathmandu"  existing, unchanged
  name       str     = "Kathmandu"       existing, unchanged
  city_id    int|None= None              existing, unchanged
  altitude   float   = 0.0               NEW — appended last
```

One field added. Field order matters (§7 R3): appended last so positional construction
cannot break.

### 3.2 Field semantics

| Field | Required | Default | Validation | Serialization | Layer |
|---|---|---|---|---|---|
| `lat` | no | `27.7172` | −90 ≤ lat ≤ 90, in `resolve_location` | in `as_dict()` | **astronomy** |
| `lon` | no | `85.3240` | −180 ≤ lon ≤ 180 | in `as_dict()` | **astronomy** |
| `altitude` | no | `0.0` | ≥ −500 (Dead Sea ≈ −430 m); no upper bound — the dip formula is monotonic and a caller wanting an aircraft-horizon result should get one | **not in `as_dict()`** (§4.2) | **astronomy** |
| `timezone` | no | `"Asia/Kathmandu"` | resolvable by `zoneinfo`, via `normalize_observer_timezone` | in `as_dict()` | **civil display** |
| `name` | no | `"Kathmandu"` | none | in `as_dict()` | display |
| `city_id` | no | `None` | none | in `as_dict()` when not `None` | identity |

### 3.3 The layering invariant

The brief's central rule — *astronomy uses `(latitude, longitude, altitude, UT)`; civil
display uses `timezone`; never mix* — is **already honoured** and Phase 1 must not weaken it.

Verified: `AstronomyEngine._rise_set` passes `(lon, lat, alt)` as `geopos` to
`rise_trans_true_hor`; `timezone` is used **only** to pick the local-midnight search anchor
(`engine.py:768`, `:839`) — a search-window choice, not a physical input. That is the correct
use and the one legitimate crossing point, and it is documented in place.

Phase 1 adds one line of enforcement value: `altitude` sits with `lat`/`lon` in the
astronomy group, and — per §4.2 — is deliberately absent from `as_dict()`, which is the
*display* projection. The grouping is expressed in the docstring; there is no runtime
partition, and adding one would be an unnecessary abstraction.

### 3.4 Recommendation: **defer `timezone_history`**

The brief lists it. I recommend against adding it in Phase 1, for four reasons:

1. **Zero consumers.** Nothing would read it. A field nobody reads is worse than no field —
   it gets populated inconsistently, then trusted.
2. **Wrong owner.** Timezone history is a property of a **zone**, not of an **observer**.
   `Asia/Kathmandu`'s KMT/IST/NPT eras are identical for every observer in that zone.
   Hanging it on the observer duplicates one table across every constructed location and
   creates the possibility of two observers in one zone disagreeing about history.
3. **The right home already exists.** `engine/astronomy/timescale.py:92`
   (`nepal_timezone_era`) *is* a zone-keyed history registry. It is Nepal-only. The real
   work is generalising that registry — a change to `timescale.py`, not to
   `ObserverLocation`.
4. **It belongs with Phase 3.** Historical civil offsets and ΔT are the same problem —
   "what time was it, really, at this instant in the past". Phase 3 already opens
   `timescale.py`. Doing it there costs one file-open instead of two, and lands with the
   uncertainty-envelope work that gives it meaning.

**If you want it in Phase 1 regardless:** the minimal safe form is a read-only
`timezone_history` *property* that delegates to a generalised `timescale` registry, storing
no state on the dataclass. That keeps the single source of truth in `timescale.py` and adds
~15 lines. I would still rather defer it, but this form is not harmful.

### 3.5 Recommendation: **defer the opaque `id`**

`city_id` already exists, and `resolve_cache_keys()`
(`services/panchanga_cache.py:193`) is already the identity function — it returns
`city:<id>` for city-resolved observers, snaps near-Kathmandu coordinates to
`city:1283240`, and falls back to `cache_key()` for raw coordinates.

Adding a second `id` alongside `city_id` creates two identity fields with unclear
precedence. The genuine need for a stable `observer_id` arrives in **Phase 4**, where it is
a snapshot primary key — and Phase 4 should formalise it by promoting `resolve_cache_keys`,
not by adding a field now that Phase 4 may have to redefine.

### 3.6 Recommendation: **do not rename `lat`/`lon` → `latitude`/`longitude`**

The brief's model spells them out in full. Renaming touches ~70 files for zero behavioural
or architectural benefit. Adding properties as aliases is cheaper but leaves two names for
one concept — precisely the "unnecessary abstraction" the engineering rules forbid, and a
future reader will not know which is canonical.

`lat`/`lon` are unambiguous, universal in geospatial code, and already consistent across the
entire tree. **Recommend: keep them.** If the long names are wanted, that is a mechanical
rename best done as its own commit in Phase 9 (package cleanup), where mass renames are
already the theme.

---

## 4. Migration plan

### 4.1 Existing constructors

**No migration needed.** `altitude` is appended last with a default, and **every**
construction site in the tree uses keyword arguments — verified across all 22 sites:

- `engine/astronomy/location.py:33` (`DEFAULT_LOCATION`), `:80`, `:153`
- 19 test sites in `test_kundali_detail.py` (×12), `test_upagraha.py` (×2),
  `test_nivas_shool.py:75`, `test_solar_corrections.py:111`, `test_nepal_patro_sun.py:65,68`,
  `test_computation_services.py:390`

Zero positional calls. Appending is safe on two independent grounds.

### 4.2 API compatibility — the decision that matters

`as_dict()` is called at **35 sites**, and at essentially all of them the result is emitted
as `"location": {...}` in a **public API payload** (`api/panchanga.py:1085`,
`api/kundali.py` ×4, `services/panchanga_api.py` ×7, `engine/vedic/graha_detail.py` ×4,
`gochar.py` ×3, and more).

**Adding `altitude` to `as_dict()` changes 35 public API responses.**

Additive JSON fields are usually benign, but the stated success criterion is *"existing API
responses remain unchanged"*, and it would also change every payload that gets **cached** —
which means either accepting mixed-shape cache rows or bumping the version and paying a cold
rebuild for a cosmetic field.

**Recommendation: leave `as_dict()` unchanged in Phase 1.**

- Success criterion 3 becomes literally, verifiably true.
- No cache-shape divergence, no version bump.
- `altitude` is an *astronomy* input; `as_dict()` is the *display* projection (§3.3).
  Omitting it is consistent with the layering rule, not a shortcut around it.
- Publishing it is a one-line, low-risk follow-up **at the moment it becomes non-constant**
  — i.e. when it can actually tell a consumer something.

Publishing a field that is `0.0` in 100% of responses is noise, not information.

### 4.3 Old serialized objects

**No exposure.** `ObserverLocation` is never serialized as an object and never reconstructed
from one — verified: no `ObserverLocation(**...)`, no `from_dict`, no pickling. Caches store
the *output* of `as_dict()` inside payload JSON, and nothing parses it back. Since `as_dict()`
is unchanged, stored payloads remain valid.

### 4.4 Database compatibility

**No schema change.**

- `panchanga_cache` (`services/panchanga_cache.py:139`) keys on `(location_key, date)`.
  `location_key` comes from `resolve_cache_keys()`, whose output is unchanged for every
  observer constructible today (§5.1).
- `cities` (`services/cities_db.py:635`) is untouched — no elevation column added.
- Blob / sait / kundali-report stores all key off the same helpers.

### 4.5 Cache compatibility

Covered in §5. Summary: **zero invalidation, zero cold rebuild.**

### 4.6 Pre-flight

The working tree has uncommitted changes to `engine/vedic/solar_corrections.py`,
`services/panchanga_cache.py`, `tests/test_solar_corrections.py` (+80/−8). Phase 1 modifies
`panchanga_cache.py` and the test file constructs an `ObserverLocation` at `:111`. **These
must land or be stashed before commit 1.**

### 4.7 Rollback

Each commit (§8) is an independent `git revert` with no data migration to unwind:

| Commit | Rollback |
|---|---|
| 1 (field) | revert; the field vanishes, `getattr` is not yet removed, nothing read it |
| 2 (`getattr`) | revert; `sun.py` returns to `getattr` — which still works, since commit 1's field is only *read* here |
| 3 (cache key) | revert; keys were byte-identical either way, so no cache is orphaned in either direction |
| 4–5 (tests) | revert freely |

**No irreversible step exists in this phase.** No cache is invalidated, no schema migrated,
no payload reshaped. Worst case is a full revert to `b6e02ce` with no residue — which is
itself an argument for the narrow scope.

---

## 5. Cache impact

### 5.1 Cache keys

Current: `cache_key()` → `f"{lat:.4f}_{lon:.4f}_{timezone}"`.

Proposed: append `_alt{altitude:.1f}` **only when** `altitude != 0.0`.

| Observer | Key today | Key after | Same? |
|---|---|---|---|
| `DEFAULT_LOCATION` | `27.7172_85.3240_Asia/Kathmandu` | identical | ✅ |
| Any city-resolved | `city:1283240` (never reaches `cache_key`) | identical | ✅ |
| Raw lat/lon, no altitude | `26.5833_88.0667_Asia/Kathmandu` | identical | ✅ |
| Raw lat/lon, `altitude=1400` | *not expressible today* | `…_alt1400.0` | new bucket |

**Every key producible today is byte-identical after the change.** The new form is reachable
only by a caller passing an altitude, which no code path does yet.

Two further reasons the blast radius is smaller than the 33 call sites suggest:

- `resolve_cache_keys()` returns `city:<id>` for any observer with a `city_id`, so
  `cache_key()` is never consulted on that path.
- `SNAP_TO_NEAREST_CITY` defaults to **on** (`location.py:39`), so most raw GPS input is
  snapped to a city id upstream and also never reaches `cache_key()`.

### 5.2 The near-Kathmandu snap

`resolve_cache_keys()` (`panchanga_cache.py:198`) collapses any observer within 0.02° of
Kathmandu, on the same timezone, to `city:1283240`. That must not swallow altitude: an
observer at Kathmandu's coordinates with `altitude=1400` is physically different (sunrise
differs by ~7 min per `test_horizon_dip.py`) and must not share Kathmandu's cache row.

Adding `and location.altitude == DEFAULT_LOCATION.altitude` to the condition preserves
today's behaviour exactly (both are `0.0`) while closing the future hole. **This is the one
genuine correctness fix in the phase**, and it is three lines.

### 5.3 Invalidation

**None required.** No key changes, no payload shape changes, no computed value changes.

### 5.4 Payload version

**Recommend: no bump.** `PANCHANGA_PAYLOAD_VERSION` stays at `40`; `ASTRONOMY_VERSION` stays
at `3`.

`payload_version.py` states the rule precisely: `ASTRONOMY_VERSION` bumps "when
`engine/astronomy` changes a **computed value**." Phase 1 changes no computed value —
`default_altitude()` returned `0.0` before and the field defaults to `0.0` after. Bumping
would orphan 146 MB of disk cache, the committed 3.1 MB `panchanga.db`, the blob store, and
force a CDN purge — to invalidate payloads that are **bit-identical** to their replacements.

This directly contradicts success criterion 4 ("cache version updated correctly"). I read
"correctly" as *correct for the change*, and for this change correct means **unchanged**. If
you prefer a bump for auditability, say so and I will add it — but it buys nothing and costs
a full cold rebuild across four stores plus an edge purge.

### 5.5 Expected cache misses

**Zero.** Every existing row remains addressable by an identical key and passes
`_payload_cache_valid()` unchanged (that check inspects payload structure — `lagna_spans`
length 12, `hora` ≥ 24, etc. — none of which Phase 1 touches).

Migration cost: **zero rebuild time, zero storage delta.**

---

## 6. Test plan

### 6.1 New — `tests/test_observer_model.py` (~10 tests)

**Unit — field semantics**
1. `altitude` defaults to `0.0` on `ObserverLocation()` and on `DEFAULT_LOCATION`.
2. `altitude` is settable and survives the frozen dataclass round-trip.
3. `resolve_location(altitude=...)` propagates; omitted → `0.0`.
4. `resolve_location_from_query` propagates altitude alongside a city lookup.
5. Validation: altitude below −500 raises `ValueError`; large positive values are accepted.

**Backward compatibility**
6. **`as_dict()` output is exactly the pre-change key set** — `{lat, lon, timezone, name}`
   plus `city_id` when set. Explicitly asserts `"altitude" not in payload`. *This test is
   the guard for API criterion 3 and for the §4.2 decision. It should fail loudly if anyone
   later adds the field without deciding to.*
7. `cache_key()` is byte-identical to the pre-change format when `altitude == 0.0` — pinned
   against a hardcoded literal string, not a recomputation.
8. `cache_key()` gains a distinct suffix when altitude is non-zero, and two observers
   differing only in altitude produce different keys.

**Integration — cache routing**
9. `resolve_cache_keys()` returns `city:1283240` for a near-Kathmandu sea-level observer
   (unchanged), and does **not** for the same coordinates with `altitude=1400`.
10. Two `ObserverLocation`s differing only in altitude do not collide in `panchanga_cache`.

### 6.2 The no-op proof — the most important test in the phase

**Regression:** for a fixed set of dates (one modern, one pre-1943, one BCE) at
`DEFAULT_LOCATION`, `build_daily_panchanga` output is **identical** before and after.

Implementation: capture a payload snapshot from `b6e02ce` into `tests/data/`, then assert
equality post-change. This is the same before/after zero-diff method that carried the audit's
eight builder merges, and it is what converts "should be a no-op" into "is a no-op."

Sunrise/sunset are the sensitive fields; if the altitude plumbing is wrong they move by
~7 minutes, which is unmissable.

### 6.3 Existing tests expected to change

| File | Change | Why |
|---|---|---|
| `tests/test_horizon_dip.py` | **additive only** — one new case driving the dip via `ObserverLocation(altitude=1400)` rather than a bare float | proves the field reaches `rise_trans_true_hor`; the 4 existing cases must pass untouched |

**Expected to change: one file, additively. Expected to break: none.**

That prediction is itself a test of this plan. If any of the other 59 test files needs
editing, the change was larger than designed and should be re-reviewed before proceeding —
this is the phase's tripwire.

### 6.4 Full-suite gate

All 458 tests must pass at every commit. The three `tests/test_cities_db.py` failures noted
in the audit (they need a full GeoNames import) are pre-existing and remain out of scope.

---

## 7. Risk analysis

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Someone wires real elevations into `default_altitude`** during or after this phase, thinking it an improvement. Sunrise regresses ~7 min at Kathmandu. | **medium** — the change *looks* like the obvious next step, and `ALT_KATHMANDU = 1400.0` sits unused two lines above | **high** — wrong times on the primary product surface | Delete or explicitly annotate `ALT_KATHMANDU` (§2.1 file 2); keep the "sea level everywhere, deliberately" reasoning in `default_altitude`'s docstring; `test_horizon_dip.py` already fails if the default changes |
| R2 | **`as_dict()` gains `altitude` by reflex**, changing 35 public payloads and diverging cache shapes | medium | medium | Test 6.1#6 asserts the exact key set and fails on addition |
| R3 | **Field inserted mid-dataclass**, breaking positional construction | low — all 22 sites use kwargs | high if it happened | Append last; note it in the commit message; full suite gates it |
| R4 | **Cache key changed unconditionally**, orphaning 146 MB for no gain | medium — it is the naive reading of the brief | medium — cold rebuild, CDN purge | Test 6.1#7 pins the key against a hardcoded literal for the zero-altitude case |
| R5 | **The near-Kathmandu snap swallows a non-zero altitude** (§5.2), silently serving sea-level times to an elevated observer | low today (unreachable), certain later | medium | Test 6.1#9 |
| R6 | **Equality semantics shift.** Frozen dataclass `__eq__` now compares altitude, so two locations equal before could compare unequal | very low — both default to `0.0` | low | Full suite; no test compares locations across a construction boundary |
| R7 | **Scope creep into altitude data sourcing** — GeoNames elevation import, an `altitude` query parameter | medium | medium | Both named out of scope in §1; `api/deps.py` explicitly untouched |

### "What could accidentally break?"

Working outward from the change:

- **Nothing in the astronomy path.** `AstronomyEngine` already takes `alt` and has since
  before this phase. Phase 1 changes only *where the value comes from*, and the value is
  `0.0` either way.
- **Nothing in the 35 payload sites**, because `as_dict()` is frozen.
- **Nothing in the 33 cache-key sites**, because keys are byte-identical at
  `altitude == 0.0`.
- **Nothing in the ~70 importing files**, because the field is trailing and defaulted.
- **The realistic failure is R1 and it is not a Phase 1 failure — it is a Phase 1+1
  failure.** The phase makes altitude *reachable*; the danger is the next person reaching for
  it with GeoNames data and no awareness of the sea-level finding. The mitigation is
  documentary and lives in this phase: kill `ALT_KATHMANDU`, keep the docstring, keep the
  tests.
- **One second-order risk worth naming:** `resolve_location`'s 2-decimal grid snap
  (`location.py:68`) is applied to lat/lon. Altitude gets no such snap. If a future caller
  passes metre-precise altitudes from GPS, cache keys will fragment per-metre. Not a Phase 1
  bug — nothing supplies altitude — but the rounding decision should be made **when** an
  input path is added, and the `.1f` formatting in the key is a deliberate hedge.

---

## 8. Implementation order

Five commits. Each compiles, passes all 458 tests, and is independently reviewable and
revertible.

**Commit 0 (pre-flight, not part of the phase)**
Land or stash the working-tree changes to `solar_corrections.py`, `panchanga_cache.py`,
`test_solar_corrections.py`.

**Commit 1 — Add explicit `altitude` to `ObserverLocation`**
`engine/astronomy/location.py`. Append `altitude: float = 0.0`; thread through
`resolve_location` / `resolve_location_from_query`; add validation. `cache_key()` and
`as_dict()` **untouched**. Nothing reads the field yet.
*Test: 6.1 #1–#5. Green by construction — pure addition.*

**Commit 2 — Remove the `getattr` hole**
`engine/astronomy/sun.py:239` reads `location.altitude`. Delete or annotate `ALT_KATHMANDU`.
*Test: full suite + the 6.2 no-op proof. **This is the behavioural gate** — if anything
moves, it moves here.*

**Commit 3 — Make cache keys altitude-aware without changing today's keys**
`location.py` conditional suffix; `panchanga_cache.py` snap condition.
*Test: 6.1 #7–#10, incl. the hardcoded byte-identical assertion.*

**Commit 4 — Backward-compatibility and integration tests**
`tests/test_observer_model.py` complete (incl. the `as_dict()` guard #6); additive case in
`tests/test_horizon_dip.py`.
*Test: full suite.*

**Commit 5 — Documentation**
Correct W1 in `docs/architecture-roadmap.md` (§9). Update this plan's status to
*implemented*.
*No code.*

Commits 1–3 are the phase; 4–5 are its proof and its record. If review stops after commit 2,
the tree is still consistent and the `getattr` is still gone.

---

## 9. Roadmap corrections required (commit 5)

Investigation disproved part of my own W1. Both must be fixed:

1. **W1 currently reads** that altitude "always falls through to the estimator" with the
   implication that the estimate is a weakness. It is not an estimate — `default_altitude`
   returns a **deliberate, validated constant `0.0`**, chosen against published Nepali
   panchang because the real elevation produces an unphysical horizon dip in the Kathmandu
   valley. The weakness is *only* that the field is undeclared and unreachable, not that its
   value is wrong.
2. **W1 says "~1.1 arcminutes of time-equivalent."** It is ~1.1 **degrees**
   (`1.76·√1400/60 = 1.0976°`), as `tests/test_horizon_dip.py:19` asserts directly.

Correcting these matters beyond tidiness: as written, W1 invites exactly risk R1.

---

## 10. Success criteria

Restated against the brief, with two amendments argued above.

| # | Criterion | Verified by | Status |
|---|---|---|---|
| 1 | `ObserverLocation` contains explicit `altitude` | `tests/test_observer_model.py` #1–#5 | as specified |
| 2 | No `getattr(location, "altitude")` remains | grep guard in the new test file | as specified |
| 3 | Existing API responses unchanged | `as_dict()` key-set test #6 + the 6.2 no-op proof | as specified — and **literally** true given §4.2 |
| 4 | ~~Cache version updated correctly~~ → **Cache version deliberately unchanged, with the reasoning recorded** | `tests/test_payload_version.py` still green at `40` / `3` | **amended — see §5.4** |
| 5 | Tests pass | 458 existing + ~11 new | as specified |
| 6 | Documentation updated | §9 corrections applied | as specified |
| 7 | *(added)* No computed value changes | §6.2 no-op proof across modern / pre-1943 / BCE | **added** |

Criterion 7 is the one that actually defines this phase. Everything else is bookkeeping
around it.

---

## 11. Summary of recommendations against the brief

| Brief item | Recommendation | Reason |
|---|---|---|
| `timezone_history` field | **defer to Phase 3** | zero consumers; wrong owner (zone, not observer); `timescale.py` is already the right registry (§3.4) |
| `id` field | **defer to Phase 4** | `city_id` + `resolve_cache_keys()` already provide identity; Phase 4 defines the real need (§3.5) |
| `latitude` / `longitude` naming | **keep `lat` / `lon`** | ~70 files, zero benefit; aliases would be the unnecessary abstraction the rules forbid (§3.6) |
| "Update cache keys" | **conditional, not unconditional** | altitude is constant `0.0`; unconditional orphans 146 MB for zero discriminating power (§5.1) |
| "Cache version updated correctly" | **no bump** | no computed value changes; a bump forces a cold rebuild across four stores + CDN purge to replace payloads with identical ones (§5.4) |
| Publish `altitude` in `as_dict()` | **not in Phase 1** | changes 35 public payloads and diverges cache shapes to publish a field that is `0.0` in 100% of responses (§4.2) |

**Net effect: Phase 1 shrinks from a seven-field model change to a one-field change plus a
three-line cache fix — ~30 production lines.** Everything removed is deferred to the phase
that actually needs it, not dropped.

The phase is small because the audit's five completed migrations already did the hard part.
That is the system working as intended, and the right response is to take the small win and
move to Phase 2, not to manufacture work to match the original scope.

---

**STOP. No code written. Awaiting approval.**
