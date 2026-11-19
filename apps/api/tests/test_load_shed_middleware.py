"""Load shedding: computing requests are capped per lane; the rest get a fast 503."""

from __future__ import annotations

import asyncio

import httpx
from fastapi import FastAPI

from app.load_shed_middleware import LoadShedMiddleware, lane_for


def test_lanes():
    assert lane_for("/v1/kundali/detail") == "personal"
    assert lane_for("/v1/panchanga/rashifal/personal") == "personal"
    assert lane_for("/v1/nepal/sait/2083/vivah/personalize") == "personal"
    assert lane_for("/v1/nepal/sait/2083/month/8") == "shared"
    assert lane_for("/v1/panchanga/rashifal") == "shared"
    assert lane_for("/v1/documents/gita/chapters/1") == "shared"
    assert lane_for("/og-image") == "shared"
    for never in ("/health", "/auth/login", "/profiles", "/v1/analytics/install/ping", "/v1/admin/x"):
        assert lane_for(never) is None


def _app(max_personal: int, queue_s: float):
    app = FastAPI()
    app.add_middleware(LoadShedMiddleware, max_shared=10, max_personal=max_personal, queue_s=queue_s)

    @app.get("/v1/kundali/detail")
    async def kundali():
        await asyncio.sleep(0.3)
        return {"ok": True}

    @app.get("/v1/panchanga/2026-11-19")
    async def day():
        return {"ok": True}

    return app


def _run(app, paths):
    async def go():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
            return await asyncio.gather(*(c.get(p) for p in paths))

    return asyncio.run(go())


def test_full_personal_lane_sheds_fast_and_leaves_shared_alone():
    app = _app(max_personal=1, queue_s=0.05)
    responses = _run(app, ["/v1/kundali/detail"] * 3 + ["/v1/panchanga/2026-11-19"])
    kundali, day = responses[:3], responses[3]
    assert sorted(r.status_code for r in kundali) == [200, 503, 503]
    shed = next(r for r in kundali if r.status_code == 503)
    assert shed.headers["retry-after"] == "2"
    assert "no-store" in shed.headers["cache-control"]
    assert day.status_code == 200


def test_requests_wait_for_a_slot_within_the_queue_time():
    app = _app(max_personal=1, queue_s=2.0)
    responses = _run(app, ["/v1/kundali/detail"] * 3)
    assert [r.status_code for r in responses] == [200, 200, 200]
