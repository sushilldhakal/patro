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
        "max_tokens": 16000,
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


# Checked by hand. The nakshatra table of chapter 8 is decoded word by word (each bhoga is in
# tens of minutes; a polar longitude is bhoga × 10′ + 800′ for each star passed), and the
# result agrees with the drawing's table in packages/drawing/src/learn/surya-figures.ts.
VERSE_FIXES: dict[tuple[int, int], dict[str, str]] = {
    (8, 2): {
        "sanskrit": "अष्टार्णवाः शून्यकृताः पञ्चषष्टिर्नगेषवः । अष्टार्था अब्धयोऽष्टागा अङ्गागा मनवस्तथा",
        "meaning_en": "The bhogas (each in tens of minutes): Aśvinī 48, Bharaṇī 40, Kṛttikā 65, Rohiṇī 57, Mṛgaśiras 58, Ārdrā 4, Punarvasu 78, Puṣya 76, Āśleṣā 14. So Aśvinī's polar longitude is 480′ = 8°, Bharaṇī's 400′ + 800′ = 20°, Kṛttikā's 650′ + 1600′ = 37°30′.",
        "meaning_ne": "भोग (दश कलाका एकाइमा): अश्विनी ४८, भरणी ४०, कृत्तिका ६५, रोहिणी ५७, मृगशिरा ५८, आर्द्रा ४, पुनर्वसु ७८, पुष्य ७६, आश्लेषा १४। यसरी अश्विनीको ध्रुवक ४८०′ = ८°, भरणीको ४००′ + ८००′ = २०°, कृत्तिकाको ६५०′ + १६००′ = ३७°३०′ हुन्छ।",
    },
    (8, 3): {
        "sanskrit": "कृतेषवो युगरसाः शून्यबाणा वियद्रसाः । खवेदाः सागरनगा गजागाः सागरर्तवः",
        "meaning_en": "Further bhogas: Maghā 54, Pūrva Phalgunī 64, Uttara Phalgunī 50, Hasta 60, Citrā 40, Svātī 74, Viśākhā 78, Anurādhā 64. Hasta thus stands at 600′ + 9600′ = 170° and Citrā at 400′ + 10400′ = 180°.",
        "meaning_ne": "थप भोग: मघा ५४, पूर्वफाल्गुनी ६४, उत्तरफाल्गुनी ५०, हस्त ६०, चित्रा ४०, स्वाती ७४, विशाखा ७८, अनुराधा ६४। यसरी हस्त ६००′ + ९६००′ = १७०° मा र चित्रा ४००′ + १०४००′ = १८०° मा पर्छ।",
    },
    (8, 4): {
        "meaning_en": "Jyeṣṭhā 14, Mūla 6, Pūrva Āṣāḍhā 4. Uttara Āṣāḍhā (Vaiśva) stands at the middle of Pūrva Āṣāḍhā's portion, 260°; Abhijit at the end of that portion, 266°40′; and Śravaṇa at the end of Uttara Āṣāḍhā's portion, 280°.",
        "meaning_ne": "ज्येष्ठा १४, मूल ६, पूर्वाषाढा ४। उत्तराषाढा (वैश्व) पूर्वाषाढाको भागको बीचमा, २६०° मा; अभिजित् त्यही भागको अन्त्यमा, २६६°४०′ मा; र श्रवण उत्तराषाढाको भागको अन्त्यमा, २८०° मा रहन्छ।",
    },
    (8, 5): {
        "meaning_en": "Dhaniṣṭhā (Śraviṣṭhā) stands at the junction of the third and fourth quarters of Śravaṇa's portion, 290°. Then, from their own portions: Śatabhiṣaj 80, Pūrva Bhādrapadā 36, Uttara Bhādrapadā 22.",
        "meaning_ne": "धनिष्ठा (श्रविष्ठा) श्रवणको भागको तेस्रो र चौथो चरणको सन्धिमा, २९०° मा रहन्छ। त्यसपछि आफ्नै भागबाट: शतभिषा ८०, पूर्वभाद्रपदा ३६, उत्तरभाद्रपदा २२।",
    },
    (8, 6): {
        "sanskrit": "रन्ध्राद्रयः क्रमादेषां विक्षेपाः स्युरपक्रमात् । दिङ्मासविषयाः सौम्ये याम्ये पञ्चदिशो नव",
        "meaning_en": "Revatī 79 (so 359°50′). Their latitudes from the ecliptic, in order: Aśvinī 10° north, Bharaṇī 12° north, Kṛttikā 5° north; Rohiṇī 5° south, Mṛgaśiras 10° south, Ārdrā 9° south.",
        "meaning_ne": "रेवती ७९ (यसरी ३५९°५०′)। क्रान्तिवृत्तबाट तिनका विक्षेप क्रमशः: अश्विनी १०° उत्तर, भरणी १२° उत्तर, कृत्तिका ५° उत्तर; रोहिणी ५° दक्षिण, मृगशिरा १०° दक्षिण, आर्द्रा ९° दक्षिण।",
    },
    (8, 7): {
        "meaning_en": "Punarvasu 6° north, Puṣya 0°, Āśleṣā 7° south, Maghā 0°, Pūrva Phalgunī 12° north, Uttara Phalgunī 13° north; Hasta 11° south, Citrā 2° south; Svātī 37° north.",
        "meaning_ne": "पुनर्वसु ६° उत्तर, पुष्य ०°, आश्लेषा ७° दक्षिण, मघा ०°, पूर्वफाल्गुनी १२° उत्तर, उत्तरफाल्गुनी १३° उत्तर; हस्त ११° दक्षिण, चित्रा २° दक्षिण; स्वाती ३७° उत्तर।",
    },
    (8, 8): {
        "sanskrit": "याम्येऽध्यर्धत्रिकृतवो नव सार्धशरेषवः । उत्तरस्यां तथा षष्टिस्त्रिंशत् षट्त्रिंशदेव हि",
        "meaning_en": "To the south: Viśākhā 1½°, Anurādhā 3°, Jyeṣṭhā 4°, Mūla 9°, Pūrva Āṣāḍhā 5½°, Uttara Āṣāḍhā 5°. To the north: Abhijit 60°, Śravaṇa 30°, Dhaniṣṭhā 36°.",
        "meaning_ne": "दक्षिणतर्फ: विशाखा १½°, अनुराधा ३°, ज्येष्ठा ४°, मूल ९°, पूर्वाषाढा ५½°, उत्तराषाढा ५°। उत्तरतर्फ: अभिजित् ६०°, श्रवण ३०°, धनिष्ठा ३६°।",
    },
    (8, 9): {
        "sanskrit": "दक्षिणे त्वर्धभागस्तु चतुर्विंशतिरुत्तरे । भागाः षड्विंशतिः खं च दास्रादीनां यथाक्रमम्",
        "meaning_en": "Śatabhiṣaj ½° south, Pūrva Bhādrapadā 24° north, Uttara Bhādrapadā 26° north, and Revatī 0°: these are the latitudes of the stars from Aśvinī onward, in order.",
        "meaning_ne": "शतभिषा ½° दक्षिण, पूर्वभाद्रपदा २४° उत्तर, उत्तरभाद्रपदा २६° उत्तर र रेवती ०°: अश्विनीदेखि क्रमशः ताराहरूका विक्षेप यिनै हुन्।",
    },
}


# Numbers the model decoded wrongly, put right in every field of that verse.
# 2.19 कुञ्जराश्विनगाश्विनः: 8 2 7 2 read from the right is 2728 (the 14th sine), not 2782.
NUMBER_FIXES: dict[tuple[int, int], list[tuple[str, str]]] = {
    (2, 19): [("2782", "2728"), ("२७८२", "२७२८")],
    # गुणाग्निचन्द्राः 3 3 1 → 133 (Mercury); द्विरसाक्षीणि 2 6 2 → 262 (Venus)
    (2, 35): [("Mercury 132°", "Mercury 133°"), ("Venus 32°", "Venus 262°"), ("बुध १३२°", "बुध १३३°"), ("शुक्र ३२°", "शुक्र २६२°")],
    (12, 84): [("1043206", "1043209"), ("1,043,206", "1,043,209"), ("१०४३२०६", "१०४३२०९")],
}

# Orbits of 12.85-90 as Pandey prints them, which the verses' word-numerals give when read
# from the right: Mars 8146909, Moon's apogee 38328484, Jupiter 51375764, Rahu 80572864,
# Saturn 127668255, stars 259890000, sky 18712080864000000.
VERSE_FIXES.update({
    (2, 35): {
        "sanskrit": "युग्मान्तेऽर्थाद्रयः खाग्निसुराः सूर्या नवार्णवाः । ओजे द्व्यगा वसुयमा रदा रुद्रा गजाब्धयः\nकुजादीनामतः शैघ्र्या युग्मान्तेऽर्थाग्निदस्रकाः । गुणाग्निचन्द्राः खनगा द्विरसाक्षीणि गोऽग्नयः",
    },
    (12, 1): {
        "sanskrit": "अथार्कांशसमुद्भूतं प्रणिपत्य कृताञ्जलिः । भक्त्या परमयाऽभ्यर्च्य पप्रच्छेदं मयासुरः",
        "meaning_en": "Then Mayāsura, with folded hands, bowed to the being born of a portion of the Sun, worshipped him with the highest devotion, and asked him this.",
        "meaning_ne": "त्यसपछि मयासुरले हात जोडेर सूर्यको अंशबाट उत्पन्न पुरुषलाई प्रणाम गरे, परम भक्तिले पूजा गरे र उहाँसँग यो सोधे।",
    },
    (12, 86): {
        "meaning_en": "The orbit of Venus's śīghra is 2,664,637 yojanas (sapta 7, agni 3, rasa 6, abdhi 4, rasa 6, ṣaṭ 6, yama 2, read from the right). Then the orbit of the Sun, Mercury and Venus is 4,331,500 yojanas (kha 0, kha 0, artha 5, eka 1, sura 33, arṇava 4): one orbit, because their mean revolutions are equal.",
        "meaning_ne": "शुक्रको शीघ्रोच्चको कक्षा २६,६४,६३७ योजन हो (सप्त ७, अग्नि ३, रस ६, अब्धि ४, रस ६, षट् ६, यम २, दायाँबाट पढ्दा)। त्यसपछि सूर्य, बुध र शुक्रको कक्षा ४३,३१,५०० योजन हो (ख ०, ख ०, अर्थ ५, एक १, सुर ३३, अर्णव ४): तिनका मध्यम भगण बराबर भएकाले एउटै कक्षा।",
    },
    (12, 87): {
        "sanskrit": "कुजस्याप्यङ्कशून्याङ्कषड्वेदैकभुजङ्गमाः । चन्द्रोच्चस्य कृताष्टाब्धिवसुद्वित्र्यष्टवह्नयः",
        "meaning_en": "The orbit of Mars is 8,146,909 yojanas (aṅka 9, śūnya 0, aṅka 9, ṣaṭ 6, veda 4, eka 1, bhujaṅgama 8, read from the right). The orbit of the Moon's apogee is 38,328,484 yojanas.",
        "meaning_ne": "मङ्गलको कक्षा ८१,४६,९०९ योजन हो (अङ्क ९, शून्य ०, अङ्क ९, षट् ६, वेद ४, एक १, भुजङ्गम ८, दायाँबाट पढ्दा)। चन्द्रोच्चको कक्षा ३,८३,२८,४८४ योजन हो।",
    },
    (12, 88): {
        "sanskrit": "कृतर्तुमुनिपञ्चाद्रिगुणेन्दुविषया गुरोः । स्वर्भानोर्वेदतर्काष्टद्विशैलार्थखकुञ्जराः",
        "meaning_en": "Jupiter's orbit is 51,375,764 yojanas (kṛta 4, ṛtu 6, muni 7, pañca 5, adri 7, guṇa 3, indu 1, viṣaya 5, read from the right). Rahu's (Svarbhānu's) orbit is 80,572,864 yojanas (veda 4, tarka 6, aṣṭa 8, dvi 2, śaila 7, artha 5, kha 0, kuñjara 8).",
        "meaning_ne": "बृहस्पतिको कक्षा ५,१३,७५,७६४ योजन हो (कृत ४, ऋतु ६, मुनि ७, पञ्च ५, अद्रि ७, गुण ३, इन्दु १, विषय ५, दायाँबाट पढ्दा)। राहु (स्वर्भानु) को कक्षा ८,०५,७२,८६४ योजन हो (वेद ४, तर्क ६, अष्ट ८, द्वि २, शैल ७, अर्थ ५, ख ०, कुञ्जर ८)।",
        "working_en": "1. Jupiter: 4 6 7 5 7 3 1 5 read from the right = 51375764 yojanas\n2. Rahu: 4 6 8 2 7 5 0 8 read from the right = 80572864 yojanas",
        "working_ne": "१. बृहस्पति: ४ ६ ७ ५ ७ ३ १ ५ दायाँबाट पढ्दा = ५१३७५७६४ योजन\n२. राहु: ४ ६ ८ २ ७ ५ ० ८ दायाँबाट पढ्दा = ८०५७२८६४ योजन",
    },
    (12, 89): {
        "sanskrit": "पञ्चबाणाक्षिनागर्तुरसाद्र्यर्काः शनेस्ततः । भानां खखखशून्याङ्कवसुरन्ध्रशराश्विनः",
        "meaning_en": "Next, Saturn's orbit is 127,668,255 yojanas (pañca 5, bāṇa 5, akṣi 2, nāga 8, ṛtu 6, rasa 6, adri 7, arka 12). The orbit of the stars is 259,890,000 yojanas: sixty times the Sun's orbit of 4,331,500, rounded as the verse gives it.",
        "meaning_ne": "त्यसपछि शनिको कक्षा १२,७६,६८,२५५ योजन हो (पञ्च ५, बाण ५, अक्षि २, नाग ८, ऋतु ६, रस ६, अद्रि ७, अर्क १२)। नक्षत्रको कक्षा २५,९८,९०,००० योजन हो, सूर्यको कक्षा ४३,३१,५०० को साठी गुणा, श्लोकले दिएझैँ।",
        "working_en": "1. Saturn: 5 5 2 8 6 6 7 12 read from the right = 127668255 yojanas\n2. Stars: 0 0 0 0 9 8 9 5 2 read from the right = 259890000 yojanas\n3. Check: 4331500 × 60 = 259890000",
        "working_ne": "१. शनि: ५ ५ २ ८ ६ ६ ७ १२ दायाँबाट पढ्दा = १२७६६८२५५ योजन\n२. नक्षत्र: ० ० ० ० ९ ८ ९ ५ २ दायाँबाट पढ्दा = २५९८९०००० योजन\n३. जाँच: ४३३१५०० × ६० = २५९८९००००",
    },
    (12, 90): {
        "meaning_en": "The orbit of the sky (khakakṣā) is 18,712,080,864,000,000 yojanas: the circumference of the egg of Brahma, within which the Sun's rays spread on every side.",
        "meaning_ne": "आकाशको कक्षा (खकक्षा) १,८७,१२,०८,०८,६४,००,००,००० योजन हो: ब्रह्माण्डको परिधि, जसभित्र सूर्यका किरण चारैतिर फैलिन्छन्।",
        "working_en": "1. Word-numerals: kha 0, vyoma 0, kha-traya 0 0 0, kha 0, sāgara 4, ṣaṭka 6, nāga 8, vyoma 0, aṣṭa 8, śūnya 0, yama 2, rūpa 1, naga 7, aṣṭa 8, candra 1\n2. Read from the right = 18712080864000000 yojanas\n3. Check: the Moon's kalpa revolutions × its orbit = 57753336000 × 324000 = 18712080864000000",
        "working_ne": "१. शब्दाङ्क: ख ०, व्योम ०, खत्रय ० ० ०, ख ०, सागर ४, षट्क ६, नाग ८, व्योम ०, अष्ट ८, शून्य ०, यम २, रूप १, नग ७, अष्ट ८, चन्द्र १\n२. दायाँबाट पढ्दा = १८७१२०८०८६४०००००० योजन\n३. जाँच: चन्द्रका कल्पभगण × चन्द्रकक्षा = ५७७५३३३६००० × ३२४००० = १८७१२०८०८६४००००००",
    },
})


def _fix_numbers(item: dict, swaps: list[tuple[str, str]]) -> None:
    for field in ("meaning_en", "meaning_ne", "working_en", "working_ne"):
        if item.get(field):
            for old, new in swaps:
                item[field] = item[field].replace(old, new)
    for comment in item.get("commentaries") or []:
        for field in ("en", "ne"):
            if comment.get(field):
                for old, new in swaps:
                    comment[field] = comment[field].replace(old, new)


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
            # a passage the model gave no meaning for got one per verse in a second pass
            single = (row.get("verse_meanings") or {}).get(str(sp["a"])) or {}
            fix = VERSE_FIXES.get((c, sp["a"]), {})
            sanskrit = fix.get("sanskrit", sanskrit)
            item: dict = {
                "verse_number": sp["a"],
                "verse_label": label,
                "sanskrit": sanskrit,
                "meaning_ne": to_dev_digits(fix.get("meaning_ne") or row.get("meaning_ne") or single.get("meaning_ne") or "") or None,
                "meaning_en": fix.get("meaning_en") or row.get("meaning_en") or single.get("meaning_en") or None,
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
            if fix.get("working_en"):
                item["working_en"], item["working_ne"] = fix["working_en"], fix.get("working_ne")
            if (c, sp["a"]) in NUMBER_FIXES:
                _fix_numbers(item, NUMBER_FIXES[(c, sp["a"])])
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
