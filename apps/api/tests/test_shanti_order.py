"""Graha shanti findings come out in the same order in every server process.

The engine looped over Python sets of graha names (the dasha lords, the
Lagnesha/5th/9th lords), whose order follows the string hash and so changes
with ``PYTHONHASHSEED`` — two processes answered the same chart with the
findings in a different order. Now the Mahadasha lord precedes the Antardasha
lord, and the trikona lords run by house: Lagnesha, then 5th, then 9th.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]

# Births whose findings include two dasha lords or two weak trikona lords —
# the cases where the set order showed.
_SCRIPT = """
import json
from datetime import datetime
from zoneinfo import ZoneInfo
import app.wiring as wiring
wiring.configure()
from engine.astronomy.location import DEFAULT_LOCATION
from services.jyotish.kundali_detail_api import build_kundali_detail
out = []
for y, mo, d, h in ((1990, 5, 12, 6), (1985, 11, 3, 14), (2000, 1, 1, 0)):
    detail = build_kundali_detail(datetime(y, mo, d, h, 30, tzinfo=ZoneInfo("Asia/Kathmandu")), DEFAULT_LOCATION)
    out.append([[f["step"], f["graha"], f["remedy"]] for f in detail["grahaShanti"]["findings"]])
print(json.dumps(out))
"""


def _run(seed: str) -> list[list]:
    env = {**os.environ, "PYTHONHASHSEED": seed, "PYTHONPATH": str(API_ROOT)}
    proc = subprocess.run(
        [sys.executable, "-c", _SCRIPT], cwd=API_ROOT, env=env, capture_output=True, text=True, check=True,
    )
    return json.loads(proc.stdout.strip().splitlines()[-1])


def test_findings_do_not_depend_on_the_hash_seed():
    runs = [_run(seed) for seed in ("1", "2", "3")]
    assert runs[0] == runs[1] == runs[2]


def test_dasha_and_trikona_lords_keep_their_classical_order():
    from engine.jyotish.shanti_recommendation import _lords_in_order

    class _Chart:
        house_lord = {1: "mars", 5: "sun", 9: "jupiter", 8: "mars"}

    # Lagnesha first, then 5th and 9th lords; a graha owning two of them once.
    assert _lords_in_order(_Chart(), (9, 1, 5)) == ["mars", "sun", "jupiter"]
    assert _lords_in_order(_Chart(), (1, 8)) == ["mars"]
