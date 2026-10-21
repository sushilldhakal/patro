"""Dependency direction: the engine is the domain, and depends on nothing outward.

See docs/DDD-PLAN.md §2 (repository root). ``engine/`` holds the calculations;
``services/`` (use cases, caches, stores), ``app/`` and ``api/`` (HTTP) and
``database/`` (ORM) are built on top of it. An import the other way round makes
the calculation depend on a cache, a database or a request — which is how a
cache-aside ended up inside ``get_daily_panchanga`` and a city lookup inside
``ObserverLocation`` resolution.

Where the engine needs stored data it declares a ``Protocol`` (a port) and
``app/wiring.py`` plugs an implementation in — see
``engine.vastu.zone_rules.ZoneRuleIndex``.
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
    def test_no_outward_import(self):
        found = sorted(_outward_imports())
        assert not found, (
            "engine/ imports an outer layer: "
            + ", ".join(f"{f} -> {m}" for f, m in found)
            + ". Pass the value in, or define a Protocol (port) in the engine and "
            "implement it in services/. See docs/DDD-PLAN.md."
        )



def _imports_under(folder: str) -> list[tuple[str, int, str]]:
    found = []
    for path in sorted((ROOT / folder).rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        rel = path.relative_to(ROOT).as_posix()
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node, ast.Import):
                found += [(rel, node.lineno, alias.name) for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                found.append((rel, node.lineno, node.module))
    return found


class TestApplicationDependsOnlyInward:
    """``services/`` (use cases and their stores) sits under the interface and the
    composition root: it may not import ``app`` or ``api``. A request-reading
    helper it needs belongs in the domain (as ``engine.calendar.date_keys`` did)."""

    def test_services_import_no_interface(self):
        offenders = [
            f"{rel}:{line} -> {name}"
            for rel, line, name in _imports_under("services")
            if name.split(".")[0] in ("app", "api")
        ]
        assert not offenders, "services/ imports the interface layer: " + ", ".join(offenders)


class TestRoutersDoNotQueryTheDatabase:
    """A router translates HTTP; it does not query tables. Persistence goes through
    a use case and its store (``services/identity/*_store.py``)."""

    ROUTER_FOLDERS = ("api", "app/routers")

    def test_no_router_imports_sqlalchemy(self):
        offenders = [
            f"{rel}:{line} -> {name}"
            for folder in self.ROUTER_FOLDERS
            for rel, line, name in _imports_under(folder)
            if name.split(".")[0] == "sqlalchemy"
        ]
        assert not offenders, "a router queries the database itself: " + ", ".join(offenders)


class TestRulesFolderIsData:
    """``rules/`` holds the festival and sait rule data; the code that reads it is
    domain code and lives in ``engine/festivals`` where these guards see it."""

    def test_no_python_in_rules(self):
        stray = sorted(
            p.relative_to(ROOT).as_posix() for p in (ROOT / "rules").rglob("*.py") if "__pycache__" not in p.parts
        )
        assert not stray, f"code in rules/: {stray}"
