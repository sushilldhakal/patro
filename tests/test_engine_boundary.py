"""Layer boundaries: astronomy | calendar math | cultural rules.

Guards the audit conclusions in docs/engine-boundary-audit.md so they stay true.
The swisseph containment guard lives in tests/test_timescale_contract.py.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# No trailing \b: identifiers embed these as substrings (``festival_rule``,
# ``is_vrata_day``), and ``_`` is a word character, so a trailing boundary would
# make the whole guard vacuous — verified by mutation.
_CULTURAL = re.compile(
    r"(festival|vrata|smarta|vaishnav|sampradaya|tradition_mode)", re.I
)


class TestNoCulturalRulesInAstronomy:
    def test_astronomy_layer_holds_no_cultural_logic(self):
        """Span constants and name tables are calendar *mathematics* — a tithi is
        12 degrees of elongation in every tradition. Which tithi a community
        observes for a festival is cultural, and belongs in engine/vedic or
        rules/."""
        offenders: list[str] = []
        for path in (ROOT / "engine" / "astronomy").rglob("*.py"):
            if "__pycache__" in path.parts:
                continue
            # Parse rather than grep: prose *about* the boundary is legitimate and
            # common (provenance.py's docstring names festivals precisely to say
            # they are excluded from the hash). Only identifiers and string
            # *values* used by code can constitute a leak.
            tree = ast.parse(path.read_text())
            for node in ast.walk(tree):
                if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant):
                    continue  # bare docstring/comment expression
                name = None
                if isinstance(node, ast.Name):
                    name = node.id
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    name = node.name
                elif isinstance(node, ast.Attribute):
                    name = node.attr
                if name and _CULTURAL.search(name):
                    offenders.append(f"{path.relative_to(ROOT)}:{node.lineno} ({name})")
        assert not offenders, (
            "cultural rule leaked into the astronomy layer: " + ", ".join(offenders)
        )


class TestDuplicateAstronomyIsContained:
    def test_no_hand_rolled_solar_longitude_remains(self):
        """The engine must have exactly ONE solar-longitude implementation.

        tropical_seasons used to carry a Meeus ch.25 series that bypassed the
        ephemeris. It was migrated (docs/engine-boundary-audit.md §4), so the
        expected count is now zero. This fails if anyone reintroduces one —
        which matters because the duplicate disagreed by 8.4 minutes of
        season-boundary timing and was CE-only."""
        found: list[str] = []
        for pkg in ("engine", "services"):
            for path in (ROOT / pkg).rglob("*.py"):
                if "__pycache__" in path.parts:
                    continue
                text = path.read_text()
                # Meeus' mean-longitude and mean-anomaly coefficients.
                if "280.46646" in text or "357.52911" in text:
                    found.append(str(path.relative_to(ROOT)))
        assert found == [], (
            "a hand-rolled solar-longitude series reappeared: "
            f"{found}. Use engine.astronomy.engine.default_engine.sun_longitude — "
            "Swiss Ephemeris is the astronomical authority. See "
            "docs/engine-boundary-audit.md section 4."
        )

    def test_tropical_seasons_now_uses_the_ephemeris(self):
        """Post-migration: the two must agree exactly, not approximately."""
        from datetime import datetime, timezone

        from engine.astronomy.engine import default_engine
        from engine.astronomy.jd_calendar import CivilDay
        from engine.vedic.tropical_seasons import solar_apparent_longitude

        from engine.vedic.tropical_seasons import _julian_day

        for year in (1950, 2000, 2026, 2050, 2100):
            when = datetime(year, 3, 20, 12, 0, tzinfo=timezone.utc)
            got = solar_apparent_longitude(when)
            want = default_engine.sun_longitude(_julian_day(when), sidereal=False)
            assert got == want, f"{year}: {got} != {want}"
