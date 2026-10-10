"""Relative day routes must not be parsed as BS/AD calendar strings."""

from fastapi.testclient import TestClient

from app.main import app


def test_panchanga_today_bs_display_era():
    client = TestClient(app)
    r = client.get(
        "/v1/panchanga/today",
        params={
            "era": "bs",
            "language": "ne",
            "festivals": "true",
            "detail": "true",
            "cv": "34",
            "city_id": 1283240,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("date_bs")
    assert body.get("date_ad")
    assert body.get("jd_ut")


def test_panchanga_today_with_input_era_returns_that_civil_day():
    client = TestClient(app)
    r = client.get(
        "/v1/panchanga/today",
        params={
            "era": "bs",
            "language": "ne",
            "inputEra": "ad",
            "year": 2026,
            "month": 8,
            "day": 2,
            "festivals": "true",
            "detail": "true",
            "city_id": 1283240,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json().get("date_ad") == "2026-08-02"


def test_date_resolver_rejects_a_relative_day_string():
    """"today" names an instant; it must never reach a calendar date parser."""
    import pytest

    from app.day_resolver import DayResolutionError, greg_date_for_date_key

    with pytest.raises(DayResolutionError, match="names an instant"):
        greg_date_for_date_key("today", "bs")
