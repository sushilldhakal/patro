"""Dashain, read from the panchanga — never from English dates.

Nirnaya Sindhu and Dharma Sindhu: महाअष्टमी is Navami-joined and never Saptami-viddha
("सप्तमीमिश्रिताष्टमी वर्जनीया"; "घटिकामात्राप्यौदयिकी नवमीयुता ग्राह्या") — the day Ashtami holds
sunrise, the second when it holds two; महानवमी the day Navami holds sunrise ("न कुर्यान्नवमीं
दशम्याम्"); विजया दशमी the day Dashami holds sunrise (Navami-viddha Dashami is rejected). So
फूलपाती, अष्टमी, नवमी and दशमी are four days in a row, each on its own sunrise, unless a tithi is
kshaya (it touches no sunrise) or Ashtami is vriddhi. The दशैं बिदा runs from Phulpati through
Dwadashi and is a public holiday on every day of it.
"""

from __future__ import annotations

from datetime import date, timedelta

from engine.astronomy.location import DEFAULT_LOCATION
from services.festivals.holiday_generator import festivals_on_date, generate_bs_festivals, is_public_holiday
import pytest

from engine.astronomy.siddhanta import use_siddhanta
from services.festivals.holiday_generator import clear_year_payload_memo
from tests.panchanga_facts import runs_on, tithis_of


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


def _holds_sunrise_or_kshaya(day: date, tithi: int) -> bool:
    """The tithi holds this day's sunrise, or it is kshaya and runs within this day."""
    at_sunrise, seen = tithis_of(day)
    if at_sunrise == tithi:
        return True
    return tithi in seen and tithis_of(day + timedelta(days=1))[0] != tithi


@pytest.mark.parametrize("siddhanta_id", ["drik", "surya_siddhanta"])
@pytest.mark.parametrize("bs_year", range(2078, 2091))
def test_ashtami_navami_and_dashami_each_keep_their_own_sunrise(siddhanta_id, bs_year):
    with use_siddhanta(siddhanta_id):
        clear_year_payload_memo()
        fest = {f["id"]: f for f in generate_bs_festivals(bs_year, DEFAULT_LOCATION)["festivals"]}
        phulpati, ashtami, navami, dashami = (
            _day(fest[k]) for k in ("fulpati", "maha-ashtami", "maha-navami", "vijaya-dashami")
        )
        # Never Saptami-viddha: Ashtami at sunrise, and the second sunrise when it holds two.
        assert _holds_sunrise_or_kshaya(ashtami, 8)
        assert tithis_of(ashtami)[0] != 7
        assert tithis_of(ashtami + timedelta(days=1))[0] != 8
        assert _holds_sunrise_or_kshaya(navami, 9)
        assert _holds_sunrise_or_kshaya(dashami, 10)
        assert tithis_of(dashami)[0] != 9  # Navami-viddha Dashami is rejected
        assert _holds_sunrise_or_kshaya(phulpati, 7)
        assert phulpati < ashtami <= navami < dashami
        # Ashtami and Navami share a day only when Navami touches no sunrise.
        if ashtami == navami:
            assert tithis_of(navami + timedelta(days=1))[0] != 9
        clear_year_payload_memo()
