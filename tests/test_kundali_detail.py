"""Tests for /kundali/detail and kundali detail builder."""

from fastapi.testclient import TestClient

from app.main import app
from engine.astronomy.location import ObserverLocation
from engine.vedic.at_time import parse_query_datetime
from engine.vedic.kundali_detail import build_kundali_detail


def test_kundali_detail_endpoint():
    client = TestClient(app)
    resp = client.get(
        "/kundali/detail",
        params={
            "datetime": "1993-06-12T10:30:00",
            "ayanamsha": "nepal",
            "lat": 27.7172,
            "lon": 85.3240,
            "timezone": "Asia/Kathmandu",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "panchanga" in data
    assert data["ayanamsha"] == "nepal"
    assert "1" in data["vargaCharts"]["entries"]
    d1 = data["vargaCharts"]["entries"]["1"]
    assert any(row["key"] == "lagna" for row in d1)
    assert any(row["key"] == "moon" for row in d1)
    for row in d1:
        assert 1 <= row["vargaRashi"] <= 12
        assert row["subLord"] in {
            "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
        }


def test_build_kundali_detail_direct():
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")
    assert payload["lagnaRashi"] is not None
    assert payload["dasha"] is not None
    assert len(payload["dasha"]["tree"]) <= 3
    assert payload["dasha"]["tree_depth"] == 3
    assert payload["birth_instant"].startswith("1993-06-12")
