"""Open Graph share-image endpoint for the Panchanga page.

Returns a 1200×630 PNG so a shared /panchanga link renders a rich, per-date /
per-location preview on Facebook, X, WhatsApp, etc. The query params mirror the
front-end's shareable-URL params (city / lat / lon / tz / place / date / time)
so the og:image URL can be built by simply swapping the path to /og-image.
"""

from __future__ import annotations

import html
import logging
from datetime import date

from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse, Response

import config
from engine.astronomy.location import (
    DEFAULT_LOCATION,
    ObserverLocation,
    resolve_location,
    resolve_location_from_query,
)
from services.og_image import og_fields, render_panchanga_og
from services.panchanga_api import build_daily_state

logger = logging.getLogger(__name__)

router = APIRouter(tags=["og"])

# Cache the PNG hard: the panchanga for a given date/place never changes, and
# crawlers (and any CDN in front) should reuse it rather than re-render.
_CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, immutable"
# The crawler HTML is cheap and can change with copy tweaks — cache it briefly.
_HTML_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400"


def _parse_date(date_q: str | None) -> date:
    try:
        return date.fromisoformat(date_q) if date_q else date.today()
    except ValueError:
        return date.today()


def _resolve_location(
    *, city: int | None, lat: float | None, lon: float | None, tz: str | None
) -> ObserverLocation:
    """Resolve location, degrading gracefully so a crawler never gets a 4xx:
    unknown city id / missing cities DB → coords → Kathmandu default."""
    try:
        return resolve_location_from_query(lat=lat, lon=lon, timezone=tz, city_id=city)
    except (ValueError, FileNotFoundError):
        try:
            return resolve_location(lat=lat, lon=lon, timezone=tz)
        except ValueError:
            return DEFAULT_LOCATION


def _card_png(*, city, lat, lon, tz, place, date_q) -> bytes:
    """Pillow fallback card — used when the headless screenshot is unavailable."""
    greg = _parse_date(date_q)
    location = _resolve_location(city=city, lat=lat, lon=lon, tz=tz)
    payload = build_daily_state(greg, location, include_festivals=False, include_detail=True)
    return render_panchanga_og(payload, date_ad=greg.isoformat(), location_name=place or location.name)


@router.get("/og-image")
def og_image(
    request: Request,
    city: int | None = Query(None, description="GeoNames city id (shareable-URL 'city' param)"),
    lat: float | None = Query(None, description="Observer latitude"),
    lon: float | None = Query(None, description="Observer longitude"),
    tz: str | None = Query(None, description="IANA timezone, e.g. Asia/Kathmandu"),
    place: str | None = Query(None, description="Display label for the location"),
    date_q: str | None = Query(None, alias="date", description="AD date YYYY-MM-DD (default: today)"),
    time: str | None = Query(None, description="HH:MM — needle position on the chart / URL parity"),
    full: bool = Query(False, description="Full-height chart (standalone photo) instead of the 1200×630 link-preview frame"),
):
    # Preferred: screenshot the real दिन-चक्र timeline chart. Fall back to the
    # Pillow card if the browser is unavailable or the render fails, so a crawler
    # always gets an image.
    png: bytes | None = None
    from services.og_screenshot import render_timeline_png, screenshot_available

    if screenshot_available():
        try:
            # `full` is passed through: the preview page renders the tall
            # standalone chart for it, and the fixed 1200×630 share card
            # otherwise.
            png = render_timeline_png(request.url.query, letterbox=not full)
        except Exception:
            logger.warning("OG timeline screenshot failed; using card fallback", exc_info=True)

    if png is None:
        png = _card_png(city=city, lat=lat, lon=lon, tz=tz, place=place, date_q=date_q)

    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": _CACHE_CONTROL, "CDN-Cache-Control": _CACHE_CONTROL},
    )


def _share_html(*, title: str, description: str, page_url: str, image_url: str) -> str:
    """Minimal HTML doc carrying the Open Graph tags a link-preview crawler reads.
    Humans who land here (rare — nginx only routes bots) are redirected to the app."""
    t, d = html.escape(title), html.escape(description)
    pu, iu = html.escape(page_url), html.escape(image_url)
    return (
        "<!doctype html><html lang=\"ne\"><head><meta charset=\"utf-8\">"
        f"<title>{t}</title>"
        f"<meta name=\"description\" content=\"{d}\">"
        f"<link rel=\"canonical\" href=\"{pu}\">"
        "<meta property=\"og:type\" content=\"website\">"
        "<meta property=\"og:site_name\" content=\"Vedic Patro\">"
        f"<meta property=\"og:title\" content=\"{t}\">"
        f"<meta property=\"og:description\" content=\"{d}\">"
        f"<meta property=\"og:url\" content=\"{pu}\">"
        f"<meta property=\"og:image\" content=\"{iu}\">"
        # /og-image always returns a fixed 1200×630 frame (chart letterboxed, or
        # the Pillow card), so the exact ratio is safe to advertise.
        "<meta property=\"og:image:width\" content=\"1200\">"
        "<meta property=\"og:image:height\" content=\"630\">"
        "<meta property=\"og:image:type\" content=\"image/png\">"
        "<meta property=\"og:locale\" content=\"ne_NP\">"
        "<meta name=\"twitter:card\" content=\"summary_large_image\">"
        f"<meta name=\"twitter:title\" content=\"{t}\">"
        f"<meta name=\"twitter:description\" content=\"{d}\">"
        f"<meta name=\"twitter:image\" content=\"{iu}\">"
        f"<meta http-equiv=\"refresh\" content=\"0; url={pu}\">"
        f"</head><body><a href=\"{pu}\">{t}</a></body></html>"
    )


@router.get("/share/panchanga", include_in_schema=False)
def share_panchanga(
    request: Request,
    city: int | None = Query(None),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    tz: str | None = Query(None),
    place: str | None = Query(None),
    date_q: str | None = Query(None, alias="date"),
    time: str | None = Query(None),
):
    """Crawler-facing HTML for a shared /panchanga link. nginx proxies link-preview
    bots here; it emits per-date og:title / og:description / og:image so the
    preview matches the exact date & place in the URL."""
    greg = _parse_date(date_q)
    location = _resolve_location(city=city, lat=lat, lon=lon, tz=tz)
    payload = build_daily_state(greg, location, include_festivals=False, include_detail=True)
    label = place or location.name
    f = og_fields(payload, date_ad=greg.isoformat(), location_name=label)

    base = config.frontend_url() or "https://vedicpatro.com"
    qs = request.url.query
    suffix = f"?{qs}" if qs else ""
    page_url = f"{base}/panchanga{suffix}"
    # Served via /api/og-image (nginx proxies /api → FastAPI), so it resolves
    # without an extra nginx rule for a bare /og-image. `v` busts the CDN /
    # scraper caches when the card layout changes — keep it in step with
    # CHART_OG_IMAGE_URL on the front-end.
    image_url = f"{base}/api/og-image{suffix}{'&' if qs else '?'}v=2"

    # Nepali (Bikram Sambat) date everywhere a human reads it — the Gregorian
    # date belongs in the URL, not in the share title.
    date_ne = f["bs_line"] or f["ad_line"]
    date_line = " · ".join(x for x in (f["weekday"], date_ne) if x)
    title = f"{f['paksha']} {f['tithi']} · {label} · {date_ne} — पञ्चाङ्ग | Vedic Patro"
    description = (
        f"{label}, {date_line}। तिथि {f['tithi']}, नक्षत्र {f['nakshatra']}, "
        f"योग {f['yoga']}, करण {f['karana']}। सूर्योदय {f['sunrise']}, सूर्यास्त {f['sunset']}।"
    )

    return HTMLResponse(
        content=_share_html(title=title, description=description, page_url=page_url, image_url=image_url),
        headers={"Cache-Control": _HTML_CACHE_CONTROL, "CDN-Cache-Control": _HTML_CACHE_CONTROL},
    )
