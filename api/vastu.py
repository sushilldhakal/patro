"""Vastu house-planning routes.

* ``GET  /vastu/zones``              → all zones (optionally filtered by granularity)
* ``GET  /vastu/zones/{gran}/{id}``  → one zone's full detail
* ``GET  /vastu/rooms``              → {rule_version, rooms: [{subject, best_zones, avoid_zones}]}
* ``GET  /vastu/rooms/{subject}/detail`` → the fuller mapping form, with matched phrases, for audit
* ``POST /vastu/analyze``            → same rooms shape, for just the requested house's rooms,
                                        plus light requirement-sanity issues. No room placement.
* ``POST /vastu/house-plan``         → the real deliverable: a full placed floor plan (rooms,
                                        walls, doors, windows, stair, score) — engine.vedic.vastu.

No auth — matches every other public computation route in this repo
(panchanga, kundali, elements): arbitrary input in, a computed/looked-up
result out, nothing persisted.
"""

from __future__ import annotations

import hashlib
import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request

from engine.vedic.vastu.rooms import HouseRequirement
from services import vastu_api
from services import vastu_house_plan
from services import vastu_rules_db as db
from services.response_cache import serve_cached_json
from services.vastu_schemas import (
    VastuAnalyzeRequest,
    VastuAnalyzeResponse,
    VastuHousePlanRequest,
    VastuHousePlanResponse,
)

router = APIRouter(tags=["vastu"])

# Bump when layout.py/building.py/scoring.py logic changes so old cache
# entries don't get served under a stale algorithm (same pattern as
# services/response_cache.py's own CACHE_PAYLOAD_VERSION note).
_HOUSE_PLAN_ENGINE_VERSION = "23"  # bumped: a shared maṇḍala cell now gives every room its own minimum before the surplus is shared out, and an edge cell is only ever cut across the outer wall it owns. Sharing the whole cell in proportion to preferred area starved whichever room wanted least — a puja beside a study got a 1.5 m strip under its own 1.8 m minimum, so the split was refused and the study reported "won't fit" out of a 19.7 m² cell — and cutting an edge cell the wrong way left the inner strip touching no outside wall, so that room could never be given a window. Claiming also prefers a wholly unclaimed cell over one already shared, which stopped a 16 m² corner cell sitting empty while two other cells each took a second room. Previously: (22) bumped: the main door now opens into a reserved entrance hall instead of through whatever sat on the facing wall. The mouth of the corridor run that reaches that wall is widened to fit the door leaf and booked out of the ring cells (engine/vedic/vastu/ring.py's entrance_halls) before any room claims a zone, so no room can be placed in the main door's area; the door is then cut into that hall at the best-sourced entrance pada it actually fits, and reports the pada it really stands in. Previously the door was cut at the sourced pada regardless of what was behind that stretch of wall, which on south- and west-facing plots (where those padas sit mid-wall, i.e. in a maṇḍala room cell rather than on a corridor run) put the front door through a bedroom's, a kitchen's or a toilet's outside wall on every plan. Previously: (21) bumped: room placement is now the maṇḍala ring (engine/vedic/vastu/ring.py) instead of free-form CP-SAT packing — rooms fill the eight peripheral cells of the 3x3 zone grid, so "every room on an outer wall" and "nothing in the Brahmasthāna" hold by construction, and each room's compass zone is a direct assignment rather than a cost the optimiser could trade away. Circulation is a wall-to-wall "#" just outside the central ninth (a plain 3x3 leaves the corner cells touching the centre only at a point, so corner rooms would have no way in), and the entrance opens onto the run that reaches the facing wall instead of carving a foyer out of whichever room sat at the door. Previously: (20) the Brahmasthāna is now the classical central 3x3 padas of the 9x9 Paramasāyika maṇḍala (9/81 = 11.11% of the built area), reserved as a hard no-build region on every storey — nothing is ever placed in it, per the treatises' ban on columns/walls/beams/cooking fires/toilets/drains there. It used to be whichever corridor fragment happened to be biggest, i.e. a thin walkway strip reading as ~5% of the plot. `center_id` now names that block (and is added first, so validate.py's reachability BFS and ensure_reachable's door repair share the same root). Previously: (1) (1) validate.py's missing_door check no longer flags "outdoor"-life rooms (garage/garden/courtyard/balcony) — those are deliberately door-less by design (layout.py's door_onto_open already skips them, building.py only walls an open room's edge against a closed room or the exterior), so every plan with a garage was falsely warning "a room is missing a door" even when nothing was wrong. (2) solver.py now requires every room except EXTERIOR_EXEMPT_KINDS (store, laundry, and the wet kinds — toilet/bathroom/combined) to sit flush against one of the plot's own outer edges, not just the corridor spine — previously a room could land fully interior with no wall segment on the perimeter for building.py to ever put a window in, so most rooms silently got zero windows regardless of plot size.


@router.get("/vastu/zones")
def vastu_zones(
    kind: Literal["dir8", "dir16", "pada32", "inner4"] | None = Query(None, description="Filter to one granularity"),
):
    try:
        zones = vastu_api.list_zones(kind)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"rule_version": db.rule_version(), "count": len(zones), "zones": zones}


@router.get("/vastu/zones/{granularity}/{zone_id}")
def vastu_zone_detail(granularity: Literal["dir8", "dir16", "pada32", "inner4"], zone_id: str):
    zone = vastu_api.get_zone_detail(granularity, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"No such zone: {granularity}:{zone_id}")
    return zone


@router.get("/vastu/rooms")
def vastu_rooms(subject: str | None = Query(None)):
    """Canonical shape: {rule_version, rooms: [{subject, best_zones, avoid_zones}]}."""
    return vastu_api.rooms_summary(subject)


@router.get("/vastu/rooms/{subject}/detail")
def vastu_room_detail(subject: str):
    mappings = vastu_api.list_room_mappings(subject=subject)
    if not mappings:
        raise HTTPException(status_code=404, detail=f"No Vastu data for subject: {subject}")
    return {"subject": subject, "mappings": mappings}


@router.post("/vastu/analyze", response_model=VastuAnalyzeResponse)
def vastu_analyze(body: VastuAnalyzeRequest) -> VastuAnalyzeResponse:
    req = body.requirement
    requirement = HouseRequirement(
        bedrooms=req.bedrooms,
        master_bedroom_index=min(req.master_bedroom_index, req.bedrooms),
        toilets=req.toilets,
        bathrooms=req.bathrooms,
        combined_toilet_bath=req.combined_toilet_bath,
        extras=tuple(req.extras),
        mode=req.mode,
    )
    result = vastu_api.analyze_requirements(
        requirement,
        plot_width=body.site.plot_width,
        plot_depth=body.site.plot_depth,
        unit=body.site.unit,
    )
    return VastuAnalyzeResponse.model_validate(result)


@router.post("/vastu/house-plan", response_model=VastuHousePlanResponse)
def vastu_house_plan_route(body: VastuHousePlanRequest, request: Request):
    # Returns a pre-serialized Response via serve_cached_json (same pattern
    # as other cached routes in this repo) — response_model above documents
    # the shape for OpenAPI but FastAPI does not re-serialize a Response.
    """Deterministic given (site, requirement, rule_version, engine version) —
    same input always produces the same plan, so this is cache-safe."""
    body_json = body.model_dump_json()
    digest = hashlib.sha256(body_json.encode()).hexdigest()[:24]
    cache_key = f"vastu_house_plan_{_HOUSE_PLAN_ENGINE_VERSION}_{db.rule_version()}_{digest}"

    def build() -> dict:
        result = vastu_house_plan.build_house_plan(body.site, body.requirement)
        return json.loads(VastuHousePlanResponse.model_validate(result).model_dump_json())

    return serve_cached_json(request, cache_key, build)
