"""Standalone entry points must plug in the ports the server wires at startup.

The festival calendar and zone-rule index are handed in by ``app.wiring.configure()``.
``app/main.py`` calls it for the server; a script that computes a panchanga outside the
server has to as well, or its first festival lookup raises and a timer-driven job fails
silently (the daily Facebook post stopped for days on exactly this).
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import pytest

API_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = API_ROOT / "scripts"

# Anything that reaches a port: the panchanga/festival/vastu/sharing services.
_NEEDS_PORTS = re.compile(
    r"from services\.(?:panchanga|festivals|vastu|sharing)|import services\.(?:panchanga|festivals|vastu|sharing)"
)


def _scripts_needing_ports() -> list[Path]:
    return sorted(p for p in SCRIPTS.glob("*.py") if _NEEDS_PORTS.search(p.read_text(encoding="utf-8")))


@pytest.mark.parametrize("script", _scripts_needing_ports(), ids=lambda p: p.name)
def test_script_configures_ports(script: Path):
    text = script.read_text(encoding="utf-8")
    # Importing app.main wires the ports as a side effect; app.wiring is the lighter explicit route.
    wired = "from app.main import" in text or ("app.wiring" in text and "configure" in text)
    assert wired, f"{script.name} uses services that need app.wiring.configure() but never wires them"
