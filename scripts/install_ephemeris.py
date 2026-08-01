#!/usr/bin/env python3
"""Download the Swiss Ephemeris ``.se1`` binary files into data/ephemeris/.

Without these files pyswisseph silently falls back to its built-in Moshier
analytical model (retflag bit SEFLG_MOSEPH). Installing them lets the engine
use the full Swiss binary ephemeris — the same data serious panchang software
relies on — for the entire supported BS range. The engine sets its ephemeris
path automatically once the directory is populated (see
engine.astronomy.engine._configure_ephemeris); no code change is needed after
running this.

Idempotent: files already present with the right size are skipped, so it is
safe to run on every deploy. Files are fetched from the official swisseph
repository maintained by astro.com.

Usage:
    python scripts/install_ephemeris.py          # download any missing files
    python scripts/install_ephemeris.py --deep-bce # also seplm78..138 (≈ BBS 13201 BCE)
    python scripts/install_ephemeris.py --far-ce   # also sepl_30..174 (≈ AD 17191 CE)
    python scripts/install_ephemeris.py --extended # deep BCE + far CE (full Swiss span)
    python scripts/install_ephemeris.py --force  # re-download everything
"""

from __future__ import annotations

import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.paths import ephemeris_path

# Official swisseph mirror (Alois Treindl / astro.com). Raw file access.
BASE_URL = "https://raw.githubusercontent.com/aloistr/swisseph/master/ephe"

# Planet (sepl*) and Moon (semo*) files covering ~600 BC .. 2999 AD — a
# superset of the app's supported BS range (60..3000 ≈ AD 3..2943). Each file
# spans 600 years. Asteroid (seas*) files are omitted: the engine only needs
# Sun, Moon, Mercury–Saturn and the (analytically computed) lunar node.
EPHE_FILES = (
    "seplm06.se1", "seplm12.se1", "seplm18.se1", "seplm24.se1",
    "seplm30.se1", "seplm36.se1", "seplm42.se1", "seplm48.se1",
    "seplm54.se1", "seplm60.se1", "seplm66.se1", "seplm72.se1",
    "sepl_00.se1", "sepl_06.se1",
    "sepl_12.se1", "sepl_18.se1", "sepl_24.se1",
    "semom06.se1", "semom12.se1", "semom18.se1", "semom24.se1",
    "semom30.se1", "semom36.se1", "semom42.se1", "semom48.se1",
    "semom54.se1", "semom60.se1", "semom66.se1", "semom72.se1",
    "semo_00.se1", "semo_06.se1",
    "semo_12.se1", "semo_18.se1", "semo_24.se1",
)

# Each +6 step is another ~600-year BCE block. seplm72 ≈ 7202 BCE; seplm132 ≈
# 13000 BCE (Swiss Ephemeris deep limit). Always install matching semom* pairs.
def _ce_ephe_file(prefix: str, n: int) -> str:
    suffix = f"{n:02d}" if n < 100 else str(n)
    return f"{prefix}{suffix}.se1"


def _moshier_ephe_file(prefix: str, n: int) -> str:
    return f"{prefix}{n}.se1"


# seplm72 ≈ 7202 BCE; seplm138 ≈ 13200 BCE (covers BBS 13201 / 13201 BCE target).
DEEP_BCE_EPHE_FILES = tuple(
    _moshier_ephe_file(prefix, n)
    for n in range(78, 139, 6)
    for prefix in ("seplm", "semom")
)

FAR_CE_EPHE_FILES = tuple(
    _ce_ephe_file(prefix, n)
    for n in range(30, 175, 6)
    for prefix in ("sepl_", "semo_")
)


def _download(name: str, dest: Path) -> int:
    url = f"{BASE_URL}/{name}"
    req = urllib.request.Request(url, headers={"User-Agent": "nepali-holiday-api"})
    with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 (trusted host)
        data = resp.read()
    dest.write_bytes(data)
    return len(data)


def main() -> None:
    argv = sys.argv[1:]
    force = "--force" in argv
    deep_bce = "--deep-bce" in argv or "--extended" in argv
    far_ce = "--far-ce" in argv or "--extended" in argv
    file_list = EPHE_FILES + (DEEP_BCE_EPHE_FILES if deep_bce else ()) + (
        FAR_CE_EPHE_FILES if far_ce else ()
    )
    ephe_dir = ephemeris_path()
    ephe_dir.mkdir(parents=True, exist_ok=True)

    downloaded = skipped = 0
    total_bytes = 0
    for name in file_list:
        dest = ephe_dir / name
        if dest.exists() and dest.stat().st_size > 0 and not force:
            skipped += 1
            continue
        try:
            size = _download(name, dest)
        except (urllib.error.URLError, OSError) as exc:
            print(f"  ✗ {name}: {exc}", file=sys.stderr)
            raise SystemExit(1) from exc
        downloaded += 1
        total_bytes += size
        print(f"  ✓ {name} ({size / 1024:.0f} KB)")

    print(
        f"Ephemeris ready at {ephe_dir}: "
        f"{downloaded} downloaded ({total_bytes / 1048576:.1f} MB), {skipped} up to date"
    )


if __name__ == "__main__":
    main()
