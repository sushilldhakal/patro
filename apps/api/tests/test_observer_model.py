"""ObserverLocation as a first-class scientific object.

Phase 1 made ``altitude`` an explicit field. It was previously read via
``getattr(location, "altitude", None)`` in ``SunService.sunrise_after`` — a field
the dataclass did not declare, so the lookup always missed and always fell
through to ``sun.default_altitude()``.

Two properties matter and are pinned here:

1. **Nothing changed.** Altitude defaults to sea level, which is exactly what
   every observer already got. Cache keys, serialized payloads and computed
   rise/set times are unchanged for every observer the API can construct.
2. **The observer geometry is now consistent.** All five astronomy-layer
   rise/set methods that take an ``ObserverLocation`` read the same altitude.
   Before Phase 1 only one of them mentioned altitude at all.

See docs/phase-1-observer-model-plan.md.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.location import (
    DEFAULT_ALTITUDE,
    DEFAULT_LOCATION,
    MIN_ALTITUDE_M,
    ObserverLocation,
    resolve_location,
    resolve_location_from_query,
)

ROOT = Path(__file__).resolve().parent.parent

JD_MODERN = CivilDay(2026, 6, 10).to_jd_ut()

KTM_SEA = ObserverLocation(
    lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu", name="Kathmandu"
)
KTM_HIGH = ObserverLocation(
    lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu", name="Kathmandu",
    altitude=1400.0,
)


class TestFieldSemantics:
    def test_altitude_defaults_to_sea_level(self):
        assert ObserverLocation().altitude == 0.0
        assert DEFAULT_LOCATION.altitude == 0.0
        assert DEFAULT_ALTITUDE == 0.0

    def test_default_matches_the_bare_float_resolver(self):
        """``DEFAULT_ALTITUDE`` and ``sun.default_altitude`` must not drift.

        Two entry points resolve an unspecified altitude: the dataclass default
        for callers holding an ObserverLocation, and ``default_altitude()`` for
        callers holding bare lat/lon floats. They describe the same physical
        choice — sea level — and a divergence would make a location's sunrise
        depend on which entry point the caller happened to use.
        """
        from engine.astronomy.sun import default_altitude

        assert default_altitude(27.7172, 85.3240) == DEFAULT_ALTITUDE
        assert default_altitude(-37.9152, 145.13) == DEFAULT_ALTITUDE

    def test_altitude_is_settable_and_frozen(self):
        loc = ObserverLocation(altitude=1400.0)
        assert loc.altitude == 1400.0
        with pytest.raises(Exception):
            loc.altitude = 12.0  # type: ignore[misc]

    def test_resolve_location_propagates_altitude(self):
        assert resolve_location(lat=26.5, lon=88.0, altitude=120.0).altitude == 120.0
        assert resolve_location(lat=26.5, lon=88.0).altitude == DEFAULT_ALTITUDE

    def test_resolve_location_from_query_propagates_altitude(self):
        loc = resolve_location_from_query(lat=26.5833, lon=88.0667, altitude=75.0)
        assert loc.altitude == 75.0

    def test_bare_resolve_still_returns_the_default_singleton(self):
        assert resolve_location() is DEFAULT_LOCATION

    def test_altitude_below_the_dead_sea_is_rejected(self):
        with pytest.raises(ValueError, match="altitude"):
            resolve_location(lat=27.0, lon=85.0, altitude=MIN_ALTITUDE_M - 1)

    def test_high_altitude_is_accepted(self):
        """No upper bound — the dip formula is monotonic and a summit or
        aircraft horizon is a legitimate thing to ask for."""
        assert resolve_location(lat=27.0, lon=85.0, altitude=8849.0).altitude == 8849.0


class TestBackwardCompatibility:
    """The serialized and cached surfaces must not have moved."""

    def test_as_dict_does_not_publish_altitude(self):
        """``as_dict()`` feeds 35 public API payload sites.

        Altitude is an *astronomy* input, not a display field, and it is 0.0 in
        100% of responses the current API can produce — publishing it would
        change 35 payloads to convey nothing. If this test fails because someone
        added the field, that is a deliberate API change: bump the payload
        version and update the response snapshots with it.
        """
        assert set(DEFAULT_LOCATION.as_dict()) == {"lat", "lon", "timezone", "name"}
        assert "altitude" not in DEFAULT_LOCATION.as_dict()

        with_city = ObserverLocation(city_id=1283240).as_dict()
        assert set(with_city) == {"lat", "lon", "timezone", "name", "city_id"}
        assert "altitude" not in with_city

    def test_cache_key_is_byte_identical_at_sea_level(self):
        """Pinned against a literal, not a recomputation.

        Altitude was a constant 0.0 before this field existed, so folding it
        into the key unconditionally would orphan every cached artifact while
        adding no discriminating power.
        """
        assert DEFAULT_LOCATION.cache_key() == "27.7172_85.3240_Asia/Kathmandu"
        assert (
            ObserverLocation(
                lat=26.5833, lon=88.0667, timezone="Asia/Kathmandu"
            ).cache_key()
            == "26.5833_88.0667_Asia/Kathmandu"
        )

    def test_cache_key_separates_a_different_elevation(self):
        assert KTM_HIGH.cache_key() != KTM_SEA.cache_key()
        assert KTM_HIGH.cache_key().endswith("_alt1400.0")

    def test_resolve_cache_keys_unchanged_for_every_constructible_observer(self):
        from services.panchanga_cache import resolve_cache_keys

        assert resolve_cache_keys(DEFAULT_LOCATION) == ("city:1283240", 1283240)
        # Explicit city id
        assert resolve_cache_keys(
            ObserverLocation(lat=26.65, lon=86.20, city_id=1283000)
        ) == ("city:1283000", 1283000)
        # Raw coordinates inside the Kathmandu snap radius
        assert resolve_cache_keys(
            ObserverLocation(lat=27.72, lon=85.33, timezone="Asia/Kathmandu")
        ) == ("city:1283240", 1283240)
        # Raw coordinates outside it
        assert resolve_cache_keys(
            ObserverLocation(lat=26.5833, lon=88.0667, timezone="Asia/Kathmandu")
        ) == ("26.5833_88.0667_Asia/Kathmandu", 0)

    def test_city_shortcuts_do_not_swallow_altitude(self):
        """Both shortcuts discard lat/lon on purpose. They must not discard
        elevation too — 1400 m moves sunrise ~6.3 minutes, so collapsing an
        elevated observer onto the town row serves them the wrong day."""
        from services.panchanga_cache import resolve_cache_keys

        key_sea, id_sea = resolve_cache_keys(
            ObserverLocation(lat=26.65, lon=86.20, city_id=1283000)
        )
        key_high, id_high = resolve_cache_keys(
            ObserverLocation(lat=26.65, lon=86.20, city_id=1283000, altitude=1400.0)
        )
        assert key_sea != key_high
        # The city_id column is preserved in both, so the index is unaffected.
        assert id_sea == id_high == 1283000

        # The Kathmandu snap must release an elevated observer too.
        assert resolve_cache_keys(KTM_HIGH)[0] != "city:1283240"


class TestObserverGeometryIsConsistent:
    """Every astronomy-layer rise/set method taking an ObserverLocation must
    use the same observer.

    Before Phase 1, ``SunService.sunrise_after`` read altitude via getattr while
    ``sunrise``, ``sunset``, ``moonrise_after`` and ``moonset_after`` never
    mentioned it. With a non-zero altitude the day boundary and the printed
    sunrise would have disagreed by ~6.3 minutes, contradicting
    ``sunrise_after``'s own docstring.
    """

    def test_sea_level_and_default_agree(self):
        """An explicit 0.0 and an unspecified altitude are the same observer."""
        from engine.astronomy.sun import sun_service

        assert sun_service.sunrise(JD_MODERN, KTM_SEA) == sun_service.sunrise(
            JD_MODERN, ObserverLocation(lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu")
        )

    def test_every_rise_set_method_responds_to_altitude(self):
        from engine.astronomy.moon import moon_service
        from engine.astronomy.sun import sun_service

        probes = {
            "sunrise": lambda loc: sun_service.sunrise(JD_MODERN, loc),
            "sunset": lambda loc: sun_service.sunset(JD_MODERN, loc),
            "moonrise_after": lambda loc: moon_service.moonrise_after(JD_MODERN, loc),
            "moonset_after": lambda loc: moon_service.moonset_after(JD_MODERN, loc),
        }
        for label, probe in probes.items():
            delta = (probe(KTM_HIGH) - probe(KTM_SEA)).total_seconds()
            assert abs(delta) > 60.0, (
                f"{label} ignored the observer's altitude — a 1400 m horizon dip "
                "must move it by minutes, not seconds"
            )

    def test_day_boundary_agrees_with_the_printed_sunrise(self):
        """``sunrise_after``'s documented invariant, at a non-zero altitude.

        This is the case Phase 1 exists to protect: it passes trivially at sea
        level, and fails if ``sunrise_after`` and ``sunrise`` ever resolve
        altitude differently again.
        """
        from engine.astronomy.sun import sun_service

        for loc in (KTM_SEA, KTM_HIGH):
            printed = sun_service.sunrise(JD_MODERN, loc)
            boundary = sun_service.sunrise_after(printed, loc)
            assert boundary == printed

    def test_sunrise_and_sunrise_after_shift_by_the_same_amount(self):
        from engine.astronomy.sun import sun_service

        sunrise_shift = (
            sun_service.sunrise(JD_MODERN, KTM_HIGH)
            - sun_service.sunrise(JD_MODERN, KTM_SEA)
        ).total_seconds()
        after_shift = (
            sun_service.sunrise_after(
                sun_service.sunrise(JD_MODERN, KTM_HIGH), KTM_HIGH
            )
            - sun_service.sunrise_after(
                sun_service.sunrise(JD_MODERN, KTM_SEA), KTM_SEA
            )
        ).total_seconds()
        assert sunrise_shift == pytest.approx(after_shift, abs=1.0)


class TestTheGetattrHoleStaysClosed:
    """Guard against the hidden-field pattern returning."""

    def test_no_getattr_altitude_anywhere(self):
        pattern = re.compile(r"getattr\s*\([^)]*altitude")
        offenders: list[str] = []
        for pkg in ("engine", "services", "api", "app", "rules"):
            for path in (ROOT / pkg).rglob("*.py"):
                if "__pycache__" in path.parts:
                    continue
                for lineno, line in enumerate(path.read_text().splitlines(), start=1):
                    code = line.split("#", 1)[0]
                    if pattern.search(code):
                        offenders.append(f"{path.relative_to(ROOT)}:{lineno}")
        assert not offenders, (
            "altitude is being read through getattr again — it is a declared "
            "field on ObserverLocation, read it directly: " + ", ".join(offenders)
        )

    def test_alt_kathmandu_constant_stays_removed(self):
        """It was unreferenced, and sat two lines above ``default_altitude``,
        whose docstring explains that 1400 m is the *wrong* number for a valley
        ringed by hills. Reintroducing it as a module constant invites exactly
        the ~7-minute sunrise regression that docstring warns against."""
        source = (ROOT / "engine" / "astronomy" / "sun.py").read_text()
        live = [
            line
            for line in source.splitlines()
            if "ALT_KATHMANDU" in line and not line.lstrip().startswith("#")
        ]
        assert not live, f"ALT_KATHMANDU is live again: {live}"
