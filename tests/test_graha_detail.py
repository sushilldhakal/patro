from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.graha_detail import (
    YEARLY_GRAHAS,
    build_eclipse_year,
    build_graha_asta_year,
    build_graha_sthiti,
    build_graha_vakri_year,
)

GRAHA_KEYS = {
    "lagna", "sun", "moon", "mars", "mercury",
    "jupiter", "venus", "saturn", "rahu", "ketu",
}


def test_graha_sthiti_has_all_rows_and_columns():
    payload = build_graha_sthiti(date(2025, 7, 19), DEFAULT_LOCATION)
    rows = payload["rows"]
    # लग्न + 9 grahas.
    assert len(rows) == 10
    assert {r["graha"] for r in rows} == GRAHA_KEYS
    assert rows[0]["graha"] == "lagna"

    for r in rows:
        for key in (
            "rekhamsha", "nakshatra_ne", "pada", "nakshatra_lord_ne",
            "sub_lord_ne", "full_degree", "shara", "speed_deg_day",
            "right_ascension", "declination",
        ):
            assert key in r, f"{r['graha']} missing {key}"
        assert 0.0 <= r["full_degree"] < 360.0
        assert 1 <= r["pada"] <= 4
        assert 0.0 <= r["right_ascension"] < 360.0
        assert -90.0 <= r["declination"] <= 90.0


def test_graha_sthiti_sun_declination_positive_in_july():
    """Sun sits ~+20° declination in mid-July (northern summer)."""
    payload = build_graha_sthiti(date(2025, 7, 19), DEFAULT_LOCATION)
    sun = next(r for r in payload["rows"] if r["graha"] == "sun")
    assert 18.0 <= sun["declination"] <= 23.0
    # Sun is never retrograde and its ecliptic latitude is ~0.
    assert sun["is_retrograde"] is False


def test_graha_sthiti_saturn_retrograde_mid_2025():
    payload = build_graha_sthiti(date(2025, 7, 19), DEFAULT_LOCATION)
    saturn = next(r for r in payload["rows"] if r["graha"] == "saturn")
    assert saturn["is_retrograde"] is True
    assert saturn["speed_deg_day"] < 0.0


def test_asta_year_has_periods_including_moon():
    payload = build_graha_asta_year(2082, DEFAULT_LOCATION)
    assert payload["periods"], "expected asta periods in the year"
    grahas = {p["graha"] for p in payload["periods"]}
    # Moon Tara Asta must be present — one window per lunation.
    assert "moon" in grahas
    moon = [p for p in payload["periods"] if p["graha"] == "moon"]
    assert 11 <= len(moon) <= 13, f"expected ~12 lunations, got {len(moon)}"
    for p in payload["periods"]:
        if p["start"] and p["end"]:
            assert p["duration_days"] >= 1
            assert p["start"]["date_bs"]


def test_moon_tara_asta_matches_reference_window():
    """Jan 2026 Moon Tara Asta: moonrise 17 Jan → moonset 20 Jan (BS 2082)."""
    payload = build_graha_asta_year(2082, DEFAULT_LOCATION)
    jan = [
        p for p in payload["periods"]
        if p["graha"] == "moon" and p["start"] and p["start"]["date_ad"] == "2026-01-17"
    ]
    assert jan, "expected a Moon Tara Asta window starting 2026-01-17"
    p = jan[0]
    assert p["start"]["time_short"] == "05:50"
    assert p["end"]["date_ad"] == "2026-01-20"
    assert p["end"]["time_short"] == "19:02"
    assert p["duration_days"] == 4


def test_vakri_year_has_stations_with_bs_dates():
    payload = build_graha_vakri_year(2082, DEFAULT_LOCATION)
    assert payload["events"], "expected retrograde/direct stations in the year"
    labels = {e["label_ne"] for e in payload["events"]}
    assert "वक्री" in labels
    for e in payload["events"]:
        assert e["graha"] in YEARLY_GRAHAS
        assert e["entry_date_bs"]


def test_lunar_eclipse_sept_2025_visible_from_nepal():
    """The 7 Sep 2025 total lunar eclipse is visible from Kathmandu."""
    payload = build_eclipse_year(2082, "lunar", DEFAULT_LOCATION)
    assert payload["events"]
    sept = [e for e in payload["events"] if e["date_ad"] == "2025-09-07"]
    assert sept, "expected the 7 Sep 2025 lunar eclipse"
    ev = sept[0]
    assert ev["type"] == "total"
    assert ev["visible"] is True
    assert ev["begin_local"] and ev["end_local"]


def test_solar_eclipse_year_lists_events():
    payload = build_eclipse_year(2082, "solar", DEFAULT_LOCATION)
    assert payload["kind"] == "solar"
    for e in payload["events"]:
        assert e["kind"] == "solar"
        assert e["type"] in ("total", "annular", "hybrid", "partial")
