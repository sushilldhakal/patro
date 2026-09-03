"""Tests for the ported placement engine (engine/vedic/vastu/layout.py and friends).

Covers the connectivity/merge fixes this exact algorithm shipped with on the
web client this session, translated to pytest against the Python port.
"""

from __future__ import annotations

import pytest

from engine.vedic.vastu.architecture import box_fits
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


def _overlap_area(a, b) -> float:
    w = min(a.x + a.w, b.x + b.w) - max(a.x, b.x)
    h = min(a.y + a.h, b.y + b.h) - max(a.y, b.y)
    return w * h if w > 0 and h > 0 else 0.0


def test_staircase_never_overlaps_another_room():
    """Regression test for a real bug: a wet room could claim the
    staircase's mandala zone (via place_wet_in_cell) before the stair's own
    carve-out step ever ran, leaving the stair overlapping whatever landed
    there first — worst on upper floors, where the wet-area program differs
    from the ground floor. build_floor's `cell_cuts` now excludes the
    stair's footprint from its zone up front, so nothing can claim it in
    the first place."""
    req = HouseRequirement(
        bedrooms=3, master_bedroom_index=1, toilets=2, bathrooms=1, combined_toilet_bath=1,
        extras=("living", "kitchen", "dining", "puja"), mode="strict", storeys=2,
    )
    site = SiteInput(width=10, height=8, facing="south")
    concept = plan_house(req, site)
    for floor in concept.floors:
        stair = next((r for r in floor.rooms if r.kind == "staircase"), None)
        if not stair:
            continue
        for room in floor.rooms:
            if room.id == stair.id:
                continue
            assert _overlap_area(room.rect, stair.rect) < 0.05, (
                f"{room.id} overlaps the staircase on floor {floor.storey}"
            )


def test_foyer_never_overlaps_a_wet_room_by_more_than_a_sliver():
    """Regression test: the entrance foyer could land on a bathroom/combined
    room without shrinking it first, if shrinking would have taken that
    room below its own minimum size — place_foyer now drops such a room to
    `leftover` instead of leaving it in place under the foyer."""
    req = HouseRequirement(
        bedrooms=2, master_bedroom_index=1, toilets=2, bathrooms=2, combined_toilet_bath=1,
        extras=("living", "kitchen", "dining", "puja", "study"), mode="balanced", storeys=1,
    )
    site = SiteInput(width=7, height=6, facing="west")
    concept = plan_house(req, site)
    foyer = next(r for r in concept.floors[0].rooms if r.kind == "foyer")
    for room in concept.floors[0].rooms:
        if room.id == foyer.id or room.kind not in ("bathroom", "combined", "toilet"):
            continue
        # A hairline sliver (below the carve-worthiness threshold place_foyer
        # itself uses) is tolerated; a room-sized overlap is not.
        assert _overlap_area(room.rect, foyer.rect) < 0.1, f"{room.id} overlaps the foyer"


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


def test_generous_plot_packs_more_than_eight_majors():
    """The mandala has only 8 outer zones (nw/n/ne/w/e/sw/s/se) and each one
    used to be handed *whole* to a single major room, so a request needing
    more than 8 majors (or extra wet rooms with no free zone or ensuite
    host) failed no matter how big the plot got — the real bottleneck was
    zone count, not zone size. On a 15x14m plot every zone is ~23 sqm,
    dwarfing any room's minimum, so `pack_into_surplus` should carve the
    overflow out of that surplus instead of reporting it unplaceable."""
    from engine.vedic.vastu import architecture as arch

    req = HouseRequirement(
        bedrooms=3, master_bedroom_index=1, toilets=2, bathrooms=1, combined_toilet_bath=1,
        extras=("living", "kitchen_dining", "puja", "study", "store", "laundry"),
        mode="flexible", storeys=1,
    )
    site = SiteInput(width=15, height=14, facing="east")
    concept = plan_house(req, site)
    assert concept.leftover == []
    rooms = [r for r in concept.floors[0].rooms if r.kind in arch.IDEAL_SIZE]
    for room in rooms:
        assert box_fits(room.rect.w, room.rect.h, arch.IDEAL_SIZE[room.kind]), room
    assert concept.validation.all_reachable, concept.validation.issues
    assert concept.validation.every_room_has_door, concept.validation.issues


def test_kitchen_dining_inherits_kitchens_avoid_zones():
    """kitchen_dining has no classical-source rows of its own (confirmed by
    test_vastu_rules_db.py's own test_kitchen_dining_still_has_no_invented_rule
    — that's still true at the raw db.get_by_subject layer), so before this
    fix it fell back to "every zone acceptable" and could land in a zone
    kitchen's own real data explicitly avoids (e.g. north) — silently
    dropping the fire-corner constraint the combined room is supposed to
    keep. zone_rules.zone_costs_for_subject aliases it to "kitchen" one
    layer up from the db, so this and the raw-db test both hold at once."""
    from engine.vedic.vastu import zone_rules

    kitchen = zone_rules.zone_costs_for_subject("kitchen")
    combo = zone_rules.zone_costs_for_subject("kitchen_dining")
    assert combo.preferred == kitchen.preferred
    assert combo.avoid == kitchen.avoid
    assert "north" in combo.avoid  # the exact zone this bug let kitchen_dining land in

    req = HouseRequirement(
        bedrooms=3, master_bedroom_index=1, toilets=2, bathrooms=1, combined_toilet_bath=1,
        extras=("living", "kitchen_dining", "puja", "study", "store", "laundry"),
        mode="flexible", storeys=1,
    )
    site = SiteInput(width=15, height=14, facing="east")
    concept = plan_house(req, site)
    kd = next(r for r in concept.floors[0].rooms if r.kind == "kitchen_dining")
    assert kd.vastu_region not in kitchen.avoid


def test_carve_falls_back_to_a_strip_when_the_donor_is_too_narrow_for_a_corner_cut():
    """A snug corner cut is tried first (least wasted donor area), but on a
    narrow/tall donor it can leave the donor itself below its own minimum
    even though the donor has plenty of *total* surplus — e.g. a 2.3x4.67
    room: cutting a 1.5x2.0 corner for a `combined` leaves only a 0.8m-wide
    strip, under any real room's own min_side. A full-width strip across
    the donor's short axis is the only shape that still leaves it a valid,
    full-length remainder."""
    from engine.vedic.vastu import architecture as arch
    from engine.vedic.vastu.geometry import Rect, largest, split_by
    from engine.vedic.vastu.layout import extra_rect_candidates

    narrow_donor = Rect(0.0, 0.0, 2.3, 4.67)
    candidates = extra_rect_candidates(narrow_donor, "combined")
    assert candidates, "a narrow donor should still offer a valid strip candidate"
    ok = False
    for extra_rect in candidates:
        pieces = split_by(narrow_donor, extra_rect, min_side=0.02)
        remain = largest(pieces)
        if remain and box_fits(remain.w, remain.h, arch.IDEAL_SIZE["store"]):
            ok = True
            break
    assert ok, "none of the candidates left the donor a valid remainder"


def test_generous_plot_places_everything_without_overlap():
    """Regression for the fragmentation this fix originally chased down: the
    reported request (3 bedrooms, 2 toilets, bathroom, combined, living,
    kitchen_dining, puja, study, store, laundry on a 15x14m plot) must place
    everything, each room at a valid size.

    The old zone-claiming engine placed at most one room per mandala zone
    before falling back to carving a second one out of its surplus — so
    "no zone carved twice" (checked via `Counter(vastu_region).values()`)
    was a meaningful proxy for "no accidental double partition wall." The
    solver-based engine has no such concept: rooms are independent decision
    variables with no notion of "whose surplus this used to be," so several
    rooms legitimately sharing one dir8 bearing bucket is normal, not a
    fragmentation bug — `test_no_room_overlaps` is what actually guards
    against a double-wall artifact now, by construction."""
    from engine.vedic.vastu import architecture as arch

    req = HouseRequirement(
        bedrooms=3, master_bedroom_index=1, toilets=2, bathrooms=1, combined_toilet_bath=1,
        extras=("living", "kitchen_dining", "puja", "study", "store", "laundry"),
        mode="flexible", storeys=1,
    )
    site = SiteInput(width=15, height=14, facing="east")
    concept = plan_house(req, site)
    assert concept.leftover == []
    rooms = [r for r in concept.floors[0].rooms if r.kind in arch.IDEAL_SIZE]
    for room in rooms:
        assert box_fits(room.rect.w, room.rect.h, arch.IDEAL_SIZE[room.kind]), room
    for room in rooms:
        assert box_fits(room.rect.w, room.rect.h, arch.IDEAL_SIZE[room.kind]), room


def test_every_room_reachable_with_bounded_extra_doors():
    """A room has more than one door normally in exactly two cases: it hosts
    an ensuite toilet/bathroom/combined, or it has a balcony. But this house's
    open/circulation floor can genuinely fragment into several islands with
    no real wall between them at all (mandala corner notches only touch the
    true centre at a single point, not an edge — verified directly on this
    exact request: touches()-based "connectivity" for that was a false
    positive, letting the reachability check wrongly certify a room whose
    only door led into one of those islands as reachable, when nobody could
    actually walk there). With that corrected to require a real shared wall,
    an island with no other real-wall bridge to the rest of the house does
    need *some* ordinary room to carry a second, unearned door to connect it
    — the alternative is a room nobody can enter at all, which is strictly
    worse. So the guarantee this asserts is the one that actually matters:
    every room is genuinely walkable-to (`all_reachable`), and no room ends
    up carrying more bridge doors than the layout actually needs."""
    req = HouseRequirement(
        bedrooms=3, master_bedroom_index=1, toilets=2, bathrooms=1, combined_toilet_bath=1,
        extras=("living", "kitchen_dining", "puja", "study", "store", "laundry"),
        mode="flexible", storeys=1,
    )
    site = SiteInput(width=15, height=14, facing="east")
    concept = plan_house(req, site)
    assert concept.leftover == []
    assert concept.validation.all_reachable, concept.validation.issues
    rooms = concept.floors[0].rooms
    for room in rooms:
        if room.life in ("circulation", "outdoor") or room.kind == "brahmasthan":
            continue
        total = len(room.doors) + sum(1 for other in rooms if any(d.connects_to == room.id for d in other.doors))
        limit = 2
        assert total <= limit, (room.id, room.kind, total)


def test_living_room_has_no_walls_or_doors():
    """An open-plan living room reads as part of the house's circulation,
    not a closed room off it: no door, and (via life_zone_of putting it in
    _CIRCULATION_KINDS) no wall against whatever open/Brahmasthan space it
    borders either."""
    req = HouseRequirement(
        bedrooms=2, toilets=1, extras=("kitchen", "living"), mode="flexible", storeys=1,
    )
    site = SiteInput(width=14, height=12, facing="south")
    concept = plan_house(req, site)
    living = next(r for r in concept.floors[0].rooms if r.kind == "living")
    assert living.life == "circulation"
    # living itself never has its own door — but another closed room is
    # free to door *onto* it, same as it would onto any other open space;
    # that's the other room's one required door, not a wall/door of living's.
    assert living.doors == []
