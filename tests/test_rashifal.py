"""Tests for server rashifal (chandrabala + moorti)."""

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import get_daily_panchanga
from engine.vedic.rashifal import build_daily_rashifal
from services.rashifal_api import rashifal_for_gregorian


def test_daily_payload_includes_rashifal():
    greg = date(2026, 7, 15)
    raw = get_daily_panchanga(greg, DEFAULT_LOCATION)
    rf = raw.get("rashifal")
    assert isinstance(rf, dict)
    assert rf.get("period") == "daily"
    assert len(rf.get("signs") or []) == 12
    for sign in rf["signs"]:
        assert sign.get("prediction_ne")
        assert sign.get("prediction_en")
        assert sign.get("syllables_ne")
        assert sign.get("moorti") in ("swarna", "rajata", "tamra", "loha")


def test_build_daily_rashifal_matches_chandrabala_tone():
    greg = date(2026, 7, 15)
    raw = get_daily_panchanga(greg, DEFAULT_LOCATION)
    table = raw["chandrabala_table"]
    built = build_daily_rashifal(table)
    for row, sign in zip(table["rows"], built["signs"], strict=True):
        assert row["tone"] == sign["tone"]
        assert row["tara_num"] == sign["tara_num"]


def test_weekly_rashifal_has_twelve_signs():
    greg = date(2026, 7, 15)
    out = rashifal_for_gregorian(greg, DEFAULT_LOCATION, period="weekly")
    assert out["period"] == "weekly"
    assert len(out["signs"]) == 12
