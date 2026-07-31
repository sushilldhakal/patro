"""Tests for Julian Day civil-day helpers."""

from __future__ import annotations

from datetime import date

import pytest

from engine.astronomy.jd_calendar import (
    CivilDay,
    civil_day_add,
    civil_day_jd_from_date,
    civil_day_jd_ut,
    civil_iso_from_date,
    civil_parts_from_jd_ut,
    format_civil_iso,
    parse_civil_iso,
)
from engine.vedic.sankranti import find_sankranti_after_jd, get_sun_rashi_at_jd


def test_civil_day_jd_roundtrip_today():
    d = date(2026, 7, 30)
    jd = civil_day_jd_from_date(d)
    assert CivilDay.from_jd_ut(jd) == CivilDay(2026, 7, 30)
    assert civil_iso_from_date(d) == "2026-07-30"


def test_bce_civil_label_via_swe():
    jd = civil_day_jd_ut(-56, 3, 20)
    y, m, day = civil_parts_from_jd_ut(jd)
    assert (y, m, day) == (-56, 3, 20)
    assert format_civil_iso(y, m, day) == "-0056-03-20"


def test_parse_civil_iso_bce():
    civil = parse_civil_iso("-0056-03-20")
    assert civil == CivilDay(-56, 3, 20)
    assert civil.to_jd_ut() == civil_day_jd_ut(-56, 3, 20)


def test_sankranti_jd_finds_mesh_near_bce():
    search = civil_day_jd_ut(-56, 4, 1) - 15
    jd = find_sankranti_after_jd(0, search, max_days=45)
    assert jd is not None
    assert get_sun_rashi_at_jd(jd) in {0, 11}  # on or just after Mesha ingress


def test_civil_day_add_steps_one_day():
    jd0 = civil_day_jd_ut(2026, 1, 1)
    jd1 = civil_day_add(jd0, 1)
    assert CivilDay.from_jd_ut(jd1) == CivilDay(2026, 1, 2)


def test_parse_civil_iso_rejects_garbage():
    with pytest.raises(ValueError):
        parse_civil_iso("not-a-date")
