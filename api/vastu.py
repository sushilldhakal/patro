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
_HOUSE_PLAN_ENGINE_VERSION = "5"  # bumped: usable_cell no longer silently drops a corner-notch's collateral leftover (real, unaccounted, doubly-walled gaps)


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
