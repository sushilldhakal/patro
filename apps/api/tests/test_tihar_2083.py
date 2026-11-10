"""BS 2083 Tihar and the 2083 holidays as the published calendar lists them.

Kaag Tihar is Kartik Krishna Trayodashi (with Dhanteras), Gai Puja the morning the
Amavasya holds sunrise, Mha Puja the Nepal Sambat new year on Shukla Pratipada.
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION
from services.festivals.holiday_generator import festivals_on_date, is_public_holiday


def _ids(day: date) -> list[str]:
    return [f["id"] for f in festivals_on_date(day, DEFAULT_LOCATION)["festivals"]]


def test_tihar_days_2083():
    assert "kaag-tihar" in _ids(date(2026, 11, 7))
    assert "dhanteras" in _ids(date(2026, 11, 7))
    nov8 = _ids(date(2026, 11, 8))
    assert {"laxmi-puja", "kukur-tihar"} <= set(nov8)
    assert "kaag-tihar" not in nov8 and "gai-puja" not in nov8
    assert "gai-puja" in _ids(date(2026, 11, 9))
    nov10 = _ids(date(2026, 11, 10))
    assert {"govardhan-puja", "mha-puja", "nepal-sambat-arambha"} <= set(nov10)
    assert "bhai-tika" in _ids(date(2026, 11, 11))


def test_2083_holidays_from_the_published_list():
    assert "eid-ul-adha" in _ids(date(2026, 5, 28))
    assert is_public_holiday("eid-ul-adha")
    assert "muhammad-jayanti" in _ids(date(2026, 8, 26))
    assert "janajati-shahid-diwas" in _ids(date(2026, 9, 8))
    assert is_public_holiday("janajati-shahid-diwas")


def test_gen_z_martyrs_day_starts_in_2083():
    # BS 2082 Bhadra 23 (2025-09-08) is the day of the protest itself, not a remembrance.
    assert "janajati-shahid-diwas" not in _ids(date(2025, 9, 8))
