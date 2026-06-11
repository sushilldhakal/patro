"""Graha Spashta — 6 AM local anchor and DMS fields."""

from __future__ import annotations

from datetime import date

from core.location import DEFAULT_LOCATION
from core.swiss_eph import calculate_sunrise, get_all_planetary_positions, graha_spashta_datetime
from panchanga.bikram_sambat import bs_to_gregorian
from panchanga.daily import build_daily_panchanga


def test_planets_use_six_am_not_sunrise():
    target = bs_to_gregorian(2083, 2, 25)
    loc = DEFAULT_LOCATION
    sunrise = calculate_sunrise(
        target,
        latitude=loc.lat,
        longitude=loc.lon,
        timezone_name=loc.timezone,
    )
    six_am = graha_spashta_datetime(target, loc.timezone)

    at_sunrise = get_all_planetary_positions(sunrise)["sun"]["longitude"]
    at_six = get_all_planetary_positions(six_am)["sun"]["longitude"]
    assert at_sunrise != at_six

    daily = build_daily_panchanga(target, loc)
    assert daily["planets_anchor"]["type"] == "local_6am"
    assert daily["planets"]["sun"]["longitude"] == at_six
    assert daily["planets"]["sun"]["dms_in_rashi"]
    assert daily["planets"]["sun"]["rashi_ne"] == "वृष"


def test_planet_payload_includes_dms_and_rashi_ne():
    target = date(2026, 6, 11)
    daily = build_daily_panchanga(target, DEFAULT_LOCATION)
    sun = daily["planets"]["sun"]
    assert "dms_in_rashi" in sun
    assert "rashi_ne" in sun
    assert "deg_in_rashi" in sun
    assert sun["dms_in_rashi"].endswith('"')
