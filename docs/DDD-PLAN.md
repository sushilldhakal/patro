# Domain-driven design — context map and rules

One model per subdomain (a *bounded context*), each with its domain logic at the
centre and storage, caches, HTTP and UI outside it, and every dependency pointing
inward. This page says where code lives, which way it may depend, and how that
is enforced.

It sits beside, not over, `apps/api/docs/architecture-roadmap.md`. That roadmap
is about *what the engine computes* (provenance, ΔT, snapshots, traditions);
this one is about *where code is allowed to depend*. Its binding rules held for
every step here:

- **No computed value changed as a side effect of restructuring.** Each API step
  was checked with the full suite and a before/after snapshot of 42 endpoints
  (cold caches, fixed hash seed); each frontend step with both apps' typecheck,
  every package's lint and tests, the web CSS (byte-identical to `main`), the
  HTML of all 63 SSR paths, and a Metro bundle of the app.
- No URL, response field or status code changed, so installed mobile apps are
  not affected. `apps/api/contracts/openapi.json` is still up to date.

---

## 1. Bounded contexts

| Context | Kind | What it answers | API domain · application | Web/mobile |
|---|---|---|---|---|
| **Astronomy** | generic | Where is each body, when does the Sun rise, what is ΔT | `engine/astronomy/` | `domain/astronomy/` (sky3d, ayanamsha) |
| **Calendar** | core | Which BS / AD day is this, which era, which samvatsara | `engine/calendar/` | `domain/calendar/` |
| **Panchanga** | core | The five angas, the udaya day, muhurta, hora, choghadiya; lunar month, adhik/kshaya maas, Nepal Sambat | `engine/panchanga/` · `services/panchanga/` | `domain/panchanga/` |
| **Festivals & Sait** | core | Which festival, holiday or auspicious date falls on a day, by tradition | `engine/festivals/` (rule data in `rules/*.json`) · `services/festivals/` | `domain/festivals/` |
| **Jyotish** | core | Birth chart, vargas, dashas, strengths, gochar, rashifal, milan, guidance | `engine/jyotish/` · `services/jyotish/` | `domain/jyotish/` |
| **Vastu** | supporting | Zones, room placement, scoring | `engine/vastu/` · `services/vastu/` | `domain/vastu/` |
| **Geography** | supporting | Which city, which coordinates, which timezone | `engine/astronomy/location.py` (`ObserverLocation`) · `services/geography/` | `domain/geography/` |
| **Scripture & Learn** | supporting | Veda/Purana texts, shloka sources, learn articles | · `services/scripture/` | `domain/learn/` |
| **Identity & Profiles** | generic | Who is signed in, which birth profiles they saved | `engine/identity/` · `services/identity/` | `domain/identity/` |
| **Sharing** | supporting | Open Graph images, the daily Facebook post | · `services/sharing/` (downstream of the Panchanga) | |

Shared, not a context: `services/platform/` (blob, Redis and cache-metadata
stores, payload versions) is the API's shared kernel; `domain/locale.ts` and
`domain/vocabulary.ts` are the frontend's.

### Context map

Measured from the imports, then enforced (`tests/test_context_map.py`):

```
                      Astronomy
          ┌───────────┬───┴────────┬──────────┬───────────┐
          ▼           ▼            ▼          ▼           ▼
      Calendar      Vastu      Geography  Scripture   (Identity:
          │                                           depends on nothing)
          ▼
      Panchanga ──── FestivalCalendar port ◀─┐
          │                                  │
     ┌────┴─────┐                            │
     ▼          ▼                            │
 Festivals   Jyotish                         │
     └───────────────────────────────────────┘
```

Upstream contexts never import downstream ones. The Panchanga does not know a
festival exists; the Festivals context asks it for tithis and decides what they
mean. Where an upstream view still shows downstream data (the daily page lists
festivals), it asks through a port the composition root fills in:
`services/panchanga/festival_port.py`, implemented by
`services/festivals/festival_calendar.py`.

Lunar reckoning (lunar month, adhik/kshaya maas, Nepal Sambat) lives with the
Panchanga, not the Calendar, because it is built from tithis. The Calendar keeps
the solar BS calendar, eras and samvatsara.

---

## 2. Layers

| Layer | API | Web/mobile | May import |
|---|---|---|---|
| **domain** | `engine/<context>/` | `packages/domain` | upstream domain, stdlib, `swisseph` (Astronomy only), `three`/`healpix-ts` (frontend maths) |
| **application** | `services/<context>/` (use cases) | `packages/features` (one hook per page) | domain, ports |
| **infrastructure** | `services/<context>/*_db.py`, `*_cache.py`, `*_store.py`, `services/platform/`, `services/identity/{credentials,google_auth,apple_auth,facebook_auth,emailer}.py` | `packages/api-client` | domain (to implement its ports) |
| **read models** | — | `packages/read-models` | domain, `import type` from api-client |
| **drawing geometry** | — | `packages/drawing` | domain, `three` |
| **interface** | `api/`, `app/routers/`, `app/day_resolver.py`, `app/instant_resolver.py`, `app/era_middleware.py`, `services/panchanga/presentation/` | `packages/ui`, `packages/design-tokens`, `apps/*` | everything below |
| **composition root** | `app/main.py`, `app/wiring.py`, `app/startup.py`, `app/precompute_jobs.py`, `app/response_cache.py` | — | everything |

A router parses the request, calls **one** use case and maps its errors to
status codes (a domain error → 4xx; `LookupError` → 404). It does not query
tables, loop over domain data or build a payload itself.

What each rule is and what enforces it:

| Rule | Enforced by |
|---|---|
| `engine/` imports nothing from `services/`, `app/`, `api/`, `database/`, nor a web/DB/cache library | `apps/api/tests/test_layer_dependencies.py` |
| `services/` imports neither `app/` nor `api/` | same file |
| No router (`api/`, `app/routers/`) imports `sqlalchemy` | same file |
| `rules/` holds data only — the code that reads it is `engine/festivals/` | same file |
| No context imports a downstream one (engine and services alike) | `apps/api/tests/test_context_map.py` |
| The Astronomy layer holds no cultural (festival / tradition) logic | `apps/api/tests/test_engine_boundary.py` |
| No computed value moves as a side effect of a refactor | `apps/api/scripts/endpoint_snapshot.py --write` / `--check` (94 routes, caches off, fixed hash seed; keys sorted, so order alone is not a move). `--ordered` hashes the JSON as served — keys in their original order, volatile keys still removed — for both `--write` and `--check`. The default still sorts keys. |
| `packages/domain`: plain TS, no React/platform APIs, **no API types**, no class-name helpers | `npm run lint -w @vedic-patro/domain` |
| `packages/read-models`: plain TS over domain + API types only | `npm run lint -w @vedic-patro/read-models` |
| `packages/drawing`: plain TS over domain and `three` only | `npm run lint -w @vedic-patro/drawing` |
| `packages/features`: only React, React Query and the shared packages | `npm run lint -w @vedic-patro/features` |

CI runs all of them (`.github/workflows/ci.yml`: the `check` job's lint, the
`api-architecture` job, and `api-tests` — the whole API suite with the
ephemeris and city database fetched the way `scripts/deploy.sh` fetches them).

### Where new code goes

- A calculation (API) → `engine/<context>/`. If it needs stored data, declare a
  `Protocol` there and plug the store in from `app/wiring.py`.
- A use case: load, cache, combine contexts → `services/<context>/`.
- Frontend logic over domain values → `packages/domain/src/<context>/`.
- Drawing geometry (radii, sector paths, chart positions, timeline lanes,
  three.js scene objects) → `packages/drawing/src/<context>/`. Both the kit and
  the page hooks may read it.
- Frontend logic that reads an API response (`PanchangaDay`, `CalendarDay`, …)
  → `packages/read-models/src/<context>/`.
- A Tailwind class map → `packages/design-tokens/src/classes/`; `cn` is
  `@vedic-patro/design-tokens/cn`.
- A small closed vocabulary both sides speak (a tone, a period, a dignity) →
  `packages/domain/src/vocabulary.ts`; api-client re-exports it.

---

## 3. Ubiquitous language

Use these words in code, docs and UI copy, and don't invent synonyms.

| Term | Meaning | Not |
|---|---|---|
| **Patro day** | one day on the BS calendar axis, sunrise to sunrise for the angas | "date" alone (ambiguous between BS and AD) |
| **Civil day** | the proleptic Gregorian/Julian day, `CivilDay`, midnight to midnight | |
| **Udaya** | the value in force at local sunrise, the Nepali convention | "start of day" |
| **Anga** | one of the five limbs: tithi, vara, nakshatra, yoga, karana (`AngaState`) | "element" in new code (legacy `element_*` names stay) |
| **Observer** | `ObserverLocation`: lat, lon, altitude, IANA timezone | "city" (a city is one way to get an observer) |
| **Instant** | one UT moment (`ut_instant`), independent of era | |
| **Era** | `ad` / `bc` / `bs` / `bbs`, how a date is written, not when it is | |
| **BS date** | `BsDate(year, month, day)`; `str()` is `YYYY-MM-DD` | a bare `(y, m, d)` tuple in new code |
| **Occurrence** | one festival on the days it falls in one year (`FestivalOccurrence`); its identity is the festival *and* its start date | the festival id alone |
| **Dasha period** | one lord's span in a dasha system (`DashaPeriod`); sub-periods divide it in proportion to the cycle | |
| **Tradition** | a community's interpretation (Smarta/Vaishnava, Nepali default) | |
| **Kundali / chart** | the birth chart for an instant + observer | "horoscope" |
| **Profile** | a user's saved birth data (name, instant, observer) | |

---

## 4. What was done

| Phase | Outcome |
|---|---|
| **0 — Model** | This page; the engine guard test. |
| **1 — Dependency direction** | The engine stopped importing outward: the city lookup moved to `services/geography/observer_location.py`; the daily cache-aside and festival attachment to `services/panchanga/daily_panchanga.py`; the at-time / midnight panchanga to `services/panchanga/panchanga_at_time.py`; the kundali detail split into `engine/jyotish/kundali_detail.assemble_kundali_detail` + `services/jyotish/kundali_detail_api.py`; Vastu reads zone rules through a `ZoneRuleIndex` port. Private helpers used across modules became public. |
| **2 — Identity & Profiles** | `engine/identity/profiles.py` holds the rules (owner-only visibility, one default per user) and the `ProfileRepository` port; `services/identity/` has the use cases and the SQLAlchemy store; the routers only translate HTTP. Characterisation tests written first, against the old router, pass unchanged. |
| **3 — Value objects** | `BsDate` (`engine/calendar/bs_date.py`) and `AngaState` (`engine/panchanga/anga_state.py`), adopted at the boundary (convert endpoints, holiday ranges, `date_bs`, every day-state anga row). |
| **4 — Folders by context** | `engine/vedic/*` and `services/*` regrouped into the context folders above (also the roadmap's Phase 9: `engine/astronomy/{panchanga,lagna}.py` → `engine/panchanga/`). The edges that pointed downstream were fixed (combustion orbs → `engine/panchanga/asta.py` with a new `spashta` module; Devanagari digits → `engine/calendar/numerals.py`; the festival port; composition modules → `app/`). |
| **5 — Web and mobile** | `cn` and the class maps moved to design-tokens; the domain's vocabulary moved out of api-client; every API-shaped statement moved from `packages/domain` to the new `packages/read-models` (same paths); both packages grouped by context folder. |
| **6 — Enforcement** | The context-map guard; the stricter domain lint; the read-models lint; the `api-architecture` CI job. |
| **7 — Merge of `main`** | `main`'s festival work placed by context (below, §5). |
| **8 — Thin routers** | Every use case left the routers: festival / holiday listings (`services/festivals/festival_listings.py`), the AD month patro (`patro_generator.generate_ad_month_patro`), the Nepal day with holiday flags (`services/festivals/festival_day.py`), sait personalisation (`sait_personalize.personalize_for_birth`), the kundali report (`services/jyotish/kundali_report.py`), daily guidance's natal chart, the BS year summary, precompute (`services/panchanga/precompute.py`, `app/precompute_jobs.py`), scripture views (`services/scripture/document_views.py`), share copy (`services/sharing/share_copy.py`). Identity's account lifecycle (`engine/identity/accounts.py` rules + `AccountStore` port, `services/identity/accounts.py` use cases, `account_store.py`), devices and reminders (`engine/identity/reminders.py`, `services/identity/reminders.py`), with characterisation tests (`tests/test_auth_api.py`) written against the old router first. Pure request-free code left `app/`: date keys (`engine/calendar/date_keys.py`), instants (`engine/panchanga/instants.py`), the festival matcher (`rules/engine.py` → `engine/festivals/festival_rules.py`), provider adapters and the emailer (`services/identity/`). |
| **9 — Value objects** | `DashaSystem` / `DashaPeriod` / `DashaTimeline` / `sub_periods` (`engine/jyotish/dasha.py`, one model for Vimshottari, Tribhagi, Yogini and every view of them), `FestivalOccurrence` (`engine/festivals/occurrence.py`), `Tithi` (`engine/panchanga/tithi.py`, `tithi_at`), `PatroDay` (`engine/calendar/patro_day.py`, yielded by `iter_bs_month_days` / `iter_bs_year_days`). Each `*_dasha` / `calculate_tithi` / entry builder is the object's `to_payload()`, byte-identical. |
| **10 — CI** | The whole API suite runs in CI (`api-tests`). |
| **11 — Positions and one chart** | `BodyPosition` and `CelestialCoordinates` (`engine/astronomy/position.py`): the engine's `planet_position` / `all_planet_positions`, `PlanetService.position` / `position_with_extras` / `all_positions`, `MoonService.position` and `graha_positions` return a position; `planet_astro_extras` returns coordinates, `ascendant_astro_extras` coordinates and speed. Rashi, DMS, वक्री and the motion label are derived from the stored longitude and speed; Ketu is Rahu's `opposite()`. Callers that reason with a position (gochar, graha detail, muhurta, sait, samvatsara) read attributes; `spashta_table` stays the payload builder, each row `BodyPosition.to_payload()` plus `is_combust` (`spashta.is_combust`). The personal rashifal's `NatalChart` now holds the Jyotish `interpretation.Chart` plus the natal Ashtakavarga and reads its signs and degrees from it, so the report, shanti and the personal reading share one chart model. Both checked against the snapshot, and again with key order kept (the snapshot sorts keys): the served JSON is byte-identical. |
| **12 — Rashi placement and drawing geometry** | `RashiPlacement` (`engine/astronomy/rashi.py`): `rashi_service.surya` / `chandra` / `of_longitude` return it and `lagna_service.placement` gives the rising sign; callers that reason with the sign (Sankranti crossings in muhurta, nivas/shool and bhadra loka, Moon rashi spans, chandra vasa, sait rules and personalisation, the element API, the rashifal's lagna sign) read attributes, and the day pages put `to_payload()` in the response. `lagna_service.lagna` stays the lagna payload (callers re-anchor it and attach coordinates), built from the placement. Checked like phase 11. On the frontend, `packages/drawing` (`@vedic-patro/drawing`) is the one home for drawing geometry: `avakahada-wheel`, `kundali/bhava-bala-chart`, `day-timeline-layout`, `learn/ecliptic-wheel-geometry`, `learn/day-sim-geometry` (from the domain) and `vastu-purusha-wheel` (briefly in `packages/ui/src/geometry/`). It sits below the kit and the hooks because the hooks read it and may not import the kit. Web CSS byte-identical. |

## 5. What is left

- **Payload builders stay dicts, deliberately.** About 185 public engine
  functions are annotated to return a dict. Some 85 are payload builders —
  `build_graha_sthiti`, `build_choghadiya`, `build_eclipse_year`, … — whose
  *job* is the JSON a route returns; wrapping each in a class adds nothing. The
  rule is about domain concepts: a concept other code reasons with (a date, a
  tithi, a dasha period, a festival occurrence) is a value object with
  `to_payload()`; a response shape is not.
- **Small shared helpers in `packages/domain`** marked "Shared by apps/web/… and
  apps/mobile/…" that are not geometry stay there: `panchanga-wheel`
  (`bsMonthEnOf`), `panchanga-layout` (`rowLabel`), `ghati-clock`
  (`parseTimeToMinutes`), and the label, row and scene-data modules
  (`report-labels`, `gochar-rows`, `vastu-guna`, `panchanga-mode`, `sky3d/*`,
  `learn/kepler`, …). `kundali/north-indian-layout` (house polygons beside the
  rashi→house map) and `kundali/shadbala-chart` (scale and number formatting)
  also stay: domain modules (`dainikKranti/gapansha`, `gochar-display`) and
  `packages/read-models` read them, and neither may import `packages/drawing`.
- **Merging `main` into `dev`**: files under `packages/domain` and `read-models`
  moved, and the drawing geometry left the domain for `packages/drawing`. After
  a merge, run `node scripts/monorepo-tools/domain-contexts.mjs` to rewrite any
  old flat or domain import paths that came in, including those six modules
  (it is idempotent and skips `Pods/`, so an untracked `apps/mobile/ios` can stay).
  Then place new modules by context, not where rename detection put them.

## 6. Existing issues found while checking

Fixed on `dev`:

- `GET /v1/panchanga/{bs_year}/{bs_month}?clock=HH:MM` returned 500:
  `instant_row_from_date` read `snap["vaara"]` and `snap["sunrise"]`, but the
  at-time payload has `weekday` / `weekday_en` and `sun.sunrise` / `sun.sunset`
  (`tests/test_month_at_clock.py`).
- `engine/jyotish/shanti_recommendation.py` iterated `set`s of graha names, so
  the order of shanti findings — and, for Step 3(a), which trikona lord was
  named — varied with `PYTHONHASHSEED`. Now the Mahadasha lord precedes the
  Antardasha lord and the trikona lords run by house (`tests/test_shanti_order.py`).
- `GET /v1/nepal/patro/ad/{y}/{m}` returned 500 (arguments to
  `festivals_for_day` swapped in the router); `GET /v1/nepal/graha-vakri/year/{y}`
  returned 500 without `?era=` (`optional_era_context`); `GET /v1/nepal/holidays`
  for BBS / pre-60 years returned 500 (now empty with
  `unavailable_reason: pre_festival_era`, like `/nepal/festivals`)
  (`tests/test_patro_ad_and_vakri_routes.py`).
- An AD month straddling two BS years (every April) de-duplicated festivals by
  id alone, so `/v1/panchanga/ad/{y}/4` listed nothing on Baishakh 1; every
  merge now keys an occurrence by (id, start date).
- The kundali report rebuilt antardasha dates with a 360-day year after the
  Vimshottari engine moved to 365.2425 days, and started the first bhukti
  before birth: for a 1990 chart it ended Mercury's antardasha on 30 Dec 2026
  while the dasha tree said 24 Dec 2026. Both now come from the dasha model
  (`tests/test_dasha_model.py`).
- The web's `/reset-password` and `/verify-email` read `window` while server
  rendering, so they always fell back to client rendering; they read the token
  from the router's location now.

Still open: none known.
