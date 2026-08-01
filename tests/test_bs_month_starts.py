"""BS/BBS month starts must be monotonic on the whole patro axis.

Regression guard for the bug that made every BBS month endpoint 400 with
``day must be 1..-335 for bbs 2082/11``.

Month starts used to be solved independently per month, each from a fixed
Gregorian search window (month 1 ≈ April, month 10 ≈ January). A sankranti is
the Sun reaching a *sidereal* longitude, so its Gregorian date drifts about a
day every 71 years. By BBS ~2000 that drift is two months: Mesha sankranti has
moved to mid-February, the windows for months 10-12 opened after their sankranti
had already passed, and the solver returned the *next year's* — giving month
starts that ran backwards and month lengths of +395 and -335 days.

Month starts are now chained (each month solved from the one before it) off a
month-1 anchor extrapolated in sidereal years, which makes the sequence
monotonic by construction.
"""

from __future__ import annotations

import pytest

from engine.vedic.bikram_sambat import get_bs_month_length, get_bs_month_start_civil
from engine.vedic.constants import BS_MAX_YEAR, BS_MIN_YEAR

# A solar month is the Sun's transit of one rashi: never shorter than ~29.3 days
# nor longer than ~31.5, so a whole-day length is always in this band.
MIN_MONTH_DAYS = 29
MAX_MONTH_DAYS = 32

# Signed patro years. Negative = BBS (before Bikram Sambat); the axis has no
# year 0. The BBS values bracket the range the home page browses into.
SIGNED_YEARS = [
    -2084, -2083, -2082, -2081,  # the reported failure and its neighbours
    -1500, -1000, -500, -100, -60, -2, -1,  # BBS 1 abuts BS 1
    1, 2, 60, 100, 500, 1000, 1500, 1999,  # BS below the official table
    2100, 2500, 2900,  # BS above the official table
]


@pytest.mark.parametrize("year", SIGNED_YEARS)
def test_month_starts_increase_within_a_year(year: int):
    """Month n+1 must begin after month n. This is what -335 violated."""
    previous = None
    for month in range(1, 13):
        start = get_bs_month_start_civil(year, month).to_jd_ut()
        if previous is not None:
            assert start > previous, (
                f"BS {year}/{month} starts at JD {start}, "
                f"not after month {month - 1} at JD {previous}"
            )
        previous = start


@pytest.mark.parametrize("year", SIGNED_YEARS)
def test_month_lengths_are_solar_months(year: int):
    for month in range(1, 13):
        length = get_bs_month_length(year, month)
        assert MIN_MONTH_DAYS <= length <= MAX_MONTH_DAYS, (
            f"BS {year}/{month} is {length} days"
        )


@pytest.mark.parametrize("year", SIGNED_YEARS)
def test_year_lengths_are_sidereal_years(year: int):
    total = sum(get_bs_month_length(year, m) for m in range(1, 13))
    assert 364 <= total <= 367, f"BS {year} totals {total} days"


@pytest.mark.parametrize("year", SIGNED_YEARS)
def test_months_chain_across_the_year_boundary(year: int):
    """Month 12 must run into the next year's month 1, with no gap or overlap."""
    if year == -1:
        pytest.skip("BBS 1 is followed by BS 1; the axis has no year 0 to step to")
    start_12 = get_bs_month_start_civil(year, 12).to_jd_ut()
    next_year_start = get_bs_month_start_civil(year + 1, 1).to_jd_ut()
    assert next_year_start - start_12 == get_bs_month_length(year, 12)


class TestTheReportedFailure:
    """The exact case from the bug report."""

    def test_bbs_2082_month_11_is_a_real_month(self):
        assert get_bs_month_length(-2082, 11) == 30

    def test_bbs_2082_has_no_negative_or_giant_months(self):
        lengths = [get_bs_month_length(-2082, m) for m in range(1, 13)]
        assert all(MIN_MONTH_DAYS <= x <= MAX_MONTH_DAYS for x in lengths), lengths

    def test_month_11_precedes_month_12(self):
        """It used to land a full sidereal year late, after month 12."""
        assert (
            get_bs_month_start_civil(-2082, 11).to_jd_ut()
            < get_bs_month_start_civil(-2082, 12).to_jd_ut()
        )


class TestOfficialTableIsUntouched:
    """Years inside the authoritative table must not go through the solver."""

    @pytest.mark.parametrize("year", [BS_MIN_YEAR, 2081, 2082, 2083, BS_MAX_YEAR])
    def test_table_years_still_monotonic(self, year: int):
        previous = None
        for month in range(1, 13):
            start = get_bs_month_start_civil(year, month).to_jd_ut()
            if previous is not None:
                assert start > previous
            previous = start

    def test_bs_2083_month_lengths_match_the_table(self):
        from engine.vedic.constants import get_bs_year_data

        data = get_bs_year_data(2083)
        assert data is not None
        assert [get_bs_month_length(2083, m) for m in range(1, 13)] == list(data[0])
