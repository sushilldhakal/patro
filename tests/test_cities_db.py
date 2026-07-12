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


def test_popular_city_ids_resolve_to_expected_cities():
    """Guard against id drift: each curated id must resolve to its intended city.

    GeoNames ids are globally stable, so a mismatch means a wrong id was pasted
    (this caught 6 stale ids, e.g. 1282951 pointing at 'Palun' not 'Pokhara')."""
    from services.cities_db import POPULAR_CITY_IDS, get_city_by_id

    # (id, expected ascii_name, expected country)
    expected = [
        (1283240, "Kathmandu", "NP"),
        (1282898, "Pokhara", "NP"),
        (1283613, "Bharatpur", "NP"),
        (1282931, "Patan", "NP"),        # Lalitpur — filed under Patan in GeoNames
        (1283582, "Biratnagar", "NP"),
        (1283562, "Butwal", "NP"),
        (1283460, "Dharan", "NP"),
        (6941099, "Nepalgunj", "NP"),
        (1283095, "Bhimdatta", "NP"),
        (1275339, "Mumbai", "IN"),
        (1273294, "Delhi", "IN"),
        (2147714, "Sydney", "AU"),
        (5128581, "New York City", "US"),
    ]
    assert list(POPULAR_CITY_IDS) == [e[0] for e in expected]
    for city_id, name, country in expected:
        row = get_city_by_id(city_id)
        assert row is not None, f"{city_id} missing from cities.db"
        assert row["ascii_name"] == name, f"{city_id} -> {row['ascii_name']}, expected {name}"
        assert row["country"] == country


def test_nearest_city_global_snaps_far_point_to_a_city():
    """A point with no town nearby must still resolve to a named city, not None."""
    from services.cities_db import nearest_city_global

    # Mid-Bay-of-Bengal: no populated place for hundreds of km. The unbounded
    # resolver must still return the nearest coastal city rather than giving up.
    city = nearest_city_global(15.0, 88.0)
    assert city is not None
    assert city["ascii_name"]
    assert city["population"] >= 1


def test_nearest_city_global_returns_kathmandu_for_ktm_coords():
    from services.cities_db import nearest_city_global

    city = nearest_city_global(27.7017, 85.3206, country="NP")
    assert city is not None
    assert city["country"] == "NP"
    assert city["ascii_name"] == "Kathmandu"


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


def test_kanchanpur_search_prefers_bhimdatta_sudurpashchim():
    """'Kanchanpur' must not resolve to inland GeoNames villages near 81–87°E."""
    results = search_cities("Kanchanpur", limit=5, country="NP")
    assert results
    top = results[0]
    assert top["id"] == 1283095
    assert abs(top["lon"] - 80.17715) < 0.01
    assert "Bhimdatta" in top["ascii_name"]


def test_kanyam_to_kanchanpur_deshaantar_is_about_31_minutes():
    """Classical 4 min/° from Kanyam Jhapa (~88.09°) to Bhimdatta (~80.18°) ≈ 31.5 min."""
    from zoneinfo import ZoneInfo

    from engine.astronomy.swiss_eph import calculate_sunrise
    from engine.vedic.bikram_sambat import iter_bs_month_days

    ktm = ZoneInfo("Asia/Kathmandu")
    greg = next(g for d, g in iter_bs_month_days(2083, 3) if d == 24)
    kanyam = resolve_city("Kanyam", country="NP")
    kanchanpur = resolve_city("Kanchanpur", country="NP")
    assert kanyam is not None and kanchanpur is not None
    assert kanchanpur["id"] == 1283095

    east = calculate_sunrise(
        greg, kanyam["lat"], kanyam["lon"], timezone_name="Asia/Kathmandu",
    ).astimezone(ktm)
    west = calculate_sunrise(
        greg, kanchanpur["lat"], kanchanpur["lon"], timezone_name="Asia/Kathmandu",
    ).astimezone(ktm)
    delta_min = (west - east).total_seconds() / 60.0
    expected = (kanyam["lon"] - kanchanpur["lon"]) * 4.0
    assert abs(delta_min - expected) < 0.05
    assert 31.0 <= delta_min <= 32.5
