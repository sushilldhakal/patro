"""Cached document payloads carry bucket URLs, so the cache key must follow the bucket setting."""

from __future__ import annotations

from api import documents


def test_cache_version_changes_with_the_bucket_url(monkeypatch):
    monkeypatch.delenv("R2_PUBLIC_BASE_URL", raising=False)
    unset = documents._cache_version()
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://pub-a.r2.dev")
    a = documents._cache_version()
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://pub-b.r2.dev")
    b = documents._cache_version()
    assert len({unset, a, b}) == 3


def test_cache_version_is_stable_for_one_bucket_url(monkeypatch):
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://pub-a.r2.dev/")
    first = documents._cache_version()
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://pub-a.r2.dev")
    assert documents._cache_version() == first  # trailing slash is normalised away
