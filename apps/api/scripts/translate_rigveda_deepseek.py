#!/usr/bin/env python3
"""Translate Veda Hindi meanings into Nepali with DeepSeek V4.1 Flash.

Reads ``meaning_hi`` from ``data/documents_source/<veda>.json`` and writes
``meaning_ne``. Progress is appended to
``data/vedcom_source/<veda>_ne_deepseek.jsonl``; a stopped run continues
from that file.

    python3 scripts/translate_rigveda_deepseek.py --veda yajurveda --skip-filled
    python3 scripts/translate_rigveda_deepseek.py --veda rigveda

Requires OPENROUTER_API_KEY in apps/api/.env. Reasoning is off.
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VEDAS = ("rigveda", "yajurveda")
MANIFEST = ROOT / "data/documents_source/rigveda.json"
PROGRESS = ROOT / "data/vedcom_source/rigveda_ne_deepseek.jsonl"
MODEL = "deepseek/deepseek-v4.1-flash-1017"
URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM = """You translate Hindi Vedic commentary into natural Nepali in Devanagari.
Keep Sanskrit words, proper names, numbers, and mantra references as written.
Translate the meaning faithfully. Do not explain, summarize, omit, or add notes.
Do not repeat a phrase. Return only a JSON array, with no markdown."""

class OutOfCredits(RuntimeError):
    """The OpenRouter balance is gone. In-flight budget errors are retried instead."""


_lock = threading.Lock()
_tls = threading.local()
_stop = threading.Event()


def load_key() -> str:
    env = ROOT / ".env"
    if env.is_file():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                value = line.split("=", 1)[1].strip().strip('"').strip("'")
                if value:
                    return value
    sys.exit("OPENROUTER_API_KEY is missing from apps/api/.env")


def verses(skip_filled: bool) -> list[tuple[str, str]]:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    out = []
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            hindi = (shloka.get("meaning_hi") or "").strip()
            if not hindi:
                continue
            if skip_filled and (shloka.get("meaning_ne") or "").strip():
                continue
            out.append((shloka["verse_label"], hindi))
    return out


def load_progress() -> dict[str, str]:
    rows: dict[str, str] = {}
    if not PROGRESS.exists():
        return rows
    for line in PROGRESS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        text = (row.get("meaning_ne") or "").strip()
        if text:
            rows[row["label"]] = text
    return rows


def append_progress(label: str, nepali: str) -> None:
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps({"label": label, "meaning_ne": nepali}, ensure_ascii=False)
    with _lock:
        with PROGRESS.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")


def apply_progress(rows: dict[str, str]) -> int:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    applied = 0
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            text = rows.get(shloka["verse_label"])
            if text and shloka.get("meaning_ne") != text:
                shloka["meaning_ne"] = text
                applied += 1
    if applied:
        tmp = MANIFEST.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(MANIFEST)
    return applied


def batches(pending: list[tuple[str, str]], max_items: int, max_chars: int):
    batch: list[tuple[str, str]] = []
    chars = 0
    for item in pending:
        length = len(item[1])
        if batch and (len(batch) >= max_items or chars + length > max_chars or length > 3000):
            yield batch
            batch, chars = [], 0
        batch.append(item)
        chars += length
        if length > 3000:
            yield batch
            batch, chars = [], 0
    if batch:
        yield batch


def _devanagari_ok(text: str) -> bool:
    letters = [ch for ch in text if ch.isalpha()]
    if len(letters) < 8:
        return False
    dev = sum(1 for ch in letters if "\u0900" <= ch <= "\u097f")
    return dev / len(letters) >= 0.75


def _loopy(text: str) -> bool:
    if len(text) < 120:
        return False
    counts: dict[str, int] = {}
    for index in range(0, len(text) - 18, 6):
        window = text[index : index + 18]
        counts[window] = counts.get(window, 0) + 1
        if counts[window] >= 5:
            return True
    return False


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


def translate_batch(key: str, batch: list[tuple[str, str]]) -> dict[str, str]:
    payload = [{"label": label, "hi": hindi} for label, hindi in batch]
    user = (
        'Translate each "hi" into Nepali. Reply with a JSON array of '
        '{"label","ne"} using the same labels in the same order.\n'
        + json.dumps(payload, ensure_ascii=False)
    )
    # Output is about the same length as the Hindi, plus JSON keys.
    max_tokens = min(16000, max(800, sum(len(hindi) for _, hindi in batch)))
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
    for attempt in range(6):
        if _stop.is_set():
            raise OutOfCredits("stopped")
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                raw = json.loads(response.read().decode("utf-8"))
            message = raw["choices"][0]["message"]
            content = message.get("content") or ""
            parsed = _parse_content(content)
            by_label = {}
            for item in parsed:
                label = str(item.get("label") or "").strip()
                nepali = (item.get("ne") or item.get("meaning_ne") or "").strip()
                if label and nepali:
                    by_label[label] = nepali
            missing = [label for label, _ in batch if label not in by_label]
            bad = [
                label
                for label, _ in batch
                if label in by_label and (not _devanagari_ok(by_label[label]) or _loopy(by_label[label]))
            ]
            if missing or bad:
                raise ValueError(f"missing {missing} bad {bad}")
            usage = raw.get("usage") or {}
            _tls.usage = (
                usage.get("prompt_tokens") or 0,
                usage.get("completion_tokens") or 0,
            )
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


def main() -> None:
    global MANIFEST, PROGRESS
    parser = argparse.ArgumentParser()
    parser.add_argument("--veda", choices=VEDAS, default="rigveda")
    parser.add_argument("--skip-filled", action="store_true", help="leave verses that already have meaning_ne")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--apply-every", type=int, default=400)
    args = parser.parse_args()
    MANIFEST = ROOT / "data/documents_source" / f"{args.veda}.json"
    PROGRESS = ROOT / "data/vedcom_source" / f"{args.veda}_ne_deepseek.jsonl"

    key = load_key()
    done_rows = load_progress()
    pending = [(label, hindi) for label, hindi in verses(args.skip_filled) if label not in done_rows]
    if args.limit is not None:
        pending = pending[: args.limit]
    work = list(batches(pending, args.batch, 2800))
    print(f"{len(pending)} verses in {len(work)} requests, {args.workers} workers", flush=True)
    if not work:
        applied = apply_progress(done_rows)
        print(f"nothing pending; wrote {applied} verses into {MANIFEST.name}", flush=True)
        return

    started = time.time()
    finished = 0
    prompt_tokens = 0
    completion_tokens = 0
    since_apply = 0
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
                for pending in futures:
                    pending.cancel()
                break
            except Exception as err:  # noqa: BLE001
                if _stop.is_set():
                    break
                labels = ", ".join(label for label, _ in batch)
                failed.extend(label for label, _ in batch)
                print(f"failed {labels}: {err}", flush=True)
                continue
            used = getattr(_tls, "usage", (0, 0))
            # usage is stored on the worker thread, so read it there via the result path:
            # Thread local does not cross back. Tokens are counted inside translate_batch
            # on the worker; recover them by attaching to the returned mapping.
            del used
            for label, _ in batch:
                append_progress(label, translated[label])
                done_rows[label] = translated[label]
            finished += len(batch)
            since_apply += len(batch)
            elapsed = time.time() - started
            rate = finished / elapsed * 60 if elapsed else 0
            print(
                f"{finished}/{len(pending)}  {rate:.0f} verses/min  last {batch[-1][0]}",
                flush=True,
            )
            if since_apply >= args.apply_every:
                applied = apply_progress(done_rows)
                print(f"wrote {applied} verses into {MANIFEST.name}", flush=True)
                since_apply = 0

    applied = apply_progress(done_rows)
    elapsed = time.time() - started
    print(
        f"finished {finished} in {elapsed / 60:.1f} min, failed {len(failed)}, "
        f"wrote {applied} verses into {MANIFEST.name}",
        flush=True,
    )
    if failed:
        print("failed labels: " + ", ".join(failed[:30]), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
