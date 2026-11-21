# Vedic Patro API — Rust (in development, NOT live)

A rewrite of the API server in Rust, built to find out whether it beats the
Python FastAPI server in `apps/api`. **`apps/api` stays production.**

> **Do not make this server live** — no deploy step, systemd unit, nginx or
> Cloudflare change, run on the production server, or app pointed at it — until
> the repository owner says so in their own words. See `AGENTS.md` at the repo root.
> All Rust work stays inside `apps/rust` until then.

## Run it

Rust comes from Homebrew's `rustup` (`brew install rustup && rustup default stable`).
If `cargo` is not on your PATH: `export PATH=/opt/homebrew/opt/rustup/bin:$PATH`.

```bash
cd apps/rust
cargo run                      # http://127.0.0.1:8100/health
cargo test                     # every crate
cargo clippy --all-targets -- -D warnings
cargo fmt
cargo bench -p astronomy       # Surya Siddhanta speed
cargo bench -p calendar        # engine layer speed
cargo bench -p panchanga       # daily panchanga speed
```

Regenerate the golden files after changing the Python engine:

```bash
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_surya_siddhanta_golden.py
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_engine_golden.py
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_daily_golden.py
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_festival_golden.py
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_geography_golden.py
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_date_key_golden.py
cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden.py   # end-to-end responses
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_text_tables.py   # Nepali/English text tables
cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_rashifal_tables.py   # rashifal strings + weights
```

It listens on **8100**, so it can run beside the Python API on 8000.
Settings live in `config/default.toml`; any key can be overridden with
`PATRO_RS__<KEY>` (e.g. `PATRO_RS__PORT=8200`). `RUST_LOG` overrides the log filter.

## Layout

```
apps/rust/
├── Cargo.toml          workspace + the server binary
├── config/default.toml
├── src/main.rs         config, logging, serve, graceful shutdown
├── crates/
│   ├── common/         AppConfig, AppError ({"detail": …} like FastAPI)
│   ├── api/            routes/, handlers/, middleware/ (trace, timeout), state
│   ├── timescale/      Julian Days, civil days, UTC instants, IANA zones
│   ├── astronomy/      surya_siddhanta maths + engine (longitudes, rise/set)
│   ├── panchanga/      angas + boundaries, and the full daily payload (daily.rs, blocks_*.rs)
│   ├── calendar/       sankranti and the Bikram Sambat month grid
│   ├── festivals/      festival rules, MoHA overrides, year/day festival lists
│   ├── geography/      cities.db lookups and request location resolution
│   ├── jyotish/        graha tables, Ashtakavarga, Vimshottari, scored rashifal (general + personal)
│   ├── vastu/          zone uses + room index, the plot sketch, the house-plan engine (ring, layout, building, validate)
│   └── patro/          API use cases (month grid) and the era response layer
├── docs/               porting notes (engine layer); maths notes in crates/astronomy/PORTING.md
├── scripts/            golden-file generator and Python benchmark (run from apps/api)
└── tests/              HTTP-level tests against the router
```

New crates (astronomy, panchanga, calendar, gochar, muhurta, vastu, database,
cache) are added when the code that needs them arrives, not before.

## Stack

Axum · Hyper · Tokio · Tower / tower-http · Serde · Tracing · config ·
thiserror + anyhow. Lints: the BeautifulRust set (`[workspace.lints]` + `clippy.toml`),
enforced with `cargo clippy --workspace --all-targets -- -D warnings`. Planned as their steps arrive: SQLx (Postgres), redis,
Utoipa (OpenAPI), validator, Rayon (bounded CPU pool), Swiss Ephemeris binding.

## Rules the port follows

1. **Same answers.** Every endpoint must return what `apps/api` returns for the
   same request: paths, query parameters, JSON shape, numbers to the precision
   the apps show, headers (Cache-Control, CORS). Golden tests compare the two.
2. **Same calculation system.** The default is the Surya Siddhanta (siddhantic
   ganita), not drik. Profiling showed 94% of a cold build is the pure-Python
   Surya Siddhanta maths (`apps/api/engine/astronomy/siddhanta/`); Swiss
   Ephemeris is barely used for default requests. Porting that maths is the
   main speed win.
3. **Never block Tokio.** Async I/O for Postgres/Redis; CPU-heavy work goes to a
   bounded pool (Rayon / `spawn_blocking` behind a semaphore), never unbounded tasks.
4. **Measure from day one.** Latency, CPU, RAM and cache hit rates against the
   Python server, run locally until the owner approves anything else.

## Steps

- [x] 1. Workspace: Cargo, Axum, Tokio, Serde, config, tracing, errors, `/health`
- [x] 3a. Surya Siddhanta maths port: bit-identical to Python on 9,960 golden cases (1-ulp at worst), 18–24× faster
- [x] 3b. Engine layer: dates and zones, longitudes and rise/set, the five angas and their boundaries, sankranti, BS month grid; identical to Python on ~14,000 golden cases, 19–81× faster (docs/PORTING-engine-layer.md)
- [x] 3c. Full daily panchanga (`panchanga::daily::build_daily`): all 54 payload keys byte-identical to Python on 113 real days, 18× faster per day
- [x] 3d. Festivals (`festivals` crate): rule matcher (all 7 rule types, pradosh / para-yuta, MoHA Shrawan/Baishakh civil rules, end_tithi / end_at spans), MoHA overrides, alias/vrata filters, BS-year and Gregorian-year lists, per-day lists — identical to Python on 3,820 BS-year rows + 365 days
- [x] 4a. Geography (`geography` crate): cities.db search/aliases/nearest-town snapping and location resolution, identical on 134 Python cases
- [x] 4b. HTTP plumbing: Python-exact JSON writer (`common::pyjson`), era-layer rendering (`patro::era`), cache/calculation headers, gzip, FastAPI error shapes
- [x] 4c. `GET /v1/panchanga/{bs_year}/{bs_month}` (lite grid): byte-identical bodies and identical headers vs FastAPI on 7 recorded requests (`tests/http_golden.rs`)
- [x] 4d. Round one (47 routes, each checked against FastAPI on requests the agents never saw): day (`/v1/panchanga/{date_key}`, `/jd`, `/today`, calendar header, AD↔BS convert, full festival enrichment), festivals/holidays/sankranti/special months, sait (all `/v1/nepal/sait/*`), catalog (meta, cities, documents, veda, panchanga elements)
- [x] 4e. One date-key reader (`patro::date_key`, port of `date_keys.py` + `era.to_jd`) for every `{date_key}` route: identical to Python on 1,008 keys × eras (incl. Devanagari digits) and 42 bad/edge HTTP requests
- [x] 4f. `GET /v1/panchanga/at-time` (the app's most-called unported route): `jd`+`clock`, era parts + `clock`, `datetime=` (Python 3.10 `fromisoformat`, incl. its invalid-date-read-as-UTC quirk); udaya day state + instant angas, grahas with शर/RA/क्रान्ति, instant lagna, muhurta_now, upagrahas. 28 golden requests + 14 unseen random ones identical. Also fixed: a day's festivals come from the Gregorian-year list (Chaite Dashain was missing in years where it falls in March); 140-day sweep identical
- [x] 4g′. Rashifal (51 routes now): `/v1/panchanga/rashifal` (daily, Aitabar→Sanibar week, BS month, BS year sampled every 3 days), `/rashifal/janma`, `/rashifal/personal`. New `jyotish` crate: graha tables, Parashari Ashtakavarga, Vimshottari timeline + antardashas (wall-clock arithmetic in the birth zone, as Python's `ZoneInfo` datetimes do), the 8-layer scored engine and both composers; strings and weights generated from the Python module (`scripts/gen_rashifal_tables.py`). 56 golden requests + 90 unseen random ones identical. Also: `resolve_request_jd` now follows the era middleware exactly (`?jd=` / `year&month&day` only count with `era=`), and `era_params` 422s are checked
- [x] 4g″. Year group (55 routes now): `/v1/panchanga/year/{bs_year}` (lite, `full=`, `wheel=`), `/year/{bs_year}/sun`, `/v1/panchanga/ad/{y}/{m}`, `/bc/{y}/{m}` (checks, then 501), and month `full=`/`slim=`. 28 golden requests identical (`tests/http_golden_year.rs`); 19 unseen random requests identical (incl. a full=true year). Also: the `?cv=` versioned edge lifetime is now one middleware (`middleware/versioned.rs`, port of `_versioned_edge_lifetime`), and bool query flags return pydantic's 422 body
- [x] 4g‴. Gochar and graha group (64 routes now): `/v1/nepal/gochar/{date_key}`, `/gochar/jd/{jd}`, `/gochar/ingress` (pada, nakshatra, rashi, patro, udayast; `grahas=`), `/gochar/year/{bs}`, `/panchak/year`, `/graha-asta/year` (with चन्द्र तारा अस्त), `/graha-vakri/year`, `/graha-sthiti/{date_key}`, `/eclipse/{solar|lunar}/year`. New `jyotish::gochar` (3 h scan + 1 s bisection on microsecond instants), `panchak`, `graha_detail`. 74 golden + 36 unseen random requests identical
- [x] 4g⁗. Patro and kundali basics (73 routes now): `/v1/nepal/patro/{y}/{m}` (`format=patro`; other formats answer 501), `/v1/planetary/positions`, `/v1/kundali/vimshottari`, `/v1/shadbala`, `/v1/kundali/yogas/reference`, `/v1/kundali/reference/bhava`, `/v1/kundali/{date_key}`, `/v1/kundali/dasha/expand`, `/v1/kundali/milan`. `jyotish` gains dasha `sub_periods_aware` + Yogini, shadbala and Ashta Koota milan (tables generated by `scripts/gen_milan_tables.py`). Goldens (`tests/http_golden_kundali_basic.rs`, `http_golden_nepal_patro.rs`) + 40 unseen random kundali requests identical
- [x] 4g⁵. Kundali detail, report, seasons and patro views (77 routes now): `/v1/kundali/detail` (vargas ×20, Vimshottari/Tribhagi/Yogini trees, the 312-rule yoga checklist, bhava bala, vimshopaka, ashtakavarga reductions, avakahada, graha shanti), `/v1/kundali/report` (NDJSON; English and Nepali sections, Nepali factor localization with Python's `\b`), `/v1/seasons/tropical`, every `nepal/patro` `format=` (canonical, surya, toyanath, dayblock + `output=text`) and `/v1/nepal/patro/ad/{y}/{m}`. "Now" is injectable (`AppState::with_fixed_now`) so clock-dependent routes have goldens. Yoga catalog identical on 4,341 random charts (`crates/jyotish/tests/yoga_catalog.rs`); detail, report and patro goldens plus 40 + 40 + 25 unseen random requests identical. Yoga, report and Nepali-localization tables are generated (`scripts/gen_yoga_tables.py`, `gen_report_tables.py`). The three `POST /v1/generate/*` precompute jobs answer 501: they only fill caches the Rust server does not have yet
- [x] 4g⁶. First deliberate differences from production Python, all listed in `scripts/rust_divergences.py` (every golden recorder applies them to Python in-process, so parity tests still hold): Vasumati yoga checks benefics *in* the upachayas from the Lagna or the Moon (source #9; Python checked the reverse and could never form it); Kulavardhana stays as literally worded (source #74, never formed) with an `evaluation` of the 5th from Lagna, Sun and Moon instead of an invented reading; Graha Shanti no longer reports a graha conjunct itself (Saturn for Capricorn/Aquarius lagna). Python itself is unchanged
- [x] 4g⁹. Pre-1582 days, first slice: Julian and BCE days now build. `timescale::JdInstant` is Python's `UtInstant` (float Julian Days, every difference through a microsecond `timedelta`, expanded ISO `±YYYY-…`, the zone's modern offset for wall clocks) and `timescale::PyInstant` is the surface both instant kinds share, so the daily blocks, anga boundaries, nivas, lagna/pushkara, muhurta and hora are generic. `panchanga::daily::build_daily_civil` is `build_daily_panchanga_civil` (stubbed lunar month and Nepal Sambat, no muhurta enrichment or pushkara, solar corrections probed at 2020-06-15 as Python does); `calendar::locate_patro_day` is `locate_patro_day_for_civil`; the era layer labels BBS/BC days. Routes no longer 501 before 1582: the day routes (`/v1/panchanga/{key}`, `/jd`, query form), BS/BBS month grids, `/v1/panchanga/ad/{y}/{m}` before 1582, `/v1/panchanga/bc/{y}/{m}`, `/convert/bs-to-ad`, `/calendar/header` (400, as Python), and `/v1/panchanga/at-time` on Julian/BCE moments. 39 raw daily payloads (`crates/panchanga/tests/daily_civil_golden.rs`) and 35 HTTP goldens (`tests/http_golden_civil_day.rs`, `http_golden_civil_month.rs`) identical. Fixed Python bugs (`scripts/rust_divergences.py` #4–#7): BC December grids came back empty (month length −700), pre-1582 month names printed as `"1500-02"`/`"-0044-0"`, BS→AD before 1582 answered 500, and AD→BS printed the proleptic weekday; the cutover day 1582-10-04 (Python `TypeError`, 500) now answers. Remaining pre-1582 gaps are listed under 4g¹⁰
- [x] 4g¹⁰. Pre-1582 days, second slice: `jyotish::gochar` (scans, bisection, ingress, stations, udaya/asta, tables), panchak, graha-asta (incl. चन्द्र तारा अस्त), graha-vakri, graha-sthiti and eclipses are generic over the instant kind, as are the catalog's element spans; `panchanga::daily::SunriseInstant` picks the sunrise kind per day like `sun_service.sunrise`. No longer 501 before 1582: `/v1/nepal/gochar/{key}`, `/jd/{jd}`, `/year/{bs}`, `/ingress` (every level), `/panchak/year`, `/graha-asta/year`, `/graha-vakri/year`, `/graha-sthiti/{key}`, `/eclipse/{kind}/year`, `/v1/panchanga/year/{y}/sun`, `/element/{name}/spans`, `/rashifal/janma` and `/sait/{y}/{c}/personalize` with a pre-1582 birth; `/element/{name}/month` and `/rashifal?date=` answer Python's 404 / 400. 41 HTTP goldens identical (`tests/http_golden_civil_graha.rs`), incl. the 1582 cutover year. Fixed: BCE gochar `entry_time_local` lost a minute digit (`rust_divergences.py` #9); share before 1582 renders (#10, Python 500). Still 501 before 1582: the sait year lists for BS 60–1639 (the 3,000-line scanner is `datetime`-only; Python itself answers 400 `day is out of range for month` for many of those years) and `/rashifal/personal` with a pre-1582 birth (Python 500s)
- [x] 4g¹¹. Lunar months by location, kshaya shortcut, bounded caches: a lunar month's civil days (first, last, Purnima day and the pūrṇimānta windows festivals search) follow each observer's own sunrise by the udaya rule instead of Kathmandu's; month names and adhik/kshaya status stay global instants (`rust_divergences.py` #11; the recorder patch threads the entry point's observer into Python and keeps the day and year caches out of it). Kshaya months are only searched for when two adhik months fall in the three lunar years around one, the classical flank; `crates/panchanga/tests/kshaya_shortcut.rs` checks it never skips one (1800–2200 in the suite, 122–3000 CE with `--ignored`: 57 kshaya years, none skipped). The festival and lunar-year memos are bounded (`panchanga::memo`, least-recently-used)
- [x] 4g⁷. Vastu and share (85 routes now): the seven `/v1/vastu` routes — zones, zone detail, rooms, room detail, `POST analyze`, `POST sketch` (the route the apps call) and `POST house-plan` (the full maṇḍala-ring floor planner: ring cells, side bands, entrance hall, corridor reclaim, doors, the wall/hole/window graph, validation and score) — in a new `vastu` crate, plus `GET /share/panchanga` (crawler HTML). JSON bodies go through `crates/api/src/body.rs`: FastAPI's content-type rule, Python 3.10 `json` error messages and positions, pydantic's lax coercion and its 422 items in order (gzipped with `Vary` past 1024 bytes, as `GZipMiddleware` does). 69 vastu goldens and 21 share goldens identical (`tests/http_golden_vastu.rs`, `http_golden_share.rs`); 590 unseen random vastu bodies (incl. 90 malformed ones) and 300 unseen share requests identical. Python bug kept: an extra listed twice (`["living","living"]`) makes the band search delete one dict key twice, so house-plan answers 500. `/og-image` (headless-Chromium screenshot, Pillow fallback) and `/meta/provenance` (the Swiss Ephemeris environment and the cache's rows) answer 501 until a renderer, drik and a persistent cache exist
- [x] 4g⁸. `/v1/nepal/panchanga/{date_key}` and `/v1/nepal/panchanga/month/{y}/{m}` (no longer 501): the day state with public-holiday flags, every `format=` (raw, surya, canonical, patro, toyanath, dayblock + `output=text`), `variant=` publisher labels (never on `raw`, which Python returns before the registry), and the month's `full=` feeding the patro grid from embedded day states (`patro::nepal_panchanga`; `patro_month` now shares `patro_grid`). 37 goldens (`tests/http_golden_nepal_panchanga.rs`) and 80 unseen random requests identical
- [ ] 4h. Next: the remaining 501s (pre-1582 days, `reference=midnight`, `civil=true`, month `clock=`, `ayanamsha=`, `generate/*` once a persistent cache exists); then Redis response cache, CORS, load shedding, OpenAPI
- [ ] 5. Postgres (SQLx) and Redis
- [ ] 6. Kundali / jyotish, vastu, documents, cities, auth
- [ ] 7. Swiss Ephemeris binding for drik
- [ ] 4. First Panchanga endpoint, byte-compatible with production
- [ ] 5. Benchmark against FastAPI (where it runs is the owner's call)
