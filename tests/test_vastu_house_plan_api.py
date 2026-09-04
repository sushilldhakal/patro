"""Tests for POST /vastu/house-plan (api/vastu.py + services/vastu_house_plan.py)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_BODY = {
    "site": {"plot_width": 15, "plot_depth": 12, "unit": "m", "facing": "east"},
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
    # Not pinned to one exact zone: the kitchen's seat is southeast, but which
    # of its acceptable zones wins is a joint optimum across every room on the
    # floor, and it legitimately shifts when constraints change (it moved off
    # southeast once solver.py started requiring window-eligible rooms on the
    # perimeter). What must hold is that it isn't placed somewhere the engine
    # itself considers a compromise.
    kitchen = next(r for r in rooms if r["kind"] == "kitchen")
    assert f"relax-{kitchen['id']}" not in {e["id"] for e in body["vastu_relaxed"]}
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


@pytest.mark.parametrize("plot_width,plot_depth", [(15, 10), (12, 9), (10, 15), (13, 10), (11, 14)])
def test_house_plan_rooms_fully_cover_the_plot(plot_width, plot_depth):
    """Regression test for two stacked bugs that both left real floor area
    claimed by no room at all (closed or open) — walled off on both sides,
    since the rooms on either side of the gap still get their own full
    wall, so it renders as two parallel walls with dead space between them:

    1. usable_cell() returned only the largest piece of a corner-notch-
       clipped zone cell and silently dropped the rest.
    2. Every carve site (attach_toilet, place_foyer, place_wet_in_cell, the
       stair's host-room carve, and usable_cell's own notch leftover) fed
       its remainder through a >=0.9m-per-side filter before registering it
       as open space — so even after (1) was fixed, a thinner leftover
       (sometimes several square metres' worth, e.g. 12x9m lost 7.26 m^2)
       still vanished silently. Every one of those sites now keeps
       leftovers down to a couple of centimetres.

    (12, 9) and (10, 15) specifically reproduce bug 2 on plot sizes well
    within normal use, not just extreme/cramped edge cases.
    """
    body = {**_BODY, "site": {**_BODY["site"], "plot_width": plot_width, "plot_depth": plot_depth}}
    resp = client.post("/v1/vastu/house-plan", json=body)
    assert resp.status_code == 200
    floor = resp.json()["floors"][0]
    plot_area = plot_width * plot_depth
    covered = sum(r["w"] * r["h"] for r in floor["rooms"])
    assert abs(covered - plot_area) < 0.5, f"covered {covered:.2f} of {plot_area:.2f} m^2"


@pytest.mark.parametrize("plot_width,plot_depth,storeys", [(15, 12, 1), (14, 15, 3), (12, 9, 1)])
def test_window_rooms_sit_on_the_exterior_wall(plot_width, plot_depth, storeys):
    """building.py can only put a window in a room whose edge lies on the
    plot's own perimeter, so a room the solver tucks fully into the interior
    can never get one. Every kind outside EXTERIOR_EXEMPT_KINDS (storage,
    utility and the wet rooms, which are routinely interior in real plans)
    must therefore touch an outer wall."""
    from engine.vedic.vastu.solver import EXTERIOR_EXEMPT_KINDS

    body = {
        "site": {**_BODY["site"], "plot_width": plot_width, "plot_depth": plot_depth},
        "requirement": {**_BODY["requirement"], "storeys": storeys},
    }
    resp = client.post("/v1/vastu/house-plan", json=body)
    assert resp.status_code == 200
    d = resp.json()
    eps = 0.02
    for floor in d["floors"]:
        for r in floor["rooms"]:
            # Circulation/outdoor fragments and the stair shaft aren't solver-placed.
            if r["life"] in ("circulation", "outdoor", "vertical") or r["kind"] in EXTERIOR_EXEMPT_KINDS:
                continue
            on_edge = (
                r["x"] <= eps
                or r["y"] <= eps
                or abs(r["x"] + r["w"] - d["width"]) <= eps
                or abs(r["y"] + r["h"] - d["height"]) <= eps
            )
            assert on_edge, (
                f"{r['id']} ({r['kind']}) is fully interior at "
                f"({r['x']}, {r['y']}, {r['w']}x{r['h']}) on a {d['width']}x{d['height']} plot "
                f"— it can never be given a window"
            )


def test_house_plan_invalid_facing_is_422():
    body = {**_BODY, "site": {**_BODY["site"], "facing": "northeast"}}
    resp = client.post("/v1/vastu/house-plan", json=body)
    assert resp.status_code == 422
