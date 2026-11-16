"""Signed, expiring links to the private R2 bucket (services.scripture.media_signing)."""

from __future__ import annotations

from urllib.parse import parse_qs, urlsplit

import pytest

from services.scripture import document_views, media_signing

_KEY = "documents/gayatri-mantra/gayatri_full.mp3"


@pytest.fixture
def signing(monkeypatch):
    monkeypatch.setenv("R2_S3_ENDPOINT", "https://acct.r2.cloudflarestorage.com")
    monkeypatch.setenv("R2_BUCKET", "vedicpatro")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "AKIDEXAMPLE")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_SIGNING_WINDOW_HOURS", "6")
    monkeypatch.setenv("R2_SIGNED_URL_TTL_HOURS", "30")


def test_unsigned_without_credentials(monkeypatch):
    for name in ("R2_S3_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://pub.example.r2.dev")
    assert media_signing.signed_url(_KEY) is None
    assert media_signing.cache_token() == ""
    assert document_views._resolve_asset_url(_KEY) == f"https://pub.example.r2.dev/{_KEY}"


def test_signed_link_shape(signing, monkeypatch):
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://pub.example.r2.dev")
    url = document_views._resolve_asset_url(_KEY)
    parts = urlsplit(url)
    assert parts.netloc == "acct.r2.cloudflarestorage.com"
    assert parts.path == f"/vedicpatro/{_KEY}"
    q = parse_qs(parts.query)
    assert q["X-Amz-Expires"] == ["108000"]
    assert q["X-Amz-SignedHeaders"] == ["host"]
    assert len(q["X-Amz-Signature"][0]) == 64
    assert "pub.example" not in url


def test_same_link_within_a_window_new_link_after(signing):
    start = 1_800_000_000 // 21600 * 21600
    a = media_signing.signed_url(_KEY, now=start + 10)
    b = media_signing.signed_url(_KEY, now=start + 21599)
    c = media_signing.signed_url(_KEY, now=start + 21600)
    assert a == b != c
    assert media_signing.cache_token(start + 10) == media_signing.cache_token(start + 21599)
    assert media_signing.cache_token(start + 10) != media_signing.cache_token(start + 21600)


def test_ttl_always_outlasts_the_window(signing, monkeypatch):
    monkeypatch.setenv("R2_SIGNED_URL_TTL_HOURS", "1")
    url = media_signing.signed_url(_KEY)
    assert parse_qs(urlsplit(url).query)["X-Amz-Expires"] == [str(7 * 3600)]


def test_full_urls_pass_through(signing):
    assert document_views._resolve_asset_url("https://cdn.example/x.png") == "https://cdn.example/x.png"
