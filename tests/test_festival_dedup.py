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
from services.holiday_generator import filter_redundant_day_festivals, get_bs_festivals


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


def test_janai_purnima_day_drops_generic_purnima_vrata():
    bs_payload = get_bs_festivals(2083, DEFAULT_LOCATION)
    day = date(2026, 8, 28)
    active = _festivals_for_day(bs_payload["festivals"], day)
    ids = {f["id"] for f in active}

    assert "janai-purnima" in ids
    assert "purnima-vrata-shrawan" not in ids
