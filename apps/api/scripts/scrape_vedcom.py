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
    python3 scripts/scrape_vedcom.py yajurveda          # adhyaya.mantra → yajurveda/<a>/<m>
    python3 scripts/scrape_vedcom.py atharvaveda        # kanda.sukta.mantra → atharvaveda/<k>/<s>/0/<m>
    python3 scripts/scrape_vedcom.py samaveda           # running number n → samveda/<n> (our n-th verse)

The mantra list comes from our own manifest (data/documents_source/<veda>.json): its labels
are the site's path (Rigveda / Atharvaveda mandala-or-kanda.sukta.mantra, Yajurveda
adhyaya.mantra). After the last mantra of each sukta / adhyaya the next number is tried
too, so a mantra the site has and we lack is still collected (and reported by the matcher).
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
    r'<span><strong>\s*(देवता|ऋषि|छन्द|स्वर|Devata|Rishi|Chhanda|Swara|Kaand)\s*:\s*</strong>(.*?)</span>', re.S
)
# The Samaveda pages write the labels in English.
DETAIL_KEY = {"Devata": "देवता", "Rishi": "ऋषि", "Chhanda": "छन्द", "Swara": "स्वर", "Kaand": "काण्ड"}
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
        details[DETAIL_KEY.get(key, key)] = clean(link.group(1) if link else body)
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
        "kanda": details.get("काण्ड"),  # Samaveda only (आग्नेयं काण्डम् …)
        "sanskrit": clean(mantra.group(1)),
        "transliteration": extra.get("अंग्रेज़ी लिप्यंतरण"),
        "padapatha": extra.get("पद पाठ"),
        "commentaries": commentaries,
    }


def fetch(path: str) -> str | None:
    url = f"{BASE}/{urllib.parse.quote(path, safe='/?&=')}"
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


Target = tuple[int, ...]
# How many label parts each Veda's site path has. Samaveda pages go by running number instead.
PARTS = {"rigveda": 3, "atharvaveda": 3, "yajurveda": 2}
VEDAS = sorted([*PARTS, "samaveda"])


def samaveda_labels() -> list[str]:
    """Our Samaveda labels in reading order: the site's samveda/<n> is our n-th verse (and the
    samaveda_NNNN recording) — Purvarchika, Mahanamni, then Uttararchika, 1 … 1875."""
    manifest = json.loads((ROOT / "data/documents_source/samaveda.json").read_text(encoding="utf-8"))
    return [s["verse_label"] for c in manifest["chapters"] for s in c["shlokas"]]


def site_path(veda: str, target: tuple[int, ...]) -> str:
    """Our label → the page. Atharvaveda pages carry a paryaya slot, 0 for every sukta; Samaveda
    targets are running numbers. (The site's archik / adhyay / khand pages are the Ranayaniya
    shakha's Purvarchika only, 640 mantras — not used.)"""
    if veda == "samaveda":
        return f"samveda/{target[0]}"
    if veda == "atharvaveda":
        kanda, sukta, mantra = target
        return f"atharvaveda/{kanda}/{sukta}/0/{mantra}"
    return f"{veda}/" + "/".join(str(p) for p in target)


def targets(veda: str, only: str | None) -> list[Target]:
    if veda == "samaveda":
        out = [(n,) for n in range(1, len(samaveda_labels()) + 1)]
        if only:
            lo, _, hi = only.partition("-")
            out = [t for t in out if int(lo) <= t[0] <= int(hi or lo)]
        return out
    manifest = json.loads((ROOT / f"data/documents_source/{veda}.json").read_text(encoding="utf-8"))
    out: list[Target] = []
    for chapter in manifest["chapters"]:
        for shloka in chapter["shlokas"]:
            parts = tuple(int(p) for p in shloka["verse_label"].split("."))
            if len(parts) == PARTS[veda]:
                out.append(parts)
    if only:
        want = tuple(int(p) for p in only.split("."))
        out = [t for t in out if t[: len(want)] == want]
    return out


def row_key(row: dict[str, Any]) -> Target:
    """A collected row's target; the first Rigveda rows predate the ``label`` field."""
    if row.get("seq"):
        return (row["seq"],)
    if row.get("label"):
        return tuple(int(p) for p in row["label"].split("."))
    return (row["mandala"], row["sukta"], row["mantra"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("veda", choices=VEDAS)
    ap.add_argument("--only", help="limit to a mandala / adhyaya or a sukta, e.g. 1 or 1.1 (Samaveda: 1-20)")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{args.veda}.jsonl"
    done: set[Target] = set()
    if out_path.exists():
        for line in out_path.read_text(encoding="utf-8").splitlines():
            done.add(row_key(json.loads(line)))

    todo = [t for t in targets(args.veda, args.only) if t not in done]
    # One past the end of each sukta / adhyaya, in case the site has a mantra we lack.
    last: dict[Target, int] = {}
    for t in targets(args.veda, args.only):
        last[t[:-1]] = max(last.get(t[:-1], 0), t[-1])
    probes = [(*head, v + 1) for head, v in last.items() if (*head, v + 1) not in done]
    if args.veda == "samaveda":
        # One running sequence: only the page after our last verse can be one we lack.
        end = (len(samaveda_labels()) + 1,)
        probes = [] if end in done else [end]

    labels = samaveda_labels() if args.veda == "samaveda" else None
    lock = threading.Lock()
    count = {"ok": 0, "missing": 0}

    def work(target: Target, probe: bool = False) -> None:
        if labels is not None:
            label = labels[target[0] - 1] if target[0] <= len(labels) else f"site#{target[0]}"
        else:
            label = ".".join(str(p) for p in target)
        page = fetch(site_path(args.veda, target))
        time.sleep(PAUSE_S)
        row = parse(page) if page else None
        with lock:
            if row is None:
                if not probe:
                    count["missing"] += 1
                    print(f"missing {label}", flush=True)
                return
            names = ("seq",) if labels is not None else ("mandala", "sukta", "mantra") if len(target) == 3 else ("adhyaya", "mantra")
            row = {"label": label, **dict(zip(names, target)), "extra": probe, **row}
            with out_path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            count["ok"] += 1
            if probe:
                print(f"extra mantra on the site: {label}", flush=True)
            if count["ok"] % 200 == 0:
                print(f"{count['ok']} collected", flush=True)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(pool.map(work, todo))
        list(pool.map(lambda t: work(t, probe=True), probes))
    print(f"done: {count['ok']} collected, {count['missing']} missing, file {out_path}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
