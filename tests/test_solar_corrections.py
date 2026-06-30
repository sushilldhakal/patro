"""Belaantar and Deshaantar — Surya Panchanga solar corrections."""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import build_daily_panchanga
from engine.vedic.solar_corrections import (
    build_solar_corrections,
    compute_belaantar,
    compute_deshaantar,
    standard_meridian_longitude,
)


def test_standard_meridian_kathmandu():
    meridian = standard_meridian_longitude("Asia/Kathmandu")
    assert abs(meridian - 86.25) < 0.01


def test_deshaantar_kathmandu_positive_dhan():
    meridian = standard_meridian_longitude("Asia/Kathmandu")
    d = compute_deshaantar(85.324, meridian)
    assert d["sign"] == "dhan"
    assert d["apply"] == "add"
    assert d["minutes"] >= 3


def test_belaantar_has_sign_and_labels():
    from datetime import datetime, time

    from engine.astronomy.timescale import resolve_observer_timezone

    tz = resolve_observer_timezone("Asia/Kathmandu")
    dt = datetime.combine(date(2026, 6, 11), time(5, 8), tzinfo=tz)
    b = compute_belaantar(dt)
    assert b["sign"] in ("dhan", "rin")
    assert "label_ne" in b
    assert "minutes" in b


def test_daily_payload_includes_solar_corrections():
    daily = build_daily_panchanga(date(2026, 6, 11), DEFAULT_LOCATION)
    sc = daily["solar_corrections"]
    assert sc["belaantar"]["name_ne"] == "बेलान्तर"
    assert sc["deshaantar"]["name_ne"] == "देशान्तर"
    assert sc["sunrise_includes_corrections"] is True
    assert "ishtakaal_note_ne" in sc


def test_build_solar_corrections_structure():
    sc = build_solar_corrections(
        date(2026, 1, 15),
        local_longitude=85.324,
        timezone_name="Asia/Kathmandu",
    )
    assert "belaantar" in sc and "deshaantar" in sc
