"""Project paths — no FastAPI or dotenv dependencies."""

from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def cities_db_path() -> Path:
    return DATA_DIR / "cities.db"


def cities_source_path() -> Path:
    return DATA_DIR / "cities15000.txt"


def cities_db_version_path() -> Path:
    return DATA_DIR / "cities_db_version"


def panchanga_db_path() -> Path:
    return DATA_DIR / "panchanga.db"


def kundali_db_path() -> Path:
    return DATA_DIR / "kundali.db"


def ephemeris_path() -> Path:
    """Directory holding the Swiss Ephemeris ``.se1`` binary files.

    Overridable with ``SWISSEPH_EPHE_PATH`` so a deployment can point at a
    shared/mounted ephemeris directory. Defaults to ``data/ephemeris``.
    Kept dependency-free (no dotenv) so the engine can import it early.
    """
    override = os.environ.get("SWISSEPH_EPHE_PATH", "").strip()
    return Path(override) if override else DATA_DIR / "ephemeris"


# GeoNames id for Kathmandu — default observer city
KATHMANDU_CITY_ID = 1283240
