"""Birth-chart routes address a *moment*: a Julian Day plus an observer clock.

The day pipeline (``test_jd_pipeline``) pins whole days. These pin the finer
identity the kundali routes need, and the rule that all of its spellings — a
Julian Day, calendar parts in any era, or an ISO datetime — name the same
instant and produce the same chart.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

LOCATION = "lat=27.7172&lon=85.3240&timezone=Asia/Kathmandu"

# 1990-05-15 AD 08:30 Kathmandu == BS 2047-02-01, civil-day JD 2448026.5.
BIRTH_JD = 2448026.5
BIRTH_CLOCK = "08:30"
BIRTH_ISO = "1990-05-15T08:30:00"
BIRTH_AD = (1990, 5, 15)
BIRTH_BS = (2047, 2, 1)


def get(path: str):
    resp = client.get(f"/v1{path}&{LOCATION}")
    assert resp.status_code == 200, resp.text
    return resp.json()


class TestEveryEncodingNamesOneInstant:
    @pytest.mark.parametrize(
        "route", ["/kundali/vimshottari", "/planetary/positions", "/panchanga/at-time"]
    )
    def test_jd_clock_matches_iso_datetime(self, route):
        by_jd = get(f"{route}?jd={BIRTH_JD}&clock={BIRTH_CLOCK}")
        by_iso = get(f"{route}?datetime={BIRTH_ISO}")
        assert by_jd["query_instant"] == by_iso["query_instant"]

    def test_calendar_parts_plus_clock_match_too(self):
        y, m, d = BIRTH_AD
        by_ad = get(
            f"/kundali/vimshottari?inputEra=ad&year={y}&month={m}&day={d}"
            f"&clock={BIRTH_CLOCK}&era=ad"
        )
        by, bm, bd = BIRTH_BS
        by_bs = get(
            f"/kundali/vimshottari?inputEra=bs&year={by}&month={bm}&day={bd}"
            f"&clock={BIRTH_CLOCK}&era=bs"
        )
        by_jd = get(f"/kundali/vimshottari?jd={BIRTH_JD}&clock={BIRTH_CLOCK}")

        instants = {by_ad["query_instant"], by_bs["query_instant"], by_jd["query_instant"]}
        assert len(instants) == 1, f"one birth moment spelled four ways diverged: {instants}"

    def test_the_chart_itself_is_identical(self):
        """Same moment must mean the same astronomy, not merely the same label."""
        by_jd = get(f"/kundali/vimshottari?jd={BIRTH_JD}&clock={BIRTH_CLOCK}")
        by_iso = get(f"/kundali/vimshottari?datetime={BIRTH_ISO}")
        assert by_jd["moon_longitude"] == by_iso["moon_longitude"]


class TestMilanTakesBothForms:
    BOY = f"boy_jd={BIRTH_JD}&boy_clock={BIRTH_CLOCK}"
    BOY_ISO = f"boy_datetime={BIRTH_ISO}"
    GIRL_JD = 2448854.5
    GIRL = f"girl_jd={GIRL_JD}&girl_clock=14:10"
    GIRL_ISO = "girl_datetime=1992-08-20T14:10:00"
    PLACES = (
        "boy_lat=27.7172&boy_lon=85.3240&boy_timezone=Asia/Kathmandu"
        "&girl_lat=27.7172&girl_lon=85.3240&girl_timezone=Asia/Kathmandu"
    )

    def _milan(self, boy: str, girl: str):
        resp = client.get(f"/v1/kundali/milan?{boy}&{girl}&{self.PLACES}")
        assert resp.status_code == 200, resp.text
        return resp.json()

    def test_jd_and_datetime_forms_give_the_same_match(self):
        assert self._milan(self.BOY, self.GIRL) == self._milan(self.BOY_ISO, self.GIRL_ISO)

    def test_the_two_people_can_be_addressed_differently(self):
        """One partner by JD, the other by ISO — they are independent encodings."""
        mixed = self._milan(self.BOY, self.GIRL_ISO)
        assert mixed == self._milan(self.BOY_ISO, self.GIRL)

    def test_naming_neither_form_is_rejected(self):
        resp = client.get(f"/v1/kundali/milan?boy_clock=08:30&girl_clock=14:10&{self.PLACES}")
        assert resp.status_code == 400


class TestADayIsNotAMoment:
    def test_jd_without_a_clock_is_rejected(self):
        """A civil day does not name a birth moment — the clock is required."""
        resp = client.get(f"/v1/kundali/vimshottari?jd={BIRTH_JD}&{LOCATION}")
        assert resp.status_code == 400
        assert "clock" in resp.json()["detail"]

    def test_a_bare_display_era_does_not_become_a_birth_date(self):
        """`era` alone resolves to today in the day pipeline; that must not leak
        in here and silently chart the current instant as somebody's birth."""
        by_era_only = get(f"/kundali/vimshottari?era=bs&datetime={BIRTH_ISO}")
        by_iso = get(f"/kundali/vimshottari?datetime={BIRTH_ISO}")
        assert by_era_only["query_instant"] == by_iso["query_instant"]


class TestPreEpochMomentsAreReachable:
    def test_a_bce_instant_can_be_addressed_by_jd(self):
        """ISO cannot spell this; the JD form is the only way in."""
        day = get("/panchanga?era=bc&year=44&month=3&day=15&detail=false")
        moment = get(f"/planetary/positions?jd={day['jd_ut']}&clock=12:00")
        assert moment["query_instant"].startswith("-0043-03-15")

    def test_bbs_calendar_parts_at_time(self):
        """Early Vikram days use inputEra + clock; muhurta windows use expanded ISO."""
        resp = client.get(
            f"/v1/panchanga/at-time?inputEra=bbs&year=2083&month=4&day=16"
            f"&era=bbs&clock=15:34:00&{LOCATION}"
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body.get("mode") == "ephemeris"
        assert body.get("bs_date", {}).get("year") == 2083
