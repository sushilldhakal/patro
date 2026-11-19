"""BS 2083 Dashain, read from the panchanga — never from English dates.

Ghatasthapana is Ashwin Shukla Pratipada; Maha Ashtami, Maha Navami and Vijaya Dashami fall on
the days their tithis name, in that order; the दशैं बिदा runs from Phulpati (Saptami) through
Dwadashi and is a public holiday on every day of it.
"""

from __future__ import annotations

from datetime import date, timedelta

from engine.astronomy.location import DEFAULT_LOCATION
from services.festivals.holiday_generator import festivals_on_date, generate_bs_festivals, is_public_holiday
from tests.panchanga_facts import runs_on


def _ids(day: date) -> list[str]:
    return [f["id"] for f in festivals_on_date(day, DEFAULT_LOCATION)["festivals"]]


def _festivals() -> dict[str, dict]:
    return {f["id"]: f for f in generate_bs_festivals(2083, DEFAULT_LOCATION)["festivals"]}


def _day(festival: dict, key: str = "start_date") -> date:
    return date.fromisoformat(festival[key])


def test_each_day_carries_its_own_tithi_and_they_come_in_order():
    fest = _festivals()
    ashtami, navami, dashami = (_day(fest[k]) for k in ("maha-ashtami", "maha-navami", "vijaya-dashami"))
    assert runs_on(ashtami, 8, "shukla") and "kalratri" in _ids(ashtami)
    assert runs_on(navami, 9, "shukla")
    assert runs_on(dashami, 10, "shukla")
    assert ashtami < navami < dashami
    assert runs_on(_day(fest["ghatasthapana"]), 1, "shukla")


def test_every_day_of_the_dashain_block_is_a_public_holiday():
    block = _festivals()["dashain-vidaa"]
    start, end = _day(block), _day(block, "end_date")
    assert runs_on(start, 7, "shukla")  # Phulpati
    assert runs_on(end, 12, "shukla")  # Dwadashi
    day = start
    while day <= end:
        ids = _ids(day)
        assert "dashain-vidaa" in ids, day
        assert any(is_public_holiday(i) for i in ids), day
        day += timedelta(days=1)
    assert "dashain-vidaa" not in _ids(end + timedelta(days=1))


def test_the_day_festival_leads_the_holiday_block():
    navami = _day(_festivals()["maha-navami"])
    assert _ids(navami)[0] == "maha-navami"
    assert _ids(navami)[-1] == "dashain-vidaa"


def test_single_day_vidaa_rows_are_folded_into_the_block():
    block = _festivals()["dashain-vidaa"]
    day = _day(block)
    while day <= _day(block, "end_date"):
        assert not any(i.startswith("dashain-vidaa-") for i in _ids(day)), day
        day += timedelta(days=1)
