"""AD month calendar shape."""

from engine.astronomy.location import DEFAULT_LOCATION
from services.panchanga_api import build_ad_month_calendar


def test_ad_month_day_uses_bs_gate():
    payload = build_ad_month_calendar(2026, 7, DEFAULT_LOCATION, full=False)
    first = payload["calendar"][0]
    assert first["day"] == 1
    assert first["day_bs"] == 17
    assert first["date_ad"] == "2026-07-01"
