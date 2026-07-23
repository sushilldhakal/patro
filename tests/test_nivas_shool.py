"""Tests for Nivas & Shool daily block."""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import build_daily_panchanga


def test_nivas_shool_present():
    payload = build_daily_panchanga(date(2026, 7, 9), DEFAULT_LOCATION)
    block = payload["nivas_shool"]
    assert block is not None
    assert "homahuti" in block
    assert "disha_shool" in block
    assert "agnivasa" in block
    assert "shivavasa" in block
    assert "chandra_vasa" in block
    assert "kumbha_chakra" in block


def test_nivas_shool_jul_9_2026_kathmandu():
    payload = build_daily_panchanga(date(2026, 7, 9), DEFAULT_LOCATION)
    ns = payload["nivas_shool"]

    # Sun in nakshatra 7, Moon in nakshatra 1 → inclusive count 22, 22 mod 9 = 4
    # → Shani (Muhurta Chintamani graha-mukha order).
    assert ns["homahuti"]["current"]["key"] == "saturn"
    assert ns["disha_shool"]["direction_key"] == "S"
    assert ns["rahu_vasa"]["direction_key"] == "S"

    agni = ns["agnivasa"]["segments"]
    assert len(agni) >= 2
    assert agni[0]["name_en"] == "Patala"
    assert agni[1]["name_en"] == "Prithvi"
    assert agni[0]["end_local_time_short"].startswith("10:")

    shiva = ns["shivavasa"]["segments"]
    # Krishna tithi 24 → paksha-tithi 9 → (9×2+5) mod 7 = 2 → Gauri-sannidhau.
    assert shiva[0]["name_en"] == "Gauri-sannidhau"

    chandra = ns["chandra_vasa"]["current"]
    assert chandra["direction_key"] == "E"

    kumbha = ns["kumbha_chakra"]["current"]
    assert kumbha["name_en"] == "Bottom"
    assert kumbha["is_auspicious"] is True

    bhadra = ns["bhadravasa"]
    assert bhadra["active"] is True
    assert bhadra["segments"][0]["loka"] == "swarga"
    assert bhadra["segments"][0]["start_local_time_short"].startswith("21:")


# DrikPanchang (Kathmandu) weekday tables. Disha Shool and Rahu Vasa are distinct:
# Rahu Vasa is an 8-direction cycle and only coincides with Disha Shool on Thursday.
_WEEK = {
    date(2026, 7, 6): ("Monday", "E", "NW"),
    date(2026, 7, 7): ("Tuesday", "N", "W"),
    date(2026, 7, 8): ("Wednesday", "N", "SW"),
    date(2026, 7, 9): ("Thursday", "S", "S"),
    date(2026, 7, 10): ("Friday", "W", "SE"),
    date(2026, 7, 11): ("Saturday", "E", "E"),
    date(2026, 7, 12): ("Sunday", "W", "N"),
}


def test_disha_shool_and_rahu_vasa_weekday_tables():
    for day, (label, disha_key, rahu_key) in _WEEK.items():
        ns = build_daily_panchanga(day, DEFAULT_LOCATION)["nivas_shool"]
        assert ns["disha_shool"]["direction_key"] == disha_key, f"disha shool {label}"
        assert ns["rahu_vasa"]["direction_key"] == rahu_key, f"rahu vasa {label}"


def test_rahu_vasa_is_not_a_copy_of_disha_shool():
    # Regression guard: the two were once identical (Rahu Vasa reused the Disha
    # Shool map). They must differ on at least the non-Thursday weekdays.
    differ = 0
    for day in _WEEK:
        ns = build_daily_panchanga(day, DEFAULT_LOCATION)["nivas_shool"]
        if ns["disha_shool"]["direction_key"] != ns["rahu_vasa"]["direction_key"]:
            differ += 1
    assert differ >= 5
