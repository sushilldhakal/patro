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
    "seplm06.se1", "sepl_00.se1", "sepl_06.se1",
    "sepl_12.se1", "sepl_18.se1", "sepl_24.se1",
    "semom06.se1", "semo_00.se1", "semo_06.se1",
    "semo_12.se1", "semo_18.se1", "semo_24.se1",
)


def _download(name: str, dest: Path) -> int:
    url = f"{BASE_URL}/{name}"
    req = urllib.request.Request(url, headers={"User-Agent": "nepali-holiday-api"})
    with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 (trusted host)
        data = resp.read()
    dest.write_bytes(data)
    return len(data)


def main() -> None:
    force = "--force" in sys.argv[1:]
    ephe_dir = ephemeris_path()
    ephe_dir.mkdir(parents=True, exist_ok=True)

    downloaded = skipped = 0
    total_bytes = 0
    for name in EPHE_FILES:
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
