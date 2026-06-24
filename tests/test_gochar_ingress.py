from datetime import date, datetime, timezone

from core.location import DEFAULT_LOCATION
from core.swiss_eph import calculate_sunrise
from panchanga.gochar import (
    find_next_nakshatra_entry,
    find_next_pada_entry,
    build_gochar_ingress_range,
    find_ingress_entries_in_range,
)


def test_find_next_pada_entry_sun():
    sunrise = calculate_sunrise(
        date(2026, 6, 22),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    entry = find_next_pada_entry("sun", sunrise)
    assert entry is not None
    assert entry["level"] == "pada"
    assert 1 <= entry["to_pada"] <= 4
    assert entry["to_nakshatra_ne"]
    assert "मा" in entry["label_ne"]


def test_find_next_nakshatra_entry_sun():
    sunrise = calculate_sunrise(
        date(2026, 6, 22),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    entry = find_next_nakshatra_entry("sun", sunrise)
    assert entry is not None
    assert entry["level"] == "nakshatra"
    assert entry["to_nakshatra_ne"]


def test_pada_ingress_range_july():
    payload = build_gochar_ingress_range(
        date(2026, 6, 1),
        date(2026, 7, 31),
        DEFAULT_LOCATION,
        level="pada",
        grahas=["sun"],
    )
    events = payload["events"]
    assert len(events) >= 10
    assert all(e["graha"] == "sun" for e in events)
    assert all("label_ne" in e for e in events)
    assert all("entry_time_local_short" in e for e in events)


def test_ingress_entries_sorted():
    start = datetime(2026, 6, 1, tzinfo=timezone.utc)
    end = datetime(2026, 6, 30, tzinfo=timezone.utc)
    events = find_ingress_entries_in_range(
        start, end, level="pada", grahas=["mercury"]
    )
    times = [e["entry_time_utc"] for e in events]
    assert times == sorted(times)
