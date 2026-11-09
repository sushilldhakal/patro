"""Holidays the gazette grants — general rest days and audience-limited days.

Ghatasthapana is its own rest day. Dashain and Tihar are multi-day blocks.
Audience-limited days (Kirat, disability, women, valley, …) are listed and
are not general rest days.
"""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from services.festivals.holiday_generator import (
    generate_bs_holidays,
    holidays_on_date,
    is_public_holiday,
)


def _by_id(bs_year: int) -> dict[str, dict]:
    return {h["id"]: h for h in generate_bs_holidays(bs_year)["holidays"]}


def test_ghatasthapana_is_a_rest_day_apart_from_the_dashain_block():
    assert is_public_holiday("ghatasthapana")
    assert not is_public_holiday("fulpati")
    assert not is_public_holiday("maha-ashtami")
    ghatasthapana = date(2026, 10, 11)
    ids = [h["id"] for h in holidays_on_date(ghatasthapana, DEFAULT_LOCATION)["holidays"]]
    assert ids == ["ghatasthapana"]
    block = [h["id"] for h in holidays_on_date(date(2026, 10, 17), DEFAULT_LOCATION)["holidays"]]
    assert "ghatasthapana" not in block
    assert "dashain-vidaa" in block


def test_gazette_2083_rest_days_and_blocks():
    listed = _by_id(2083)
    assert listed["ghatasthapana"]["start_date"] == "2026-10-11"
    assert listed["dashain-vidaa"]["start_date"] == "2026-10-17"
    assert listed["dashain-vidaa"]["end_date"] == "2026-10-23"
    assert listed["dashain-vidaa"]["duration_days"] == 7
    assert listed["tihar"]["start_date"] == "2026-11-08"
    assert listed["tihar"]["end_date"] == "2026-11-12"
    assert listed["tihar"]["duration_days"] == 5
    assert listed["chhath"]["start_date"] == listed["chhath"]["end_date"] == "2026-11-15"
    assert listed["ganatantra-diwas"]["start_date"] == "2026-05-29"
    assert listed["sambidhan-diwas"]["start_date"] == "2026-09-19"


def test_gazette_2082_rest_days_and_blocks():
    listed = _by_id(2082)
    assert listed["ghatasthapana"]["start_date"] == "2025-09-22"
    assert listed["dashain-vidaa"]["start_date"] == "2025-09-29"
    assert listed["dashain-vidaa"]["end_date"] == "2025-10-04"
    assert listed["dashain-vidaa"]["duration_days"] == 6
    assert listed["tihar"]["start_date"] == "2025-10-20"
    assert listed["tihar"]["end_date"] == "2025-10-24"
    # Kartik 3–7 is five civil days; some gazette tables label the block "4 days".
    assert listed["tihar"]["duration_days"] == 5
    assert listed["chhath"]["start_date"] == listed["chhath"]["end_date"] == "2025-10-27"
    assert listed["ram-navami"]["start_date"] == "2026-03-27"
    assert listed["shivaratri"]["start_date"] == "2026-02-15"
    assert listed["sonam-lhosar"]["start_date"] == "2026-01-19"


def test_audience_limited_holidays_are_listed_and_are_not_general_rest_days():
    listed = _by_id(2083)
    assert listed["falgunanda-jayanti"]["start_date"] == "2026-11-11"
    assert listed["falgunanda-jayanti"]["audience"] == "kirat"
    assert listed["falgunanda-jayanti"]["is_public_holiday"] is False

    assert listed["international-day-of-persons-with-disabilities"]["start_date"] == "2026-12-03"
    assert listed["international-day-of-persons-with-disabilities"]["audience"] == "disability"
    assert listed["international-day-of-persons-with-disabilities"]["is_public_holiday"] is False

    assert listed["teej"]["audience"] == "women"
    assert listed["teej"]["is_public_holiday"] is False
    assert listed["gai-jatra"]["audience"] == "newar"
    assert listed["indra-jatra"]["audience"] == "kathmandu_valley"
    assert listed["ghode-jatra"]["start_date"] == "2027-04-06"
    assert listed["saraswati-puja"]["audience"] == "education"
    assert listed["jitiya-parwa"]["start_date"] == "2026-10-04"
    assert listed["dura-mhepra-nakuma"]["audience"] == "dura"

    listed_82 = _by_id(2082)
    assert listed_82["falgunanda-jayanti"]["start_date"] == "2026-03-09"
    assert listed_82["gai-jatra"]["start_date"] == "2025-08-10"
    assert listed_82["indra-jatra"]["start_date"] == "2025-09-06"
    assert listed_82["gaura-parwa"]["start_date"] == "2025-08-31"
