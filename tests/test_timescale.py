"""Nepal observer timezone must be historically accurate, not a fixed offset."""

from datetime import date, datetime

from engine.astronomy.location import resolve_location
from engine.astronomy.timescale import (
    IST_OFFSET_SECONDS,
    KMT_OFFSET_SECONDS,
    NPT_OFFSET_SECONDS,
    is_nepal_observer,
    nepal_timezone_era,
    normalize_observer_timezone,
    observer_utc_offset_seconds,
    resolve_observer_timezone,
)
from engine.vedic.at_time import parse_query_datetime


def test_resolves_kmt_era_before_1920():
    """≤ 1919-12-31: Kathmandu Mean Time UTC+05:41:16."""
    tz = resolve_observer_timezone("Asia/Kathmandu")
    dt = datetime(1919, 12, 31, 12, 0, tzinfo=tz)
    assert dt.utcoffset().total_seconds() == KMT_OFFSET_SECONDS


def test_resolves_ist_era_1920_to_1985():
    """1920-01-01 … 1985-12-31: Indian Standard Time UTC+05:30."""
    tz = resolve_observer_timezone("Asia/Kathmandu")
    dt = datetime(1945, 12, 28, 11, 30, tzinfo=tz)
    assert dt.utcoffset().total_seconds() == IST_OFFSET_SECONDS


def test_resolves_npt_era_from_1986():
    """≥ 1986-01-01: Nepal Standard Time UTC+05:45."""
    tz = resolve_observer_timezone("Asia/Kathmandu")
    dt = datetime(2026, 7, 5, 12, 0, tzinfo=tz)
    assert dt.utcoffset().total_seconds() == NPT_OFFSET_SECONDS


def test_default_timezone_argument_matches_explicit_name():
    """The no-argument default path must resolve identically to passing the
    name explicitly — both go through the same historically-aware zone."""
    dt = datetime(1945, 12, 28, 11, 30)
    default_tz = resolve_observer_timezone(None)
    named_tz = resolve_observer_timezone("Asia/Kathmandu")
    assert dt.replace(tzinfo=default_tz).utcoffset() == dt.replace(tzinfo=named_tz).utcoffset()


def test_nepal_coordinates_force_kathmandu_zone():
    """A Nepal lat/lon with a wrong IANA label must still use Asia/Kathmandu."""
    assert normalize_observer_timezone("UTC", lat=27.7172, lon=85.3240) == "Asia/Kathmandu"
    assert normalize_observer_timezone("Asia/Kolkata", lat=28.2, lon=83.9) == "Asia/Kathmandu"


def test_non_nepal_coordinates_keep_timezone():
    assert normalize_observer_timezone("Asia/Kolkata", lat=28.6, lon=77.2) == "Asia/Kolkata"


def test_is_nepal_observer_by_country():
    assert is_nepal_observer(None, None, country="NP")
    assert not is_nepal_observer(None, None, country="IN")


def test_nepal_timezone_era_labels():
    assert nepal_timezone_era(date(1919, 12, 31))["key"] == "kmt"
    assert nepal_timezone_era(date(1920, 1, 1))["key"] == "ist"
    assert nepal_timezone_era(date(1985, 12, 31))["key"] == "ist"
    assert nepal_timezone_era(date(1986, 1, 1))["key"] == "npt"


def test_parse_query_datetime_uses_historical_offset_for_nepal():
    """Naive birth clock on a pre-1986 Nepal date must land in IST, not NPT."""
    instant = parse_query_datetime(
        "1945-12-28T11:30:00",
        timezone_name="Asia/Kathmandu",
        lat=27.7172,
        lon=85.3240,
    )
    assert instant.utcoffset().total_seconds() == IST_OFFSET_SECONDS


def test_observer_utc_offset_seconds_matches_era():
    dt = datetime(1910, 6, 1, 8, 0)
    secs = observer_utc_offset_seconds(
        dt, "Asia/Kathmandu", lat=27.7172, lon=85.3240,
    )
    assert secs == KMT_OFFSET_SECONDS


def test_resolve_location_normalizes_nepal_timezone():
    loc = resolve_location(lat=27.7, lon=85.3, timezone="UTC")
    assert loc.timezone == "Asia/Kathmandu"
