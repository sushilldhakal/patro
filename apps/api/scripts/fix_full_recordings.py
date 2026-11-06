"""Make every document's full recording seekable and quick to load.

A listener drags the player's slider half way into an hours-long recording and the
player has to turn that time into a byte offset. Three kinds of file break that:

* **VBR MP3 with no Xing/Info/VBRI header** (some Atharvaveda khandas). Players
  guess the offset from the first frame's bitrate, so a seek lands in the wrong place
  or not at all, and the length shown is wrong. Android's player (ExoPlayer, used by
  expo-audio) treats such a file as unseekable. Fixed by remuxing with a Xing header
  and seek table: the audio frames are copied, not re-encoded, so nothing is lost.
* **WAV** (raw PCM, ~5.6 MB a minute at 24 kHz stereo). Re-encoded to 128 kbps CBR MP3.
* **MP3 above 192 kbps**. Re-encoded to 128 kbps CBR MP3, a fraction of the download.

A remuxed file keeps its key, so nothing else changes. A re-encoded WAV gets a new
``.mp3`` key, and the script points the manifest's ``full_audio_file`` at it after
the upload has gone through. Bump DOCUMENTS_LIST_CACHE_VERSION afterwards so the apps
fetch the new URL.

Usage (from apps/api)::

    python scripts/fix_full_recordings.py                  # report only
    python scripts/fix_full_recordings.py --apply --bucket <r2-bucket>

``--apply`` needs ffmpeg and a working rclone remote (``--remote``, default ``r2``)
with write access to the bucket behind R2_PUBLIC_BASE_URL.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = API_ROOT / "data" / "documents.db"
MANIFEST_DIR = API_ROOT / "data" / "documents_source"
DEFAULT_BASE = "https://pub-34db505dd7474db98d79fb75e870ff22.r2.dev"
HEAD_BYTES = 512 * 1024
MAX_MP3_KBPS = 192
TARGET_KBPS = 128
# r2.dev answers Python's default user agent with 403.
HEADERS = {"User-Agent": "vedic-patro-audio-fixer/1.0"}


@dataclass
class Recording:
    slug: str
    key: str
    problem: str | None = None
    detail: str = ""


def public_base() -> str:
    return (os.environ.get("R2_PUBLIC_BASE_URL") or DEFAULT_BASE).rstrip("/")


def recordings_from_db() -> list[Recording]:
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("SELECT slug, full_audio_key, chapter_full_audio FROM documents").fetchall()
    out: list[Recording] = []
    for slug, key, chapters in rows:
        if key:
            out.append(Recording(slug, key))
        if chapters:
            for chapter_key in json.loads(chapters).values():
                out.append(Recording(slug, chapter_key))
    return out


def fetch_head(url: str) -> tuple[bytes, int]:
    request = urllib.request.Request(url, headers={**HEADERS, "Range": f"bytes=0-{HEAD_BYTES - 1}"})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
        total = response.headers.get("Content-Range", "").rpartition("/")[2]
        return body, int(total) if total.isdigit() else len(body)


def first_frame_offset(head: bytes) -> int:
    if head[:3] == b"ID3" and len(head) >= 10:
        size = (head[6] << 21) | (head[7] << 14) | (head[8] << 7) | head[9]
        return 10 + size
    return 0


def has_seek_header(head: bytes) -> bool:
    """Xing/Info (LAME) or VBRI sits inside the first audio frame."""
    start = first_frame_offset(head)
    frame = head[start : start + 2048]
    return any(tag in frame for tag in (b"Xing", b"Info", b"VBRI"))


def probe_kbps(url: str) -> int | None:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=bit_rate", "-of", "csv=p=0", url],
        capture_output=True,
        text=True,
        check=False,
    )
    value = result.stdout.strip()
    return int(value) // 1000 if value.isdigit() else None


def diagnose(rec: Recording) -> None:
    url = f"{public_base()}/{rec.key}"
    try:
        head, total = fetch_head(url)
    except OSError as exc:
        rec.problem, rec.detail = "missing", str(exc)
        return
    size = f"{total / 1_048_576:.1f} MB"
    if rec.key.lower().endswith(".wav") or head[:4] == b"RIFF":
        rec.problem, rec.detail = "wav", size
        return
    if not has_seek_header(head):
        rec.problem, rec.detail = "no-seek-table", size
        return
    kbps = probe_kbps(url) if shutil.which("ffprobe") else None
    if kbps and kbps > MAX_MP3_KBPS:
        rec.problem, rec.detail = "oversized", f"{size}, {kbps} kbps"
        return
    rec.detail = size


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def upload(local: Path, key: str, remote: str, bucket: str) -> None:
    run(
        [
            "rclone",
            "copyto",
            # A bucket-scoped token may not create buckets; without this a new key fails on CreateBucket.
            "--s3-no-check-bucket",
            str(local),
            f"{remote}:{bucket}/{key}",
            "--header-upload",
            "Content-Type: audio/mpeg",
            "--header-upload",
            "Cache-Control: public, max-age=2592000",
        ]
    )


def point_manifest(slug: str, old_key: str, new_key: str) -> None:
    old_name, new_name = old_key.rsplit("/", 1)[-1], new_key.rsplit("/", 1)[-1]
    for path in MANIFEST_DIR.glob("*.json"):
        text = path.read_text(encoding="utf-8")
        if f'"slug":"{slug}"' not in text.replace(" ", "") or old_name not in text:
            continue
        updated = text.replace(f'"full_audio_file": "{old_name}"', f'"full_audio_file": "{new_name}"')
        updated = updated.replace(f'"full_audio_file":"{old_name}"', f'"full_audio_file":"{new_name}"')
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            print(f"    manifest {path.name}: full_audio_file -> {new_name}")
            return
    print(f"    !! update full_audio_file for {slug} to {new_name} by hand")


def fix(rec: Recording, work: Path, remote: str, bucket: str, backup: Path | None = None) -> None:
    url = f"{public_base()}/{rec.key}"
    source = work / ("source" + Path(rec.key).suffix)
    print(f"  downloading {rec.key}")
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=120) as response:
        with source.open("wb") as out:
            shutil.copyfileobj(response, out)
    fixed = work / "fixed.mp3"
    if rec.problem == "no-seek-table":
        # Copy the frames; the mp3 muxer writes a Xing header with a 100-point seek table.
        # Only the audio stream: embedded cover art would sit in front of the first frame.
        run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-map", "0:a:0", "-c:a", "copy",
             "-write_xing", "1", "-id3v2_version", "3", str(fixed)])
        new_key = rec.key
    else:
        run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-map", "0:a:0", "-c:a", "libmp3lame",
             "-b:a", f"{TARGET_KBPS}k", "-id3v2_version", "3", str(fixed)])
        new_key = rec.key.rsplit(".", 1)[0] + ".mp3"
    head = fixed.read_bytes()[:HEAD_BYTES]
    if not has_seek_header(head):
        raise RuntimeError(f"{rec.key}: output still has no seek header")
    print(f"  uploading {new_key} ({fixed.stat().st_size / 1_048_576:.1f} MB)")
    upload(fixed, new_key, remote, bucket)
    if new_key != rec.key:
        point_manifest(rec.slug, rec.key, new_key)
    if backup:
        kept = backup / rec.key
        kept.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), kept)
    else:
        source.unlink(missing_ok=True)
    fixed.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="fix and upload the files reported")
    parser.add_argument("--bucket", help="R2 bucket name (required with --apply)")
    parser.add_argument("--remote", default="r2", help="rclone remote (default: r2)")
    parser.add_argument("--backup-dir", type=Path, help="keep each original here, under its key, before replacing it")
    parser.add_argument("--only", help="only recordings whose key contains this text")
    args = parser.parse_args()

    records = [r for r in recordings_from_db() if not args.only or args.only in r.key]
    for rec in records:
        diagnose(rec)
        print(f"{(rec.problem or 'ok'):14} {rec.slug:28} {rec.key}  [{rec.detail}]")

    todo = [r for r in records if r.problem in {"no-seek-table", "wav", "oversized"}]
    if not args.apply:
        print(f"\n{len(todo)} to fix. Run again with --apply --bucket <name> to fix and upload them.")
        return 0
    if not args.bucket:
        parser.error("--apply needs --bucket")
    for tool in ("ffmpeg", "rclone"):
        if not shutil.which(tool):
            parser.error(f"{tool} is not installed")

    with tempfile.TemporaryDirectory() as tmp:
        for rec in todo:
            print(f"\n{rec.problem}: {rec.key}")
            fix(rec, Path(tmp), args.remote, args.bucket, args.backup_dir)
    print("\nDone. If any manifest changed, bump DOCUMENTS_LIST_CACHE_VERSION and the request-URL goldens.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
