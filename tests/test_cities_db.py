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
