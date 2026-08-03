# Calculation identity vs provenance

**Phase 4.** Status: COMPLETE. One gap closed (`kundali_report_cache.provenance_hash`);
**no new abstraction built** — see §4 for why `CalculationIdentity` was not created.

---

## 1. Three questions, three answers

| Question | Answer lives in | Purpose |
|---|---|---|
| **"What calculation is this?"** — identity | the **cache key** | decides whether two requests are the same lookup |
| **"How was it computed?"** — provenance | `provenance_hash` **column** | explains a stored value; enables selective invalidation |
| **"Has the payload shape or rules changed?"** — version | `CACHE_PAYLOAD_VERSION` | forces recomputation |

These must not be mixed, and currently are not. Folding provenance into identity would
orphan every cached row whenever any dependency moved, including upgrades that change no
number. Folding identity into provenance would make the fingerprint vary per request and
destroy its use as a deployment marker.

---

## 2. The identity model that already exists

Phase 4 set out to *create* an identity model. Investigation found one already in place,
single-sourced and correct. Documented here rather than rebuilt.

### Location identity — one function

`services.panchanga_cache.resolve_cache_keys(location) -> (location_key, city_id)` is the
**single** definition of "same observer". It applies three rules in order:

1. An explicit `city_id` → `city:<id>` — everyone in a town shares one computation.
2. Coordinates within 0.02° of Kathmandu on the same timezone → `city:1283240`.
3. Otherwise → `ObserverLocation.cache_key()`, i.e. `lat_lon_timezone`.

Since Phase 1, a non-default `altitude` suffixes every branch (`…_alt1400.0`), because two
observers at one town's coordinates but different elevations see rise/set ~6.3 min apart.

`services.response_cache.location_cache_key` is **not** a second implementation — it
delegates to `resolve_cache_keys` and escapes `:` and `/` for filesystem paths. Verified
identical modulo that escaping across five observer kinds.

### Full calculation identity — composed per store

| Store | Identity | Why those fields |
|---|---|---|
| `panchanga_cache` | `(location_key, date)` | ayanamsha is **constant** on this path — `engine/vedic/daily.py` and `services/panchanga_api.py` never pass `ayanamsa=`, so every daily panchanga is Lahiri. Keying it would add a constant to every key. |
| `kundali_report_cache` | `birth_instant \| location_key \| ayanamsha \| lang` | ayanamsha **does** vary here — `api/kundali.py` accepts it as a query parameter on 5 endpoints. This is the complete model, and it was already right. |
| `response_cache`, `year_cache` | version + route + escaped location | HTTP response bodies; identity is the URL |
| `blob_db_cache` | mirrors the file caches | Postgres mirror of the same keys |

**The rule this encodes:** a parameter belongs in the key when it *varies* on that path.
Ayanamsha in the panchanga key would be dead weight; its absence from the kundali key would
be a correctness bug. Both are right today.

---

## 3. The gap Phase 4 closed

`kundali_report_cache` had no `provenance_hash` column — deferred from Phase 2 to keep that
phase's schema change to one table. Now added, matching `panchanga_cache`:

```sql
ALTER TABLE kundali_report_cache ADD COLUMN provenance_hash TEXT;
CREATE INDEX idx_kundali_report_cache_provenance ON kundali_report_cache(provenance_hash);
```

Additive, nullable, indexed, idempotent, no data rewrite. Measured on a copy of the real
`data/kundali.db`: 0.0015 s, rows preserved, existing rows `NULL`.

Both SQLite caches in the system now record what produced their rows. The file-backed caches
(`response_cache`, `year_cache`) cannot take a column without renaming every file — which
*is* invalidation — and they are derived from the SQLite rows, so their provenance is
recoverable from the layer below.

---

## 4. Why there is no `CalculationIdentity` class

The roadmap proposed a unified identity object covering location, calendar system,
ayanamsha, ephemeris environment and calculation parameters. **Not built**, for four
reasons:

1. **Ephemeris environment does not belong in identity.** That is provenance — Phase 2
   settled it, and the brief itself says not to mix them. Including it would recreate the
   invalidation problem provenance exists to avoid.
2. **The remaining fields are already composed correctly**, per store, by
   `resolve_cache_keys` + `make_cache_key`. There is one location-identity function, not
   several.
3. **A unified object would have one real client.** Only `api/kundali.py` varies ayanamsha.
   A class generalising over a single varying parameter is an abstraction with no second
   case to justify it.
4. **Phase 8 is the real client, and it does not exist yet.** A snapshot store keyed by
   identity would give this a purpose. Designing the key before the store exists means
   guessing at its requirements.

**Reopen when Phase 8 designs the snapshot store.** At that point identity has a concrete
consumer with concrete needs, and `resolve_cache_keys` is the function to promote.

Guarded by `tests/test_calculation_identity.py`, which fails if a second location-identity
implementation appears — the actual risk this phase was protecting against.

---

## 5. What Phase 4 produced

| | |
|---|---|
| New abstraction | **none** — the model existed and was single-sourced |
| Schema | `kundali_report_cache.provenance_hash` (additive, nullable, indexed) |
| Enforcement | `tests/test_calculation_identity.py` |
| Behaviour change | none |
| Cache invalidation | none |
