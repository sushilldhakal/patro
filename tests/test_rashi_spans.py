"""Tests for moon rashi / nakshatra pada spans."""

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import build_daily_panchanga
from engine.vedic.rashi_spans import get_surya_nakshatra


def test_daily_payload_includes_rashi_card_fields():
    payload = build_daily_panchanga(date(2026, 6, 12), DEFAULT_LOCATION)
    assert "chandra_rashi_spans" in payload
    assert "nakshatra_pada_spans" in payload
    assert "surya_nakshatra" in payload
    assert len(payload["chandra_rashi_spans"]) >= 1
    assert len(payload["nakshatra_pada_spans"]) >= 1
    assert payload["surya_nakshatra"]["name_ne"]


def test_nakshatra_pada_spans_have_pada_and_end_times():
    payload = build_daily_panchanga(date(2026, 6, 12), DEFAULT_LOCATION)
    spans = payload["nakshatra_pada_spans"]
    assert all(1 <= s["pada"] <= 4 for s in spans)
    assert all(s.get("nakshatra_name_ne") for s in spans)
    # All but the last span should end before next sunrise
    for span in spans[:-1]:
        assert span.get("end_local_time_short")


def test_daily_payload_includes_balam_and_panchaka():
    payload = build_daily_panchanga(date(2026, 6, 12), DEFAULT_LOCATION)
    assert "chandrabalam" in payload
    assert "tarabalam" in payload
    assert "panchaka_rahita" in payload
    assert "udaya_lagna" in payload
    assert len(payload["chandrabalam"]["set1"]) >= 1
    assert len(payload["tarabalam"]["set1"]) >= 1
    assert len(payload["panchaka_rahita"]) >= 1
    assert len(payload["udaya_lagna"]) == 12


def test_surya_nakshatra_matches_sun_longitude():
    from engine.astronomy.swiss_eph import calculate_sunrise

    sunrise = calculate_sunrise(
        date(2026, 6, 12),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    surya = get_surya_nakshatra(sunrise)
    assert 1 <= surya["number"] <= 27
