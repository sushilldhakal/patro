"""Nepal sunrise/sunset — true observer geometry.

These used to pin the गौरीशंकर-meridian + देशान्तर shortcut, which computed
rise/set at one national reference latitude and shifted by longitude alone.
That is gone: every observer's own latitude now reaches
``rise_trans_true_hor``, so east–west ordering still holds but the gaps are no
longer exactly 4 min per degree of longitude.
"""

from __future__ import annotations

from datetime import date, timedelta
from zoneinfo import ZoneInfo

from engine.astronomy.location import ObserverLocation
from engine.astronomy.sun import calculate_sunrise, calculate_sunset
from engine.vedic.bikram_sambat import iter_bs_month_days
from services.panchanga_api import build_year_sun_times

KTM_TZ = ZoneInfo("Asia/Kathmandu")

KTM = (27.7172, 85.3240)
SIRAHA = (26.6520, 86.2060)

# झापा (चन्द्रगढी) २६°३५' / ८८°४' — कञ्चनपुर २८°५७' / ८०°११'
JHAPA = (26 + 35 / 60, 88 + 4 / 60)
KANCHANPUR = (28 + 57 / 60, 80 + 11 / 60)


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


def test_nepal_patro_kathmandu_sea_level_1945():
    """IST-era Kathmandu at the sea-level national horizon (गौरीशंकर meridian).

    Sea level (no valley dip) gives ~06:38 / 17:02 — the published Nepali
    panchang convention. (Drik Panchang's elevation-adjusted 06:32 / 17:09 is
    reproducible via the explicit-altitude path; see test_horizon_dip.py.)
    """
    d = date(1945, 12, 28)
    sunrise = calculate_sunrise(d, *KTM, timezone_name="Asia/Kathmandu").astimezone(KTM_TZ)
    sunset = calculate_sunset(d, *KTM, timezone_name="Asia/Kathmandu").astimezone(KTM_TZ)
    assert sunrise.strftime("%H:%M") in {"06:37", "06:38", "06:39"}
    assert sunset.strftime("%H:%M") in {"17:01", "17:02", "17:03"}


def test_year_sun_times_api_siraha_before_kathmandu():
    """End-to-end year sun payload — the सूर्यक्रान्ति grid path."""
    siraha = ObserverLocation(
        lat=26.65422, lon=86.20795, timezone="Asia/Kathmandu", name="Siraha",
    )
    ktm = ObserverLocation(
        lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu", name="Kathmandu",
    )
    siraha_payload = build_year_sun_times(2083, siraha)
    ktm_payload = build_year_sun_times(2083, ktm)
    ashadh = next(m for m in siraha_payload["months"] if m["month_bs"] == 3)
    day_s = next(d for d in ashadh["calendar"] if d["day"] == 24)
    day_k = next(
        d for m in ktm_payload["months"] if m["month_bs"] == 3
        for d in m["calendar"] if d["day"] == 24
    )
    assert day_s["sunrise"] < day_k["sunrise"], (
        f"Siraha {day_s['sunrise']} should be before Kathmandu {day_k['sunrise']}"
    )
    # Siraha (~86.21°E) is east of Kathmandu, so it still rises first. The gap is
    # narrower than longitude alone would give: Siraha is also ~1.06° further
    # south, and in Ashadh (near the northern solstice) a southern observer rises
    # later. Was 05:10 under the reference-latitude shortcut.
    assert day_s["sunrise"] == "05:12"
    assert day_k["sunrise"] == "05:14"


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


def test_jhapa_kanchanpur_gap_is_longitude_reduced_by_latitude():
    """झापा ८८°४'/२६°३५' vs कञ्चनपुर ८०°११'/२८°५७' — both effects, not just देशान्तर.

    The classical table treats this gap as longitude × 4 min = 31.5 minutes.
    True geometry gives less: Kanchanpur is ~2.4° further north, and in Ashadh
    (near the northern solstice) that makes it rise earlier, eating into the
    east–west gap. Kanchanpur is still last — longitude remains the dominant
    term — but the 4 min/° identity no longer holds, and asserting that it does
    is what the removed reference-latitude shortcut was for.
    """
    greg = _bs_gregorian(2083, 3, 24)
    jhapa = calculate_sunrise(greg, *JHAPA, timezone_name="Asia/Kathmandu")
    kanch = calculate_sunrise(greg, *KANCHANPUR, timezone_name="Asia/Kathmandu")
    delta_min = (kanch - jhapa).total_seconds() / 60.0
    longitude_only = (JHAPA[1] - KANCHANPUR[1]) * 4.0
    assert delta_min > 0, "Kanchanpur (west) must still rise after Jhapa (east)"
    assert delta_min < longitude_only - 1.0, (
        f"gap {delta_min:.2f} min should sit below the longitude-only "
        f"{longitude_only:.2f} min once latitude is honoured — a flat 4 min/° "
        "result means the देशान्तर-only shortcut is back"
    )
    assert 25.0 <= delta_min <= 28.0
