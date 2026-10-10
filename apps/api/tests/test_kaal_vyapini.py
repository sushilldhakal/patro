"""Kaal windows and kaal-vyapini festival dates against the published patro.

The reference dates are the observed Nepali (MoHA / panchanga samiti) dates for
Dashain and Tihar. They are the point of these rules: for these observances the
printed *udaya* tithi is not the festival day, and in 2024 the two differ for
the whole Dashain week.
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.sun import calculate_sunrise, calculate_sunset
from engine.vedic.kaal import kaal_window, vyapini_date
from engine.vedic.lunar_month import clear_lunar_year_cache, find_festival_in_lunar_month
from engine.vedic.tithi import get_udaya_tithi
from engine.vedic.tithi_boundaries import find_next_tithi, find_tithi_end
from engine.astronomy.ut_instant import day_instant_utc
from rules.engine import compute_festival_dates

RULES = json.loads((ROOT / "rules" / "festival_rules_v3.json").read_text())["festivals"]


@pytest.fixture(autouse=True)
def _clear_cache():
    clear_lunar_year_cache()
    yield
    clear_lunar_year_cache()


class TestKaalWindows:
    def test_madhyahna_is_the_third_fifth_of_daylight(self):
        day = date(2024, 10, 12)
        sunrise = calculate_sunrise(
            day,
            latitude=DEFAULT_LOCATION.lat,
            longitude=DEFAULT_LOCATION.lon,
            timezone_name=DEFAULT_LOCATION.timezone,
        )
        sunset = calculate_sunset(
            day,
            latitude=DEFAULT_LOCATION.lat,
            longitude=DEFAULT_LOCATION.lon,
            timezone_name=DEFAULT_LOCATION.timezone,
        )
        fifth = (sunset - sunrise) / 5

        start, end = kaal_window(day, "madhyahna", DEFAULT_LOCATION)
        assert start == sunrise + 2 * fifth
        assert end == sunrise + 3 * fifth
        # Midday itself falls inside it, which is the point of the window.
        assert start < sunrise + (sunset - sunrise) / 2 < end

    def test_the_daytime_kaalas_tile_in_order(self):
        day = date(2024, 10, 12)
        madhyahna = kaal_window(day, "madhyahna", DEFAULT_LOCATION)
        aparahna = kaal_window(day, "aparahna", DEFAULT_LOCATION)
        assert madhyahna[1] == aparahna[0]
        assert madhyahna[1] - madhyahna[0] == aparahna[1] - aparahna[0]

    def test_pradosh_opens_at_sunset_and_stays_in_the_night(self):
        day = date(2024, 10, 31)
        start, end = kaal_window(day, "pradosh", DEFAULT_LOCATION)
        next_sunrise = get_udaya_tithi(day + timedelta(days=1), DEFAULT_LOCATION)["sunrise"]
        assert start < end < next_sunrise
        # A fifth of a ~12-hour tropical night lands near the classical 3 muhurtas.
        assert timedelta(hours=2) < end - start < timedelta(hours=3)

    def test_unknown_kaal_is_rejected(self):
        with pytest.raises(ValueError):
            kaal_window(date(2024, 10, 12), "sandhya", DEFAULT_LOCATION)  # type: ignore[arg-type]


class TestVyapiniSelection:
    def test_a_tithi_that_misses_the_kaal_on_both_days_has_no_vyapini_day(self):
        """A kshaya tithi opening after one midday and closing before the next."""
        start = find_next_tithi(
            10, "shukla", day_instant_utc(date(2024, 10, 5), hour=0), within_days=25
        )
        end = find_tithi_end(start)
        # Dashami 2024 runs 10-12 11:14 -> 10-13 09:24 NPT and does reach midday
        # on the 12th; shifting the window past both middays must yield nothing.
        assert vyapini_date(start, end, "madhyahna", DEFAULT_LOCATION) == date(2024, 10, 12)
        assert vyapini_date(end, end + timedelta(hours=1), "madhyahna", DEFAULT_LOCATION) is None

    def test_the_day_with_more_of_the_kaal_wins(self):
        """Kartik Amavasya 2024 covers pradosh on both days — the fuller one wins."""
        start = find_next_tithi(
            15, "krishna", day_instant_utc(date(2024, 10, 20), hour=0), within_days=25
        )
        end = find_tithi_end(start)
        first_open, first_close = kaal_window(date(2024, 10, 31), "pradosh", DEFAULT_LOCATION)
        second_open, second_close = kaal_window(date(2024, 11, 1), "pradosh", DEFAULT_LOCATION)
        assert start < first_open and end > first_close      # the 31st: covered whole
        assert second_open < end < second_close              # the 1st: covered in part
        assert vyapini_date(start, end, "pradosh", DEFAULT_LOCATION) == date(2024, 10, 31)


# (festival id, gregorian year, published Nepali date)
DASHAIN = [
    ("fulpati", 2021, date(2021, 10, 12)),
    ("maha-ashtami", 2021, date(2021, 10, 13)),
    ("maha-navami", 2021, date(2021, 10, 14)),
    ("vijaya-dashami", 2021, date(2021, 10, 15)),
    ("fulpati", 2022, date(2022, 10, 2)),
    ("maha-ashtami", 2022, date(2022, 10, 3)),
    ("maha-navami", 2022, date(2022, 10, 4)),
    ("vijaya-dashami", 2022, date(2022, 10, 5)),
    ("fulpati", 2023, date(2023, 10, 21)),
    ("maha-ashtami", 2023, date(2023, 10, 22)),
    ("maha-navami", 2023, date(2023, 10, 23)),
    ("vijaya-dashami", 2023, date(2023, 10, 24)),
    # 2024 is the year the whole week parts company with the udaya tithi.
    ("fulpati", 2024, date(2024, 10, 9)),
    ("maha-ashtami", 2024, date(2024, 10, 10)),
    ("maha-navami", 2024, date(2024, 10, 11)),
    ("vijaya-dashami", 2024, date(2024, 10, 12)),
    ("fulpati", 2025, date(2025, 9, 29)),
    ("maha-ashtami", 2025, date(2025, 9, 30)),
    ("maha-navami", 2025, date(2025, 10, 1)),
    ("vijaya-dashami", 2025, date(2025, 10, 2)),
]

TIHAR = [
    ("laxmi-puja", 2021, date(2021, 11, 4)),
    ("laxmi-puja", 2022, date(2022, 10, 24)),
    ("laxmi-puja", 2023, date(2023, 11, 12)),
    ("laxmi-puja", 2024, date(2024, 10, 31)),
    ("laxmi-puja", 2025, date(2025, 10, 20)),
    ("gai-puja", 2024, date(2024, 10, 31)),
    ("gai-puja", 2025, date(2025, 10, 20)),
]


@pytest.mark.parametrize("festival_id,gregorian_year,expected", DASHAIN + TIHAR)
def test_festival_matches_published_patro(
    festival_id: str, gregorian_year: int, expected: date
):
    result = compute_festival_dates(
        festival_id, RULES[festival_id], gregorian_year, DEFAULT_LOCATION
    )
    assert result is not None
    assert result[0] == expected


def test_dashain_2024_departs_from_the_udaya_tithi():
    """The regression this rule exists for: in 2024 every Dashain tithi opened
    late enough that its udaya day is the day after the observance."""
    for festival_id, expected, udaya_tithi in (
        ("fulpati", date(2024, 10, 9), 6),
        ("maha-ashtami", date(2024, 10, 10), 7),
        ("maha-navami", date(2024, 10, 11), 8),
        ("vijaya-dashami", date(2024, 10, 12), 9),
    ):
        result = compute_festival_dates(
            festival_id, RULES[festival_id], 2024, DEFAULT_LOCATION
        )
        assert result is not None and result[0] == expected
        # The printed patro shows the *previous* tithi against that civil day.
        assert get_udaya_tithi(expected, DEFAULT_LOCATION)["tithi"] == udaya_tithi


def test_devi_visarjan_tracks_vijaya_dashami():
    for year in (2021, 2024, 2025, 2027):
        dashami = compute_festival_dates(
            "vijaya-dashami", RULES["vijaya-dashami"], year, DEFAULT_LOCATION
        )
        visarjan = compute_festival_dates(
            "devi-visarjan", RULES["devi-visarjan"], year, DEFAULT_LOCATION
        )
        assert dashami == visarjan


def test_gai_puja_shares_the_laxmi_puja_day():
    for year in (2022, 2023, 2024, 2025, 2026):
        laxmi = compute_festival_dates("laxmi-puja", RULES["laxmi-puja"], year, DEFAULT_LOCATION)
        gai = compute_festival_dates("gai-puja", RULES["gai-puja"], year, DEFAULT_LOCATION)
        assert laxmi == gai


def test_udaya_rules_are_untouched_by_the_kaal_machinery():
    """Rules without date_selection must resolve exactly as they did before."""
    for festival_id, year, expected in (
        ("ghatasthapana", 2024, date(2024, 10, 3)),
        ("kojagrat-purnima", 2024, date(2024, 10, 17)),
        ("bhai-tika", 2024, date(2024, 11, 3)),
        ("chhath", 2024, date(2024, 11, 7)),
    ):
        assert "date_selection" not in RULES[festival_id]
        result = compute_festival_dates(festival_id, RULES[festival_id], year, DEFAULT_LOCATION)
        assert result is not None and result[0] == expected


def test_unknown_date_selection_falls_back_to_udaya():
    found = find_festival_in_lunar_month(
        lunar_month_name="Ashwin",
        tithi=10,
        paksha="shukla",
        gregorian_year=2024,
        date_selection="sandhya",  # type: ignore[arg-type]
        location=DEFAULT_LOCATION,
    )
    assert found == date(2024, 10, 13)


# Every rule that sets ``date_selection`` must appear here, and every id here
# must be checked above. tests/test_cultural_rule_knobs.py enforces the first
# half, so a new rule taking the knob cannot ship without coverage.
COVERED_RULE_IDS = frozenset(
    {fid for fid, _year, _expected in DASHAIN + TIHAR}
    | {"devi-visarjan", "kalratri"}
)


def test_every_covered_id_is_actually_exercised():
    checked = {fid for fid, _year, _expected in DASHAIN + TIHAR}
    checked |= {"devi-visarjan"}  # test_devi_visarjan_tracks_vijaya_dashami
    checked |= {"kalratri"}       # test_kalratri_tracks_maha_ashtami
    assert COVERED_RULE_IDS == checked


def test_kalratri_tracks_maha_ashtami():
    for year in (2021, 2024, 2025, 2026):
        ashtami = compute_festival_dates(
            "maha-ashtami", RULES["maha-ashtami"], year, DEFAULT_LOCATION
        )
        kalratri = compute_festival_dates("kalratri", RULES["kalratri"], year, DEFAULT_LOCATION)
        assert ashtami == kalratri
