"""Every era-aware endpoint accepts all four eras.

Routes used to declare narrow era subsets — ``bs|ad`` on one, ``bs|bbs|ad`` on
the next — which was an honest description back when each era had its own forked
builder. Phase 3 merged those, so the subsets became arbitrary: a request was
rejected by a ``Literal`` before it ever reached a builder that would have
answered it.

This pins the surface so it cannot narrow again by accident, and — just as
importantly — pins the two places that are *deliberately* narrow, so a future
reader can tell "not supported yet" from "nobody widened it".
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CITY = "city_id=1283240"

# One year and one date key per era, all naming a day the ephemeris covers.
YEAR = {"ad": 2026, "bc": 44, "bs": 2083, "bbs": 100}
DATE_KEY = {
    "ad": "2026-04-16",
    "bc": "0044-03-15",
    "bs": "2083-04-16",
    "bbs": "0100-04-16",
}
ERAS = ("ad", "bc", "bs", "bbs")

YEAR_SPAN_ENDPOINTS = (
    "nepal/eclipse/solar/year",
    "nepal/eclipse/lunar/year",
    "nepal/panchak/year",
    "nepal/graha-asta/year",
    "nepal/graha-vakri/year",
)

DAY_KEY_ENDPOINTS = (
    "nepal/gochar",
    "nepal/graha-sthiti",
    "nepal/panchanga",
)


@pytest.mark.parametrize("endpoint", YEAR_SPAN_ENDPOINTS)
@pytest.mark.parametrize("era", ERAS)
def test_year_span_endpoints_take_every_era(endpoint: str, era: str):
    resp = client.get(f"/v1/{endpoint}/{YEAR[era]}?era={era}&{CITY}")
    assert resp.status_code == 200, resp.text


@pytest.mark.parametrize("endpoint", DAY_KEY_ENDPOINTS)
@pytest.mark.parametrize("era", ERAS)
def test_day_key_endpoints_take_every_era(endpoint: str, era: str):
    resp = client.get(f"/v1/{endpoint}/{DATE_KEY[era]}?era={era}&{CITY}")
    assert resp.status_code == 200, resp.text


@pytest.mark.parametrize("era", ERAS)
def test_ingress_range_takes_every_era(era: str):
    year = YEAR[era]
    pad = f"{year:04d}" if era in ("ad", "bc") else str(year)
    resp = client.get(
        f"/v1/nepal/gochar/ingress?era={era}&from={pad}-01-01&to={pad}-03-01&{CITY}"
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.parametrize("era", ERAS)
def test_day_and_instant_take_every_era(era: str):
    day = client.get(
        f"/v1/panchanga?era={era}&year={YEAR[era]}&month=4&day=16&{CITY}&lean=true"
    )
    assert day.status_code == 200, day.text

    at_time = client.get(
        f"/v1/panchanga/at-time?era={era}&year={YEAR[era]}"
        f"&month=4&day=16&clock=14:30&{CITY}"
    )
    assert at_time.status_code == 200, at_time.text


@pytest.mark.parametrize("era", ERAS)
@pytest.mark.parametrize("form", ["city=Pokhara", "city_id=1283240", "lat=27.7&lon=85.3&timezone=Asia/Kathmandu"])
def test_every_era_works_with_every_location_form(era: str, form: str):
    """Location and era are orthogonal — any of the three forms, any era."""
    resp = client.get(
        f"/v1/panchanga?era={era}&year={YEAR[era]}&month=4&day=16&{form}&lean=true"
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.parametrize("era", ERAS)
def test_the_rendered_day_view_survives_every_era(era: str):
    """The canonical renderer parses date_ad itself — BCE spells it expanded."""
    resp = client.get(f"/v1/nepal/panchanga/{DATE_KEY[era]}?era={era}&{CITY}")
    assert resp.status_code == 200, resp.text


class TestDeliberatelyNarrow:
    """Two endpoints stay ``bs|ad`` on purpose. Pinned so the reason survives."""

    def test_sankranti_day_is_ce_only_at_the_builder(self):
        """build_sankranti_day_response takes a datetime.date and labels it via
        gregorian_to_bs — widening the signature would only move the 400."""
        resp = client.get("/v1/nepal/sankranti/0044-03-15?era=bc&" + CITY)
        assert resp.status_code == 422

    def test_bs_month_grid_keeps_bs_shaped_path_params(self):
        """/panchanga/{bs_year}/{bs_month} feeds _signed_bs_year_from_browse;
        an AD year there would be silently read as a BS year."""
        resp = client.get(f"/v1/panchanga/2026/4?era=ad&{CITY}")
        assert resp.status_code == 422
