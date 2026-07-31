"""Phase 1: retrograde (वक्री) has exactly one definition.

``engine.astronomy.motion.is_retrograde`` replaced five inlined ``speed < 0``
tests. These pin the rules it owns, and assert the call sites actually use it
rather than having quietly re-inlined the comparison.

See docs/computation-architecture-audit.md (section A3, phase 1).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from engine.astronomy.motion import (
    NEVER_RETROGRADE,
    RETROGRADE_BY_CONVENTION,
    is_retrograde,
    motion_label,
    motion_label_ne,
)

ROOT = Path(__file__).resolve().parent.parent
DAY = datetime(2026, 7, 31, tzinfo=timezone.utc)


class TestTheRules:
    @pytest.mark.parametrize("graha", sorted(RETROGRADE_BY_CONVENTION))
    @pytest.mark.parametrize("speed", [-0.05, 0.0, +0.05, +1.0])
    def test_nodes_are_retrograde_at_any_speed(self, graha: str, speed: float):
        """The rule a bare sign test gets wrong: Ketu's speed is −Rahu's."""
        assert is_retrograde(graha, speed) is True

    @pytest.mark.parametrize("body", sorted(NEVER_RETROGRADE))
    @pytest.mark.parametrize("speed", [-1.0, 0.0, +1.0])
    def test_sun_moon_lagna_never_retrograde(self, body: str, speed: float):
        assert is_retrograde(body, speed) is False

    @pytest.mark.parametrize(
        "graha", ["mercury", "venus", "mars", "jupiter", "saturn"]
    )
    def test_planets_follow_the_sign_of_speed(self, graha: str):
        assert is_retrograde(graha, -0.001) is True
        assert is_retrograde(graha, +0.001) is False

    def test_zero_speed_is_direct(self):
        """A station is not retrograde until the sign actually turns."""
        assert is_retrograde("mars", 0.0) is False

    def test_labels_track_the_predicate(self):
        assert motion_label("saturn", -0.01) == "Vakri"
        assert motion_label("saturn", +0.01) == "Margi"
        assert motion_label("rahu", +0.05) == "Vakri"
        assert motion_label_ne("saturn", -0.01) == "वक्री"
        assert motion_label_ne("rahu", +0.05) == "वक्री"


class TestThereIsOnlyOneImplementation:
    """Guard against a sixth copy appearing."""

    def test_no_inline_speed_sign_tests_remain(self):
        import re

        pattern = re.compile(r"(speed|spd)\s*<\s*0")
        offenders: list[str] = []
        for pkg in ("engine", "services", "api", "app", "rules"):
            for path in (ROOT / pkg).rglob("*.py"):
                if "__pycache__" in path.parts or path.name == "motion.py":
                    continue
                for lineno, line in enumerate(
                    path.read_text().splitlines(), start=1
                ):
                    code = line.split("#", 1)[0]
                    if pattern.search(code):
                        offenders.append(f"{path.relative_to(ROOT)}:{lineno}")
        assert not offenders, (
            "retrograde is decided inline again — use "
            "engine.astronomy.motion.is_retrograde: " + ", ".join(offenders)
        )


class TestCallSitesAgree:
    """Every surface that reports वक्री must report the same वक्री."""

    def test_gochar_table_matches_planetary_positions(self):
        from engine.astronomy.planets import spashta_table
        from engine.astronomy.ut_instant import as_julian_day
        from engine.vedic.gochar import get_gochar_table

        positions = spashta_table(as_julian_day(DAY))
        table = get_gochar_table(DAY)

        for graha, row in table.items():
            assert row["is_retrograde"] == positions[graha]["is_retrograde"], graha
            assert row["motion"] == ("Vakri" if row["is_retrograde"] else "Margi")

    def test_graha_sthiti_matches_gochar(self):
        from engine.astronomy.location import resolve_location_from_query
        from engine.vedic.gochar import get_gochar_table
        from engine.vedic.graha_detail import build_graha_sthiti

        location = resolve_location_from_query(
            lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu"
        )
        sthiti = build_graha_sthiti(date(2026, 7, 31), location)
        table = get_gochar_table(DAY)

        for row in sthiti["rows"]:
            graha = row["graha"]
            if graha == "lagna":
                assert row["is_retrograde"] is False
                continue
            # Both are sunrise-anchored on the same day, so the node convention
            # and the sign test must land identically.
            assert isinstance(row["is_retrograde"], bool)
            if graha in RETROGRADE_BY_CONVENTION:
                assert row["is_retrograde"] is True
            assert row["is_retrograde"] == table[graha]["is_retrograde"], graha
