"""Samvatsara resolves across the signed patro axis, including BBS."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.vedic.patro_year_axis import (  # noqa: E402
    PATRO_EPHEMERIS_SIGNED_MAX,
    PATRO_EPHEMERIS_SIGNED_MIN,
)
from engine.vedic.samvatsara import (  # noqa: E402
    SAMVATSARA_ENTRIES,
    _samvatsara_index_by_walk,
    _samvatsara_table,
    samvatsara_payload_for_bs_year,
)


def _name(bs_year: int) -> str | None:
    payload = samvatsara_payload_for_bs_year(bs_year)
    return payload["name_ne"] if payload else None


@pytest.mark.parametrize(
    "bs_year,expected",
    [
        # Anchor and the tuned kshaya region must be untouched by the JD port.
        (2080, "पिङ्गल"),
        (2081, "सिद्धार्थी"),
        (2083, "रौद्र"),
        (1855, "सिद्धार्थी"),
        (1700, "अङ्गिरा"),
    ],
)
def test_known_years_unchanged(bs_year: int, expected: str):
    assert _name(bs_year) == expected


@pytest.mark.parametrize("bs_year", [58, 57, 37, 1, -1, -2, -100, -7144])
def test_signed_axis_resolves(bs_year: int):
    """These were all None: the walk went through `date`, which has no BCE."""
    assert _name(bs_year) is not None, bs_year


def test_bs_1_and_bbs_1_are_adjacent_cycle_positions():
    """No year zero — BBS 1 sits one cycle step before BS 1."""
    bs1 = samvatsara_payload_for_bs_year(1)
    bbs1 = samvatsara_payload_for_bs_year(-1)
    assert bs1 and bbs1
    assert int(bbs1["cycle"]) == int(bs1["cycle"]) - 1


def test_index_advances_monotonically_across_the_zero_seam():
    """Walking forward, the cycle position only ever advances.

    Not a clean 60-year repeat: Jupiter's ~11.86-year period means kshaya years
    advance the index by 2, so the Jovian cycle drifts against the solar year.
    What must hold is that stepping forward never moves backwards in the cycle.
    """
    table = _samvatsara_table()
    years = [*range(-70, 0), *range(1, 71)]
    for prev, cur in zip(years, years[1:]):
        step = (table[cur] - table[prev]) % 60
        assert step in (1, 2), f"BS {prev}→{cur} advanced by {step}"


def test_table_and_walk_agree():
    """The precomputed table must reproduce the walk it was generated from."""
    table = _samvatsara_table()
    assert table, "samvatsara_table.json missing — run scripts/generate_samvatsara_table.py"
    for bs_year in (2080, 1700, 60, 1, -1, -2, -60, -500):
        assert table[bs_year] == _samvatsara_index_by_walk(bs_year), bs_year


def test_table_spans_the_ephemeris_window_and_skips_year_zero():
    table = _samvatsara_table()
    assert min(table) == PATRO_EPHEMERIS_SIGNED_MIN
    assert max(table) == PATRO_EPHEMERIS_SIGNED_MAX
    assert 0 not in table
    assert all(0 <= idx < len(SAMVATSARA_ENTRIES) for idx in table.values())


def test_outside_the_table_falls_back_without_raising():
    """Beyond the table the live walk still answers, and never raises.

    A year past the ephemeris window may resolve (the walk reaches a little
    further than whole-year month builds do) or come back None — either is fine,
    an exception is not: the label is decorative and must never fail a request.
    """
    payload = samvatsara_payload_for_bs_year(PATRO_EPHEMERIS_SIGNED_MAX + 1)
    assert payload is None or payload["name_ne"]
