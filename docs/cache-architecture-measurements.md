# Cache architecture — measurements

**Phase 8.** Status: measured. **No migration performed**, per the instruction not to
migrate unless measurements justify it. They do not — but not for the reason expected.

---

## 1. What is actually stored

`data/panchanga.db`, the live cache:

| | |
|---|---|
| Rows | 18,083 |
| Distinct locations | 38 |
| File size | 1.13 GB |
| Payload total | 1,005 MB |

Payload size is **tightly distributed** — this is not a long-tail problem:

| Percentile | Size |
|---|---|
| p10 | 43.1 KB |
| **p50** | **56.6 KB** |
| p90 | 58.5 KB |
| p100 | 62.0 KB |
| mean | 54.3 KB |

## 2. Where the 57 KB goes

Composition of a median row:

| Block | Size | Share |
|---|---|---|
| `muhurta` | 9.1 KB | 16.0% |
| `hora` | 6.3 KB | 11.1% |
| `lagna_spans` | 5.5 KB | 9.7% |
| `udaya_lagna` | 5.0 KB | 8.7% |
| `nivas_shool` | 4.6 KB | 8.0% |
| `panchaka_rahita` | 4.0 KB | 7.1% |
| `tarabala_table` | 3.4 KB | 6.0% |
| `choghadiya` | 3.3 KB | 5.9% |
| `planets` | 2.1 KB | 3.6% |
| `tarabalam` | 1.5 KB | 2.7% |

Grouped:

| | Size | Share |
|---|---|---|
| Raw astronomy | 13.4 KB | **23.6%** |
| Derived / presentation | 43.6 KB | **76.4%** |
| **Location-independent** | **2.5 KB** | **4.4%** |

## 3. The roadmap's premise does not survive this

Roadmap W6 and Phase 8 both propose separating astronomy snapshots from calendar results so
that **"the same astronomy can serve multiple locations."**

**Measured, that saves 4.4%.**

Only `planets`, `ayanamsa`, `jd_ut`, `moon_phase` and the solar rashi/nakshatra labels are
location-independent — 2.5 KB of a 57 KB row. Everything expensive is *location-dependent
by nature*: muhurta, hora, lagna spans, udaya lagna, choghadiya and panchaka all derive from
**sunrise**, which is the whole point of a per-observer panchanga.

So the sharing argument, which is the stated motivation for the snapshot tier, is worth
about one part in twenty-three.

### What the measurement does show

**76% of every row is *recomputable* from the other 24%.** The storage cost is not
duplicated astronomy; it is materialised derivation. A snapshot tier storing only the ~13 KB
astronomy core and regenerating the derived blocks on read would cut storage ~4×.

But that trades storage for CPU **on every read**, which is what the cache exists to avoid.
That is a different architecture with a different justification, and it should be argued on
read-latency and cost, not on the sharing claim that motivated it.

## 4. Extrapolation to the 25,772-year goal

At the measured 54 KB/day mean:

| Scope | Storage |
|---|---|
| 1 location, full precession cycle (9.4M days) | **0.52 TB** |
| 38 locations (today's count) | **19.9 TB** |
| Location-independent part, stored once | 0.024 TB |

19.9 TB is a real problem. **But nothing requires it.** The 25,772-year figure is the
*calculation* range — the engine must be able to compute any day in it, which it can — not
a *caching* requirement. Caching a full precession cycle for 38 cities is not a use case
anyone has asked for; the working set is a few decades around the present, which is what the
18,083 rows already are.

## 5. Verdict

**Do not migrate.** Reasons, in order:

1. **The stated benefit is 4.4%.** The sharing premise does not hold.
2. **The real inefficiency (76% materialised derivation) has a different fix** — regenerate
   on read — with a different tradeoff that needs its own justification.
3. **Current scale is comfortable.** 1.13 GB, tight size distribution, no growth pressure.
4. **Provenance already provides the audit and selective-invalidation capability** the
   snapshot tier was also meant to deliver (Phase 2).

### When to revisit

Concrete thresholds, so this is a decision rather than an omission:

| Trigger | Why it changes the answer |
|---|---|
| Cache exceeds ~50 GB | Operationally awkward to back up and ship |
| Locations exceed ~500 | Per-location duplication of the 76% starts to dominate |
| A product need to cache >100 years for many cities | The extrapolation stops being hypothetical |
| Read latency becomes the constraint rather than storage | Inverts the storage-vs-CPU tradeoff |

None currently hold.

## 6. Cheaper wins — #1 SHIPPED

1. **Compression — DONE.** `payload_json` now stores gzip level 6, transparently.

   | | |
   |---|---|
   | Measured on 400 real payloads | **6.14×** |
   | Live cache | 1005 MB → **~164 MB** |
   | Compress | 0.70 ms/row (write path) |
   | Decompress | **0.051 ms/row** (read path) |

   **6.14× from a codec against 1.04× from the architecture change the roadmap
   proposed**, with none of the risk. No migration, no data rewrite, no version bump:
   SQLite's dynamic typing lets gzip bytes sit in the TEXT column as a BLOB, and
   `_decode_payload` branches on type, so pre-existing plain-text rows keep working
   indefinitely and a rollback leaves every unrewritten row readable.
2. **Drop `hora` and `choghadiya` from storage** (17% combined) — both are pure functions of
   sunrise and sunset, which are already in the row, so they are the cheapest possible
   regeneration.
3. **Prune by provenance.** Now possible via the Phase 2 column:
   `DELETE FROM panchanga_cache WHERE provenance_hash = '<superseded>'`.

Each is independently shippable and reversible; none changes the architecture.
