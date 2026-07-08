"""Nepal patro sunrise — गौरीशंकर meridian + देशान्तर."""

from __future__ import annotations

from datetime import date
from zoneinfo import ZoneInfo

from engine.astronomy.swiss_eph import calculate_sunrise, calculate_sunset
from engine.vedic.bikram_sambat import iter_bs_month_days

KTM_TZ = ZoneInfo("Asia/Kathmandu")

KTM = (27.7172, 85.3240)
SIRAHA = (26.6520, 86.2060)


def _bs_gregorian(bs_year: int, bs_month: int, bs_day: int) -> date:
    return next(g for d, g in iter_bs_month_days(bs_year, bs_month) if d == bs_day)


def test_siraha_sunrise_earlier_than_kathmandu_2083_ashadh_24():
    """Siraha sits east of the 86°15′ meridian — must rise before Kathmandu."""
    greg = _bs_gregorian(2083, 3, 24)
    ktm = calculate_sunrise(
        greg, *KTM, timezone_name="Asia/Kathmandu",
    ).astimezone(KTM_TZ)
    siraha = calculate_sunrise(
        greg, *SIRAHA, timezone_name="Asia/Kathmandu",
    ).astimezone(KTM_TZ)
    assert siraha < ktm, (
        f"Siraha {siraha.strftime('%H:%M')} should be before "
        f"Kathmandu {ktm.strftime('%H:%M')}"
    )


def test_nepal_patro_kathmandu_matches_drik_1945():
    """Regression: IST-era Kathmandu vs Drik Panchang (horizon dip at ref. altitude)."""
    d = date(1945, 12, 28)
    sunrise = calculate_sunrise(d, *KTM, timezone_name="Asia/Kathmandu").astimezone(KTM_TZ)
    sunset = calculate_sunset(d, *KTM, timezone_name="Asia/Kathmandu").astimezone(KTM_TZ)
    assert sunrise.strftime("%H:%M") in {"06:31", "06:32", "06:33"}
    assert sunset.strftime("%H:%M") in {"17:07", "17:08", "17:09"}


def test_east_west_ordering_across_nepal_2083_ashadh_24():
    greg = _bs_gregorian(2083, 3, 24)
    biratnagar = calculate_sunrise(
        greg, 26.45, 87.28, timezone_name="Asia/Kathmandu",
    ).astimezone(KTM_TZ)
    ktm = calculate_sunrise(greg, *KTM, timezone_name="Asia/Kathmandu").astimezone(KTM_TZ)
    dhangadhi = calculate_sunrise(
        greg, 28.7, 80.59, timezone_name="Asia/Kathmandu",
    ).astimezone(KTM_TZ)
    assert biratnagar < ktm < dhangadhi
