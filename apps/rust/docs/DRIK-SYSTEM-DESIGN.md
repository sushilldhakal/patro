# `siddhanta=drik` on our own ephemeris: design

Status: implementation notes for README step 4h. The Rust server is **not live**;
nothing here changes that.

## Carrying the system

```rust
#[derive(Clone, Copy)]
pub enum System {
    SuryaSiddhanta,
    Drik(&'static DrikSky), // kernel + (optional) event index, loaded once
}
```

* `System` is `Copy`, passed **explicitly**: no global selection, no thread-local, so
  `months_in_parallel` threads each carry their own copy.
* `DrikSky` is read-only data. The server loads it once at startup
  (`PATRO_RS_EPHDATA`) and leaks it (`&'static`), so the handle needs no
  reference counting and no lookup by name. With the variable unset there is no
  `DrikSky`, so no `System::Drik` can be built and the routes answer 501 as before.
* `System` implements `position::Ephemeris`, so `events::*` already read the index
  through it (`System::index()`), and fall back to the chunk solver.
* `System::key()` (0 for the Surya Siddhanta, the `DrikSky` address for drik) is part
  of **every** cache key: the event chunk cache, rise/set cache, the panchanga day
  cache, festival and lunar-month memos, the NS and sankranti memos.
* `panchanga::daily::Location` gains `system: System`; it already flows through the
  builders. `engine::Observer` gains it too, so every `rise_set_*` call carries it.
  Calls that take only a Julian Day (`tithi(jd)`, `sun_longitude(jd)`) take a leading
  `System` argument instead.
* Surya Siddhanta code paths are untouched: `System::SuryaSiddhanta` forwards to the
  existing free functions, so SS responses stay byte-identical (checked against the
  snapshot oracle after every step).

## Drik primitives (all from `ephdata::Sky`)

| Primitive | Drik |
|---|---|
| sidereal longitude, latitude | `Sky::ecliptic` apparent place, minus the Lahiri ayanamsha |
| Rahu | `Sky::true_node` (osculating, the same series as the index); Ketu = Rahu + 180° |
| speed / retrograde | central difference of the longitude, half step 0.5 d (as the SS path) |
| ayanamsha | `Sky::ayanamsha` (Lahiri, fixed in ICRS) |
| sidereal time | GMST (IAU 2006 polynomial + Earth rotation angle), UT as UT1 |
| equatorial | mean obliquity of date (IAU 2006) on the mean-of-date ecliptic |
| ascendant | the same closed form as the text, with the true-date obliquity and GMST |
| rise/set | hour-angle prediction from Sky RA/dec, bracketed Illinois finish, scan fallback |
| anga boundaries | `ephdata::Index` where it covers, chunk solver on `Sky::sun_moon` elsewhere |

Outside the kernel (AD 1 to 2947) a drik request is a 400-class error that says so;
inside the kernel but outside the index (AD 3 to 2945) the solver answers.

## Decisions for the Surya-Siddhanta-specific pieces

See the list in the final report (README "Own drik ephemeris" bullet) for the current
decisions: ascendant, equation of time, eclipses, samvatsara, horizon altitude.
