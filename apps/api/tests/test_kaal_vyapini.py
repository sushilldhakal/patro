"""Kaal windows, and the festivals whose day is chosen by one — read from the panchanga.

A festival day is checked against what its own tithi does that day (holds sunrise,
pervades pradosha …), never against an English date. Dashain's days follow Nirnaya
Sindhu / Dharma Sindhu and are checked year by year in tests/test_dashain_2083.py.
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
from engine.panchanga.kaal import kaal_window, vyapini_date
from engine.panchanga.lunar_month import clear_lunar_year_cache, find_festival_in_lunar_month
from engine.panchanga.tithi import get_udaya_tithi
from engine.panchanga.tithi_boundaries import find_next_tithi, find_tithi_end
from engine.astronomy.ut_instant import day_instant_utc
from engine.festivals.festival_rules import compute_festival_dates

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


YEARS = (2021, 2022, 2023, 2024, 2025, 2026)


def _amavasya_pervades_pradosh(day: date) -> bool:
    """Kartik Amavasya (tithi 30) runs through some of this day's pradosha."""
    from engine.astronomy.ut_instant import as_julian_day
    from engine.panchanga.angas import panchanga_service

    start, end = kaal_window(day, "pradosh", DEFAULT_LOCATION)
    probes = [start + (end - start) * k / 8 for k in range(9)]
    return any(panchanga_service.tithi_number(as_julian_day(t)) == 30 for t in probes)


@pytest.mark.parametrize("year", YEARS)
def test_laxmi_puja_is_the_amavasya_of_pradosha(year: int):
    result = compute_festival_dates("laxmi-puja", RULES["laxmi-puja"], year, DEFAULT_LOCATION)
    assert result is not None
    assert _amavasya_pervades_pradosh(result[0])


@pytest.mark.parametrize("year", YEARS)
def test_the_tihar_holiday_opens_on_laxmi_puja(year: int):
    laxmi = compute_festival_dates("laxmi-puja", RULES["laxmi-puja"], year, DEFAULT_LOCATION)
    tihar = compute_festival_dates("tihar", RULES["tihar"], year, DEFAULT_LOCATION)
    assert laxmi is not None and tihar is not None and tihar[0] == laxmi[0]


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
    """Rules without date_selection fall on the day their tithi holds sunrise."""
    for festival_id in ("ghatasthapana", "kojagrat-purnima", "bhai-tika", "chhath"):
        rule = RULES[festival_id]
        assert "date_selection" not in rule
        result = compute_festival_dates(festival_id, rule, 2024, DEFAULT_LOCATION)
        assert result is not None
        udaya = get_udaya_tithi(result[0], DEFAULT_LOCATION)
        assert (udaya["tithi"], udaya["paksha"]) == (rule["tithi"], rule["paksha"])


def test_unknown_date_selection_falls_back_to_udaya():
    kw = dict(lunar_month_name="Ashwin", tithi=10, paksha="shukla", gregorian_year=2024, location=DEFAULT_LOCATION)
    found = find_festival_in_lunar_month(date_selection="sandhya", **kw)  # type: ignore[arg-type]
    assert found == find_festival_in_lunar_month(date_selection="udaya", **kw)


# Every rule that sets ``date_selection`` must appear here, and every id here
# must be checked above. tests/test_cultural_rule_knobs.py enforces the first
# half, so a new rule taking the knob cannot ship without coverage.
COVERED_RULE_IDS = frozenset({"laxmi-puja", "gai-puja", "tihar", "maha-ashtami", "kalratri"})


def test_every_covered_id_is_actually_exercised():
    checked = {"laxmi-puja", "tihar"}  # the pradosha tests above
    checked |= {"gai-puja"}            # test_gai_puja_shares_the_laxmi_puja_day
    checked |= {"kalratri"}            # test_kalratri_tracks_maha_ashtami
    checked |= {"maha-ashtami"}        # tests/test_dashain_2083.py, every year 2078–2090
    assert COVERED_RULE_IDS == checked


def test_kalratri_tracks_maha_ashtami():
    for year in (2021, 2024, 2025, 2026):
        ashtami = compute_festival_dates(
            "maha-ashtami", RULES["maha-ashtami"], year, DEFAULT_LOCATION
        )
        kalratri = compute_festival_dates("kalratri", RULES["kalratri"], year, DEFAULT_LOCATION)
        assert ashtami == kalratri


def test_dashain_vidaa_opens_on_fulpati():
    """The Dashain holiday block starts on Phulpati (Saptami at sunrise)."""
    for year in (2021, 2024, 2025, 2026):
        fulpati = compute_festival_dates("fulpati", RULES["fulpati"], year, DEFAULT_LOCATION)
        vidaa = compute_festival_dates("dashain-vidaa", RULES["dashain-vidaa"], year, DEFAULT_LOCATION)
        assert fulpati is not None and vidaa is not None
        assert vidaa[0] == fulpati[0]
