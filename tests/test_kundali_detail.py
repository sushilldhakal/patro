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


def test_yogas_list_all_fixed_yogas_not_just_formed_ones():
    """The Kundali Yoga table shows the full checklist, present or absent —
    it must not silently drop rows for yogas that aren't formed in this chart."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")

    yogas = payload["yogas"]
    keys = [y["key"] for y in yogas]
    assert len(keys) == len(set(keys))  # no duplicate rows
    assert any(not y["present"] for y in yogas), "expected at least one absent yoga"
    assert {"gajakesari", "budhaditya", "chandra_mangala", "kemadruma", "dhana_2_11"} <= set(keys)
    for planet in ("mars", "mercury", "jupiter", "venus", "saturn"):
        assert f"mahapurusha_{planet}" in keys
    for row in yogas:
        assert isinstance(row["present"], bool)
        assert row["nameEn"] and row["nameNe"]
        assert row["descEn"]


def test_graha_yuddha_detects_a_real_planetary_war():
    """Two tara grahas within 1deg of longitude must be reported as a war,
    not silently left empty — /kundali/detail previously always returned
    yuddha: {wars: [], byPlanet: {}} regardless of the actual chart."""
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1982-01-10T06:00:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="lahiri")

    yuddha = payload["yuddha"]
    assert yuddha["wars"], "expected a detected planetary war for this chart"
    war = yuddha["wars"][0]
    assert war["separationDeg"] < 1.0
    assert {war["winner"], war["loser"]} <= {"mars", "mercury", "jupiter", "venus", "saturn"}
    assert yuddha["byPlanet"][war["winner"]] > 0
    assert yuddha["byPlanet"][war["loser"]] < 0


def test_graha_yuddha_empty_when_no_war_in_chart():
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu",
    )
    instant = parse_query_datetime("1993-06-12T10:30:00", timezone_name=loc.timezone)
    payload = build_kundali_detail(instant, loc, ayanamsha="nepal")
    assert payload["yuddha"] == {"wars": [], "byPlanet": {}}


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


def test_kundali_report_served_from_cache_on_repeat(tmp_path, monkeypatch):
    """Same birth inputs should hit SQLite cache on the second request."""
    import services.kundali_report_cache as report_cache

    db_path = tmp_path / "kundali.db"
    monkeypatch.setattr(report_cache, "kundali_db_path", lambda: db_path)
    monkeypatch.setattr(report_cache, "cache_enabled", lambda: True)

    params = {
        "datetime": "1993-06-12T10:30:00",
        "ayanamsha": "nepal",
        "lang": "en",
        "lat": 27.70169,
        "lon": 85.3206,
        "timezone": "Asia/Kathmandu",
    }
    client = TestClient(app)

    first = client.get("/kundali/report", params=params)
    assert first.status_code == 200
    assert first.headers.get("X-Report-Cache") == "miss"

    second = client.get("/kundali/report", params=params)
    assert second.status_code == 200
    assert second.headers.get("X-Report-Cache") == "hit"
    assert second.text == first.text


def test_kundali_report_force_bypasses_cache(tmp_path, monkeypatch):
    import services.kundali_report_cache as report_cache

    db_path = tmp_path / "kundali.db"
    monkeypatch.setattr(report_cache, "kundali_db_path", lambda: db_path)
    monkeypatch.setattr(report_cache, "cache_enabled", lambda: True)

    params = {
        "datetime": "1993-06-12T10:30:00",
        "ayanamsha": "nepal",
        "lang": "en",
        "lat": 27.70169,
        "lon": 85.3206,
        "timezone": "Asia/Kathmandu",
    }
    client = TestClient(app)
    client.get("/kundali/report", params=params)
    forced = client.get("/kundali/report", params={**params, "force": "true"})
    assert forced.status_code == 200
    assert forced.headers.get("X-Report-Cache") == "miss"
