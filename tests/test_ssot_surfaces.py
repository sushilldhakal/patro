"""Server-owned fields that used to leak into the clients."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.gochar import get_gochar_table
from engine.vedic.patro_year_axis import (
    PATRO_EPHEMERIS_SIGNED_MAX,
    PATRO_EPHEMERIS_SIGNED_MIN,
    browse_limits,
)
from services.panchanga_api import build_month_calendar
from services.panchanga_cache import CACHE_PAYLOAD_VERSION

client = TestClient(app)


def test_browse_limits_match_ephemeris_constants():
    limits = browse_limits()
    assert limits["ephemeris_signed_min"] == PATRO_EPHEMERIS_SIGNED_MIN
    assert limits["ephemeris_signed_max"] == PATRO_EPHEMERIS_SIGNED_MAX
    assert limits["bbs_url_year_max"] == -PATRO_EPHEMERIS_SIGNED_MIN


def test_meta_capabilities_exposes_limits_and_cache_version():
    r = client.get("/meta/capabilities")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ephemeris_signed_min"] == PATRO_EPHEMERIS_SIGNED_MIN
    assert body["ephemeris_signed_max"] == PATRO_EPHEMERIS_SIGNED_MAX
    assert body["cache_payload_version"] == CACHE_PAYLOAD_VERSION
    assert "festival_stack_min_year" in body


def test_month_calendar_ships_abhijit_and_grid_meta():
    month = build_month_calendar(2083, 1, DEFAULT_LOCATION, full=False)
    assert month["month_length"] == len(month["calendar"])
    assert month["first_weekday"] in range(7)
    assert month["limits"]["ephemeris_signed_max"] == PATRO_EPHEMERIS_SIGNED_MAX
    row = month["calendar"][0]
    assert row["abhijit"]["start_time"]
    assert row["abhijit"]["end_time"]
    assert row["sunrise"]
    assert row["sunset"]


def test_gochar_table_ships_nakshatra_and_exaltation():
    table = get_gochar_table(datetime(2026, 7, 15, 6, 30, tzinfo=timezone.utc))
    sun = table["sun"]
    assert 1 <= sun["nakshatra_no"] <= 27
    assert sun["nakshatra_ne"]
    assert sun["pada"] in (1, 2, 3, 4)
    assert sun["nakshatra_lord"]
    assert sun["sub_lord"]
    assert isinstance(sun["is_exalted"], bool)


def test_rashifal_janma_accepts_bs_era_parts():
    # 1990-05-15 AD 08:30 Kathmandu == BS 2047-02-01.
    r = client.get(
        "/v1/panchanga/rashifal/janma"
        "?birth_era=bs&birth_year=2047&birth_month=2&birth_day=1"
        "&birth_clock=08:30&birth_tz=Asia/Kathmandu"
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert 1 <= body["janma_nakshatra"] <= 27
    assert 1 <= body["janma_rashi"] <= 12

    via_iso = client.get(
        "/v1/panchanga/rashifal/janma?birth=1990-05-15T08:30&birth_tz=Asia/Kathmandu"
    )
    assert via_iso.status_code == 200, via_iso.text
    assert via_iso.json() == body
