"""The single gate every dated API request and response passes through.

Request side
    ``era`` + ``year``/``month``/``day`` (any of ``ad``, ``bc``, ``bs``, ``bbs``,
    all positive years) are converted **once** to Julian Day and parked on
    ``request.state``. Handlers read ``request.state.era_ctx.julian`` and never see
    a calendar label.

Response side
    JSON coming back carries Julian Days; this layer renders them into the era the
    caller asked for. A handler therefore never formats a date either.

The conversion itself lives in :mod:`engine.calendar.era` — this module is only
the plumbing that makes sure every request uses it. Nothing downstream should
convert between a calendar label and a Julian Day.
"""

from __future__ import annotations

import gzip
import json
from dataclasses import dataclass
from typing import Any

from fastapi import Query
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.relative_day import path_relative_day_key, relative_day_jd_ut, today_jd_ut
from engine.astronomy.engine import EphemerisError
from engine.calendar.era import ERA_CODES, era_language, from_jd, to_jd, year_span_jd

_VALID_LANGUAGES = frozenset({"en", "ne"})

#: Response keys understood to hold a Julian Day. Anything matching gets an
#: era-rendered sibling; the raw JD is kept so clients can round-trip exactly.
_JD_KEYS = {"jd_ut", "julian", "julian_start", "julian_end", "jd"}
_JD_SUFFIX = "_jd"


@dataclass(frozen=True)
class EraContext:
    """What the era middleware resolved for this request."""

    era: str
    language: str
    year: int | None = None
    month: int | None = None
    day: int | None = None
    #: 0h UT Julian Day of the requested day (or the year's first day).
    julian: float | None = None
    #: Inclusive last-day JD when only a year was given.
    julian_end: float | None = None
    #: Calendar the incoming ``year``/``month``/``day`` were read in. Never a
    #: display concern — a path-addressed date string is parsed with this, and
    #: nothing else may look at it.
    input_era: str | None = None
    #: True when the caller addressed the day by Julian Day directly (``?jd=``),
    #: the canonical, calendar-free form.
    from_jd_param: bool = False

    @property
    def has_date(self) -> bool:
        return self.julian is not None


def _as_int(raw: str | None) -> int | None:
    if raw is None or raw.strip() == "":
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _as_float(raw: str | None) -> float | None:
    if raw is None or raw.strip() == "":
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def _resolve_language(params, era: str) -> str:
    raw = (params.get("language") or "").strip().lower()
    if raw in _VALID_LANGUAGES:
        return raw
    return era_language(era)


def _today_jd_ut(params) -> float:
    return today_jd_ut(params)


def _date_error(era: str, year: int | None, exc: Exception) -> str:
    """A 400 message for a date the system cannot compute.

    The year axis is wider than the installed Swiss ephemeris files (which are
    per-machine and gitignored), so a year can be valid on the axis and still
    have no astronomy behind it. That surfaced as a 500 with an empty body;
    it is a bad request, and it says so in era terms — never in signed years or
    raw Julian Days.
    """
    if isinstance(exc, EphemerisError):
        return (
            f"{era} year {year} is outside the installed ephemeris range, so no "
            "panchanga can be computed for it"
        )
    return str(exc)


def _resolve(params, path: str = "") -> tuple[EraContext | None, str | None]:
    """Build the context, or return an error message for a 400.

    ``era`` is the **display** calendar (response labels + language default).
    ``inputEra`` (when year/month/day are present) is the **input** calendar used
    only to convert those parts to Julian Day. If ``inputEra`` is omitted but
    date parts are present, ``era`` is used as the input calendar too.
    """
    raw_display = params.get("era")
    display_era = (raw_display or "").strip().lower() or None
    if display_era is not None and display_era not in ERA_CODES:
        return None, f"era must be one of {', '.join(ERA_CODES)}; got {raw_display!r}"

    raw_input = params.get("inputEra") or params.get("input_era")
    input_era = (raw_input or "").strip().lower() or None
    if input_era is not None and input_era not in ERA_CODES:
        return None, f"inputEra must be one of {', '.join(ERA_CODES)}; got {raw_input!r}"

    if display_era is None:
        return None, None
    language = _resolve_language(params, display_era)
    parse_era = input_era if input_era is not None else display_era

    # 1. ``?jd=`` — the canonical identity. Already a Julian Day, so no calendar
    #    is consulted at all; ``era`` here can only mean display.
    jd_param = _as_float(params.get("jd"))
    if jd_param is not None:
        return (
            EraContext(
                era=display_era,
                language=language,
                julian=jd_param,
                input_era=input_era,
                from_jd_param=True,
            ),
            None,
        )

    year = _as_int(params.get("year"))
    month = _as_int(params.get("month"))
    day = _as_int(params.get("day"))

    # 2. Explicit calendar parts, read in ``inputEra``. A full y/m/d wins even on a
    #    relative-day path, so ``/today?year=…`` addresses that day, not today.
    if year is not None and month is not None and day is not None:
        try:
            julian = to_jd(parse_era, year, month, day)
        except (ValueError, EphemerisError) as exc:
            return None, _date_error(parse_era, year, exc)
        return (
            EraContext(
                era=display_era,
                language=language,
                year=year,
                month=month,
                day=day,
                julian=julian,
                input_era=parse_era,
            ),
            None,
        )

    # 3. ``/today``, ``/tomorrow``, ``/now`` — a request to resolve an *instant*
    #    at the observer's location, never a date string to be parsed.
    rel_key = path_relative_day_key(path)
    if rel_key is not None:
        try:
            julian = relative_day_jd_ut(rel_key, params)
        except ValueError as exc:
            return None, str(exc)
        return (
            EraContext(era=display_era, language=language, julian=julian),
            None,
        )

    # 4. A bare year (optionally a month) — a span, so carry its last day too.
    if year is None:
        julian = _today_jd_ut(params)
        return EraContext(era=display_era, language=language, julian=julian), None

    try:
        julian = to_jd(parse_era, year, month, day)
        if month is None and day is None:
            _, julian_end = year_span_jd(parse_era, year)
        else:
            julian_end = None
    except (ValueError, EphemerisError) as exc:
        return None, _date_error(parse_era, year, exc)

    return (
        EraContext(
            era=display_era,
            language=language,
            year=year,
            month=month,
            day=day,
            julian=julian,
            julian_end=julian_end,
            input_era=parse_era,
        ),
        None,
    )


def _date_parts(jd_ut: float, era: str) -> dict[str, Any]:
    """The rule-compliant rendering of one day: era carries the sign, year is positive.

    ``date_bs``/``date_ad`` elsewhere in the payload are the engine's own machine
    fields and still spell pre-epoch days on a signed axis (``-4-01-01``,
    ``-0060-03-16``), because a signed axis is how the engine counts internally.
    That spelling must not be what a client reads: this block is, and every year
    in it is >= 1, with ``era`` carrying which side of which epoch it falls on.
    """
    labels = from_jd(jd_ut)
    if era in ("ad", "bc"):
        shown = {
            "era": labels.gregorian_era,
            "year": labels.gregorian_year,
            "month": labels.civil.month,
            "day": labels.civil.day,
        }
    else:
        shown = {
            "era": labels.vikram_era,
            "year": labels.vikram_year,
            "month": labels.vikram_month,
            "day": labels.vikram_day,
        }
    return {
        "jd": labels.jd_ut,
        **shown,
        "vikram": {
            "era": labels.vikram_era,
            "year": labels.vikram_year,
            "month": labels.vikram_month,
            "day": labels.vikram_day,
        },
        "gregorian": {
            "era": labels.gregorian_era,
            "year": labels.gregorian_year,
            "month": labels.civil.month,
            "day": labels.civil.day,
        },
    }


def _format_ymd(year: int, month: int, day: int) -> str:
    return f"{int(year)}-{int(month):02d}-{int(day):02d}"


def _sync_legacy_dates_from_parts(node: dict[str, Any]) -> None:
    """Rewrite engine signed-axis ``date_bs`` / ``bs_date`` from ``date_parts``."""
    parts = node.get("date_parts")
    if not isinstance(parts, dict):
        return

    v = parts.get("vikram")
    if isinstance(v, dict):
        vy, vm, vd = v.get("year"), v.get("month"), v.get("day")
        if vy is not None and vm is not None and vd is not None:
            y, m, d = int(vy), int(vm), int(vd)
            node["date_bs"] = _format_ymd(y, m, d)
            bs = node.get("bs_date")
            if isinstance(bs, dict):
                merged = dict(bs)
                merged.update({"year": y, "month": m, "day": d})
                node["bs_date"] = merged

    g = parts.get("gregorian")
    if isinstance(g, dict):
        gy, gm, gd = g.get("year"), g.get("month"), g.get("day")
        if gy is not None and gm is not None and gd is not None:
            ad = _format_ymd(int(gy), int(gm), int(gd))
            node["date_ad"] = ad

    detail = node.get("detail")
    if isinstance(detail, dict):
        if isinstance(v, dict):
            vy, vm, vd = v.get("year"), v.get("month"), v.get("day")
            if vy is not None and vm is not None and vd is not None:
                y, m, d = int(vy), int(vm), int(vd)
                dbs = detail.get("bs_date")
                if isinstance(dbs, dict):
                    merged = dict(dbs)
                    merged.update({"year": y, "month": m, "day": d})
                    detail["bs_date"] = merged
        if isinstance(g, dict):
            gy, gm, gd = g.get("year"), g.get("month"), g.get("day")
            if gy is not None and gm is not None and gd is not None:
                ad = _format_ymd(int(gy), int(gm), int(gd))
                detail["date_ad"] = ad
                detail["date"] = ad


def _align_legacy_date_fields(node: Any) -> None:
    """Every ``date_parts`` block wins over signed internal ``date_bs`` / ``bs_date``."""
    if isinstance(node, dict):
        if "date_parts" in node:
            _sync_legacy_dates_from_parts(node)
        for value in node.values():
            _align_legacy_date_fields(value)
    elif isinstance(node, list):
        for item in node:
            _align_legacy_date_fields(item)


def _render_tree(node: Any, era: str, *, top: bool = False) -> Any:
    """Attach an era label beside every Julian Day in the payload."""
    if isinstance(node, dict):
        out: dict[str, Any] = {}
        for key, value in node.items():
            out[key] = _render_tree(value, era)
            is_jd = key in _JD_KEYS or key.endswith(_JD_SUFFIX)
            if is_jd and isinstance(value, (int, float)) and not isinstance(value, bool):
                label_key = "date" if key in ("jd_ut", "julian", "jd") else f"{key}_date"
                if label_key not in node:
                    try:
                        out[label_key] = from_jd(float(value)).label_for(era)
                    except Exception:
                        # A malformed or out-of-range JD must not turn a good
                        # response into a 500; leave the raw number in place.
                        pass
                # Only the payload's own day gets the structured block — nested
                # JDs (event moments, span bounds) stay lean.
                if top and key in ("jd_ut", "julian", "jd") and "date_parts" not in node:
                    try:
                        out["date_parts"] = _date_parts(float(value), era)
                    except Exception:
                        pass
        return out
    if isinstance(node, list):
        return [_render_tree(item, era) for item in node]
    return node


class EraMiddleware(BaseHTTPMiddleware):
    """Resolve era → Julian Day on the way in, Julian Day → era on the way out."""

    async def dispatch(self, request: Request, call_next):
        ctx, error = _resolve(request.query_params, request.url.path)
        if error is not None:
            return Response(
                content=json.dumps({"detail": error}),
                status_code=400,
                media_type="application/json",
            )
        request.state.era_ctx = ctx
        response = await call_next(request)

        if ctx is None or response.status_code != 200:
            return response
        if not response.headers.get("content-type", "").startswith("application/json"):
            return response

        body = b"".join([chunk async for chunk in response.body_iterator])
        headers = dict(response.headers)

        # The response cache serves pre-gzipped bytes straight off disk (the whole
        # point of that layer), so the body reaching here may already be
        # compressed. Decompress it rather than skipping the rewrite: this
        # middleware must always see plain JSON. Only requests that actually named
        # an era get here, so the uncached/era-less fast path pays nothing.
        was_gzipped = headers.get("content-encoding", "").lower() == "gzip"
        raw = gzip.decompress(body) if was_gzipped else body

        try:
            payload = json.loads(raw)
        except (ValueError, UnicodeDecodeError, gzip.BadGzipFile):
            # Genuinely not JSON — pass through untouched rather than corrupt it.
            return Response(
                content=body,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
            )

        rendered = _render_tree(payload, ctx.era, top=True)
        _align_legacy_date_fields(rendered)
        if isinstance(rendered, dict):
            rendered.setdefault("era", ctx.era)
            rendered.setdefault("language", ctx.language)
        new_body = json.dumps(rendered, ensure_ascii=False).encode("utf-8")
        if was_gzipped:
            new_body = gzip.compress(new_body)

        headers.pop("content-length", None)
        headers.pop("Content-Length", None)
        return Response(
            content=new_body,
            status_code=response.status_code,
            headers=headers,
            media_type="application/json",
        )


def era_params(
    era: str | None = Query(
        None, description="Display calendar for response labels: ad, bc, bs or bbs"
    ),
    inputEra: str | None = Query(
        None,
        description=(
            "Calendar the year/month/day parameters are written in. Defaults to "
            "`era`. Never affects how the response is labelled."
        ),
    ),
    jd: float | None = Query(
        None,
        description=(
            "Julian Day (0h UT) of the day — the canonical, calendar-free identity. "
            "Outranks year/month/day and any date in the path."
        ),
    ),
    year: int | None = Query(None, ge=1, description="Year in `inputEra`. Always positive — the era carries the sign."),
    month: int | None = Query(None, ge=1, le=12, description="Month in `inputEra`"),
    day: int | None = Query(None, ge=1, description="Day in `inputEra`"),
) -> None:
    """Declared so these appear in OpenAPI — :class:`EraMiddleware` is what reads them.

    A handler depending on this receives ``None`` and must keep getting its day
    from :func:`app.day_resolver.day_jd_for_request`. Nothing about a calendar
    should reach a route body.
    """
    return None


def era_context(request: Request) -> EraContext:
    """FastAPI dependency — the handler's only view of the requested date."""
    ctx = getattr(request.state, "era_ctx", None)
    if ctx is None:
        raise RuntimeError(
            "no era context on this request — EraMiddleware is not installed, "
            "or the request carried no ?era= parameter"
        )
    return ctx
