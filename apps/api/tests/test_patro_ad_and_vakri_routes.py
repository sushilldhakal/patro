"""Two routes that answered 500.

* ``/v1/nepal/patro/ad/{year}/{month}`` passed its arguments to
  ``festivals_for_day`` the wrong way round (a date where the festival list
  goes), so every AD month failed.
* ``/v1/nepal/graha-vakri/year/{year}`` read the era context unconditionally;
  a request without ``?era=`` has none, and the handler never reached its own
  ``year_span_jd`` fallback.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

LOCATION = "lat=27.7172&lon=85.3240&timezone=Asia/Kathmandu"


def test_ad_month_patro_lists_every_day_with_its_festivals():
    resp = client.get(f"/v1/nepal/patro/ad/2026/11?{LOCATION}")
    assert resp.status_code == 200, resp.text[:300]
    body = resp.json()
    assert (body["ad_year"], body["ad_month"], body["count"]) == (2026, 11, 30)
    days = {d["date_ad"]: d for d in body["days"]}
    assert len(days) == 30
    laxmi_puja = {f["id"] for f in days["2026-11-08"]["festivals"]}
    assert "laxmi-puja" in laxmi_puja
    assert days["2026-11-20"]["festivals"] is not None


def test_ad_month_patro_spanning_two_bs_years_keeps_each_festival_once():
    """April holds the BS new year, so two BS years' festivals are merged."""
    body = client.get(f"/v1/nepal/patro/ad/2026/4?{LOCATION}").json()
    new_year = next(d for d in body["days"] if d["date_ad"] == "2026-04-14")
    ids = [f["id"] for f in new_year["festivals"]]
    assert "bs-new-year" in ids
    assert len(ids) == len(set(ids))


def test_graha_vakri_year_answers_without_an_era():
    plain = client.get(f"/v1/nepal/graha-vakri/year/2083?{LOCATION}")
    assert plain.status_code == 200, plain.text[:300]
    with_era = client.get(f"/v1/nepal/graha-vakri/year/2083?era=bs&year=2083&{LOCATION}")
    assert with_era.status_code == 200
    # Same stations whichever way the year was named.
    assert len(plain.json()["grahas"]) == len(with_era.json()["grahas"])


def test_ad_month_grid_shows_the_nepali_new_year():
    """April holds two BS years; de-duplicating by festival id alone kept the
    old year's ``bs-new-year`` and dropped the one that falls in this month."""
    for year in (2025, 2026):
        grid = client.get(f"/v1/panchanga/ad/{year}/4?{LOCATION}").json()["calendar"]
        new_year = next(d for d in grid if d["date_ad"] == f"{year}-04-14")
        assert new_year["festivals"], year


def test_holidays_before_the_festival_era_are_empty_not_500():
    """Like /nepal/festivals, the holiday list stops at the BS 60 floor."""
    for query in ("year=57&era=bbs", "year=40&era=bs"):
        resp = client.get(f"/v1/nepal/holidays?{query}&{LOCATION}")
        assert resp.status_code == 200, (query, resp.text[:200])
        body = resp.json()
        assert body["count"] == 0 and body["holidays"] == []
        assert body["unavailable_reason"] == "pre_festival_era"
        festivals = client.get(f"/v1/nepal/festivals?{query}&{LOCATION}").json()
        assert festivals["unavailable_reason"] == "pre_festival_era"
