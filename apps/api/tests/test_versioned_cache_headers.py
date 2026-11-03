"""A public response pinned to the current cv is held at the edge for a month."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.response_cache import (
    DAILY_PANCHANGA_CACHE_CONTROL,
    SAIT_CUSTOM_CACHE_CONTROL,
    VERSIONED_CDN_CACHE_CONTROL,
    versioned_cache_headers,
)
from services.panchanga.panchanga_cache import CACHE_PAYLOAD_VERSION

CV = str(CACHE_PAYLOAD_VERSION)


def test_current_cv_gets_the_month_long_edge_lifetime():
    headers = versioned_cache_headers({"cv": CV}, "/v1/panchanga/2026-11-04", DAILY_PANCHANGA_CACHE_CONTROL)
    assert headers is not None
    assert headers["CDN-Cache-Control"] == VERSIONED_CDN_CACHE_CONTROL


def test_old_or_missing_cv_keeps_the_route_headers():
    assert versioned_cache_headers({"cv": "1"}, "/v1/panchanga/2026-11-04", DAILY_PANCHANGA_CACHE_CONTROL) is None
    assert versioned_cache_headers({}, "/v1/panchanga/2026-11-04", DAILY_PANCHANGA_CACHE_CONTROL) is None


def test_private_and_browser_uncached_responses_are_left_alone():
    assert versioned_cache_headers({"cv": CV}, "/v1/x", "private, no-store") is None
    assert versioned_cache_headers({"cv": CV}, "/v1/x", None) is None
    assert versioned_cache_headers({"cv": CV}, "/v1/nepal/sait/vivah/detail", SAIT_CUSTOM_CACHE_CONTROL) is None


def test_upcoming_festivals_without_a_from_date_reads_the_clock():
    path = "/v1/nepal/festivals/upcoming"
    assert versioned_cache_headers({"cv": CV}, path, DAILY_PANCHANGA_CACHE_CONTROL) is None
    assert versioned_cache_headers({"cv": CV, "from": "2026-11-04"}, path, DAILY_PANCHANGA_CACHE_CONTROL) is not None


def test_routes_that_default_to_now_keep_their_short_headers():
    for path, query in (
        ("/v1/panchanga/today", {"cv": CV, "era": "bs"}),
        ("/v1/panchanga/rashifal", {"cv": CV, "period": "monthly"}),
        ("/v1/panchanga/at-time", {"cv": CV, "clock": "06:30"}),
        ("/v1/panchanga/rashifal/personal", {"cv": CV, "birth_year": "2050", "period": "daily"}),
    ):
        assert versioned_cache_headers(query, path, DAILY_PANCHANGA_CACHE_CONTROL) is None, path


def test_urls_that_name_their_day_get_the_long_lifetime():
    for path, query in (
        ("/v1/nepal/patro/2083/7", {"cv": CV}),
        ("/v1/panchanga/year/2083", {"cv": CV, "wheel": "true"}),
        ("/v1/panchanga/jd/2461324.5", {"cv": CV}),
        ("/v1/panchanga/today", {"cv": CV, "year": "2083", "month": "6", "day": "24"}),
        ("/v1/panchanga/at-time", {"cv": CV, "jd": "2461324.5", "clock": "06:30"}),
    ):
        assert versioned_cache_headers(query, path, DAILY_PANCHANGA_CACHE_CONTROL) is not None, path
