"""Belaantar and Deshaantar — Surya Panchanga solar corrections."""

from __future__ import annotations

from datetime import date, datetime

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import build_daily_panchanga
from engine.vedic.solar_corrections import (
    build_solar_corrections,
    compute_belaantar,
    compute_deshaantar,
    standard_meridian_longitude,
)


def test_standard_meridian_kathmandu_npt_era():
    meridian = standard_meridian_longitude("Asia/Kathmandu", on_date=date(2026, 6, 11))
    assert abs(meridian - 86.25) < 0.01


def test_standard_meridian_kathmandu_ist_era():
    meridian = standard_meridian_longitude(
        "Asia/Kathmandu", on_date=date(1945, 12, 28), lat=27.7172, lon=85.3240,
    )
    assert abs(meridian - 82.5) < 0.01


def test_standard_meridian_kathmandu_kmt_era():
    meridian = standard_meridian_longitude(
        "Asia/Kathmandu", on_date=date(1919, 12, 31), lat=27.7172, lon=85.3240,
    )
    assert abs(meridian - 85.316667) < 0.02


def test_deshaantar_kathmandu_positive_dhan():
    meridian = standard_meridian_longitude("Asia/Kathmandu", on_date=date(2026, 6, 11))
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
    daily = build_daily_panchanga(date(1945, 12, 28), DEFAULT_LOCATION)
    sc = daily["solar_corrections"]
    assert sc["belaantar"]["name_ne"] == "बेलान्तर"
    assert sc["deshaantar"]["name_ne"] == "देशान्तर"
    assert sc["sunrise_includes_corrections"] is True
    assert sc["timezone_era"]["key"] == "ist"
    assert "ishtakaal_note_ne" in sc


def test_daily_modern_npt_era():
    daily = build_daily_panchanga(date(2026, 6, 11), DEFAULT_LOCATION)
    assert daily["solar_corrections"]["timezone_era"]["key"] == "npt"


def test_belaantar_matches_swiss_ephemeris_at_sunrise():
    """Belaantar = Swiss Ephemeris equation of time at local sunrise."""
    import swisseph as swe
    from datetime import timezone

    from engine.astronomy.swiss_eph import get_julian_day, init_ephemeris

    init_ephemeris()
    target = date(2026, 7, 26)
    daily = build_daily_panchanga(target, DEFAULT_LOCATION)
    b = daily["solar_corrections"]["belaantar"]
    at = datetime.fromisoformat(daily["solar_corrections"]["computed_at_local"])
    jd = get_julian_day(at.astimezone(timezone.utc))
    swe_min = float(swe.time_equ(jd)) * 24.0 * 60.0
    assert abs(b["minutes_total"] - swe_min) < 0.01
    assert b["sign"] == ("dhan" if swe_min >= 0 else "rin")


def test_belaantar_seasonal_signs():
    """Spot-check equation-of-time sign by season (apparent − mean)."""
    jan = build_daily_panchanga(date(2026, 1, 15), DEFAULT_LOCATION)["solar_corrections"]["belaantar"]
    oct = build_daily_panchanga(date(2026, 10, 15), DEFAULT_LOCATION)["solar_corrections"]["belaantar"]
    assert jan["sign"] == "rin"  # Sun slow in January
    assert oct["sign"] == "dhan"  # Sun fast in October


def test_build_solar_corrections_structure():
    sc = build_solar_corrections(
        date(2026, 1, 15),
        local_longitude=85.324,
        timezone_name="Asia/Kathmandu",
    )
    assert "belaantar" in sc and "deshaantar" in sc
