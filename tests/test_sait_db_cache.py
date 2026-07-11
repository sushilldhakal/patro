"""Tests for the DB-backed sait cache (exercised on SQLite)."""

from database import db as db_mod
from engine.astronomy.location import DEFAULT_LOCATION
from services.sait_db_cache import db_available, load_sait_db, save_sait_db


def _use_sqlite(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'sait.db'}")
    db_mod.get_engine.cache_clear()
    db_mod._session_factory.cache_clear()
    db_mod.init_db()


def _reset_caches():
    db_mod.get_engine.cache_clear()
    db_mod._session_factory.cache_clear()


def test_roundtrip_and_version_and_upsert(tmp_path, monkeypatch):
    _use_sqlite(tmp_path, monkeypatch)
    try:
        assert db_available()
        payload = {"bs_year": 2085, "category": "vivah",
                   "months": {"1": [1, 2, 3]}, "source": "computed"}
        save_sait_db(payload, DEFAULT_LOCATION, "3.0.0")
        got = load_sait_db(2085, "vivah", DEFAULT_LOCATION, "3.0.0")
        assert got["months"] == {"1": [1, 2, 3]}
        # stale engine version -> treated as a miss
        assert load_sait_db(2085, "vivah", DEFAULT_LOCATION, "9.9.9") is None
        # upsert replaces in place
        payload["months"] = {"1": [5]}
        save_sait_db(payload, DEFAULT_LOCATION, "3.1.0")
        got2 = load_sait_db(2085, "vivah", DEFAULT_LOCATION, "3.1.0")
        assert got2["months"] == {"1": [5]}
    finally:
        _reset_caches()


def test_no_db_is_noop():
    # DATABASE_URL unset here -> loaders miss, writers no-op, no exception.
    _reset_caches()
    assert not db_available()
    assert load_sait_db(2085, "vivah", DEFAULT_LOCATION, "3.0.0") is None
    save_sait_db({"bs_year": 2085, "category": "vivah", "months": {}},
                 DEFAULT_LOCATION, "3.0.0")
