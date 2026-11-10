"""Festivals kept on a fixed BS day (solar), not a tithi, and one row per festival.

Five years of a published patro (rat32, BS 2079–2083) put each of these on the same
BS day every year; a tithi rule would move them by up to a month.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pytest

from engine.astronomy.location import DEFAULT_LOCATION
from engine.calendar.bikram_sambat import bs_to_gregorian
from services.festivals.holiday_generator import festivals_on_date, load_rules


def _ids(day):
    return [f["id"] for f in festivals_on_date(day, DEFAULT_LOCATION)["festivals"]]


@pytest.mark.parametrize(
    ("festival_id", "bs_month", "bs_day"),
    [
        ("kheer-khane-din", 4, 15),
        ("dahi-chiura-khane-din", 3, 15),
        ("arniko-smriti-diwas", 9, 23),
        ("nepal-jyotish-parishad-diwas", 9, 24),
        ("tharu-guriya-parwa", 4, 1),
        ("siruwa-pawani", 1, 2),
        ("kirat-samaj-sudhar-diwas", 1, 24),
        ("law-day-nepal", 1, 26),
        ("caste-untouchability-abolition-day", 2, 21),
        ("vishwakarma-puja-solar", 6, 1),
        ("falgunanda-jayanti", 7, 25),
    ],
)
def test_solar_festival_keeps_its_bs_day(festival_id, bs_month, bs_day):
    for bs_year in (2081, 2082, 2083):
        assert festival_id in _ids(bs_to_gregorian(bs_year, bs_month, bs_day)), bs_year


@pytest.mark.parametrize(
    ("alias", "festival_id"),
    [
        ("mahaguru-falgunand-jayanti", "falgunanda-jayanti"),
        ("vishwakarma-puja", "vishwakarma-puja-solar"),
        ("tihar-vidaa", "tihar"),
    ],
)
def test_duplicate_rows_are_aliases(alias, festival_id):
    assert load_rules()[alias]["alias_of"] == festival_id
