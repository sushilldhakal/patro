"""BCE instants must serialize like CE ones — no ``jd:`` sentinel in payloads."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION  # noqa: E402
from engine.astronomy.ut_instant import (  # noqa: E402
    UtInstant,
    format_expanded_utc_iso,
    format_ut_instant_local,
    jd_from_expanded_utc_iso,
    parse_ephemeris_instant,
)
from services.panchanga_api import build_month_calendar  # noqa: E402

EXPANDED_ISO = re.compile(r"^-?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?\+00:00$")


def test_ut_instant_isoformat_is_not_a_sentinel():
    text = UtInstant(751471.8044106963).isoformat()
    assert not text.startswith("jd:")
    assert EXPANDED_ISO.match(text), text


@pytest.mark.parametrize(
    "jd",
    [-908700.0, 751471.8044106963, 1663882.8844838934, 1721059.5, 1721425.5, 2451544.5],
)
def test_expanded_iso_round_trips(jd: float):
    back = jd_from_expanded_utc_iso(format_expanded_utc_iso(jd))
    assert abs(back - jd) * 86400 < 0.001  # sub-millisecond


def test_parse_routes_by_era():
    assert isinstance(parse_ephemeris_instant("jd:751471.80"), UtInstant)  # legacy rows
    assert isinstance(parse_ephemeris_instant("-0156-06-15T09:17:00+00:00"), UtInstant)
    assert isinstance(parse_ephemeris_instant("0000-03-01T12:00:00+00:00"), UtInstant)
    parsed = parse_ephemeris_instant("2025-07-16T05:18:01.240000+00:00")
    assert not isinstance(parsed, UtInstant)  # CE keeps datetime


def test_local_label_rolls_over_midnight():
    """Date and clock must both come from the local instant.

    Taking the date from UTC and the hour from local dropped the rollover, so a
    Kathmandu time after ~18:15 UTC was stamped with the previous civil day.
    """
    # 23:50 UTC on -0156-06-15 is 05:35 on the *16th* in Kathmandu (+5:45).
    jd = jd_from_expanded_utc_iso("-0156-06-15T23:50:46+00:00")
    parts = format_ut_instant_local(UtInstant(jd), "Asia/Kathmandu")
    assert parts["local_time_short"] == "05:35"
    assert parts["local"].startswith("-0156-06-16"), parts["local"]


@pytest.mark.parametrize("bs_year", [-100, 2082])
def test_month_full_has_no_sentinel_and_ordered_angas(bs_year: int):
    payload = build_month_calendar(bs_year, 4, DEFAULT_LOCATION, full=True)
    assert "jd:" not in str(payload)

    for day in payload["calendar"]:
        state = day.get("panchanga") or {}
        for anga in ("tithi", "nakshatra", "yoga", "karana"):
            block = state.get(anga) or {}
            start, end = block.get("start"), block.get("end")
            assert start and end, f"{anga} missing timestamps on {day['date_ad']}"
            assert end >= start, f"{anga} ends before it starts on {day['date_ad']}"
