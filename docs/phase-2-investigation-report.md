# Phase 2 — provenance investigation report

**Repository inspection only. No code changed.** Target: `phase-1-observer-model @ 2c765a4`.

Every claim below was probed against the running system. Companion to
[`phase-2-provenance-plan.md`](phase-2-provenance-plan.md), which this report **amends** —
see §9 for what changed.

---

## 1. Swiss Ephemeris runtime identity — verified

| Item | Result |
|---|---|
| `swe.version` | `'2.10.03'` — **a `str` attribute, not callable** |
| `swe.__version__` | `20230604` (pyswisseph build date) |
| `swe.get_library_path()` | `.venv/…/swisseph.cpython-310-darwin.so` |
| `.se1` inventory | **102 files** — 51 `sepl*` (planet) + 51 `semo*` (moon), 98.0 MB |
| JPL DE number | **441**, on every file sampled |
| Full-content SHA-256 cost | **0.10 s** |

> ⚠️ **The brief specifies `swe.version()`.** That raises
> `TypeError: 'str' object is not callable`. It is an attribute. Provenance must read
> `swe.version`, not call it.

### `get_current_file_data` reports *loaded*, not *installed*

This distinction matters for the hash design. The call returns the most recently opened
file per category, so it changes as different epochs are computed:

| Epoch computed | planet file | moon file | denum |
|---|---|---|---|
| 2026 CE | `sepl_18.se1` | `semo_18.se1` | 441 |
| 1930 CE | `sepl_18.se1` | `semo_18.se1` | 441 |
| 1500 CE | `sepl_12.se1` | `semo_12.se1` | 441 |
| 57 BCE | `seplm06.se1` | `semom06.se1` | 441 |
| 3000 BCE | `seplm30.se1` | `semom30.se1` | 441 |

**Consequence for the hash:** it must fingerprint the **on-disk inventory** (deterministic),
never the loaded set (depends on which dates the process happened to compute).
`get_current_file_data` is still the right source for `denum` and for a diagnostic
"currently serving" field, but it cannot drive the hash.

### Sort order is not free

`Path.glob("*.se1")` returns **unsorted** filesystem order (`sepl_54, seplm132, seplm126, …`).
Explicit sorting is mandatory or the hash varies by filesystem. Verified.

---

## 2. Delta-T provenance — verified, and richer than the roadmap claimed

| Item | Result |
|---|---|
| `swe.MOD_DELTAT_DEFAULT` | `5` |
| Model `5` | `MOD_DELTAT_STEPHENSON_ETC_2016` (Stephenson/Morrison/Hohenkerk 2016) |
| `swe.MOD_NDELTAT` | `5` (model count — the upgrade tripwire) |
| `swe.get_tid_acc()` | **`−25.936`** |
| `swe.TIDAL_DEFAULT` | `−25.8` |

**The live tidal acceleration is not the documented default.** swisseph auto-selects
−25.936 to match DE441. Hand-writing "−25.8" from documentation would have been wrong on
day one — this is the single best argument for deriving every field.

### Probe values (deterministic drift detectors)

| Epoch | JD | ΔT measured |
|---|---|---|
| 2000 CE | 2451545.0 | 63.8 s |
| 1900 CE | 2415020.5 | −2.0 s |
| 1 CE | 1721423.5 | **2.94 h** |
| 1001 BCE | 1355807.5 | **7.09 h** |
| 3001 BCE | 625673.5 | **20.9 h** |

These also **correct the roadmap's W3 table**, which gave ~2.7 h / ~7.5 h / ~19 h from
literature recall. Close, but the measured values are now authoritative.

**Design point the brief is right to insist on:** swisseph exposes **no getter for the ΔT
model in use** — only the `MOD_DELTAT_DEFAULT` constant and `set_delta_t_userdef()` to
override. Recording the constant alone is a *claim about configuration*. The probes record
*observed behaviour*. Both go in, exactly as the brief requires.

### Roadmap W3 needs correcting

W3 says ΔT is "entirely implicit" because `grep deltat` returns zero hits. True of **our
code**, but the phrasing implies unavailability. swisseph exposes `deltat`, `deltat_ex`,
`get_tid_acc`, `set_tid_acc`, `set_delta_t_userdef` and five model constants. Phase 3's
`DeltaTProvider` has a real seam waiting for it.

---

## 3. Ayanamsha — confirmed request-level, with numbers

`AstronomyEngine._calc(..., ayanamsa=None)` defaults to `self._ayanamsa`, but **every call
may override** ([engine.py:200](engine/astronomy/engine.py:200)). Five endpoints in
`api/kundali.py` do so from a query parameter (`lahiri | nepal | raman | kp | true_citra`).

Demonstration — same process, same files, same JD:

| Mode | Sun longitude at J2000 |
|---|---|
| Lahiri | `256.515696°` |
| Krishnamurti | `256.612548°` |

**0.0968° apart.** Same environment, different answer. Ayanamsha is a *calculation input*,
not an environment fact — putting it in `EnvironmentProvenance` would make the hash unstable
per request and useless as a deployment fingerprint.

`engine/vedic/daily.py` and `services/panchanga_api.py` never pass `ayanamsa=`, so the daily
panchanga path is always Lahiri. And `kundali_report_cache` **already** keys on
`birth_instant|location_key|ayanamsha|lang` with its own column and index — the codebase
already treats it correctly as an input. Phase 2 copies that instinct rather than disturbing
it.

**The brief's separation is correct and is confirmed by evidence.**

---

## 4. Correction constants — the sweep found one the plan missed

### 4.1 New finding: refraction is computed at 0 °C, and it is worth ~42 seconds

[engine.py:771](engine/astronomy/engine.py:771), `:841`, `:869` all call:

```python
swe.rise_trans_true_hor(jd, body, flag, (lon, lat, alt), 0.0, 0.0, _horizon_dip_degrees(alt))
```

Per the pyswisseph signature, those two literals are **`atpress` (mbar)** and
**`attemp` (°C)**. So every rise/set in the system is computed at **0 °C**, and nothing in
the code says so — the surrounding docstring discusses only `horhgt`.

Measured sensitivity, Kathmandu sunrise 2026-06-10:

| `attemp` | Δ vs 0 °C |
|---|---|
| −20 °C | −26.5 s |
| **0 °C (current)** | — |
| 10 °C | +10.9 s |
| **15 °C (ISA standard)** | **+42.5 s** |
| 30 °C | +55.9 s |

`atpress=0.0` is benign: it means "auto-compute from geopos altitude", and at sea level it
produces exactly the same result as an explicit 1013.25 mbar (verified, 0.00 s difference).
It becomes significant only for elevated observers (850 mbar → +32.5 s).

**This is exactly the class of constant the brief's §6 asks for, and my Phase 2 plan
missed it.** It must be promoted to a named constant and imported into provenance.

**It must not be changed.** Moving 0 °C → 15 °C would shift every sunrise by ~42 s — a
behaviour change, forbidden in a value-neutral phase. Whether 0 °C is *correct* is a
Phase 6 (external truth validation) question. Phase 2 records it.

### 4.2 Classification of every candidate

| Constant | Location | Class | In provenance? |
|---|---|---|---|
| `1.76` horizon dip coefficient | inline, [engine.py:103](engine/astronomy/engine.py:103) | physical | **yes** — promote |
| `attemp = 0.0` | inline, `engine.py:771/841/869` | physical (refraction) | **yes** — promote |
| `atpress = 0.0` | same | physical (auto-mode sentinel) | **yes** — promote |
| `DEFAULT_ALTITUDE` | `location.py` | physical | **yes** — import |
| `MIN_ALTITUDE_M` | `location.py` | validation | yes (cheap) |
| `SYNODIC_MONTH_DAYS` | `moon.py:29` | physical | **yes** — import |
| `GREGORIAN_CUTOVER_JD_UT` | `jd_calendar.py:38` | calendar convention | **yes** — import |
| `_TOLERANCE_DAYS = 30 s` | `lagna.py:27` | algorithmic tolerance | **yes** — affects span boundaries |
| `_SEARCH_WINDOW_DAYS`, `_MAX_BISECTIONS` | `lagna.py:26,28` | algorithmic | yes |
| `TITHI_SPAN`, `NAKSHATRA_SPAN`, `YOGA_SPAN`, `KARANA_SPAN` | `panchanga.py:25–28` | **definitional** (12° *is* a tithi) | **no** — not corrections |
| `round(jd, 9)` | `engine.py:201` | memo-key granularity (86.4 µs ≈ 0.17″ of Moon) | **no** — cache, not value |
| `0.02` snap radius | `panchanga_cache.py:217` | cache bucketing | **no** — see below |
| `GAURISHANKAR_MERIDIAN`, `REFERENCE_LATITUDE` | `solar_corrections.py` | **cultural/display** | **no** — Phase 7 |
| Nepal tz-era offsets | `timescale.py:38–40` | **cultural** | **no** — Phase 7 |

> **Amendment to my Phase 2 plan:** I had listed `cache_snap_radius_deg` (`0.02`) for
> promotion into provenance. On inspection it belongs to **cache bucketing**, not astronomy
> — it decides which observers share a cache row, never what a number is. Including it
> would make the environment hash move when a caching policy changed. **Recommend
> excluding it** (promoting it to a named constant is still worthwhile hygiene, just not
> as provenance).

---

## 5. Database and cache stores — the plan had the wrong database

### 5.1 Store survey

| Store | Backing | Keyed by | Can hold a column? |
|---|---|---|---|
| `panchanga_cache` | **SQLite** `data/panchanga.db` | `(location_key, date)` | **yes** |
| `kundali_report_cache` | **SQLite** `data/kundali.db` | `cache_key` (incl. ayanamsha) | yes — deferred to Phase 4 |
| `response_cache` | gzip files, `cache/response/` | version in **filename** | no |
| `year_cache` | gzip files, `cache/year/` | version in **filename** | no |
| `blob_db_cache` | Postgres via SQLAlchemy | key embeds version token | possible, out of scope |

Only **two** SQLite cache stores exist. The file-backed stores cannot take a column without
renaming every file — which *is* invalidation, forbidden by the brief's rule 7.

### 5.2 Corrections to my plan

**The live DB is `data/panchanga.db`, and it is 1.13 GB — not the 3.1 MB I stated.**

| | |
|---|---|
| `panchanga_db_path()` resolves to | `data/panchanga.db` (`DATA_DIR = PROJECT_ROOT/"data"`) |
| Size | **1,125,179,392 bytes (1.13 GB)** |
| Rows | **18,083** |
| Avg `payload_json` | **54.3 KB/row** |
| Free pages | **0%** — genuinely 1 GB of live JSON |

My plan said "the committed `engine/data/panchanga.db` (3.1 MB) is migrated by the same code
path". **That file is tracked in git but unreachable by any code path** — grep finds no
reference to `engine/data`. It is a dead artifact from before `DATA_DIR` moved. Reporting,
not fixing: deleting a tracked 3.1 MB binary is a separate decision, and it is not Phase 2's.

### 5.3 Migration cost — measured, not assumed

On a synthetic DB with the same row count and payload profile (SQLite 3.37.2):

| Operation | Time | Size change |
|---|---|---|
| `ALTER TABLE … ADD COLUMN provenance_hash TEXT` | **0.0006 s** | none |
| `CREATE INDEX … ON (provenance_hash)` | **0.255 s** | none |
| Pre-existing rows left `NULL` | 18,083 | no rewrite |

`ADD COLUMN` with no `DEFAULT` is a metadata-only operation in SQLite — O(1) regardless of
the 1.13 GB. The migration is safe at real scale. Confirmed additive, nullable, indexed, no
data rewrite, rollback-inert.

### 5.4 A scale datapoint for later phases

54.3 KB per cached day, per location. The roadmap's Phase 8 target of ~9.4 M days implies
**~500 GB per location** in the current payload-cache design. This is not a Phase 2 problem,
but it is hard evidence for the roadmap's W6 argument that the snapshot layer must store raw
astronomy rather than rendered payloads.

---

## 6. Version separation — confirmed appropriate

No change to my plan's §6. `ASTRONOMY_VERSION` answers *"did an output change?"* (human
judgement, invalidates); `provenance_hash` answers *"what produced this?"* (machine
observation, records). A pyswisseph patch release changes the hash but may change no number
— gating on it would force a rebuild for zero numerical difference.

**No new manual counter is introduced.** The brief's rule is satisfied.

One item carried forward for visibility: a **sixth** version constant exists outside
`compose()` — `services/presentation/helpers.ENGINE_VERSION = "2.2.0"`. It is a presentation
version; flagged, not touched.

---

## 7. Phase 1 regression harness — currently outside the repository

The five-era byte-identical proof exists only as scratchpad files
(`capture_baseline.py`, `baseline_before.json`, 452,602 bytes). `tests/data/` contains only
`golden_astronomy_services.json`.

**This is the strongest guarantee in the programme and it is one `rm` from gone.** It covers
2026-06-10 Kathmandu, 2026-06-10 Jhapa, 1930-03-15 (IST era), Julian 1500-06-10, and 57 BCE.

**Recommend promoting it to `tests/` as commit 1**, ahead of everything else — see §8.

---

## 8. Recommended adjustment to the commit order

The brief specifies: C1 provenance object → C2 constants → C3 ΔT/ephemeris → C4 harness →
C5 column → C6 cache → C7 docs.

Two adjustments, both small:

**(a) Move the harness to commit 1.** It is test-only, zero-risk, and it is the regression
net every later commit is verified against. Promoting it *after* three production commits
means those three are checked by a proof that lives in a temp directory.

**(b) Constants before the provenance object.** The brief has the provenance object first,
but §4.1 shows two of its inputs (`attemp`, dip coefficient) are still inline literals. The
object cannot import what does not exist as a name, so its hash would necessarily change in
C2 — a self-inflicted instability in the field the whole phase is about.

Proposed order (same seven commits, two swapped):

| # | Commit | Risk |
|---|---|---|
| 1 | Promote byte-identical harness into `tests/` | none |
| 2 | Correction constant cleanup (incl. `attemp`/`atpress`/dip) | low — value-neutral |
| 3 | `EnvironmentProvenance` object + astronomy accessors | low — inert |
| 4 | ΔT probes + ephemeris inventory integration | low — inert |
| 5 | DB column + migration ⚠️ **stop-and-report point** | medium |
| 6 | Cache integration + startup drift detection | low |
| 7 | Documentation | none |

If you prefer the brief's order exactly, say so — the only cost is that the hash is not
stable until commit 2, which is harmless while nothing persists it (persistence is C5).

---

## 9. Assumptions invalidated

Reported per the standing rule. **None of these change the phase's shape; two change its
content.**

| # | Assumption | Reality | Impact |
|---|---|---|---|
| 1 | `swe.version()` is callable (brief) | `str` attribute; calling raises `TypeError` | trivial — read, don't call |
| 2 | Correction-constant list was complete (my plan §4.3) | **Missed `attemp=0.0` / `atpress=0.0`** — refraction at 0 °C, worth ~42 s | **content change**: two constants added |
| 3 | `cache_snap_radius_deg` belongs in provenance (my plan §4.3) | It is cache bucketing, not astronomy | **content change**: removed from provenance |
| 4 | Live DB is `engine/data/panchanga.db`, 3.1 MB (my plan §5.2) | Live DB is `data/panchanga.db`, **1.13 GB / 18,083 rows**; the tracked 3.1 MB file is unreachable | migration reasoning re-verified at real scale — still safe |
| 5 | ΔT is "entirely implicit" (roadmap W3) | swisseph exposes a full ΔT API | roadmap W3 to be corrected in C7 |
| 6 | Roadmap W3's ΔT magnitudes | measured 2.94 h / 7.09 h / 20.9 h vs stated ~2.7 / ~7.5 / ~19 | roadmap table to be replaced with measured values |

**Confirmed unchanged:** the two-tier model, ayanamsha exclusion, hash-recorded-not-keyed,
`ASTRONOMY_VERSION` retention, full-content hashing, additive-nullable migration, and the
cultural-constant exclusion. The plan's architecture survives investigation intact.

---

## 10. Open question for you

**Is `attemp = 0.0` (0 °C) intentional?**

It is undocumented, it is not the ISA standard 15 °C, and it moves every sunrise and sunset
in the system by ~42 seconds relative to that standard. It may well be deliberate — matching
a published Nepali panchang table, as the sea-level altitude decision was — or it may be an
unexamined default that has simply never been questioned.

**Phase 2 does not need the answer.** It records the value either way, and recording it is
precisely how the question becomes answerable later.

I raise it now for two reasons: it is the same shape as the Phase 1 `ALT_KATHMANDU` hazard
(an unexplained constant with real numerical consequence, sitting where the next reader will
"fix" it), and the named constant introduced in commit 2 should carry a comment that says
either *"deliberate, matches X"* or *"inherited default, unvalidated — see Phase 6"*. I will
write the second unless you tell me it is the first.

---

**Investigation complete. No code changed. Awaiting approval to begin commit 1.**
