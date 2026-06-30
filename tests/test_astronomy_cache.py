"""Global astronomy memo — correctness and hit-rate invariants."""

from datetime import datetime, timezone

from engine.astronomy.engine import AstronomyEngine


def _jd():
    eng = AstronomyEngine()
    return eng.julian_day(datetime(2026, 6, 30, 0, 30, tzinfo=timezone.utc))


def test_cache_returns_identical_values():
    """A cache hit must return exactly what an uncached call would."""
    eng = AstronomyEngine()
    jd = _jd()

    eng.cache_clear()
    first = eng.all_planet_positions(jd)      # all misses
    second = eng.all_planet_positions(jd)     # all hits
    assert first == second

    fresh = AstronomyEngine()
    fresh.cache_clear()
    assert fresh.all_planet_positions(jd) == first


def test_repeat_calls_hit_cache():
    eng = AstronomyEngine()
    eng.cache_clear()
    jd = _jd()

    eng.sun_longitude(jd)
    eng.moon_longitude(jd)
    misses_after_first = eng.cache_info()["misses"]

    # Same instant, same bodies — should be served from memo, no new misses.
    eng.sun_longitude(jd)
    eng.moon_longitude(jd)
    info = eng.cache_info()
    assert info["misses"] == misses_after_first
    assert info["hits"] >= 2


def test_sidereal_and_tropical_are_distinct_keys():
    eng = AstronomyEngine()
    eng.cache_clear()
    jd = _jd()

    sid = eng.sun_longitude(jd, sidereal=True)
    trop = eng.sun_longitude(jd, sidereal=False)
    # Different frames → different cached values, two misses.
    assert abs((trop - sid) % 360) > 1.0
    assert eng.cache_info()["misses"] == 2


def test_cache_is_bounded():
    eng = AstronomyEngine()
    eng.cache_clear()
    base = eng.julian_day(datetime(2000, 1, 1, tzinfo=timezone.utc))
    # Far more distinct instants than the cap; size must stay bounded.
    for i in range(eng._CACHE_MAX + 500):
        eng.sun_longitude(base + i * 0.5)
    assert eng.cache_info()["size"] <= eng._CACHE_MAX
