"""Ayana / Suryakranti mark on month calendar rows (server-computed).

The mark follows the real Sun: Uttarayana from the winter solstice to the summer
solstice, judged at sunrise. In 2026 the solstices fall on Jun 21 08:24 UT and
Dec 21 20:50 UT, so Kathmandu's sunrise flips on Jun 22 and Dec 22 — weeks
before Karka (Shrawan 1) and Makar (Magh 1) Sankranti.
"""

from __future__ import annotations

from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.rashi import rashi_service
from engine.astronomy.engine import default_engine
from services.panchanga.panchanga_api import build_month_calendar


def _row_on(bs_year: int, bs_month: int, date_ad: str) -> dict:
    month = build_month_calendar(bs_year, bs_month, DEFAULT_LOCATION, full=False)
    return next(d for d in month["calendar"] if d["date_ad"] == date_ad)


def test_uttarayana_starts_at_the_winter_solstice() -> None:
    before = _row_on(2083, 9, "2026-12-21")
    after = _row_on(2083, 9, "2026-12-22")
    assert before["ayana_mark"] == "द"
    assert before["aayan_ne"] == "दक्षिणायण"
    assert after["ayana_mark"] == "उ"
    assert after["aayan_ne"] == "उत्तरायण"


def test_dakshinayana_starts_at_the_summer_solstice() -> None:
    assert _row_on(2083, 3, "2026-06-21")["ayana_mark"] == "उ"
    assert _row_on(2083, 3, "2026-06-22")["ayana_mark"] == "द"


def test_makar_sankranti_is_already_uttarayana() -> None:
    """Magh 1 is weeks after the turn; the sidereal rule used to flip here."""
    month = build_month_calendar(2083, 10, DEFAULT_LOCATION, full=False)
    assert month["calendar"][0]["ayana_mark"] == "उ"


def test_muhurta_rule_keeps_the_sidereal_ayana() -> None:
    """Between the solstice and Makar Sankranti the two rules disagree, by design."""
    from datetime import datetime, timezone

    jd = default_engine.julian_day(datetime(2027, 1, 1, 1, tzinfo=timezone.utc))
    assert rashi_service.aayan(jd)["name"] == "Uttarayana"
    assert rashi_service.aayan(jd, sidereal=True)["name"] == "Dakshinayana"
