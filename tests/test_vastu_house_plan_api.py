"""Tests for POST /vastu/house-plan (api/vastu.py + services/vastu_house_plan.py)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_BODY = {
    "site": {"plot_width": 15, "plot_depth": 10, "unit": "m", "facing": "east"},
    "requirement": {
        "bedrooms": 3, "toilets": 2, "bathrooms": 1, "combined_toilet_bath": 1,
        "extras": ["living", "kitchen", "dining", "puja"], "mode": "flexible", "storeys": 1,
    },
}


def test_house_plan_end_to_end():
    resp = client.post("/v1/vastu/house-plan", json=_BODY)
    assert resp.status_code == 200
    body = resp.json()
    assert body["rule_version"]
    assert body["facing"] == "east"
    assert len(body["floors"]) == 1
    rooms = body["floors"][0]["rooms"]
    assert len(rooms) > 0
    kitchen = next(r for r in rooms if r["kind"] == "kitchen")
    assert kitchen["vastu_region"] == "southeast"
    assert 0 <= body["score"]["score"] <= 100
    assert isinstance(body["vastu_relaxed"], list)
    for entry in body["vastu_relaxed"]:
        assert set(entry) == {"id", "severity", "message_key"}


def test_house_plan_layer_has_walls_doors_windows_entrance():
    resp = client.post("/v1/vastu/house-plan", json=_BODY)
    layer = resp.json()["floors"][0]["layer"]
    assert len(layer["walls"]) > 0
    types = {h["type"] for h in layer["holes"]}
    assert "door" in types
    assert "window" in types
    assert "entrance" in types


def test_house_plan_is_cached_second_call_identical():
    a = client.post("/v1/vastu/house-plan", json=_BODY).json()
    b = client.post("/v1/vastu/house-plan", json=_BODY).json()
    assert a == b


def test_house_plan_multi_floor_has_stair():
    body = {**_BODY, "requirement": {**_BODY["requirement"], "storeys": 2}}
    resp = client.post("/v1/vastu/house-plan", json=body)
    assert resp.status_code == 200
    d = resp.json()
    assert len(d["floors"]) == 2
    assert d["stair"] is not None
    for floor in d["floors"]:
        assert any(r["kind"] == "staircase" for r in floor["rooms"])


def test_house_plan_all_four_facings_succeed():
    for facing in ["north", "east", "south", "west"]:
        body = {**_BODY, "site": {**_BODY["site"], "facing": facing}}
        resp = client.post("/v1/vastu/house-plan", json=body)
        assert resp.status_code == 200, f"{facing} failed: {resp.text[:300]}"
        assert resp.json()["floors"][0]["rooms"]


def test_house_plan_feet_unit_converts_to_meters():
    body = {**_BODY, "site": {"plot_width": 49.2, "plot_depth": 32.8, "unit": "ft", "facing": "east"}}
    resp = client.post("/v1/vastu/house-plan", json=body)
    assert resp.status_code == 200
    d = resp.json()
    assert abs(d["width"] - 15.0) < 0.1  # 49.2 ft ~= 15 m
    assert abs(d["height"] - 10.0) < 0.1


def test_house_plan_invalid_facing_is_422():
    body = {**_BODY, "site": {**_BODY["site"], "facing": "northeast"}}
    resp = client.post("/v1/vastu/house-plan", json=body)
    assert resp.status_code == 422
