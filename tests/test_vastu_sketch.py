"""Zone assignment + Āyādi for the plot sketch.

The golden file was produced by running the clients' original TypeScript
(``vastu-plan.ts`` / ``vastu.ts``) on seeded random plans, so these tests pin the
server port to what the apps drew before the logic moved here.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from engine.vedic.vastu import sketch
from engine.vedic.vastu.sketch_rules import SPACE_ZONE_RULES

client = TestClient(app)
GOLDEN = json.loads((Path(__file__).parent / "data" / "golden_vastu_sketch.json").read_text())


def _plan(p: dict) -> sketch.HousePlan:
    return sketch.HousePlan(
        p["bedrooms"], p["toilets"], p["bathrooms"], p["combined"], p["masterBedroom"],
        tuple(p["extras"]), p["mode"], p["storeys"], p["floors"],
    )


@pytest.mark.parametrize("i", range(len(GOLDEN["cases"])))
def test_assignment_matches_original_client(i):
    case = GOLDEN["cases"][i]
    plot = sketch.PlotSize(case["plot"]["width"], case["plot"]["height"]) if case["plot"] else None
    assignments, leftover = sketch.assign_vastu_spaces(_plan(case["plan"]), plot)
    got = [(a.id, a.kind, a.zone, a.fit, a.storey, a.index) for a in assignments]
    want = [
        (a["id"], a["kind"], a["zone"], a["fit"], a["storey"], a.get("index"))
        for a in case["out"]["assignments"]
    ]
    assert got == want
    assert [(s.id, s.kind, s.index) for s in leftover] == [
        (s["id"], s["kind"], s.get("index")) for s in case["out"]["leftover"]
    ]


def test_ayadi_matches_original_client():
    for row in GOLDEN["ayadi"]:
        hasta = sketch.meters_to_hasta(row["m"])
        rem = sketch.ayadi_remainder(hasta)
        assert rem == row["rem"]
        assert sketch.ayadi_auspicious(rem) is row["ok"]
        if not row["ok"]:
            assert sketch.nearest_auspicious_width_hasta(hasta) == row["sug"]


def test_js_round_halves_go_up():
    assert sketch.ayadi_remainder(2.5) == sketch.ayadi_remainder(3)
    assert sketch.ayadi_remainder(0.5) == sketch.ayadi_remainder(1)


def test_sketch_route_default_house():
    resp = client.post("/v1/vastu/sketch", json={"plot_width": 15, "plot_depth": 10, "facing": "east"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["storeys"] == 1
    kinds = {a["kind"] for a in body["assignments"]}
    assert {"master_bedroom", "kitchen", "puja"} <= kinds
    puja = next(a for a in body["assignments"] if a["kind"] == "puja")
    assert puja["zone"] == "northeast" and puja["fit"] == "preferred"
    assert all(a["min_area"] > 0 for a in body["assignments"])
    assert body["entrance"] == {"facing": "east", "preferred_corner": "northeast"}
    assert body["ayadi"]["width_hasta"] == pytest.approx(15 / sketch.HASTA_METERS)


def test_sketch_route_rejects_unknown_kind():
    resp = client.post(
        "/v1/vastu/sketch",
        json={"plot_width": 15, "plot_depth": 10, "plan": {"extras": ["jacuzzi"]}},
    )
    assert resp.status_code == 422


def test_sketch_route_validates_plot():
    assert client.post("/v1/vastu/sketch", json={"plot_width": 0, "plot_depth": 10}).status_code == 422
    assert client.post("/v1/vastu/sketch", json={"plot_width": 10}).status_code == 422


def test_every_kind_has_rules_and_sizes():
    from engine.vedic.vastu.sketch_rules import ASSIGN_ORDER, IDEAL_SIZE

    assert set(SPACE_ZONE_RULES) == set(IDEAL_SIZE)
    assert set(ASSIGN_ORDER) <= set(SPACE_ZONE_RULES)
