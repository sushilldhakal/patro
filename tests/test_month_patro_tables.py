"""Month calendar full payload — lagna spans, sunrise graha spashta, belaantar."""

from __future__ import annotations

from engine.astronomy.location import DEFAULT_LOCATION
from services.panchanga_api import build_daily_state, build_month_calendar


def test_daily_state_includes_patro_table_fields() -> None:
    from engine.vedic.bikram_sambat import bs_to_gregorian

    greg = bs_to_gregorian(2083, 1, 1)
    state = build_daily_state(greg, DEFAULT_LOCATION, include_detail=False)
    assert state.get("lagna_spans")
    assert len(state["lagna_spans"]) == 12
    assert state.get("udaya_lagna")
    assert len(state["udaya_lagna"]) == 12
    assert state.get("planets")
    assert "sun" in state["planets"]
    assert state["planets"]["sun"].get("dms_in_rashi")
    assert state.get("solar_corrections")
    assert state["solar_corrections"]["belaantar"]["name_ne"] == "बेलान्तर"
    assert state["planets_anchor"]["type"] == "udayakal"


def test_month_calendar_full_embeds_patro_fields() -> None:
    month = build_month_calendar(2083, 1, DEFAULT_LOCATION, full=True)
    row = month["calendar"][0]
    p = row["panchanga"]
    assert p.get("lagna_spans")
    assert p.get("planets")
    assert p.get("solar_corrections")
