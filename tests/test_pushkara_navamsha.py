from datetime import date

from core.location import DEFAULT_LOCATION
from panchanga.daily import build_daily_panchanga
from panchanga.pushkara_navamsha import pushkara_degrees_for_rashi, rashi_element


def test_rashi_element_and_degrees():
    assert rashi_element(1) == "fire"
    assert pushkara_degrees_for_rashi(1) == (20.0, (9 - 1) * (30.0 / 9.0))
    assert rashi_element(2) == "earth"
    assert pushkara_degrees_for_rashi(4) == (0.0, (3 - 1) * (30.0 / 9.0))


def test_daily_panchanga_includes_pushkara_on_lagna_spans():
    payload = build_daily_panchanga(date(2026, 6, 28), DEFAULT_LOCATION)
    spans = payload["lagna_spans"]
    assert len(spans) == 12
    with_pushkara = [s for s in spans if s.get("pushkara_navamsha")]
    assert with_pushkara, "expected at least one lagna span with pushkara times"
    first = with_pushkara[0]
    for hit in first["pushkara_navamsha"]:
        assert hit["local_time_short"]
        assert "degree" in hit
