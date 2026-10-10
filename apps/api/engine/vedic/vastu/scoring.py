"""Score a built HouseConcept — section 21 of the spec.

Weights below are explicit, named, application-level constants — NOT
classical claims (user's own instruction 10). They just turn the plan's
already-tracked facts (which rooms landed in a relaxed zone, whether the
plan validates) into a single number a UI can show, with the underlying
facts still available for "why" explanations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .types import HouseConcept

# Application-level weights, not classical rules.
_VASTU_WEIGHT = 0.5
_PLANNING_WEIGHT = 0.3
_CIRCULATION_WEIGHT = 0.2


@dataclass(frozen=True)
class Score:
    score: float
    vastu_score: float
    planning_score: float
    circulation_score: float
    satisfied_rules: list[str] = field(default_factory=list)
    relaxed_rules: list[str] = field(default_factory=list)
    conflicts: list[str] = field(default_factory=list)


def score_concept(concept: HouseConcept) -> Score:
    all_rooms = [r for f in concept.floors for r in f.rooms if r.life not in ("circulation", "outdoor", "vertical")]
    relaxed_ids = {rc.id.removeprefix("relax-") for rc in concept.vastu_relaxed if rc.id.startswith("relax-")}

    satisfied = [r.id for r in all_rooms if r.id not in relaxed_ids]
    relaxed = [r.id for r in all_rooms if r.id in relaxed_ids]
    vastu_score = 100.0 * len(satisfied) / len(all_rooms) if all_rooms else 100.0

    v = concept.validation
    planning_checks = [v.every_room_has_door, v.stair_connects, not v.private_through_private, v.kitchen_near_dining]
    planning_score = 100.0 * sum(planning_checks) / len(planning_checks)

    circulation_score = 100.0 if v.all_reachable else max(0.0, 100.0 - 20.0 * len([i for i in v.issues if i.id.startswith("iso-")]))

    overall = _VASTU_WEIGHT * vastu_score + _PLANNING_WEIGHT * planning_score + _CIRCULATION_WEIGHT * circulation_score

    conflicts = [i.message_key for i in v.issues]
    if concept.leftover:
        conflicts.append(f"{len(concept.leftover)} requested space(s) could not be placed on this plot.")

    return Score(
        score=round(overall, 1),
        vastu_score=round(vastu_score, 1),
        planning_score=round(planning_score, 1),
        circulation_score=round(circulation_score, 1),
        satisfied_rules=satisfied,
        relaxed_rules=relaxed,
        conflicts=conflicts,
    )
