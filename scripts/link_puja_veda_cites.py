"""Point puja shlokas that quote a Veda at that verse's clip, and record the cite.

Reads the four samhita manifests, matches each mantra in the puja documents
(Agni Suktam, Agni Sthapana, Agni Sahasranama, Svasti Vachanam, Graha Shanti)
against them, and writes ``veda_cite`` (``rigveda:1.1.3``) plus ``audio_file``
when that verse has a clip in the bucket. An ``audio_file`` that already
points at a Veda clip keeps its file; the cite is read off the path so the
caption matches what plays.

Yajurveda uploads stop early in a few adhyayas. Those caps are the ones
probed on the bucket (there is no ``audio_coverage`` on yajurveda.json).
Atharvaveda coverage is read from that manifest.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data" / "documents_source"

PUJA = [
    "agni-suktam.json",
    "agni-sthapana-vidhi.json",
    "agni-sahasranama-stotram.json",
    "svasti-vachanam.json",
    "graha-shanti-paddhati.json",
]

# Last mantra file that exists, where the upload is shorter than the text.
# Adhyayas not listed are complete.
YAJURVEDA_VERSE_CAP = {
    14: 16,
    15: 25,
    16: 32,
    18: 55,
    21: 17,
    23: 7,
    26: 4,
    27: 10,
    31: 21,
    34: 17,
}

_PATH_CITE = [
    (re.compile(r"rigveda_(\d+)_(\d+)_(\d+)\.mp3$"), "rigveda"),
    (re.compile(r"yajurveda_(\d+)_(\d+)\.mp3$"), "yajurveda"),
    (re.compile(r"samaveda_(\d+)\.mp3$"), "samaveda"),
    (re.compile(r"atharvaveda_(\d+)_(\d+)_(\d+)\.mp3$"), "atharvaveda"),
]


def norm(text: str) -> str:
    """Fold spelling and accent differences so two editions of one rik compare."""
    text = unicodedata.normalize("NFC", text)
    # Avagraha stands for the अ that sandhi dropped (नोऽभयं = नो अभयं).
    text = text.replace("ऽ", "अ")
    text = text.replace("र\u0943", "ऋ").replace("र\u0944", "ऋ")
    text = text.replace("ल\u0962", "ऌ").replace("ल\u0963", "ऌ")
    text = text.replace("ॠ", "ऋ").replace("ॡ", "ऌ")
    drop = set("०१२३४५६७८९0123456789।॥|.,;:!?-–—()[]\"'ऽॐ\u200c\u200d \n\t\rंःँ़")
    out: list[str] = []
    for ch in text:
        code = ord(ch)
        if 0x1CD0 <= code <= 0x1CFF or 0xA8E0 <= code <= 0xA8FF or 0x0951 <= code <= 0x0954:
            continue
        if unicodedata.category(ch) in {"Mn", "Me"}:
            continue
        if ch in drop:
            continue
        out.append(ch)
    return "".join(out)


def cite_from_audio(path: str | None) -> str | None:
    if not path:
        return None
    name = path.rsplit("/", 1)[-1]
    for pattern, veda in _PATH_CITE:
        match = pattern.search(name)
        if match:
            parts = ".".join(str(int(p)) for p in match.groups())
            return f"{veda}:{parts}"
    return None


def _edit_distance(a: str, b: str) -> int:
    if abs(len(a) - len(b)) > 4:
        return 99
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _yajurveda_audio(adhyaya: int, verse: int) -> str | None:
    cap = YAJURVEDA_VERSE_CAP.get(adhyaya)
    if cap is not None and verse > cap:
        return None
    return f"documents/yajurveda/yajurveda_{adhyaya}_{verse:02d}.mp3"


def _atharvaveda_audio(coverage: dict, kanda: int, sukta: int, verse: int) -> str | None:
    partial = (coverage.get("partial") or {}).get(str(kanda))
    if partial is not None:
        cap = partial.get(str(sukta))
        if cap is None or verse > int(cap):
            return None
    else:
        through = coverage.get("through_mandala")
        if through is not None and kanda > int(through):
            return None
        caps = (coverage.get("sukta_caps") or {}).get(str(kanda)) or {}
        if str(sukta) in caps and verse > int(caps[str(sukta)]):
            return None
    return (
        f"documents/atharvaveda/{kanda:02d}/"
        f"atharvaveda_{kanda:02d}_{sukta:03d}_{verse:03d}.mp3"
    )


def _load_index() -> list[tuple[str, str, str | None, str]]:
    """(normalized text, cite, audio key or None, veda id)."""
    index: list[tuple[str, str, str | None, str]] = []

    def add(text: str, cite: str, audio: str | None, veda: str) -> None:
        folded = norm(text)
        if len(folded) >= 18:
            index.append((folded, cite, audio, veda))

    rigveda = json.loads((ROOT / "rigveda.json").read_text(encoding="utf-8"))
    for chapter in rigveda["chapters"]:
        mandala = int(chapter["number"])
        for shloka in chapter["shlokas"]:
            sukta = int(shloka["sukta_number"])
            verse = int(str(shloka["verse_label"]).rsplit(".", 1)[-1])
            add(
                shloka["sanskrit"],
                f"rigveda:{mandala}.{sukta}.{verse}",
                f"documents/rigveda/{mandala:02d}/rigveda_{mandala:02d}_{sukta:02d}_{verse:02d}.mp3",
                "rigveda",
            )

    yajurveda = json.loads((ROOT / "yajurveda.json").read_text(encoding="utf-8"))
    for chapter in yajurveda["chapters"]:
        adhyaya = int(chapter["number"])
        for shloka in chapter["shlokas"]:
            verse = int(shloka["verse_number"])
            add(
                shloka["sanskrit"],
                f"yajurveda:{adhyaya}.{verse}",
                _yajurveda_audio(adhyaya, verse),
                "yajurveda",
            )

    samaveda = json.loads((ROOT / "samaveda.json").read_text(encoding="utf-8"))
    index_no = 0
    for chapter in samaveda["chapters"]:
        for shloka in chapter["shlokas"]:
            index_no += 1
            add(
                shloka["sanskrit"],
                f"samaveda:{index_no}",
                f"documents/samaveda/samaveda_{index_no:04d}.mp3",
                "samaveda",
            )

    atharvaveda = json.loads((ROOT / "atharvaveda.json").read_text(encoding="utf-8"))
    coverage = atharvaveda.get("audio_coverage") or {}
    for chapter in atharvaveda["chapters"]:
        kanda = int(chapter["number"])
        for shloka in chapter["shlokas"]:
            sukta = int(shloka["sukta_number"])
            verse = int(str(shloka["verse_label"]).rsplit(".", 1)[-1])
            add(
                shloka["sanskrit"],
                f"atharvaveda:{kanda}.{sukta}.{verse}",
                _atharvaveda_audio(coverage, kanda, sukta, verse),
                "atharvaveda",
            )
    return index


_VEDA_RANK = {"rigveda": 0, "yajurveda": 1, "atharvaveda": 2, "samaveda": 3}


def _best_match(
    text: str,
    index: list[tuple[str, str, str | None, str]],
    buckets: dict[str, list[int]],
) -> tuple[float, bool, tuple[str, str, str | None, str]] | None:
    folded = norm(text)
    if len(folded) < 20:
        return None
    window = 14
    seen: set[int] = set()
    found: dict[str, tuple[float, bool, tuple[str, str, str | None, str]]] = {}

    def consider(item: tuple[str, str, str | None, str], score: float, exact: bool) -> None:
        prev = found.get(item[1])
        if prev is None or score > prev[0]:
            found[item[1]] = (score, exact, item)

    stops = range(0, max(1, len(folded) - window + 1), 12)
    for offset in stops:
        for idx in buckets.get(folded[offset : offset + window], ()):
            if idx in seen:
                continue
            seen.add(idx)
            veda_norm, cite, audio, veda = index[idx]
            item = (veda_norm, cite, audio, veda)
            if folded == veda_norm:
                consider(item, 1.0, True)
                continue
            shorter = min(len(folded), len(veda_norm))
            longer = max(len(folded), len(veda_norm))
            if shorter < 28:
                continue
            if veda_norm in folded or folded in veda_norm:
                ratio = shorter / longer
                # A full mantra quoted inside a ritual line, a line that is
                # almost the whole mantra, or a passage that is most of a longer one.
                contained = (
                    (veda_norm in folded and len(veda_norm) >= 40 and ratio >= 0.45)
                    or ratio >= 0.78
                    or (folded in veda_norm and len(folded) >= 40 and ratio >= 0.55)
                )
                if contained:
                    consider(item, ratio, False)
                continue
            if folded[:12] == veda_norm[:12] and shorter / longer >= 0.7:
                if abs(len(folded) - len(veda_norm)) <= 4 and shorter / longer >= 0.92:
                    distance = _edit_distance(folded, veda_norm)
                    if distance <= 3:
                        consider(item, 1 - distance / longer, False)
                elif len(folded) > len(veda_norm) and len(veda_norm) >= 32:
                    # The mantra, then a short closing formula (सुशान्तिर्भवतु).
                    take = min(len(folded), len(veda_norm) + 2)
                    if abs(take - len(veda_norm)) <= 4:
                        distance = _edit_distance(veda_norm, folded[:take])
                        if distance <= 2:
                            consider(
                                item,
                                (1 - distance / len(veda_norm)) * (len(veda_norm) / len(folded)),
                                False,
                            )

    if not found:
        return None
    return min(
        found.values(),
        key=lambda row: (
            -int(row[1]),
            -row[0],
            0 if row[2][2] else 1,
            _VEDA_RANK.get(row[2][3], 9),
        ),
    )


def _write(path: Path, data: dict) -> None:
    original = path.read_text(encoding="utf-8")
    indent = 1 if original.startswith("{\n ") and not original.startswith("{\n  ") else 2
    rendered = json.dumps(data, ensure_ascii=False, indent=indent)
    if original.endswith("\n"):
        rendered += "\n"
    path.write_text(rendered, encoding="utf-8")


def main() -> None:
    index = _load_index()
    buckets: dict[str, list[int]] = defaultdict(list)
    window = 14
    for idx, (folded, _cite, _audio, _veda) in enumerate(index):
        if len(folded) <= window:
            buckets[folded].append(idx)
            continue
        for offset in range(0, len(folded) - window + 1):
            buckets[folded[offset : offset + window]].append(idx)

    for name in PUJA:
        path = ROOT / name
        data = json.loads(path.read_text(encoding="utf-8"))
        cited = new_audio = kept_audio = 0
        weak: list[str] = []
        for chapter in data["chapters"]:
            for shloka in chapter["shlokas"]:
                label = shloka.get("verse_label") or ""
                shloka.pop("veda_cite", None)
                if label.startswith(("टीका", "सामग्री", "इति")):
                    continue
                path_cite = cite_from_audio(shloka.get("audio_file"))
                match = _best_match(shloka.get("sanskrit") or "", index, buckets)
                cite = path_cite
                if cite is None and match is not None and match[0] >= 0.55:
                    cite = match[2][1]
                    if not shloka.get("audio_file") and match[2][2]:
                        shloka["audio_file"] = match[2][2]
                        new_audio += 1
                    if match[0] < 0.8 and not match[1]:
                        weak.append(f"{label} {cite} {match[0]:.2f}")
                elif path_cite and not shloka.get("audio_file"):
                    pass
                if path_cite and shloka.get("audio_file"):
                    kept_audio += 1
                if cite:
                    shloka["veda_cite"] = cite
                    cited += 1
        _write(path, data)
        print(f"{name}: cited={cited} new_audio={new_audio} existing_veda_audio={kept_audio}")
        if weak:
            print("  weaker:", ", ".join(weak[:12]))


if __name__ == "__main__":
    main()
