#!/usr/bin/env python3
"""Make the Atharvaveda verse list follow the Ved Portal crawl.

Each sukta's shlokas become the crawl's mantras, in the crawl's order, with the
crawl's label, accented text, devata, rishi, chhanda, svara, padapatha and Hindi
bhavartha. A mantra whose folded text already matches keeps its shloka, so an
existing Nepali meaning stays. Suktas the crawl does not have are removed.

Paryaya suktas keep the crawl's four-part label (kanda.sukta.paryaya.mantra).
Their audio files are numbered by the old three-part verse, so a clip is kept
only when that same place in the sukta is still the same mantra, and the sukta
cap is set to 0 so a later paryaya does not reuse an earlier clip.

    python3 scripts/align_atharvaveda_to_vedcom.py --report
    python3 scripts/align_atharvaveda_to_vedcom.py
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from merge_vedcom import fold, hindi_meaning, similarity  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
KEYS = (
    "verse_number",
    "verse_label",
    "sukta_number",
    "sanskrit",
    "transliteration",
    "meaning_ne",
    "meaning_en",
    "audio_file",
    "devata",
    "rishi",
    "chhanda",
    "svara",
    "padapatha",
    "meaning_hi",
)


def covered(coverage: dict, kanda: int, sukta: int, verse: int) -> bool:
    """Whether the coverage map grants a clip to this verse number."""
    partial = coverage.get("partial") or {}
    if str(kanda) in partial:
        cap = partial[str(kanda)].get(str(sukta))
        return cap is not None and verse <= int(cap)
    through = coverage.get("through_mandala")
    if through is not None and kanda > int(through):
        return False
    caps = (coverage.get("sukta_caps") or {}).get(str(kanda)) or {}
    if str(sukta) in caps:
        return verse <= int(caps[str(sukta)])
    return True


def crawl_order(row: dict) -> tuple[int, int]:
    paryaya = row.get("paryaya")
    return (int(paryaya) if paryaya else 0, int(row["mantra"]))


def new_shloka(row: dict, verse_number: int, audio_file: str | None) -> dict:
    return {
        "verse_number": verse_number,
        "verse_label": row["label"],
        "sukta_number": int(row["sukta"]),
        "sanskrit": row["sanskrit"],
        "transliteration": row.get("transliteration") or None,
        "meaning_ne": None,
        "meaning_en": None,
        "audio_file": audio_file,
        "devata": row.get("devata") or None,
        "rishi": row.get("rishi") or None,
        "chhanda": row.get("chhanda") or None,
        "svara": row.get("svara") or None,
        "padapatha": row.get("padapatha") or None,
        "meaning_hi": hindi_meaning(row.get("commentaries") or []),
    }


def audio_name(kanda: int, sukta: int, verse: int) -> str:
    return f"{kanda:02d}/atharvaveda_{kanda:02d}_{sukta:03d}_{verse:03d}.mp3"


def loose(text: str) -> str:
    """Folded letters, also dropping private-use vedic marks the crawl uses."""
    return "".join(ch for ch in fold(text) if unicodedata.category(ch) not in ("Co", "Cf"))


def _near_copy(old: str, new: str) -> bool:
    old_folded, new_folded = loose(old), loose(new)
    if not old_folded or not new_folded:
        return False
    if old_folded == new_folded:
        return True
    return similarity(old_folded, new_folded) >= 0.95


def same_recording(old: str, new: str) -> bool:
    """The clip was made for this mantra: the same line, or ours with a heading or refrain added."""
    old_folded, new_folded = loose(old), loose(new)
    if not new_folded:
        return False
    if old_folded == new_folded or new_folded in old_folded:
        return True
    return similarity(old_folded, new_folded) >= 0.95


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    src = ROOT / "data/vedcom_source/atharvaveda.jsonl"
    rows = [json.loads(line) for line in src.read_text(encoding="utf-8").splitlines() if line.strip()]
    by_sukta: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for row in rows:
        by_sukta[(int(row["mandala"]), int(row["sukta"]))].append(row)
    for group in by_sukta.values():
        group.sort(key=crawl_order)

    path = ROOT / "data/documents_source/atharvaveda.json"
    raw = path.read_text(encoding="utf-8")
    doc = json.loads(raw)
    coverage = doc.get("audio_coverage") or {}

    kept = replaced = added = removed = 0
    dropped_suktas: list[str] = []
    changed_suktas: list[str] = []
    ne_kept = 0

    for chapter in doc["chapters"]:
        kanda = int(chapter["number"])
        old_by_sukta: dict[int, list[dict]] = defaultdict(list)
        for shloka in chapter["shlokas"]:
            old_by_sukta[int(shloka["sukta_number"])].append(shloka)

        sukta_numbers = sorted(set(old_by_sukta) | {s for (k, s) in by_sukta if k == kanda})
        new_shlokas: list[dict] = []
        verse_number = 0
        for sukta in sukta_numbers:
            crawl = by_sukta.get((kanda, sukta))
            old = old_by_sukta.get(sukta) or []
            if not crawl:
                dropped_suktas.append(f"{kanda}.{sukta} ({len(old)} verses)")
                removed += len(old)
                continue
            old_by_label = {s["verse_label"]: s for s in old}
            built: list[dict] = []
            paryaya = crawl[0]["label"].count(".") >= 3
            explicit: dict[str, str] = {}
            if paryaya:
                for index, row in enumerate(crawl, start=1):
                    # Containment is not enough here: one of our lines often joins
                    # several site mantras, so the short mantra sits inside a longer clip.
                    if index > len(old) or not _near_copy(old[index - 1]["sanskrit"], row["sanskrit"]):
                        continue
                    named = old[index - 1].get("audio_file")
                    if named:
                        explicit[row["label"]] = named
                    elif covered(coverage, kanda, sukta, index):
                        explicit[row["label"]] = audio_name(kanda, sukta, index)
                coverage.setdefault("sukta_caps", {}).setdefault(str(kanda), {})[str(sukta)] = 0
            else:
                explicit = _fit_coverage(coverage, kanda, sukta, old_by_label, crawl)
            sukta_changed = len(old) != len(crawl) or [s["verse_label"] for s in old] != [r["label"] for r in crawl]
            for index, row in enumerate(crawl, start=1):
                label = row["label"]
                previous = old_by_label.get(label)
                same = previous is not None and fold(previous["sanskrit"]) == fold(row["sanskrit"])
                audio_file = explicit.get(label)
                if same and not paryaya:
                    verse_number += 1
                    previous["verse_number"] = verse_number
                    if audio_file:
                        previous["audio_file"] = audio_file
                    built.append(previous)
                    kept += 1
                    if previous.get("meaning_ne"):
                        ne_kept += 1
                else:
                    verse_number += 1
                    built.append(new_shloka(row, verse_number, audio_file))
                    if previous is None:
                        added += 1
                    else:
                        replaced += 1
                    if not same:
                        sukta_changed = True
            # Old verses with no crawl row at that label, already absent from `crawl`.
            removed += sum(1 for s in old if s["verse_label"] not in {r["label"] for r in crawl})
            if sukta_changed:
                changed_suktas.append(
                    f"{kanda}.{sukta}: {len(old)} → {len(crawl)}"
                    + (" (paryaya)" if any(r["label"].count(".") >= 3 for r in crawl) else "")
                )
            new_shlokas.extend(built)
        chapter["shlokas"] = new_shlokas

    # Caps for suktas the crawl does not have.
    for kanda, caps in list((coverage.get("sukta_caps") or {}).items()):
        for sukta in list(caps):
            if (int(kanda), int(sukta)) not in by_sukta:
                del caps[sukta]
        if not caps:
            del coverage["sukta_caps"][kanda]

    total = sum(len(c["shlokas"]) for c in doc["chapters"])
    print(f"verses {total} (crawl {len(rows)})")
    print(f"kept {kept}, replaced {replaced}, added {added}, removed {removed}")
    named = sum(1 for c in doc["chapters"] for s in c["shlokas"] if s.get("audio_file"))
    print(f"meaning_ne kept {ne_kept}, named clips {named}")
    print("dropped suktas:")
    for line in dropped_suktas:
        print(f"  {line}")
    print("changed suktas:")
    for line in changed_suktas:
        print(f"  {line}")
    print("audio_coverage", json.dumps(coverage, ensure_ascii=False))

    labels = [s["verse_label"] for c in doc["chapters"] for s in c["shlokas"]]
    if labels != [r["label"] for r in sorted(rows, key=lambda r: (int(r["mandala"]), int(r["sukta"]), *crawl_order(r)))]:
        # Order within a sukta follows the crawl; chapters follow kanda number.
        crawl_labels = []
        for chapter in doc["chapters"]:
            kanda = int(chapter["number"])
            for sukta in sorted(s for (k, s) in by_sukta if k == kanda):
                crawl_labels.extend(r["label"] for r in by_sukta[(kanda, sukta)])
        if labels != crawl_labels:
            raise SystemExit("verse list does not match the crawl")
    if len(labels) != len(set(labels)):
        raise SystemExit("duplicate verse label")
    for shloka in (s for c in doc["chapters"] for s in c["shlokas"]):
        missing = [k for k in KEYS if k not in shloka]
        if missing:
            raise SystemExit(f"{shloka.get('verse_label')} missing {missing}")

    if args.report:
        return
    doc["audio_coverage"] = coverage
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
    print(f"wrote {path}")


def _fit_coverage(coverage: dict, kanda: int, sukta: int, old_by_label: dict, crawl: list[dict]) -> dict[str, str]:
    """Stop a clip being played for a different mantra.

    A cap can only cut a suffix. When a matching mantra sits after one that
    changed, the sukta cap goes to 0 and the matching mantras keep their clip
    by name. Returns those ``label → audio_file`` overrides.
    """
    want: list[bool] = []
    for row in crawl:
        previous = old_by_label.get(row["label"])
        mantra = int(row["mantra"])
        if previous is None or not covered(coverage, kanda, sukta, mantra):
            want.append(False)
            continue
        want.append(same_recording(previous["sanskrit"], row["sanskrit"]))

    granted = [i for i in range(1, len(want) + 1) if covered(coverage, kanda, sukta, i)]
    if not granted:
        return {}
    if all(want):
        return {}
    last_good = max((i for i, ok in enumerate(want, start=1) if ok), default=0)
    suffix = bool(last_good) and all(want[:last_good]) and not any(want[last_good:])
    if suffix and last_good < max(granted):
        _set_cap(coverage, kanda, sukta, last_good)
        return {}
    if suffix or not any(want):
        if not any(want):
            _set_cap(coverage, kanda, sukta, 0)
        return {}
    # A changed mantra between two that still match. Name the clips that remain.
    _set_cap(coverage, kanda, sukta, 0)
    return {
        row["label"]: audio_name(kanda, sukta, int(row["mantra"]))
        for row, ok in zip(crawl, want)
        if ok
    }


def _set_cap(coverage: dict, kanda: int, sukta: int, cap: int) -> None:
    partial = coverage.get("partial") or {}
    if str(kanda) in partial:
        partial[str(kanda)][str(sukta)] = cap
        return
    coverage.setdefault("sukta_caps", {}).setdefault(str(kanda), {})[str(sukta)] = cap


if __name__ == "__main__":
    main()
