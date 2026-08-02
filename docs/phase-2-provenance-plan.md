# Phase 2 — Calculation provenance: implementation plan

**Status: IMPLEMENTED.** Six commits, `9eb9a57`…`7788d56`. See §14 for the outcome and
the findings that changed the design.

Companion to [`architecture-roadmap.md`](architecture-roadmap.md) §4 Phase 2 and
[`phase-1-observer-model-plan.md`](phase-1-observer-model-plan.md). Target:
`phase-1-observer-model @ 2c765a4`.

> **Read §0 first.** Runtime investigation found substantially more provenance is
> machine-derivable than the roadmap assumed, and one structural fact — ayanamsha is a
> per-request parameter, not a process constant — that changes the data model.

---

## 0. What investigation established

Every claim below was probed against the running system, not assumed.

### 0.1 Almost everything is runtime-derivable

The roadmap worried provenance would become hand-maintained metadata that rots (risk R4).
Measured, the opposite is available:

| Field | Runtime source | Value here |
|---|---|---|
| Swiss Ephemeris (C) version | `swe.version` | `2.10.03` |
| pyswisseph build | `swe.__version__` | `20230604` |
| Compiled library path | `swe.get_library_path()` | `.venv/.../swisseph.cpython-310-darwin.so` |
| **File actually used** | `swe.get_current_file_data(0/1)` | `sepl_18.se1`, `semo_18.se1` |
| File JD coverage | same call, fields 1–2 | `2378496.5 … 2597651.36` |
| **JPL DE number** | same call, field 3 | **`441`** (DE441) |
| ΔT model id | `swe.MOD_DELTAT_DEFAULT` | `5` = Stephenson/Morrison/Hohenkerk **2016** |
| Tidal acceleration | `swe.get_tid_acc()` | **`−25.936`** (≠ `TIDAL_DEFAULT` `−25.8`) |
| ΔT actual values | `swe.deltat(jd)` | see §0.3 |
| Ayanamsha display name | `swe.get_ayanamsa_name(mode)` | `Lahiri`, `Raman`, `True Citra`, … |

Two of these matter especially. **`denum=441`** is the JPL ephemeris the `.se1` files were
built from — a fact about the data, embedded in the data, that no human has to type. And
**`get_tid_acc()` returns −25.936, not the −25.8 default**, because swisseph auto-selects
to match DE441. Hand-writing "tidal accel: −25.8" from the documentation would have been
wrong on day one. This is the case for deriving everything.

### 0.2 Hashing the ephemeris is cheap — the expensive option is affordable

Measured on the 102 shipped `.se1` files (98.0 MB):

| Strategy | Time | Detects |
|---|---|---|
| Full content SHA-256 | **0.10 s** | any byte change |
| Header-only (1 KB/file) | 0.0018 s | file swap, most rebuilds |
| Name + size | 0.0002 s | file add/remove/resize only |

Full-content hashing costs 100 ms **once per process**. The roadmap assumed this would be
prohibitive and that a weaker fingerprint would be needed; it is not. **Recommend full
content hash**, computed lazily on first use and memoised for process lifetime.

### 0.3 ΔT is not "entirely implicit" — swisseph exposes it

Roadmap W3 said `grep deltat` returns zero hits. True of *our* code, and it led me to
describe ΔT as unavailable. It is fully available through the library:

`swe.deltat(jd)`, `swe.deltat_ex()`, `swe.get_tid_acc()`, `swe.set_tid_acc()`,
`swe.set_delta_t_userdef()`, and five model constants
(`MOD_DELTAT_STEPHENSON_MORRISON_1984` … `MOD_DELTAT_STEPHENSON_ETC_2016`).

Measured ΔT, which also **corrects the roadmap's indicative table**:

| Epoch | Roadmap said | Measured |
|---|---|---|
| 2000 CE | ~64 s | **63.8 s** ✓ |
| 1900 CE | — | −2.0 s |
| 1 CE | ~2.7 h | **2.94 h** |
| 1001 BCE | ~7.5 h | **7.09 h** |
| 3001 BCE | ~19 h | **20.9 h** |

Close enough that the roadmap's framing survives, but these are now measured, not
literature-recalled. **This is Phase 3's material** — Phase 2 only records *which* model
produced them.

### 0.4 The structural finding: ayanamsha is per-request, not per-process

`AstronomyEngine._calc(..., ayanamsa=None)` defaults to `self._ayanamsa` but **every call
site may override it** ([engine.py:200](engine/astronomy/engine.py:200)), and
`api/kundali.py` does exactly that from a query parameter across five endpoints
(`lahiri`, `nepal`, `raman`, `kp`, `true_citra`).

So a single flat `CalculationProvenance` containing an `ayanamsha` field would be **wrong
by construction**: it would record the process default while a request computed with KP.
That is the same "metadata that drifts from reality" failure the principles forbid, just
better disguised.

Provenance therefore has **two tiers** (§4). Note the system already handles the
per-request tier correctly — `kundali_report_cache` keys on
`birth_instant|location_key|ayanamsha|lang` with a dedicated column and index. Phase 2
should not disturb that; it should copy its instinct.

---

## 1. Objective

Make every stored calculation answer: **"what exact inputs and algorithms created this?"**

Concretely, produce a machine-readable `EnvironmentProvenance` derived entirely from
runtime, hash it to a stable `provenance_hash`, persist that hash **as a queryable column**
next to cached results, and expose it for inspection — without changing any computed value,
any public payload, or any cache key.

**Why now:** roadmap §4 makes this a hard prerequisite for Phase 8. Precomputing millions
of rows whose provenance is unrecoverable creates a liability, not an asset — they cannot
be selectively invalidated when a dependency shifts, so the only remedy is discarding all
of them.

**What architectural problem it solves.** Today `ASTRONOMY_VERSION = 3` is a
hand-maintained integer. A `pip install -U pyswisseph` can change every BCE answer with no
version moving and **no way to detect it afterward**. Phase 2 replaces "a human remembered
to bump a counter" with "the system observed what it actually ran."

---

## 2. Current provenance gaps

| # | Gap | Evidence |
|---|---|---|
| G1 | **Dependency versions unrecorded.** Nothing captures `swe.version` / `swe.__version__`. A library upgrade is undetectable after the fact. | grep: no reference to either anywhere |
| G2 | **Ephemeris file set unrecorded.** Hosts genuinely differ — provisioning has `--extended` / `--far-ce` options — so "which files" is a real variable, not a constant. | `ephemeris_provision/`, [patro_year_axis.py:46](engine/vedic/patro_year_axis.py:46) |
| G3 | **ΔT model unrecorded**, and the live tidal acceleration (−25.936) differs from the documented default (−25.8). | §0.1 |
| G4 | **Correction constants unrecorded** and scattered: `1.76` dip coefficient inline at [engine.py:103](engine/astronomy/engine.py:103), `GAURISHANKAR_MERIDIAN = 86.25`, `REFERENCE_LATITUDE`, `DEFAULT_ALTITUDE`, `MIN_ALTITUDE_M`, `SYNODIC_MONTH_DAYS`, the `0.02°` cache snap radius | §0, grep |
| G5 | **`_cache_version` is a JSON field, not a column** — auditing or selectively invalidating requires deserialising every row. | [panchanga_cache.py:298](services/panchanga_cache.py:298), `:306` |
| G6 | **The version changelog is prose.** ~40 numbered comment entries; unqueryable, unservable. | [panchanga_cache.py:20–112](services/panchanga_cache.py:20) |
| G7 | **A sixth version namespace exists outside `compose()`.** `services/presentation/helpers.ENGINE_VERSION = "2.2.0"` does not pass through `stamp()`, unlike the other five. | [helpers.py:8](services/presentation/helpers.py:8) |

G7 is new since the roadmap, which counted five namespaces.

---

## 3. Files to change

### 3.1 Changed / added

| # | File | Why | Size | Risk | API compat |
|---|---|---|---|---|---|
| 1 | `engine/astronomy/provenance.py` **(new)** | `EnvironmentProvenance` — derives every field from runtime, hashes it, memoises for process lifetime | ~+190 | **low** | none |
| 2 | `engine/astronomy/engine.py` | Expose `ephemeris_files_in_use()` (wraps `get_current_file_data`), `delta_t_seconds(jd)`, `tidal_acceleration()`, `ayanamsha_name(mode)`. Thin accessors; **no calculation change** | ~+45 | **low** | none |
| 3 | `services/payload_version.py` | Relate provenance to the existing two axes. `ASTRONOMY_VERSION` **stays and keeps its meaning** (§6) | ~+30 | **low** | none |
| 4 | `services/panchanga_cache.py` | `provenance_hash` column + additive migration in `ensure_schema()`; write on store; **not in the key** | ~+35 | **medium** | none |
| 5 | `api/meta.py` | Read-only `GET /meta/provenance`. **New endpoint, no existing response altered** | ~+25 | additive only |
| 6 | `tests/test_provenance.py` **(new)** | §9 | ~+230 | none | none |
| 7 | `tests/test_payload_version.py` | Additive: provenance does not disturb `compose()` | ~+25 | none | none |
| 8 | `docs/phase-2-provenance-plan.md` | Outcome section | ~+60 | none | none |

**Eight files, ~+640 lines, of which ~255 are tests.** Production delta ~325.

### 3.2 Reviewed and intentionally unchanged

| File / group | Why |
|---|---|
| Every `engine/vedic/*` builder | Provenance is recorded *around* calculations, never consulted *by* them. If a builder ever reads provenance, the layering has failed |
| `ObserverLocation` | Phase 1 settled it. Provenance reads the object; note it must read the **object**, not `as_dict()`, since `altitude` is deliberately absent from the display projection |
| `response_cache`, `year_cache`, `blob_db_cache` | Key off `CACHE_PAYLOAD_VERSION`, unchanged. Adding provenance to *file-path* caches means renaming every file — that is invalidation, forbidden by principle 3 |
| `kundali_report_cache` | Already keys ayanamsha properly. Second store to gain the column, but **deferred to Phase 4** to keep Phase 2's schema change to one table |
| `sait_generator`, `cache_meta` | String versions via `stamp()`. Unchanged |
| `services/presentation/helpers.py` (G7) | Flagged, **not fixed** — it is a *presentation* version, and folding it into the astronomy axis is a judgement call that deserves its own decision, not a drive-by |
| All 35 `as_dict()` payload sites | Principle 5: provenance must not mix with presentation payloads |

---

## 4. Data model design

### 4.1 Two tiers, because reality has two tiers

```
EnvironmentProvenance          per-process, stable, hashed -> provenance_hash
  what this deployment IS

Calculation inputs             per-request, already keyed by existing caches
  ayanamsha, observer, jd      NOT folded into provenance_hash
```

**Why the split.** A hash is only useful if it is stable for a given deployment. Folding
ayanamsha in makes it vary per request, so it can no longer answer "did my environment
change?" — which is the question Phase 2 exists to answer. Ayanamsha is already keyed where
it varies ([kundali_report_cache.py:87](services/kundali_report_cache.py:87)); duplicating
it into provenance adds drift risk and no information.

### 4.2 `EnvironmentProvenance`

Frozen dataclass. **Every field derived; none accepted from a caller.** No constructor
takes values — there is one factory, `current()`, and it reads the world.

| Field | Source | Example |
|---|---|---|
| `engine_version` | our constant | `"PANCHANGA_ENGINE_V1.0"` |
| `swisseph_version` | `swe.version` | `"2.10.03"` |
| `pyswisseph_build` | `swe.__version__` | `"20230604"` |
| `ephemeris_dir` | `paths.ephemeris_path()` | `data/ephemeris` |
| `ephemeris_file_count` | directory scan | `102` |
| `ephemeris_bytes` | directory scan | `98_012_xxx` |
| `ephemeris_content_sha256` | full-content hash (§0.2) | `66905f15…` |
| `jpl_denum` | `get_current_file_data(0)[3]` | `441` |
| `delta_t_model_id` | `swe.MOD_DELTAT_DEFAULT` | `5` |
| `delta_t_model_name` | our id→name map (§4.4) | `"stephenson_etc_2016"` |
| `tidal_acceleration` | `swe.get_tid_acc()` | `-25.936` |
| `delta_t_probes` | `swe.deltat(jd)` at fixed JDs | `{"2451545.0": 63.83, …}` |
| `ayanamsha_modes` | `swe.get_ayanamsa_name()` per supported mode | `{"lahiri": [1, "Lahiri"], …}` |
| `correction_constants` | **imported by reference** (§4.3) | `{"horizon_dip_coefficient": 1.76, …}` |
| `provenance_hash` | SHA-256 of the canonical JSON of all above | `a3f9…` (16 hex shown) |

`delta_t_probes` is the anti-drift device for G3. swisseph has **no getter for the ΔT model
currently in use** — only the `MOD_DELTAT_DEFAULT` constant. So recording that constant
alone would be a claim, not an observation. Sampling `deltat()` at fixed JDs (J2000, 1 CE,
1000 BCE, 3000 BCE) records what the model *actually did*. If a library upgrade changes the
model, the probes change even if the constant does not.

### 4.3 Correction constants — by reference, never copied

The one place this design could rot. Copying `{"horizon_dip_coefficient": 1.76}` into a
literal dict creates a second source of truth that silently diverges the moment someone
edits `engine.py`.

**Rule: every entry is an imported attribute, not a typed-in number.** Two of them
(`1.76`, `0.02`) are currently inline literals and must be promoted to named module
constants first, so they *can* be imported. That promotion is behaviour-neutral —
extracting a literal to a constant used in exactly one place.

Initial set (astronomy-affecting only):

| Key | Currently | Action |
|---|---|---|
| `horizon_dip_coefficient` | inline `1.76` at [engine.py:103](engine/astronomy/engine.py:103) | promote to `HORIZON_DIP_COEFFICIENT` |
| `default_altitude_m` | `location.DEFAULT_ALTITUDE` | import |
| `min_altitude_m` | `location.MIN_ALTITUDE_M` | import |
| `synodic_month_days` | `moon.SYNODIC_MONTH_DAYS` | import |
| `gregorian_cutover_jd` | `jd_calendar.GREGORIAN_CUTOVER_JD_UT` | import |
| `cache_snap_radius_deg` | inline `0.02` at [panchanga_cache.py:217](services/panchanga_cache.py:217) | promote to `KATHMANDU_SNAP_RADIUS_DEG` |

Deliberately **excluded**: `GAURISHANKAR_MERIDIAN`, `REFERENCE_LATITUDE`, the Nepal
timezone-era offsets. These are *display/cultural* corrections, not astronomy — they belong
to the tradition layer (Phase 7). Including them would make the environment hash change for
a cultural-rule edit, which is precisely the axis confusion `payload_version.py` was built
to end.

A test asserts every value is identical to its imported source (§9).

### 4.4 The ΔT id→name map — the one hand-written table

`swe.get_ayanamsa_name()` exists; there is no `get_delta_t_model_name()`. So five names must
be written by hand. Mitigated by pinning against `swe.MOD_NDELTAT` (= 5): if a swisseph
upgrade adds a sixth model, the test fails and the map must be extended rather than
silently mislabelling.

This is the only hand-maintained data in the design, it is five strings, and it is
guarded. Everything else is observed.

---

## 5. Provenance storage design

### 5.1 `provenance_hash` should be a first-class column — recorded, not keyed

Answering the question you raised directly. **Yes, a real column. No, not part of the cache
key.** These are separable and the distinction is the whole design.

| | As a **key** component | As a **recorded column** ⬅ |
|---|---|---|
| Effect on existing rows | every row orphaned immediately | every row keeps working |
| Principle 3 ("don't invalidate unless output changes") | **violated** | honoured |
| Answers "what produced this row?" | yes | **yes** |
| Enables `DELETE WHERE provenance_hash = 'x'` | n/a (orphaned anyway) | **yes — selective** |
| Enables `SELECT DISTINCT provenance_hash` audit | no | **yes** |
| Cost | full cold rebuild across 4 stores + CDN purge | one `ALTER TABLE ADD COLUMN` |

The recorded column is strictly more capable. Blunt invalidation is what
`payload_version.py` apologises for in its own docstring ("deliberately blunt: it costs one
cold rebuild and removes the need to work out which stores a fix reaches"). Selective
invalidation by provenance is the upgrade — but only if the hash is *stored*, not *keyed*.

A column also fixes G5: `_cache_version` stays a JSON field for compatibility, and
`provenance_hash` demonstrates the better pattern for Phase 4 to copy.

### 5.2 Schema change

```sql
ALTER TABLE panchanga_cache ADD COLUMN provenance_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_panchanga_cache_provenance
    ON panchanga_cache(provenance_hash);
```

Additive, nullable, non-destructive. `_SCHEMA` uses `CREATE TABLE IF NOT EXISTS`, which
does **not** alter an existing table — so `ensure_schema()` needs an explicit column check.
Precedent exists: [`cities_db._table_columns`](services/cities_db.py:80) already does
runtime column introspection for optional admin columns.

Existing rows get `NULL`, meaning "written before provenance existed" — accurate, and
distinguishable from any real hash.

⚠️ **This is a schema migration**, one of the declared stop-conditions. It is additive,
nullable, and reversible, but I am flagging it here rather than discovering it mid-commit.
The committed `engine/data/panchanga.db` (3.1 MB) is migrated by the same code path on
first open.

### 5.3 Not stored in payloads

Provenance does not enter `payload_json`, and `as_dict()` is untouched. It lives in its own
column and behind `GET /meta/provenance`. Principle 5.

---

## 6. Cache integration strategy

**`ASTRONOMY_VERSION` stays, keeps its current meaning, and stays the invalidation
trigger.** Provenance does not replace it in Phase 2.

The reason is a genuine limitation worth stating plainly: a provenance change means *an
input changed*, which is **not** the same as *an output changed*. A pyswisseph patch
release that fixes an unrelated asteroid routine changes `swisseph_version`, hence the
hash, hence — if the hash gated the cache — a full rebuild for zero numerical difference.

So the two play different roles:

| | Question it answers | Effect |
|---|---|---|
| `ASTRONOMY_VERSION` | "did a computed value change?" (human judgement) | invalidates |
| `provenance_hash` | "what produced this row?" (machine observation) | records + enables audit |

**Detection without invalidation.** At startup, compare the live hash against the distinct
hashes present in the cache. On mismatch, log at WARNING with a diff of which *fields*
changed. That converts today's silent-dependency-drift into a visible event — the A0c class
of bug, where the API served Moshier results for months — without a single cache miss.

Making the hash a gate is a later, deliberate decision. Phase 2 supplies the evidence to
make it.

---

## 7. Migration strategy

| Concern | Approach |
|---|---|
| Existing SQLite rows | `provenance_hash IS NULL` = pre-provenance. Still served; `_payload_cache_valid()` unchanged, so no recompute |
| Committed `panchanga.db` | Migrated in place by `ensure_schema()` on first open. Additive |
| Disk caches (`cache/`, 146 MB) | Untouched. Filenames unchanged, so nothing orphans |
| Blob / year / response caches | Untouched |
| Rollback | See §11 — a nullable column left in place is inert |
| Deploy order | No coupling. Old code ignores the column; new code tolerates `NULL` |

**No cold rebuild. No CDN purge. No payload version bump.**

---

## 8. Backward compatibility analysis

| Surface | Impact |
|---|---|
| **Public API responses** | **None.** No existing endpoint's body changes. `GET /meta/provenance` is new |
| `as_dict()` | Untouched — still `{lat, lon, timezone, name}` (+`city_id`), pinned by Phase 1's test |
| Cache keys | **Byte-identical.** `resolve_cache_keys()` and `cache_key()` unchanged |
| `CACHE_PAYLOAD_VERSION` | Unchanged at `4003` (`PANCHANGA_PAYLOAD_VERSION` 40 × `ASTRONOMY_VERSION` 3) |
| SQLite schema | Additive nullable column + index. Old code SELECTs by name, unaffected |
| `payload_json` | Unchanged |
| Computed values | **None.** Provenance observes; it never feeds a calculation |
| Startup cost | +~100 ms once (full ephemeris hash), lazy and memoised. Not on the request path |

The one honest cost is that ~100 ms. It is paid on first provenance access, not at import,
so a process that never asks never pays.

---

## 9. Test strategy

### 9.1 New — `tests/test_provenance.py` (~18 tests)

**Derivation is real, not hand-written**
1. `swisseph_version` equals `swe.version` (not a literal).
2. `jpl_denum` equals `get_current_file_data(0)[3]`; is `441` here.
3. `tidal_acceleration` equals `swe.get_tid_acc()` — and **is not** `swe.TIDAL_DEFAULT`, pinning the §0.1 finding that the documented default is the wrong number.
4. `ephemeris_content_sha256` changes when a file's bytes change (tmpdir with a doctored copy).
5. `ephemeris_file_count` / `_bytes` match a fresh directory scan.

**Correction constants cannot drift** *(the R4 guard)*
6. Every `correction_constants` value `is` / `==` its imported source. Parametrised over the whole dict, so a new entry is covered automatically.
7. Grep guard: no numeric literal in `provenance.py`'s constants block — every entry must be an imported name.

**ΔT**
8. `delta_t_model_id == swe.MOD_DELTAT_DEFAULT`.
9. The id→name map covers exactly `1..swe.MOD_NDELTAT` — fails if an upgrade adds a model (§4.4).
10. `delta_t_probes` match `swe.deltat()` at the same JDs, and are monotonic going back in time.

**Hash behaviour**
11. Stable across repeated calls in one process (memoised).
12. Stable across a fresh interpreter — same inputs, same hash (subprocess).
13. Changes when any single field changes (parametrised mutation).
14. Independent of ayanamsha — computing with `kp` then `lahiri` yields the same hash (§0.4).

**Storage**
15. `ensure_schema()` adds the column to a pre-existing table lacking it, without data loss.
16. Running it twice is idempotent.
17. A row written pre-migration (`NULL`) is still served, not recomputed.
18. Stored hash equals the live hash for a freshly written row.

### 9.2 The no-behaviour-change proof

The Phase 1 five-era byte-identical harness (2026-06-10 Kathmandu, 2026-06-10 Jhapa,
1930-03-15 IST, Julian 1500-06-10, 57 BCE) is re-run after **every** commit. Same gate:
452,602 bytes, 0 diffs.

Phase 1 recommended promoting this from scratchpad into the repo. **Phase 2 should do
that** — as `tests/data/` fixtures plus a test, so the guarantee stops depending on my
scratchpad surviving.

### 9.3 Existing tests expected to change

| File | Change |
|---|---|
| `tests/test_payload_version.py` | **additive** — provenance leaves `compose()` and `CACHE_PAYLOAD_VERSION` alone |

Expected to break: **none**. As in Phase 1, this prediction is the tripwire — if a third
file needs editing, the change was larger than designed.

### 9.4 Gate

851 baseline (850 + 1 promoted harness) must pass at every commit; the 5 pre-existing
local-env failures must not grow.

---

## 10. Implementation order

Seven commits. Each compiles, passes, and is independently revertible.

**Commit 1 — Promote inline literals to named constants**
`HORIZON_DIP_COEFFICIENT = 1.76` in `engine.py`; `KATHMANDU_SNAP_RADIUS_DEG = 0.02` in
`panchanga_cache.py`. Behaviour-neutral; makes §4.3's by-reference rule possible.
*Test: full suite + byte-identical harness.*

**Commit 2 — Astronomy accessors**
`ephemeris_files_in_use()`, `delta_t_seconds(jd)`, `tidal_acceleration()`,
`ayanamsha_name(mode)` on `AstronomyEngine`. Thin wrappers, no calculation touched.
*Test: values equal direct `swe.*` calls.*

**Commit 3 — `EnvironmentProvenance`**
New `engine/astronomy/provenance.py`. Nothing consumes it yet.
*Test: 9.1 derivation + constants + ΔT + hash groups (14 tests).*

**Commit 4 — Promote the byte-identical harness into the repo**
Phase 1's capture script becomes `tests/data/` fixtures + a test. Does this *before* the
schema change, so the strongest regression net is in place for the riskiest commit.
*Test: the harness itself.*

**Commit 5 — Schema migration + write path**
`provenance_hash` column, index, additive migration in `ensure_schema()`, populated on
store. **Not in any key.**
*Test: 9.1 storage group (4 tests); byte-identical harness; migration on a pre-existing DB.*

**Commit 6 — Startup drift detection + `GET /meta/provenance`**
WARNING log on mismatch; read-only endpoint.
*Test: mismatch logs and does not invalidate; endpoint shape.*

**Commit 7 — Documentation**
Outcome section; correct roadmap W3 (ΔT *is* exposed by swisseph — my "zero hits" reading
was about our code, and the roadmap's phrasing implies more than that) and W4; record G7.
*No code.*

Commits 1–3 are inert additions. Commit 5 is the only one touching a database. If review
stops after commit 4, the tree is consistent and provenance is fully computable — just not
yet persisted.

---

## 11. Rollback plan

| Commit | Rollback | Residue |
|---|---|---|
| 1 | revert | none — constants were single-use |
| 2 | revert | none — nothing else called them |
| 3 | revert | none — module was unconsumed |
| 4 | revert | none — test-only |
| 5 | revert code; **leave the column** | An unused nullable column. SQLite has no cheap `DROP COLUMN` pre-3.35, and dropping is unnecessary: old code never SELECTs it |
| 6 | revert | endpoint 404s again |
| 7 | revert | docs only |

**The only non-trivial case is commit 5, and its residue is inert.** No data is lost or
rewritten at any point: the migration only adds a nullable column, and existing rows are
never touched. A full revert to `2c765a4` leaves one unused column and nothing else.

---

## 12. Success criteria

| # | Criterion | Verified by |
|---|---|---|
| 1 | Provenance derived from runtime, not hand-written | 9.1 #1–#5, #7 |
| 2 | Correction constants cannot drift from source | 9.1 #6–#7 |
| 3 | ΔT model identified and its actual behaviour fingerprinted | 9.1 #8–#10 |
| 4 | `provenance_hash` stable, reproducible across processes, ayanamsha-independent | 9.1 #11–#14 |
| 5 | `provenance_hash` is a queryable column, not only JSON | 9.1 #15–#18 |
| 6 | **No computed value changes** | five-era harness, 0 diffs |
| 7 | **No public API response changes** | additive endpoint only; `as_dict()` guard |
| 8 | **No cache invalidated, no version bumped** | `CACHE_PAYLOAD_VERSION` still `4003` |
| 9 | Schema migration additive, idempotent, reversible-inert | 9.1 #15–#17 |
| 10 | Tests pass, 5 pre-existing failures unchanged | full suite |

---

## 13. Recommendations and pushback

| Item | Recommendation | Reason |
|---|---|---|
| `provenance_hash` in cache **keys** | **No** | Invalidates everything on day one; violates principle 3. Record it, then decide with evidence (§6) |
| Replace `ASTRONOMY_VERSION` with the hash | **No** | Input change ≠ output change. A patch release would force a rebuild for zero numerical difference (§6) |
| Ayanamsha inside `EnvironmentProvenance` | **No** | Per-request, so it would make the hash unstable and useless as a deployment fingerprint. Already keyed where it varies (§0.4) |
| Cultural constants (`GAURISHANKAR_MERIDIAN`, tz eras) in provenance | **No** | Not astronomy. Would make the environment hash move on a cultural-rule edit — the axis confusion `payload_version.py` exists to prevent (§4.3) |
| Ephemeris hashing strategy | **Full content** | Measured 0.10 s once per process; the weaker fingerprints buy nothing (§0.2) |
| `kundali_report_cache` column | **Defer to Phase 4** | Keeps Phase 2's schema change to one table |
| G7 (`presentation/helpers.ENGINE_VERSION`) | **Flag, don't fix** | A presentation version; folding it into the astronomy axis deserves its own decision |
| Promote the byte-identical harness | **Yes, commit 4** | It is currently the strongest guarantee in the programme and it lives in a scratchpad |

### One observation, deliberately not acted on

`swe.get_ayanamsa_ut(J2000)` returns `23.857092` while
`swe.get_ayanamsa_ex_ut(J2000, FLG_SWIEPH)` returns `23.853222` — a **~13.9 arcsecond**
difference. The engine uses the former ([engine.py:476](engine/astronomy/engine.py:476),
`:486`).

This sits inside the "~40 arcsecond ayanamsha-formula tolerance" the engine's own comment
at `:126` already documents against Drik Panchang, so it is within known-and-tolerated
territory rather than an obvious defect. Investigating which is correct is **Phase 6**
material (external truth validation), not Phase 2 — provenance should record what is used,
not change it. Noted here so it is not lost.

---

**STOP. No code written. Awaiting approval.**

---

## 14. How Phase 2 actually went

Six commits on `phase-1-observer-model`. Every criterion in §12 met.

| Commit | |
|---|---|
| `9eb9a57` | byte-identical harness promoted into `tests/` (5 fixtures, 386 KB) |
| `a4b915d` | six astronomy correction constants extracted |
| `34ea908` | `EnvironmentProvenance` + 37 tests |
| `790dde5` | `provenance_hash` column, migration, write path |
| `dbe8009` | startup drift detection, logging only |
| *(this)* | documentation |

**No computed value moved.** The five-era byte-identical harness was re-run after every
commit: 0 diffs throughout. No cache key, payload, public API or version changed
(`PANCHANGA_PAYLOAD_VERSION` 40, `ASTRONOMY_VERSION` 3, `CACHE_PAYLOAD_VERSION` 4003).

Suite: **850 → 905 passing**, same 5 pre-existing local-environment failures.

### Findings that changed the design

**`attemp = 0.0` — refraction at 0 °C, worth ~42 seconds.** The two literals in
`swe.rise_trans_true_hor(..., 0.0, 0.0, dip)` are atmospheric pressure and temperature.
Pressure 0.0 is a "derive from altitude" sentinel and is inert at sea level; temperature
0.0 means literally 0 °C and shifts sunrise ~42 s against the ISA standard 15 °C. It was
undocumented, and the plan had missed it entirely. Now `REFRACTION_TEMPERATURE`, value
preserved, with a comment that does **not** claim intent — no evidence was found that it
was deliberate. Validation deferred to Phase 6.

**DE441, read from the files.** `swe.get_current_file_data(0)[3]` returns the JPL
ephemeris number embedded in the `.se1` data. It is also *mutable global state* — it
reports the last-used file — so provenance runs its own fixed probe at J2000 before
reading, or the answer would depend on whichever date the process last computed.

**The live tidal acceleration is −25.936, not −25.8.** swisseph auto-selects to match
DE441. `TIDAL_DEFAULT` — the value in the documentation — is −25.8. A provenance record
written from documentation would have been wrong on its first day. This single fact is the
argument for the whole derive-don't-type design.

**ΔT probes catch what the model constant cannot.** `set_delta_t_userdef()` replaces ΔT
wholesale while `MOD_DELTAT_DEFAULT` keeps reporting 5. Recording the constant alone would
be a claim the behaviour contradicts, so provenance samples `deltat()` at four fixed
instants. Verified: an override changes the probes and the hash while every configuration
field stays identical.

**Absolute paths cannot be hashed.** The ephemeris directory is `/Users/…` on a laptop and
`/app/…` in a container; the library lives in a venv. Hashing either would break "same
environment, same hash" across machines. Both are kept as diagnostics; only `.se1`
basenames enter the digest. `Path.glob` also returns filesystem order (verified unsorted),
so the inventory is sorted first.

**The live database is 1.13 GB, not 3.1 MB.** `panchanga_db_path()` resolves to
`data/panchanga.db` — 18,083 rows, 54.3 KB average payload. The tracked
`engine/data/panchanga.db` (3.1 MB) is **unreachable by any code path**; reported, not
touched. Migration measured on a copy of the real file: `ensure_schema()` 0.73 s, second
run 0.0003 s, rows and sample data identical, file size unchanged.

### The design decision, restated

`provenance_hash` is **recorded, not keyed**. A cache key answers *"which lookup bucket is
this?"*; provenance answers *"how was this produced?"*. Keying on it would orphan every row
whenever any dependency moved — including upgrades that change no number. As a column it
enables `SELECT DISTINCT provenance_hash` and `DELETE WHERE provenance_hash = '<bad>'`:
selective invalidation, which `ASTRONOMY_VERSION` cannot express. `ASTRONOMY_VERSION` keeps
its job — *"did an output change?"* — unchanged.

Drift detection follows the same line: it **logs and never purges**. An input change is not
an output change.

### Deferred, deliberately

- **`ASCENDANT_SPEED_STEP_DAYS` has no automated coverage.** It feeds
  `ascendant_astro_extras`, which the daily-panchanga harness does not exercise, and no
  test asserts on lagna speed. Verified manually (361.4657 → 333.8577 at ×10). Candidate
  for Phase 6.
- **`kundali_report_cache` has no provenance column** — one table per phase; Phase 4.
- **G7:** `services/presentation/helpers.ENGINE_VERSION = "2.2.0"` sits outside
  `compose()`. Flagged, untouched — it is a presentation version.
- **`get_ayanamsa_ut` vs `get_ayanamsa_ex_ut` differ by ~13.9″** at J2000. Inside the ~40″
  tolerance the engine already documents against Drik Panchang. Phase 6 material.
