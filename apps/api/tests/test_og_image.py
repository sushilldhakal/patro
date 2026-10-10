"""Tests for the Open Graph share-image endpoints (/og-image, /share/panchanga)."""

from __future__ import annotations

from datetime import date

from starlette.testclient import TestClient

from engine.astronomy.location import DEFAULT_LOCATION
from services.og_image import og_fields, render_panchanga_og
from services.panchanga_api import build_daily_state

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _payload():
    return build_daily_state(
        date(2026, 7, 25), DEFAULT_LOCATION, include_festivals=False, include_detail=True
    )


def test_render_returns_valid_png():
    png = render_panchanga_og(_payload(), date_ad="2026-07-25", location_name="Kathmandu")
    assert png[:8] == _PNG_MAGIC
    assert len(png) > 1000


def test_og_fields_date_is_day_month_year():
    f = og_fields(_payload(), date_ad="2026-07-25", location_name="Kathmandu")
    # Day (२५) must lead, not the year — the format bug we fixed on the web header.
    assert f["ad_line"].startswith("२५")
    assert f["tithi"] and f["nakshatra"] and f["yoga"] and f["karana"]


def test_og_image_endpoint_serves_png(monkeypatch):
    # Force the Pillow-card path (no headless browser) so the test is fast and
    # deterministic; the screenshot path is exercised separately in the browser.
    monkeypatch.setenv("OG_SCREENSHOT", "false")
    client = TestClient(__import__("app.main", fromlist=["app"]).app)
    resp = client.get("/og-image", params={"date": "2026-07-25", "place": "Kathmandu"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.content[:8] == _PNG_MAGIC
    assert "max-age" in resp.headers.get("cache-control", "")


def test_og_image_endpoint_tolerates_bad_input(monkeypatch):
    monkeypatch.setenv("OG_SCREENSHOT", "false")
    client = TestClient(__import__("app.main", fromlist=["app"]).app)
    # Unknown city id + garbage date must still yield a card, never a 4xx/5xx.
    resp = client.get("/og-image", params={"city": 999999999, "date": "nonsense"})
    assert resp.status_code == 200
    assert resp.content[:8] == _PNG_MAGIC


def test_share_html_carries_dynamic_og_image():
    client = TestClient(__import__("app.main", fromlist=["app"]).app)
    resp = client.get(
        "/share/panchanga",
        params={"date": "2026-07-25", "place": "Kathmandu", "city": 1283240},
    )
    assert resp.status_code == 200
    assert 'property="og:image"' in resp.text
    # The image URL reuses the same query params as the shared page URL.
    assert "/og-image?" in resp.text
    assert "date=2026-07-25" in resp.text


def test_share_title_uses_bikram_sambat_date():
    """The link-preview title is Nepali all the way through: the Bikram Sambat
    date, never the Gregorian one (which stays in the URL)."""
    client = TestClient(__import__("app.main", fromlist=["app"]).app)
    resp = client.get("/share/panchanga", params={"date": "2026-07-25", "place": "Kathmandu"})
    assert resp.status_code == 200
    title = resp.text.split('<title>')[1].split('</title>')[0]
    f = og_fields(_payload(), date_ad="2026-07-25", location_name="Kathmandu")
    assert f["bs_line"] and f["bs_line"] in title
    assert f["ad_line"] not in title
