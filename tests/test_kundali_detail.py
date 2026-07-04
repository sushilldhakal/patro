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


def test_ashtakavarga_and_bhava_bala_present():
    """Both sections must be populated with valid Parashari invariants."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")

    av = payload["ashtakavarga"]
    assert av is not None
    raw = av["raw"]
    assert len(raw) == 12
    # Classical per-target bhinnashtakavarga totals (invariant across all charts).
    expected = {
        "lagna": 49, "sun": 48, "moon": 49, "mars": 39,
        "mercury": 54, "jupiter": 56, "venus": 52, "saturn": 39,
    }
    for target, total in expected.items():
        assert sum(row["bindus"][target] for row in raw) == total, target
    # Sarvashtakavarga (seven grahas, Lagna excluded) always totals 337.
    assert sum(row["sarvashtaka"] for row in raw) == 337
    assert {r["target"] for r in av["shodhyaPinda"]} == set(expected)

    bb = payload["bhavaBala"]
    assert bb is not None
    assert len(bb["houses"]) == 12
    assert bb["referenceVirupas"] == 420.0
    for h in bb["houses"]:
        assert 0.0 <= h["disha"] <= 60.0
        component_sum = h["bhavadhipati"] + h["disha"] + h["drishti"]
        assert abs(h["totalPinda"] - component_sum) < 0.05
    assert bb["strongest"]["totalPinda"] >= bb["weakest"]["totalPinda"]


def test_kundali_report_streams_ndjson():
    """Regression: the report endpoint previously crashed on the ayanamsa arg."""
    client = TestClient(app)
    resp = client.get(
        "/kundali/report",
        params={
            "datetime": "1993-06-12T10:30:00",
            "ayanamsha": "nepal",
            "lat": 27.70169,
            "lon": 85.3206,
            "timezone": "Asia/Kathmandu",
        },
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/x-ndjson")
    lines = [line for line in resp.text.splitlines() if line.strip()]
    assert len(lines) > 1
