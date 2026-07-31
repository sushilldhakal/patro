"""Signed BS/BBS axis: epoch, no-year-zero continuity, and range gating."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.vedic.bikram_sambat import get_bs_month_start_civil  # noqa: E402
from engine.vedic.patro_year_axis import (  # noqa: E402
    PATRO_EPHEMERIS_SIGNED_MAX,
    PATRO_EPHEMERIS_SIGNED_MIN,
    PATRO_SIGNED_YEAR_MAX,
    PATRO_SIGNED_YEAR_MIN,
    patro_year_supports_full_panchanga,
    validate_patro_signed_year,
)


def _bce(civil_year: int) -> int:
    """BCE number for an astronomical civil year (0 = 1 BCE)."""
    return 1 - civil_year


@pytest.mark.parametrize(
    "signed,expected_bce",
    [
        (1, 57),  # BS 1 = 57 BCE — the epoch
        (2, 56),
        (3, 55),
        (-1, 58),  # BBS 1 = 58 BCE, i.e. the year *before* BS 1
        (-2, 59),
        (-3, 60),
        (-100, 157),
    ],
)
def test_bs_bbs_epoch(signed: int, expected_bce: int):
    civil = get_bs_month_start_civil(signed, 1).year
    assert _bce(civil) == expected_bce, f"signed {signed} landed on {_bce(civil)} BCE"


def test_axis_has_no_year_zero_gap():
    """Consecutive signed years must be consecutive civil years across the 0 seam.

    A uniform offset reserved a slot for the forbidden signed 0, which made civil
    −57 (58 BCE) unreachable and shifted every BBS year one year early.
    """
    years = [*range(-6, 0), *range(1, 7)]
    civils = [get_bs_month_start_civil(y, 1).year for y in years]
    steps = {b - a for a, b in zip(civils, civils[1:])}
    assert steps == {1}, f"non-consecutive civil years: {list(zip(years, civils))}"


def test_modern_bs_unchanged():
    assert get_bs_month_start_civil(2082, 1).year == 2025
    assert get_bs_month_start_civil(2082, 10).year == 2026


def test_year_zero_and_out_of_axis_rejected():
    for bad in (0, PATRO_SIGNED_YEAR_MIN - 1, PATRO_SIGNED_YEAR_MAX + 1):
        with pytest.raises(ValueError):
            validate_patro_signed_year(bad)


def test_axis_is_wider_than_the_installed_ephemeris():
    """Naming range vs computable range are deliberately different."""
    assert PATRO_SIGNED_YEAR_MIN < PATRO_EPHEMERIS_SIGNED_MIN
    assert PATRO_SIGNED_YEAR_MAX > PATRO_EPHEMERIS_SIGNED_MAX


@pytest.mark.parametrize(
    "signed,supported",
    [
        (PATRO_EPHEMERIS_SIGNED_MIN, True),
        (PATRO_EPHEMERIS_SIGNED_MIN - 1, False),
        (PATRO_EPHEMERIS_SIGNED_MAX, True),
        (PATRO_EPHEMERIS_SIGNED_MAX + 1, False),  # upper gate used to be missing
        (-6722, True),
        (-1, True),
        (1, True),
        (59, True),  # BS 1–59 are full panchanga, not a civil skeleton
        (2082, True),
    ],
)
def test_panchanga_gate_bounds_both_ends(signed: int, supported: bool):
    assert patro_year_supports_full_panchanga(signed) is supported
