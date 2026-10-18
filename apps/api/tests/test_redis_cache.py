"""Redis tier must be invisible when absent and safe when it breaks."""

from __future__ import annotations

import config
from services.platform import redis_cache


def _reset(monkeypatch, url):
    monkeypatch.setattr(redis_cache, "_client", None)
    monkeypatch.setattr(redis_cache, "_client_failed_at", 0.0)
    if url is None:
        monkeypatch.delenv("REDIS_URL", raising=False)
    else:
        monkeypatch.setenv("REDIS_URL", url)


def test_unset_redis_is_a_noop(monkeypatch):
    _reset(monkeypatch, None)
    assert config.redis_url() is None and not redis_cache.enabled()
    assert redis_cache.get_bytes("k") is None
    redis_cache.set_bytes("k", b"v")  # must not raise
    assert redis_cache.claim_once("warm", 5) is True  # every worker warms, as before
    with redis_cache.build_lock("k") as owner:
        assert owner is True


def test_unreachable_redis_degrades_and_trips_the_breaker(monkeypatch):
    _reset(monkeypatch, "redis://127.0.0.1:1/0")  # nothing listens here
    assert redis_cache.get_bytes("k") is None
    assert redis_cache.claim_once("warm", 5) is True
    assert redis_cache.build_lock("k").__enter__() is True
    assert redis_cache._client_failed_at > 0  # later calls skip Redis for the cooldown


def test_oversized_values_are_not_cached(monkeypatch):
    calls = []

    class Fake:
        def set(self, *a, **k):
            calls.append(a)

    _reset(monkeypatch, "redis://example")
    monkeypatch.setattr(redis_cache, "_client", Fake())
    monkeypatch.setattr(redis_cache, "_MAX_VALUE_BYTES", 10)
    redis_cache.set_bytes("big", b"x" * 11)
    assert calls == []
    redis_cache.set_bytes("small", b"x" * 10)
    assert len(calls) == 1


def test_pool_settings_have_safe_defaults(monkeypatch):
    monkeypatch.delenv("DB_POOL_SIZE", raising=False)
    monkeypatch.delenv("DB_MAX_OVERFLOW", raising=False)
    assert (config.db_pool_size(), config.db_max_overflow()) == (3, 2)
