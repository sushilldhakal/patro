"""Tests for annual Panchak Patro computation."""

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.panchak_calendar import build_panchak_ad_year, build_panchak_bs_year, list_panchak_periods


def test_panchak_bs_2083_count():
    payload = build_panchak_bs_year(2083, DEFAULT_LOCATION)
    assert payload["era"] == "bs"
    assert payload["count"] == 14


def test_panchak_bs_2083_first_period_dates():
    payload = build_panchak_bs_year(2083, DEFAULT_LOCATION)
    first = payload["periods"][0]
    assert first["start"]["date_ad"] == "2026-04-13"
    assert first["end"]["date_ad"] == "2026-04-17"
    assert first["start"]["bs_year"] == 2082
    assert first["start"]["bs_month"] == 12
    assert first["start"]["bs_day"] == 30


def test_panchak_ad_2026_subset():
    payload = build_panchak_ad_year(2026, DEFAULT_LOCATION)
    assert payload["era"] == "ad"
    assert payload["count"] == 13


def test_panchak_historical_year_has_periods():
    periods = list_panchak_periods(
        date(1920, 1, 1),
        date(1920, 12, 31),
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    assert len(periods) >= 12
