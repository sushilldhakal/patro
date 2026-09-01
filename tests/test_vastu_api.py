"""Tests for the Vastu API routes (api/vastu.py), hit through the real FastAPI app."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_zones_list_all():
    resp = client.get("/v1/vastu/zones")
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 60
    assert "rule_version" in body


def test_zones_filtered_by_pada32():
    resp = client.get("/v1/vastu/zones", params={"kind": "pada32"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 32
    assert all(z["granularity"] == "pada32" for z in body["zones"])


def test_zones_invalid_kind_is_422():
    resp = client.get("/v1/vastu/zones", params={"kind": "not-a-kind"})
    assert resp.status_code == 422  # FastAPI Literal validation on the query param


def test_zone_detail_known():
    resp = client.get("/v1/vastu/zones/pada32/gandharva")
    assert resp.status_code == 200
    body = resp.json()
    assert body["verificationStatus"] == "user_verified"
    assert "मनोरञ्जन" in body["best"]["ne"]


def test_zone_detail_unknown_is_404():
    resp = client.get("/v1/vastu/zones/pada32/not-a-real-pada")
    assert resp.status_code == 404


def test_rooms_canonical_shape():
    resp = client.get("/v1/vastu/rooms", params={"subject": "kitchen"})
    assert resp.status_code == 200
    body = resp.json()
    assert "rule_version" in body
    assert body["rooms"] == [
        {
            "subject": "kitchen",
            "best_zones": body["rooms"][0]["best_zones"],
            "avoid_zones": body["rooms"][0]["avoid_zones"],
        }
    ]
    assert "dir8:southeast" in body["rooms"][0]["best_zones"]
    assert "dir8:northeast" in body["rooms"][0]["avoid_zones"]


def test_rooms_no_filter_returns_every_subject():
    resp = client.get("/v1/vastu/rooms")
    assert resp.status_code == 200
    subjects = {r["subject"] for r in resp.json()["rooms"]}
    assert "kitchen" in subjects
    assert "master_bedroom" in subjects


def test_room_detail_has_matched_phrases():
    resp = client.get("/v1/vastu/rooms/kitchen/detail")
    assert resp.status_code == 200
    body = resp.json()
    assert body["subject"] == "kitchen"
    assert all("matchedPhrase" in m for m in body["mappings"])


def test_room_detail_unknown_subject_is_404():
    resp = client.get("/v1/vastu/rooms/not-a-real-subject/detail")
    assert resp.status_code == 404


def test_analyze_returns_best_avoid_zones_no_geometry():
    body = {
        "site": {"plot_width": 15, "plot_depth": 10, "unit": "ft"},
        "requirement": {
            "bedrooms": 2,
            "master_bedroom_index": 1,
            "toilets": 1,
            "extras": ["kitchen", "living", "puja"],
            "mode": "flexible",
        },
    }
    resp = client.post("/v1/vastu/analyze", json=body)
    assert resp.status_code == 200
    result = resp.json()
    assert "rule_version" in result
    subjects = {r["subject"] for r in result["rooms"]}
    assert {"kitchen", "living", "puja", "master_bedroom", "bedroom", "toilet"} <= subjects
    kitchen = next(r for r in result["rooms"] if r["subject"] == "kitchen")
    assert "dir8:southeast" in kitchen["best_zones"]
    # No geometry anywhere in the response.
    assert "walls" not in result
    assert "rooms_placed" not in result


def test_analyze_small_plot_gets_a_warning():
    body = {
        "site": {"plot_width": 5, "plot_depth": 5, "unit": "ft"},
        "requirement": {"bedrooms": 5, "extras": []},
    }
    resp = client.post("/v1/vastu/analyze", json=body)
    assert resp.status_code == 200
    issues = resp.json()["issues"]
    assert any(i["severity"] == "warn" for i in issues)
