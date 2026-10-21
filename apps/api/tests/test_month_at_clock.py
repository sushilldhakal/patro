"""The BS month grid read at a fixed clock (``?clock=HH:MM``).

The at-time payload names the weekday ``weekday`` / ``weekday_en`` and keeps
sunrise and sunset under ``sun``; the month row read ``snap["vaara"]`` and
``snap["sunrise"]`` and the route returned 500. Each row must carry the same
weekday and sun times as the udaya month grid, with the angas at the clock.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

LOCATION = "lat=27.7172&lon=85.3240&timezone=Asia/Kathmandu"


def test_month_at_a_clock_answers_with_each_day_at_that_time():
    resp = client.get(f"/v1/panchanga/2083/7?clock=10:30&{LOCATION}")
    assert resp.status_code == 200, resp.text[:300]
    rows = resp.json()["calendar"]

    udaya = {r["date_ad"]: r for r in client.get(f"/v1/panchanga/2083/7?{LOCATION}").json()["calendar"]}
    assert len(rows) == len(udaya)
    for row in rows:
        same_day = udaya[row["date_ad"]]
        for key in ("day", "weekday", "weekday_ne", "weekday_en", "sunrise", "sunset"):
            assert row[key] == same_day[key], (row["date_ad"], key)
        assert row["mode"] == "ephemeris"
        assert row["query_instant"].startswith(f"{row['date_ad']}T10:30")


def test_the_clock_reads_the_angas_at_that_time():
    """Vijaya Dashami 2083 (Kartik 4): Dashami at 10:30, its sunrise tithi too."""
    rows = client.get(f"/v1/panchanga/2083/7?clock=10:30&{LOCATION}").json()["calendar"]
    dashain = next(r for r in rows if r["date_ad"] == "2026-10-21")
    assert dashain["tithi"] == "Dashami"
    assert dashain["weekday_en"] == "Wednesday"
