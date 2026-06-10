"""Project paths — no FastAPI or dotenv dependencies."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def cities_db_path() -> Path:
    return DATA_DIR / "cities.db"


def cities_source_path() -> Path:
    return DATA_DIR / "cities15000.txt"


def panchanga_db_path() -> Path:
    return DATA_DIR / "panchanga.db"


# GeoNames id for Kathmandu — default observer city
KATHMANDU_CITY_ID = 1283240
