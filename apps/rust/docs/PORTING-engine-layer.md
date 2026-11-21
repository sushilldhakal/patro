# Porting notes: the engine layer

The layer between the Surya Siddhanta maths (`crates/astronomy/PORTING.md`) and the
panchanga builders: dates and zones, the engine primitives, the five angas and their
boundaries, sankrantis and the Bikram Sambat month grid.

## API mapping

| Python | Rust |
|---|---|
| `swe.julday` / `swe.revjul` (C, via pyswisseph) | `timescale::{julday, revjul}`, `Calendar::{Julian, Gregorian}` |
| `jd_calendar.CivilDay`, `civil_day_jd_ut`, `civil_parts_from_jd_ut`, `swe_cal_for_*` | `timescale::CivilDay` (`to_jd_ut`, `from_jd_ut`, `add_days`, `calendar`) |
| `date_if_supported(...) is not None` | `CivilDay::is_datetime_range` |
| aware UTC `datetime` (bisection, `timedelta / 2`) | `timescale::UtcInstant` (`midpoint`, `add_hours`, `FromStr`/`Display` = `isoformat`) |
| `EngineBase.julian_day(dt)` | `UtcInstant::to_jd` |
| `EngineBase.datetime_from_jd(jd)` → `datetime` or `UtInstant` | `timescale::Moment::from_jd` → `Utc(UtcInstant)` or `Jd(f64)` |
| `resolve_observer_timezone`, `ZoneInfo` | `timescale::Zone` (bundled IANA tzdb via `jiff`) |
| `EngineBase._utc_offset_days(civil, tz)` | `Zone::midnight_offset_seconds` |
| `local_civil_fields(...)` date, `to_nepal_time(dt).date()` | `Zone::local_day(Moment)` |
| `sun_longitude`, `moon_longitude`, `sun_moon_longitudes` | `astronomy::engine::{sun_longitude, moon_longitude, sun_moon_longitudes, longitude}` |
| `rise` / `set` (date path), `rise_civil` / `set_civil` | `astronomy::engine::rise_set_on_day` (picks the same path) |
| `rise_after` / `set_after` | `astronomy::engine::rise_set_after` |
| `SunService.sunrise` / `sunset` | `astronomy::engine::{sunrise, sunset}` |
| `PanchangaService.elongation/tithi/nakshatra/yoga/karana/vara` | `panchanga::{elongation, tithi, nakshatra, yoga, karana, vara}` |
| `find_tithi_end/start` | `panchanga::{tithi_end, tithi_start}` |
| `find_{nakshatra,yoga,karana}_{end,start}`, `find_moon_rashi_end`, `find_moon_pada_end`, `find_sun_nakshatra_end` | same names without `find_` in `panchanga` |
| `sankranti.get_sun_rashi_at_jd`, `find_sankranti_after_jd` (+ Brent, bisection) | `calendar::{sun_rashi_at_jd, find_sankranti_after_jd}` |
| `get_bs_month_start_civil`, `_solve_bs_month_start_civil` | `calendar::month_start`, `calendar::month_starts` (whole year, one chain) |
| `get_bs_month_length` | `calendar::month_length` |
| `gregorian_to_bs(date)` / `bs_to_gregorian` | `calendar::civil_to_bs` / `calendar::bs_to_civil` |

## Golden tests

`scripts/gen_engine_golden.py` runs the production Python under the Surya Siddhanta and
writes one file per crate. Every comparison is exact (float bits or the ISO string):

| Crate | Cases | Covers |
|---|---|---|
| timescale | 4,994 | julday/revjul in both calendars (years −5000…9999), the 1582 cutover, `datetime` ↔ JD, `datetime_from_jd` truncation, midnight offsets and local days in six zones (Nepal's 1920 and 1986 changes) |
| astronomy (engine) | 1,000 | engine longitudes; sun and moon rise/set in seven places and zones, 112 of them before 1582 |
| panchanga | 3,120 | tithi/nakshatra/yoga/karana values and names, vara in six zones, all 11 boundary finders to the microsecond (1600–2200) |
| calendar | 4,986 | 2,244 month starts (BS 1700–2800, BBS, down to 3055 BCE), lengths, both conversions, sankrantis |

Result: **all identical**.

## Deliberate differences

- **No memo caches yet.** Python keeps LRU caches (astronomy, rise/set, month starts).
  Rust recomputes; it is fast enough that the cache layer belongs to the server (Redis),
  not the maths. `calendar::month_starts` returns a whole year from one chain, which is
  what callers wanting several months should use.
- **Boundary finders take a `UtcInstant`** (CE, `datetime` range). Python's `UtInstant`
  path for pre-1582 finders is not ported yet.
- **`Zone` uses `jiff`'s bundled tzdb**, so results do not depend on the machine's
  zoneinfo. Gaps and overlaps take the offset in force *before* the transition, as
  Python's `fold=0` does (jiff's own "compatible" rule would differ in a gap, for example
  Kathmandu's 1986-01-01 00:00).
- **Patro-axis validation** (`validate_patro_signed_year`, the BS range limits) and the
  BCE `locate_patro_day_for_civil` search are not ported yet; `civil_to_bs` is the CE path.

## Preserved quirks

- Rise/set takes the `datetime` path (local midnight → UTC `datetime` → `julian_day`) for
  CE days and the `civil.to_jd_ut() − offset` path before 1582, as the Python engine does;
  the two can differ in the last bit.
- Rise/set and sankranti instants are truncated to the whole second when turned into a
  `datetime` (`datetime_from_jd`), and month starts use that truncated instant.
- `vara` reads the zone offset at the truncated instant but takes the weekday from the
  Julian Day itself.
- `month_length(-1, 12)` asks for "year 0", which the gapless year index maps onto BS 1,
  exactly as Python does.

## Not covered by the golden set

- Circumpolar days (no sunrise or sunset): no Arctic or Antarctic place was sampled.

## Speed (`crates/calendar/benches/engine.rs` vs `scripts/bench_engine.py`, Python memos cleared)

| Workload | Python | Rust | × |
|---|---|---|---|
| all four angas at an instant | 19.2 µs | 0.40 µs | 48 |
| tithi end (bisection to 1 s) | 276 µs | 3.4 µs | 81 |
| sunrise, Kathmandu | 191 µs | 9.9 µs | 19 |
| BS year: 12 month starts | 1,422 µs | 22.4 µs | 64 |

## Verification

`cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`,
`cargo test --workspace`, `cargo doc --no-deps --workspace`: all clean.

---

# Daily panchanga (`panchanga::daily`), complete

Source: `engine/panchanga/daily.py` (`build_daily_panchanga`) and every module it calls:
`element_boundaries`, `ghati_time`, `rashi_spans`, `rashi`, `moon.phase`, `lunar_month` +
`adhik_maas`, `nepal_sambat`, `samvatsara`, `choghadiya`, `hora`, `tropical_year`,
`spashta` + `asta`, `lagna`, `lagna_spans`, `pushkara_navamsha`, `balam_panchaka`,
`navatara`, `rashifal`, `muhurta`, `muhurta_timings`, `nivas_shool`, `solar_corrections`.

`panchanga::daily::build_daily(day, &Location)` returns the whole payload, all 54 keys
(`PAYLOAD_KEYS`), as ordered JSON in the Python key order.

| Rust module | Python |
|---|---|
| `daily.rs` | `daily.py`, `element_boundaries.build_*_block`, `ghati_time`, `rashi_spans`, `moon.phase` |
| `lunar_month.rs` | `lunar_month.py` (lunar years, amanta / pūrṇimānta / festival masa, `find_festival_in_lunar_month` udaya path), `adhik_maas.py` |
| `nepal_sambat.rs`, `samvatsara.rs` | `nepal_sambat.py`, `samvatsara.py` (Surya Siddhanta closed form) |
| `blocks_time.rs` | `choghadiya.py`, `hora.py`, `tropical_year.py` (ritu, ayana) |
| `blocks_lagna.rs` | `spashta.py`, `asta.py`, `lagna.py`, `lagna_spans.py`, `pushkara_navamsha.py`, `balam_panchaka` (panchaka, udaya lagna) |
| `blocks_bala.rs` | `balam_panchaka` (chandrabalam, tarabalam), `navatara.py`, `rashifal.py` |
| `blocks_muhurta.rs` | `muhurta.py`, `muhurta_timings.py` |
| `blocks_nivas.rs` | `nivas_shool.py` |
| `blocks_solar.rs` | `solar_corrections.py` |
| `text_tables.rs` | generated from the Python text by `scripts/gen_text_tables.py` (never edited by hand) |
| `pyfloat.rs` | Python `%`, `//`, `round(x, n)`, `round(x)` |
| `timescale` `add_seconds_f64` / `add_days_f64` | CPython `timedelta(seconds=float)` / `timedelta(days=float)` rounding |

**Golden test** (`scripts/gen_daily_golden.py` → `tests/daily_golden.rs`): 113 real Python
payloads — a month around today in Kathmandu, 65 days from 1600–2200 in Kathmandu, Pokhara,
Biratnagar, New York, Sydney and London, and 13 days through Adhik Jestha 2026 — compared as
serialized JSON (every value, every Nepali string, key order). **All 113 identical on all 54
keys.** Covered: a third tithi/nakshatra/yoga before the next sunrise, no moonrise/moonset,
Kathmandu's +05:41:16 and +05:30 eras, all four Adhik Jestha paksha labels, Nepal Sambat
new-year boundaries, southern-hemisphere ritu.

**Python behaviour kept on purpose, worth fixing in both later:**

- *Akshamsha for observers outside Nepal is about a day off.* Python's rise/set forces
  Asia/Kathmandu whenever the coordinates fall in Nepal's bounding box
  (`resolve_observer_timezone(name, lat=, lon=)`). Akshamsha compares sunrise at the
  observer's latitude on 86.25°E with sunrise at 27.7172°N on 86.25°E: the reference point
  is inside the box (Kathmandu midnight) and a New York latitude is not (New York
  midnight), so the two sunrises are searched from different days and akshamsha comes out
  near +1424 minutes instead of about −17. Rust reproduces it
  (`astronomy::engine::is_nepal_observer`) so the payloads stay identical.
- `ns_date.year` is `bs_year − 937` even before the Nepal Sambat new year
  (`is_before_new_year` true); the field says so but the year is not decremented.

**Not yet ported:** days before 1582-10-15 (`DailyError::BeforeGregorian`), the
Julian-Day labelling path for BBS / pre-table days (`patro_bs=…`), kaal-vyapini and
para-yuta festival selection (festivals port).

**Speed** (`benches/daily.rs` vs `scripts/bench_daily.py`, same machine; Python memos
cleared except the lunar-year cache, which both keep warm as a running server does):

| Workload | Python | Rust | × |
|---|---|---|---|
| full daily payload, one day | 27.1 ms | 1.51 ms | 18 |
| full daily, 30-day month | 447 ms | 46 ms | 10 |

---

# Festivals (`festivals` crate)

Source: `engine/festivals/festival_rules.py`, `occurrence.py`, `tradition.py` (default
"all" only), and the festival half of `services/festivals/holiday_generator.py`
(`generate_festivals`, `generate_bs_festivals`, `_apply_*_overrides`,
`filter_redundant_day_festivals`, `filter_redundant_year_festivals`, `festival_location`),
plus `patro_generator.festivals_for_day`. The kaal-vyapini, para-yuta and MoHA civil-month
rules live in `panchanga::lunar_month::find_festival_in_lunar_month`.

Rule files are embedded from `apps/api/rules/` (`festival_rules_v3.json`,
`public_holidays_v1.json`, `holiday_overrides_v1.json`) with `include_str!`, so both
servers read one copy.

**Golden test** (`scripts/gen_festival_golden.py` → `tests/golden.rs`): BS 2040, 2081–2084
and 2150 in Kathmandu and BS 2083 for a New York observer (3,820 rows), AD 1990 and 2026
(Kathmandu, New York), and every day of BS 2083's festival list. **All identical**, row for
row and in order.

**Not ported yet:** the file/SQLite/in-process caches around the lists (the Rust server
will cache in Redis), the holiday list (`generate_holidays`, `get_bs_holidays`), the
traditions filter other than "all", `get_special_months_for_gregorian_year` (kshaya maas).
The solar-rule fallback outside the month grid uses the Julian-Day sankranti search where
Python uses the `datetime` one; both give the same Kathmandu day.

---

# HTTP layer (first route)

- `common::pyjson`: `json.dumps(..., ensure_ascii=False)` byte for byte — compact (response
  cache) and default separators (era layer), Python float `repr`.
- `patro::era::render_for_era`: `EraMiddleware`'s response side — `date`/`*_date` labels
  beside Julian-Day keys, top-level `date_parts`, legacy date alignment, `era`/`language`.
  Labels for days before 1582-10-15 are not ported (left off, as Python does on error).
- `api::respond`: cache headers with production's `stale-if-error=86400`, `Vary`,
  `x-siddhanta`/`x-ayanamsha` (also on route errors, as the siddhanta middleware wraps
  them), gzip, `Server-Timing`, `{"detail": …}` errors.
- `GET /v1/panchanga/{bs_year}/{bs_month}` (no `full`, no `clock`): `tests/http_golden.rs`
  replays requests recorded from the FastAPI `TestClient` and requires the same status,
  byte-identical decompressed body and identical headers. `full=`, `clock=` and
  `siddhanta=drik` answer 501 for now.

**Python behaviour found while recording:** the response cache gives every
Kathmandu-equivalent observer one key (`city_1283240`), so a cached month carries the
`location` block of whichever request filled it first (with or without `city_id`). The
golden is recorded with the response cache bypassed, i.e. what the builder computes.
