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
| **Festivals & Sait** | core | Which festival, holiday or auspicious date falls on a day, by tradition | `engine/festivals/`, `rules/` · `services/festivals/` | `domain/festivals/` |
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
| **infrastructure** | `services/<context>/*_db.py`, `*_cache.py`, `*_store.py`, `services/platform/` | `packages/api-client` | domain (to implement its ports) |
| **read models** | — | `packages/read-models` | domain, `import type` from api-client |
| **interface** | `api/`, `app/routers/`, `services/panchanga/presentation/` | `packages/ui`, `packages/design-tokens`, `apps/*` | everything below |
| **composition root** | `app/wiring.py`, `app/startup.py`, `app/response_cache.py` | — | everything |

What each rule is and what enforces it:

| Rule | Enforced by |
|---|---|
| `engine/` imports nothing from `services/`, `app/`, `api/`, `database/`, nor a web/DB/cache library | `apps/api/tests/test_layer_dependencies.py` |
| No context imports a downstream one (engine and services alike) | `apps/api/tests/test_context_map.py` |
| `packages/domain`: plain TS, no React/platform APIs, **no API types**, no class-name helpers | `npm run lint -w @vedic-patro/domain` |
| `packages/read-models`: plain TS over domain + API types only | `npm run lint -w @vedic-patro/read-models` |
| `packages/features`: only React, React Query and the shared packages | `npm run lint -w @vedic-patro/features` |

CI runs all of them (`.github/workflows/ci.yml`: the `check` job's lint, and the
`api-architecture` job).

### Where new code goes

- A calculation (API) → `engine/<context>/`. If it needs stored data, declare a
  `Protocol` there and plug the store in from `app/wiring.py`.
- A use case: load, cache, combine contexts → `services/<context>/`.
- Frontend logic over domain values → `packages/domain/src/<context>/`.
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

## 5. What is left

- **More value objects** (Phase 3 continues module by module): `PatroDay`,
  `Tithi`/`Nakshatra` as returned types, `Chart`, `DashaPeriod`, `Festival`. About
  240 engine functions still return dicts. The method stays the same: the engine
  returns the object, the payload is produced by `to_payload()`, and the 42-endpoint
  snapshot must not move.
- **Drawing geometry in `packages/domain`**: modules marked "Shared by
  apps/web/… and apps/mobile/…" (wheel, timeline and chart layout) are pure and
  obey every domain rule, but are presentation. They can move into `packages/ui`
  once the kit has a platform-neutral export.
- **The full API suite in CI** needs the ephemeris files and the city database
  in the runner (both are downloads today); until then CI runs the guards and
  the tests that need neither.
- **Merging `main` into `dev`**: files under `packages/domain` and `read-models`
  moved. After a merge, run `node scripts/monorepo-tools/domain-contexts.mjs` to
  rewrite any old flat import paths that came in (it is idempotent).

## 6. Existing issues found while checking (not changed here)

- `GET /v1/panchanga/{bs_year}/{bs_month}?clock=HH:MM` returns 500:
  `services/panchanga/panchanga_at_time.instant_row_from_date` reads
  `snap["vaara"]`, which the at-time payload does not have.
- `engine/jyotish/shanti_recommendation.py` iterates a `set` of graha names, so
  the order of shanti findings varies between processes (`PYTHONHASHSEED`).
- The web's `/reset-password` and `/verify-email` read `window` while server
  rendering, so they always fall back to client rendering.
