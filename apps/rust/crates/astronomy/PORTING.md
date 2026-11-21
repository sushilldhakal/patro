# Porting notes: Surya Siddhanta maths

Source: `apps/api/engine/astronomy/siddhanta/surya_siddhanta_math.py` (542 lines).
Target: `src/surya_siddhanta/` in this crate.

## API mapping

| Python | Rust |
|---|---|
| body names `"sun"` … `"rahu"`, `BODIES` | `Body` enum (`FromStr`/`Display` give the same names), `Body::ALL` |
| `REVS_MAHAYUGA` keys (`"mercury_sighra"`, `"moon_node"` …) | `MeanBody` enum, `MeanBody::revolutions_per_mahayuga` |
| `STAR_PLANETS` | `StarPlanet` enum |
| `MAHAYUGA_*`, `KALPA_DAYS`, `DAYS_CREATION_TO_KALI`, `KALI_EPOCH_JD`, `YEAR_DAYS`, `SATYA_YUGA_START_JD` | same-named `pub const` |
| `OBLIQUITY`, `SPEED_HALF_STEP` | same-named `pub const` |
| `ahargana` | `ahargana` |
| `_revolution_fraction` | `revolution_fraction` (crate-private) |
| `mean_longitude(key, jd)` | `mean_longitude(MeanBody, jd)` |
| `apsis_longitude(planet, jd)` | `apsis_longitude(Body, jd) -> Option<f64>` |
| `node_longitude(planet, jd)` | `node_longitude(Body, jd) -> Option<f64>` |
| `mean_sign_ingresses_since_kali` | `mean_sign_ingresses_since_kali -> i64` |
| `manda_equation`, `sighra_equation`, `_epicycle`, `_star_planet` | private in `position.rs` |
| `true_position(body, jd)` | `true_position(Body, jd) -> (lon, lat)` |
| `true_longitude_and_speed` | `true_longitude_and_speed` |
| `ayanamsha`, `equatorial`, `local_sidereal_degrees`, `equation_of_time_days`, `altitude`, `ascendant_sayana`, `ascendant` | same names in `frame.rs` |
| `next_rise_or_set(..., rising=bool, horizon=0.0)` | `next_rise_or_set(..., Crossing::{Rise,Set}, horizon)` |
| `elongation`, `moon_latitude_minutes` | same |
| `next_syzygy(jd, target, backward=bool)` | `next_syzygy(jd, target, Direction)` |
| `eclipse_measures -> dict` | `eclipse_measures -> EclipseMeasures` |
| `lunar_eclipse_at -> dict \| None` | `lunar_eclipse_at -> Option<LunarEclipse>` |
| `solar_eclipse_global -> dict \| None` | `solar_eclipse_global -> Option<SolarEclipse>` |
| `solar_eclipse_local -> dict` | `solar_eclipse_local -> Option<LocalSolarEclipse>` |
| `next_eclipse(jd, "lunar"\|"solar", backward=bool)` | `next_eclipse(jd, EclipseKind, Direction) -> Option<Eclipse>` |
| `_wrap`, `_signed`, Python float `%` | `modulo::{wrap, signed, py_mod}` (crate-private) |

## Test mapping (`apps/api/tests/test_surya_siddhanta.py` → `tests/surya_siddhanta.rs`)

Ported with the same names: `test_every_mean_planet_starts_kali_yuga_at_mesha_0`,
`test_the_moons_apogee_and_node_at_kali_are_where_the_text_puts_them`,
`test_ayanamsha_is_zero_at_kali_and_3600_years_later_and_about_23_now`,
`test_positions_exist_at_the_start_of_satya_yuga`, `test_sunrise_is_found_far_back_and_near_six`,
`test_the_texts_shadow_and_discs_have_their_classical_size`,
`test_lunar_eclipse_of_3_march_2026_is_total_by_the_text`,
`test_the_annular_eclipse_of_june_2020_is_seen_from_kathmandu`,
`test_eclipses_are_found_long_before_any_ephemeris_reaches`.

Not ported yet, because they need parts of the system that are not in Rust:
- Against Swiss Ephemeris (drik): `test_the_sidereal_sun_is_within_a_degree_of_drik_today`,
  `test_the_lagna_formula_is_the_ecliptic_horizon_intersection`,
  `test_solar_eclipses_fall_on_the_same_new_moons_as_drik`.
- The siddhanta switch, engines, calendar caches, samvatsara and the HTTP API: every other test
  in the file. They move with the engine, calendar and API ports.

## Golden test (`tests/golden.rs`)

`scripts/gen_surya_siddhanta_golden.py` runs the Python module over 9,960 cases: every public
function, every body, 190 days from the start of Satya Yuga to ~10,000 years ahead, six places
(Kathmandu, Pokhara, New York, Sydney, 0°/0°, Fairbanks). Result on macOS arm64, Python 3.10:

| Area | Bit-identical | Largest difference |
|---|---|---|
| mean / apsis / node longitudes | 4180 / 4180 | 0 |
| true position and speed | 5944 / 6080 | 8.9e-16° (1 ulp) |
| ayanamsha, equatorial, sidereal time, EoT, altitude, lagna | 1420 / 1420 | 0 |
| rise / set | 160 / 160 | 0 |
| elongation, syzygy, eclipse measures | 830 / 830 | 0 |
| eclipses (global, lunar contacts, local solar) | 792 / 792 | 0 |
| sign ingresses (integers) | all equal | — |

## Deliberate differences

- **1-ulp latitudes.** The star-planets' latitude divides by the शीघ्र कर्ण, which Python gets from
  `math.hypot` (its own correctly-rounded algorithm) and Rust from the platform `hypot`. They differ
  in the last bit for some inputs (136 of 6080 values, ≤ 8.9e-16°). Invisible at any precision the
  apps show.
- **No string or bool parameters.** Unknown body names are refused when parsed (`ParseBodyError`)
  instead of raising `ValueError`/`KeyError` deep inside; `rising`/`backward` are enums.
- **Shapes instead of dicts.** `LunarEclipse` leaves out the `penumbral_*` keys, which the Python
  always sets to `None` (the text has no penumbra); the API layer will write them as `null`.
  `solar_eclipse_local`'s `{"visible": False}` (no other keys) is `None`.

## Preserved quirks

- Python's float `%` is reproduced exactly (`py_mod`), including `+0.0` for an exact zero and a
  tiny negative angle wrapping to `360.0`, so wrapped angles match bit for bit.
- Mean longitudes use 128-bit integers for the whole days of motion, as Python's big integers do;
  the Moon's `revs × days` (~4×10¹⁹) overflows `i64`.
- The rise/set scan runs `int(1.6 / (1/48)) = 76` steps, as in Python.

## Speed (`benches/surya_siddhanta.rs` vs `scripts/bench_surya_siddhanta.py`, same machine)

| Workload | Python | Rust | × |
|---|---|---|---|
| `true_position`, 8 bodies | 22.9 µs | 1.26 µs | 18 |
| sunrise, Kathmandu | 140 µs | 7.6 µs | 18 |
| moonrise, Kathmandu | 316 µs | 17.3 µs | 18 |
| next lunar eclipse | 483 µs | 20.1 µs | 24 |

## Verification

`cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings` (BeautifulRust lint
set), `cargo test --workspace` (golden + ported tests), `cargo doc --no-deps`: all clean.
