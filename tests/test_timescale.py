"""Nepal observer timezone must be historically accurate, not a fixed offset."""

from datetime import datetime

from engine.astronomy.timescale import resolve_observer_timezone


def test_resolves_historical_pre_1986_offset():
    """Nepal used UTC+5:30 before 1986-01-01; a fixed +5:45 mis-times every
    pre-1986 instant by 15 minutes, shifting ephemeris-derived values (lagna,
    nakshatra, yoga) computed for historical birth charts."""
    tz = resolve_observer_timezone("Asia/Kathmandu")
    dt = datetime(1945, 12, 28, 11, 30, tzinfo=tz)
    assert dt.utcoffset().total_seconds() == 5.5 * 3600


def test_resolves_modern_offset_unchanged():
    tz = resolve_observer_timezone("Asia/Kathmandu")
    dt = datetime(2026, 7, 5, 12, 0, tzinfo=tz)
    assert dt.utcoffset().total_seconds() == 5.75 * 3600


def test_default_timezone_argument_matches_explicit_name():
    """The no-argument default path must resolve identically to passing the
    name explicitly — both go through the same historically-aware zone."""
    dt = datetime(1945, 12, 28, 11, 30)
    default_tz = resolve_observer_timezone(None)
    named_tz = resolve_observer_timezone("Asia/Kathmandu")
    assert dt.replace(tzinfo=default_tz).utcoffset() == dt.replace(tzinfo=named_tz).utcoffset()
