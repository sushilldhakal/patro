#!/usr/bin/env python3
"""English commentary to Nepali for one Mahabharata adhyaya, via DeepSeek.

The English note is taken from a verse-by-verse rendering (Sacred Reads
chapter dump). DeepSeek rewrites that note for our verse boundaries and
translates the result into Nepali. Progress is appended to
``data/vedcom_source/mahabharata_<adhyaya>_deepseek.jsonl``.

    python3 scripts/translate_mahabharata_deepseek.py --source /path/to/chapter.txt --align-only
    python3 scripts/translate_mahabharata_deepseek.py --source /path/to/chapter.txt --limit 12
    python3 scripts/translate_mahabharata_deepseek.py --source /path/to/chapter.txt --apply

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
MANIFEST = ROOT / "data/documents_source/mahabharata.json"
MODEL = "deepseek/deepseek-v4.1-flash-1017"
URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM = """You prepare the meaning of Mahabharata verses for a bilingual reader.

Each item is ONE Sanskrit verse plus an English note. The note may also cover a neighboring verse. Write only what this Sanskrit verse says.

"en": one or two plain English sentences for this verse alone.
"ne": that same meaning in natural Nepali, in Devanagari.

Nepali must be Nepali. Use र, छ, छन्, हो, तपाईं, उनको, छोरा, भने, बसेका, मा, लाई, बाट.
Do not use these Hindi words: है, हैं, था, थे, थी, और, यह, वह, नहीं, आप, अपने, किया, रहा, रही, एवं, उद्घोषणा, सम्भाषण, बसिरहेका.

In the Nepali, keep these names in Devanagari: नारायण, नर, सरस्वती, लोमहर्षण, उग्रश्रवा, सौति, शौनक, जनमेजय, परीक्षित, वैशम्पायन, कृष्णद्वैपायन.
In the English, use: Narayana, Nara, Sarasvati, Lomaharshana, Ugrashrava, Sauti, Shaunaka, Janamejaya, Parikshit, Vaishampayana, Krishna Dvaipayana.

नरोत्तम describes Nara. It is not a second person.
पारिक्षित means the son of Parikshit, and that son is Janamejaya. पार्थिवेन्द्र is a title of that same king.
सूत उवाच means Sauti said.

Do not add notes. Return only a JSON array of {"label","en","ne"} in the same order."""

HINDI_WORDS = {
    "है",
    "हैं",
    "था",
    "थे",
    "थी",
    "और",
    "यह",
    "वह",
    "नहीं",
    "आप",
    "अपने",
    "किया",
    "रहा",
    "रही",
    "एवं",
    "उद्घोषणा",
    "सम्भाषण",
    "बसिरहेका",
    "चाहिए",
    "चाहिये",
}

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


def norm(text: str) -> str:
    out = []
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F and ch not in "।॥०१२३४५६७८९॰":
            out.append(ch)
    return "".join(out)


_MATRAS = set("ािीुूृॄॢॣेैोौंःँ़्अ")


def skeleton(text: str) -> str:
    return "".join(ch for ch in norm(text) if ch not in _MATRAS)


def overlap(left: str, right: str, size: int = 5) -> float:
    if len(left) < size or len(right) < size:
        return 0.0
    left_grams = {left[i : i + size] for i in range(len(left) - size + 1)}
    right_grams = {right[i : i + size] for i in range(len(right) - size + 1)}
    return len(left_grams & right_grams) / len(left_grams)


def parse_block(number: str, body: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current = ""
    for line in body.splitlines():
        heading = line.strip().rstrip(":")
        if heading in {"Sanskrit", "English", "Hindi", "Nepali"}:
            current = heading.lower()
            sections.setdefault(current, [])
            continue
        if current:
            sections.setdefault(current, []).append(line)
    sanskrit = "\n".join(sections.get("sanskrit", [])).strip()
    english = "\n".join(sections.get("english", [])).strip()
    if sanskrit and not english:
        sanskrit, english = split_sanskrit_english(sanskrit)
    elif not sanskrit:
        sanskrit, english = split_sanskrit_english(body)
    return {"n": number, "sa": sanskrit, "en": english, "key": norm(sanskrit)}


def split_sanskrit_english(text: str) -> tuple[str, str]:
    sans: list[str] = []
    eng: list[str] = []
    mode = "sa"
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped in {"Sanskrit", "English", "Hindi", "Nepali"}:
            continue
        dev = sum(1 for ch in stripped if "\u0900" <= ch <= "\u097f")
        lat = sum(1 for ch in stripped if ("A" <= ch <= "Z") or ("a" <= ch <= "z"))
        if lat > dev and lat > 8:
            mode = "en"
        if mode == "sa" and dev >= lat:
            sans.append(stripped)
        else:
            eng.append(stripped)
    return "\n".join(sans), "\n".join(eng)


def parse_source(text: str) -> list[dict[str, str]]:
    parts = re.split(r"\n\s*Verse\s+(\d+)\s*☆?\s*\n", text)
    blocks: list[dict[str, str]] = []
    if "Sanskrit" in parts[0] or "नारायण" in parts[0]:
        blocks.append(parse_block("1", parts[0]))
    iterator = iter(parts[1:])
    for number, body in zip(iterator, iterator):
        blocks.append(parse_block(number, body))
    return [block for block in blocks if block["key"] and block["en"]]


def our_adhyaya(number: int) -> list[dict]:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    verses = []
    for shloka in doc["chapters"][0]["shlokas"]:
        if shloka.get("sukta_number") != number:
            if verses:
                break
            continue
        verses.append(shloka)
    return verses


def align(verses: list[dict], blocks: list[dict[str, str]]) -> list[dict]:
    """Monotonic match. Several of our shlokas may share one commentary verse."""
    ours = [skeleton(shloka["sanskrit"]) for shloka in verses]
    theirs = [skeleton(block["key"]) for block in blocks]
    scores = [[overlap(ours[i], theirs[j]) for j in range(len(blocks))] for i in range(len(verses))]
    if not verses or not blocks:
        return []
    negative = -1e9
    best_at = [[negative] * len(blocks) for _ in verses]
    came_from = [[-1] * len(blocks) for _ in verses]
    for index in range(min(len(blocks), 8)):
        best_at[0][index] = scores[0][index] - 0.03 * index
    for row in range(1, len(verses)):
        running = negative
        running_at = -1
        prefix = []
        for index in range(len(blocks)):
            value = best_at[row - 1][index] + 0.04 * index
            if value > running:
                running = value
                running_at = index
            prefix.append((running, running_at))
        for index in range(len(blocks)):
            stay = best_at[row - 1][index] + scores[row][index]
            if index == 0:
                move = negative
                origin = -1
            else:
                move = prefix[index - 1][0] - 0.04 * index + scores[row][index]
                origin = prefix[index - 1][1]
            if stay >= move:
                best_at[row][index] = stay
                came_from[row][index] = index
            else:
                best_at[row][index] = move
                came_from[row][index] = origin
    chosen = [0] * len(verses)
    cursor = max(range(len(blocks)), key=lambda index: best_at[-1][index])
    for row in range(len(verses) - 1, -1, -1):
        chosen[row] = cursor
        previous = came_from[row][cursor]
        if previous != -1:
            cursor = previous
    rows = []
    for row, shloka in enumerate(verses):
        block = blocks[chosen[row]]
        score = scores[row][chosen[row]]
        if score < 0.2:
            english = "The commentary note missed this verse. Give the plain meaning of the Sanskrit only."
        else:
            english = block["en"]
            if chosen[row] + 1 < len(blocks) and scores[row][chosen[row] + 1] >= 0.25:
                english = english + "\n" + blocks[chosen[row] + 1]["en"]
        rows.append(
            {
                "label": shloka["verse_label"],
                "sa": shloka["sanskrit"].replace("\n", " ").strip(),
                "en": english,
                "sr": block["n"],
                "score": round(score, 3),
            }
        )
    return rows


def hindi_hits(text: str) -> list[str]:
    hits = []
    for word in re.split(r"[^\u0900-\u097F]+", text):
        if word in HINDI_WORDS:
            hits.append(word)
    return hits


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
    payload = [{"label": row["label"], "sa": row["sa"], "en": row["en"]} for row in batch]
    user = (
        "Write the meaning of each verse. Reply with a JSON array of "
        '{"label","en","ne"} using the same labels in the same order.\n'
        + json.dumps(payload, ensure_ascii=False)
    )
    max_tokens = min(16000, max(1200, sum(len(row["en"]) + len(row["sa"]) for row in batch) * 2))
    body = {
        "model": MODEL,
        "temperature": 0.2,
        "max_tokens": max_tokens,
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
            missing = [row["label"] for row in batch if row["label"] not in by_label]
            bad = []
            for row in batch:
                item = by_label.get(row["label"])
                if not item:
                    continue
                hits = hindi_hits(item["ne"])
                if hits or not devanagari_ok(item["ne"]) or not english_ok(item["en"]):
                    bad.append(row["label"])
                    by_label.pop(row["label"], None)
            if not by_label:
                raise ValueError(f"missing {missing} bad {bad}")
            return by_label
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", errors="replace")[:400]
            last_error = f"HTTP {err.code} {detail}"
            if err.code == 402 and "in_flight" not in detail and "in-flight" not in detail:
                _stop.set()
                raise OutOfCredits(last_error)
            if err.code not in (402, 408, 409, 429, 500, 502, 503):
                break
        except Exception as err:  # noqa: BLE001 — retry transient model/parse failures
            last_error = str(err)
        time.sleep(delay)
        delay = min(delay * 2, 30)
    raise RuntimeError(last_error)


def progress_path(adhyaya: int) -> Path:
    return ROOT / "data/vedcom_source" / f"mahabharata_{adhyaya}_deepseek.jsonl"


def load_progress(path: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        english = (row.get("meaning_en") or "").strip()
        nepali = (row.get("meaning_ne") or "").strip()
        if english and nepali:
            rows[row["label"]] = {"en": english, "ne": nepali}
    return rows


def append_progress(path: Path, label: str, item: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(
        {"label": label, "meaning_en": item["en"], "meaning_ne": item["ne"]},
        ensure_ascii=False,
    )
    with _lock:
        with path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")


def apply_progress(rows: dict[str, dict[str, str]]) -> int:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    applied = 0
    for shloka in doc["chapters"][0]["shlokas"]:
        item = rows.get(shloka["verse_label"])
        if not item:
            continue
        if shloka.get("meaning_en") != item["en"] or shloka.get("meaning_ne") != item["ne"]:
            shloka["meaning_en"] = item["en"]
            shloka["meaning_ne"] = item["ne"]
            applied += 1
    if applied:
        tmp = MANIFEST.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(MANIFEST)
    return applied


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--adhyaya", type=int, default=1)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--batch", type=int, default=6)
    parser.add_argument("--align-only", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--min-score", type=float, default=0.34)
    args = parser.parse_args()

    blocks = parse_source(args.source.read_text(encoding="utf-8"))
    verses = our_adhyaya(args.adhyaya)
    rows = align(verses, blocks)
    weak = [row for row in rows if row["score"] < args.min_score or not row["en"]]
    print(
        f"source blocks {len(blocks)}, adhyaya {args.adhyaya} verses {len(rows)}, weak {len(weak)}",
        flush=True,
    )
    if args.align_only:
        for row in rows[:12]:
            print(f"{row['label']} sr={row['sr']} score={row['score']} {row['en'][:140]}", flush=True)
        if weak:
            print("weak:", ", ".join(f"{row['label']}:{row['score']}" for row in weak[:40]), flush=True)
        return

    path = progress_path(args.adhyaya)
    done = load_progress(path)
    pending = [row for row in rows if row["label"] not in done and row["score"] >= args.min_score and row["en"]]
    if args.limit is not None:
        pending = pending[: args.limit]
    work = [pending[i : i + args.batch] for i in range(0, len(pending), args.batch)]
    print(f"{len(pending)} verses in {len(work)} requests", flush=True)
    if not work:
        if args.apply:
            print(f"wrote {apply_progress(done)} verses", flush=True)
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
                labels = ", ".join(row["label"] for row in batch)
                failed.extend(row["label"] for row in batch)
                print(f"failed {labels}: {err}", flush=True)
                continue
            for row in batch:
                item = translated[row["label"]]
                append_progress(path, row["label"], item)
                done[row["label"]] = item
            finished += len(batch)
            elapsed = time.time() - started
            rate = finished / elapsed * 60 if elapsed else 0
            print(f"{finished}/{len(pending)}  {rate:.0f}/min  last {batch[-1]['label']}", flush=True)

    if args.apply and not failed and not _stop.is_set():
        print(f"wrote {apply_progress(done)} verses into {MANIFEST.name}", flush=True)
    if failed:
        print("failed labels: " + ", ".join(failed[:40]), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
