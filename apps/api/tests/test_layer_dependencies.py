"""Dependency direction: the engine is the domain, and depends on nothing outward.

See docs/DDD-PLAN.md §2 (repository root). ``engine/`` holds the calculations;
``services/`` (use cases, caches, stores), ``app/`` and ``api/`` (HTTP) and
``database/`` (ORM) are built on top of it. An import the other way round makes
the calculation depend on a cache, a database or a request — which is how a
cache-aside ended up inside ``get_daily_panchanga`` and a city lookup inside
``ObserverLocation`` resolution.

``_ALLOWED`` lists the outward imports that predate this guard, so the test
passes while they are migrated out. Entries may only be removed: an outward
import not on the list fails.
"""

from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Our own outer layers, plus the web / persistence libraries they wrap.
_OUTER = frozenset({
    "services",
    "app",
    "api",
    "database",
    "fastapi",
    "starlette",
    "pydantic",
    "sqlalchemy",
    "redis",
})

# (engine file, imported top-level module) pairs still being migrated out.
_ALLOWED: frozenset[tuple[str, str]] = frozenset({
    ("engine/vedic/at_time.py", "services"),
    ("engine/vedic/daily.py", "services"),
    ("engine/vedic/daily_civil.py", "services"),
    ("engine/vedic/vastu/architecture.py", "services"),
    ("engine/vedic/vastu/zone_rules.py", "services"),
})


def _outward_imports() -> set[tuple[str, str]]:
    """Every (file, outer module) import under engine/, at any nesting depth.

    Function-level imports count: they are the usual way a cycle is hidden."""
    found: set[tuple[str, str]] = set()
    for path in (ROOT / "engine").rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        rel = path.relative_to(ROOT).as_posix()
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                names = [node.module]
            else:
                continue
            for name in names:
                top = name.split(".")[0]
                if top in _OUTER:
                    found.add((rel, top))
    return found


class TestEngineDependsOnNothingOutward:
    def test_no_new_outward_import(self):
        new = sorted(_outward_imports() - _ALLOWED)
        assert not new, (
            "engine/ imports an outer layer: "
            + ", ".join(f"{f} -> {m}" for f, m in new)
            + ". Pass the value in, or define a Protocol (port) in the engine and "
            "implement it in services/. See docs/DDD-PLAN.md."
        )

    def test_allow_list_has_no_stale_entries(self):
        """A migrated import must leave the list, so it cannot quietly come back."""
        stale = sorted(_ALLOWED - _outward_imports())
        assert not stale, (
            "remove these from _ALLOWED, they no longer import outward: "
            + ", ".join(f"{f} -> {m}" for f, m in stale)
        )
