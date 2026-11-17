"""A festival shows no date before the year it was first kept (from_bs_year / from_ad_year)."""

from __future__ import annotations

from datetime import date

from engine.calendar.bikram_sambat import bs_to_gregorian
from engine.festivals.festival_rules import (
    compute_festival_dates,
    first_observed_date,
    load_festival_rules,
)

RULES = load_festival_rules()


def test_constitution_day_starts_in_bs_2073():
    rule = RULES["sambidhan-diwas"]
    # BS 2072 Asoj 3 is the day the constitution came; the first Constitution Day is a year on.
    assert compute_festival_dates("sambidhan-diwas", rule, 2015) is None
    start, _ = compute_festival_dates("sambidhan-diwas", rule, 2016)
    assert start == bs_to_gregorian(2073, 6, 3)


def test_un_day_starts_in_its_first_ad_year():
    rule = RULES["world-yoga-day"]
    assert compute_festival_dates("world-yoga-day", rule, 2014) is None
    assert compute_festival_dates("world-yoga-day", rule, 2015)[0] == date(2015, 6, 21)


def test_lunar_birth_anniversary_has_no_date_before_birth():
    rule = RULES["guru-nanak-jayanti"]
    assert compute_festival_dates("guru-nanak-jayanti", rule, 1400) is None


def test_bs_bound_counts_from_baishakh_1():
    assert first_observed_date({"from_bs_year": 2080}) == bs_to_gregorian(2080, 1, 1)
    assert first_observed_date({"from_ad_year": 2015}) == date(2015, 1, 1)
    assert first_observed_date({}) is None


def test_every_start_year_is_a_plain_year():
    for festival_id, rule in RULES.items():
        for key in ("from_bs_year", "from_ad_year"):
            if key in rule:
                assert isinstance(rule[key], int) and rule[key] > 0, festival_id
