"""Tests for panchanga SQLite cache."""

from __future__ import annotations

import tempfile
from datetime import date
from pathlib import Path

import pytest

from core.location import DEFAULT_LOCATION
from panchanga.daily import get_daily_panchanga
from services import panchanga_cache


@pytest.fixture()
def temp_panchanga_db(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "panchanga.db"
        monkeypatch.setattr(panchanga_cache, "panchanga_db_path", lambda: db_path)
        monkeypatch.setenv("PANCHANGA_CACHE", "true")
        yield db_path


def test_cache_miss_then_hit(temp_panchanga_db):
    target = date(2026, 6, 10)
    first = get_daily_panchanga(target, DEFAULT_LOCATION)
    assert first["_from_cache"] is False

    second = get_daily_panchanga(target, DEFAULT_LOCATION)
    assert second["_from_cache"] is True
    assert second["tithi"]["name"] == first["tithi"]["name"]
    assert temp_panchanga_db.is_file()


def test_cache_stats_after_write(temp_panchanga_db):
    get_daily_panchanga(date(2026, 1, 1), DEFAULT_LOCATION)
    stats = panchanga_cache.cache_stats()
    assert stats["rows"] == 1
    assert stats["enabled"] is True
