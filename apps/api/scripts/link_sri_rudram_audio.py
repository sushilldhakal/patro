"""Point Sri Rudram mantras at the Yajurveda clips that recite them.

Sri Rudram here is the Krishna Yajurveda text (Taittiriya Samhita 4.5). The
recordings already uploaded for Yajurveda are the Shukla Yajurveda
(Vajasaneyi Samhita) clips, one file per mantra, mostly Adhyaya 16. Where a
Rudram line is that mantra, reuse the file and mark the source the way Agni
Suktam does: ``veda_cite`` (``yajurveda:16.1``) plus the number at the end of
the verse (``॥ १६.०१``).

Anuvakas 2–9 are each stored as one long namaskara. Those get split into the
Shukla mantras they quote so each card has one clip and one number. Lines
with no matching mantra (the opening invocation, the Shambhave namah, the
closing shanti) stay as they are. A cite is still written when the mantra is
known but its file was never uploaded.
"""

from __future__ import annotations

import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data" / "documents_source"
OUT = ROOT / "sri-rudram.json"

# Last mantra file that exists, where the upload is shorter than the text.
# Kept in step with link_puja_veda_cites.YAJURVEDA_VERSE_CAP.
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

_DEV = "०१२३४५६७८९"
_CITE_TAIL = re.compile(r"\s*॥\s*[०-९0-9]+\.[०-९0-9.]+\s*$")
_ANUVAKA_TAIL = re.compile(r"\s*॥\s*[०-९0-9]+\s*॥\s*$")
# A new namah, not नमस्ते. Accents may sit on the syllable, and नमः आ
# is written नम आ after sandhi.
_ACCENT = r"[॒॑᳚\u0951-\u0954\u1CD0-\u1CFF]*"
_NAMO = re.compile(rf"(?<=\S)\s+(?=नम{_ACCENT}(?:[ोः]|(?=\s)))")
_NAMO_IAST = re.compile(r"(?<=\S)\s+(?=nam[aāāoō])", re.I)


class _Mantra:
    def __init__(self, adhyaya: int, verse: int, folded: str, source: str) -> None:
        self.adhyaya = adhyaya
        self.verse = verse
        self.folded = folded
        self.source = source
        self.cite = f"yajurveda:{adhyaya}.{verse}"
        self._heads: list[str] | None = None

    def heads(self) -> list[str]:
        """Opening of each namah, taken from the spaced text so तन्मसि is not a namah."""
        if self._heads is None:
            found: list[str] = []
            for clause in _split_clauses(self.source, _NAMO):
                anchor = _content_anchor(fold(clause))
                if len(anchor) >= 6:
                    found.append(anchor)
            self._heads = found or [self.folded[:8]]
        return self._heads

    @property
    def audio(self) -> str | None:
        cap = YAJURVEDA_VERSE_CAP.get(self.adhyaya)
        if cap is not None and self.verse > cap:
            return None
        return f"documents/yajurveda/yajurveda_{self.adhyaya}_{self.verse:02d}.mp3"

    def __eq__(self, other: object) -> bool:
        return isinstance(other, _Mantra) and self.cite == other.cite

    def __hash__(self) -> int:
        return hash(self.cite)


def fold(text: str) -> str:
    """Drop accents, dandas and digits so two editions of one mantra compare."""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("ऽ", "अ")
    text = text.replace("र\u0943", "ऋ").replace("र\u0944", "ऋ")
    text = text.replace("ल\u0962", "ऌ").replace("ल\u0963", "ऌ")
    text = text.replace("ॠ", "ऋ").replace("ॡ", "ऌ")
    drop = set("०१२३४५६७८९0123456789।॥|.,;:!?-–—()[]\"'ऽॐ\u200b\u200c\u200d \n\t\rंःँ़")
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


def _load_mantras() -> list[_Mantra]:
    data = json.loads((ROOT / "yajurveda.json").read_text(encoding="utf-8"))
    mantras: list[_Mantra] = []
    for chapter in data["chapters"]:
        adhyaya = int(chapter["number"])
        for shloka in chapter["shlokas"]:
            folded = fold(shloka["sanskrit"])
            if len(folded) < 18:
                continue
            mantras.append(_Mantra(adhyaya, int(shloka["verse_number"]), folded, shloka["sanskrit"]))
    return mantras


def _dev(number: int, width: int = 0) -> str:
    raw = str(number) if width == 0 else f"{number:0{width}d}"
    return "".join(_DEV[int(ch)] for ch in raw)


def _strip_cite(text: str) -> str:
    return _CITE_TAIL.sub("", text).strip()


def _with_source(text: str, mantra: _Mantra) -> str:
    """Close the verse with its Yajurveda number, as Agni Suktam closes with १.००१.०१."""
    text = _strip_cite(text)
    text = _ANUVAKA_TAIL.sub("", text).strip()
    text = text.rstrip("।॥ ").rstrip()
    return f"{text} ॥ {_dev(mantra.adhyaya)}.{_dev(mantra.verse, 2)}"


def _is_namo_particle(text: str) -> bool:
    folded = fold(text)
    return len(folded) <= 6


def _split_clauses(text: str, pattern: re.Pattern[str]) -> list[str]:
    raw = [part.strip() for part in pattern.split(text) if part.strip()]
    clauses: list[str] = []
    pending = ""
    for part in raw:
        piece = f"{pending} {part}".strip() if pending else part
        pending = ""
        if _is_namo_particle(piece):
            pending = piece
            continue
        clauses.append(piece)
    if pending:
        if clauses:
            clauses[-1] = f"{clauses[-1]} {pending}".strip()
        else:
            clauses.append(pending)
    return clauses


def _ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b, autojunk=False).ratio()


def _match_whole(text: str, mantras: list[_Mantra]) -> _Mantra | None:
    folded = fold(text)
    if len(folded) < 20:
        return None
    best: tuple[float, float, _Mantra] | None = None
    for mantra in mantras:
        ratio = 0.0
        if abs(len(folded) - len(mantra.folded)) <= max(12, int(0.35 * max(len(folded), len(mantra.folded)))):
            if folded[0] == mantra.folded[0] or folded[:8] in mantra.folded[:24] or mantra.folded[:8] in folded[:24]:
                ratio = _ratio(folded, mantra.folded)
        # The Rudram line is the first half of a longer Yajurveda mantra
        # (Tryambakam is Vajasaneyi 3.60, which repeats the verse).
        if len(folded) >= 40 and len(mantra.folded) > len(folded) + 8:
            head = mantra.folded[: len(folded) + 4]
            if folded[0] == head[0]:
                ratio = max(ratio, _ratio(folded, head))
        if ratio < 0.80:
            continue
        # Adhyaya 16 is the Rudram; prefer it when another adhyaya is only barely as close.
        score = ratio + (0.03 if mantra.adhyaya == 16 else 0.0)
        if best is None or score > best[0]:
            best = (score, ratio, mantra)
    if best is None or best[1] < 0.80:
        return None
    return best[2]


def _content_anchor(folded: str) -> str:
    """The first distinctive consonants, past a leading namo/namah."""
    rest = folded
    while rest.startswith("नमो") or rest.startswith("नम"):
        rest = rest[3:] if rest.startswith("नमो") else rest[2:]
    return rest[:8]


def _anchor_forms(folded: str) -> list[str]:
    anchor = _content_anchor(folded)
    forms = [anchor]
    # नमः श्व is written नमश्श्व, so the namah can start one consonant later.
    if len(anchor) >= 2 and anchor[0] == anchor[1]:
        forms.append(anchor[1:])
    return [form for form in forms if len(form) >= 6]


def _head_distance(anchor: str, head: str) -> int:
    if len(anchor) < 6 or len(head) < 6:
        return 99
    take = min(len(anchor), len(head))
    return sum(left != right for left, right in zip(anchor[:take], head[:take]))


def _match_clause(text: str, mantras: list[_Mantra], previous: int | None) -> _Mantra | None:
    folded = fold(text)
    if len(folded) < 12:
        return None
    forms = _anchor_forms(folded)
    if not forms:
        return None
    hits: list[tuple[int, float, _Mantra]] = []
    for mantra in mantras:
        if mantra.adhyaya != 16 or len(folded) > len(mantra.folded) + 12:
            continue
        distance = min(_head_distance(form, head) for form in forms for head in mantra.heads())
        covered = sum(
            size
            for _i, _j, size in SequenceMatcher(None, mantra.folded, folded, autojunk=False).get_matching_blocks()
        )
        coverage = covered / len(folded)
        same_opening = distance <= 1 and coverage >= 0.78
        close_spelling = distance <= 2 and coverage >= 0.88 and len(folded) >= 18
        # The namah is in this mantra even when the splitter missed its opening.
        contained = forms[0] in mantra.folded and coverage >= 0.95
        if same_opening or close_spelling or contained:
            hits.append((distance if distance <= 2 else 2, coverage, mantra))
    if not hits:
        return None
    hits.sort(
        key=lambda hit: (
            -hit[1],
            hit[0],
            abs(hit[2].verse - previous) if previous is not None else hit[2].verse,
        )
    )
    return hits[0][2]


def _pack(source: dict, sanskrit: str, transliteration: str | None, mantra: _Mantra | None, keep_meaning: bool) -> dict:
    shloka: dict = {
        "verse_number": 0,
        "verse_label": "",
        "sanskrit": _with_source(sanskrit, mantra) if mantra else _strip_cite(sanskrit),
    }
    if transliteration:
        cleaned = _strip_cite(transliteration)
        if mantra:
            cleaned = _ANUVAKA_TAIL.sub("", cleaned).strip()
        shloka["transliteration"] = cleaned or None
    if keep_meaning:
        if source.get("meaning_ne"):
            shloka["meaning_ne"] = source["meaning_ne"]
        if source.get("meaning_en"):
            shloka["meaning_en"] = source["meaning_en"]
    shloka["audio_file"] = mantra.audio if mantra else None
    if mantra:
        shloka["veda_cite"] = mantra.cite
    return shloka


def _mantra_by_cite(cite: str | None, mantras: list[_Mantra]) -> _Mantra | None:
    if not cite:
        return None
    return next((mantra for mantra in mantras if mantra.cite == cite), None)


def _expand(shloka: dict, mantras: list[_Mantra]) -> list[dict]:
    sanskrit = _strip_cite(shloka.get("sanskrit") or "")
    transliteration = _strip_cite(shloka.get("transliteration") or "")
    clauses = _split_clauses(sanskrit, _NAMO)
    # A verse already tied to one mantra stays tied to it. Re-running the
    # linker must not drop that cite just because the line is only part of
    # the Shukla mantra.
    pinned = _mantra_by_cite(shloka.get("veda_cite"), mantras)
    if pinned is not None and len(clauses) < 4:
        return [_pack(shloka, sanskrit, transliteration or None, pinned, True)]
    if len(clauses) < 4:
        mantra = _match_whole(sanskrit, mantras) or _match_clause(sanskrit, mantras, None)
        return [_pack(shloka, sanskrit, transliteration or None, mantra, True)]

    iast_clauses = _split_clauses(transliteration, _NAMO_IAST) if transliteration else []
    iast_ok = len(iast_clauses) == len(clauses)
    groups: list[dict] = []
    previous: int | None = None
    for index, clause in enumerate(clauses):
        mantra = _match_clause(clause, mantras, previous)
        if mantra is not None:
            previous = mantra.verse
        iast_bit = iast_clauses[index] if iast_ok else None
        same = groups and groups[-1]["mantra"] == mantra and (mantra is not None or groups[-1]["mantra"] is None)
        if same:
            groups[-1]["parts"].append(clause)
            if iast_bit:
                groups[-1]["iast"].append(iast_bit)
            continue
        groups.append({"mantra": mantra, "parts": [clause], "iast": [iast_bit] if iast_bit else []})

    made: list[dict] = []
    for index, group in enumerate(groups):
        text = re.sub(r"\s+", " ", " ".join(group["parts"])).strip()
        if len(groups) == 1 or (index == 0 and not iast_ok):
            iast = transliteration or None
        elif group["iast"]:
            iast = re.sub(r"\s+", " ", " ".join(group["iast"])).strip() or None
        else:
            iast = None
        made.append(_pack(shloka, text, iast, group["mantra"], index == 0))
    return made


def link_sri_rudram(doc: dict, mantras: list[_Mantra] | None = None) -> dict:
    mantras = mantras if mantras is not None else _load_mantras()
    full = str(doc.get("full_audio_file") or "sri-rudram.mp3")
    if full and not full.startswith("documents/") and not full.startswith("http"):
        full = f"documents/sri-rudram/{full}"
    doc["full_audio_file"] = full
    doc.pop("audio_prefix", None)

    for chapter in doc["chapters"]:
        expanded: list[dict] = []
        for shloka in chapter["shlokas"]:
            expanded.extend(_expand(shloka, mantras))
        for index, shloka in enumerate(expanded, start=1):
            shloka["verse_number"] = index
            shloka["verse_label"] = f"{chapter['number']}.{index}"
        chapter["shlokas"] = expanded
    return doc


def main() -> None:
    doc = json.loads(OUT.read_text(encoding="utf-8"))
    link_sri_rudram(doc)
    cited = sum(1 for chapter in doc["chapters"] for shloka in chapter["shlokas"] if shloka.get("veda_cite"))
    with_audio = sum(1 for chapter in doc["chapters"] for shloka in chapter["shlokas"] if shloka.get("audio_file"))
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"sri-rudram: cited={cited} with_audio={with_audio}")
    for chapter in doc["chapters"]:
        linked = sum(1 for shloka in chapter["shlokas"] if shloka.get("audio_file"))
        print(f"  anuvaka {chapter['number']}: {len(chapter['shlokas'])} verses, {linked} with audio")


if __name__ == "__main__":
    main()
