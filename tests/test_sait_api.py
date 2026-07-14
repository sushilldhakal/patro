"""Tests for sait API static vs computed paths."""

from services.sait_api import get_sait_month_entries, list_sait_years
from engine.astronomy.location import DEFAULT_LOCATION


def test_list_sait_years_full_range():
    years = list_sait_years()
    assert years[0] == 1700
    assert years[-1] == 2200
    assert len(years) == 501


def test_curated_year_now_served_computed():
    # Even a year present in the curated Samiti JSON (2083) is served from our
    # own computed engine now — never the official override.
    payload = get_sait_month_entries(2083, "vivah", DEFAULT_LOCATION)
    assert payload["source"] != "official"
    assert payload["months"]


def test_computed_year_uncurated_vivah():
    payload = get_sait_month_entries(2085, "vivah", DEFAULT_LOCATION)
    assert payload["source"] != "official"
    assert payload["months"]
