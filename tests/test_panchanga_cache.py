"""Tests for panchanga SQLite cache."""

from __future__ import annotations

import tempfile
from datetime import date
from pathlib import Path

import pytest

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import get_daily_panchanga
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


def test_stale_cache_without_lagna_is_ignored(temp_panchanga_db):
    import json
    from datetime import datetime, timezone

    target = date(2026, 6, 10)
    location_key, city_id = panchanga_cache.resolve_cache_keys(DEFAULT_LOCATION)
    stale = {
        "tithi": {"name": "Pratipada", "next": {"name": "Dwitiya"}},
        "nakshatra": {"name": "Ashwini", "next": {"name": "Bharani"}},
        "yoga": {"name": "Vishkumbha", "next": {"name": "Priti"}},
        "karana": {"name": "Bava", "next": {"name": "Balava"}},
        "ritu": {"name": "Grishma", "name_ne": "ग्रीष्म"},
        "planets": [],
        "_cache_version": 1,
    }
    panchanga_cache.ensure_schema()
    with panchanga_cache._connect() as conn:
        conn.execute(
            """
            INSERT INTO panchanga_cache (city_id, location_key, date, payload_json, computed_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                city_id,
                location_key,
                target.isoformat(),
                json.dumps(stale),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()

    assert panchanga_cache.get_cached_panchanga(target, DEFAULT_LOCATION) is None

    fresh = get_daily_panchanga(target, DEFAULT_LOCATION)
    assert fresh["_from_cache"] is False
    assert "lagna" in fresh
    assert fresh["lagna"]["name_ne"]


def test_row_from_a_prior_cache_version_is_treated_as_stale(temp_panchanga_db):
    """A cached row does not automatically pick up a fixed calculation just
    because the code was redeployed — the cache is a git-committed SQLite
    file, so it survives deploys. Only a CACHE_PAYLOAD_VERSION bump forces
    recomputation; this guards against silently shipping a logic fix (e.g.
    a corrected timezone or node convention) that never reaches production
    because the stale row was never invalidated."""
    import json
    from datetime import datetime, timezone

    target = date(2026, 6, 10)
    first = get_daily_panchanga(target, DEFAULT_LOCATION)
    assert first["_from_cache"] is False

    location_key, city_id = panchanga_cache.resolve_cache_keys(DEFAULT_LOCATION)
    with panchanga_cache._connect() as conn:
        row = conn.execute(
            "SELECT payload_json FROM panchanga_cache WHERE location_key = ? AND date = ?",
            (location_key, target.isoformat()),
        ).fetchone()
        payload = json.loads(row["payload_json"])
        payload["_cache_version"] = panchanga_cache.CACHE_PAYLOAD_VERSION - 1
        conn.execute(
            """
            UPDATE panchanga_cache SET payload_json = ?, computed_at = ?
            WHERE location_key = ? AND date = ?
            """,
            (
                json.dumps(payload),
                datetime.now(timezone.utc).isoformat(),
                location_key,
                target.isoformat(),
            ),
        )
        conn.commit()

    assert panchanga_cache.get_cached_panchanga(target, DEFAULT_LOCATION) is None
    second = get_daily_panchanga(target, DEFAULT_LOCATION)
    assert second["_from_cache"] is False
