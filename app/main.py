"""Surya Panchanga computation API — structured time-state service."""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date
from typing import Annotated, Any, Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import config
from core.location import ObserverLocation, resolve_location_from_query
from services.cities_db import get_popular_cities, search_cities
from panchanga.bikram_sambat import (
    bs_month_name,
    bs_to_gregorian,
    format_bs_date,
    gregorian_to_bs,
    parse_bs_date,
)
from services.holiday_generator import (
    FestivalCacheMissError,
    HolidayCacheMissError,
    get_bs_holidays,
    holidays_on_date,
    precompute_bs_year,
)
from services.panchanga_api import (
    build_calendar_header,
    build_daily_state,
    build_festivals_for_date,
    build_kundali,
    build_month_calendar,
    build_patro_month,
    resolve_panchanga_date,
)
from services.presentation import render_panchanga, render_panchanga_month
from services.patro_generator import generate_bs_month_patro, generate_patro
from services.startup import warm_holiday_cache

logging.basicConfig(level=config.log_level())
logger = logging.getLogger(__name__)

DEFAULT_CORS_ORIGINS = (
    "https://sushilldhakal.github.io",
    "http://localhost:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5175",
)


async def _warm_holiday_cache_background(app: FastAPI) -> None:
    """Precompute caches without blocking /health during deploy restarts."""
    loop = asyncio.get_running_loop()
    try:
        warmed = await loop.run_in_executor(None, warm_holiday_cache)
        app.state.precomputed_bs_years = warmed
    except Exception:
        logger.exception("Startup holiday precompute failed")
        app.state.precomputed_bs_years = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.precomputed_bs_years = []
    warm_task = asyncio.create_task(_warm_holiday_cache_background(app))
    yield
    warm_task.cancel()
    try:
        await warm_task
    except asyncio.CancelledError:
        pass


_DESCRIPTION = """
## Surya Panchanga API

Computation engine for daily celestial time-state (panchanga), Nepal festival and holiday
calendars, and Bikram Sambat / Gregorian date conversion.

---

### Calculation Methodology

Surya Panchanga calculations utilise the ancient **Surya Siddhanta** framework, updated with
modern *drik* (precise) mathematical algorithms to determine daily celestial positions.
The five key elements — **Tithi**, **Nakshatra**, **Yoga**, **Karana**, and **Vaara** — are
computed daily by analysing the angular separation of the Sun and Moon, adjusted for local
latitude, longitude, and sunrise times.

The methodology involves calculating true sidereal longitudes for the Sun and Moon using the
**Swiss Ephemeris** (pyswisseph), then applying specific division formulas based on the local
sidereal day:

| Anga      | Division | Description |
|-----------|----------|-------------|
| Tithi     | 12°      | Lunar day — 1/30th of a synodic month |
| Nakshatra | 13°20′   | Lunar mansion — 1/27th of the ecliptic |
| Yoga      | 13°20′   | Sum of Sun + Moon longitudes divided by 27 |
| Karana    | 6°       | Half-tithi — 1/60th of a synodic month |
| Vaara     | —        | Day of the week from local sunrise |

**Udaya Tithi** (the tithi at local sunrise) is used for festival date assignment, following
traditional Nepali panchanga practice. **Adhik Maas** (intercalary extra month with no
Sankranti) and the extremely rare **Kshaya Maas** (lost month with two Sankrantis) are
detected via Swiss Ephemeris solar longitude tracking.

---

### Key Endpoints

- `GET /nepal/panchanga/{date}` — daily panchanga: tithi, nakshatra, yoga, karana, vaara, muhurta, planets
- `GET /nepal/panchanga/year/{bs_year}` — full BS year grid with muhurta windows
- `GET /nepal/gochar/{date}` — planetary transit (Gochar) table + next rashi entries
- `GET /nepal/festivals` — festivals for a BS or AD year
- `GET /nepal/holidays` — public holidays for a BS or AD year
- `GET /nepal/special-months/{bs_year}` — Adhik Maas / Kshaya Maas detection
- `GET /nepal/patro/{bs_year}/{bs_month}` — full patro grid for a BS month
- `GET /convert/ad-to-bs/{ad_date}` — Gregorian → Bikram Sambat
- `GET /nepal/cities/search` — GeoNames city lookup (lat/lon/timezone)
- `GET /nepal/cities/popular` — frequently used cities
- `GET /nepal/sankranti/year/{ad_year}` — exact solar ingress timestamps
- `GET /nepal/panchanga/{date}?format=surya|toyanath` — presentation layer
- `GET /about` — methodology, references, and version metadata

Pass `?city=kathmandu` (or `?city_id=1283240`) on any panchanga endpoint instead of lat/lon.
"""

app = FastAPI(
    title="Surya Panchanga API",
    description=_DESCRIPTION,
    version="2.2.0",
    lifespan=lifespan,
    contact={
        "name": "Surya Panchanga",
        "url": "https://github.com/sushilldhakal/patro",
    },
    license_info={
        "name": "MIT",
    },
)


def _cors_origins() -> list[str]:
    """Merge env-configured origins with defaults so local dev ports stay allowed."""
    configured = config.cors_origins() or []
    merged: list[str] = []
    seen: set[str] = set()
    for origin in (*DEFAULT_CORS_ORIGINS, *configured):
        if origin not in seen:
            seen.add(origin)
            merged.append(origin)
    return merged


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def location_params(
    lat: float | None = Query(None, description="Observer latitude (−90 to 90)"),
    lon: float | None = Query(None, description="Observer longitude (−180 to 180)"),
    timezone: str | None = Query(None, description="IANA timezone (e.g. Asia/Kathmandu)"),
    city: str | None = Query(
        None,
        description="City name — resolves lat/lon/timezone from GeoNames SQLite DB",
    ),
    city_id: int | None = Query(None, description="GeoNames city id (overrides city name)"),
) -> ObserverLocation:
    try:
        return resolve_location_from_query(
            lat=lat,
            lon=lon,
            timezone=timezone,
            city=city,
            city_id=city_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


LocationDep = Annotated[ObserverLocation, Depends(location_params)]


def _validate_bs_year(year: int) -> None:
    if not 2000 <= year <= 2200:
        raise HTTPException(status_code=400, detail="year must be a BS year between 2000 and 2200")


def _validate_bs_month(month: int) -> None:
    if not 1 <= month <= 12:
        raise HTTPException(status_code=400, detail="month must be 1..12")


def _enrich_holiday_bs_dates(holidays: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Add bs_start_date and bs_end_date to each holiday entry."""
    result = []
    for h in holidays:
        start_ad = date.fromisoformat(h["start_date"])
        end_ad = date.fromisoformat(h["end_date"])
        result.append({
            **h,
            "bs_start_date": format_bs_date(*gregorian_to_bs(start_ad)),
            "bs_end_date": format_bs_date(*gregorian_to_bs(end_ad)),
        })
    return result


def _nepal_holidays_for_ad_year(
    ad_year: int,
    location,
    *,
    cache_only: bool = True,
) -> list[dict[str, Any]]:
    """Collect Nepal public holidays that overlap a Gregorian year from both overlapping BS years."""
    seen: dict[str, dict[str, Any]] = {}
    for bs_year in (ad_year + 56, ad_year + 57):
        try:
            payload = get_bs_holidays(bs_year, location, cache_only=cache_only)
            for h in payload["holidays"]:
                start = date.fromisoformat(h["start_date"])
                end = date.fromisoformat(h["end_date"])
                if start.year <= ad_year <= end.year or start.year == ad_year or end.year == ad_year:
                    seen[h["id"]] = h
        except HolidayCacheMissError:
            pass
    holidays = sorted(seen.values(), key=lambda h: h["start_date"])
    return _enrich_holiday_bs_dates(holidays)


@app.get("/health")
def health():
    warmed = getattr(app.state, "precomputed_bs_years", None)
    from core.paths import cities_db_path
    from services.panchanga_cache import cache_stats

    return {
        "status": "ok",
        "precomputed_bs_years": warmed,
        "cities_db": cities_db_path().is_file(),
        "panchanga_cache": cache_stats(),
    }


@app.get("/nepal/cities/search", tags=["cities"])
@app.get("/cities/search", tags=["cities"])
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


@app.get("/nepal/cities/popular", tags=["cities"])
@app.get("/cities/popular", tags=["cities"])
def cities_popular():
    """Frequently used cities (Kathmandu, Delhi, Sydney, etc.)."""
    try:
        return {"count": len(get_popular_cities()), "cities": get_popular_cities()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/about", tags=["meta"])
def about():
    """
    Methodology, references, and version metadata for the Surya Panchanga API.

    Returns a structured description of the calculation engine, the five panchanga
    angas, Adhik/Kshaya Maas detection, and numbered academic references.
    """
    return {
        "name": "Surya Panchanga API",
        "version": "2.2.0",
        "repository": "https://github.com/sushilldhakal/patro",
        "calculation_engine": {
            "framework": "Surya Siddhanta (ancient) + drik (modern precise) algorithms",
            "ephemeris": "Swiss Ephemeris (pyswisseph) — true sidereal Sun/Moon longitudes",
            "ayanamsa": "Lahiri (Chitrapaksha) — standard for Nepali panchanga",
            "sunrise_model": "Geometric horizon, atmospheric refraction 0.5667°",
            "udaya_tithi": (
                "Tithi at local sunrise is used for festival assignment "
                "(traditional Nepali panchanga practice)"
            ),
        },
        "panchangas": [
            {
                "name": "Tithi",
                "name_ne": "तिथि",
                "division": "12°",
                "description": (
                    "Lunar day — the angular separation between Moon and Sun divided by 12°. "
                    "One synodic month = 30 tithis."
                ),
            },
            {
                "name": "Nakshatra",
                "name_ne": "नक्षत्र",
                "division": "13°20′",
                "description": (
                    "Lunar mansion — the ecliptic divided into 27 equal segments of 13°20′ "
                    "each. Determined by the Moon's sidereal longitude."
                ),
            },
            {
                "name": "Yoga",
                "name_ne": "योग",
                "division": "13°20′",
                "description": (
                    "Sum of the Sun's and Moon's sidereal longitudes divided into 27 equal "
                    "segments of 13°20′. Indicates auspiciousness of the day."
                ),
            },
            {
                "name": "Karana",
                "name_ne": "करण",
                "division": "6°",
                "description": (
                    "Half-tithi — the angular separation divided by 6°. "
                    "Two karanas make one tithi; 60 karanas in a synodic month."
                ),
            },
            {
                "name": "Vaara",
                "name_ne": "वार",
                "division": None,
                "description": (
                    "Day of the week counted from local sunrise. "
                    "The Vaara changes at sunrise, not midnight."
                ),
            },
        ],
        "special_months": {
            "adhik_maas": {
                "also_known_as": ["Mala Maas", "Purushottam Maas"],
                "description": (
                    "Extra intercalary lunar month that occurs every ~32–33 months when "
                    "NO Sankranti (solar ingress into a new rashi) falls within a lunar month. "
                    "Detected by scanning Swiss Ephemeris solar longitudes across the month."
                ),
                "frequency": "Every 32–33 months (roughly 7 times per 19 years)",
                "next_known": "Adhik Jestha 2026 (BS 2083)",
            },
            "kshaya_maas": {
                "description": (
                    "Extremely rare 'lost' lunar month when TWO Sankrantis fall within a "
                    "single lunar month. The month name is considered to 'disappear'. "
                    "Always preceded and followed by an Adhik Maas in the same year."
                ),
                "frequency": "Approximately once every 141 years",
                "last_occurrence": "BS 2020 (1963 CE)",
                "next_predicted": "BS 2198 (2141 CE)",
            },
        },
        "muhurta": {
            "description": (
                "Inauspicious time windows derived by dividing the daytime "
                "(sunrise to sunset) into 8 equal Hora Kalas. Each weekday "
                "assigns a different Hora to Rahu Kalam, Yamaganda, and Gulika."
            ),
            "rahu_kalam": {
                "lord": "Rahu",
                "period_by_vaara": "Sun→8, Mon→2, Tue→7, Wed→5, Thu→6, Fri→4, Sat→3",
                "avoid": "Starting new ventures, travel, important decisions",
            },
            "yamaganda": {
                "lord": "Yama",
                "period_by_vaara": "Sun→5, Mon→4, Tue→3, Wed→2, Thu→1, Fri→8, Sat→7",
            },
            "gulika": {
                "lord": "Gulika (Manda-putra / son of Saturn)",
                "period_by_vaara": "Sun→7, Mon→6, Tue→5, Wed→4, Thu→3, Fri→2, Sat→1",
            },
            "abhijit": {
                "description": (
                    "Most auspicious window — 8th of 15 daytime muhurtas, "
                    "centred on local solar noon. Duration ≈ (day_length / 15) minutes."
                ),
            },
        },
        "gochar": {
            "description": (
                "Current planetary positions (Gochar) in rashi format at local sunrise. "
                "Includes retrograde (Vakri) status and next rashi-entry time via bisection."
            ),
            "planets": "Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu",
            "endpoint": "GET /nepal/gochar/{date}?upcoming=true for slow-graha yearly transits",
        },
        "references": [
            {
                "id": 1,
                "title": "The Vedic Calendar — ISKCON South Africa",
                "url": "https://iskconza.com/community-programs/holy-days/the-vedic-calendar/",
            },
            {
                "id": 2,
                "title": "Panchanga Computation — Indian Journal of Science and Technology",
                "url": "https://indjst.org/download-article.php?Article_Unique_Id=INDJST12627&Full_Text_Pdf_Download=True",
            },
            {
                "id": 3,
                "title": "Mirror of Sky: The Panchang — Kalya Shastra",
                "url": "https://kalyashastra.com/blogs/knowledge-learning-experiences/mirror-of-sky-the-panchang",
            },
            {
                "id": 4,
                "title": "Panchang — Academia.edu",
                "url": "https://www.academia.edu/41679668/Panchang",
            },
            {
                "id": 5,
                "title": "Decoding Indian Calendar — ResearchGate",
                "url": "https://www.researchgate.net/publication/352877999_Decoding_Indian_Calendar",
            },
            {
                "id": 6,
                "title": "Panchanga Index — NAMA",
                "url": "https://nama.co.in/index_panchanga.php",
            },
            {
                "id": 7,
                "title": "Personal Panchang Library — Komilla Sutton",
                "url": "https://komilla.com/lib-personal-panchang.html",
            },
            {
                "id": 8,
                "title": "Panchang Implementation Gist — prajwalkpatil (GitHub)",
                "url": "https://gist.github.com/prajwalkpatil/865d54b9453a6902f55800e43280da7c",
            },
        ],
    }


@app.get("/panchanga/{bs_year}/{bs_month}")
def panchanga_month(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
    full: bool = Query(False, description="Include full daily state per day"),
):
    """BS month calendar — Patro grid as structured JSON."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return build_month_calendar(bs_year, bs_month, location, full=full)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/panchanga/{date_key}")
def panchanga_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs", description="Date era: bs (2083-10-12) or ad (2027-01-25)"),
    festivals: bool = Query(False, description="Include festivals on this day"),
    detail: bool = Query(True, description="Include full computation detail block"),
):
    """Daily panchanga — single-day astronomical time-state."""
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return build_daily_state(
        greg,
        location,
        include_festivals=festivals,
        include_detail=detail,
    )


@app.get("/festivals/bs/{bs_year}")
def festivals_bs_year(
    bs_year: int,
    location: LocationDep,
    month: int | None = Query(None, ge=1, le=12, description="Bikram Sambat month (1–12)"),
):
    """All festivals/observances for a BS year (includes regional events)."""
    _validate_bs_year(bs_year)
    try:
        from services.holiday_generator import FestivalCacheMissError, get_bs_festivals

        return get_bs_festivals(bs_year, location, cache_only=True, bs_month=month)
    except FestivalCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/festivals/{date_key}")
def festivals_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Festivals active on a BS or AD date."""
    try:
        return build_festivals_for_date(date_key, location, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/holidays/{year}")
def holidays(
    year: int,
    location: LocationDep,
    month: int | None = Query(None, ge=1, le=12, description="Bikram Sambat month (1–12)"),
):
    """BS-year public holiday list (cache-backed; festivals are on /festivals)."""
    _validate_bs_year(year)
    try:
        return get_bs_holidays(year, location, cache_only=True, bs_month=month)
    except HolidayCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/convert/ad-to-bs/{ad_date}")
def convert_ad_to_bs(ad_date: date):
    """Convert an AD (Gregorian) date to Bikram Sambat with full metadata."""
    try:
        bs_year, bs_month, bs_day = gregorian_to_bs(ad_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ad_date": ad_date.isoformat(),
        "bs_year": bs_year,
        "bs_month": bs_month,
        "bs_day": bs_day,
        "bs_date": format_bs_date(bs_year, bs_month, bs_day),
        "bs_month_name": bs_month_name(bs_month),
        "bs_month_name_ne": bs_month_name(bs_month, nepali=True),
        "weekday": ad_date.strftime("%A"),
    }


@app.get("/convert/bs-to-ad/{bs_date}")
def convert_bs_to_ad(bs_date: str):
    """Convert a BS (Bikram Sambat) date to AD (Gregorian) with full metadata."""
    try:
        bs_year, bs_month, bs_day = parse_bs_date(bs_date)
        greg = bs_to_gregorian(bs_year, bs_month, bs_day)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "bs_date": format_bs_date(bs_year, bs_month, bs_day),
        "bs_year": bs_year,
        "bs_month": bs_month,
        "bs_day": bs_day,
        "bs_month_name": bs_month_name(bs_month),
        "bs_month_name_ne": bs_month_name(bs_month, nepali=True),
        "ad_date": greg.isoformat(),
        "weekday": greg.strftime("%A"),
    }


@app.get("/nepal/holidays")
def nepal_holidays(
    location: LocationDep,
    year: int = Query(..., description="Year to query"),
    era: Literal["bs", "ad"] = Query("bs", description="Calendar era for the year param (bs or ad)"),
    month: int | None = Query(None, ge=1, le=12, description="Month filter (1–12 in the given era)"),
):
    """
    Nepal public holidays with both BS and AD dates for every entry.

    Pass era=ad to query by Gregorian year (e.g. year=2025&era=ad).
    Pass era=bs to query by Bikram Sambat year (e.g. year=2082&era=bs, the default).
    Each holiday entry includes start_date / end_date (AD) plus bs_start_date / bs_end_date.
    """
    if era == "ad":
        holidays = _nepal_holidays_for_ad_year(year, location)
        if month is not None:
            target_month_start = date(year, month, 1)
            import calendar as _cal
            last = _cal.monthrange(year, month)[1]
            target_month_end = date(year, month, last)
            holidays = [
                h for h in holidays
                if date.fromisoformat(h["start_date"]) <= target_month_end
                and date.fromisoformat(h["end_date"]) >= target_month_start
            ]
        return {
            "ad_year": year,
            "era": "ad",
            "count": len(holidays),
            "holidays": holidays,
        }

    # era == "bs"
    _validate_bs_year(year)
    try:
        from services.holiday_generator import filter_holidays_by_bs_month
        payload = get_bs_holidays(year, location, cache_only=True)
    except HolidayCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    holidays_list = payload["holidays"]
    if month is not None:
        from services.holiday_generator import filter_holidays_by_bs_month
        holidays_list = filter_holidays_by_bs_month(holidays_list, year, month)

    return {
        "bs_year": year,
        "era": "bs",
        "gregorian_range": payload["gregorian_range"],
        "count": len(holidays_list),
        "holidays": _enrich_holiday_bs_dates(holidays_list),
    }


@app.get("/nepal/festivals")
def nepal_festivals(
    location: LocationDep,
    year: int = Query(..., description="Year to query"),
    era: Literal["bs", "ad"] = Query("bs", description="Calendar era for the year param"),
    month: int | None = Query(None, ge=1, le=12, description="Month filter"),
):
    """
    All Nepal festivals (including regional) with both BS and AD dates.

    Supports era=ad or era=bs for the year parameter.
    """
    if era == "ad":
        # Collect festivals from the two overlapping BS years
        from services.holiday_generator import get_bs_festivals
        seen: dict[str, Any] = {}
        for bs_year in (year + 56, year + 57):
            try:
                payload = get_bs_festivals(bs_year, location, cache_only=True)
                for f in payload["festivals"]:
                    start = date.fromisoformat(f["start_date"])
                    end = date.fromisoformat(f["end_date"])
                    if start.year <= year <= end.year or start.year == year or end.year == year:
                        seen[f["id"]] = f
            except FestivalCacheMissError:
                pass

        festivals = sorted(seen.values(), key=lambda f: f["start_date"])
        if month is not None:
            import calendar as _cal
            last = _cal.monthrange(year, month)[1]
            m_start = date(year, month, 1)
            m_end = date(year, month, last)
            festivals = [
                f for f in festivals
                if date.fromisoformat(f["start_date"]) <= m_end
                and date.fromisoformat(f["end_date"]) >= m_start
            ]
        enriched = _enrich_holiday_bs_dates(festivals)
        return {"ad_year": year, "era": "ad", "count": len(enriched), "festivals": enriched}

    # era == "bs"
    _validate_bs_year(year)
    from services.holiday_generator import get_bs_festivals
    try:
        payload = get_bs_festivals(year, location, cache_only=True, bs_month=month)
    except FestivalCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    enriched = _enrich_holiday_bs_dates(payload["festivals"])
    result = {**payload, "era": "bs", "count": len(enriched), "festivals": enriched}
    return result


@app.get("/nepal/panchanga/{date_key}")
def nepal_panchanga_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs", description="Date era: bs (2083-10-12) or ad (2027-01-25)"),
    format: Literal["raw", "surya", "toyanath", "canonical", "patro"] = Query(
        "surya",
        description="Surya canonical (default), toyanath patro, raw engine, or patro alias",
    ),
    variant: Literal["default", "nepal_official", "toyanath", "surya"] = Query(
        "default",
        description="Cultural rule variant (interpretation layer, not astronomy)",
    ),
):
    """
    Combined daily panchanga + festivals + public holiday status.

    Returns tithi, nakshatra, yoga, karana, sunrise/sunset, and all
    festivals/observances active on the day — in a single call.
    Accepts both BS (era=bs, default) and AD (era=ad) date formats.

    Use `format=toyanath` for printed-patro style Devanagari layout, or
    `format=surya` for structured web/mobile grid rows.
    """
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    state = build_daily_state(greg, location, include_festivals=True, include_detail=False)

    from services.holiday_generator import is_public_holiday
    festivals = state.get("festivals", [])
    for f in festivals:
        f["is_public_holiday"] = is_public_holiday(f["id"])

    state["is_public_holiday"] = any(f.get("is_public_holiday") for f in festivals)
    state.pop("detail", None)

    if format == "raw":
        return state
    return render_panchanga(state, style=format, variant=variant)


@app.get("/nepal/panchanga/month/{bs_year}/{bs_month}")
def nepal_panchanga_month_formatted(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
    format: Literal["raw", "surya", "toyanath", "canonical", "patro"] = Query("patro"),
    variant: Literal["default", "nepal_official", "toyanath", "surya"] = Query("default"),
    full: bool = Query(False, description="Include full daily state per day"),
):
    """BS month printable Patro grid (Surya canonical month view)."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        if format == "patro":
            return build_patro_month(bs_year, bs_month, location)
        month_payload = build_month_calendar(bs_year, bs_month, location, full=full)
        header = build_calendar_header(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if format == "raw":
        return month_payload
    return render_panchanga_month(month_payload, style=format, variant=variant, header=header)


@app.get("/nepal/sankranti/year/{ad_year}", tags=["sankranti"])
def nepal_sankranti_year(
    ad_year: int,
    location: LocationDep,
):
    """
    All Sankrantis (solar ingresses) in a Gregorian year with exact timestamps.

    Critical for BS month boundaries, Maghe/Mesh Sankranti festivals, and
    Adhik/Kshaya Maas detection.
    """
    from panchanga.sankranti_calendar import build_sankranti_year_response

    return build_sankranti_year_response(ad_year, location)


@app.get("/nepal/sankranti/{date_key}", tags=["sankranti"])
def nepal_sankranti_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Sankrantis occurring on or near a given date."""
    from panchanga.sankranti_calendar import build_sankranti_day_response

    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return build_sankranti_day_response(greg, location)


@app.get("/nepal/gochar/year/{bs_year}")
def nepal_gochar_year(
    bs_year: int,
    location: LocationDep,
):
    """
    Yearly Gochar summary — slow-graha transit timeline + monthly rashi snapshots.

    Useful for transit charts and yearly planetary overview panels.
    """
    _validate_bs_year(bs_year)
    from panchanga.gochar import build_gochar_year_summary

    return build_gochar_year_summary(bs_year, location)


@app.get("/nepal/patro/{bs_year}/{bs_month}")
def nepal_patro_grid(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
):
    """
    Printable Surya-style monthly Patro grid — canonical month response.

    Each day row comes from panchanga cache (city + date). Header includes
    Shaka, Nepal Sambat, and AD month labels.
    """
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return build_patro_month(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/nepal/patro/{bs_year}/{bs_month}/legacy")
def nepal_patro_bs(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
):
    """
    Festival panchanga (patro) for a BS month — every day's tithi, nakshatra,
    weekday, sunrise/sunset, and festivals in one response.
    """
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return generate_bs_month_patro(bs_year, bs_month, location, include_panchanga=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/nepal/patro/ad/{ad_year}/{ad_month}")
def nepal_patro_ad(
    ad_year: int,
    ad_month: int,
    location: LocationDep,
):
    """
    Festival panchanga (patro) for an AD (Gregorian) month.
    Internally maps to the overlapping BS month(s) and returns the same rich
    patro grid — tithi, nakshatra, festivals — for the Gregorian month range.
    """
    if not 1 <= ad_month <= 12:
        raise HTTPException(status_code=400, detail="ad_month must be 1..12")
    import calendar as _cal
    from panchanga.bikram_sambat import iter_bs_month_days
    from panchanga.daily import get_daily_panchanga
    from services.patro_generator import _collect_bs_year_festivals, _festivals_for_day

    last_day = _cal.monthrange(ad_year, ad_month)[1]
    month_start_ad = date(ad_year, ad_month, 1)
    month_end_ad = date(ad_year, ad_month, last_day)

    # Determine which BS year(s) overlap this AD month
    bs_years = sorted({gregorian_to_bs(month_start_ad)[0], gregorian_to_bs(month_end_ad)[0]})

    all_festivals: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for bs_year in bs_years:
        for f in _collect_bs_year_festivals(bs_year, location):
            if f["id"] not in seen_ids:
                seen_ids.add(f["id"])
                all_festivals.append(f)

    from datetime import timedelta
    from services.holiday_generator import is_public_holiday

    days: list[dict[str, Any]] = []
    current = month_start_ad
    while current <= month_end_ad:
        bs_year_d, bs_month_d, bs_day_d = gregorian_to_bs(current)
        panchanga = get_daily_panchanga(current, location)
        day_festivals = _festivals_for_day(all_festivals, current)
        days.append({
            "date_ad": current.isoformat(),
            "bs_date": format_bs_date(bs_year_d, bs_month_d, bs_day_d),
            "bs_month_name": bs_month_name(bs_month_d),
            "weekday": panchanga["vaara"]["name_english"],
            "weekday_ne": panchanga["vaara"]["name_ne"],
            "tithi": panchanga["tithi"]["name"],
            "tithi_ne": panchanga["tithi"]["name_ne"],
            "nakshatra": panchanga["nakshatra"]["name"],
            "paksha": panchanga["paksha"]["label_en"],
            "sunrise": panchanga["sunrise"]["local_time_short"],
            "sunset": panchanga["sunset"]["local_time_short"],
            "festivals": [
                {
                    "id": f["id"],
                    "name": f.get("name_en") or f.get("name"),
                    "name_ne": f.get("name_ne"),
                    "is_public_holiday": is_public_holiday(f["id"]),
                }
                for f in day_festivals
            ],
        })
        current += timedelta(days=1)

    return {
        "ad_year": ad_year,
        "ad_month": ad_month,
        "ad_month_name": month_start_ad.strftime("%B"),
        "ad_range": {"start": month_start_ad.isoformat(), "end": month_end_ad.isoformat()},
        "location": location.as_dict(),
        "days": days,
    }


@app.post("/generate/panchanga/popular/{bs_year}")
def generate_panchanga_popular_cities(
    bs_year: int,
    force: bool = Query(False),
):
    """Precompute panchanga cache for all popular cities (Kathmandu, Delhi, Sydney, …)."""
    _validate_bs_year(bs_year)
    from core.location import resolve_location_from_query
    from panchanga.bikram_sambat import iter_bs_month_days
    from services.cities_db import POPULAR_CITY_IDS
    from services.panchanga_cache import cache_stats, precompute_range, resolve_cache_keys

    dates = [
        greg
        for month in range(1, 13)
        for _, greg in iter_bs_month_days(bs_year, month)
    ]
    results = []
    total_written = 0
    for city_id in POPULAR_CITY_IDS:
        loc = resolve_location_from_query(city_id=city_id)
        key, _ = resolve_cache_keys(loc)
        written = precompute_range(loc, dates, skip_existing=not force)
        total_written += written
        results.append({"city_id": city_id, "location_key": key, "days_written": written})

    return {
        "status": "generated",
        "bs_year": bs_year,
        "cities": len(POPULAR_CITY_IDS),
        "days_total_per_city": len(dates),
        "total_rows_written": total_written,
        "results": results,
        "cache": cache_stats(),
    }


@app.post("/generate/panchanga/{bs_year}")
def generate_panchanga_year(
    bs_year: int,
    location: LocationDep,
    force: bool = Query(False, description="Recompute days already in cache"),
):
    """Precompute panchanga SQLite cache for every day in a BS year at this location."""
    _validate_bs_year(bs_year)
    from panchanga.bikram_sambat import iter_bs_month_days
    from services.panchanga_cache import cache_stats, precompute_range, resolve_cache_keys

    dates = [
        greg
        for month in range(1, 13)
        for _, greg in iter_bs_month_days(bs_year, month)
    ]
    location_key, city_id = resolve_cache_keys(location)
    written = precompute_range(location, dates, skip_existing=not force)
    return {
        "status": "generated",
        "bs_year": bs_year,
        "location_key": location_key,
        "city_id": city_id,
        "days_written": written,
        "days_total": len(dates),
        "cache": cache_stats(),
    }


@app.post("/generate/{year}")
def generate_year(
    year: int,
    location: LocationDep,
):
    """Precompute holiday cache for a BS year."""
    _validate_bs_year(year)
    payload = precompute_bs_year(year, location)
    return {
        "status": "generated",
        "bs_year": payload["bs_year"],
        "gregorian_range": payload["gregorian_range"],
        "count": payload["count"],
        "cache_key": location.cache_key(),
        "generated_at": payload["generated_at"],
    }


@app.get("/calendar/header/{bs_year}/{bs_month}")
def calendar_header(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
):
    """Multi-era calendar header (BS, AD, lunar, Shaka, Nepal Sambat)."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return build_calendar_header(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/kundali/{date_key}")
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


@app.get("/day/{target_date}")
def day_view_legacy(
    target_date: date,
    location: LocationDep,
):
    return holidays_on_date(target_date, location)


@app.get("/patro/{bs_year}/{bs_month}")
def patro_month_legacy(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
    panchanga: bool = Query(True),
):
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return generate_bs_month_patro(bs_year, bs_month, location, include_panchanga=panchanga)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/nepal/gochar/{date_key}")
def nepal_gochar(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs", description="Date era"),
    upcoming: bool = Query(False, description="Include upcoming transits for slow grahas (Jupiter, Saturn, Rahu, Ketu)"),
):
    """
    Gochar (planetary transit) table for a date.

    Returns the current sidereal position of all 9 grahas (Sun, Moon, Mars,
    Mercury, Jupiter, Venus, Saturn, Rahu, Ketu) in rashi format at local
    sunrise, plus the next rashi-entry time for each graha.

    Set ?upcoming=true to also receive the next 3 rashi entries for the
    slow-moving grahas — useful for a yearly transit summary panel.
    """
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    from panchanga.gochar import build_gochar_response
    return build_gochar_response(
        greg, location,
        include_next_entry=True,
        include_upcoming=upcoming,
    )


@app.get("/nepal/panchanga/year/{bs_year}")
def nepal_panchanga_year(
    bs_year: int,
    location: LocationDep,
):
    """
    Full-year Panchanga summary for a BS year.

    Returns one entry per day with tithi, nakshatra, yoga, karana, vaara,
    sunrise/sunset, muhurta windows, and festival markers — structured for
    calendar grid rendering or year-level caching.

    Computationally intensive (~365 days × full panchanga). Recommended to
    call this once and cache the result; the /generate endpoint pre-warms
    the holiday cache separately.
    """
    _validate_bs_year(bs_year)
    from panchanga.bikram_sambat import (
        iter_bs_month_days,
        format_bs_date,
        gregorian_to_bs,
    )
    from panchanga.daily import get_daily_panchanga

    all_greg_days: list[date] = []
    for month in range(1, 13):
        all_greg_days.extend(greg for _, greg in iter_bs_month_days(bs_year, month))

    days = []
    for greg in all_greg_days:
        p = get_daily_panchanga(greg, location)
        bs = p["bs_date"]
        m  = p.get("muhurta", {})
        days.append({
            "date_bs":     format_bs_date(bs["year"], bs["month"], bs["day"]),
            "date_ad":     greg.isoformat(),
            "weekday":     p["vaara"]["name_ne"],
            "weekday_en":  p["vaara"]["name_english"],
            "tithi":       p["tithi"]["name"],
            "tithi_ne":    p["tithi"]["name_ne"],
            "nakshatra":   p["nakshatra"]["name"],
            "paksha":      p["paksha"]["label_en"],
            "sunrise":     p["sunrise"]["local_time_short"],
            "sunset":      p["sunset"]["local_time_short"],
            "rahu_kalam": {
                "start": (m.get("rahu_kalam") or {}).get("start_time"),
                "end":   (m.get("rahu_kalam") or {}).get("end_time"),
            },
            "abhijit": {
                "start": (m.get("abhijit") or {}).get("start_time"),
                "end":   (m.get("abhijit") or {}).get("end_time"),
            },
            "is_public_holiday": False,  # filled by festival overlay if needed
        })

    from panchanga.bikram_sambat import get_bs_month_start, get_bs_month_length, bs_to_gregorian
    yr_start = get_bs_month_start(bs_year, 1)
    yr_end   = bs_to_gregorian(bs_year, 12, get_bs_month_length(bs_year, 12))
    return {
        "bs_year":          bs_year,
        "gregorian_range":  {"start": yr_start.isoformat(), "end": yr_end.isoformat()},
        "location":         location.as_dict(),
        "count":            len(days),
        "days":             days,
    }


@app.get("/nepal/special-months/{bs_year}")
def nepal_special_months(
    bs_year: int,
    location: LocationDep,
):
    """
    Adhik Maas (Mala Maas) and Kshaya Maas info for a BS year.

    Adhik Maas is the intercalary extra lunar month (no Sankranti) that
    occurs every ~32–33 months to reconcile the lunar and solar calendars.
    Also called Mala Maas or Purushottam Maas.

    Kshaya Maas is an extremely rare lost month (two Sankrantis in one lunar
    month) — last in BS 2020 (1963 CE). Returned as is_kshaya: false in
    most years.
    """
    _validate_bs_year(bs_year)
    from services.holiday_generator import get_special_months_for_bs_year
    try:
        return get_special_months_for_bs_year(bs_year, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/patro/{bs_year}")
def patro_year_legacy(
    bs_year: int,
    location: LocationDep,
    panchanga: bool = Query(True),
):
    _validate_bs_year(bs_year)
    try:
        return generate_patro(bs_year, location, include_panchanga=panchanga)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
