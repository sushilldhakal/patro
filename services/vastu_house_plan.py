"""Builder for POST /vastu/house-plan — wires the request into
``engine.vedic.vastu.layout.plan_house()`` and formats the result.

The engine works in metres throughout (matches its IDEAL_SIZE table and the
web client it was ported from) — a `ft` plot is converted on the way in;
output geometry (room rects, wall/door/window coordinates) is always metres,
noted explicitly in the response rather than silently switching units.
"""

from __future__ import annotations

from typing import Any

FT_TO_M = 0.3048


def _to_meters(value: float, unit: str) -> float:
    return value * FT_TO_M if unit == "ft" else value


def _room_out(room) -> dict[str, Any]:
    return {
        "id": room.id,
        "kind": room.kind,
        "floor": room.floor,
        "x": room.rect.x, "y": room.rect.y, "w": room.rect.w, "h": room.rect.h,
        "life": room.life,
        "vastu_region": room.vastu_region,
        "index": room.index,
        "doors": [
            {
                "id": d.id, "room_id": d.room_id, "wall": d.wall, "t": d.t,
                "width": d.width, "swing": d.swing, "connects_to": d.connects_to,
            }
            for d in room.doors
        ],
        "windows": [
            {"id": w.id, "room_id": w.room_id, "wall": w.wall, "t": w.t, "width": w.width, "type": w.type}
            for w in room.windows
        ],
        "adjacent_to": list(room.adjacent_to),
    }


def _layer_out(layer) -> dict[str, Any]:
    return {
        "vertices": [{"id": v.id, "x": v.x, "y": v.y} for v in layer.vertices],
        "walls": [{"id": w.id, "a": w.a, "b": w.b, "thickness": w.thickness, "role": w.role} for w in layer.walls],
        "holes": [
            {
                "id": h.id, "wall_id": h.wall_id, "offset": h.offset, "width": h.width,
                "type": h.type, "swing": h.swing, "from": h.from_, "to": h.to,
                "height": h.height, "sill": h.sill,
            }
            for h in layer.holes
        ],
    }


def build_house_plan(site_input, requirement_input) -> dict[str, Any]:
    from engine.vedic.vastu.layout import plan_house
    from engine.vedic.vastu.rooms import HouseRequirement
    from engine.vedic.vastu.scoring import score_concept
    from engine.vedic.vastu.types import SiteInput
    from services import vastu_rules_db as db

    unit = site_input.unit
    site = SiteInput(
        width=_to_meters(site_input.plot_width, unit),
        height=_to_meters(site_input.plot_depth, unit),
        facing=site_input.facing,
    )
    req = HouseRequirement(
        bedrooms=requirement_input.bedrooms,
        master_bedroom_index=min(requirement_input.master_bedroom_index, requirement_input.bedrooms),
        toilets=requirement_input.toilets,
        bathrooms=requirement_input.bathrooms,
        combined_toilet_bath=requirement_input.combined_toilet_bath,
        extras=tuple(requirement_input.extras),
        mode=requirement_input.mode,
        storeys=requirement_input.storeys,
        floors=dict(requirement_input.floors),
    )

    concept = plan_house(req, site)
    score = score_concept(concept)

    stair_out = None
    if concept.stair:
        s = concept.stair
        stair_out = {
            "id": s.id, "x": s.rect.x, "y": s.rect.y, "w": s.rect.w, "h": s.rect.h,
            "rise": s.rise, "floors": list(s.floors), "host_id": s.host_id,
        }

    return {
        "rule_version": db.rule_version(),
        "plot": site_input,
        "width": concept.width,
        "height": concept.height,
        "facing": concept.facing,
        "mode": concept.mode,
        "floors": [
            {"storey": f.storey, "rooms": [_room_out(r) for r in f.rooms], "layer": _layer_out(f.layer)}
            for f in concept.floors
        ],
        "stair": stair_out,
        "leftover": [{"id": s.id, "kind": s.kind, "index": s.index} for s in concept.leftover],
        "vastu_relaxed": [
            {"id": c.id, "severity": c.severity, "message_key": c.message_key} for c in concept.vastu_relaxed
        ],
        "validation": {
            "all_reachable": concept.validation.all_reachable,
            "every_room_has_door": concept.validation.every_room_has_door,
            "stair_connects": concept.validation.stair_connects,
            "kitchen_near_dining": concept.validation.kitchen_near_dining,
            "private_through_private": concept.validation.private_through_private,
            "issues": [{"id": i.id, "severity": i.severity, "message_key": i.message_key} for i in concept.validation.issues],
        },
        "score": {
            "score": score.score, "vastu_score": score.vastu_score,
            "planning_score": score.planning_score, "circulation_score": score.circulation_score,
            "satisfied_rules": score.satisfied_rules, "relaxed_rules": score.relaxed_rules,
            "conflicts": score.conflicts,
        },
    }
