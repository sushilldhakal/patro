#!/usr/bin/env python3
"""Translate every Rigveda Hindi meaning with IndicTrans2.

The official AI4Bharat repos are gated. These public MIT mirrors are the same
weights and need no Hugging Face account:

Nepali: hari31416/indictrans2-indic-indic-1B-ONNX-fp16 (hin_Deva → npi_Deva)
English: jayyd/NMT_INDIAC_AI4BHARAT_MODEL, a copy of indictrans2-indic-en-1B
         (hin_Deva → eng_Latn)

Both are translations of ``meaning_hi`` (the commentary), so the Nepali
interface and the English interface show the same meaning. Progress is
appended to ``data/vedcom_source/rigveda_mt.jsonl`` and copied into
``documents_source/rigveda.json``. A stopped run continues from the jsonl.

    python3 scripts/translate_rigveda_indictrans.py --limit 3 --lang ne
    python3 scripts/translate_rigveda_indictrans.py
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

# IndicTransToolkit still imports PreTrainedTokenizerBase from tokenization_utils.
# Transformers 5 moved that class. Put it back before the toolkit loads.
import transformers.tokenization_utils as _tok_utils

if not hasattr(_tok_utils, "PreTrainedTokenizerBase"):
    from transformers.tokenization_utils_base import PreTrainedTokenizerBase

    _tok_utils.PreTrainedTokenizerBase = PreTrainedTokenizerBase

from IndicTransToolkit import IndicProcessor

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data/documents_source/rigveda.json"
PROGRESS = ROOT / "data/vedcom_source/rigveda_mt.jsonl"

JOBS = {
    "ne": {
        "model": "hari31416/indictrans2-indic-indic-1B-ONNX-fp16",
        "onnx": True,
        "src": "hin_Deva",
        "tgt": "npi_Deva",
        "field": "meaning_ne",
    },
    "en": {
        "model": "jayyd/NMT_INDIAC_AI4BHARAT_MODEL",
        "src": "hin_Deva",
        "tgt": "eng_Latn",
        "field": "meaning_en",
    },
}

# Source side stays under the model's 256-token window, including the language tag.
MAX_CHARS = 320


def device_name() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def split_text(text: str, limit: int = MAX_CHARS) -> list[str]:
    """Break a long commentary into pieces the model can translate whole."""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= limit:
        return [text]
    mid = len(text) // 2
    cuts = [i for i, ch in enumerate(text) if ch in "।\n" and 0 < i < len(text) - 1]
    if cuts:
        cut = min(cuts, key=lambda i: abs(i - mid))
        return split_text(text[: cut + 1], limit) + split_text(text[cut + 1 :], limit)
    return split_text(text[:limit], limit) + split_text(text[limit:], limit)


def load_progress() -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    if not PROGRESS.exists():
        return rows
    for line in PROGRESS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        rows.setdefault(row["label"], {}).update(
            {k: row[k] for k in ("meaning_ne", "meaning_en") if row.get(k)}
        )
    return rows


def write_progress(rows: dict[str, dict[str, str]]) -> None:
    PROGRESS.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        json.dumps({"label": label, **fields}, ensure_ascii=False)
        for label, fields in rows.items()
    ]
    PROGRESS.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")


def verses() -> list[tuple[str, str]]:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    out = []
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            hindi = (shloka.get("meaning_hi") or "").strip()
            if hindi:
                out.append((shloka["verse_label"], hindi))
    return out


def apply_progress(rows: dict[str, dict[str, str]]) -> int:
    raw = MANIFEST.read_text(encoding="utf-8")
    doc = json.loads(raw)
    applied = 0
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            fields = rows.get(shloka["verse_label"])
            if not fields:
                continue
            changed = False
            for key in ("meaning_ne", "meaning_en"):
                text = fields.get(key)
                if text and shloka.get(key) != text:
                    shloka[key] = text
                    changed = True
            if changed:
                applied += 1
    if applied:
        tmp = MANIFEST.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        tmp.replace(MANIFEST)
    return applied


def translate_batch(model, tokenizer, ip, pieces: list[str], src: str, tgt: str, device: str) -> list[str]:
    batch = ip.preprocess_batch(pieces, src_lang=src, tgt_lang=tgt)
    inputs = tokenizer(
        batch,
        truncation=True,
        padding="longest",
        max_length=256,
        return_tensors="pt",
        return_attention_mask=True,
    ).to(device)
    with torch.inference_mode():
        generated = model.generate(
            **inputs,
            use_cache=True,
            min_length=0,
            max_length=256,
            num_beams=5,
            num_return_sequences=1,
        )
    decoded = tokenizer.batch_decode(
        generated.detach().cpu().tolist(),
        skip_special_tokens=True,
        clean_up_tokenization_spaces=True,
    )
    return ip.postprocess_batch(decoded, lang=tgt)


def run_onnx(lang: str, limit: int | None, apply_every: int) -> None:
    """Indic-to-Indic 1B, FP16 ONNX. Greedy decode; the public copy has no beam search."""
    import importlib.util

    import onnxruntime as ort
    from huggingface_hub import snapshot_download

    job = JOBS[lang]
    available = ort.get_available_providers()
    providers = [p for p in ("CoreMLExecutionProvider", "CPUExecutionProvider") if p in available]
    print(f"loading {job['model']} via {providers}", flush=True)
    snap = snapshot_download(job["model"])
    spec = importlib.util.spec_from_file_location("it2onnx", str(Path(snap) / "translate.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    engine = module.IndicTransONNX(snap, providers=providers)

    rows = load_progress()
    pending = [(label, hindi) for label, hindi in verses() if not rows.get(label, {}).get(job["field"])]
    if limit is not None:
        pending = pending[:limit]
    print(f"{lang}: {len(pending)} verses to translate", flush=True)
    field = job["field"]
    done = 0
    since_apply = 0
    started = time.time()
    for label, hindi in pending:
        parts = []
        for piece in split_text(hindi):
            parts.append(engine.translate(piece, job["src"], job["tgt"], max_new_tokens=256).strip())
        rows.setdefault(label, {})[field] = "\n".join(part for part in parts if part)
        done += 1
        since_apply += 1
        if done % 10 == 0 or done == len(pending):
            write_progress(rows)
            elapsed = time.time() - started
            print(f"{lang}: {done}/{len(pending)}  {done / elapsed:.2f} verses/s", flush=True)
        if since_apply >= apply_every or done == len(pending):
            applied = apply_progress(rows)
            print(f"{lang}: wrote {applied} verses into rigveda.json", flush=True)
            since_apply = 0
    print(f"{lang}: finished {done}", flush=True)


def run_language(lang: str, limit: int | None, batch_size: int, apply_every: int) -> None:
    job = JOBS[lang]
    if job.get("onnx"):
        run_onnx(lang, limit, apply_every)
        return
    device = device_name()
    print(f"loading {job['model']} on {device}", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(job["model"], trust_remote_code=True)
    model = AutoModelForSeq2SeqLM.from_pretrained(job["model"], trust_remote_code=True)
    model = model.to(device).eval()
    ip = IndicProcessor(inference=True)

    rows = load_progress()
    pending = [(label, hindi) for label, hindi in verses() if not rows.get(label, {}).get(job["field"])]
    if limit is not None:
        pending = pending[:limit]
    print(f"{lang}: {len(pending)} verses to translate", flush=True)

    field = job["field"]
    done = 0
    since_apply = 0
    started = time.time()
    # Flatten pieces, translate, then stitch each verse back together.
    buffer: list[tuple[str, list[str]]] = []

    def flush(force_apply: bool = False) -> None:
        nonlocal done, since_apply
        if not buffer:
            return
        flat: list[str] = []
        spans: list[tuple[str, int]] = []
        for label, pieces in buffer:
            spans.append((label, len(pieces)))
            flat.extend(pieces)
        translated: list[str] = []
        for start in range(0, len(flat), batch_size):
            chunk = flat[start : start + batch_size]
            try:
                translated.extend(
                    translate_batch(model, tokenizer, ip, chunk, job["src"], job["tgt"], device)
                )
            except Exception as err:
                # A padded beam on MPS sometimes rejects a batch. One piece at a time still finishes.
                print(f"{lang}: batch failed ({err}); retrying one by one", flush=True)
                for piece in chunk:
                    translated.extend(
                        translate_batch(model, tokenizer, ip, [piece], job["src"], job["tgt"], device)
                    )
        cursor = 0
        for label, count in spans:
            text = "\n".join(part.strip() for part in translated[cursor : cursor + count] if part.strip())
            cursor += count
            rows.setdefault(label, {})[field] = text
            done += 1
            since_apply += 1
        buffer.clear()
        write_progress(rows)
        elapsed = time.time() - started
        rate = done / elapsed if elapsed else 0
        print(f"{lang}: {done}/{len(pending)}  {rate:.2f} verses/s", flush=True)
        if force_apply or since_apply >= apply_every:
            applied = apply_progress(rows)
            print(f"{lang}: wrote {applied} verses into rigveda.json", flush=True)
            since_apply = 0

    for label, hindi in pending:
        buffer.append((label, split_text(hindi)))
        # Keep the generator batch near batch_size pieces.
        if sum(len(pieces) for _, pieces in buffer) >= batch_size:
            flush()
    flush(force_apply=True)
    print(f"{lang}: finished {done}", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["ne", "en", "both"], default="both")
    ap.add_argument("--limit", type=int, default=None, help="translate only the first N pending verses")
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--apply-every", type=int, default=100)
    args = ap.parse_args()
    langs = ["ne", "en"] if args.lang == "both" else [args.lang]
    for lang in langs:
        run_language(lang, args.limit, args.batch, args.apply_every)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
