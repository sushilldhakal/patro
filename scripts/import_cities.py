#!/usr/bin/env python3
"""Download GeoNames cities15000 (if needed) and build data/cities.db."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from services.cities_db import ensure_cities_source, import_cities

DATA_DIR = ROOT / "data"


def main() -> None:
    db_path = DATA_DIR / "cities.db"
    source_path = ensure_cities_source(DATA_DIR / "cities15000.txt")
    count = import_cities(db_path=db_path, source_path=source_path)
    print(f"Import complete: {count} cities -> {db_path}")


if __name__ == "__main__":
    main()
