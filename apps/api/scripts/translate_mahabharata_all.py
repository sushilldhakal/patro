#!/usr/bin/env python3
"""Translate the whole Mahabharata from verse-by-verse English, in batches.

Downloads the Sacred Reads chapter pages, aligns each of our shlokas to that
English, and asks DeepSeek for one English sentence plus its Nepali. Progress
is appended to ``data/vedcom_source/mahabharata_all_deepseek.jsonl`` so a
stopped run continues. Already-filled verses are left as they are.

    python3 scripts/translate_mahabharata_all.py

Requires OPENROUTER_API_KEY in apps/api/.env.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from translate_mahabharata_deepseek import (  # noqa: E402
    OutOfCredits,
    load_key,
    translate_batch,
)

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/documents_source/mahabharata.json"
STORE = ROOT / "data/vedcom_source"
SR_DIR = STORE / "sr"
PROGRESS = STORE / "mahabharata_all_deepseek.jsonl"
ALIGN = STORE / "mahabharata_align.jsonl"
UA = "Mozilla/5.0 (compatible; VedicPatro/1.0; +https://vedicpatro.com)"

# Sacred Reads volume -> our parva numbers, in reading order.
GROUPS = [
    ("adi-sabha", [1], [1, 2]),
    ("vana", [2], [3]),
    ("virata-udyoga", [3], [4, 5]),
    ("bhishma", [4], [6]),
    ("drona", [5], [7]),
    ("karna-stri", [6], [8, 9, 10, 11]),
    ("shanti", [7, 8], [12]),
    ("anushasana-end", [9], [13, 14, 15, 16, 17, 18]),
]

_MATRAS = set("ािीुूृॄॢॣेैोौंःँ़्अऽ")
_lock = threading.Lock()
_stop = threading.Event()


def skeleton(text: str) -> str:
    out = []
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F and ch not in "।॥०१२३४५६७८९॰" and ch not in _MATRAS:
            out.append(ch)
    return "".join(out)


def grams(text: str, size: int = 5) -> frozenset[str]:
    if len(text) < size:
        return frozenset([text]) if text else frozenset()
    return frozenset(text[i : i + size] for i in range(0, len(text) - size + 1))


def strip_speaker(text: str) -> str:
    return re.sub(r"^\[[^\]]+\]\s*", "", text.strip())


def clean(text: str) -> str:
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    delay = 2.0
    last = "no response"
    for _ in range(5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as err:
            last = f"HTTP {err.code}"
            if err.code not in (403, 408, 429, 500, 502, 503):
                break
        except Exception as err:  # noqa: BLE001
            last = str(err)
        time.sleep(delay)
        delay = min(delay * 2, 20)
    raise RuntimeError(f"{url} {last}")


def parse_index(page: str) -> list[dict]:
    pattern = re.compile(
        r"chapters/(\d+)\".*?<span class=\"small text-muted\">\s*(\d+)\s*verses\s*</span>",
        re.S,
    )
    rows = [{"chapter": int(match.group(1)), "verses": int(match.group(2))} for match in pattern.finditer(page)]
    rows.sort(key=lambda row: row["chapter"])
    return rows


def load_index() -> dict[int, list[dict]]:
    path = SR_DIR / "index.json"
    if path.is_file():
        return {int(key): value for key, value in json.loads(path.read_text(encoding="utf-8")).items()}
    index: dict[int, list[dict]] = {}
    for volume in range(1, 10):
        cached = Path(f"/tmp/sr-vol{volume}.html")
        page = cached.read_text(encoding="utf-8") if cached.is_file() else fetch(
            f"https://www.sacredreads.com/books/mahabharata-vol-{volume}"
        )
        index[volume] = parse_index(page)
        print(f"index vol {volume}: {len(index[volume])} chapters", flush=True)
    SR_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(index), encoding="utf-8")
    return index


def chapter_path(volume: int, chapter: int) -> Path:
    return SR_DIR / f"v{volume:02d}c{chapter:04d}.json"


def parse_chapter(page: str) -> list[dict[str, str]]:
    verses = []
    for card in page.split('<article class="verse-card')[1:]:
        sanskrit = re.search(r'class="devanagari sanskrit-text">(.*?)</p>', card, re.S)
        english = re.search(r'class="serif english-text">(.*?)</p>', card, re.S)
        if not sanskrit:
            continue
        verses.append(
            {
                "sa": clean(sanskrit.group(1)),
                "en": clean(english.group(1)) if english else "",
            }
        )
    return verses


def ensure_chapter(volume: int, chapter: int, expected: int) -> list[dict[str, str]]:
    path = chapter_path(volume, chapter)
    if path.is_file():
        try:
            saved = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            saved = []
        if expected <= 0 or len(saved) >= max(1, expected - 2):
            return saved
    page = fetch(f"https://www.sacredreads.com/books/mahabharata-vol-{volume}/chapters/{chapter}")
    verses = parse_chapter(page)
    if expected > 0 and len(verses) + 2 < expected:
        raise RuntimeError(f"vol {volume} ch {chapter} parsed {len(verses)} of {expected}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(verses, ensure_ascii=False), encoding="utf-8")
    return verses


def fetch_all(index: dict[int, list[dict]], workers: int) -> None:
    jobs = [(volume, row["chapter"], row["verses"]) for volume, rows in index.items() for row in rows]
    pending = [job for job in jobs if not _chapter_ready(*job)]
    print(f"fetch {len(pending)} of {len(jobs)} chapters", flush=True)
    if not pending:
        return
    done = 0
    failed: list[str] = []
    started = time.time()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(ensure_chapter, volume, chapter, expected): (volume, chapter) for volume, chapter, expected in pending}
        for future in as_completed(futures):
            volume, chapter = futures[future]
            try:
                future.result()
            except Exception as err:  # noqa: BLE001
                failed.append(f"{volume}.{chapter}")
                print(f"fetch failed {volume}.{chapter}: {err}", flush=True)
                continue
            done += 1
            if done % 25 == 0 or done == len(pending):
                rate = done / max(1, time.time() - started) * 60
                print(f"fetched {done}/{len(pending)}  {rate:.0f} chapters/min", flush=True)
    if failed:
        raise RuntimeError("chapters failed: " + ", ".join(failed[:20]))


def _chapter_ready(volume: int, chapter: int, expected: int) -> bool:
    path = chapter_path(volume, chapter)
    if not path.is_file():
        return False
    try:
        saved = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    return expected <= 0 or len(saved) >= max(1, expected - 2)


def load_sr(index: dict[int, list[dict]], volumes: list[int]) -> list[dict[str, str]]:
    verses = []
    for volume in volumes:
        for row in index[volume]:
            verses.extend(json.loads(chapter_path(volume, row["chapter"]).read_text(encoding="utf-8")))
    return verses


def our_verses(chapters: list[int]) -> list[dict]:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    rows = []
    for number in chapters:
        for shloka in doc["chapters"][number - 1]["shlokas"]:
            rows.append(
                {
                    "key": f"{number}:{shloka['verse_label']}",
                    "sa": shloka["sanskrit"].replace("\n", " ").strip(),
                }
            )
    return rows


def align_group(ours: list[dict], theirs: list[dict[str, str]], band: int) -> list[dict]:
    count_ours, count_theirs = len(ours), len(theirs)
    our_grams = [grams(skeleton(strip_speaker(row["sa"]))) for row in ours]
    their_grams = [grams(skeleton(row["sa"])) for row in theirs]
    negative = -1e9
    scale = (count_theirs - 1) / max(1, count_ours - 1)

    def window(index: int) -> tuple[int, int]:
        center = int(round(index * scale))
        return max(0, center - band), min(count_theirs, center + band + 1)

    def score(left: frozenset[str], right: frozenset[str]) -> float:
        if not left:
            return 0.0
        return len(left & right) / len(left)

    previous = [negative] * count_theirs
    start, stop = window(0)
    for index in range(start, stop):
        previous[index] = score(our_grams[0], their_grams[index]) - 0.01 * (index - start)
    parents: list[list[int] | None] = [None]

    for row in range(1, count_ours):
        start, stop = window(row)
        running = negative
        running_at = -1
        prefix_value = [negative] * count_theirs
        prefix_at = [-1] * count_theirs
        for index in range(count_theirs):
            value = previous[index] + 0.02 * index
            if value > running:
                running = value
                running_at = index
            prefix_value[index] = running
            prefix_at[index] = running_at
        current = [negative] * count_theirs
        parent = [-1] * count_theirs
        left = our_grams[row]
        for index in range(start, stop):
            matched = score(left, their_grams[index])
            stay = previous[index] + matched
            if index == 0 or prefix_at[index - 1] < 0:
                move = negative
                origin = -1
            else:
                move = prefix_value[index - 1] - 0.02 * index + matched
                origin = prefix_at[index - 1]
            if stay >= move:
                current[index] = stay
                parent[index] = index
            else:
                current[index] = move
                parent[index] = origin
        parents.append(parent)
        previous = current

    start, stop = window(count_ours - 1)
    cursor = max(range(start, stop), key=lambda index: previous[index])
    chosen = [0] * count_ours
    for row in range(count_ours - 1, -1, -1):
        chosen[row] = cursor
        if row == 0:
            break
        parent = parents[row]
        nxt = parent[cursor] if parent and 0 <= cursor < len(parent) else -1
        cursor = nxt if nxt >= 0 else cursor

    rows = []
    for row, item in enumerate(ours):
        picked = chosen[row]
        matched = score(our_grams[row], their_grams[picked])
        english = theirs[picked]["en"]
        if picked + 1 < count_theirs and score(our_grams[row], their_grams[picked + 1]) >= 0.25:
            english = (english + " " + theirs[picked + 1]["en"]).strip()
        if matched < 0.2 or not english:
            english = "The commentary note missed this verse. Give the plain meaning of the Sanskrit only."
        rows.append({"key": item["key"], "sa": item["sa"], "en": english, "score": round(matched, 3)})
    return rows


def summarize(name: str, rows: list[dict]) -> None:
    scores = sorted(row["score"] for row in rows)
    if not scores:
        print(f"{name}: empty", flush=True)
        return
    weak = sum(1 for score in scores if score < 0.35)
    mid = scores[len(scores) // 2]
    print(
        f"{name}: {len(rows)} verses, median {mid:.2f}, weak {weak} ({100 * weak / len(rows):.0f}%)",
        flush=True,
    )


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
        if english and nepali:
            rows[row["key"]] = {"en": english, "ne": nepali}
    return rows


def append_progress(key: str, item: dict[str, str]) -> None:
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(
        {"key": key, "meaning_en": item["en"], "meaning_ne": item["ne"]},
        ensure_ascii=False,
    )
    with _lock:
        with PROGRESS.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")


def filled_keys() -> set[str]:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    keys = set()
    for number, chapter in enumerate(doc["chapters"], 1):
        for shloka in chapter["shlokas"]:
            if (shloka.get("meaning_en") or "").strip() and (shloka.get("meaning_ne") or "").strip():
                keys.add(f"{number}:{shloka['verse_label']}")
    return keys


def apply_progress(rows: dict[str, dict[str, str]]) -> int:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    applied = 0
    for number, chapter in enumerate(doc["chapters"], 1):
        for shloka in chapter["shlokas"]:
            item = rows.get(f"{number}:{shloka['verse_label']}")
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


def translate_rows(key: str, rows: list[dict], workers: int, batch_size: int) -> tuple[int, list[str]]:
    done = load_progress()
    already = filled_keys()
    pending = [row for row in rows if row["key"] not in done and row["key"] not in already]
    work = [pending[index : index + batch_size] for index in range(0, len(pending), batch_size)]
    print(f"translate {len(pending)} verses in {len(work)} requests", flush=True)
    if not work:
        return 0, []
    finished = 0
    failed: list[str] = []
    started = time.time()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(
                translate_batch,
                key,
                [{"label": row["key"], "sa": row["sa"], "en": row["en"]} for row in batch],
            ): batch
            for batch in work
        }
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
            saved = 0
            for row in batch:
                item = translated.get(row["key"])
                if not item:
                    failed.append(row["key"])
                    continue
                append_progress(row["key"], item)
                saved += 1
            finished += saved
            elapsed = time.time() - started
            rate = finished / elapsed * 60 if elapsed else 0
            if finished % 80 == 0 or finished == len(pending):
                print(f"{finished}/{len(pending)}  {rate:.0f}/min  last {batch[-1]['key']}", flush=True)
            if finished % 1600 == 0:
                print(f"wrote {apply_progress(load_progress())} verses into the book", flush=True)
    return finished, failed


def aligned_rows() -> list[dict]:
    if not ALIGN.is_file():
        return []
    rows = []
    for line in ALIGN.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def write_align(rows: list[dict]) -> None:
    ALIGN.parent.mkdir(parents=True, exist_ok=True)
    with ALIGN.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch-workers", type=int, default=6)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--band", type=int, default=1200)
    parser.add_argument("--group", action="append", help="Only these group names, in order")
    parser.add_argument("--skip-fetch", action="store_true")
    parser.add_argument("--align-only", action="store_true")
    args = parser.parse_args()

    index = load_index()
    if not args.skip_fetch:
        fetch_all(index, args.fetch_workers)

    groups = GROUPS
    if args.group:
        wanted = set(args.group)
        groups = [group for group in GROUPS if group[0] in wanted]

    saved = {row["key"]: row for row in aligned_rows()}
    api_key = None if args.align_only else load_key()
    failed_all: list[str] = []
    for name, volumes, chapters in groups:
        ours = our_verses(chapters)
        missing = [row for row in ours if row["key"] not in saved]
        if missing:
            theirs = load_sr(index, volumes)
            print(f"align {name}: ours {len(ours)} commentary {len(theirs)}", flush=True)
            aligned = align_group(ours, theirs, args.band)
            summarize(name, aligned)
            for chapter in chapters:
                subset = [row["score"] for row in aligned if row["key"].startswith(f"{chapter}:")]
                subset.sort()
                median = subset[len(subset) // 2] if subset else 0
                print(f"  parva {chapter}: {len(subset)} verses, median {median:.2f}", flush=True)
                if median < 0.4:
                    raise RuntimeError(f"parva {chapter} alignment median {median:.2f} is too low to translate")
            for row in aligned:
                saved[row["key"]] = row
            write_align(list(saved.values()))
        else:
            aligned = [saved[row["key"]] for row in ours]
            print(f"reusing alignment for {name}, {len(aligned)} verses", flush=True)
        if args.align_only:
            continue
        done = load_progress()
        already = filled_keys()
        pending = [row for row in aligned if row["key"] not in done and row["key"] not in already]
        print(f"{name}: pending {len(pending)}", flush=True)
        if not pending or api_key is None:
            continue
        finished, failed = translate_rows(api_key, pending, args.workers, args.batch)
        if failed and not _stop.is_set():
            retry = [row for row in pending if row["key"] in set(failed)]
            print(f"retry {len(retry)}", flush=True)
            _, failed = translate_rows(api_key, retry, max(1, args.workers // 2), max(2, args.batch // 2))
        failed_all.extend(failed)
        written = apply_progress(load_progress())
        print(f"{name}: translated {finished}, failed {len(failed)}, wrote {written}", flush=True)
        if _stop.is_set():
            break
    if not args.align_only:
        print(f"still failed {len(failed_all)}", flush=True)
    if failed_all or _stop.is_set():
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
