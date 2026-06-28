"""Tests for rule-based sait generation."""

from panchanga.bikram_sambat import bs_to_gregorian
from panchanga.sait_rules import (
    agni_on_earth,
    build_day_panchanga,
    is_kharmas,
    is_rikta_tithi,
    rudra_on_earth,
)
from core.location import DEFAULT_LOCATION
from services.sait_generator import generate_sait_year_category


def test_rikta_tithis():
    assert is_rikta_tithi(4)
    assert is_rikta_tithi(9)
    assert is_rikta_tithi(14)
    assert not is_rikta_tithi(5)


def test_kharmas_sun_longitude():
    assert is_kharmas(250.0)
    assert is_kharmas(335.0)
    assert not is_kharmas(200.0)


def test_agni_rudra_vas_formulas():
    assert agni_on_earth(5, 1)
    assert not rudra_on_earth(5, 1)


def test_build_day_panchanga_bs2083_sample():
    greg = bs_to_gregorian(2083, 1, 20)
    day = build_day_panchanga(greg, DEFAULT_LOCATION)
    assert day.tithi_absolute >= 1
    assert 1 <= day.nakshatra <= 27
    assert 1 <= day.vaara <= 7


def test_generate_vivah_produces_entries():
    by_month = generate_sait_year_category(2082, "vivah", DEFAULT_LOCATION)
    total_days = sum(len(days) for days in by_month.values())
    assert total_days > 0


def test_generate_agni_jurne_has_entries():
    by_month = generate_sait_year_category(2080, "agni-jurne", DEFAULT_LOCATION)
    assert by_month
    for key, days in by_month.items():
        assert key.isdigit()
        assert days
