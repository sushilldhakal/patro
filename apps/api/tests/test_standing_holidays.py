"""Holidays the gazette grants — general rest days and audience-limited days. The gazette
decides which festivals are rest days; their dates are computed (default calculation).

Ghatasthapana is its own rest day. Dashain and Tihar are multi-day blocks.
Audience-limited days (Kirat, disability, women, valley, …) are listed and
are not general rest days.
"""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from tests.panchanga_facts import bs_of, runs_on
from services.festivals.holiday_generator import (
    generate_bs_holidays,
    holidays_on_date,
    is_public_holiday,
)


def _by_id(bs_year: int) -> dict[str, dict]:
    return {h["id"]: h for h in generate_bs_holidays(bs_year)["holidays"]}


def _day(entry: dict, key: str = "start_date") -> date:
    return date.fromisoformat(entry[key])


def _span(entry: dict) -> int:
    return (_day(entry, "end_date") - _day(entry)).days + 1


def test_ghatasthapana_is_a_rest_day_apart_from_the_dashain_block():
    assert is_public_holiday("ghatasthapana")
    assert not is_public_holiday("fulpati")
    assert not is_public_holiday("maha-ashtami")
    listed = _by_id(2083)
    ghatasthapana = _day(listed["ghatasthapana"])
    ids = [h["id"] for h in holidays_on_date(ghatasthapana, DEFAULT_LOCATION)["holidays"]]
    assert ids == ["ghatasthapana"]
    block = [h["id"] for h in holidays_on_date(_day(listed["dashain-vidaa"]), DEFAULT_LOCATION)["holidays"]]
    assert "ghatasthapana" not in block
    assert "dashain-vidaa" in block


def _rest_days_and_blocks(bs_year: int):
    listed = _by_id(bs_year)
    assert runs_on(_day(listed["ghatasthapana"]), 1, "shukla")
    dashain = listed["dashain-vidaa"]
    assert runs_on(_day(dashain), 7, "shukla") and runs_on(_day(dashain, "end_date"), 12, "shukla")
    assert dashain["duration_days"] == _span(dashain)
    tihar = listed["tihar"]
    # Laxmi Puja's Amavasya through the day after Bhai Tika (Shukla Dwitiya).
    assert runs_on(_day(tihar), 15, "krishna")
    assert tihar["duration_days"] == _span(tihar) == 5
    chhath = listed["chhath"]
    assert chhath["start_date"] == chhath["end_date"] and runs_on(_day(chhath), 6, "shukla")
    return listed


def test_2083_rest_days_and_blocks():
    listed = _rest_days_and_blocks(2083)
    assert bs_of(_day(listed["ganatantra-diwas"]))[1:] == (2, 15)
    assert bs_of(_day(listed["sambidhan-diwas"]))[1:] == (6, 3)


def test_2082_rest_days_and_blocks():
    listed = _rest_days_and_blocks(2082)
    assert runs_on(_day(listed["ram-navami"]), 9, "shukla")
    assert runs_on(_day(listed["shivaratri"]), 14, "krishna")
    assert runs_on(_day(listed["sonam-lhosar"]), 1, "shukla")


def test_audience_limited_holidays_are_listed_and_are_not_general_rest_days():
    listed = _by_id(2083)
    falgunanda = listed["falgunanda-jayanti"]
    assert bs_of(_day(falgunanda))[1:] == (7, 25)
    assert falgunanda["audience"] == "kirat" and falgunanda["is_public_holiday"] is False

    # A Gregorian-fixed day: 3 December is its definition.
    disability = listed["international-day-of-persons-with-disabilities"]
    assert disability["start_date"].endswith("-12-03")
    assert disability["audience"] == "disability" and disability["is_public_holiday"] is False

    assert listed["teej"]["audience"] == "women"
    assert listed["teej"]["is_public_holiday"] is False
    assert listed["gai-jatra"]["audience"] == "newar"
    assert listed["indra-jatra"]["audience"] == "kathmandu_valley"
    assert runs_on(_day(listed["ghode-jatra"]), 15, "krishna")
    assert listed["saraswati-puja"]["audience"] == "education"
    assert runs_on(_day(listed["jitiya-parwa"]), 8, "krishna")
    assert listed["dura-mhepra-nakuma"]["audience"] == "dura"

    listed_82 = _by_id(2082)
    assert bs_of(_day(listed_82["falgunanda-jayanti"]))[1:] == (7, 25)
    assert runs_on(_day(listed_82["gai-jatra"]), 1, "krishna")
    assert runs_on(_day(listed_82["indra-jatra"]), 14, "shukla")
    assert runs_on(_day(listed_82["gaura-parwa"]), 8, "shukla")
