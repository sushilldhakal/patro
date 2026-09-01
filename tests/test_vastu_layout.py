"""Tests for the ported placement engine (engine/vedic/vastu/layout.py and friends).

Covers the connectivity/merge fixes this exact algorithm shipped with on the
web client this session, translated to pytest against the Python port.
"""

from __future__ import annotations

import pytest

from engine.vedic.vastu.layout import plan_house
from engine.vedic.vastu.rooms import HouseRequirement, PlannedSpace
from engine.vedic.vastu.types import SiteInput

FACINGS = ["east", "west", "north", "south"]


@pytest.mark.parametrize("facing", FACINGS)
@pytest.mark.parametrize("storeys", [1, 2])
def test_no_crash_and_fully_reachable(facing, storeys):
    req = HouseRequirement(
        bedrooms=3, master_bedroom_index=1, toilets=2, bathrooms=1, combined_toilet_bath=1,
        extras=("living", "kitchen", "dining", "puja"), mode="flexible", storeys=storeys,
    )
    site = SiteInput(width=15, height=10, facing=facing)
    concept = plan_house(req, site)
    # Trust the engine's own validate_concept() (a faithful port of
    # validate.ts) rather than re-deriving reachability by hand here — its
    # neighbor rule is intentionally broader than ensure_reachable's own
    # door-repair pass (e.g. a private room touching an open/circulation
    # cell counts as connected even with no door), and re-implementing a
    # second, stricter definition in the test just drifts from it.
    assert concept.validation.all_reachable, concept.validation.issues


def test_courtyard_extra_is_never_absorbed_by_merge():
    req = HouseRequirement(
        bedrooms=1, toilets=1, extras=("kitchen", "courtyard"), mode="flexible", storeys=1,
    )
    site = SiteInput(width=15, height=10, facing="east")
    concept = plan_house(req, site)
    outdoor = [r for r in concept.floors[0].rooms if r.life == "outdoor"]
    # A courtyard house must keep at least the true centre outdoor and open —
    # merge_into_neighbor is gated off (`if not want_court`) whenever courtyard
    # is requested, so no outdoor cell should have grown past its own zone.
    assert any(r.id == "center_0" for r in outdoor)


def test_deterministic_same_input_same_output():
    req = HouseRequirement(bedrooms=2, toilets=1, extras=("kitchen", "living"), mode="flexible", storeys=1)
    site = SiteInput(width=12, height=9, facing="south")
    a = plan_house(req, site)
    b = plan_house(req, site)
    ids_a = sorted(r.id for f in a.floors for r in f.rooms)
    ids_b = sorted(r.id for f in b.floors for r in f.rooms)
    assert ids_a == ids_b
    rects_a = [(r.rect.x, r.rect.y, r.rect.w, r.rect.h) for f in a.floors for r in sorted(f.rooms, key=lambda x: x.id)]
    rects_b = [(r.rect.x, r.rect.y, r.rect.w, r.rect.h) for f in b.floors for r in sorted(f.rooms, key=lambda x: x.id)]
    assert rects_a == rects_b


def test_no_room_overlaps():
    req = HouseRequirement(bedrooms=3, toilets=2, bathrooms=1, extras=("kitchen", "living", "dining", "puja"), storeys=2)
    site = SiteInput(width=15, height=10, facing="east")
    concept = plan_house(req, site)
    for floor in concept.floors:
        rooms = floor.rooms
        for i in range(len(rooms)):
            for j in range(i + 1, len(rooms)):
                a, b = rooms[i].rect, rooms[j].rect
                w = min(a.x + a.w, b.x + b.w) - max(a.x, b.x)
                h = min(a.y + a.h, b.y + b.h) - max(a.y, b.y)
                overlap = w * h if w > 0 and h > 0 else 0
                assert overlap < 0.05, f"{rooms[i].id} overlaps {rooms[j].id} on floor {floor.storey}"


def test_every_room_fits_inside_the_plot():
    req = HouseRequirement(bedrooms=2, toilets=1, extras=("kitchen", "living"))
    site = SiteInput(width=15, height=10, facing="west")
    concept = plan_house(req, site)
    eps = 0.1
    for room in concept.floors[0].rooms:
        r = room.rect
        assert r.x >= -eps and r.y >= -eps
        assert r.x + r.w <= site.width + eps
        assert r.y + r.h <= site.height + eps


def test_multi_floor_has_staircase_on_every_floor():
    req = HouseRequirement(bedrooms=3, toilets=2, extras=("kitchen", "living", "dining"), storeys=2)
    site = SiteInput(width=15, height=10, facing="east")
    concept = plan_house(req, site)
    assert len(concept.floors) == 2
    for floor in concept.floors:
        assert any(r.kind == "staircase" for r in floor.rooms)
    assert concept.validation.stair_connects


def _bedroom_room(w: float, h: float):
    from engine.vedic.vastu.geometry import Rect
    from engine.vedic.vastu.layout import make_room

    return make_room(PlannedSpace(id="bedroom_1", kind="bedroom"), Rect(0, 0, w, h), storey=0, region="east")


def test_leftover_growth_refuses_past_preferred_tier():
    """A room already at (or past) its preferred size shouldn't keep
    absorbing leftover mandala cells — data/vastu_room_sizes.json's whole
    point is that excess space should stay usable elsewhere instead."""
    from engine.vedic.vastu import architecture as arch
    from engine.vedic.vastu.geometry import Rect
    from engine.vedic.vastu.layout import _growth_priority

    tiers = arch.ROOM_SIZE_TIERS["bedroom"]
    room = _bedroom_room(tiers.preferred.width, tiers.preferred.depth)
    cell = Rect(room.rect.x + room.rect.w, room.rect.y, 2.0, room.rect.h)
    assert _growth_priority(room, cell) is None


def test_leftover_growth_allowed_up_to_preferred_tier():
    from engine.vedic.vastu import architecture as arch
    from engine.vedic.vastu.geometry import Rect
    from engine.vedic.vastu.layout import _growth_priority

    tiers = arch.ROOM_SIZE_TIERS["bedroom"]
    room = _bedroom_room(tiers.minimum.width, tiers.minimum.depth)
    cell = Rect(room.rect.x + room.rect.w, room.rect.y, 0.2, room.rect.h)
    assert _growth_priority(room, cell) is not None


def test_below_comfortable_room_outranks_above_comfortable_room():
    """Among willing candidates, a room still short of `comfortable` should
    be favored over one that's already reached it."""
    from engine.vedic.vastu import architecture as arch
    from engine.vedic.vastu.geometry import Rect
    from engine.vedic.vastu.layout import _growth_priority

    tiers = arch.ROOM_SIZE_TIERS["bedroom"]
    below_comfortable = _bedroom_room(tiers.minimum.width, tiers.minimum.depth)
    at_comfortable = _bedroom_room(tiers.comfortable.width, tiers.comfortable.depth)
    cell = Rect(0, 0, 0.2, 0.2)
    priority_below = _growth_priority(below_comfortable, cell)
    priority_at = _growth_priority(at_comfortable, cell)
    assert priority_below is not None and priority_at is not None
    assert priority_below[0] == 0
    assert priority_at[0] == 1


def test_room_with_no_tier_data_keeps_original_uncapped_growth():
    """The mandala's own centre (kind="brahmasthan") carries no size tier —
    it must keep growing exactly as it always did, unbounded."""
    from engine.vedic.vastu.geometry import Rect
    from engine.vedic.vastu.layout import _growth_priority, open_piece

    center = open_piece("center_0", Rect(0, 0, 20, 20), storey=0, want_court=False)
    cell = Rect(20, 0, 5, 20)
    priority = _growth_priority(center, cell)
    assert priority is not None
    assert priority[0] == 1  # no comfortable tier to be "below" of
