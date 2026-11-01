"""Which siddhanta a request computes in: drik (default) or the Surya Siddhanta.

``?siddhanta=surya_siddhanta`` on any route switches every engine call made for
that request — the panchanga, the kundali, the calendar grid — to the
Surya Siddhanta (see engine.astronomy.siddhanta). The value is in the URL,
so the CDN caches each siddhanta's answers as different objects.

A pure ASGI middleware, not ``BaseHTTPMiddleware``: the ContextVar it sets must
reach the route's threadpool worker, and must be set before EraMiddleware turns
a BS date into a Julian Day (which can mean finding sankrantis).
"""

from __future__ import annotations

import json
from urllib.parse import parse_qs

from engine.astronomy.siddhanta import resolve_siddhanta, use_siddhanta

QUERY_PARAM = "siddhanta"


class SiddhantaMiddleware:
    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        raw = parse_qs(scope.get("query_string", b"").decode("latin-1")).get(QUERY_PARAM, [None])[-1]
        try:
            siddhanta_id = resolve_siddhanta(raw)
        except ValueError as exc:
            body = json.dumps({"detail": str(exc)}).encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 400,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
            })
            await send({"type": "http.response.body", "body": body})
            return
        header = (b"x-siddhanta", siddhanta_id.encode("ascii"))

        async def send_with_siddhanta(message) -> None:
            # Say which siddhanta computed the body.
            if message["type"] == "http.response.start":
                message = {**message, "headers": [*message.get("headers", []), header]}
            await send(message)

        with use_siddhanta(siddhanta_id):
            await self.app(scope, receive, send_with_siddhanta)
