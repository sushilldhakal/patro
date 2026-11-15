"""Repair Pandey's worked sums and store them on the Surya Siddhanta verses.

The commentary prints a calculation after the Hindi gloss. This reads those
blocks, asks OpenRouter to turn the OCR into short steps, and writes
working_ne / working_en. The Burgess meaning is left as it is.

    python3 scripts/surya_workings.py --align-only
    python3 scripts/surya_workings.py --apply
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/documents_source/surya-siddhanta.json"
PANDEY = Path(__file__).resolve().parents[4] / "Surya Siddhanta - Prof. Ram Chandra Pandey_hocr_searchtext.txt"
PROGRESS = ROOT / "data/vedcom_source/surya_workings.jsonl"
URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-v4.1-flash-1017"
HINDI = {"है", "हैं", "था", "थे", "थी", "और", "यह", "वह", "नहीं", "आप", "किया", "रहा", "रही", "एवं", "चाहिए", "चाहिये"}

SYSTEM = """You repair one OCR calculation from Pandey's Surya Siddhanta commentary.
Reply with a JSON array of {"label","ne","en"}.
ne and en are the same working: at most 8 short lines, each one step, using × and =.
Keep a number only when the OCR states it or it is the obvious product of two numbers the OCR states.
Drop broken tokens. If the text is not a sum, return empty strings.
Nepali lines use Devanagari words and Devanagari digits. Do not use these Hindi words: है हैं था थे थी और यह वह नहीं आप किया रहा रही एवं चाहिए चाहिये.
English lines use English words and Western digits.
Use the given label unchanged."""


def load_ingest():
    spec = importlib.util.spec_from_file_location("ingest", ROOT / "scripts/ingest_reader_texts.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_key() -> str:
    env = ROOT / ".env"
    for line in env.read_text(encoding="utf-8").splitlines():
        if line.startswith("OPENROUTER_API_KEY="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    sys.exit("OPENROUTER_API_KEY is missing")


def extract() -> list[dict]:
    ingest = load_ingest()
    lines = PANDEY.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if "मध्यमाधिकार" in line and "सूर्यसिद्धान्त" in line)
    buckets: list[list[str]] = [[] for _ in ingest.SURYA_CHAPTERS]
    current = 0
    for line in lines[start:]:
        stripped = line.replace("\u200c", "").strip()
        if not stripped or ingest.dev_count(stripped) < 8:
            continue
        jumped = ingest._chapter_index(stripped)
        if jumped is not None and jumped >= current:
            current = jumped
            continue
        if re.search(r"सूर्यसिद्धान्त\s*:", stripped) and len(stripped) < 28:
            continue
        buckets[current].append(re.sub(r"\s+", " ", stripped))

    digit = re.compile(r"[०-९0-9]")
    rows = []
    for index, bucket in enumerate(buckets):
        text = " ".join(bucket)
        cursor = 0
        pending = None
        gap_at = None
        for match in ingest._VERSE_END.finditer(text):
            if not ingest._verse_marker(match.group()):
                continue
            body = ingest.tidy_ne(text[cursor:match.start()])
            cursor = match.end()
            numbers = ingest._verse_nums(match.group())
            if not numbers or numbers[0] > 100 or not body:
                continue
            if ingest._is_hindi(body):
                label = (
                    ingest.dev_digits(numbers[0])
                    if len(numbers) == 1
                    else f"{ingest.dev_digits(numbers[0])}\u2013{ingest.dev_digits(numbers[-1])}"
                )
                pending = f"{index + 1}:{label}"
                gap_at = cursor
                continue
            if pending is None or gap_at is None:
                continue
            gap = text[gap_at:match.start()]
            tail = ingest._sanskrit_tail(ingest.tidy_ne(gap)) or ""
            calc = gap
            if tail and tail in calc:
                calc = calc[: calc.rfind(tail)]
            calc = re.sub(r"\s+", " ", calc).strip(" ।")
            if len(digit.findall(calc)) >= 8 and len(calc) > 40:
                rows.append({"key": pending, "ocr": calc[:1600]})
            pending = None
            gap_at = None
    return rows


def hindi_hits(text: str) -> bool:
    return any(word in HINDI for word in re.split(r"[^\u0900-\u097F]+", text))


def script_ok(text: str, devanagari: bool) -> bool:
    letters = [ch for ch in text if ch.isalpha()]
    if len(letters) < 4:
        return False
    dev = sum(1 for ch in letters if "\u0900" <= ch <= "\u097f")
    ratio = dev / len(letters)
    return ratio >= 0.7 if devanagari else ratio <= 0.25


def parse_content(content: str) -> list[dict]:
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.rsplit("```", 1)[0]
    data = json.loads(text.strip())
    if isinstance(data, dict):
        data = data.get("items") or [data]
    if not isinstance(data, list):
        raise ValueError("not a list")
    return data


def repair(key: str, batch: list[dict]) -> dict[str, dict[str, str]]:
    payload = [{"label": row["key"], "ocr": row["ocr"]} for row in batch]
    body = {
        "model": MODEL,
        "temperature": 0.1,
        "max_tokens": 8000,
        "reasoning": {"effort": "none"},
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(
        URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Title": "vedic-patro"},
        method="POST",
    )
    delay = 2.0
    last = "no response"
    for _ in range(5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                raw = json.loads(response.read().decode("utf-8"))
            by_label = {}
            for item in parse_content(raw["choices"][0]["message"].get("content") or ""):
                label = str(item.get("label") or "").strip()
                ne = (item.get("ne") or "").strip()
                en = (item.get("en") or "").strip()
                if not label:
                    continue
                if not ne and not en:
                    by_label[label] = {"ne": "", "en": ""}
                    continue
                if hindi_hits(ne) or not script_ok(ne, True) or not script_ok(en, False):
                    continue
                by_label[label] = {"ne": ne, "en": en}
            if not by_label:
                raise ValueError("empty repair")
            return by_label
        except urllib.error.HTTPError as err:
            last = f"HTTP {err.code} {err.read().decode('utf-8', errors='replace')[:240]}"
            if err.code not in (402, 408, 409, 429, 500, 502, 503):
                break
        except Exception as err:  # noqa: BLE001
            last = str(err)
        time.sleep(delay)
        delay = min(delay * 2, 20)
    raise RuntimeError(last)


def load_progress() -> dict[str, dict[str, str]]:
    rows = {}
    if not PROGRESS.exists():
        return rows
    for line in PROGRESS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        rows[row["label"]] = {"ne": row.get("ne") or "", "en": row.get("en") or ""}
    return rows


def append_progress(label: str, item: dict[str, str]) -> None:
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    with PROGRESS.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps({"label": label, **item}, ensure_ascii=False) + "\n")


def apply(rows: dict[str, dict[str, str]]) -> int:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    applied = 0
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            item = rows.get(f"{chapter['number']}:{shloka['verse_label']}")
            if not item or not item["ne"] or not item["en"]:
                continue
            if shloka.get("working_ne") != item["ne"] or shloka.get("working_en") != item["en"]:
                shloka["working_ne"] = item["ne"]
                shloka["working_en"] = item["en"]
                applied += 1
    doc["description_ne"] = (
        "सूर्यसिद्धान्तका मूल श्लोक। अर्थ Burgess को अङ्ग्रेजी अनुवाद हो, र त्यसैको नेपाली। "
        "जुन श्लोकमा पाण्डेयको टीकाले गणना गरेको छ, त्यो गणना अर्थमुनि देखिन्छ।"
    )
    doc["description_en"] = (
        "The root verses of the Surya Siddhanta. The meaning is Burgess's English translation, and the same sense in Nepali. "
        "Where Pandey's commentary works a sum, that working is shown under the meaning."
    )
    tmp = MANIFEST.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(MANIFEST)
    return applied


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--align-only", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--batch", type=int, default=4)
    args = parser.parse_args()
    rows = extract()
    print("blocks", len(rows))
    if args.align_only:
        for row in rows:
            print(row["key"], row["ocr"][:80])
        return
    done = load_progress()
    pending = [row for row in rows if row["key"] not in done]
    key = load_key()
    for start in range(0, len(pending), args.batch):
        batch = pending[start : start + args.batch]
        repaired = repair(key, batch)
        for row in batch:
            item = repaired.get(row["key"])
            if item is None:
                print("miss", row["key"])
                continue
            append_progress(row["key"], item)
            done[row["key"]] = item
            print("ok", row["key"], "lines", item["ne"].count("\n") + 1 if item["ne"] else 0)
    if args.apply:
        print("wrote", apply(done))


if __name__ == "__main__":
    main()
