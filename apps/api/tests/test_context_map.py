"""The context map: which bounded context may depend on which.

See docs/DDD-PLAN.md §1 (repository root). Every module under ``engine/`` and
``services/`` sits in a context folder (``engine/panchanga/…``,
``services/jyotish/…``). A context may import its own modules and those of the
contexts upstream of it, never one downstream: the Panchanga does not know a
festival exists; the Festivals context asks the Panchanga for tithis and decides
what they mean. Where an upstream context still needs something from downstream,
it declares a port and ``app/wiring.py`` plugs the implementation in (see
``services/panchanga/festival_port.py``).

``services/platform`` is the shared kernel (cache stores, payload versions):
any context's services may use it, and it depends on none of them.
"""

from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

UPSTREAM: dict[str, frozenset[str]] = {
    "astronomy": frozenset(),
    "calendar": frozenset({"astronomy"}),
    "panchanga": frozenset({"astronomy", "calendar"}),
    "festivals": frozenset({"astronomy", "calendar", "panchanga"}),
    "jyotish": frozenset({"astronomy", "calendar", "panchanga"}),
    "vastu": frozenset({"astronomy"}),
    "identity": frozenset(),
    "geography": frozenset({"astronomy"}),
    "scripture": frozenset({"astronomy"}),
    "sharing": frozenset({"astronomy", "calendar", "panchanga"}),
    "platform": frozenset(),
}
SHARED_KERNEL = "platform"


def _modules(layer: str):
    for path in sorted((ROOT / layer).rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        yield path, path.relative_to(ROOT).parts


def _imports(path: Path):
    for node in ast.walk(ast.parse(path.read_text())):
        if isinstance(node, ast.Import):
            for alias in node.names:
                yield node.lineno, alias.name
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            yield node.lineno, node.module


def _allowed(layer: str, context: str, target_layer: str, target: str) -> bool:
    allowed = {context} | UPSTREAM[context]
    if layer == "services" and target_layer == "services":
        allowed.add(SHARED_KERNEL)
    return target in allowed


class TestContextMap:
    def test_every_module_sits_in_a_known_context(self):
        stray = [
            "/".join(parts)
            for layer in ("engine", "services")
            for _, parts in _modules(layer)
            if len(parts) > 2 and parts[1] not in UPSTREAM
            or len(parts) == 2 and parts[1] != "__init__.py"
        ]
        assert not stray, f"modules outside a context folder: {stray}"

    def test_no_context_imports_a_downstream_one(self):
        offenders: list[str] = []
        for layer in ("engine", "services"):
            for path, parts in _modules(layer):
                if len(parts) < 3:
                    continue
                context = parts[1]
                for lineno, name in _imports(path):
                    target = name.split(".")
                    if target[0] not in ("engine", "services") or len(target) < 2:
                        continue
                    if not _allowed(layer, context, target[0], target[1]):
                        offenders.append(f"{'/'.join(parts)}:{lineno} ({context} -> {target[0]}.{target[1]})")
        assert not offenders, (
            "a context imports one downstream of it (docs/DDD-PLAN.md §1): "
            + ", ".join(offenders)
        )
