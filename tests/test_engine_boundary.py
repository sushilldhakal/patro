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
    def test_only_one_known_second_solar_longitude(self):
        """tropical_seasons implements Meeus ch.25 independently of the
        ephemeris — a known, documented duplicate pending the decision in
        docs/engine-boundary-audit.md §4. This test fails if a *second* such
        implementation appears, or if that one is removed (update the audit)."""
        found: list[str] = []
        for pkg in ("engine", "services"):
            for path in (ROOT / pkg).rglob("*.py"):
                if "__pycache__" in path.parts:
                    continue
                text = path.read_text()
                # Meeus' mean-longitude and mean-anomaly coefficients.
                if "280.46646" in text or "357.52911" in text:
                    found.append(str(path.relative_to(ROOT)))
        assert found == ["engine/vedic/tropical_seasons.py"], (
            "the set of hand-rolled solar-longitude implementations changed: "
            f"{found}. One is known and documented; a second is a duplication "
            "risk. See docs/engine-boundary-audit.md section 3."
        )

    def test_that_duplicate_still_agrees_with_the_ephemeris(self):
        """While it exists, it must not drift. 0.0057 degrees is ~8 s of equinox
        timing; anything much larger means the series has gone stale relative to
        the ephemeris and the migration becomes urgent."""
        from datetime import datetime, timezone

        from engine.astronomy.engine import default_engine
        from engine.astronomy.jd_calendar import CivilDay
        from engine.vedic.tropical_seasons import solar_apparent_longitude

        worst = 0.0
        for year in (1950, 2000, 2026, 2050, 2100):
            meeus = solar_apparent_longitude(
                datetime(year, 3, 20, 12, 0, tzinfo=timezone.utc)
            )
            swiss = default_engine.sun_longitude(
                CivilDay(year, 3, 20).to_jd_ut() + 0.5, sidereal=False
            )
            worst = max(worst, abs(((meeus - swiss + 540) % 360) - 180))
        assert worst < 0.02, f"Meeus series drifted {worst:.5f} deg from the ephemeris"
