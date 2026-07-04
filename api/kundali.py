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


@router.get("/kundali/detail")
def kundali_detail(
    location: LocationDep,
    datetime: str | None = Query(None, alias="datetime",
                                  description="Birth instant (ISO); naive uses observer TZ"),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
):
    """Complete computed kundali: panchanga, shadbala, dasha tree, yuddha,
    bhava bala, ashtakavarga, yogas, all varga charts, avakahada and birth
    meta — clients render this without any jyotish math of their own."""
    from engine.astronomy.sidereal import resolve_ayanamsha_mode
    from engine.vedic.at_time import parse_query_datetime
    from services.kundali_detail import build_kundali_detail

    try:
        instant = parse_query_datetime(datetime, timezone_name=location.timezone)
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        return build_kundali_detail(
            instant,
            location,
            ayanamsa_mode_id=mode_id,
            ayanamsha_label=ayanamsha or "lahiri",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/dasha/expand")
def kundali_dasha_expand(
    lord: str = Query(..., description="Dasha lord key (ketu, venus, sun, …)"),
    start: str = Query(..., description="Span start (ISO datetime)"),
    end: str = Query(..., description="Span end (ISO datetime)"),
):
    """Nine Vimshottari sub-periods of a span (antar → pratyantar → sukshma → prana)."""
    from datetime import datetime as _dt

    from engine.vedic.vimshottari import subdivide_span

    try:
        start_dt = _dt.fromisoformat(start.replace("Z", "+00:00"))
        end_dt = _dt.fromisoformat(end.replace("Z", "+00:00"))
        if end_dt <= start_dt:
            raise ValueError("end must be after start")
        return {"lord": lord, "children": subdivide_span(lord.lower(), start_dt, end_dt)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/kundali/milan")
def kundali_milan(
    boy_datetime: str = Query(..., description="Boy's birth instant (ISO; naive uses boy TZ)"),
    girl_datetime: str = Query(..., description="Girl's birth instant (ISO; naive uses girl TZ)"),
    boy_lat: float | None = Query(None),
    boy_lon: float | None = Query(None),
    boy_timezone: str | None = Query(None),
    girl_lat: float | None = Query(None),
    girl_lon: float | None = Query(None),
    girl_timezone: str | None = Query(None),
    ayanamsha: str | None = Query(None, description="Ayanamsha mode: lahiri, nepal, raman, kp, true_citra"),
    lang: str | None = Query(None, description="Value language: ne (default) or en"),
):
    """Ashtakuta (36-guna) kundali milan computed from the two birth moments."""
    from datetime import timezone as _tz2

    from engine.astronomy.location import resolve_location_from_query
    from engine.astronomy.positions import NAKSHATRA_NAMES, RASHI_NAMES
    from engine.astronomy.sidereal import resolve_ayanamsha_mode
    from engine.vedic.ashtakuta import compute_ashtakuta
    from engine.vedic.at_time import build_planetary_snapshot, parse_query_datetime
    from engine.vedic.graha_details import nakshatra_pada_from_longitude, rashi_from_longitude
    from engine.vedic.names_ne import NAKSHATRA_NAMES_NE
    from engine.astronomy.positions import RASHI_NAMES_NE

    def person(raw_datetime: str, lat: float | None, lon: float | None, tz: str | None):
        location = resolve_location_from_query(lat=lat, lon=lon, timezone=tz, city=None, city_id=None)
        instant = parse_query_datetime(raw_datetime, timezone_name=location.timezone)
        snapshot = build_planetary_snapshot(
            instant.astimezone(_tz2.utc), lat=location.lat, lon=location.lon, ayanamsa=mode_id
        )
        moon_lon = snapshot["planets"]["moon"]["longitude"]
        rashi_num = rashi_from_longitude(moon_lon)
        nak_index, pada = nakshatra_pada_from_longitude(moon_lon)
        return {
            "moonLongitude": moon_lon,
            "moonRashiNum": rashi_num,
            "moonRashiNe": RASHI_NAMES_NE[rashi_num - 1],
            "moonRashiEn": RASHI_NAMES[rashi_num - 1],
            "nakshatraIndex": nak_index,
            "nakshatraNe": NAKSHATRA_NAMES_NE[nak_index],
            "nakshatraEn": NAKSHATRA_NAMES[nak_index],
            "pada": pada,
            "birth_instant": instant.isoformat(),
            "location": location.as_dict(),
        }

    try:
        _, mode_id = resolve_ayanamsha_mode(ayanamsha)
        boy = person(boy_datetime, boy_lat, boy_lon, boy_timezone)
        girl = person(girl_datetime, girl_lat, girl_lon, girl_timezone)
        result = compute_ashtakuta(boy, girl, lang=lang)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "result": result,
        "boy": boy,
        "girl": girl,
        "ayanamsha": ayanamsha or "lahiri",
        "lang": (lang or "ne"),
    }


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
