from fastapi import APIRouter, HTTPException, Query

from services.cities_db import get_popular_cities, search_cities

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


@router.get("/nepal/cities/popular")
@router.get("/cities/popular")
def cities_popular():
    """Frequently used cities (Kathmandu, Delhi, Sydney, etc.)."""
    try:
        cities = get_popular_cities()
        return {"count": len(cities), "cities": cities}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
