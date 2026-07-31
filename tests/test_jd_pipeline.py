"""The universal time pipeline: calendar in → Julian Day → engine → calendar out.

These are architecture tests, not feature tests. Each one pins a rule that the
day routes must not quietly regain:

* Julian Day is the only identity; every other spelling is an encoding of it.
* Years crossing the wire are always positive — the era carries the sign.
* ``today`` resolves an instant, and is never parsed as a date in some calendar.
* The calendar a date is *read* in is independent of the one it is *shown* in.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Kathmandu, so the observer timezone is fixed and "today" is deterministic.
LOCATION = "lat=27.7172&lon=85.3240&timezone=Asia/Kathmandu"
LEAN = "detail=false&festivals=false"


def get(url: str):
    resp = client.get(f"/v1/panchanga{url}&{LOCATION}&{LEAN}")
    assert resp.status_code == 200, resp.text
    return resp.json()


class TestJulianDayIsTheIdentity:
    def test_same_day_reached_four_ways_has_one_jd(self):
        """AD parts, BS parts, the legacy path form and ``?jd=`` must agree."""
        by_ad = get("?inputEra=ad&year=2026&month=7&day=31&era=bs")
        by_bs = get("?inputEra=bs&year=2083&month=4&day=15&era=bs")
        by_path = client.get(
            f"/v1/panchanga/2083-04-15?era=bs&inputEra=bs&{LOCATION}&{LEAN}"
        ).json()
        by_jd = get(f"?jd={by_ad['jd_ut']}&era=bs")

        jds = {by_ad["jd_ut"], by_bs["jd_ut"], by_path["jd_ut"], by_jd["jd_ut"]}
        assert len(jds) == 1, f"one day resolved to several Julian Days: {jds}"

    def test_jd_param_outranks_calendar_parts(self):
        """``?jd=`` is an identity; parts left in the URL must not override it."""
        target = get("?inputEra=ad&year=2026&month=7&day=31&era=bs")["jd_ut"]
        mixed = get(f"?jd={target}&inputEra=ad&year=1999&month=1&day=1&era=bs")
        assert mixed["jd_ut"] == target

    def test_jd_route_and_jd_query_agree(self):
        jd = 2461252.5
        via_path = client.get(f"/v1/panchanga/jd/{jd}?{LOCATION}&{LEAN}").json()
        via_query = get(f"?jd={jd}&era=ad")
        assert via_path["jd_ut"] == via_query["jd_ut"] == jd


class TestRelativeDaysAreInstants:
    @pytest.mark.parametrize("era", ["ad", "bc", "bs", "bbs"])
    def test_today_is_the_same_day_in_every_display_era(self, era):
        """``/today?era=bs`` must not read "today" as a BS date — only label it so."""
        assert get(f"/today?era={era}")["jd_ut"] == get("/today?era=ad")["jd_ut"]

    def test_bare_panchanga_resolves_today(self):
        assert get("?era=bs")["jd_ut"] == get("/today?era=bs")["jd_ut"]

    def test_tomorrow_is_one_day_after_today(self):
        today = get("/today?era=bs")["jd_ut"]
        tomorrow = client.get(
            f"/v1/panchanga/tomorrow?era=bs&{LOCATION}&{LEAN}"
        ).json()["jd_ut"]
        assert tomorrow == today + 1

    def test_explicit_parts_override_a_relative_path(self):
        """An explicit day is an address; it wins over the word in the path."""
        pinned = get("/today?inputEra=ad&year=2026&month=7&day=31&era=bs")
        assert pinned["date_parts"]["gregorian"] == {
            "era": "ad",
            "year": 2026,
            "month": 7,
            "day": 31,
        }


class TestInputEraIsNotDisplayEra:
    def test_ad_in_bs_out(self):
        day = get("?inputEra=ad&year=2026&month=7&day=31&era=bs")
        assert day["date_parts"]["era"] == "bs"
        assert day["date_parts"]["vikram"] == {
            "era": "bs", "year": 2083, "month": 4, "day": 15,
        }
        assert day["date_parts"]["gregorian"] == {
            "era": "ad", "year": 2026, "month": 7, "day": 31,
        }

    def test_bs_in_ad_out(self):
        day = get("?inputEra=bs&year=2083&month=4&day=15&era=ad")
        assert day["date_parts"]["era"] == "ad"
        assert day["date_parts"]["gregorian"]["year"] == 2026

    def test_display_era_does_not_move_the_day(self):
        """Changing only the display era must not change which day was computed."""
        base = get("?inputEra=ad&year=2026&month=7&day=31&era=ad")["jd_ut"]
        for era in ("bc", "bs", "bbs"):
            assert get(f"?inputEra=ad&year=2026&month=7&day=31&era={era}")["jd_ut"] == base


class TestYearsAreAlwaysPositive:
    @pytest.mark.parametrize(
        "url",
        [
            "?era=bs&year=-10&month=1&day=1",
            "?era=ad&year=-4&month=1&day=1",
            "?inputEra=bs&year=-1&month=1&day=1&era=bs",
        ],
    )
    def test_signed_years_are_rejected(self, url):
        resp = client.get(f"/v1/panchanga{url}&{LOCATION}&{LEAN}")
        assert resp.status_code == 400

    @pytest.mark.parametrize(
        "era,year,month,day",
        [("bbs", 4, 1, 1), ("bc", 44, 3, 15), ("bs", 2083, 4, 15), ("ad", 2026, 7, 31)],
    )
    def test_rendered_years_are_never_negative(self, era, year, month, day):
        parts = get(f"?era={era}&year={year}&month={month}&day={day}")["date_parts"]
        assert parts["year"] >= 1
        assert parts["vikram"]["year"] >= 1
        assert parts["gregorian"]["year"] >= 1
        assert parts["era"] == era

    def test_bbs_date_bs_uses_positive_vikram_year(self):
        body = get("?era=bbs&year=2085&month=3&day=1")
        assert body["date_parts"]["vikram"]["year"] == 2085
        assert body["date_bs"] == "2085-03-01"
        assert body["bs_date"]["year"] == 2085
        assert not str(body["date_bs"]).startswith("-")

    def test_bbs_today_pinned_day_aligns_legacy_fields(self):
        body = get(
            "/today?era=bbs&language=ne&inputEra=bbs&year=2085&month=3&day=1"
        )
        assert body["date_bs"] == "2085-03-01"
        assert body["bs_date"]["year"] == 2085

    def test_bbs_is_before_bs_and_is_not_bc(self):
        """BBS and BC number the same stretch of time differently — never conflate."""
        bbs = get("?era=bbs&year=4&month=1&day=1")["date_parts"]
        assert bbs["vikram"] == {"era": "bbs", "year": 4, "month": 1, "day": 1}
        # BBS 1 is 58 BCE, so BBS 4 falls in 61 BCE — not BC 4.
        assert bbs["gregorian"] == {"era": "bc", "year": 61, "month": 3, "day": 16}

    def test_bbs_1_sits_immediately_before_bs_1(self):
        """The two eras are consecutive — there is no year zero between them."""
        bs_first = get("?era=bs&year=1&month=1&day=1")
        day_before = get(f"?jd={bs_first['jd_ut'] - 1}&era=bbs")["date_parts"]["vikram"]
        assert day_before["era"] == "bbs"
        assert day_before["year"] == 1
        assert day_before["month"] == 12

    @pytest.mark.parametrize(
        "year,month,day",
        [(1, 1, 1), (1, 12, 30), (4, 1, 1), (100, 12, 25), (1000, 7, 7), (2999, 1, 1)],
    )
    def test_bbs_dates_round_trip_exactly(self, year, month, day):
        parts = get(f"?era=bbs&year={year}&month={month}&day={day}")["date_parts"]
        assert (parts["vikram"]["era"], parts["vikram"]["year"]) == ("bbs", year)
        assert (parts["vikram"]["month"], parts["vikram"]["day"]) == (month, day)
        # The Julian Day is the identity: re-resolving by it must not drift.
        again = get(f"?jd={parts['jd']}&era=bbs")["date_parts"]["vikram"]
        assert again == parts["vikram"]

    def test_walking_back_by_jd_crosses_the_epoch_into_bbs(self):
        """Rule 5: moving backwards in time yields BBS, never a BS year <= 0."""
        early_bs = get("?era=bs&year=1&month=1&day=1")["jd_ut"]
        before = get(f"?jd={early_bs - 30}&era=bs")["date_parts"]
        assert before["vikram"]["era"] == "bbs"
        assert before["vikram"]["year"] >= 1


class TestUncomputableDatesAreBadRequests:
    """The year axis is wider than the installed ephemeris. A year with no
    astronomy behind it must 400 with an explanation, never 500 with an empty
    body — and the message must speak in eras, not signed years or Julian Days.
    """

    @pytest.mark.parametrize(
        "era,year", [("bbs", 12942), ("bs", 17055), ("bbs", 99999), ("bs", 99999)]
    )
    def test_out_of_range_years_are_rejected_cleanly(self, era, year):
        resp = client.get(f"/v1/panchanga?era={era}&year={year}&month=1&day=1&{LOCATION}&{LEAN}")
        assert resp.status_code == 400, f"expected 400, got {resp.status_code}"
        detail = resp.json()["detail"]
        assert "-" not in detail.split("got")[0], f"signed year leaked: {detail}"

    def test_the_axis_bound_message_names_the_era(self):
        resp = client.get(f"/v1/panchanga?era=bbs&year=99999&month=1&day=1&{LOCATION}&{LEAN}")
        assert "bbs year must be 1.." in resp.json()["detail"]

    def test_month_path_respects_era_bbs(self):
        bs = client.get(
            f"/v1/panchanga/2083/4?era=bs&year=2083&month=4&{LOCATION}",
        )
        bbs = client.get(
            f"/v1/panchanga/2083/4?era=bbs&year=2083&month=4&{LOCATION}",
        )
        assert bs.status_code == 200, bs.text
        assert bbs.status_code == 200, bbs.text
        assert bs.json()["year_bs"] == 2083
        assert bbs.json()["year_bs"] == -2083
        assert bs.json()["calendar"][0]["date_ad"] != bbs.json()["calendar"][0]["date_ad"]


class TestRoutesDoNotKnowCalendars:
    def test_day_handler_takes_no_era_argument(self):
        """The handler signature is the guard — a calendar must not reach a route."""
        import inspect

        from api.panchanga import _panchanga_day_impl, _day_payload_for_jd

        assert "era" not in inspect.signature(_panchanga_day_impl).parameters
        assert "era" not in inspect.signature(_day_payload_for_jd).parameters

    def test_day_payload_builder_takes_a_julian_day(self):
        import inspect

        from api.panchanga import _day_payload_for_jd

        assert "jd_ut" in inspect.signature(_day_payload_for_jd).parameters
