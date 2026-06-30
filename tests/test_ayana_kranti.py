"""Ayana / Suryakranti mark on month calendar rows (server-computed)."""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.bikram_sambat import bs_to_gregorian
from services.panchanga_api import build_month_calendar


def _day_row(bs_year: int, bs_month: int, bs_day: int) -> dict:
    month = build_month_calendar(bs_year, bs_month, DEFAULT_LOCATION, full=False)
    return next(d for d in month["calendar"] if d["day"] == bs_day)


def test_ayana_mark_on_lite_month_calendar() -> None:
    row = _day_row(2083, 9, 9)
    assert row["ayana_mark"] == "द"
    assert row["aayan_ne"] == "दक्षिणायण"
    assert row["date_ad"] == "2026-12-24"


def test_ayana_mark_flips_after_makara_sankranti() -> None:
    poush_last = _day_row(2083, 9, 30)
    magh_first = _day_row(2083, 10, 1)
    assert poush_last["ayana_mark"] == "द"
    assert magh_first["ayana_mark"] == "उ"
    assert magh_first["aayan_ne"] == "उत्तरायण"


def test_ayana_mark_matches_udaya_sunrise_not_civil_sankranti_day() -> None:
    """Karka sankranti civil day can still be उ at sunrise (Ashadh 32, BS 2083)."""
    row = _day_row(2083, 3, 32)
    assert row["date_ad"] == bs_to_gregorian(2083, 3, 32).isoformat()
    assert row["ayana_mark"] == "उ"
