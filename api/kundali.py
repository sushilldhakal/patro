import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse

from api.deps import LocationDep
from services.panchanga_api import build_kundali
from services.response_cache import AT_TIME_PANCHANGA_CACHE_CONTROL

router = APIRouter(tags=["kundali"])


@router.get("/panchanga/at-time")
def panchanga_at_time(
    location: LocationDep,
    datetime: str | None = Query(None, alias="datetime",
                                  description="ISO local or offset datetime; naive uses observer TZ; omit for now"),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
):
    """Ephemeris-mode panchanga at an instant — angas, planets, lagna, muhurta_now."""
    from engine.astronomy.sidereal import resolve_ayanamsha_mode
    from engine.vedic.at_time import build_panchanga_at_time, parse_query_datetime

    try:
        instant = parse_query_datetime(
            datetime,
            timezone_name=location.timezone,
            lat=location.lat,
            lon=location.lon,
        )
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        payload = build_panchanga_at_time(instant, location, ayanamsa=mode_id)
        return JSONResponse(
            content=payload,
            headers={
                "Cache-Control": AT_TIME_PANCHANGA_CACHE_CONTROL,
                "CDN-Cache-Control": AT_TIME_PANCHANGA_CACHE_CONTROL,
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/planetary/positions")
def planetary_positions(
    location: LocationDep,
    datetime: str | None = Query(None, alias="datetime",
                                  description="ISO datetime; naive uses observer TZ; omit for now"),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
):
    """Nine grahas + lagna at an instant."""
    from datetime import timezone

    from engine.astronomy.sidereal import resolve_ayanamsha_mode
    from engine.vedic.at_time import build_planetary_snapshot, parse_query_datetime

    try:
        instant = parse_query_datetime(
            datetime,
            timezone_name=location.timezone,
            lat=location.lat,
            lon=location.lon,
        )
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        return {
            **build_planetary_snapshot(instant.astimezone(timezone.utc),
                                       lat=location.lat, lon=location.lon, ayanamsa=mode_id),
            "ayanamsha": ayanamsha or "lahiri",
            "location": location.as_dict(),
            "query_instant": instant.isoformat(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/seasons/tropical")
def tropical_seasons(location: LocationDep):
    """Six sāyana ऋतु boundaries anchored at equinoxes/solstices."""
    from engine.vedic.tropical_seasons import build_tropical_seasons_response
    return build_tropical_seasons_response(lat=location.lat, timezone_name=location.timezone)


@router.get("/kundali/vimshottari")
def kundali_vimshottari(
    location: LocationDep,
    datetime: str | None = Query(None, alias="datetime",
                                  description="Birth instant (ISO); naive uses observer TZ"),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
    cycles: int = Query(1, ge=1, le=3, description="Full 120-year cycles after birth dasha"),
):
    """Vimshottari Mahadasha from Moon sidereal longitude at birth."""
    from datetime import timezone

    from engine.astronomy.sidereal import resolve_ayanamsha_mode
    from engine.astronomy.swiss_eph import get_all_planetary_positions
    from engine.vedic.at_time import parse_query_datetime
    from engine.vedic.vimshottari import vimshottari_dasha

    try:
        instant = parse_query_datetime(
            datetime,
            timezone_name=location.timezone,
            lat=location.lat,
            lon=location.lon,
        )
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        planets = get_all_planetary_positions(instant.astimezone(timezone.utc), ayanamsa=mode_id)
        moon_lon = planets["moon"]["longitude"]
        dasha = vimshottari_dasha(moon_lon, instant.astimezone(timezone.utc), cycles=cycles)
        return {
            "ayanamsha": ayanamsha or "lahiri",
            "moon_longitude": moon_lon,
            "location": location.as_dict(),
            "query_instant": instant.isoformat(),
            **dasha,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/report")
def kundali_report(
    location: LocationDep,
    datetime: str | None = Query(None, alias="datetime",
                                  description="Birth instant (ISO); naive uses observer TZ"),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
    lang: str | None = Query(None, description="Report language: en or ne"),
    force: bool = Query(False, description="Bypass cache and regenerate the report"),
):
    """Deterministic Vedic interpretation of the birth chart, streamed as NDJSON."""
    from datetime import datetime as _dt
    from datetime import timezone as _tz

    from engine.astronomy.sidereal import resolve_ayanamsha_mode
    from engine.vedic.at_time import build_planetary_snapshot, parse_query_datetime
    from engine.vedic.interpretation import iter_report
    from engine.vedic.shadbala import compute_shadbala
    from engine.vedic.vimshottari import vimshottari_dasha
    from services.kundali_report_cache import (
        get_cached_report,
        make_cache_key,
        store_report_cache,
    )

    try:
        instant = parse_query_datetime(
            datetime,
            timezone_name=location.timezone,
            lat=location.lat,
            lon=location.lon,
        )
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        instant_utc = instant.astimezone(_tz.utc)
        snapshot = build_planetary_snapshot(instant_utc, lat=location.lat, lon=location.lon, ayanamsa=mode_id)
        planets = snapshot["planets"]
        lagna = snapshot["lagna"]
        moon_lon = planets["moon"]["longitude"]
        dasha = vimshottari_dasha(moon_lon, instant_utc, cycles=1)
        shadbala = compute_shadbala(instant_utc, lat=location.lat, lon=location.lon,
                                    timezone_name=location.timezone, ayanamsa=mode_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    report_lang = "en" if str(lang or "ne").startswith("en") else "ne"
    ayanamsha_id = ayanamsha or "lahiri"
    birth_instant = instant.isoformat()
    header = {"ayanamsha": ayanamsha_id, "location": location.as_dict(), "birth_instant": birth_instant}
    cache_key = make_cache_key(birth_instant, location, ayanamsha_id, report_lang)
    cache_status = "miss"

    cached_records: list[dict] | None = None
    if not force:
        cached_records = get_cached_report(cache_key)
        if cached_records is not None:
            cache_status = "hit"

    if cached_records is None:
        cached_records = list(
            iter_report(planets, lagna, shadbala, dasha, now=_dt.now(_tz.utc), lang=report_lang)
        )
        store_report_cache(
            cache_key,
            birth_instant=birth_instant,
            location=location,
            ayanamsha=ayanamsha_id,
            lang=report_lang,
            records=cached_records,
        )

    def _stream():
        yield json.dumps({"kind": "header", **header}, ensure_ascii=False) + "\n"
        for record in cached_records:
            yield json.dumps(record, ensure_ascii=False) + "\n"

    return StreamingResponse(
        _stream(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
            "X-Report-Cache": cache_status,
        },
    )


@router.get("/shadbala")
def shadbala(
    location: LocationDep,
    datetime: str | None = Query(None, alias="datetime",
                                  description="ISO datetime; naive uses observer TZ; omit for now"),
):
    """Sixfold planetary strength (Shadbala) in Virupas at an instant."""
    from datetime import timezone

    from engine.vedic.at_time import parse_query_datetime
    from engine.vedic.shadbala import compute_shadbala

    try:
        instant = parse_query_datetime(
            datetime,
            timezone_name=location.timezone,
            lat=location.lat,
            lon=location.lon,
        )
        result = compute_shadbala(instant.astimezone(timezone.utc),
                                  lat=location.lat, lon=location.lon, timezone_name=location.timezone)
        return {**result, "location": location.as_dict(), "query_instant": instant.isoformat()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/yogas/reference")
def kundali_yoga_reference(
    id: str | None = Query(None, description="Exact yoga id, e.g. '46' or '75-106'"),
    q: str | None = Query(None, description="Case-insensitive search over name/definition/result"),
):
    """Static catalog of the 162 planetary combinations (Raman, Part I).

    No arguments returns the whole catalog; `id` fetches one combination; `q`
    searches names, definitions and results.

    The SQLite catalog is rebuilt on demand from ``data/yoga_reference.json``
    (the ``.db`` is gitignored). Stale schemas from older deploys are dropped
    and recreated automatically.
    """
    from services.yoga_reference_db import get_all, get_by_id, search
    from services.response_cache import DEFAULT_CACHE_CONTROL

    try:
        if id:
            entry = get_by_id(id)
            if entry is None:
                raise HTTPException(status_code=404, detail=f"No yoga combination with id {id!r}")
            combinations = [entry]
        elif q:
            combinations = search(q)
        else:
            combinations = get_all()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Yoga reference catalog failed to load: {exc}",
        ) from exc

    return JSONResponse(
        content={
            "source": "Three Hundred Important Combinations — B. V. Raman",
            "part": "Part I (combinations 1–162)",
            "count": len(combinations),
            "combinations": combinations,
        },
        headers={
            "Cache-Control": DEFAULT_CACHE_CONTROL,
            "CDN-Cache-Control": DEFAULT_CACHE_CONTROL,
        },
    )


@router.get("/kundali/detail")
def kundali_detail(
    location: LocationDep,
    datetime: str | None = Query(None, alias="datetime",
                                  description="Birth instant (ISO); naive uses observer TZ"),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
):
    """Full birth-chart jyotish payload: panchanga, vargas, dasha tree, yogas, avakahada."""
    from engine.vedic.at_time import parse_query_datetime
    from engine.vedic.kundali_detail import build_kundali_detail

    try:
        instant = parse_query_datetime(
            datetime,
            timezone_name=location.timezone,
            lat=location.lat,
            lon=location.lon,
        )
        return build_kundali_detail(instant, location, ayanamsha=ayanamsha)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/dasha/expand")
def kundali_dasha_expand(
    lord: str = Query(..., description="Dasha lord key, e.g. jupiter"),
    start: str = Query(..., description="Period start ISO datetime"),
    end: str = Query(..., description="Period end ISO datetime"),
    system: str = Query(
        "vimshottari",
        description="Dasha system: vimshottari, tribhagi, or yogini",
    ),
):
    """Expand one dasha span into its antardashas."""
    from engine.vedic.kundali_detail import subdivide_dasha_period, subdivide_yogini_period

    try:
        from datetime import datetime as dt_cls, timezone as tz

        def _parse(value: str) -> dt_cls:
            dt = dt_cls.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=tz.utc)
            return dt

        subdivide = subdivide_yogini_period if system == "yogini" else subdivide_dasha_period
        children = subdivide(lord, _parse(start), _parse(end))
        return {"lord": lord, "system": system, "children": children}
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/milan")
def kundali_milan(
    boy_datetime: str = Query(..., description="Groom birth instant (ISO); naive uses boy_timezone"),
    girl_datetime: str = Query(..., description="Bride birth instant (ISO); naive uses girl_timezone"),
    boy_lat: float | None = Query(None),
    boy_lon: float | None = Query(None),
    boy_timezone: str | None = Query(None, description="IANA tz for the groom's birthplace"),
    girl_lat: float | None = Query(None),
    girl_lon: float | None = Query(None),
    girl_timezone: str | None = Query(None, description="IANA tz for the bride's birthplace"),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
    lang: str = Query("ne", description="Response language for kuta values: ne or en"),
):
    """Ashtakoota (Guna Milan) compatibility, computed entirely server-side."""
    from engine.vedic.at_time import parse_query_datetime
    from engine.vedic.milan import build_kundali_milan

    default_tz = "Asia/Kathmandu"
    try:
        boy_instant = parse_query_datetime(
            boy_datetime,
            timezone_name=boy_timezone or default_tz,
            lat=boy_lat,
            lon=boy_lon,
        )
        girl_instant = parse_query_datetime(
            girl_datetime,
            timezone_name=girl_timezone or default_tz,
            lat=girl_lat,
            lon=girl_lon,
        )
        boy_location = {"lat": boy_lat, "lon": boy_lon, "timezone": boy_timezone or default_tz}
        girl_location = {"lat": girl_lat, "lon": girl_lon, "timezone": girl_timezone or default_tz}
        return build_kundali_milan(
            boy_instant, girl_instant,
            boy_location=boy_location, girl_location=girl_location,
            ayanamsha=ayanamsha, lang=lang,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/{date_key}")
def kundali(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Planetary positions at sunrise (udaya)."""
    try:
        return build_kundali(date_key, location, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
