#!/usr/bin/env python3
"""Merge the Ved Portal (वेद.com) collection into a Veda's manifest.

Reads ``data/vedcom_source/<veda>.jsonl`` (scripts/scrape_vedcom.py) and, for each mantra
matched by Mandala.Sukta.Mantra, writes into ``data/documents_source/<veda>.json``:

* ``devata``, ``rishi``, ``chhanda``, ``svara`` — the details line, as the site writes it;
* ``sanskrit`` — the site's accented samhita text (ours came from another digitisation and
  has dropped or misplaced letters in places);
* ``padapatha``;
* ``meaning_hi`` — Swami Dayananda Saraswati's Hindi भावार्थ.

Before replacing the text it compares the two (accents, punctuation and spacing folded
away) and prints every mantra where they agree less than 80%, so a numbering mismatch
shows up instead of slipping through. ``--report`` prints that without writing.

    python3 scripts/merge_vedcom.py rigveda --report
    python3 scripts/merge_vedcom.py rigveda
    python3 scripts/merge_vedcom.py yajurveda --report

A mantra whose text agrees under 80% with ours is left untouched (listed in the report);
after checking them, ``--accept 6.19.7,10.88.4`` merges the ones confirmed to be the same
mantra, and ``--force-low`` merges all of them.
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAYANANDA = "स्वामी दयानन्द सरस्वती"
HINDI_BLOCK = 1  # language-id-1 on the site: the Hindi commentaries


def fold(text: str) -> str:
    """Letters only: drop Vedic accents, other marks' variants, danda, digits and spaces."""
    text = unicodedata.normalize("NFC", text or "")
    out = []
    for ch in text:
        code = ord(ch)
        if 0x0951 <= code <= 0x0954 or 0x1CD0 <= code <= 0x1CFF or 0xA8E0 <= code <= 0xA8FF:
            continue
        if ch in "।॥|.,;:-–—'\"()[]ऽ" or ch.isspace() or ch.isdigit() or "०" <= ch <= "९":
            continue
        out.append(ch)
    return "".join(out).replace("ँ", "ं")


def author_name(raw: str | None) -> str:
    """The site writes "हिन्दी - स्वामी दयानन्द सरस्वती" on some Vedas and the bare name on others."""
    return re.sub(r"^\S+\s+[-:]\s+", "", (raw or "").strip())


def hindi_meaning(commentaries: list[dict]) -> str | None:
    """Swami Dayananda's Hindi bhavartha where he wrote one; else the first other Hindi one on the
    page (he did not comment on every mantra — on much of the Rigveda it is Harisharan
    Siddhantalankar's, on the Atharvaveda Kshemakarandas Trivedi's)."""
    hindi = [c for c in commentaries if c.get("language_id") == HINDI_BLOCK and c.get("bhavartha")]
    for c in hindi:
        if author_name(c.get("author")) == DAYANANDA:
            return c["bhavartha"]
    return hindi[0]["bhavartha"] if hindi else None


def similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, fold(a), fold(b), autojunk=False).ratio()


def align_by_order(ours: list[dict], rows: list[dict], window: int = 4) -> dict[str, dict]:
    """Samaveda: pair the site's mantras (in its order, ``seq``) with ours (reading order). Where
    the text disagrees, look a few mantras ahead on either side for the pairing that agrees, so one
    mantra more or less on one side does not shift everything after it."""
    out: dict[str, dict] = {}
    i = j = 0
    while i < len(ours) and j < len(rows):
        if similarity(ours[i]["sanskrit"], rows[j]["sanskrit"]) >= 0.8:
            out[ours[i]["verse_label"]] = rows[j]
            i += 1
            j += 1
            continue
        best = None
        for di in range(window + 1):
            for dj in range(window + 1):
                if (di or dj) and i + di < len(ours) and j + dj < len(rows):
                    if similarity(ours[i + di]["sanskrit"], rows[j + dj]["sanskrit"]) >= 0.8:
                        if best is None or di + dj < sum(best):
                            best = (di, dj)
        if best is None:
            out[ours[i]["verse_label"]] = rows[j]  # paired anyway; the report lists it as low
            i += 1
            j += 1
        else:
            for dj in range(best[1]):
                out[f"site#{rows[j + dj]['seq']}"] = rows[j + dj]  # on the site only
            i += best[0]  # ours skipped: reported as not on the site
            j += best[1]
    for row in rows[j:]:
        out[f"site#{row['seq']}"] = row
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("veda", choices=["rigveda", "atharvaveda", "yajurveda", "samaveda"])
    ap.add_argument("--report", action="store_true", help="compare only; write nothing")
    ap.add_argument("--force-low", action="store_true", help="also merge mantras whose text agrees under 80%%")
    ap.add_argument("--accept", default="", help="comma-separated labels under 80%% checked by hand and to merge, e.g. 6.19.7,10.88.4")
    args = ap.parse_args()
    accepted = {a.strip() for a in args.accept.split(",") if a.strip()}

    src = ROOT / f"data/vedcom_source/{args.veda}.jsonl"
    rows = [json.loads(line) for line in src.read_text(encoding="utf-8").splitlines()]

    path = ROOT / f"data/documents_source/{args.veda}.json"
    raw = path.read_text(encoding="utf-8")
    doc = json.loads(raw)

    ours = {s["verse_label"]: s for c in doc["chapters"] for s in c["shlokas"]}
    if args.veda == "samaveda":
        # The site's Samaveda pages are not numbered like our labels: line up by order.
        site = align_by_order(list(ours.values()), sorted(rows, key=lambda r: r["seq"]))
    else:
        # Newer rows carry their label; the first Rigveda rows only mandala / sukta / mantra.
        site = {row.get("label") or f"{row['mandala']}.{row['sukta']}.{row['mantra']}": row for row in rows}
    matched = low = 0
    lows: list[tuple[float, str]] = []
    for label, shloka in ours.items():
        row = site.get(label)
        if row is None:
            continue
        matched += 1
        ratio = similarity(shloka["sanskrit"], row["sanskrit"])
        if ratio < 0.8:
            # So different it is most likely another mantra under this number: nothing is
            # copied (text or details) until someone has looked; --force-low takes it anyway.
            low += 1
            lows.append((ratio, label))
            if not (args.force_low or label in accepted):
                continue
        if args.report:
            continue
        for key in ("devata", "rishi", "chhanda", "svara"):
            shloka[key] = row.get(key) or None
        shloka["sanskrit"] = row["sanskrit"]
        shloka["padapatha"] = row.get("padapatha") or None
        shloka["meaning_hi"] = hindi_meaning(row.get("commentaries") or [])

    def order(label: str) -> list[int]:
        return [int(p) for p in re.findall(r"\d+", label)]

    missing = sorted(set(ours) - set(site), key=order)
    extra = sorted(set(site) - set(ours), key=order)
    print(f"ours {len(ours)}, site {len(site)}, matched {matched}")
    print(f"not on the site ({len(missing)}): {', '.join(missing[:40])}{' …' if len(missing) > 40 else ''}")
    print(f"on the site only ({len(extra)}): {', '.join(extra[:40])}{' …' if len(extra) > 40 else ''}")
    print(f"text agrees less than 80% ({low}){'' if args.force_low else ' — left as they are'}:")
    for ratio, label in sorted(lows)[:60]:
        print(f"  {label}  {ratio:.2f}")

    if not args.report:
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
