"""Bounded work per worker: a fast 503 instead of a 60-second queue.

Why: under the load test the 2-core server took every request it was given,
queued them in each worker's thread pool, and answered later and later until
Cloudflare and the phones timed out after 60 s. A phone that gets a quick 503
falls back to its offline copy and retries once (apps/mobile/app/_layout.tsx);
a phone stuck on a spinner for a minute just looks broken.

Two lanes, each a per-worker limit on requests that actually compute (this
sits inside the Redis response cache, so cache hits never count):

* shared — every public data route (calendar, panchanga, sait, documents…).
* personal — answers unique to one person (kundali, personal rashifal). They
  can never come from a shared cache, so their cost grows with every user. A
  lane of their own means a rush of first-time kundali opens can use at most
  ``LOAD_SHED_MAX_PERSONAL`` slots per worker and never starves the calendar.

A request waits up to ``LOAD_SHED_QUEUE_S`` for a slot, then gets 503 with
``Retry-After``. Auth, accounts, analytics and health are never shed.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os

logger = logging.getLogger(__name__)

# Path markers (after the /v1 prefix) of answers computed for one person.
PERSONAL_MARKERS: tuple[str, ...] = (
    "/kundali/detail",
    "/kundali/report",
    "/kundali/vimshottari",
    "/kundali/dasha/expand",
    "/kundali/milan",
    "/shadbala",
    "/panchanga/rashifal/personal",
    "/panchanga/rashifal/janma",
    "/nepal/sait/",  # only its /personalize sub-route, checked below
    "/vastu/sketch",
)

_NEVER_SHED = ("/health", "/analytics/", "/admin/", "/auth", "/profiles", "/events", "/devices")


def lane_for(path: str) -> str | None:
    """'personal', 'shared', or None for requests this layer leaves alone."""
    if any(m in path for m in _NEVER_SHED):
        return None
    if "/v1/" not in path and not path.endswith("/og-image"):
        return None
    for marker in PERSONAL_MARKERS:
        if marker in path:
            if marker == "/nepal/sait/" and not path.endswith("/personalize"):
                break
            return "personal"
    return "shared"


class LoadShedMiddleware:
    """Pure ASGI: cap in-flight computing requests per lane, shed the rest fast."""

    def __init__(
        self,
        app,
        *,
        max_shared: int | None = None,
        max_personal: int | None = None,
        queue_s: float | None = None,
    ):
        self.app = app
        self.limits = {
            "shared": max_shared or int(os.getenv("LOAD_SHED_MAX_SHARED", "24")),
            "personal": max_personal or int(os.getenv("LOAD_SHED_MAX_PERSONAL", "6")),
        }
        self.queue_s = queue_s if queue_s is not None else float(os.getenv("LOAD_SHED_QUEUE_S", "4"))
        self.enabled = os.getenv("LOAD_SHED", "1") != "0"
        # Created lazily: a semaphore binds to the running loop on first use.
        self._sems: dict[str, asyncio.Semaphore] = {}

    def _sem(self, lane: str) -> asyncio.Semaphore:
        sem = self._sems.get(lane)
        if sem is None:
            sem = self._sems[lane] = asyncio.Semaphore(self.limits[lane])
        return sem

    async def __call__(self, scope, receive, send):
        lane = lane_for(scope["path"]) if scope["type"] == "http" and self.enabled else None
        if lane is None:
            await self.app(scope, receive, send)
            return
        sem = self._sem(lane)
        try:
            await asyncio.wait_for(sem.acquire(), timeout=self.queue_s)
        except (asyncio.TimeoutError, TimeoutError):
            logger.warning("load shed: %s lane full, 503 for %s", lane, scope["path"])
            await _busy(send, lane)
            return
        try:
            await self.app(scope, receive, send)
        finally:
            sem.release()


async def _busy(send, lane: str) -> None:
    body = json.dumps({"detail": "Server busy, please retry shortly.", "lane": lane}).encode()
    await send({
        "type": "http.response.start",
        "status": 503,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode()),
            (b"retry-after", b"2"),
            (b"cache-control", b"no-store"),
            (b"cdn-cache-control", b"no-store"),
        ],
    })
    await send({"type": "http.response.body", "body": body})
