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

    assert ns["homahuti"]["current"]["key"] == "rahu"
    assert ns["disha_shool"]["direction_key"] == "S"
    assert ns["rahu_vasa"]["direction_key"] == "S"

    agni = ns["agnivasa"]["segments"]
    assert len(agni) >= 2
    assert agni[0]["name_en"] == "Patala"
    assert agni[1]["name_en"] == "Prithvi"
    assert agni[0]["end_local_time_short"].startswith("10:")

    shiva = ns["shivavasa"]["segments"]
    assert shiva[0]["name_en"] == "Sabhayam"

    chandra = ns["chandra_vasa"]["current"]
    assert chandra["direction_key"] == "E"

    kumbha = ns["kumbha_chakra"]["current"]
    assert kumbha["name_en"] == "Bottom"
    assert kumbha["is_auspicious"] is True

    bhadra = ns["bhadravasa"]
    assert bhadra["active"] is True
    assert bhadra["segments"][0]["loka"] == "swarga"
    assert bhadra["segments"][0]["start_local_time_short"].startswith("21:")
