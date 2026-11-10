"""BS 2083 Dashain as the published calendar has it: Maha Ashtami and Kalratri on
Kartik 1 (Ashtami holds sunrise on Kartik 1 and 2; the first day is kept), Kartik 2 the
holiday alone, Maha Navami on Kartik 3, and the 7-day दशैं बिदा (Ashoj 31 – Kartik 6) a public holiday on every day."""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION
from services.festivals.holiday_generator import festivals_on_date, is_public_holiday

ASHOJ_31 = date(2026, 10, 17)
KARTIK_6 = date(2026, 10, 23)


def _ids(day: date) -> list[str]:
    return [f["id"] for f in festivals_on_date(day, DEFAULT_LOCATION)["festivals"]]


def test_maha_ashtami_on_kartik_1_and_navami_on_kartik_3():
    assert "maha-ashtami" in _ids(date(2026, 10, 18))
    assert "kalratri" in _ids(date(2026, 10, 18))
    assert "maha-navami" in _ids(date(2026, 10, 20))
    assert "maha-ashtami" not in _ids(date(2026, 10, 19))
    assert "maha-navami" not in _ids(date(2026, 10, 19))


def test_every_day_of_the_dashain_block_is_a_public_holiday():
    day = ASHOJ_31
    while day <= KARTIK_6:
        ids = _ids(day)
        assert "dashain-vidaa" in ids, day
        assert any(is_public_holiday(i) for i in ids), day
        day += timedelta(days=1)
    assert "dashain-vidaa" not in _ids(KARTIK_6 + timedelta(days=1))


def test_the_day_festival_leads_the_holiday_block():
    assert _ids(date(2026, 10, 20))[0] == "maha-navami"
    assert _ids(date(2026, 10, 20))[-1] == "dashain-vidaa"


def test_single_day_vidaa_rows_are_folded_into_the_block():
    assert "dashain-vidaa-kartik-2" not in _ids(date(2026, 10, 19))
    assert "dashain-vidaa-kartik-6" not in _ids(KARTIK_6)
