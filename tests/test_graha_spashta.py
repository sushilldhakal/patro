"""Graha Spashta — Udayakal (sunrise) anchor per Surya Panchanga convention."""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.swiss_eph import calculate_sunrise, get_all_planetary_positions
from engine.vedic.bikram_sambat import bs_to_gregorian
from engine.vedic.daily import build_daily_panchanga


def test_planets_at_udayakal_sunrise():
    target = bs_to_gregorian(2083, 2, 25)
    loc = DEFAULT_LOCATION
    sunrise = calculate_sunrise(
        target,
        latitude=loc.lat,
        longitude=loc.lon,
        timezone_name=loc.timezone,
    )
    at_sunrise = get_all_planetary_positions(sunrise)["sun"]["longitude"]

    daily = build_daily_panchanga(target, loc)
    assert daily["planets_anchor"]["type"] == "udayakal"
    assert daily["planets"]["sun"]["longitude"] == at_sunrise
    assert daily["planets"]["sun"]["dms_in_rashi"]
    assert daily["planets"]["sun"]["rashi_ne"] == "वृष"
    assert daily["planets_anchor"]["local_time"] == daily["sunrise"]["local_time_short"]


def test_planet_payload_includes_dms_and_rashi_ne():
    target = date(2026, 6, 11)
    daily = build_daily_panchanga(target, DEFAULT_LOCATION)
    sun = daily["planets"]["sun"]
    assert "dms_in_rashi" in sun
    assert "rashi_ne" in sun
    assert "deg_in_rashi" in sun
    assert sun["dms_in_rashi"].endswith('"')
