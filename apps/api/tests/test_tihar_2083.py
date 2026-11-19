"""BS 2083 Tihar and the 2083 holidays, read from the panchanga — never from English dates.

Kaag Tihar is Kartik Krishna Trayodashi (with Dhanteras), Laxmi Puja the Amavasya in the evening
(with Kukur and Gai Puja), Mha Puja the Nepal Sambat new year on Shukla Pratipada (with Govardhan
Puja), and Bhai Tika Shukla Dwitiya. Fixed days are BS dates; Eid is announced.
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION
from services.festivals.holiday_generator import festivals_on_date, generate_bs_festivals, is_public_holiday
from tests.panchanga_facts import bs_of, runs_on


def _ids(day: date) -> list[str]:
    return [f["id"] for f in festivals_on_date(day, DEFAULT_LOCATION)["festivals"]]


def _on(festival_id: str, bs_year: int = 2083) -> date:
    fest = {f["id"]: f for f in generate_bs_festivals(bs_year, DEFAULT_LOCATION)["festivals"]}
    return date.fromisoformat(fest[festival_id]["start_date"])


def test_tihar_days_2083():
    kaag = _on("kaag-tihar")
    assert runs_on(kaag, 13, "krishna") and "dhanteras" in _ids(kaag)
    laxmi = _on("laxmi-puja")
    assert runs_on(laxmi, 15, "krishna")
    assert {"laxmi-puja", "kukur-tihar", "gai-puja"} <= set(_ids(laxmi))
    assert "kaag-tihar" not in _ids(laxmi)
    mha = _on("mha-puja")
    assert runs_on(mha, 1, "shukla")
    assert {"govardhan-puja", "nepal-sambat-arambha"} <= set(_ids(mha))
    bhai = _on("bhai-tika")
    assert runs_on(bhai, 2, "shukla")
    assert kaag < laxmi < mha < bhai


def test_2083_holidays():
    # Eid and Muhammad Jayanti are announced (by sighting), so theirs are the announced days.
    assert "eid-ul-adha" in _ids(date(2026, 5, 28))
    assert is_public_holiday("eid-ul-adha")
    assert "muhammad-jayanti" in _ids(date(2026, 8, 26))
    # जेनजी शहीद दिवस is Bhadra 23.
    assert bs_of(_on("janajati-shahid-diwas"))[1:] == (5, 23)
    assert is_public_holiday("janajati-shahid-diwas")


def test_gen_z_martyrs_day_starts_in_2083():
    # BS 2082 Bhadra 23 is the day of the protest itself, not a remembrance.
    from engine.calendar.bikram_sambat import bs_to_gregorian

    assert "janajati-shahid-diwas" not in _ids(bs_to_gregorian(2082, 5, 23))
