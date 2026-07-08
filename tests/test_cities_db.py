"""Tests for GeoNames city SQLite lookup."""

from __future__ import annotations

import pytest

from services.cities_db import get_popular_cities, resolve_city, search_cities


pytestmark = pytest.mark.skipif(
    not __import__("pathlib").Path(__file__).resolve().parents[1].joinpath("data/cities.db").is_file(),
    reason="cities.db not built — run python scripts/import_cities.py",
)


def test_resolve_kathmandu():
    city = resolve_city("Kathmandu")
    assert city is not None
    assert city["country"] == "NP"
    assert city["timezone"] == "Asia/Kathmandu"
    assert city["population"] > 1_000_000


def test_search_orders_by_population():
    results = search_cities("Sydney", limit=5, country="AU")
    assert results
    assert results[0]["ascii_name"] == "Sydney"
    assert results[0]["country"] == "AU"


def test_nepal_has_broad_city_coverage():
    from services.cities_db import count_cities

    assert count_cities(country="NP") >= 1000


def test_search_nepal_village_by_name():
    results = search_cities("Lamjung", limit=5, country="NP")
    assert results
    assert all(city["country"] == "NP" for city in results)


def test_popular_cities_include_kathmandu():
    names = {c["ascii_name"] for c in get_popular_cities()}
    assert "Kathmandu" in names


def test_legacy_cities_schema_without_admin_columns(tmp_path, monkeypatch):
    """Older cities.db files must not break city_id lookups after a code deploy."""
    import sqlite3

    from engine.astronomy import paths
    from services import cities_db

    db_path = tmp_path / "cities.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE cities (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            ascii_name TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            country TEXT NOT NULL,
            population INTEGER NOT NULL DEFAULT 0,
            timezone TEXT
        )
        """
    )
    conn.execute(
        """
        INSERT INTO cities (id, name, ascii_name, lat, lon, country, population, timezone)
        VALUES (1283240, 'Kathmandu', 'Kathmandu', 27.70169, 85.3206, 'NP', 1440000, 'Asia/Kathmandu')
        """
    )
    conn.commit()
    conn.close()

    monkeypatch.setattr(paths, "cities_db_path", lambda: db_path)
    monkeypatch.setattr(cities_db, "cities_db_path", lambda: db_path)

    city = cities_db.get_city_by_id(1283240)
    assert city is not None
    assert city["timezone"] == "Asia/Kathmandu"
    assert city["admin1"] is None

    results = cities_db.search_cities("Kath", country="NP", limit=3)
    assert results and results[0]["ascii_name"] == "Kathmandu"
