#!/usr/bin/env python3
"""Collect each mantra's page from वेद.com (Ved Portal, आर्ष साहित्य प्रचार ट्रस्ट).

Collected with the site owner's permission (November 2026). For every mantra of a Veda
it records, as the page gives them:

* the details line — देवता, ऋषि, छन्द, स्वर (Devanagari, as the site writes them);
* the accented samhita text, its transliteration and the padapatha;
* every commentary on the page (author, language block, subject line, अन्वय,
  पदार्थान्वयभाषा, भावार्थभाषा, टिप्पणी).

Output is one JSON object per line in ``data/vedcom_source/<veda>.jsonl``. The run is
resumable: mantras already in the file are skipped. It goes slowly on purpose (two
requests at a time, a pause between them) and says who it is in the User-Agent.

    python3 scripts/scrape_vedcom.py rigveda            # every mantra in our manifest
    python3 scripts/scrape_vedcom.py rigveda --only 1.1  # one sukta, for a test

The mantra list comes from our own manifest (data/documents_source/rigveda.json), and
after the last mantra of each sukta the next number is tried too, so a mantra the site
has and we lack is still collected (and reported by the matcher).
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
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data/vedcom_source"
BASE = "https://xn--j2b3a4c.com"  # वेद.com
USER_AGENT = "VedicPatro-data-sync/1.0 (+https://www.vedicpatro.com; collected with the Ved Portal owner's permission)"
WORKERS = 2
PAUSE_S = 0.4

DETAIL_RE = re.compile(
    r'<span><strong>\s*(देवता|ऋषि|छन्द|स्वर)\s*:\s*</strong>(.*?)</span>', re.S
)
LINK_TEXT_RE = re.compile(r"<a [^>]*>(.*?)</a>", re.S)
BLOCK_RE = re.compile(r'<div class="block-mantra">\s*<p>(.*?)</p>', re.S)
PAD_RE = re.compile(r'<span class="eng-tran-head">\s*(अंग्रेज़ी लिप्यंतरण|पद पाठ)\s*</span>\s*<p>(.*?)</p>', re.S)
LANG_BLOCK_RE = re.compile(r'<div id="language-id-(\d+)-(\d+)" class="bhashya_(?:show|hide)">(.*?)<!-- END language_id -->', re.S)
AUTHOR_RE = re.compile(r'<div class="headline"><h3>(.*?)</h3>', re.S)
SUBJECT_RE = re.compile(r'<div class="mb_subject">\s*<p[^>]*>(.*?)</p>', re.S)
PART_RE = {
    "anvaya": re.compile(r'<div class="anavay">\s*<span[^>]*>.*?</span>(.*?)</div>', re.S),
    "padartha": re.compile(r'<div class="padarth">\s*<span[^>]*>.*?</span>(.*?)</div>', re.S),
    "bhavartha": re.compile(r'<div class="bhavarth">\s*<span[^>]*>.*?</span>(.*?)</div>', re.S),
    "tippani": re.compile(r'<div class="tippani">\s*<span[^>]*>.*?</span>(.*?)</div>', re.S),
}


def clean(fragment: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", fragment)
    text = re.sub(r"</p>\s*<p[^>]*>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).replace("\xa0", " ")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line).strip()


def parse(page: str) -> dict[str, Any] | None:
    mantra = BLOCK_RE.search(page)
    if not mantra or not clean(mantra.group(1)):
        return None
    details: dict[str, str] = {}
    for key, body in DETAIL_RE.findall(page):
        link = LINK_TEXT_RE.search(body)
        details[key] = clean(link.group(1) if link else body)
    extra = {label: clean(text) for label, text in PAD_RE.findall(page)}
    commentaries = []
    for lang_id, idx, body in LANG_BLOCK_RE.findall(page):
        author = AUTHOR_RE.search(body)
        subject = SUBJECT_RE.search(body)
        entry: dict[str, Any] = {
            "language_id": int(lang_id),
            "index": int(idx),
            "author": clean(author.group(1)) if author else None,
            "subject": clean(subject.group(1)) if subject else None,
        }
        for name, rx in PART_RE.items():
            m = rx.search(body)
            entry[name] = clean(m.group(1)) if m else None
        commentaries.append(entry)
    return {
        "devata": details.get("देवता"),
        "rishi": details.get("ऋषि"),
        "chhanda": details.get("छन्द"),
        "svara": details.get("स्वर"),
        "sanskrit": clean(mantra.group(1)),
        "transliteration": extra.get("अंग्रेज़ी लिप्यंतरण"),
        "padapatha": extra.get("पद पाठ"),
        "commentaries": commentaries,
    }


def fetch(path: str) -> str | None:
    url = f"{BASE}/{urllib.parse.quote(path)}"
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as res:
                return res.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return None
            time.sleep(5 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"giving up on {url}")


def targets(veda: str, only: str | None) -> list[tuple[int, int, int]]:
    manifest = json.loads((ROOT / f"data/documents_source/{veda}.json").read_text(encoding="utf-8"))
    out: list[tuple[int, int, int]] = []
    for chapter in manifest["chapters"]:
        for shloka in chapter["shlokas"]:
            parts = [int(p) for p in shloka["verse_label"].split(".")]
            if len(parts) == 3:
                out.append((parts[0], parts[1], parts[2]))
    if only:
        want = tuple(int(p) for p in only.split("."))
        out = [t for t in out if t[: len(want)] == want]
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("veda", choices=["rigveda", "atharvaveda"])
    ap.add_argument("--only", help="limit to a mandala or mandala.sukta, e.g. 1 or 1.1")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{args.veda}.jsonl"
    done: set[tuple[int, int, int]] = set()
    if out_path.exists():
        for line in out_path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            done.add((row["mandala"], row["sukta"], row["mantra"]))

    todo = [t for t in targets(args.veda, args.only) if t not in done]
    # One past the end of each sukta, in case the site has a mantra we lack.
    last: dict[tuple[int, int], int] = {}
    for m, s, v in targets(args.veda, args.only):
        last[(m, s)] = max(last.get((m, s), 0), v)
    probes = [(m, s, v + 1) for (m, s), v in last.items() if (m, s, v + 1) not in done]

    lock = threading.Lock()
    count = {"ok": 0, "missing": 0}

    def work(target: tuple[int, int, int], probe: bool = False) -> None:
        m, s, v = target
        page = fetch(f"{args.veda}/{m}/{s}/{v}")
        time.sleep(PAUSE_S)
        row = parse(page) if page else None
        with lock:
            if row is None:
                if not probe:
                    count["missing"] += 1
                    print(f"missing {m}.{s}.{v}", flush=True)
                return
            row = {"mandala": m, "sukta": s, "mantra": v, "extra": probe, **row}
            with out_path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            count["ok"] += 1
            if probe:
                print(f"extra mantra on the site: {m}.{s}.{v}", flush=True)
            if count["ok"] % 200 == 0:
                print(f"{count['ok']} collected", flush=True)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(pool.map(work, todo))
        list(pool.map(lambda t: work(t, probe=True), probes))
    print(f"done: {count['ok']} collected, {count['missing']} missing, file {out_path}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
