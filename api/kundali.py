import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.deps import LocationDep
from services.panchanga_api import build_kundali

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
        instant = parse_query_datetime(datetime, timezone_name=location.timezone)
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        return build_panchanga_at_time(instant, location, ayanamsa=mode_id)
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
        instant = parse_query_datetime(datetime, timezone_name=location.timezone)
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
        instant = parse_query_datetime(datetime, timezone_name=location.timezone)
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
):
    """Deterministic Vedic interpretation of the birth chart, streamed as NDJSON."""
    from datetime import datetime as _dt
    from datetime import timezone as _tz

    from engine.astronomy.sidereal import resolve_ayanamsha_mode
    from engine.vedic.at_time import build_planetary_snapshot, parse_query_datetime
    from engine.vedic.interpretation import iter_report
    from engine.vedic.shadbala import compute_shadbala
    from engine.vedic.vimshottari import vimshottari_dasha

    try:
        instant = parse_query_datetime(datetime, timezone_name=location.timezone)
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        instant_utc = instant.astimezone(_tz.utc)
        snapshot = build_planetary_snapshot(instant_utc, lat=location.lat, lon=location.lon, ayanamsa=mode_id)
        planets = snapshot["planets"]
        lagna = snapshot["lagna"]
        moon_lon = planets["moon"]["longitude"]
        dasha = vimshottari_dasha(moon_lon, instant_utc, cycles=1)
        shadbala = compute_shadbala(instant_utc, lat=location.lat, lon=location.lon, timezone_name=location.timezone)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    records = list(iter_report(planets, lagna, shadbala, dasha, now=_dt.now(_tz.utc)))
    header = {"ayanamsha": ayanamsha or "lahiri", "location": location.as_dict(), "birth_instant": instant.isoformat()}

    def _stream():
        yield json.dumps({"kind": "header", **header}, ensure_ascii=False) + "\n"
        for record in records:
            yield json.dumps(record, ensure_ascii=False) + "\n"

    return StreamingResponse(
        _stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
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
        instant = parse_query_datetime(datetime, timezone_name=location.timezone)
        result = compute_shadbala(instant.astimezone(timezone.utc),
                                  lat=location.lat, lon=location.lon, timezone_name=location.timezone)
        return {**result, "location": location.as_dict(), "query_instant": instant.isoformat()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
        instant = parse_query_datetime(datetime, timezone_name=location.timezone)
        return build_kundali_detail(instant, location, ayanamsha=ayanamsha)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/dasha/expand")
def kundali_dasha_expand(
    lord: str = Query(..., description="Dasha lord key, e.g. jupiter"),
    start: str = Query(..., description="Period start ISO datetime"),
    end: str = Query(..., description="Period end ISO datetime"),
):
    """Expand one dasha span into its nine Vimshottari antardashas."""
    from engine.vedic.kundali_detail import subdivide_dasha_period

    try:
        from datetime import datetime as dt_cls, timezone as tz

        def _parse(value: str) -> dt_cls:
            dt = dt_cls.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=tz.utc)
            return dt

        children = subdivide_dasha_period(lord, _parse(start), _parse(end))
        return {"lord": lord, "children": children}
    except (ValueError, KeyError) as exc:
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
