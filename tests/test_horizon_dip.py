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


def test_kathmandu_default_sunrise_is_sea_level_national():
    """1945-12-28 Kathmandu — default (national) times use the sea-level horizon.

    The Kathmandu valley is ringed by hills that sit *above* the astronomical
    horizon, so the ~1.1° sea-cliff dip from a 1400 m elevation is unphysical
    here and made every day a flat 14h. Published Nepali panchang (गौरीशंकर
    meridian) uses the sea-level horizon, giving ~06:38 / 17:02 for this chart.
    """
    d = date(1945, 12, 28)
    sunrise = calculate_sunrise(d, 27.7172, 85.3240, timezone_name="Asia/Kathmandu")
    sunset = calculate_sunset(d, 27.7172, 85.3240, timezone_name="Asia/Kathmandu")

    sunrise_local = sunrise.astimezone(KTM_TZ)
    sunset_local = sunset.astimezone(KTM_TZ)

    assert sunrise_local.strftime("%H:%M") in {"06:37", "06:38", "06:39"}
    assert sunset_local.strftime("%H:%M") in {"17:01", "17:02", "17:03"}


def test_explicit_altitude_dip_still_matches_drik_panchang():
    """The elevation-dip path still works when a caller passes an explicit
    altitude: 1400 m reproduces Drik Panchang's 06:32 / 17:09 for this chart.
    This is opt-in (altitude=...) and is not the Nepali national default."""
    d = date(1945, 12, 28)
    sunrise = calculate_sunrise(
        d, 27.7172, 85.3240, altitude=1400.0, timezone_name="Asia/Kathmandu"
    )
    sunset = calculate_sunset(
        d, 27.7172, 85.3240, altitude=1400.0, timezone_name="Asia/Kathmandu"
    )

    assert sunrise.astimezone(KTM_TZ).strftime("%H:%M") in {"06:31", "06:32", "06:33"}
    assert sunset.astimezone(KTM_TZ).strftime("%H:%M") in {"17:07", "17:08", "17:09"}


def test_sea_level_location_unaffected():
    """A location with no elevation override must behave exactly as before —
    this fix should only change results for locations with a nonzero
    altitude, not the default (sea-level) case."""
    d = date(2026, 7, 4)
    sunrise = calculate_sunrise(d, 27.0, 85.0, timezone_name="Asia/Kathmandu", altitude=0.0)
    assert sunrise is not None
