from datetime import date, datetime, timezone

from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.swiss_eph import calculate_sunrise
from engine.vedic.gochar import (
    find_next_nakshatra_entry,
    find_next_pada_entry,
    find_next_rashi_entry,
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


def test_pada_ingress_range_ashar_2083():
    """Ashar 2083 should list sun/mars pada changes plus mercury rashi re-entry."""
    payload = build_gochar_ingress_range(
        date(2026, 6, 15),
        date(2026, 7, 16),
        DEFAULT_LOCATION,
        level="patro",
    )
    events = payload["events"]
    assert len(events) >= 25
    grahas = {e["graha"] for e in events}
    assert "sun" in grahas
    assert "mars" in grahas
    assert "mercury" in grahas
    assert "venus" in grahas
    mercury_rashi = [e for e in events if e["graha"] == "mercury" and e["level"] == "rashi"]
    assert len(mercury_rashi) >= 2
    assert any("पुनः" in e.get("label_ne", "") for e in mercury_rashi)


def test_bisect_finds_retrograde_rashi_loop():
    sunrise = calculate_sunrise(
        date(2026, 6, 15),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    entry = find_next_rashi_entry("mercury", sunrise)
    assert entry is not None
    assert entry["to_rashi_ne"] == "कर्कट"
    start = datetime(2026, 6, 1, tzinfo=timezone.utc)
    end = datetime(2026, 6, 30, tzinfo=timezone.utc)
    events = find_ingress_entries_in_range(
        start, end, level="pada", grahas=["mercury"]
    )
    times = [e["entry_time_utc"] for e in events]
    assert times == sorted(times)
