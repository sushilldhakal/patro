"""Tests for sait API static vs computed paths."""

from services.sait_api import (
    get_sait_detail,
    get_sait_month_entries,
    list_sait_years,
)
from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.muhurta_engine import TOGGLEABLE_RULE_IDS


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


def test_vivah_exposes_toggleable_rules():
    ids = TOGGLEABLE_RULE_IDS["vivah"]
    assert {"vara", "nakshatra", "tithi", "simhastha", "kshaya-paksha"} <= ids


def test_bratabandha_exposes_toggleable_rules():
    ids = TOGGLEABLE_RULE_IDS["bratabandha"]
    assert {"nakshatra", "galagraha", "graha", "simhastha", "time-window"} <= ids


def test_bratabandha_detail_echoes_nakshatra_mode():
    full = get_sait_detail(2083, "bratabandha", DEFAULT_LOCATION)
    assert full["nakshatra_mode"] == "classical"
    nepali = get_sait_detail(
        2083, "bratabandha", DEFAULT_LOCATION, nakshatra_mode="nepali",
    )
    assert nepali["nakshatra_mode"] == "nepali"
    assert len(nepali["days"]) >= len(full["days"])


def test_sait_detail_excluding_rules_widens_the_list():
    """Dropping the nakṣatra + tithi allow-lists must yield at least as many
    days as the full rule (relaxing a constraint can only add candidates), and
    the applied exclusions are echoed back."""
    full = get_sait_detail(2083, "vivah", DEFAULT_LOCATION)
    assert full["excluded_rules"] == []
    relaxed = get_sait_detail(
        2083, "vivah", DEFAULT_LOCATION, frozenset({"nakshatra", "tithi"})
    )
    assert relaxed["excluded_rules"] == ["nakshatra", "tithi"]
    assert len(relaxed["days"]) >= len(full["days"])


def test_sait_detail_ignores_unknown_exclusions():
    baseline = get_sait_detail(2083, "vivah", DEFAULT_LOCATION)
    bogus = get_sait_detail(2083, "vivah", DEFAULT_LOCATION, frozenset({"bogus"}))
    assert bogus["excluded_rules"] == []
    assert len(bogus["days"]) == len(baseline["days"])
