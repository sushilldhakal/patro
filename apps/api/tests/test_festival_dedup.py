"""Tests for same-day festival deduplication."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION
from services.holiday_generator import festivals_on_date, load_rules
from services.patro_generator import _festivals_for_day
from services.holiday_generator import (
    filter_redundant_day_festivals,
    filter_redundant_year_festivals,
    get_bs_festivals,
)


def _festival(id_: str, start: str) -> dict:
    rule = load_rules()[id_]
    return {
        "id": id_,
        "name_en": rule.get("name_en", id_),
        "name_ne": rule.get("name_ne"),
        "start_date": start,
        "end_date": start,
    }


def test_guru_purnima_day_drops_redundant_vrata_labels():
    day = date(2026, 7, 29)
    payload = festivals_on_date(day, DEFAULT_LOCATION)
    names = {f["id"] for f in payload["festivals"]}

    assert "guru-purnima" in names
    assert "vyas-jayanti" in names
    assert "guru-purnima-vrata" not in names
    assert "purnima-vrata-ashadh" not in names
    assert "dilla-punhi" not in names


def test_filter_redundant_day_festivals_unit():
    active = [
        _festival("guru-purnima", "2026-07-29"),
        _festival("guru-purnima-vrata", "2026-07-29"),
        _festival("purnima-vrata-ashadh", "2026-07-29"),
        _festival("dilla-punhi", "2026-07-29"),
        _festival("vyas-jayanti", "2026-07-29"),
        _festival("world-tiger-day", "2026-07-29"),
    ]
    filtered = filter_redundant_day_festivals(active)
    ids = {f["id"] for f in filtered}

    assert ids == {"guru-purnima", "vyas-jayanti", "world-tiger-day"}


def test_year_list_drops_the_same_rows_the_day_view_drops():
    """The Festivals tab reads the year list, so it must dedup like the day view."""
    ids = {f["id"] for f in get_bs_festivals(2083, DEFAULT_LOCATION)["festivals"]}

    assert "guru-purnima" in ids
    assert "vyas-jayanti" in ids
    for redundant in (
        "guru-purnima-vrata",
        "purnima-vrata-ashadh",
        "purnima-vrata-shrawan",
        "purnima-vrata-ashwin",
        "dilla-punhi",
        "ghatasthapana-vrata",
        "navaratri-arambha",
        "amako-mukh-herne-din",
        "sattila-ekadashi",
        "nari-diwas",
    ):
        assert redundant not in ids, redundant


def test_alias_row_drops_even_when_its_target_moved_to_another_day():
    """MoHA overrides can shift the canonical row; the alias must not survive alone."""
    active = [_festival("amako-mukh-herne-din", "2024-05-08")]

    assert filter_redundant_day_festivals(active) == []


def test_year_filter_keeps_a_multi_day_festival_covered_on_one_of_its_days():
    tihar = {
        "id": "tihar",
        "name_ne": "तिहार",
        "start_date": "2026-11-08",
        "end_date": "2026-11-12",
    }
    festivals = [
        tihar,
        _festival("guru-purnima", "2026-11-08"),
        _festival("guru-purnima-vrata", "2026-11-08"),
    ]
    ids = {f["id"] for f in filter_redundant_year_festivals(festivals)}

    assert ids == {"tihar", "guru-purnima"}


def test_janai_purnima_day_drops_generic_purnima_vrata():
    bs_payload = get_bs_festivals(2083, DEFAULT_LOCATION)
    day = date(2026, 8, 28)
    active = _festivals_for_day(bs_payload["festivals"], day)
    ids = {f["id"] for f in active}

    assert "janai-purnima" in ids
    assert "purnima-vrata-shrawan" not in ids
