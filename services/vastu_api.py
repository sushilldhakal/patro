"""HTTP-shaped builders bridging the Vastu engine/rule-db to api/vastu.py.

No geometry, no room placement — Phase 1 only reports which zones a room
subject is best/avoid in and does light requirement sanity-checking. See
``engine/vedic/vastu/`` for the pure calculation layer and
``services/vastu_rules_db.py`` for the reference-data lookups this reads.
"""

from __future__ import annotations

from typing import Any

from engine.vedic.vastu import spatial
from engine.vedic.vastu.rooms import HouseRequirement
from services import vastu_rules_db as db

MIN_PLOT_AREA_SQFT = 400.0  # a very rough sanity floor, not a Vastu rule


def list_zones(kind: str | None = None) -> list[dict[str, Any]]:
    if kind and kind not in spatial.GRANULARITIES:
        raise ValueError(f"Unknown zone kind: {kind!r}. Expected one of {spatial.GRANULARITIES}.")
    return db.get_all_zones(granularity=kind)


def get_zone_detail(granularity: str, zone_id: str) -> dict[str, Any] | None:
    if granularity not in spatial.GRANULARITIES:
        return None
    return db.get_zone(granularity, zone_id)


def list_room_mappings(subject: str | None = None, zone: str | None = None) -> list[dict[str, Any]]:
    if subject:
        return db.get_by_subject(subject)
    if zone:
        granularity, _, zone_id = zone.partition(":")
        return db.get_by_zone(granularity, zone_id)
    # Neither filter given: everything.
    return [m for s in db.all_subjects() for m in db.get_by_subject(s)]


def _room_zones(subject: str) -> dict[str, Any]:
    mappings = db.get_by_subject(subject)
    best = list(dict.fromkeys(m["zone"] for m in mappings if m["polarity"] == "best"))
    avoid = list(dict.fromkeys(m["zone"] for m in mappings if m["polarity"] == "avoid"))
    return {"subject": subject, "best_zones": best, "avoid_zones": avoid}


def rooms_summary(subject: str | None = None) -> dict[str, Any]:
    subjects = [subject] if subject else db.all_subjects()
    return {
        "rule_version": db.rule_version(),
        "rooms": [_room_zones(s) for s in subjects],
    }


def analyze_requirements(requirement: HouseRequirement, plot_width: float, plot_depth: float, unit: str) -> dict[str, Any]:
    """Requirement sanity-check + best/avoid zones per requested room subject.

    No placement: this does not decide *where* a room goes, only which zones
    are, per the extracted rule data, best or worth avoiding for it.
    """
    issues: list[dict[str, str]] = []

    area = plot_width * plot_depth
    area_sqft = area if unit == "ft" else area * 10.7639
    if area_sqft < MIN_PLOT_AREA_SQFT:
        issues.append(
            {
                "severity": "warn",
                "message": (
                    f"Plot area (~{area_sqft:.0f} sqft) is small for "
                    f"{requirement.bedrooms} bedroom(s) plus the requested extras — "
                    "expect a tight fit once a later phase actually places rooms."
                ),
            }
        )

    subjects = requirement.room_subjects()
    unique_subjects = list(dict.fromkeys(subjects))
    known_subjects = set(db.all_subjects())
    for s in unique_subjects:
        if s not in known_subjects:
            issues.append(
                {
                    "severity": "info",
                    "message": f"No Vastu zone-use data available for '{s}' yet — reporting empty best/avoid zones, not a guess.",
                }
            )

    return {
        "rule_version": db.rule_version(),
        "rooms": [_room_zones(s) for s in unique_subjects],
        "issues": issues,
    }
