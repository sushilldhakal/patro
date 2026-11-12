"""Whole-response Redis cache: hits replay the bytes, the wrong things never stick."""

from __future__ import annotations

import gzip
import json

import pytest
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.testclient import TestClient

from app import redis_response_middleware as mw
from services.platform import redis_cache


class FakeRedis:
    def __init__(self):
        self.data: dict[str, bytes] = {}
        self.ttls: dict[str, int] = {}

    def get(self, key):
        return self.data.get(key)

    def set(self, key, value, ex=None, nx=False):
        if nx and key in self.data:
            return False
        self.data[key] = value
        self.ttls[key] = ex
        return True


@pytest.fixture
def fake(monkeypatch):
    client = FakeRedis()
    monkeypatch.setenv("REDIS_URL", "redis://fake")
    monkeypatch.setattr(redis_cache, "_client", client)
    monkeypatch.setattr(redis_cache, "_client_failed_at", 0.0)
    return client


def _app(calls: list[str]) -> TestClient:
    app = FastAPI()
    app.add_middleware(GZipMiddleware, minimum_size=10)
    app.add_middleware(mw.RedisResponseCacheMiddleware)

    @app.get("/api/v1/nepal/sait/2083/month/7")
    def sait():
        calls.append("sait")
        return {"days": list(range(50))}

    @app.get("/api/v1/panchanga/today")
    def today():
        calls.append("today")
        return JSONResponse({"x": "y" * 40}, headers={"Cache-Control": "public, max-age=300, s-maxage=3600"})

    @app.get("/api/v1/panchanga/2026-11-12")
    def day():
        calls.append("day")
        return JSONResponse({"x": "y" * 40}, headers={"Cache-Control": "public, max-age=300, s-maxage=3600"})

    @app.get("/api/v1/private-thing")
    def private():
        calls.append("private")
        return JSONResponse({"x": 1}, headers={"Cache-Control": "private, max-age=120"})

    @app.get("/api/v1/unknown")
    def unknown():
        calls.append("unknown")
        return {"x": 1}

    @app.get("/api/v1/cookie")
    def cookie():
        calls.append("cookie")
        r = JSONResponse({"x": 1}, headers={"Cache-Control": "public, max-age=600"})
        r.set_cookie("a", "b")
        return r

    @app.get("/api/v1/nepal/sait/2083/month/8")
    def failing():
        calls.append("fail")
        return Response(status_code=500)

    @app.get("/api/profiles")
    def profiles():
        calls.append("profiles")
        return JSONResponse({"x": 1}, headers={"Cache-Control": "public, max-age=600"})

    return TestClient(app)


def test_second_request_is_a_hit_with_identical_body(fake):
    calls: list[str] = []
    client = _app(calls)
    first = client.get("/api/v1/nepal/sait/2083/month/7")
    second = client.get("/api/v1/nepal/sait/2083/month/7")
    assert calls == ["sait"]
    assert first.headers["x-cache"] == "MISS" and second.headers["x-cache"] == "HIT"
    assert first.json() == second.json() == {"days": list(range(50))}
    # Stored compressed, for a fixed BS month a day long.
    (key,) = fake.data
    headers, body = mw._unpack(fake.data[key])
    assert dict(headers)[b"content-encoding"] == b"gzip"
    assert json.loads(gzip.decompress(body)) == {"days": list(range(50))}
    assert fake.ttls[key] == 24 * 3600


def test_query_order_does_not_matter_but_values_do(fake):
    calls: list[str] = []
    client = _app(calls)
    client.get("/api/v1/nepal/sait/2083/month/7?a=1&b=2")
    client.get("/api/v1/nepal/sait/2083/month/7?b=2&a=1")
    client.get("/api/v1/nepal/sait/2083/month/7?a=1&b=3")
    assert calls == ["sait", "sait"]


def test_client_without_gzip_gets_plain_bytes_on_miss_and_hit(fake):
    calls: list[str] = []
    client = _app(calls)
    plain = {"Accept-Encoding": "identity"}
    first = client.get("/api/v1/nepal/sait/2083/month/7", headers=plain)
    second = client.get("/api/v1/nepal/sait/2083/month/7", headers=plain)
    for r in (first, second):
        assert "content-encoding" not in r.headers
        assert json.loads(r.content) == {"days": list(range(50))}
        assert int(r.headers["content-length"]) == len(r.content)
    assert calls == ["sait"]


def test_lifetimes_follow_the_route(fake):
    calls: list[str] = []
    client = _app(calls)
    client.get("/api/v1/panchanga/today")
    client.get("/api/v1/panchanga/2026-11-12")
    ttls = sorted(fake.ttls.values())
    # "now" routes keep max-age; a URL naming its day gets s-maxage.
    assert ttls == [300, 3600]


@pytest.mark.parametrize(
    "path",
    ["/api/v1/private-thing", "/api/v1/unknown", "/api/v1/cookie", "/api/v1/nepal/sait/2083/month/8", "/api/profiles"],
)
def test_never_cached(fake, path):
    calls: list[str] = []
    client = _app(calls)
    client.get(path)
    client.get(path)
    assert len(calls) == 2
    assert fake.data == {}


def test_redis_down_is_transparent(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:1/0")
    monkeypatch.setattr(redis_cache, "_client", None)
    monkeypatch.setattr(redis_cache, "_client_failed_at", 0.0)
    calls: list[str] = []
    client = _app(calls)
    assert client.get("/api/v1/nepal/sait/2083/month/7").json() == {"days": list(range(50))}
    assert client.get("/api/v1/nepal/sait/2083/month/7").status_code == 200
    assert calls == ["sait", "sait"]


def test_no_redis_url_means_no_layer(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    calls: list[str] = []
    client = _app(calls)
    r = client.get("/api/v1/nepal/sait/2083/month/7")
    assert "x-cache" not in r.headers
    client.get("/api/v1/nepal/sait/2083/month/7")
    assert calls == ["sait", "sait"]


def test_ttl_rules():
    assert mw.ttl_for("/api/v1/x", {}, "public, max-age=0, s-maxage=3600") is None
    assert mw.ttl_for("/api/v1/x", {}, "no-store") is None
    assert mw.ttl_for("/api/v1/panchanga/year/2083", {}, "public, max-age=86400, s-maxage=31536000") == 7 * 24 * 3600
    assert mw.ttl_for("/api/v1/nepal/festivals", {}, None) == 15 * 60
    assert mw.ttl_for("/api/v1/nepal/festivals", {"year": "2083"}, None) == 24 * 3600
