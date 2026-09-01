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


def _shared_span(a: dict, b: dict) -> tuple[bool, float, float, float] | None:
    """Port of engine.vedic.vastu.geometry.shared_seg for the API's plain-dict
    room shape: (is_horizontal, fixed_coordinate, lo, hi) of the segment
    where rects `a` and `b` touch flush, or None if they don't."""
    eps = 0.04
    ax0, ax1, ay0, ay1 = a["x"], a["x"] + a["w"], a["y"], a["y"] + a["h"]
    bx0, bx1, by0, by1 = b["x"], b["x"] + b["w"], b["y"], b["y"] + b["h"]
    if abs(ax1 - bx0) < eps or abs(bx1 - ax0) < eps:
        x = ax1 if abs(ax1 - bx0) < eps else ax0
        lo, hi = max(ay0, by0), min(ay1, by1)
        if hi - lo > 0.45:
            return (False, x, lo, hi)
    if abs(ay1 - by0) < eps or abs(by1 - ay0) < eps:
        y = ay1 if abs(ay1 - by0) < eps else ay0
        lo, hi = max(ax0, bx0), min(ax1, bx1)
        if hi - lo > 0.45:
            return (True, y, lo, hi)
    return None


def _wall_covers(layer: dict, span: tuple[bool, float, float, float]) -> list[dict]:
    horiz, fixed, lo, hi = span
    verts = {v["id"]: v for v in layer["vertices"]}
    hits = []
    for w in layer["walls"]:
        va, vb = verts[w["a"]], verts[w["b"]]
        if horiz and abs(va["y"] - vb["y"]) < 1e-3 and abs(va["y"] - fixed) < 0.05:
            wlo, whi = min(va["x"], vb["x"]), max(va["x"], vb["x"])
        elif not horiz and abs(va["x"] - vb["x"]) < 1e-3 and abs(va["x"] - fixed) < 0.05:
            wlo, whi = min(va["y"], vb["y"]), max(va["y"], vb["y"])
        else:
            continue
        if min(whi, hi) - max(wlo, lo) > 0.05:
            hits.append(w)
    return hits


def test_house_plan_open_rooms_meeting_head_on_share_open_floor():
    """Regression test: compile_layer used to wall off the *entire* side of
    an open/circulation room (Brahmasthan, hall, foyer, landing) whenever
    any part of that side touched a closed room — even the portion of the
    same side that actually bordered another open room, which should stay
    open floor (that's the whole point of open-to-open reachability needing
    no door). On this plot it used to cut the Brahmasthan into several
    separately walled-off slivers; it should now read as one open area
    wherever two open rooms meet without a door between them."""
    for storeys in (1, 2):
        body = {**_BODY, "requirement": {**_BODY["requirement"], "storeys": storeys}}
        resp = client.post("/v1/vastu/house-plan", json=body)
        assert resp.status_code == 200
        for floor in resp.json()["floors"]:
            layer = floor["layer"]
            open_rooms = [r for r in floor["rooms"] if r["life"] in ("circulation", "outdoor")]
            door_walls = {h["wall_id"] for h in layer["holes"] if h["type"] == "door"}
            for i in range(len(open_rooms)):
                for j in range(i + 1, len(open_rooms)):
                    span = _shared_span(open_rooms[i], open_rooms[j])
                    if not span:
                        continue
                    for wall in _wall_covers(layer, span):
                        assert wall["id"] in door_walls, (
                            f"{open_rooms[i]['id']} and {open_rooms[j]['id']} are walled off "
                            f"from each other with no door (floor {floor['storey']})"
                        )


def test_house_plan_invalid_facing_is_422():
    body = {**_BODY, "site": {**_BODY["site"], "facing": "northeast"}}
    resp = client.post("/v1/vastu/house-plan", json=body)
    assert resp.status_code == 422
