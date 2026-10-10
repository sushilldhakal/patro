from fastapi import APIRouter, HTTPException, Query

from services.cities_db import get_popular_cities, nearest_city_global, search_cities

router = APIRouter(tags=["cities"])


@router.get("/nepal/cities/search")
@router.get("/cities/search")
def cities_search(
    q: str = Query(..., min_length=1, description="City name prefix or substring"),
    country: str | None = Query(None, min_length=2, max_length=2, description="ISO country code"),
    limit: int = Query(10, ge=1, le=50),
):
    """Search GeoNames cities — returns lat, lon, timezone for panchanga lookups."""
    try:
        results = search_cities(q, limit=limit, country=country)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"query": q, "count": len(results), "cities": results}


@router.get("/nepal/cities/nearest")
@router.get("/cities/nearest")
def cities_nearest(
    lat: float = Query(..., ge=-90, le=90, description="Observer latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Observer longitude"),
    country: str | None = Query(None, min_length=2, max_length=2, description="ISO country code"),
):
    """Snap raw coordinates to the nearest named city in the GeoNames DB.

    Always returns a city — the nearest populated place, with no distance limit —
    so "use my location" resolves to a named place (and its lat/lon/timezone)
    even when the point is far from any town.
    """
    try:
        city = nearest_city_global(lat, lon, country=country.upper() if country else None)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if city is None:
        raise HTTPException(status_code=404, detail="No city found in database")
    return {"lat": lat, "lon": lon, "city": city}


@router.get("/nepal/cities/popular")
@router.get("/cities/popular")
def cities_popular():
    """Frequently used cities (Kathmandu, Delhi, Sydney, etc.)."""
    try:
        cities = get_popular_cities()
        return {"count": len(cities), "cities": cities}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
