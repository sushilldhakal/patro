# Domain-driven design — context map and migration plan

Where the code is going: one model per subdomain (a *bounded context*), each with
its domain logic at the centre and storage, caches, HTTP and UI outside it, and
every dependency pointing inward.

This sits beside, not over, `apps/api/docs/architecture-roadmap.md`. That
roadmap is about *what the engine computes* (provenance, ΔT, snapshots,
traditions); this one is about *where code is allowed to depend*. Its binding
rules still hold here, in particular:

- **No computed value changes as a side effect of restructuring.** Every step
  below must leave every payload byte-identical
  (`tests/test_byte_identical_payloads.py`, the golden tests).
- No rewriting `api/*` wholesale — handlers shrink as logic moves out of them.
- `swisseph` stays in the files that own it today.

Nothing here changes a URL, a response field or a status code, so installed
mobile apps are not affected. Shared `packages/*` changes reach users only
through a new build or an EAS update.

---

## 1. Bounded contexts

| Context | Kind | What it answers | Lives in today |
|---|---|---|---|
| **Astronomy** | generic | Where is each body, when does the Sun rise, what is ΔT | `engine/astronomy/*` (except the calendar maths below) |
| **Calendar** | core | Which BS / NS / AD day is this, and which era | `engine/calendar/era.py`, `engine/vedic/{bikram_sambat,bs_year,nepal_sambat,samvatsara}.py`, `engine/astronomy/jd_calendar.py`; web/mobile: `packages/domain/src/{bs-calendar,era,patro-*}.ts` |
| **Panchanga** | core | Tithi, nakshatra, yoga, karana, vara; muhurta, hora, choghadiya, rahu kaal | `engine/astronomy/{panchanga,rashi,lagna}.py`, `engine/vedic/{daily,tithi,muhurta*,hora,choghadiya,kaal,…}.py` |
| **Festivals & Sait** | core | Which festival, holiday or auspicious date falls on a day, by tradition | `rules/*`, `services/{holiday_generator,patro_generator,sait_*}.py`, `engine/vedic/sait_rules.py` |
| **Jyotish (Kundali)** | core | Birth chart, vargas, dasha, shadbala, yogas, milan, rashifal | `engine/vedic/{kundali_detail,vargas,vimshottari,shadbala,milan,rashifal*,…}.py`; `packages/domain/src/kundali/*` |
| **Vastu** | supporting | House-plan zones, room placement, scoring | `engine/vedic/vastu/*`, `services/vastu_*`; `packages/domain/src/vastu*.ts` |
| **Scripture & Learn** | supporting | Veda/Purana texts, shloka audio, learn articles | `services/{documents_db,purana_documents,shloka_sources}.py`; `packages/domain/src/learn/*` |
| **Geography** | supporting | Which city, which coordinates, which timezone | `services/cities_db.py`, `engine/astronomy/location.py` (`ObserverLocation`) |
| **Identity & Profiles** | generic | Who is signed in, which birth profiles they saved | `app/{security,*_auth}.py`, `app/routers/{auth,profiles}.py`, `database/*` |

### Context map

```
                 Astronomy
                     │  (open host: ObserverLocation, JD, positions)
                     ▼
                  Calendar
                     │
                     ▼
                 Panchanga ──────────────┬──────────────┐
                     │                   │              │
                     ▼                   ▼              ▼
             Festivals & Sait      Jyotish/Kundali    Vastu
                                         ▲
   Geography ── supplies ObserverLocation to every context
   Identity & Profiles ── shared kernel with Jyotish: birth data (date, time, place)
```

Upstream contexts never import downstream ones. Panchanga does not know a festival
exists; the Festivals context asks Panchanga for tithis and decides what they mean.

---

## 2. Layers inside a context

| Layer | Holds | May import |
|---|---|---|
| **domain** | value objects, entities, pure calculations, *ports* (`Protocol`s it needs filled) | the domain layer of upstream contexts, stdlib, `swisseph` (Astronomy only) |
| **application** | use cases: load, cache-aside, combine contexts, call the domain | domain, ports |
| **infrastructure** | SQLite/Postgres/Redis/blob caches, JSON loaders, external APIs | domain (to implement its ports) |
| **interface** | FastAPI routers, Pydantic DTOs, payload shaping | application |

Mapping onto today's folders, until Phase 4 moves files:

- `engine/` = **domain**. `rules/` = Festivals domain.
- `services/` = **application** + **infrastructure**, mixed (split in Phase 4).
- `api/`, `app/routers/`, `services/presentation/` = **interface**.
- `database/` = Identity infrastructure.

The rule that matters most, and the one the code broke: **`engine/` imports
nothing from `services/`, `app/`, `api/`, `database/`, nor any web, database or
cache library.** `tests/test_layer_dependencies.py` enforces it.

---

## 3. Ubiquitous language

Use these words in code, docs and UI copy, and don't invent synonyms.

| Term | Meaning | Not |
|---|---|---|
| **Patro day** | one day on the BS calendar axis, sunrise to sunrise for the angas | "date" alone (ambiguous between BS and AD) |
| **Civil day** | the proleptic Gregorian/Julian day, `CivilDay`, midnight to midnight | |
| **Udaya** | the value in force at local sunrise, the Nepali convention | "start of day" |
| **Anga** | one of the five limbs: tithi, vara, nakshatra, yoga, karana | "element" in new code (legacy `element_*` names stay) |
| **Observer** | `ObserverLocation`: lat, lon, altitude, IANA timezone | "city" (a city is one way to get an observer) |
| **Instant** | one UT moment (`ut_instant`), independent of era | |
| **Era** | `ad` / `bc` / `bs` / `bbs`, how a date is written, not when it is | |
| **Tradition** | a community's interpretation (Smarta/Vaishnava, Nepali default) | |
| **Kundali / chart** | the birth chart for an instant + observer | "horoscope" |
| **Profile** | a user's saved birth data (name, instant, observer) | |

---

## 4. Migration phases

Each phase ships on its own, keeps every payload byte-identical, and runs the
full API suite before merge.

### Phase 0 — Agree the model ✅
This document, plus `tests/test_layer_dependencies.py`, which fails when the
engine imports an outer layer.

### Phase 1 — Dependency direction (engine → nothing outward) ✅
Moved out of `engine/` whatever reached upward. Every payload stayed
byte-identical (a 42-endpoint before/after snapshot, plus the full suite).

| Was in the engine | Now |
|---|---|
| `bikram_sambat.parse_bs_date` asked `app.relative_day` about "today"/"tomorrow" | the key set lives in `engine/calendar/day_keys.py`; `app.relative_day` imports it |
| `location.resolve_location_from_query` looked up cities in `services.cities_db` | moved to `services/observer_location.py` (Geography application); the engine keeps the pure `resolve_location` |
| `daily.get_daily_panchanga` / `daily_civil.get_daily_panchanga_civil`: cache-aside plus festival attachment | moved to `services/daily_panchanga.py`; the engine keeps the pure `build_*` builders |
| `at_time.build_panchanga_at_time` / `build_panchanga_civil_day` / `instant_row_from_date` called `services.panchanga_api` | moved to `services/panchanga_at_time.py` |
| `kundali_detail.build_kundali_detail` assembled a panchanga block | split: the engine keeps `assemble_kundali_detail(..., panchanga)`; `services/kundali_detail_api.build_kundali_detail` builds the panchanga block and calls it |
| `vastu/architecture.py` imported `services.vastu_room_sizes_db` | the size tiers are reference data the domain owns: `engine/vedic/vastu/room_sizes.py` |
| `vastu/zone_rules.py` imported `services.vastu_rules_db` (SQLite) | declares a `ZoneRuleIndex` port; the SQLite store implements it, and `services/wiring.configure()` (the composition root, called by `app/main.py` and `tests/conftest.py`) plugs it in |

Helpers imported across a layer boundary under a private name became public:
`paksha_block`, `compute_navatara_number`, `navatara_meta`, `element_state`,
`collect_bs_year_festivals`, `festivals_for_day`, `scan_year`. Private imports
between modules inside one engine context are left alone.

### Phase 2 — Application layer for Identity & Profiles
- `Profile` aggregate with its invariants in the domain: one default per user,
  ownership checked on every load.
- `ProfileRepository` port; SQLAlchemy adapter in infrastructure.
- `app/routers/profiles.py` calls use cases (`ListProfiles`, `CreateProfile`, …)
  and never touches the session. Status codes stay exactly as they are (404
  "Profile not found", 401, 201).

### Phase 3 — Value objects, one module at a time
Frozen dataclasses for the core nouns: `BsDate`, `PatroDay`, `Tithi`,
`Nakshatra`, `PanchangaDay`, `Chart`, `DashaPeriod`, `Festival`. The engine
returns them; the interface layer turns them into today's dicts. A module is done
when its byte-identical and golden tests pass unchanged, meaning no new `null`s,
no reordered keys, and the same float formatting.

### Phase 4 — Folders by context
`apps/api/contexts/<context>/{domain,application,infrastructure,interface}`,
moved with `git mv` in batches, with re-export shims at the old paths until no
importer is left. This merges with the roadmap's Phase 9 (package cleanup), so
files move only once.

### Phase 5 — Web and mobile
- `packages/domain` keeps only domain logic. Tailwind class maps, `cn`, SVG
  builders and copy move to `packages/ui` / `packages/features` /
  design-tokens. Then `clsx` and `tailwind-merge` leave the allow-list in
  `packages/domain/scripts/check-portable.mjs`.
- Domain types are defined in `packages/domain`; `packages/api-client` maps API
  responses onto them (an anti-corruption layer). Then `domain` stops importing
  `api-client`.
- `packages/domain/src/` is grouped by context folder, the same names as the API.
- Nothing ships to users until a new build or EAS update: run typecheck, tests
  and a device check before every `eas update`.

### Phase 6 — Enforcement everywhere
The Python guard extends to "domain must not import infrastructure" per context.
TypeScript gets the equivalent lint rule, and the API suite joins CI.
