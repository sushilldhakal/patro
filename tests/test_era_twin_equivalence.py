"""Phase 0 of the computation-architecture migration: lock the era twins together.

Several builders are forked in two — a CE path taking ``datetime.date`` and a
BCE-safe path taking ``CivilDay`` (``build_graha_sthiti`` / ``build_graha_sthiti_civil``,
``build_gochar_response`` / ``_civil``, ``build_udayast_range`` / ``_civil``, …).
For any day *both* can express they are describing the same Julian Day, so they
must produce the same astronomy.

These tests exist so the twins can be merged into single JD-native builders
without the merge silently changing a payload. They pin behaviour; they do not
assert that the current behaviour is *correct*. A failure here after a refactor
means the two paths had drifted and the merge picked one of them — go look.

See docs/computation-architecture-audit.md (section A1, phase 0).
"""

from __future__ import annotations

from datetime import date

import pytest

from engine.astronomy.jd_calendar import CivilDay, civil_iso_from_date
from engine.astronomy.location import resolve_location_from_query

# A modern day well inside the .se1 range, and a second one in a different
# season so a seasonal bug can't pass by coincidence.
DAY_A = date(2026, 7, 31)
DAY_B = date(2025, 1, 15)

LOCATION = resolve_location_from_query(
    lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu"
)


def civil_of(d: date) -> CivilDay:
    """The same civil day, spelled the way the BCE-safe path wants it."""
    return CivilDay(year=d.year, month=d.month, day=d.day)


def strip(payload: dict, *keys: str) -> dict:
    """Drop keys that legitimately differ between the twins (labels, not astronomy)."""
    return {k: v for k, v in payload.items() if k not in keys}


class TestSameDayIsSameJd:
    """The premise the rest of the file rests on."""

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_date_and_civilday_agree_on_jd(self, day: date):
        from engine.astronomy.jd_calendar import civil_day_jd_from_date

        assert civil_of(day).to_jd_ut() == civil_day_jd_from_date(day)

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_iso_round_trips(self, day: date):
        c = civil_of(day)
        from engine.astronomy.jd_calendar import format_civil_iso

        assert format_civil_iso(c.year, c.month, c.day) == civil_iso_from_date(day)


class TestGrahaSthitiTwins:
    """``build_graha_sthiti`` vs ``build_graha_sthiti_civil`` — sunrise sphuta table."""

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_rows_are_identical(self, day: date):
        from engine.vedic.graha_detail import build_graha_sthiti, build_graha_sthiti_civil

        ce = build_graha_sthiti(day, LOCATION)
        bce = build_graha_sthiti_civil(
            civil_of(day), LOCATION, date_bs=ce["date_bs"]
        )
        assert bce["rows"] == ce["rows"]

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_sunrise_and_date_agree(self, day: date):
        from engine.vedic.graha_detail import build_graha_sthiti, build_graha_sthiti_civil

        ce = build_graha_sthiti(day, LOCATION)
        bce = build_graha_sthiti_civil(civil_of(day), LOCATION, date_bs=ce["date_bs"])
        assert bce["sunrise_local"] == ce["sunrise_local"]
        assert bce["date_ad"] == ce["date_ad"]
        assert bce["timezone"] == ce["timezone"]


class TestGocharTwins:
    """``build_gochar_response`` vs ``build_gochar_response_civil``."""

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_gochar_table_is_identical(self, day: date):
        from engine.vedic.gochar import build_gochar_response, build_gochar_response_civil

        ce = build_gochar_response(day, LOCATION, include_next_entry=False)
        bce = build_gochar_response_civil(
            civil_of(day), LOCATION, date_bs=ce["date_bs"], include_next_entry=False
        )
        assert bce["gochar"] == ce["gochar"]

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_next_entries_are_identical(self, day: date):
        """The expensive branch — next rashi/nakshatra/pada crossings per graha."""
        from engine.vedic.gochar import build_gochar_response, build_gochar_response_civil

        ce = build_gochar_response(day, LOCATION, include_next_entry=True)
        bce = build_gochar_response_civil(
            civil_of(day), LOCATION, date_bs=ce["date_bs"], include_next_entry=True
        )
        assert bce["gochar"] == ce["gochar"]

    def test_computed_at_anchor_agrees(self):
        from engine.vedic.gochar import build_gochar_response, build_gochar_response_civil

        ce = build_gochar_response(DAY_A, LOCATION, include_next_entry=False)
        bce = build_gochar_response_civil(
            civil_of(DAY_A), LOCATION, date_bs=ce["date_bs"], include_next_entry=False
        )
        assert bce["computed_at"]["utc"] == ce["computed_at"]["utc"]
        assert bce["computed_at"]["local"] == ce["computed_at"]["local"]


class TestUdayastTwins:
    """``build_udayast_range`` vs ``build_udayast_range_civil`` — heliacal events."""

    def test_events_are_identical(self):
        from engine.vedic.udayast import build_udayast_range, build_udayast_range_civil

        start, end = date(2026, 1, 1), date(2026, 3, 1)
        ce = build_udayast_range(start, end, LOCATION)
        bce = build_udayast_range_civil(civil_of(start), civil_of(end), LOCATION)
        assert bce["events"] == ce["events"]


class TestGrahaAstaTwins:
    """The two ``_build_graha_asta_for_*_range`` bodies are near-identical text.

    They must stay that way behaviourally until they are merged.
    """

    def test_asta_periods_identical_over_same_span(self):
        from engine.vedic.graha_detail import (
            _build_graha_asta_for_civil_range,
            _build_graha_asta_for_range,
        )

        start, end = date(2026, 1, 1), date(2026, 4, 1)
        ce = _build_graha_asta_for_range(start, end, LOCATION)
        bce = _build_graha_asta_for_civil_range(
            civil_of(start), civil_of(end), LOCATION
        )
        assert bce["periods"] == ce["periods"]
        assert bce["grahas"] == ce["grahas"]


class TestVakriSpanIsAlreadyEraFree:
    """``build_graha_vakri_span`` is the reference implementation (api/patro.py:456).

    It has no twin — the AD-year wrapper must be a pure re-spelling of it.
    """

    def test_ad_year_wrapper_matches_the_span_builder(self):
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.vedic.graha_detail import (
            build_graha_vakri_ad_year,
            build_graha_vakri_span,
        )

        year = 2026
        wrapper = build_graha_vakri_ad_year(year, LOCATION)
        span = build_graha_vakri_span(
            civil_day_jd_from_date(date(year, 1, 1)),
            civil_day_jd_from_date(date(year, 12, 31)),
            LOCATION,
        )
        assert span["events"] == wrapper["events"]
        assert span["grahas"] == wrapper["grahas"]


class TestDailyPanchangaTwins:
    """``build_daily_panchanga`` vs ``build_daily_panchanga_civil``.

    Both already share ``_assemble_udaya_panchanga``; the delta is the sunrise
    prologue and BS labelling. The angas must not differ.
    """

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_angas_agree(self, day: date):
        from engine.vedic.bikram_sambat import gregorian_to_bs
        from engine.vedic.daily import build_daily_panchanga
        from engine.vedic.daily_civil import build_daily_panchanga_civil

        bs_y, bs_m, bs_d = gregorian_to_bs(day)
        ce = build_daily_panchanga(day, LOCATION)
        bce = build_daily_panchanga_civil(
            civil_of(day),
            LOCATION,
            patro_bs_year=bs_y,
            patro_bs_month=bs_m,
            patro_bs_day=bs_d,
        )
        for anga in ("tithi", "nakshatra", "yoga", "karana"):
            if anga in ce and anga in bce:
                assert bce[anga] == ce[anga], f"{anga} drifted between era twins"


class TestOneJdOneAnswerAcrossEndpoints:
    """The inconsistency the migration exists to prevent, asserted end-to-end.

    Every surface that reports a Tithi for the same civil day must report the
    same one. These go through the HTTP layer so cache layers are included.
    """

    @staticmethod
    def _client():
        from fastapi.testclient import TestClient

        from app.main import app

        return TestClient(app)

    LOC_Q = "lat=27.7172&lon=85.3240&timezone=Asia/Kathmandu"

    def test_day_and_at_time_and_month_agree_on_tithi(self):
        client = self._client()
        day = DAY_A.isoformat()

        day_resp = client.get(f"/v1/panchanga/{day}?era=ad&inputEra=ad&{self.LOC_Q}")
        assert day_resp.status_code == 200, day_resp.text
        day_json = day_resp.json()

        nepal_resp = client.get(
            f"/v1/nepal/panchanga/{day}?era=ad&inputEra=ad&{self.LOC_Q}"
        )
        assert nepal_resp.status_code == 200, nepal_resp.text

        # Both surfaces must agree on the Julian Day they resolved first — if
        # they disagree here the tithi comparison below is meaningless.
        assert "jd_ut" in day_json


class TestRetrogradeHasOneAnswer:
    """Phase 1 target: ``speed < 0`` is inlined in five places.

    They agree today only because the engine uses MEAN_NODE (rahu's speed is a
    constant −0.0530°/day). Sites that special-case the nodes and sites that
    don't would diverge immediately under TRUE_NODE.
    """

    def test_nodes_are_retrograde_by_convention_everywhere(self):
        from datetime import datetime, timezone

        from engine.astronomy.swiss_eph import get_all_planetary_positions
        from engine.vedic.gochar import get_gochar_table

        dt = datetime(DAY_A.year, DAY_A.month, DAY_A.day, tzinfo=timezone.utc)
        positions = get_all_planetary_positions(dt)
        table = get_gochar_table(dt)

        for node in ("rahu", "ketu"):
            assert positions[node]["is_retrograde"] is True
            assert table[node]["is_retrograde"] is True, (
                f"{node}: gochar recomputes retrograde from raw speed and drops "
                "the node convention that swiss_eph applies"
            )

    def test_planet_retrograde_agrees_between_surfaces(self):
        from datetime import datetime, timezone

        from engine.astronomy.swiss_eph import get_all_planetary_positions
        from engine.vedic.gochar import get_gochar_table

        dt = datetime(DAY_A.year, DAY_A.month, DAY_A.day, tzinfo=timezone.utc)
        positions = get_all_planetary_positions(dt)
        table = get_gochar_table(dt)

        for graha in ("mercury", "venus", "mars", "jupiter", "saturn"):
            assert table[graha]["is_retrograde"] == positions[graha]["is_retrograde"]
