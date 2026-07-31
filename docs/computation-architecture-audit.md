# Panchanga computation architecture — audit & migration plan

Audit of `nepali-holiday-api` @ `562c1f3`. 84 HTTP endpoints, ~41k LOC Python.

## Migration status

| Phase | State |
|---|---|
| 0 — lock behaviour with twin-equivalence tests | **done** — `tests/test_era_twin_equivalence.py` (21 tests) |
| 1 — one retrograde definition | **done** — `engine/astronomy/motion.py`, `tests/test_motion.py` (27 tests) |
| 2 — JD-keyed services introduced, facades delegating | **done** — services written, `positions.py` delegating, Moon phase shipped |
| 2b — migrate the ~56 `positions`/`swiss_eph` importers | **done** — both files deleted; `tests/test_computation_services.py` (116 tests) now pins the services against golden values captured from the pre-refactor modules |
| 3 — era-twin elimination | not started |
| 4 — cache-version unification | not started |
| 5 — housekeeping | not started |

**Two live bugs found so far, both by the migration scaffolding rather than by a bug
report** — see A0 and A0b. Suite: 609 passing, plus 3 pre-existing failures in
`tests/test_panchanga_cache.py` (missing SQLite table in the test environment, unrelated and
failing identically before these changes).

### Services now in place

| Service | File | Owns |
|---|---|---|
| `MoonService` | `engine/astronomy/moon.py` | longitude, **latitude**, speed, declination, elongation, **phase**, **illuminated fraction** |
| `SunService` | `engine/astronomy/sun.py` | longitude, speed, declination, RA, equation of time, sunrise, sunset |
| `PlanetService` | `engine/astronomy/planets.py` | positions, speed, retrograde (delegates to `motion`), motion labels, `spashta_table` |
| `PanchangaService` | `engine/astronomy/panchanga.py` | tithi, nakshatra, yoga, karana, vara, elongation |
| `RashiService` | `engine/astronomy/rashi.py` | rashi of a longitude, surya/chandra rashi, ritu, ayana |
| `LagnaService` | `engine/astronomy/lagna.py` | ascendant longitude, rising sign, next sign boundary |

All are JD-keyed, all expose module-level singletons (`moon_service`, `sun_service`,
`planet_service`, `panchanga_service`). `AstronomyEngine` gained `phenomena()` — the only
`swe.pheno_ut` call in the codebase — to support Moon phase.

**Bold** entries did not exist before: Moon latitude was computed by `_calc` and discarded,
and there was no Moon-phase computation anywhere in the backend.

---

## A0. Live bug found and fixed: rise/set off by one day on the civil path

`AstronomyEngine._rise_set` (CE, `datetime.date`) started its Swiss search at **local
midnight** of the requested day. `AstronomyEngine._rise_set_civil` (BCE-safe, `CivilDay`)
started at `civil.to_jd_ut() - 0.5` — **12:00 UT** — ignoring the observer's timezone. The
comment called this "standard Swiss practice"; the docstring on `_rise_set` claimed the two
"agree to 0.0s on CE days". Neither was true.

East of Greenwich the civil window opened early enough to catch the *previous* day's event
and return it as this day's. Measured over 2026 at Kathmandu (+05:45), on the civil path:

| Query | Wrong |
|---|---|
| sunrise | 0 / 365 |
| **sunset** | **246 / 365 (67%)** |
| **moonrise** | **94 / 365 (26%)** |
| **moonset** | **88 / 365 (24%)** |

Sunrise was never affected — it falls after both anchors — so the BCE panchanga day anchor,
and every anga hanging off it, was correct. The damage was confined to sunset and
moon rise/set, and to anything derived from them: the चन्द्र तारा अस्त windows in
`graha-asta` were reported a day short.

Fixed in `engine/astronomy/engine.py` by anchoring the civil search at local midnight too
(`_utc_offset_days`), using the real zone offset for CE days and the zone's modern standard
offset for BCE days — the same approximation `local_wall_instant` already makes. Verified
at 0 mismatches across 2,672 rise/set pairs spanning Kathmandu, New York, London, Auckland
and Kolkata.

**This is exactly the class of bug the migration exists to prevent**, and it is the
strongest argument for phase 3: it survived because the two paths were separate code.

⚠️ **Cached payloads written before this fix contain the wrong sunset / moonrise / moonset
for pre-1943 and BCE days.** Phase 4 (cache-version unification) should be pulled forward,
or the affected caches purged.

---

## A0b. Second live bug: BCE vara was one day early

`local_weekday_py_from_jd` (`engine/astronomy/ut_instant.py:322`) computed
`int((local_jd + 0.5) % 7)` and then rotated it by `+6 mod 7`, commented as "UT civil
weekday (Sun=0) → Python Mon=0". The rotation was wrong: `int(jd + 0.5) % 7` is the Julian
Day Number's residue, which **already** lands Monday on 0 — the same identity
`CivilDay.weekday()` relies on and documents as verified across 1900–2100. The extra
rotation put every weekday one day early, on all inputs.

Reached only from `engine/vedic/daily.py:205`, which is the `UtInstant` branch — so the
effect was confined to pre-1 CE days, where **the vara was consistently one day early**,
along with everything keyed off it (muhurta weekday vetoes, Choghadiya, Hora).

Found by wiring `PanchangaService.vara` through it in phase 2: two existing tests
(`test_vivah_rejects_saturday`, `test_at_time_snapshot_includes_upagrahas`) went red
immediately. Fixed in `ut_instant.py`; verified 0 mismatches across 4,800 instants in five
timezones.

Two further precision notes surfaced while fixing it, both left alone deliberately:

- `local_weekday_py_from_jd` reads its UTC offset from a fixed June-2000 reference, so a
  DST zone is up to an hour off. Harmless for its only caller (BCE has no DST), so
  `PanchangaService.vara` takes the real per-date offset instead rather than changing the
  shared helper.
- `AstronomyEngine.datetime_from_jd` **truncates** fractional seconds rather than rounding,
  so a JD round-trip can land 1 s early — enough to roll the civil date back at exactly
  local midnight. `vara` therefore derives the weekday from JD arithmetic and uses the
  datetime only to read the zone offset. Fixing the truncation itself would shift every
  timestamp in every payload by up to a second; that belongs in phase 5 with its own
  snapshot review, not buried in this one.

---

## 0. Headline: the premise is mostly already true

The brief assumes routes recompute astronomy independently and that Moon phase / Tithi /
Nakshatra formulas exist in several places. **Measured against the code, they don't.**

| Claim to check | Reality |
|---|---|
| Routes implement astronomy | **No.** All 84 handlers delegate. The heaviest (`api/patro.py`) contains zero ephemeris math — it does era decoding, cache-key construction, and calls one `build_*`. |
| Raw `swisseph` scattered | **No.** `swe.*` appears in 6 non-test files; 33 of 37 calls are inside `engine/astronomy/`. 2 genuine leaks (see D1). |
| Tithi computed in many places | **No.** `elongation → index` exists once, `engine/astronomy/positions.py:79`. |
| Nakshatra / Yoga / Karana duplicated | **No.** Once each: `positions.py:95 / :104 / :114`. |
| Sunrise duplicated | **No.** One `_rise_set` in `engine/astronomy/engine.py:649`, memoized. |
| Two pages can disagree for the same JD | **Possible — but not from duplicated formulas.** See B. |

`AstronomyEngine` (`engine/astronomy/engine.py:125`) is already the single ephemeris
owner, with an LRU memo on `(body, jd, sidereal, ayanamsa)` and a second memo on rise/set
geometry. The comment at `engine.py:160` notes a single daily build asks for the same
sunrise ~11×, and that this is absorbed by the cache.

**So the service-extraction project you're describing is ~70% done.** What follows is an
audit of the remaining 30% — which is *not* where you expected it.

---

## A. What is genuinely duplicated

### A1. Era-variant builder fan-out — the real problem (high severity)

CE dates travel as `datetime.date`; pre-1 CE dates travel as `CivilDay` (proleptic, from
`engine/astronomy/jd_calendar.py`). Because the two types are incompatible, **every builder
that touches a calendar day has been forked into twins**:

| CE builder | Non-CE / AD twin | File |
|---|---|---|
| `build_gochar_response` | `build_gochar_response_civil` | `engine/vedic/gochar.py:867 / :779` |
| `build_gochar_ingress_range` | `build_gochar_ingress_range_civil` | `gochar.py:637 / :727` |
| `build_graha_sthiti` | `build_graha_sthiti_civil` | `graha_detail.py:234 / :254` |
| `_build_graha_asta_for_range` | `_build_graha_asta_for_civil_range` | `graha_detail.py:533 / :565` |
| `_build_graha_vakri_for_range` | `_build_graha_vakri_for_civil_range` | `graha_detail.py:629 / …` |
| `build_graha_asta_year` | `build_graha_asta_ad_year` | `graha_detail.py:514 / :523` |
| `build_eclipse_year` | `build_eclipse_ad_year` | `graha_detail.py:710 / :721` |
| `build_panchak_bs_year` | `build_panchak_ad_year` | `panchak_calendar.py:230 / :238` |
| `build_udayast_range` | `build_udayast_range_civil` | `udayast.py:164 / :208` |
| `build_daily_panchanga` | `build_daily_panchanga_civil` | `daily.py:388` / `daily_civil.py:78` |
| `build_daily_state` | `build_daily_state_civil` | `panchanga_api.py:191 / :277` |
| `build_month_calendar` | `build_month_civil_skeleton` / `build_ad_month_calendar` | `panchanga_api.py:509 / :457 / :580` |
| `build_panchanga_at_time` | `build_panchanga_civil_day` | `at_time.py:260 / :372` |

`_build_graha_asta_for_range` and `_build_graha_asta_for_civil_range`
(`graha_detail.py:533–590`) are near-identical text — same `tz` setup, same
`_planet_asta_periods`, same `sort_key` closure defined twice verbatim, same return dict.
The **only** difference is `build_udayast_range` vs `build_udayast_range_civil`.

**This is where a JD can produce two answers.** Fix a bug in the CE path and the BCE path
silently keeps the old behaviour. The `_civil` twins are also demonstrably behind: the CE
`build_gochar_response` supports `include_upcoming` slow-graha logic that the `_civil` twin
reimplements separately.

**You already have the fix, and it is already in the repo.**
`nepal_graha_vakri_year` (`api/patro.py:456`) is documented in-tree as the reference
implementation: `EraMiddleware` resolves `era` + `year` → JD span, the handler passes
`(jd_start, jd_end)` to `build_graha_vakri_span` (`graha_detail.py:592`), which converts to
`CivilDay` internally and serves all four eras from **one** body. That pattern generalises
to every row of the table above.

### A2. Two parallel datetime facades over one engine (medium)

Both wrap `default_engine`, both take `datetime`, both are widely imported:

| Module | Purpose | Importers |
|---|---|---|
| `engine/astronomy/positions.py` | angas, rashi, lagna, ritu | 26 |
| `engine/astronomy/swiss_eph.py` | "compatibility shim" (its own docstring) | 30 |

Four symbols are defined in **both**: `get_julian_day`, `get_sun_longitude`,
`get_moon_longitude`, `get_sun_moon_positions`. They currently agree (both forward to
`default_engine`), so this is latent rather than active drift — but a caller reading
`swiss_eph.get_sun_longitude` has no way to know `positions.get_sun_longitude` exists, and
the default-argument surfaces already differ.

`swiss_eph.py` calls itself a shim that callers should migrate off. 30 modules did not.

### A3. Retrograde detection — 5 implementations ✅ **fixed (phase 1)**

`speed < 0` was inlined in five places, only two of which knew the nodes are वक्री by
convention rather than by the sign of their speed:

- `engine/astronomy/swiss_eph.py:183` — `"is_retrograde": speed < 0`, then rahu/ketu
  overwritten to `True` afterwards
- `engine/vedic/graha_detail.py:211` — `bool(pos.get("is_retrograde", speed < 0.0))`
- `engine/vedic/gochar.py:300` — `spd < 0 or graha == "ketu"` (**ketu but not rahu**)
- `engine/vedic/gochar.py:503` — `return speed < 0.0`
- `engine/vedic/udayast.py:43` — `retrograde = speed < 0.0`

These agree today only because the engine uses `_MEAN_NODE` (`engine.py:109`), whose speed
is a constant −0.0530°/day, so the convention and the sign test coincide. `_TRUE_NODE` is
already defined at `engine.py:86`; the moment anything switches to it, the true node's speed
oscillates and the five sites split into two answers. Verified as latent, not live — 900
days sampled, rahu's speed never changes sign.

Now single-sourced in **`engine/astronomy/motion.py`** (`is_retrograde`, `motion_label`,
`motion_label_ne`), which owns three rules: nodes are always वक्री, Sun/Moon/Lagna never
are, everything else follows the sign. All five call sites migrated; payloads unchanged.
`tests/test_motion.py` pins the rules *and* greps the tree to fail if a sixth copy appears.

### A4. Sunrise: one algorithm, four entry points (low)

One implementation, but callers pick among:

| Entry | Call sites |
|---|---|
| `calculate_sunrise` | 41 |
| `calculate_sunrise_civil` | 16 |
| `calculate_sunrise_civil_next` | 9 |
| `nepal_patro_solar_event` | 6 |

Correct today, but picking the wrong one for a given day type is a live footgun, and it is
the mechanism that forces A1's twins to exist.

---

## B. Where two pages *can* actually disagree for one JD

Not from formula duplication. From these:

1. **Era-twin drift** (A1) — the dominant risk.
2. **Cache-layer skew.** Four independent caches: `services/response_cache.py`,
   `services/year_cache.py`, `services/panchanga_cache.py` (SQLite), `services/blob_db_cache.py`,
   plus disk payloads under `cache/`. Per `year-response-cache` / `year-wheel-payload-and-caches`
   memory, `CACHE_PAYLOAD_VERSION` must be bumped in lockstep. A partial bump serves an old
   Tithi from one endpoint and a new one from another **for the same JD** — indistinguishable
   from a computation bug.
3. **Anchor-instant divergence.** Sunrise-anchored (`graha-sthiti`, `gochar`) vs
   arbitrary-instant (`/panchanga/at-time`) vs civil-midnight builders answer honestly
   different questions. Not a bug, but it reads as inconsistency in the UI, and there is no
   declared anchor field in most payloads.

---

## C. What your brief asks for that does not exist at all

**`MoonService.phase` / illuminated fraction: zero hits backend-wide.** No `moon_phase`, no
`illuminated`, no `swe.pheno` call anywhere. If a Moon-phase page is rendering something,
it is either derived client-side from tithi or it isn't wired. This is *new work*, not a
refactor — and it's the one place where writing it once, in one file, is a free win because
nothing exists to migrate.

Same check for the rest of your proposed surface:

| Proposed | Status |
|---|---|
| `MoonService.longitude / latitude / speed` | longitude+speed exist (`engine.moon_longitude`, `_calc` returns speed). **Latitude is not exposed** — `_calc` discards `values[1]`. |
| `MoonService.phase / illuminated_fraction` | **Missing entirely.** |
| `SunService.longitude` | `engine.sun_longitude` |
| `SunService.declination` | `engine.equatorial_from_ecliptic:319` |
| `SunService.equation_of_time` | `engine.equation_of_time:420` |
| `SunService.sunrise / sunset` | `engine.rise / set` + 4 wrappers (A4) |
| `PlanetService.positions / speed` | `engine.all_planet_positions:301` |
| `PlanetService.retrograde` | **4 copies** (A3) |
| `PanchangaService.tithi/nakshatra/yoga/karana/vara` | one each, in `positions.py` |
| `EclipseService` | `engine.next_solar_eclipse / next_lunar_eclipse:473/:496` |
| `FestivalService` | `services/holiday_generator.py` — **already reuses** `get_udaya_tithi` (`:742`, `:773`), does not recompute |
| `ChoghadiyaService` | `engine/vedic/choghadiya.py` |

---

## D. Endpoint audit

All 84 endpoints, grouped. "Own math" = performs astronomy inline in the handler.

### `api/patro.py` — 14 endpoints

| Endpoint | Own math | Duplication | Owner service | Action |
|---|---|---|---|---|
| `GET /nepal/gochar/year/{bs_year}` | none | — | Gochar | none |
| `GET /nepal/patro/{bs_year}/{bs_month}` | none | — | Patro | none |
| `GET /nepal/patro/ad/{ad_year}/{ad_month}` | **date loop inline** (`:91–101`) | day loop duplicates `build_ad_month_calendar` | Patro | fold into `build_month_calendar` on a JD span |
| `POST /generate/panchanga/popular/{bs_year}` | none | — | Cache | none |
| `POST /generate/panchanga/{bs_year}` | none | — | Cache | none |
| `POST /generate/{year}` | none | — | Cache | none |
| `GET /nepal/gochar/ingress` | none | **routes to 2 twins** | Gochar | A1 merge |
| `GET /nepal/gochar/jd/{jd_ut}` | none | **3-branch fan-out to 2 twins**, branches 1&2 identical (`:262–293`) | Gochar | A1 merge; dead branch |
| `GET /nepal/gochar/{date_key}` | none | **2 twins** + inline `_civil_day_for_key` | Gochar | A1 merge |
| `GET /nepal/graha-sthiti/{date_key}` | none | **2 twins** + inline BS-triple parse (`:391–397`) | Planet | A1 merge |
| `GET /nepal/graha-asta/year/{year}` | none | **2 twins**, hardcoded AD range | Udayast | A1 merge → JD span |
| `GET /nepal/graha-vakri/year/{year}` | none | **none — reference impl** | Planet | ✅ template |
| `GET /nepal/eclipse/{kind}/year/{year}` | none | **2 twins** | Eclipse | A1 merge → JD span |
| `GET /nepal/panchak/year/{year}` | none | **2 twins** | Panchak | A1 merge → JD span |

Also: `1943 <= year <= 2090` is hardcoded in three handlers (`:436`, `:508`, `:539`) and
contradicts the documented BS 60–3000 range (`api-versioning-cdn-cache` memory). Should be
one constant.

### `api/panchanga.py` — 32 endpoints

| Group | Own math | Duplication | Action |
|---|---|---|---|
| `/panchanga/year/{y}`, `/year/{y}/sun` | none | — | none |
| `/panchanga/jd/{jd_ut}` | none | — | ✅ already JD-native |
| `/panchanga/{bs_year}/{bs_month}`, `/panchanga/ad/{y}/{m}` | none | BS vs AD month twins | merge on JD span |
| `/panchanga`, `/today`, `/{date_key}` | none | 3 handlers → `_panchanga_day_impl` | ✅ already shared |
| `_bce_day_payload:248` / `_day_payload_for_jd:275` | none | **era twins inside the route module** | move into service, A1 merge |
| `/festivals/*`, `/holidays/{year}`, `/nepal/holidays`, `/nepal/festivals*` | none | — | none |
| `/convert/ad-to-bs`, `/convert/bs-to-ad` | none | duplicates EraMiddleware's job | thin over `engine/calendar/era.py` |
| `/nepal/sait/*` (9) | none | — | none |
| `/nepal/panchanga/{date_key}`, `/month/…`, `/year/…` | none | presentation of same data | none |
| `/nepal/sankranti/*` (2), `/nepal/special-months`, `/calendar/header` | none | — | none |

### `api/kundali.py` — 11 endpoints

| Endpoint | Own math | Note |
|---|---|---|
| `/panchanga/at-time` | none | anchor differs from sunrise builders — declare it (B3) |
| `/planetary/positions` | none | **imports `swiss_eph` directly at route level** — only route that does; go via a service |
| `/seasons/tropical`, `/kundali/vimshottari`, `/kundali/report`, `/shadbala`, `/kundali/yogas/reference`, `/kundali/detail`, `/kundali/dasha/expand`, `/kundali/milan`, `/kundali/{date_key}` | none | clean; `kundali/detail` is the single source for React sections per `kundali-detail-endpoint-split` |

### `api/elements.py` (4), `api/cities.py` (6), `api/og.py` (2), `api/meta.py` (2)

No astronomy in handlers. `elements.py` correctly routes everything through
`services/element_api.py` → `element_boundaries.py`. No action.

---

## E. Target architecture

Do **not** introduce a new `services/` tree. You have a working layering already; the
target is to *complete* it, not replace it:

```
route (api/*)          era decode + cache key + one call     ← already true
  ↓
EraMiddleware          era ⇄ JD                              ← already exists
  ↓
JD-native builder      ONE per concept, no _civil twin       ← the work
  ↓
domain service         Panchanga / Planet / Moon / Sun       ← consolidate positions+swiss_eph
  ↓
AstronomyEngine        sole swisseph owner, memoized         ← already true
```

Concretely: `engine/astronomy/positions.py` + `engine/astronomy/swiss_eph.py` collapse into
JD-keyed services; `engine/vedic/*` builders lose their `_civil` twins by taking `jd`.

Signature rule (your requirement #4), stated precisely: **services take `jd: float` and
optionally `location: ObserverLocation`. `date`, `CivilDay`, and BS triples stop crossing
the service boundary.** `CivilDay` survives *inside* `jd_calendar.py` as a JD↔civil codec —
it just stops being a parameter type that forks call graphs.

---

## F. Migration plan — one service at a time, no API behaviour change

Ordered by (risk reduction ÷ blast radius). Each phase is independently shippable.

### Phase 0 — lock behaviour (prerequisite, ~half a day)

Golden-payload tests before touching anything. You have 56 test files but no cross-era
equivalence check.

For a fixed set of JDs — one modern, one pre-1943, one BCE, one BBS — snapshot every
endpoint's payload. Then assert the **twins agree**: `build_graha_sthiti(jd)` and
`build_graha_sthiti_civil(jd)` for a JD both can express must produce identical `rows`.
Where they don't, you've found a live bug before refactoring hides it.

Also add: for one JD, `tithi` from `/panchanga/{date}`, `/nepal/panchanga/{date}`,
`/panchanga/at-time`, and the month grid must match. This is the regression suite for the
inconsistency you're worried about.

### Phase 1 — `PlanetService.is_retrograde` (A3) — smallest possible first migration

One function, the station-flicker logic from `swiss_eph.py:206` as the single definition.
Replace the 4 sites. Proves the pattern with near-zero risk. **Expect payload diffs at
stations** — that's the bug being fixed; gate it behind the Phase 0 snapshots so you see
exactly which dates change.

### Phase 2 — merge `positions.py` + `swiss_eph.py` (A2)

Mechanical, no behaviour change:

1. Introduce JD-keyed `MoonService` / `SunService` / `PlanetService` / `PanchangaService`
   in `engine/astronomy/` — thin, calling `default_engine`.
2. Rewrite `positions.py` and `swiss_eph.py` as deprecation shims delegating to them
   (they already are shims in spirit — `swiss_eph.py`'s docstring says so).
3. Migrate the 56 importers in batches. Delete both files when empty.

Ship `MoonService.phase` / `illuminated_fraction` / `latitude` here (section C) — new code,
so there is nothing to keep consistent with.

#### How 2b actually went

Four batches, each behaviour-neutral against the full suite:

1. **Homes.** `rashi.py` and `lagna.py` are new — the name tables and the
   ritu/ayana/ascendant arithmetic had nowhere to go that wasn't a facade. The
   day-typed `calculate_sun*` / `calculate_moon*` entry points moved bodily into
   `sun.py` / `moon.py` (not collapsed — that is phase 5, and it needs phase 3
   first), and `get_all_planetary_positions` became `planets.spashta_table(jd)`.
2. **Leaf vedic modules** — import swaps, plus a fifth private copy of
   `RASHI_NAMES` found in `sankranti.py`.
3. **Vedic builders** — `daily`, `at_time`, `sait_rules`, `gochar`,
   `graha_detail`, `muhurta_engine`, `shadbala`, `udayast`.
4. **`api/`, `services/`, `scripts/`, `tests/`**, then both files deleted.

Two things worth carrying into phase 3:

- `PlanetService.position()` returns the *lean* dict. Latitude / RA / declination
  moved to `position_with_extras()`, because `planet_astro_extras` is not
  memoised and was costing two extra `calc_ut` calls per body on tables that
  only wanted a longitude.
- Use `position()["longitude"]`, not `longitude()`, where a value is compared
  against an orb: the former rounds to 6 decimals exactly as
  `get_planet_position` did.

### Phase 3 — era-twin elimination (A1) — the payoff

Per builder, in this order (easiest → hardest, and roughly least → most traffic):

1. `build_eclipse_year` / `_ad_year` → `build_eclipse_span(jd_start, jd_end, location)`
2. `build_panchak_bs_year` / `_ad_year` → `build_panchak_span(...)`
3. `build_graha_asta_year` / `_ad_year` + the two `_for_range` bodies → `build_graha_asta_span(...)`
4. `build_udayast_range` / `_civil` → `build_udayast_span(...)`
5. `build_graha_sthiti` / `_civil` → `build_graha_sthiti(jd, location)`
6. `build_gochar_response` / `_civil` → `build_gochar(jd, location)`
7. `build_gochar_ingress_range` / `_civil` → `build_gochar_ingress(jd_from, jd_to, ...)`
8. `build_daily_panchanga` / `_civil` → hardest; `daily_civil.py` already shares
   `_assemble_udaya_panchanga`, so the delta is only the sunrise prologue and BS labelling

Recipe per builder (copy `build_graha_vakri_span`):

- New `*_span` / `jd`-taking function containing the shared body, converting to `CivilDay`
  internally exactly once.
- Old twins become 3-line wrappers → JD → new function. **API behaviour unchanged.**
- Route switches to `era_context(request)` JD, dropping its era branching (compare
  `api/patro.py:456` — 20 lines — against `:305` — 63 lines, same job).
- Delete the wrappers once no caller remains.

Each of the 8 is a standalone PR with a green Phase-0 snapshot.

### Phase 4 — cache-version unification (B2)

Single `PAYLOAD_VERSION` constant that every cache layer (`response_cache`, `year_cache`,
`panchanga_cache`, `blob_db_cache`) derives its key from, so a computation change cannot be
half-deployed. Today this is a manual four-place bump and the highest-probability cause of
two pages disagreeing in production.

### Phase 5 — housekeeping

- Close the 2 swisseph leaks: `bikram_sambat.py:182` (`swe.revjul` → `jd_calendar`),
  and confirm `patro_year_axis.py` (comments only — no action).
- Collapse the 4 sunrise entry points behind `SunService.sunrise(jd, location)` once
  Phase 3 removes the reason for the civil variants.
- Replace the hardcoded `1943..2090` triple with the documented range constant.
- Add an explicit `anchor` field (`sunrise` / `instant` / `midnight`) to day payloads (B3).

---

## G. What not to do

- **Don't add a caching/memo layer** to the new services. `AstronomyEngine._calc` and
  `_rise_cache` already do this and are tuned (`_CACHE_MAX = 16384`, sized to a year of
  instants). A second memo would double memory for no hit-rate gain.
- **Don't move `swisseph` calls.** They are already correctly placed.
- **Don't rewrite `api/*`.** With Phase 3 done, the handlers shrink on their own.
- **Don't delete `CivilDay`.** It is the correct proleptic representation; it just needs to
  stop being a *parameter* type.
- **Don't touch `services/holiday_generator.py` for consistency reasons.** It already reuses
  `get_udaya_tithi`, which is precisely the pattern requirement #3 asks for.

---

## H. Estimated shape

| Phase | Files touched | Risk | Payload change |
|---|---|---|---|
| 0 snapshots | +1 test file | none | none |
| 1 retrograde | 5 | low | yes, at stations (a fix) |
| 2 facade merge | ~58 | low (mechanical) | none |
| 3 era twins | ~20, 8 PRs | medium | none if Phase 0 is green |
| 4 cache version | 5 | low | none (forces one cold rebuild) |
| 5 housekeeping | ~8 | low | additive only |

Net: roughly **−1,200 LOC** from twin elimination, **+300** for the new services and the
Moon-phase surface that doesn't exist yet.
