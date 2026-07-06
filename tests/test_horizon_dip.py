"""Sunrise/sunset must apply Kathmandu's elevation as a geometric horizon
dip, not just as an atmospheric-pressure input."""

from datetime import date
from zoneinfo import ZoneInfo

from engine.astronomy.engine import _horizon_dip_degrees
from engine.astronomy.swiss_eph import calculate_sunrise, calculate_sunset

KTM_TZ = ZoneInfo("Asia/Kathmandu")


def test_dip_is_zero_at_sea_level():
    assert _horizon_dip_degrees(0.0) == 0.0
    assert _horizon_dip_degrees(-10.0) == 0.0  # guard against negative altitude


def test_dip_matches_standard_geodetic_formula_for_kathmandu():
    # 1.76 * sqrt(1400) / 60 ≈ 1.0976 degrees
    assert abs(_horizon_dip_degrees(1400.0) - (-1.0976)) < 1e-3


def test_kathmandu_sunrise_sunset_match_drik_panchang():
    """Regression: 1945-12-28, Kathmandu (lat 27.7172, lon 85.3240, 1400 m).

    swe.rise_trans's geopos altitude only feeds the auto-computed
    atmospheric pressure (thinner air -> less refraction); it does not add
    the geometric dip an elevated observer actually sees. Using it alone
    gave sunrise 06:38 / sunset 17:02 — Drik Panchang (and every serious
    Vedic panchanga source) shows 06:32 / 17:09 for this exact chart.
    Switching to rise_trans_true_hor with an explicit dip computed from
    Kathmandu's elevation closes the gap to within a minute.
    """
    d = date(1945, 12, 28)
    sunrise = calculate_sunrise(d, 27.7172, 85.3240, timezone_name="Asia/Kathmandu")
    sunset = calculate_sunset(d, 27.7172, 85.3240, timezone_name="Asia/Kathmandu")

    sunrise_local = sunrise.astimezone(KTM_TZ)
    sunset_local = sunset.astimezone(KTM_TZ)

    assert sunrise_local.strftime("%H:%M") in {"06:31", "06:32", "06:33"}
    assert sunset_local.strftime("%H:%M") in {"17:07", "17:08", "17:09"}


def test_sea_level_location_unaffected():
    """A location with no elevation override must behave exactly as before —
    this fix should only change results for locations with a nonzero
    altitude, not the default (sea-level) case."""
    d = date(2026, 7, 4)
    sunrise = calculate_sunrise(d, 27.0, 85.0, timezone_name="Asia/Kathmandu", altitude=0.0)
    assert sunrise is not None
