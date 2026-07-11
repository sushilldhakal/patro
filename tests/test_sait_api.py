"""Tests for sait API static vs computed paths."""

from services.sait_api import get_sait_month_entries, list_sait_years
from engine.astronomy.location import DEFAULT_LOCATION


def test_list_sait_years_full_range():
    years = list_sait_years()
    assert years[0] == 1700
    assert years[-1] == 2200
    assert len(years) == 501


def test_official_override_2083_vivah():
    payload = get_sait_month_entries(2083, "vivah", DEFAULT_LOCATION)
    assert payload["source"] == "official"
    baisakh = next(m for m in payload["months"] if m["month"] == 1)
    assert set(baisakh["days"]) == {7, 8, 22, 23, 24, 25, 30, 31}


def test_official_override_2083_bratabandha():
    payload = get_sait_month_entries(2083, "bratabandha", DEFAULT_LOCATION)
    assert payload["source"] == "official"
    baisakh = next(m for m in payload["months"] if m["month"] == 1)
    assert set(baisakh["days"]) == {20, 21, 23}


def test_computed_year_uncurated_vivah():
    # 2085 has no official listing, so it falls back to the muhurta engine.
    payload = get_sait_month_entries(2085, "vivah", DEFAULT_LOCATION)
    assert payload["source"] == "computed"
    assert payload["months"]
