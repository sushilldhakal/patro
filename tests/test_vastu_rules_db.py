"""Tests for the Vastu zone-uses / room-index seeding and lookups (services/vastu_rules_db.py)."""

from __future__ import annotations

from services import vastu_rules_db as db


def test_seed_is_idempotent():
    db.ensure_seeded()
    version_before = db.rule_version()
    db.ensure_seeded()  # second call must be a cheap no-op, not a re-seed
    assert db.rule_version() == version_before


def test_both_tables_populated():
    zones = db.get_all_zones()
    assert len(zones) == 60  # 8 dir8 + 16 dir16 + 32 pada32 + 4 inner4
    subjects = db.all_subjects()
    assert "kitchen" in subjects
    assert "master_bedroom" in subjects
    assert "puja" in subjects


def test_get_zone_known_value():
    z = db.get_zone("pada32", "gandharva")
    assert z is not None
    assert z["verificationStatus"] == "user_verified"
    assert "mayamata" in z["sources"]
    assert "मनोरञ्जन कक्ष" in z["best"]["ne"]
    assert "बेडरुम" in z["best"]["ne"]


def test_get_zone_unknown_returns_none():
    assert db.get_zone("pada32", "not-a-real-pada") is None


def test_get_by_subject_kitchen_matches_classical_placement():
    mappings = db.get_by_subject("kitchen")
    best_zones = {m["zone"] for m in mappings if m["polarity"] == "best"}
    avoid_zones = {m["zone"] for m in mappings if m["polarity"] == "avoid"}
    # Kitchen (fire) belongs in the southeast; the northeast (most sacred,
    # water-element corner) is the classic zone to keep it out of.
    assert "dir8:southeast" in best_zones
    assert "dir8:northeast" in avoid_zones


def test_get_by_zone_returns_all_subjects_mapped_there():
    mappings = db.get_by_zone("pada32", "gandharva")
    subjects = {m["subject"] for m in mappings}
    assert "living" in subjects  # "living room" is one of gandharva's best mentions
    assert "safe_locker" in subjects  # "the main safe" is one of its avoid mentions


def test_get_by_zone_unknown_returns_empty_list():
    assert db.get_by_zone("pada32", "not-a-real-pada") == []


def test_previously_gapped_subjects_now_have_data():
    """family/servant/library/combined had zero vastu_room_index coverage
    before this data pull — they came from a separate vastu.plan.why.*
    source (see scripts/extract-vastu-content.mjs), not the zone wheel."""
    for subject, best, avoid in [
        ("family", {"dir8:north", "dir8:west"}, {"dir8:southeast"}),
        ("servant", {"dir8:northwest", "dir8:west"}, {"dir8:northeast"}),
        ("library", {"dir8:north", "dir8:northeast", "dir8:west"}, {"dir8:southeast"}),
        ("combined", set(), {"dir8:northeast"}),
    ]:
        mappings = db.get_by_subject(subject)
        assert mappings, f"{subject} should have room-index mappings"
        got_best = {m["zone"] for m in mappings if m["polarity"] == "best"}
        got_avoid = {m["zone"] for m in mappings if m["polarity"] == "avoid"}
        assert got_best == best, f"{subject} best zones"
        assert got_avoid == avoid, f"{subject} avoid zones"


def test_kitchen_dining_still_has_no_invented_rule():
    # It's a hybrid of kitchen+dining, not its own classical placement
    # subject — no data is the correct answer, not a guess.
    assert db.get_by_subject("kitchen_dining") == []
