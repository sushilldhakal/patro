#!/usr/bin/env python3
"""The Surya Siddhanta's 500 verses with every printed commentary, in Nepali and English.

Three editions, scanned to text (hOCR search text) and kept beside the repo:

- Prof. Ramchandra Pandey (Chowkhamba): root verse, Ranganatha's Sanskrit
  Gudharthaprakashika, Pandey's Hindi, and his own proofs (अत्रोपपत्ति, विशेष).
  Two scans of it exist; the second one only checks the root verse.
- Pt. Kapileshwar Shastri (Kashi Sanskrit Series 144): his Tattvamrita.
- Baldev Prasad Mishra: the Gudharthaprakashika again and his Hindi tika.

    python3 scripts/surya_commentary.py --locate      # find every verse in every book
    python3 scripts/surya_commentary.py --translate   # one model call per passage (resumable)
    python3 scripts/surya_commentary.py --apply       # write data/documents_source/surya-siddhanta.json

--locate finds each root verse in Pandey by its closing number (॥ N ॥), skips the
commentators' own verses, and finds the same verse in the other books by letter
trigrams, keeping the longest chain that runs forward through each book. Pandey's
book says the text has 500 verses, and that is the count it finds.

--translate needs OPENROUTER_API_KEY in apps/api/.env. Hindi is never written back:
the reader shows Nepali and English only. Every sum in a working is re-checked by
--apply, and a wrong result is recomputed.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOKS = Path(__file__).resolve().parents[4]
MANIFEST = ROOT / "data/documents_source/surya-siddhanta.json"
SPANS = ROOT / "data/vedcom_source/surya_spans.json"
PROGRESS = ROOT / "data/vedcom_source/surya_commentary.jsonl"
# The manifest as it stood before this script (Burgess's meanings), for passages not yet translated.
PREVIOUS = ROOT / "data/vedcom_source/surya_siddhanta_before.json"
PANDEY = BOOKS / "Surya Siddhanta - Prof. Ram Chandra Pandey_hocr_searchtext.txt"
PANDEY_B = BOOKS / "सूर्यसिद्धांत Surya Siddhanta RC Panday_hocr_searchtext.txt"
MISHRA = BOOKS / "Surya Siddhanta with Gudartha Prakash and Hindi Tika - Baldev Prasad Mishra Muradabadi_hocr_searchtext.txt"
KAPILESHWAR = BOOKS / "Surya Siddhanta of Pt. Shri Kapileshwar Shastri # 144 - Kashi Sanskrit Series_hocr_searchtext.txt"
URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "anthropic/claude-haiku-5.5"

DEV = str.maketrans("०१२३४५६७८९", "0123456789")
TO_DEV = str.maketrans("0123456789", "०१२३४५६७८९")
START = "सूर्यसिद्धान्तः मध्यमाधिकारः"

CHAPTERS = [
    ("मध्यमाधिकार", "मध्यमाधिकार", "Madhyamadhikara, the mean motions"),
    ("स्पष्टाधिकार", "स्पष्टाधिकार", "Spashtadhikara, the true places"),
    ("त्रिप्रश्", "त्रिप्रश्नाधिकार", "Triprashna, direction, place and time"),
    ("चन्द्रग्रहणाधिकार", "चन्द्रग्रहणाधिकार", "Lunar eclipses"),
    ("सूर्यग्रहणाधिकार", "सूर्यग्रहणाधिकार", "Solar eclipses"),
    ("छेद्यकाधिकार", "छेद्यकाधिकार", "Chedyaka, the projection of eclipses"),
    ("ग्रहयुत्यधिकार", "ग्रहयुत्यधिकार", "Conjunctions of the planets"),
    ("नक्षत्रग्रहयुत्यधिकार", "नक्षत्रग्रहयुत्यधिकार", "Conjunctions with the nakshatras"),
    ("उदयास्ताधिकार", "उदयास्ताधिकार", "Heliacal rising and setting"),
    ("न्नत्यधिकार", "शृङ्गोन्नत्यधिकार", "The moon's horns"),
    ("पाताधिकार", "पाताधिकार", "Pata, vyatipata and vaidhrti"),
    ("भूगोलाध्याय", "भूगोलाध्याय", "Bhugola, cosmography"),
    ("षोपनिषद", "ज्यौतिषोपनिषदध्याय", "Jyotishopanishad, instruments"),
    ("ानाध्याय", "मानाध्याय", "Mana, the measures of time"),
]

# Verse closes: ॥ १ ॥, ।। १६ ।।, ॥ २-३ ॥
CLOSE = re.compile(r"[॥।|]{1,3}\s*([०-९0-9]{1,3})\s*(?:[-–—,]{1,2}\s*([०-९0-9]{1,3})\s*)?[॥।|]{1,3}")
# Hindi words that mark a gloss as Pandey's translation. "तथा" is Sanskrit too, so it only
# counts toward a gloss, never against a root verse.
HINDI = {"है", "हैं", "में", "किया", "के", "की", "को", "से", "और", "था", "थे", "यह", "लिए", "होता", "करना", "होते", "होती", "गया", "हुए", "कहा", "करके", "करते", "उसके", "इस", "का", "हो", "कर", "जो"}
HINDI_IN_GLOSS = (HINDI - {"का", "हो", "कर", "जो"}) | {"तथा", "अर्थात्‌"}
GLOSS = ("इत्यर्थ", "इति भाव", "भाव:", "नन्व", "इत्यत", "इत्याह", "इति ।", "त्यर्थ")
# Words that show a span is Ranganatha's commentary rather than a verse.
GLOSS_MARKS = ("इत्यर्थ", "इति भाव", "भाव:", "नन्व", "इति ।", "अत्र", "यत:", "अतः")
NE_HINDI = {"है", "हैं", "था", "थे", "थी", "और", "यह", "वह", "नहीं", "आप", "किया", "रहा", "रही", "एवं", "चाहिए", "चाहिये"}


def letters(text: str) -> str:
    """Consonants and vowels only: OCR breaks matras and spacing far more often."""
    return re.sub(r"[^अ-हक़-य़]", "", text)


def dev(n: int) -> str:
    return str(n).translate(TO_DEV)


# ---------------------------------------------------------------- locate


def closes(text: str, begin: int) -> list[dict]:
    out = []
    prev = begin
    for m in CLOSE.finditer(text, begin):
        n = int(m.group(1).translate(DEV))
        n2 = int(m.group(2).translate(DEV)) if m.group(2) else n
        body = text[prev:m.start()]
        prev = m.end()
        tokens = re.findall(r"[ऀ-ॿ]+", body)
        out.append({
            "pos": m.start(), "end": m.end(), "n": n, "n2": n2, "body": body,
            "gap": len(body.strip()), "hindi": sum(t in HINDI_IN_GLOSS for t in tokens),
            "gloss": any(g in body for g in GLOSS_MARKS),
        })
    return out


def verse_tail(body: str) -> str | None:
    """The two half-verses just before a close, when they read as a root verse."""
    parts = [p for p in re.split(r"[।|॥]", re.sub(r"\s+", " ", body)) if p.strip()]
    if len(parts) < 2:
        return None
    tail = parts[-2].strip() + " । " + parts[-1].strip()
    tokens = re.findall(r"[ऀ-ॿ]+", tail)
    if any(t in HINDI for t in tokens) or any(g in tail for g in GLOSS):
        return None
    return tail if 28 <= len(letters(tail)) <= 170 else None


def chapter_starts(text: str, begin: int) -> list[int]:
    starts = [begin]
    cur = begin
    for k in range(2, 15):
        stem = CHAPTERS[k - 1][0]
        rx = re.compile(r"^[^\n]{0,14}" + stem + r"[^\n]{0,12}?\s*[-–—_]+\s*" + dev(k) + r"(?![०-९])", re.M)
        m = rx.search(text, cur)
        if m:
            cur = m.start()
        starts.append(cur)
    return starts


def pandey_verses(text: str) -> list[dict]:
    begin = text.find(START)
    marks = closes(text, begin)
    starts = chapter_starts(text, begin)
    found: list[dict] = []
    lo = begin
    for c in range(14):
        hi = starts[c + 1] if c < 13 else len(text)
        expect = 1
        got: list[dict] = []
        for i, x in enumerate(marks):
            if not (lo <= x["pos"] < hi) or not (expect <= x["n"] <= expect + 4):
                continue
            tail = verse_tail(x["body"])
            if not tail:
                continue
            # A root verse is followed by the commentary on it before the same number comes
            # again as another verse; the commentators' own opening verses are not.
            ok = True
            for y in marks[i + 1:i + 13]:
                is_gloss = y["gap"] > 380 or y["hindi"] > 0 or y["gloss"] or verse_tail(y["body"]) is None
                if is_gloss and y["n"] <= x["n"] <= max(y["n"], y["n2"]):
                    break
                if not is_gloss and y["n"] == x["n"]:
                    ok = False
                    break
            if not ok:
                continue
            n2 = x["n2"] if x["n"] <= x["n2"] <= x["n"] + 3 else x["n"]
            got.append({"ch": c + 1, "a": x["n"], "b": n2, "pos": x["pos"], "end": x["end"], "tail": tail})
            expect = n2 + 1
        found += got
        lo = got[-1]["end"] if got else lo
    return found


def align(spans: list[dict], path: Path, name: str) -> int:
    """Find each root verse in another book; keep the longest chain that moves forward."""
    text = path.read_text(encoding="utf-8")
    keep = [i for i, ch in enumerate(text) if "अ" <= ch <= "ह" or "क़" <= ch <= "य़"]
    flat = "".join(text[i] for i in keep)
    index: dict[str, list[int]] = collections.defaultdict(list)
    for i in range(len(flat) - 2):
        index[flat[i:i + 3]].append(i)
    cands = []
    for si, sp in enumerate(spans):
        if not sp.get("tail"):
            continue
        tl = letters(sp["tail"])
        votes: collections.Counter = collections.Counter()
        for o in range(len(tl) - 2):
            for p in index.get(tl[o:o + 3], ()):
                votes[(p - o) // 8] += 1
        need = 0.38 * (len(tl) - 2)
        for v, b in sorted(((v, b) for b, v in votes.items() if v >= need), reverse=True)[:6]:
            cands.append((si, b * 8))
    cands.sort()
    best = [1] * len(cands)
    prev = [-1] * len(cands)
    for i, (si, pos) in enumerate(cands):
        for k in range(i - 1, max(-1, i - 400), -1):
            sk, pk = cands[k]
            if sk < si and pk < pos and best[k] + 1 > best[i]:
                best[i] = best[k] + 1
                prev[i] = k
    i = max(range(len(cands)), key=lambda q: best[q]) if cands else -1
    chain = []
    while i >= 0:
        chain.append(cands[i])
        i = prev[i]
    chain.reverse()
    found = [(si, keep[pos]) for si, pos in chain]
    for n, (i, st) in enumerate(found):
        en = found[n + 1][1] if n + 1 < len(found) else st + 8000
        spans[i][name] = text[st:en] if en > st else text[st:st + 3000]
    # A verse not found shares the excerpt that runs over it.
    last = ""
    for sp in spans:
        if sp.get(name):
            last = sp[name]
            sp[name + "_own"] = True
        else:
            sp[name] = last
            sp[name + "_own"] = False
    return len(found)


def locate() -> None:
    text = PANDEY.read_text(encoding="utf-8")
    verses = pandey_verses(text)
    colophon: dict[int, int] = {}
    for m in re.finditer(r"सम्पूर्ण\s*[॥।|]{1,3}\s*([०-९]{1,2})\s*[॥।|]", text):
        colophon.setdefault(int(m.group(1).translate(DEV)), m.end())
    for x in verses:
        i = text.rfind(x["tail"].split(" । ")[0][:12], 0, x["pos"])
        x["start"] = i if i > 0 and x["pos"] - i < 600 else x["pos"] - len(x["tail"]) - 20
    by_chapter: dict[int, list[dict]] = collections.defaultdict(list)
    for x in verses:
        by_chapter[x["ch"]].append(x)
    spans: list[dict] = []
    for c in range(1, 15):
        xs = by_chapter[c]
        end_c = colophon.get(c, xs[-1]["end"] + 20000)
        for i, x in enumerate(xs):
            if i == 0 and x["a"] > 1:
                st = colophon.get(c - 1, x["start"] - 4000)
                spans.append({"ch": c, "a": 1, "b": x["a"] - 1, "pa": text[st:x["start"]], "tail": None, "lead": True})
            nx = xs[i + 1] if i + 1 < len(xs) else None
            b = nx["a"] - 1 if nx else x["b"]
            spans.append({"ch": c, "a": x["a"], "b": max(b, x["b"]), "pa": text[x["start"]:(nx["start"] if nx else end_c)], "tail": x["tail"]})
    # Chapter 1 opens with the root verse, before the commentators' own opening verses.
    head = text.find(START)
    spans[0]["pa"] = text[head:head + len(spans[0]["pa"]) + 1500]
    for name, path in (("pb", PANDEY_B), ("ka", KAPILESHWAR), ("mi", MISHRA)):
        print(f"  {name}: found {align(spans, path, name)} of {sum(1 for s in spans if s.get('tail'))}")
    for sp in spans:
        sp["pb"] = sp.get("pb", "")[:600]
    total = sum(s["b"] - s["a"] + 1 for s in spans)
    print(f"  {len(spans)} passages, {total} verses")
    for c in range(1, 15):
        print(f"    chapter {c}: {sum(s['b'] - s['a'] + 1 for s in spans if s['ch'] == c)}")
    SPANS.parent.mkdir(parents=True, exist_ok=True)
    SPANS.write_text(json.dumps(spans, ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------- translate

SYSTEM = """You edit one passage of the Surya Siddhanta for a bilingual (English and Nepali) reader, from OCR of three printed editions:
- PANDEY: Prof. Ramchandra Pandey's edition. It prints the root verse, then Ranganatha's Sanskrit commentary Gudharthaprakashika, then Pandey's Hindi translation, and sometimes Pandey's own Sanskrit proof (अत्रोपपत्ति / उपपत्ति) or a Hindi note (विशेष) with a worked calculation.
- KAPILESHWAR: Pt. Kapileshwar Shastri's edition (Kashi Sanskrit Series) with his Sanskrit commentary Tattvamrita and notes.
- MISHRA: Baldev Prasad Mishra's edition: the same Gudharthaprakashika plus his Hindi bhasha-tika (भा०टी०). Its OCR has no spaces.
- PANDEY_B: a second scan of Pandey, for checking the root verse.

The excerpts can start a little early or run on into the next verse. Use only what belongs to the verses you are given.

Return one JSON object:
{"verses":[{"n":<number>,"sanskrit":"<the root verse>"}],
 "meaning_en":"","meaning_ne":"",
 "ranganatha_en":"","ranganatha_ne":"",
 "pandey_en":"","pandey_ne":"",
 "kapileshwar_en":"","kapileshwar_ne":"",
 "mishra_en":"","mishra_ne":"",
 "working_en":"","working_ne":"",
 "figure":""}

Rules:
1. verses: one item per verse number asked for. Rebuild the correct Sanskrit root verse by comparing the scans (fix OCR: 5 or S is ऽ, ड़/ड्र are often ङ्ग/ङ्क, "॑" marks are noise). Two halves joined by " । ", no verse number, no ॥. It must be the Surya Siddhanta's own verse, never a commentator's verse. If a number's verse is truly absent from all scans, give "".
2. meaning: what the verse says, from Pandey's Hindi translation (and Mishra's), in plain English and in Nepali. Two to four sentences.
3. ranganatha: Ranganatha's Gudharthaprakashika on these verses. Translate every point it makes (word glosses, reasons, objections and answers, quotations by name), condensed but complete. Plain prose, one point per line.
4. pandey: Pandey's own Sanskrit proof (अत्रोपपत्ति) and Hindi notes (विशेष), which are not his translation of the verse. Explain his proof step by step. "" when he adds none.
5. kapileshwar: Kapileshwar's Tattvamrita and notes on these verses, every point, condensed. "" when the excerpt has nothing on these verses.
6. mishra: only what Mishra's Hindi tika says beyond Pandey's meaning. "" when it adds nothing.
7. working: when the verse or any commentary calculates, give the method as short numbered steps, one per line. Each step names the quantity it finds, then the numbers, e.g. "3. Yojanas in one kalā of the moon's orbit = 324000 ÷ 21600 = 15". Use × ÷ + − = and fractions like 1/2. Check every multiplication and division yourself; a number must come from the texts or be computed from them correctly. "" when there is no calculation.
8. figure: one short English phrase naming the diagram that would explain this verse (for example "sine table in a quadrant", "eclipse shadow cone", "epicycle of the true planet"), or "".
9. Nepali must be Nepali in Devanagari with Devanagari digits: use छ, छन्, हो, र, मा, लाई, बाट, गर्छ, हुन्छ. Never use these Hindi words: है हैं था थे थी और यह वह नहीं आप किया रहा रही एवं चाहिए चाहिये में को की के से. English uses Western digits. Keep Sanskrit technical terms (bhagana, kalpa, ahargana, jya, kranti...) in IAST in English and in Devanagari in Nepali.
10. Never invent. Leave a field "" rather than guess.
Return only the JSON."""


def load_key() -> str:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("OPENROUTER_API_KEY="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    sys.exit("OPENROUTER_API_KEY is missing")


def span_key(sp: dict) -> str:
    return f"{sp['ch']}.{sp['a']}-{sp['b']}"


def ask(key: str, model: str, sp: dict) -> tuple[dict | None, float]:
    def part(name: str, n: int) -> str:
        t = sp.get(name, "")
        if sp.get("lead"):
            return t[-n:]
        if not sp.get(name + "_own", True):
            return t[:n + 5000]
        return t[:n]

    wide = "" if sp.get("ka_own", True) and not sp.get("lead") else "\n(Some excerpts below are wider than these verses; find the part on these verses by matching the root verse.)"
    user = (
        f"Chapter {sp['ch']}, verse number(s) {list(range(sp['a'], sp['b'] + 1))}.{wide}\n\n"
        f"PANDEY:\n{sp['pa'][:12000]}\n\nPANDEY_B (root verse check):\n{sp.get('pb', '')[:700]}\n\n"
        f"KAPILESHWAR:\n{part('ka', 7000)}\n\nMISHRA:\n{part('mi', 6000)}"
    )
    body = {
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
        "temperature": 0.1,
        "max_tokens": 9000,
        "response_format": {"type": "json_object"},
    }
    if "deepseek" in model:
        body["reasoning"] = {"effort": "none"}
    request = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Title": "vedic-patro"},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                raw = json.loads(response.read())
            content = re.sub(r"^```(?:json)?|```$", "", raw["choices"][0]["message"]["content"].strip()).strip()
            return json.loads(content), float(raw.get("usage", {}).get("cost") or 0)
        except urllib.error.HTTPError as err:
            if err.code == 402:
                raise SystemExit("OpenRouter is out of credits; add credits and run --translate again")
            time.sleep(5 * (attempt + 1))
        except Exception:  # noqa: BLE001 - a broken reply is retried
            time.sleep(3 * (attempt + 1))
    return None, 0.0


def translate(model: str, workers: int) -> None:
    spans = json.loads(SPANS.read_text(encoding="utf-8"))
    done = set()
    if PROGRESS.exists():
        done = {json.loads(line)["key"] for line in PROGRESS.read_text(encoding="utf-8").splitlines() if line.strip()}
    todo = [sp for sp in spans if span_key(sp) not in done]
    print(f"  {len(todo)} passages to go")
    key = load_key()
    lock = threading.Lock()
    cost = 0.0
    with ThreadPoolExecutor(workers) as pool:
        futures = {pool.submit(ask, key, model, sp): sp for sp in todo}
        for n, future in enumerate(as_completed(futures), 1):
            sp = futures[future]
            data, spent = future.result()
            cost += spent
            if not data:
                print(f"  failed {span_key(sp)}")
                continue
            with lock, PROGRESS.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps({"key": span_key(sp), "ch": sp["ch"], "a": sp["a"], "b": sp["b"], **data}, ensure_ascii=False) + "\n")
            if n % 20 == 0:
                print(f"  {n} done, ${cost:.3f}")
    print(f"  finished, ${cost:.3f}")


# ---------------------------------------------------------------- apply

_EXPR = re.compile(r"[\d.,]+(?:\s*[×x*÷/+−\-]\s*\(?\s*[\d.,]+\s*\)?)+|\(\s*[\d.,]+(?:\s*[×x*÷/+−\-]\s*[\d.,]+)+\s*\)(?:\s*[×x*÷/+−\-]\s*[\d.,]+)*")
_RESULT = re.compile(r"\s*=\s*(-?\d[\d,]*(?:\.\d+)?)(?![\d/⅓⅔¼½¾,]|\.\d|\s*[×x*÷/+−\-]\s*\d)")


def _evaluate(expr: str) -> float | None:
    """Plain arithmetic with the usual precedence; None when it is not plain arithmetic."""
    src = expr.replace("×", "*").replace("x", "*").replace("÷", "/").replace("−", "-").replace(",", "")
    if not re.fullmatch(r"[\d.\s*/+\-()]+", src):
        return None
    try:
        return float(eval(src, {"__builtins__": {}}, {}))  # noqa: S307 - digits and operators only
    except Exception:  # noqa: BLE001
        return None


def check_working(text: str) -> tuple[str, int]:
    """Recompute every `expression = number` in a working (Western digits) and fix a wrong result.

    A quotient written as a whole number (225 goes into 3300 fourteen times) is accepted.
    """
    fixed = 0
    out = []
    for line in text.splitlines():
        pos = 0
        pieces = []
        for m in _EXPR.finditer(line):
            r = _RESULT.match(line, m.end())
            if not r:
                continue
            value = _evaluate(m.group(0))
            if value is None:
                continue
            shown = float(r.group(1).replace(",", ""))
            ok = abs(value - shown) <= max(0.51, abs(value) * 0.002) or ("÷" in m.group(0) or "/" in m.group(0)) and shown == int(value)
            if ok:
                continue
            fixed += 1
            decimals = len(r.group(1).split(".")[1]) if "." in r.group(1) else (2 if abs(value - round(value)) > 0.005 else 0)
            new = f"{value:,.{decimals}f}" if "," in r.group(1) else f"{value:.{decimals}f}"
            pieces.append(line[pos:r.start(1)] + new)
            pos = r.end(1)
        pieces.append(line[pos:])
        out.append("".join(pieces))
    return "\n".join(out), fixed


_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


def reconcile(en: str, ne: str) -> tuple[str, str, int]:
    """Check both workings. A wrong Nepali step takes the numbers of the matching English step
    (a dropped zero in an operand is the usual slip); with no match the Nepali working is
    dropped and the reader falls back to the English one."""
    en_fixed, en_errors = check_working(en)
    ne_lines = ne.splitlines()
    en_lines = en_fixed.splitlines()
    repaired = 0
    for i, line in enumerate(ne_lines):
        if not check_working(line)[1]:
            continue
        step = re.match(r"\s*(\d+)\.", line)
        twin = next((l for l in en_lines if step and re.match(rf"\s*{step.group(1)}\.", l)), None)
        if twin is None and len(ne_lines) == len(en_lines):
            twin = en_lines[i]
        numbers = _NUMBER.findall(twin or "")
        if twin is None or len(numbers) != len(_NUMBER.findall(line)):
            return en_fixed, "", en_errors + 1
        it = iter(numbers)
        ne_lines[i] = _NUMBER.sub(lambda _m: next(it), line)
        repaired += 1
    return en_fixed, "\n".join(ne_lines), en_errors + repaired


def to_dev_digits(text: str) -> str:
    return text.translate(TO_DEV)


def clean_verse(s: str) -> str:
    s = re.sub(r"[॥|]+", "", s or "")
    s = re.sub(r"[०-९0-9]+\s*$", "", s.strip())
    s = re.sub(r"\s*।\s*", " । ", s)
    return re.sub(r"\s+", " ", s).strip(" ।")


def apply() -> None:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    spans = json.loads(SPANS.read_text(encoding="utf-8"))
    rows: dict[str, dict] = {}
    if PROGRESS.exists():
        for line in PROGRESS.read_text(encoding="utf-8").splitlines():
            if line.strip():
                row = json.loads(line)
                rows[row["key"]] = row
    fixes = hindi = missing = 0
    # Until a passage is translated it keeps the verse (and meaning) the reader showed before,
    # matched by its letters, rather than raw OCR.
    before: list[tuple[set[str], dict]] = []
    for ch in json.loads(PREVIOUS.read_text(encoding="utf-8")).get("chapters", []) if PREVIOUS.exists() else []:
        for old in ch.get("shlokas", []):
            flat = letters(old.get("sanskrit", ""))
            before.append(({flat[i:i + 3] for i in range(len(flat) - 2)}, old))

    def earlier(tail: str) -> dict | None:
        flat = letters(tail)
        grams = {flat[i:i + 3] for i in range(len(flat) - 2)}
        best = max(before, key=lambda b: len(b[0] & grams), default=None)
        if best and grams and len(best[0] & grams) / len(grams) >= 0.6:
            return best[1]
        return None

    chapters = []
    for c, (_stem, title_ne, title_en) in enumerate(CHAPTERS, 1):
        shlokas = []
        for sp in (s for s in spans if s["ch"] == c):
            row = rows.get(span_key(sp))
            label = dev(sp["a"]) if sp["a"] == sp["b"] else f"{dev(sp['a'])}–{dev(sp['b'])}"
            if not row:
                missing += 1
                old = earlier(sp.get("tail") or "") if sp.get("tail") else None
                sanskrit = (old or {}).get("sanskrit") or clean_verse(sp.get("tail") or "")
                if not sanskrit:
                    continue
                item = {"verse_number": sp["a"], "verse_label": label, "sanskrit": sanskrit, "audio_file": None}
                for field in ("meaning_ne", "meaning_en", "commentary_ne", "commentary_en", "working_ne", "working_en"):
                    if old and old.get(field):
                        item[field] = old[field]
                shlokas.append(item)
                continue
            lines = [clean_verse(v.get("sanskrit", "")) for v in sorted(row.get("verses") or [], key=lambda v: v.get("n", 0))]
            lines = [l for l in lines if l]
            sanskrit = "\n".join(lines) or clean_verse(sp.get("tail") or "")
            if not sanskrit:
                continue
            item: dict = {
                "verse_number": sp["a"],
                "verse_label": label,
                "sanskrit": sanskrit,
                "meaning_ne": to_dev_digits(row.get("meaning_ne") or "") or None,
                "meaning_en": row.get("meaning_en") or None,
                "audio_file": None,
            }
            commentaries = []
            for name in ("ranganatha", "pandey", "kapileshwar", "mishra"):
                ne = to_dev_digits((row.get(f"{name}_ne") or "").strip())
                en = (row.get(f"{name}_en") or "").strip()
                if ne or en:
                    commentaries.append({"key": name, "ne": ne or None, "en": en or None})
                    hindi += sum(1 for w in re.findall(r"[ऀ-ॿ]+", ne) if w in NE_HINDI)
            if commentaries:
                item["commentaries"] = commentaries
            working_en = (row.get("working_en") or "").strip()
            working_ne = (row.get("working_ne") or "").strip()
            if working_en:
                working_en, working_ne, n = reconcile(working_en, working_ne.translate(DEV))
                fixes += n
                item["working_en"] = working_en
                item["working_ne"] = to_dev_digits(working_ne) or None
            shlokas.append(item)
        chapters.append({"number": c, "title_ne": title_ne, "title_en": title_en, "shlokas": shlokas})
    verses = sum(len(ch["shlokas"]) for ch in chapters)
    doc.update({
        "subtitle_ne": "५०० श्लोक · चार टीका र गणना",
        "subtitle_en": "500 verses · four commentaries and the working",
        "description_ne": "सूर्यसिद्धान्तका १४ अध्याय र ५०० श्लोक। अर्थ पाण्डेयको अनुवादबाट। हरेक श्लोकमुनि रङ्गनाथको गूढार्थप्रकाशिका, पाण्डेयको उपपत्ति, कपिलेश्वर शास्त्रीको तत्त्वामृत र बलदेवप्रसाद मिश्रको टीका, र गणना भएमा त्यसको विधि। गणितका ठाउँमा चल्ने चित्र छन्।",
        "description_en": "All 14 chapters and 500 verses of the Surya Siddhanta. The meaning follows Pandey's translation. Under each verse: Ranganatha's Gūḍhārthaprakāśikā, Pandey's proof, Kapileshwar Shastri's Tattvāmṛta and Baldev Prasad Mishra's tika, and the working where the verse calculates. Moving diagrams stand beside the mathematics.",
        "source_ne": "प्रो. रामचन्द्र पाण्डेय (चौखम्बा) · पं. कपिलेश्वर शास्त्री (काशी संस्कृत सिरिज १४४) · बलदेवप्रसाद मिश्र",
        "source_en": "Prof. Ramchandra Pandey (Chowkhamba); Pt. Kapileshwar Shastri (Kashi Sanskrit Series 144); Baldev Prasad Mishra",
        "chapters": chapters,
    })
    MANIFEST.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"  {verses} cards, {missing} passages still untranslated, {fixes} sums recomputed, {hindi} Hindi words left in Nepali")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--locate", action="store_true")
    parser.add_argument("--translate", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--model", default=MODEL)
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()
    if args.locate:
        locate()
    if args.translate:
        translate(args.model, args.workers)
    if args.apply:
        apply()
    if not (args.locate or args.translate or args.apply):
        parser.print_help()


if __name__ == "__main__":
    main()
