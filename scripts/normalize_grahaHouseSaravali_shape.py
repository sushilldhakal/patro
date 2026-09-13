"""Normalize every graha's ``grahaHouseSaravali`` table to one uniform
shape: `entries[]` carries only `{shloka, shlokaSourceNe, shlokaSourceEn}`
(no per-citation meaning), and `summaryNe`/`summaryEn` — now required, not
optional — hold the single combined reading for the house, rendered once
after every citation.

Why: the dialog previously supported two shapes at once — a per-citation
meaning (sun's/moon's original style) and a house-level summary (mercury's/
venus's style) — and let a house mix both. Per explicit user direction,
that inconsistency is exactly the problem: every graha must render the
same way, all shlokas together, one combined meaning at the bottom, no
exceptions. So this collapses the two shapes into one, permanently:

- Grahas whose entries still carry `meaningNe` (sun, moon, mars, jupiter,
  saturn, rahu, ketu at the time of writing) have those fields' text
  merged, in entry order, into `summaryNe`/`summaryEn` — each entry
  contributing "meaning + explanation" as one unit, units joined with a
  space into flowing prose. If the house already had its own `summaryNe`
  (moon's "सारावली एवं जातक पारिजात दृष्टिकोण" note, added because that
  content covered two sources without a clean citation), that existing
  text is appended last, after the merged per-citation content — narrative
  order: primary citations' reading first, supplementary classical
  perspective after.
- `meaningNe`/`meaningEn`/`explanationNe`/`explanationEn` are then deleted
  from every entry, leaving only `shloka`/`shlokaSourceNe`/`shlokaSourceEn`.
- Grahas already in the target shape (mercury, venus) are left untouched —
  no entry there carries a meaning key, so nothing matches and nothing
  changes.

Run from the repo root:
``python scripts/normalize_grahaHouseSaravali_shape.py``
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"


def merge_text(existing: str | None, parts: list[str]) -> str:
    combined = " ".join(p.strip() for p in parts if p and p.strip())
    if existing and existing.strip():
        combined = f"{combined} {existing.strip()}" if combined else existing.strip()
    return combined


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    table = data["grahaHouseSaravali"]
    changed = 0

    for graha, houses in table.items():
        for house_key, house in houses.items():
            entries = house["entries"]
            if not any("meaningNe" in e for e in entries):
                continue  # already in the target shape

            ne_parts = [f"{e.get('meaningNe', '')} {e.get('explanationNe', '')}".strip() for e in entries]
            en_parts = [f"{e.get('meaningEn', '')} {e.get('explanationEn', '')}".strip() for e in entries]

            house["summaryNe"] = merge_text(house.get("summaryNe"), ne_parts)
            house["summaryEn"] = merge_text(house.get("summaryEn"), en_parts)

            for e in entries:
                for key in ("meaningNe", "meaningEn", "explanationNe", "explanationEn"):
                    e.pop(key, None)

            changed += 1

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Normalized {changed} graha-house entries to the uniform shape.")


if __name__ == "__main__":
    main()
