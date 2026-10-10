"""Reverse civil-JD → signed BS/BBS lookup: termination and exact round-tripping.

The year-locating search here is a "find last year whose start is <= jd" binary
search. It previously used a floor midpoint, so the state ``(lo, lo + 1)`` chose
``mid == lo`` and the ``lo = mid`` branch made no progress — the loop spun
forever. BS 21 and BS 59 both hit it, which pegged a worker on any pre-1 CE day
request for those years (an outright hang, not slowness), so these years are
checked explicitly.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.jd_calendar import CivilDay, civil_day_add  # noqa: E402
from engine.vedic.bikram_sambat import (  # noqa: E402
    get_bs_month_length,
    get_bs_month_start_civil,
    locate_patro_day_for_civil,
)


def _civil_for(bs_year: int, bs_month: int, bs_day: int) -> CivilDay:
    start = get_bs_month_start_civil(bs_year, bs_month)
    return CivilDay.from_jd_ut(civil_day_add(start.to_jd_ut(), bs_day - 1))


@pytest.mark.parametrize("bs_year", [21, 59])
def test_previously_hanging_years_terminate(bs_year: int) -> None:
    """Regression: these two spun forever instead of returning."""
    for bs_month in (1, 6, 12):
        civil = _civil_for(bs_year, bs_month, 3)
        assert locate_patro_day_for_civil(civil) == (bs_year, bs_month, 3)


@pytest.mark.parametrize("bs_year", list(range(1, 66)))
def test_bce_years_round_trip_every_month(bs_year: int) -> None:
    """BS → civil JD → BS is exact across the BCE span and the 1 CE seam."""
    for bs_month in range(1, 13):
        length = get_bs_month_length(bs_year, bs_month)
        for bs_day in (1, length // 2 or 1, length):
            civil = _civil_for(bs_year, bs_month, bs_day)
            assert locate_patro_day_for_civil(civil) == (bs_year, bs_month, bs_day)


def test_first_and_last_day_of_bs_1_stay_in_bs_1() -> None:
    """Year boundaries must not fall through to the neighbouring year."""
    first = _civil_for(1, 1, 1)
    assert locate_patro_day_for_civil(first) == (1, 1, 1)

    last_len = get_bs_month_length(1, 12)
    last = _civil_for(1, 12, last_len)
    assert locate_patro_day_for_civil(last) == (1, 12, last_len)


def test_day_before_bs_1_lands_on_the_bbs_side_of_the_axis() -> None:
    """The axis has no year 0 — BS 1's predecessor is signed −1 (BBS 1)."""
    day_before = CivilDay.from_jd_ut(_civil_for(1, 1, 1).to_jd_ut() - 1)
    signed, month, _day = locate_patro_day_for_civil(day_before)
    assert signed == -1
    assert month == 12
