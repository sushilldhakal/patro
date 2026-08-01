"""Akshāṁsha (latitude) sensitivity of sunrise/sunset.

Longitude (देशान्तर) is a fixed 4 min/degree shift. Latitude is not a fixed
offset at all: it enters through the hour angle, cos H = (sin h0 − sin φ sin δ)
/ (cos φ cos δ), so its effect depends on the Sun's declination and therefore on
the season — zero at the equinoxes, largest at the solstices.

These tests pin both halves of that:

* the generic observer path must move sunrise when only latitude changes, and
  must move it in opposite directions in June and December;
* the Nepal patro path deliberately does *not*, because published Nepali
  panchanga tables correct from the गौरीशंकर meridian by longitude alone
  (see engine/astronomy/nepal_patro_sun.py).
"""

from __future__ import annotations

from datetime import date, timezone

from engine.astronomy.sun import calculate_sunrise, calculate_sunset
from engine.astronomy.nepal_patro_sun import NEPAL_PATRO_REFERENCE_LATITUDE

# One meridian, so every difference below is latitude alone.
SHARED_LON = 85.3167
EQUATOR = 0.0
MID_NORTH = 40.0

JUNE = date(2026, 6, 21)      # northern solstice, δ ≈ +23.44°
DECEMBER = date(2026, 12, 21)  # southern solstice, δ ≈ −23.44°
EQUINOX = date(2026, 3, 20)


# The rise/set search opens at local midnight in this zone. It must match the
# longitude, or the window catches a neighbouring day's event and the
# comparison measures a day wrap instead of latitude. 0°N and 40°N are outside
# NEPAL_LAT_MIN/MAX, so these observers still take the generic (true-geometry)
# path, not the Nepal patro one.
LOCAL_TZ = "Asia/Kathmandu"


def _sunrise_utc(d: date, lat: float, lon: float = SHARED_LON):
    return calculate_sunrise(d, lat, lon, timezone_name=LOCAL_TZ).astimezone(timezone.utc)


def _sunset_utc(d: date, lat: float, lon: float = SHARED_LON):
    return calculate_sunset(d, lat, lon, timezone_name=LOCAL_TZ).astimezone(timezone.utc)


def _daylight_hours(d: date, lat: float) -> float:
    return (_sunset_utc(d, lat) - _sunrise_utc(d, lat)).total_seconds() / 3600.0


def test_latitude_changes_sunrise_at_same_longitude():
    """0°N vs 40°N on one meridian — sunrise must not be the same instant."""
    equator = _sunrise_utc(JUNE, EQUATOR)
    north = _sunrise_utc(JUNE, MID_NORTH)
    delta_min = abs((north - equator).total_seconds()) / 60.0
    assert delta_min > 30.0, (
        f"latitude appears to be ignored: 0°N {equator:%H:%M:%S} vs "
        f"40°N {north:%H:%M:%S} on the same longitude ({delta_min:.1f} min apart)"
    )


def test_latitude_effect_reverses_between_solstices():
    """The sign of the latitude effect must follow the Sun's declination.

    A fixed per-degree offset (the deshāntara mistake applied north/south)
    would shift sunrise the same way all year. It must not.
    """
    june = (_sunrise_utc(JUNE, MID_NORTH) - _sunrise_utc(JUNE, EQUATOR)).total_seconds()
    december = (
        _sunrise_utc(DECEMBER, MID_NORTH) - _sunrise_utc(DECEMBER, EQUATOR)
    ).total_seconds()
    assert june < 0.0, "in June, 40°N must rise earlier than the equator"
    assert december > 0.0, "in December, 40°N must rise later than the equator"


def test_daylight_length_diverges_with_latitude():
    """Day length is the clearest latitude signature: ~12 h at the equator."""
    assert abs(_daylight_hours(JUNE, EQUATOR) - 12.0) < 0.25
    assert _daylight_hours(JUNE, MID_NORTH) > 14.5
    assert _daylight_hours(DECEMBER, MID_NORTH) < 9.5


def test_equinox_is_the_latitude_null_point():
    """At δ ≈ 0 the hour angle is ~90° everywhere, so latitude nearly cancels."""
    delta_min = abs(
        (_sunrise_utc(EQUINOX, MID_NORTH) - _sunrise_utc(EQUINOX, EQUATOR)).total_seconds()
    ) / 60.0
    assert delta_min < 10.0, f"equinox sunrise should barely move with latitude ({delta_min:.1f} min)"


def test_nepal_patro_path_is_latitude_independent_by_design():
    """Inside Nepal, sunrise is computed at the national reference latitude.

    Two Nepali observers on one meridian differing only in latitude get the
    same sunrise — the documented देशान्तर-only convention, not an oversight.
    Change this test if that convention ever changes.
    """
    lon = 85.3167
    south = calculate_sunrise(JUNE, 26.6, lon, timezone_name="Asia/Kathmandu")
    north = calculate_sunrise(JUNE, 29.5, lon, timezone_name="Asia/Kathmandu")
    assert south == north
    reference = calculate_sunrise(
        JUNE, NEPAL_PATRO_REFERENCE_LATITUDE, lon, timezone_name="Asia/Kathmandu"
    )
    assert south == reference


def test_explicit_altitude_opts_out_of_the_nepal_path_and_restores_latitude():
    """Passing an altitude routes a Nepal observer to the true-geometry path."""
    lon = 85.3167
    south = calculate_sunrise(JUNE, 26.6, lon, altitude=0.0, timezone_name="Asia/Kathmandu")
    north = calculate_sunrise(JUNE, 29.5, lon, altitude=0.0, timezone_name="Asia/Kathmandu")
    assert south != north
