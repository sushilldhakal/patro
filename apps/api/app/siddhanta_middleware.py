"""Which calculation a request computes in: a siddhanta — the Surya Siddhanta (default)
or drik — and, under drik, an ayanamsha (Lahiri by default).

A request without ``?siddhanta=`` computes every engine call — the panchanga, the
kundali, the calendar grid, BS months, festivals, साइत — in the Surya Siddhanta;
``?siddhanta=drik`` switches it all to drik, and ``?ayanamsha=kp`` makes drik compute every sidereal
position with that ayanamsha (see engine.astronomy.siddhanta). The values are in the
URL, so the CDN caches each calculation's answers as different objects.

A pure ASGI middleware, not ``BaseHTTPMiddleware``: the ContextVar it sets must
reach the route's threadpool worker, and must be set before EraMiddleware turns
a BS date into a Julian Day (which can mean finding sankrantis).
"""

from __future__ import annotations

import json
from urllib.parse import parse_qs

from engine.astronomy.siddhanta import resolve_siddhanta, use_ayanamsha, use_siddhanta

QUERY_PARAM = "siddhanta"
AYANAMSHA_PARAM = "ayanamsha"


def _bad_request(detail: str):
    body = json.dumps({"detail": detail}).encode("utf-8")
    return (
        {
            "type": "http.response.start",
            "status": 400,
            "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
        },
        {"type": "http.response.body", "body": body},
    )


class SiddhantaMiddleware:
    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        query = parse_qs(scope.get("query_string", b"").decode("latin-1"))
        raw = query.get(QUERY_PARAM, [None])[-1]
        requested_ayanamsha = query.get(AYANAMSHA_PARAM, [None])[-1] or None
        try:
            siddhanta_id = resolve_siddhanta(raw)
        except ValueError as exc:
            for message in _bad_request(str(exc)):
                await send(message)
            return

        with use_siddhanta(siddhanta_id) as active:
            try:
                choice = active.resolve_ayanamsha(requested_ayanamsha)
            except ValueError as exc:
                for message in _bad_request(str(exc)):
                    await send(message)
                return
            headers = [(b"x-siddhanta", siddhanta_id.encode("ascii")), (b"x-ayanamsha", choice.key.encode("ascii"))]

            async def send_with_calculation(message) -> None:
                # Say which calculation computed the body.
                if message["type"] == "http.response.start":
                    message = {**message, "headers": [*message.get("headers", []), *headers]}
                await send(message)

            with use_ayanamsha(requested_ayanamsha):
                await self.app(scope, receive, send_with_calculation)
