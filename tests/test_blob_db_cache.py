"""Tests for the DB-backed blob cache (panchāṅga year/month/day), on SQLite."""

from database import db as db_mod
from services.blob_db_cache import db_available, load_blob, save_blob


def _use_sqlite(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'blob.db'}")
    db_mod.get_engine.cache_clear()
    db_mod._session_factory.cache_clear()
    db_mod.init_db()


def _reset_caches():
    db_mod.get_engine.cache_clear()
    db_mod._session_factory.cache_clear()


def test_blob_roundtrip_and_upsert(tmp_path, monkeypatch):
    _use_sqlite(tmp_path, monkeypatch)
    try:
        assert db_available()
        save_blob("year_v1_2085_full_ktm", b"\x1f\x8b-gzip-bytes")
        assert load_blob("year_v1_2085_full_ktm") == b"\x1f\x8b-gzip-bytes"
        # miss on an unknown key
        assert load_blob("nope") is None
        # upsert replaces in place
        save_blob("year_v1_2085_full_ktm", b"new-bytes")
        assert load_blob("year_v1_2085_full_ktm") == b"new-bytes"
    finally:
        _reset_caches()


def test_prune_drops_only_stale_versions(tmp_path, monkeypatch):
    from services.blob_db_cache import prune_stale_blobs
    from services.panchanga_cache import CACHE_PAYLOAD_VERSION as V

    _use_sqlite(tmp_path, monkeypatch)
    try:
        save_blob(f"year_v{V}_2083_full_ktm", b"current")   # current (year scheme)
        save_blob(f"v{V}_month_2083_1_ktm", b"current2")    # current (response scheme)
        save_blob("year_v3_2083_full_ktm", b"old")          # stale
        save_blob("v1_month_2083_1_ktm", b"old2")           # stale
        assert prune_stale_blobs() == 2
        # current survives, stale removed, and a second run is a no-op
        assert load_blob(f"year_v{V}_2083_full_ktm") == b"current"
        assert load_blob("year_v3_2083_full_ktm") is None
        assert prune_stale_blobs() == 0
    finally:
        _reset_caches()


def test_no_db_is_noop(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    _reset_caches()
    try:
        assert not db_available()
        save_blob("k", b"x")  # no-op, no error
        assert load_blob("k") is None
    finally:
        _reset_caches()


def test_year_cache_uses_db_when_available(tmp_path, monkeypatch):
    import gzip
    import json

    from engine.astronomy.location import DEFAULT_LOCATION
    from services import year_cache

    _use_sqlite(tmp_path, monkeypatch)
    try:
        year_cache.write_year_cache(2085, DEFAULT_LOCATION, {"via": "db"}, variant="lite")
        got = year_cache.read_year_cache(2085, DEFAULT_LOCATION, variant="lite")
        assert got is not None
        assert json.loads(gzip.decompress(got)) == {"via": "db"}
    finally:
        _reset_caches()
