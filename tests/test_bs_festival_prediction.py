"""BS-year festival prediction — compute on demand from lunar/solar rules."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.bikram_sambat import gregorian_to_bs
from engine.vedic.lunar_month import clear_lunar_year_cache
from services.holiday_generator import (
    generate_bs_festivals,
    get_bs_festivals,
    load_rules,
)
from rules.engine import compute_festival_dates


@pytest.fixture(autouse=True)
def _clear_lunar_cache():
    clear_lunar_year_cache()
    yield
    clear_lunar_year_cache()


@pytest.mark.parametrize("bs_year", [2083, 2084, 2085])
def test_generate_bs_festivals_for_future_years(bs_year: int):
    payload = generate_bs_festivals(bs_year, DEFAULT_LOCATION)
    assert payload["bs_year"] == bs_year
    assert payload["count"] > 100
    ids = {f["id"] for f in payload["festivals"]}
    assert "dashain" in ids
    assert "tihar" in ids
    assert "holi" in ids


def test_dashain_2084_predicted_from_lunar_rules():
    rules = load_rules()
    dashain = rules["dashain"]
    for gregorian_year in (2027, 2028):
        dates = compute_festival_dates("dashain", dashain, gregorian_year, DEFAULT_LOCATION)
        if dates is None:
            continue
        start, _end = dates
        bs_year, bs_month, _bs_day = gregorian_to_bs(start)
        if bs_year == 2084:
            assert bs_month in (6, 7)
            return
    pytest.fail("Dashain not found in BS 2084")


def test_mata_tirtha_aunshi_bs_2084_civil_baishakh():
    payload = generate_bs_festivals(2084, DEFAULT_LOCATION)
    mata = next(f for f in payload["festivals"] if f["id"] == "mata-tirtha-aunshi")
    assert mata["start_date"] == "2027-05-06"
    bs_year, bs_month, bs_day = gregorian_to_bs(__import__("datetime").date.fromisoformat(mata["start_date"]))
    assert bs_year == 2084
    assert bs_month == 1
    assert bs_day == 23


def test_get_bs_festivals_computes_without_preexisting_cache(tmp_path, monkeypatch):
    import services.holiday_generator as hg

    monkeypatch.setattr(hg, "CACHE_DIR", tmp_path)

    payload = get_bs_festivals(2090, DEFAULT_LOCATION, cache_only=False)
    assert payload["bs_year"] == 2090
    assert payload["count"] > 50
    assert any(tmp_path.glob("festivals_bs_2090_*.json"))
