"""Tests for Purnimant festival masa and MoHA-aligned Shrawan Purnima."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from core.location import DEFAULT_LOCATION
from panchanga.bikram_sambat import gregorian_to_bs
from panchanga.lunar_month import (
    build_purnimant_months,
    clear_lunar_year_cache,
    find_festival_in_lunar_month,
    get_lunar_calendar_layers,
    get_lunar_year,
)
from rules.engine import compute_festival_dates
import json


@pytest.fixture(autouse=True)
def _clear_cache():
    clear_lunar_year_cache()
    yield
    clear_lunar_year_cache()


def test_adhik_jestha_detected_2026():
    lunar_year = get_lunar_year(2026)
    assert lunar_year.has_adhik is True
    assert lunar_year.adhik_month_name == "Jestha"


def test_purnimant_shrawan_window_2026():
    windows = build_purnimant_months(get_lunar_year(2026))
    shrawan = next(w for w in windows if w.solar_name == "Shrawan" and not w.is_adhik)
    bhadra = next(w for w in windows if w.solar_name == "Bhadra" and not w.is_adhik)
    assert shrawan.start == date(2026, 6, 30)
    assert shrawan.end_purnima == date(2026, 7, 29)
    assert bhadra.start == date(2026, 7, 30)
    assert bhadra.end_purnima == date(2026, 8, 28)


def test_festival_masa_lag_during_adhik_jestha():
    windows = build_purnimant_months(get_lunar_year(2026))
    bhadra = next(w for w in windows if w.solar_name == "Bhadra" and not w.is_adhik)
    assert bhadra.festival_masa == "Shrawan"


def test_janai_purnima_2083_matches_moha():
    rules = json.loads((ROOT / "rules" / "festival_rules_v3.json").read_text())["festivals"]
    result = compute_festival_dates("janai-purnima", rules["janai-purnima"], 2026, DEFAULT_LOCATION)
    assert result is not None
    start, _end = result
    assert start == date(2026, 8, 28)
    bs_year, bs_month, bs_day = gregorian_to_bs(start)
    assert bs_year == 2083
    assert bs_month == 5
    assert bs_day == 12


@pytest.mark.parametrize(
    "bs_year,expected",
    [
        (2080, date(2023, 8, 31)),
        (2081, date(2024, 8, 19)),
        (2082, date(2025, 8, 9)),
        (2083, date(2026, 8, 28)),
    ],
)
def test_janai_purnima_recent_moha_years(bs_year: int, expected: date):
    gregorian_year = expected.year
    found = find_festival_in_lunar_month(
        lunar_month_name="Shrawan",
        tithi=15,
        paksha="shukla",
        gregorian_year=gregorian_year,
        month_model="festival",
        location=DEFAULT_LOCATION,
    )
    assert found == expected


def test_merge_lunar_month_purnimanta_adhik_jestha_2026():
    from panchanga.lunar_month import merge_lunar_month_for_day

    adhik = merge_lunar_month_for_day(date(2026, 5, 15))
    assert adhik["purnimanta_name"] == "Jestha"
    assert adhik["purnimanta_is_adhik"] is True
    assert adhik["purnimanta_type"] == "adhik"
    assert adhik["purnimanta_name_ne"] == "ज्येष्ठ"

    shuddha = merge_lunar_month_for_day(date(2026, 6, 10))
    assert shuddha["purnimanta_name"] == "Jestha"
    assert shuddha["purnimanta_is_adhik"] is False
    assert shuddha["purnimanta_type"] == "nija"


def test_merge_lunar_month_normal_month():
    from panchanga.lunar_month import merge_lunar_month_for_day

    normal = merge_lunar_month_for_day(date(2026, 7, 15))
    assert normal["purnimanta_name"] == "Ashadh"
    assert normal["purnimanta_is_adhik"] is False


def test_daily_panchanga_includes_purnimanta_fields():
    from panchanga.daily import build_daily_panchanga

    payload = build_daily_panchanga(date(2026, 6, 10), DEFAULT_LOCATION)
    lunar = payload["lunar_month"]
    assert lunar["purnimanta_name"] == "Jestha"
    assert lunar["purnimanta_name_ne"] == "ज्येष्ठ"


def test_lunar_calendar_layers_on_janai_day():
    layers = get_lunar_calendar_layers(date(2026, 8, 28))
    assert layers["adhik_maas"]["year_has_adhik"] is True
    assert layers["amanta"]["name"] == "Bhadra"
    assert layers["purnimant"]["solar_name"] == "Bhadra"
    assert layers["festival_masa"]["festival_masa"] == "Shrawan"
    assert layers["festival_masa"]["window_end"] == "2026-08-28"
