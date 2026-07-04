from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import build_daily_panchanga
from engine.vedic.navatara import build_tarabala_table
from services.panchanga_api import build_daily_state


def test_tarabala_table_has_27_rows():
    raw = build_daily_panchanga(date(2026, 7, 4), DEFAULT_LOCATION)
    table = build_tarabala_table(raw["nakshatra"])
    assert len(table["rows"]) == 27
    assert table["rows"][0]["tara"]
    assert table["rows"][0]["quality"]


def test_daily_state_exposes_hora_and_tables():
    state = build_daily_state(date(2026, 7, 4), DEFAULT_LOCATION, include_detail=True)
    assert len(state["hora"]) == 24
    assert len(state["hora_day"]) == 12
    assert len(state["tarabala_table"]["rows"]) == 27
    assert len(state["chandrabala_table"]["rows"]) == 12
