"""Tihar skips Adhik Kartik — Bhai Tika is Nija Kartik Shukla Dwitiya.

Under the Surya Siddhanta, BS 2085 has Adhik Kartik. Civil Kartik 3 is the
opening Pratipada of that adhik month and must not carry Bhai Tika. The rite
falls on the nija month's Shukla 2 (Mangsir 3 / 2028-11-18).
"""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.siddhanta import use_siddhanta
from engine.panchanga.lunar_month import clear_lunar_year_cache, get_lunar_month_for_date
from engine.panchanga.tithi import get_udaya_tithi
from services.festivals.holiday_generator import clear_year_payload_memo, festivals_on_date


def test_bhai_tika_is_not_on_adhik_kartik_pratipada():
    with use_siddhanta("surya_siddhanta"):
        clear_lunar_year_cache()
        clear_year_payload_memo()

        adhik_day = date(2028, 10, 19)  # BS 2085 Kartik 3
        udaya = get_udaya_tithi(adhik_day, DEFAULT_LOCATION)
        festival_month = get_lunar_month_for_date(adhik_day, month_model="festival")
        ids = [f["id"] for f in festivals_on_date(adhik_day, DEFAULT_LOCATION)["festivals"]]

        assert festival_month["full_name"] == "Adhik Kartik"
        assert udaya["paksha"] == "shukla" and udaya["tithi"] == 1
        assert "bhai-tika" not in ids
        assert "tihar" not in ids

        bhai_day = date(2028, 11, 18)  # BS 2085 Mangsir 3
        nija = get_lunar_month_for_date(bhai_day, month_model="festival")
        bhai_ids = [f["id"] for f in festivals_on_date(bhai_day, DEFAULT_LOCATION)["festivals"]]
        assert nija["full_name"] == "Kartik"
        assert "bhai-tika" in bhai_ids
