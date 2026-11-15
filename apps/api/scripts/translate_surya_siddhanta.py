#!/usr/bin/env python3
"""Burgess's English Surya Siddhanta, then Nepali, via OpenRouter.

The scan is Ebenezer Burgess, Journal of the American Oriental Society, 1860.
Each of our verses keeps his English sense. DeepSeek repairs the OCR and
writes the same meaning in Nepali. Hindi is never written back.

    python3 scripts/translate_surya_siddhanta.py --align-only
    python3 scripts/translate_surya_siddhanta.py --apply

Requires OPENROUTER_API_KEY in apps/api/.env. Reasoning is off.
"""

from __future__ import annotations

import argparse
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
MANIFEST = ROOT / "data/documents_source/surya-siddhanta.json"
PROGRESS = ROOT / "data/vedcom_source/surya_siddhanta_deepseek.jsonl"
BURGESS = Path(__file__).resolve().parents[4] / "6555_hocr_searchtext.txt"
MODEL = "deepseek/deepseek-v4.1-flash-1017"
URL = "https://openrouter.ai/api/v1/chat/completions"

# Line numbers in the hOCR. Chapter IX has no "CHAPTER" line; the appendix
# begins just after verse 27 of chapter XIV.
CHAPTER_SPANS = [
    (23, 1868),
    (1869, 3370),
    (3371, 3800),
    (3801, 3966),
    (3967, 4118),
    (4119, 4187),
    (4188, 4328),
    (4329, 5720),
    (5721, 5771),
    (5772, 5854),
    (5855, 5919),
    (5920, 6107),
    (6108, 6216),
    (6217, 6519),
]

SYSTEM = """You prepare the meaning of Surya Siddhanta verses for a bilingual reader.

Each item is one Sanskrit passage (sometimes two or three shlokas) and Ebenezer Burgess's English translation of those verses. The English is from a damaged scan: join split words, ignore footnote marks, and do not add his commentary.

"en": one or two plain English sentences saying what this passage says.
"ne": that same meaning in natural Nepali, in Devanagari.

Nepali must be Nepali. Use र, छ, छन्, हो, भने, मा, लाई, बाट, गर्छ, हुन्छ.
Do not use these Hindi words: है, हैं, था, थे, थी, और, यह, वह, नहीं, आप, अपने, किया, रहा, रही, एवं, चाहिए, चाहिये.

Keep these names in Devanagari in the Nepali: ब्रह्मा, मय, सूर्य, रोमक.
In the English use: Brahma, Maya, the Sun, Romaka.

Do not add notes. Return only a JSON array of {"label","en","ne"} in the same order, using each label exactly."""

HINDI_WORDS = {
    "है", "हैं", "था", "थे", "थी", "और", "यह", "वह", "नहीं", "आप", "अपने",
    "किया", "रहा", "रही", "एवं", "चाहिए", "चाहिये",
}
_VERSE = re.compile(r"^[«\"'“\s]*(\d{1,3})\.\s+(\S.*)$")
_lock = threading.Lock()
_stop = threading.Event()


class OutOfCredits(RuntimeError):
    pass


def load_key() -> str:
    env = ROOT / ".env"
    if env.is_file():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                value = line.split("=", 1)[1].strip().strip('"').strip("'")
                if value:
                    return value
    sys.exit("OPENROUTER_API_KEY is missing from apps/api/.env")


def clean_line(line: str) -> str:
    line = line.replace("¬", "").replace("\u00ad", "")
    return " ".join(line.split())


def ends_sentence(text: str) -> bool:
    return bool(re.search(r"[.?!][\"'”)\]]*\s*$", text))


def label_numbers(label: str) -> list[int]:
    folded = label.translate(str.maketrans("०१२३४५६७८९", "0123456789"))
    return [int(piece) for piece in re.findall(r"\d+", folded)]


def _verse_text(parts: list[str]) -> str:
    text = " ".join(parts)
    text = re.sub(r"^\d+\.\s*", "", text)
    text = re.sub(r"\s+([,.;:?!])", r"\1", text)
    return text.strip()


def _digit_repairs(number: int) -> list[int]:
    text = str(number)
    found = []
    for index, char in enumerate(text):
        for source, target in (("8", "3"), ("3", "8"), ("5", "6"), ("6", "5"), ("1", "7"), ("0", "8")):
            if char == source:
                found.append(int(text[:index] + target + text[index + 1 :]))
    return found


def burgess_chapters(path: Path) -> list[dict[int, str]]:
    lines = [clean_line(line) for line in path.read_text(encoding="utf-8", errors="replace").splitlines()]
    chapters: list[dict[int, str]] = []
    for start, end in CHAPTER_SPANS:
        stop = min(end, len(lines))
        candidates: list[tuple[int, str]] = []
        index = start - 1
        while index < stop:
            match = _VERSE.match(lines[index])
            if not match:
                index += 1
                continue
            number = int(match.group(1))
            if not 1 <= number <= 90:
                index += 1
                continue
            parts = [match.group(2)]
            index += 1
            while index < stop and lines[index] and not _VERSE.match(lines[index]):
                if ends_sentence(" ".join(parts)) and len(" ".join(parts)) > 80:
                    break
                parts.append(lines[index])
                index += 1
                if len(" ".join(parts)) > 700:
                    break
            text = _verse_text(parts)
            # A year-name in the Jupiter cycle is "36. Vibhava." A verse is a sentence.
            if len(text) >= 45 and text.count(" ") >= 6:
                candidates.append((number, text))
        verses: dict[int, str] = {}
        for number, text in candidates:
            verses.setdefault(number, text)
        for number, text in candidates:
            # 84 is the scan's reading of 34. Leave a number that already
            # sits beside its neighbors, and only fill a hole next to one.
            if (number - 1) in verses or (number + 1) in verses:
                continue
            for alt in _digit_repairs(number):
                if alt in verses or not 1 <= alt <= 90:
                    continue
                if (alt - 1) in verses or (alt + 1) in verses:
                    verses[alt] = text
                    break
        chapters.append(verses)
    return chapters


def our_passages() -> list[dict]:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    rows = []
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            rows.append(
                {
                    "chapter": chapter["number"],
                    "label": shloka["verse_label"],
                    "key": f"{chapter['number']}:{shloka['verse_label']}",
                    "sa": " ".join(shloka["sanskrit"].split()),
                }
            )
    return rows


def align(passages: list[dict], chapters: list[dict[int, str]]) -> list[dict]:
    rows = []
    for passage in passages:
        numbers = label_numbers(passage["label"])
        book = chapters[passage["chapter"] - 1] if passage["chapter"] <= len(chapters) else {}
        if len(numbers) >= 2:
            wanted = list(range(numbers[0], numbers[-1] + 1))
        else:
            wanted = numbers
        english = " ".join(book[number] for number in wanted if number in book).strip()
        rows.append({**passage, "en": english})
    return rows


def hindi_hits(text: str) -> list[str]:
    return [word for word in re.split(r"[^\u0900-\u097F]+", text) if word in HINDI_WORDS]


def devanagari_ok(text: str) -> bool:
    letters = [ch for ch in text if ch.isalpha()]
    if len(letters) < 8:
        return False
    dev = sum(1 for ch in letters if "\u0900" <= ch <= "\u097f")
    return dev / len(letters) >= 0.85


def english_ok(text: str) -> bool:
    letters = [ch for ch in text if ch.isalpha()]
    if len(letters) < 8:
        return False
    lat = sum(1 for ch in letters if ("A" <= ch <= "Z") or ("a" <= ch <= "z"))
    return lat / len(letters) >= 0.8


def _parse_content(content: str) -> list[dict]:
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.rsplit("```", 1)[0]
    data = json.loads(text.strip())
    if isinstance(data, dict):
        data = data.get("items") or data.get("translations") or [data]
    if not isinstance(data, list):
        raise ValueError("model did not return a JSON array")
    return data


def translate_batch(key: str, batch: list[dict]) -> dict[str, dict[str, str]]:
    payload = [{"label": row["key"], "sa": row["sa"], "en": row["en"]} for row in batch]
    user = (
        "Write the meaning of each passage. Reply with a JSON array of "
        '{"label","en","ne"} using the same labels in the same order.\n'
        + json.dumps(payload, ensure_ascii=False)
    )
    body = {
        "model": MODEL,
        "temperature": 0.2,
        "max_tokens": min(16000, max(1500, sum(len(row["en"]) + len(row["sa"]) for row in batch) * 3)),
        "reasoning": {"effort": "none"},
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ],
    }
    request = urllib.request.Request(
        URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "X-Title": "vedic-patro",
        },
        method="POST",
    )
    delay = 2.0
    last_error = "no response"
    for _attempt in range(6):
        if _stop.is_set():
            raise OutOfCredits("stopped")
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                raw = json.loads(response.read().decode("utf-8"))
            content = raw["choices"][0]["message"].get("content") or ""
            parsed = _parse_content(content)
            by_label: dict[str, dict[str, str]] = {}
            for item in parsed:
                label = str(item.get("label") or "").strip()
                english = (item.get("en") or "").strip()
                nepali = (item.get("ne") or "").strip()
                if label and english and nepali:
                    by_label[label] = {"en": english, "ne": nepali}
            bad = []
            for row in batch:
                item = by_label.get(row["key"])
                if not item:
                    continue
                if hindi_hits(item["ne"]) or not devanagari_ok(item["ne"]) or not english_ok(item["en"]):
                    bad.append(row["key"])
                    by_label.pop(row["key"], None)
            if not by_label:
                raise ValueError(f"bad {bad}")
            return by_label
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", errors="replace")[:400]
            last_error = f"HTTP {err.code} {detail}"
            if err.code == 402 and "in_flight" not in detail and "in-flight" not in detail:
                _stop.set()
                raise OutOfCredits(last_error)
            if err.code not in (402, 408, 409, 429, 500, 502, 503):
                break
        except Exception as err:  # noqa: BLE001 — retry transient model or parse failures
            last_error = str(err)
        time.sleep(delay)
        delay = min(delay * 2, 30)
    raise RuntimeError(last_error)


def load_progress() -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    if not PROGRESS.exists():
        return rows
    for line in PROGRESS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        english = (row.get("meaning_en") or "").strip()
        nepali = (row.get("meaning_ne") or "").strip()
        if english and nepali and not hindi_hits(nepali):
            rows[row["label"]] = {"en": english, "ne": nepali}
    return rows


def append_progress(label: str, item: dict[str, str]) -> None:
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(
        {"label": label, "meaning_en": item["en"], "meaning_ne": item["ne"]},
        ensure_ascii=False,
    )
    with _lock:
        with PROGRESS.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")


def apply_progress(rows: dict[str, dict[str, str]]) -> int:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    applied = 0
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            item = rows.get(f"{chapter['number']}:{shloka['verse_label']}")
            if not item:
                continue
            if shloka.get("meaning_en") != item["en"] or shloka.get("meaning_ne") != item["ne"]:
                shloka["meaning_en"] = item["en"]
                shloka["meaning_ne"] = item["ne"]
                applied += 1
    paired = sum(1 for chapter in doc["chapters"] for shloka in chapter["shlokas"] if shloka.get("meaning_ne") and shloka.get("meaning_en"))
    doc["subtitle_ne"] = "१४ अध्याय · अङ्ग्रेजी र नेपाली अर्थ"
    doc["subtitle_en"] = "14 chapters · English and Nepali meaning"
    doc["description_ne"] = "सूर्यसिद्धान्तका मूल श्लोक। अर्थ Burgess को अङ्ग्रेजी अनुवाद हो, र त्यसैको नेपाली। हिन्दी अर्थ देखाइँदैन।"
    doc["description_en"] = "The root verses of the Surya Siddhanta. The meaning is Burgess's English translation, and the same sense in Nepali. The Hindi gloss is not shown."
    doc["source_ne"] = "एबेनेजर बर्जेस, सन् १८६० · मूल श्लोक पाण्डेयको संस्करण"
    doc["source_en"] = "Ebenezer Burgess, 1860. Root text from Pandey's edition."
    if applied or paired:
        tmp = MANIFEST.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(MANIFEST)
    return applied


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--batch", type=int, default=6)
    parser.add_argument("--align-only", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    chapters = burgess_chapters(BURGESS)
    rows = align(our_passages(), chapters)
    missing = [row for row in rows if not row["en"]]
    print(
        "burgess "
        + " ".join(f"{i}:{len(ch)}" for i, ch in enumerate(chapters, 1))
        + f" | passages {len(rows)} with english {len(rows) - len(missing)}",
        flush=True,
    )
    if args.align_only:
        for row in rows[:8]:
            print(f"{row['key']} {row['en'][:160]}", flush=True)
        if missing:
            print("missing:", ", ".join(row["key"] for row in missing[:40]), flush=True)
        return

    done = load_progress()
    pending = [row for row in rows if row["key"] not in done and row["en"]]
    if args.limit is not None:
        pending = pending[: args.limit]
    work = [pending[i : i + args.batch] for i in range(0, len(pending), args.batch)]
    print(f"{len(pending)} passages in {len(work)} requests, already {len(done)}", flush=True)
    if not work:
        if args.apply:
            print(f"wrote {apply_progress(done)} passages", flush=True)
        return

    key = load_key()
    started = time.time()
    finished = 0
    failed: list[str] = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(translate_batch, key, batch): batch for batch in work}
        for future in as_completed(futures):
            batch = futures[future]
            try:
                translated = future.result()
            except OutOfCredits as err:
                print(f"stopped: {err}", flush=True)
                _stop.set()
                break
            except Exception as err:  # noqa: BLE001
                if _stop.is_set():
                    break
                labels = ", ".join(row["key"] for row in batch)
                failed.extend(row["key"] for row in batch)
                print(f"failed {labels}: {err}", flush=True)
                continue
            for row in batch:
                item = translated.get(row["key"])
                if not item:
                    failed.append(row["key"])
                    continue
                append_progress(row["key"], item)
                done[row["key"]] = item
            finished += sum(1 for row in batch if row["key"] in translated)
            elapsed = time.time() - started
            rate = finished / elapsed * 60 if elapsed else 0
            print(f"{finished}/{len(pending)}  {rate:.0f}/min  last {batch[-1]['key']}", flush=True)

    if args.apply and not _stop.is_set():
        print(f"wrote {apply_progress(done)} passages into {MANIFEST.name}", flush=True)
    if failed:
        print("failed: " + ", ".join(failed[:40]), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
