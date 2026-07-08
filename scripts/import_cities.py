#!/usr/bin/env python3
"""Download GeoNames data (if needed) and build data/cities.db."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from services.cities_db import (
    CITIES_DB_VERSION,
    count_cities,
    ensure_cities_source,
    import_cities,
    needs_cities_reimport,
)

DATA_DIR = ROOT / "data"


def main() -> None:
    db_path = DATA_DIR / "cities.db"
    if not needs_cities_reimport():
        np_count = count_cities(country="NP")
        total = count_cities()
        print(
            f"cities.db is up to date (version {CITIES_DB_VERSION}): "
            f"{total} cities ({np_count} in Nepal)"
        )
        return

    source_path = ensure_cities_source(DATA_DIR / "cities15000.txt")
    count = import_cities(db_path=db_path, source_path=source_path)
    np_count = count_cities(country="NP")
    print(
        f"Import complete: {count} cities ({np_count} in Nepal) -> {db_path} "
        f"(version {CITIES_DB_VERSION})"
    )


if __name__ == "__main__":
    main()
