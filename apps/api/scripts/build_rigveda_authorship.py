#!/usr/bin/env python3
"""Build data/rigveda_authorship.json from the sukta catalog markdown.

Traditional Rishi / Devata / Chhanda per Sukta, keyed "<mandala>.<sukta>".
The catalog (rigveda-sukta-catalog-v2.md) is the source. Mandalas 1–3 are
one row per sukta. Mandalas 4–10 are ranges; a later "detailed" bullet
overrides the summary table for the same numbers.

ingest_rigveda.py merges this file into each rik by (mandala, sukta).

    python3 scripts/build_rigveda_authorship.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT.parent / "rigveda-sukta-catalog-v2.md"
OUT = ROOT / "data/rigveda_authorship.json"

# Traditional Shaunaka Anukramani for the six Mandala 10 suktas the catalog
# skips (122–124 and 126–128). Everything else comes from the catalog.
GAPS: dict[str, dict[str, str]] = {
    "10.122": {"rishi": "Chitramahas Vasishtha", "devata": "Indra", "chhanda": "Trishtup"},
    "10.123": {"rishi": "Vena Bhargava", "devata": "Vena", "chhanda": "Trishtup"},
    "10.124": {"rishi": "Agni / Varuna / Soma / Indra", "devata": "Agni, Varuna, Soma, Indra", "chhanda": "Trishtup"},
    "10.126": {"rishi": "Kulmalabarhisha / Amhomuch", "devata": "Vishvedevah", "chhanda": "Trishtup"},
    "10.127": {"rishi": "Kushika Saubhara / Ratri Bharadvaji", "devata": "Ratri", "chhanda": "Gayatri"},
    "10.128": {"rishi": "Vihavya Angirasa", "devata": "Vishvedevah", "chhanda": "Trishtup"},
}

EXPECTED = {1: 191, 2: 43, 3: 62, 4: 58, 5: 87, 6: 75, 7: 104, 8: 103, 9: 114, 10: 191}

MANDALA_RE = re.compile(r"^## \*\*MANDALA (\d+)")
TABLE_RE = re.compile(
    r"^\| \*\*(Suktas? .+?)\*\* \| (.+?) \| (.+?) \| (.+?) \|$"
)
DETAIL_RE = re.compile(
    r"^\* \*\*(Suktas? .+?)\*\*: Rishis?: (.+?) \| Devata: (.+?) \| Chhanda: (.+)$"
)
RANGE_RE = re.compile(r"(\d+)\s*[–—-]\s*(\d+)|(\d+)")


def _numbers(label: str) -> list[int]:
    """First sukta number or inclusive range in a cell like 'Sukta 26–32'."""
    head = label.split("(")[0]
    match = RANGE_RE.search(head)
    if not match:
        return []
    if match.group(1):
        return list(range(int(match.group(1)), int(match.group(2)) + 1))
    return [int(match.group(3))]


def _clean(cell: str) -> str:
    return cell.replace("**", "").strip()


def parse_catalog(text: str) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    mandala: int | None = None
    for line in text.splitlines():
        header = MANDALA_RE.match(line)
        if header:
            mandala = int(header.group(1))
            continue
        if mandala is None:
            continue
        table = TABLE_RE.match(line)
        detail = DETAIL_RE.match(line)
        if not table and not detail:
            continue
        groups = (table or detail).groups()
        entry = {
            "rishi": _clean(groups[1]),
            "devata": _clean(groups[2]),
            "chhanda": _clean(groups[3]),
        }
        for sukta in _numbers(groups[0]):
            out[f"{mandala}.{sukta}"] = entry
    return out


def build() -> dict[str, Any]:
    text = CATALOG.read_text(encoding="utf-8")
    data = parse_catalog(text)
    data.update(GAPS)
    missing: list[str] = []
    for mandala, count in EXPECTED.items():
        for sukta in range(1, count + 1):
            key = f"{mandala}.{sukta}"
            if key not in data:
                missing.append(key)
    if missing:
        raise SystemExit(f"Missing attribution for {len(missing)} suktas: {missing[:20]}")
    if len(data) != sum(EXPECTED.values()):
        extra = sorted(k for k in data if int(k.split(".")[0]) not in EXPECTED or int(k.split(".")[1]) > EXPECTED[int(k.split(".")[0])])
        raise SystemExit(f"Unexpected keys: {extra}")
    return dict(sorted(data.items(), key=lambda kv: tuple(int(p) for p in kv[0].split("."))))


def main() -> None:
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(data)} suktas")


if __name__ == "__main__":
    main()
