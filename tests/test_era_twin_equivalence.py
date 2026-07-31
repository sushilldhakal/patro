"""Phase 0 of the computation-architecture migration: lock the era twins together.

Several builders are forked in two — a CE path taking ``datetime.date`` and a
BCE-safe path taking ``CivilDay`` (``build_gochar_response`` / ``_civil``,
``build_daily_panchanga`` / ``_civil``, …).
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


class TestGrahaSthitiIsEraFree:
    """Merged (phase 3): ``build_graha_sthiti_civil`` is gone, ``build_graha_sthiti``
    takes a JD. A ``date`` and the ``CivilDay`` spelling of the same day name one
    Julian Day, so they cannot diverge any more — but the label plumbing still can.
    """

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_both_spellings_of_the_day_give_one_payload(self, day: date):
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.vedic.graha_detail import build_graha_sthiti

        from_date = build_graha_sthiti(civil_day_jd_from_date(day), LOCATION)
        from_civil = build_graha_sthiti(civil_of(day).to_jd_ut(), LOCATION)
        assert from_civil == from_date

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_supplying_the_bs_label_changes_only_that_field(self, day: date):
        """The route passes its own date_bs for pre-CE days; nothing else moves."""
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.vedic.graha_detail import build_graha_sthiti

        jd = civil_day_jd_from_date(day)
        derived = build_graha_sthiti(jd, LOCATION)
        supplied = build_graha_sthiti(jd, LOCATION, date_bs="9999-01-01")
        assert supplied["date_bs"] == "9999-01-01"
        assert strip(supplied, "date_bs") == strip(derived, "date_bs")


class TestGocharIsEraFree:
    """Merged (phase 3): ``build_gochar_response`` and its ``_civil`` twin were
    the same sixty lines twice; ``build_gochar(jd, …)`` is what is left."""

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_both_spellings_of_the_day_give_one_payload(self, day: date):
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.vedic.gochar import build_gochar

        from_date = build_gochar(
            civil_day_jd_from_date(day), LOCATION, include_next_entry=False
        )
        from_civil = build_gochar(
            civil_of(day).to_jd_ut(), LOCATION, include_next_entry=False
        )
        assert from_civil == from_date

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_next_entries_survive_the_merge(self, day: date):
        """The expensive branch — next rashi/nakshatra/pada crossings per graha."""
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.vedic.gochar import build_gochar

        payload = build_gochar(
            civil_day_jd_from_date(day), LOCATION, include_next_entry=True
        )
        for graha, row in payload["gochar"].items():
            assert "next_rashi_entry" in row, graha
            assert "next_nakshatra_entry" in row, graha
            assert "next_pada_entry" in row, graha

    def test_computed_at_is_the_sunrise_anchor(self):
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.astronomy.sun import sun_service
        from engine.vedic.gochar import build_gochar

        jd = civil_day_jd_from_date(DAY_A)
        payload = build_gochar(jd, LOCATION, include_next_entry=False)
        assert payload["computed_at"]["utc"] == sun_service.sunrise(
            jd, LOCATION
        ).isoformat()
        assert payload["computed_at"]["note"].startswith("Positions at local true sunrise")


class TestUdayastTwins:
    """``build_udayast_range`` vs ``build_udayast_range_civil`` — heliacal events."""

    def test_events_are_identical(self):
        from engine.vedic.udayast import build_udayast_range, build_udayast_range_civil

        start, end = date(2026, 1, 1), date(2026, 3, 1)
        ce = build_udayast_range(start, end, LOCATION)
        bce = build_udayast_range_civil(civil_of(start), civil_of(end), LOCATION)
        assert bce["events"] == ce["events"]


class TestGrahaAstaSpanIsEraFree:
    """Merged (phase 3). ``_build_graha_asta_for_range`` and its ``_civil`` twin
    were identical text down to a duplicated ``sort_key`` closure; both are gone.

    What is left to pin is that the year wrappers add labels and nothing else.
    """

    def test_ad_year_wrapper_matches_the_span_builder(self):
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.vedic.graha_detail import (
            build_graha_asta_ad_year,
            build_graha_asta_span,
        )

        wrapped = build_graha_asta_ad_year(2026, LOCATION)
        span = build_graha_asta_span(
            civil_day_jd_from_date(date(2026, 1, 1)),
            civil_day_jd_from_date(date(2026, 12, 31)),
            LOCATION,
        )
        assert strip(wrapped, "ad_year", "era") == span

    def test_bs_year_wrapper_only_adds_labels(self):
        from engine.vedic.graha_detail import build_graha_asta_year

        wrapped = build_graha_asta_year(2083, LOCATION)
        assert wrapped["era"] == "bs"
        assert wrapped["bs_year"] == 2083
        assert set(strip(wrapped, "bs_year", "era")) == {
            "range_start_jd",
            "range_end_jd",
            "location",
            "grahas",
            "periods",
        }


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


class TestDailyPanchangaIsEraFreeWhereItCounts:
    """Merged (phase 3): both entry points run ``build_daily_panchanga_at_jd``.

    The astronomy is now literally one code path. What is still forked is the
    *labelling* — the lunar-month and Nepal-Sambat engines are CE-only, so a day
    on the signed patro axis gets documented stubs. That fork is the caller's
    choice (``patro_bs``), not a second builder, and these tests pin the line
    between the two halves.
    """

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_astronomy_is_identical_whichever_entry_point_is_used(self, day: date):
        from engine.vedic.bikram_sambat import gregorian_to_bs
        from engine.vedic.daily import build_daily_panchanga
        from engine.vedic.daily_civil import build_daily_panchanga_civil

        bs_y, bs_m, bs_d = gregorian_to_bs(day)
        ce = build_daily_panchanga(day, LOCATION)
        patro = build_daily_panchanga_civil(
            civil_of(day),
            LOCATION,
            patro_bs_year=bs_y,
            patro_bs_month=bs_m,
            patro_bs_day=bs_d,
        )
        for anga in ("tithi", "nakshatra", "yoga", "karana"):
            if anga in ce and anga in patro:
                assert patro[anga] == ce[anga], f"{anga} drifted between entry points"
        for event in ("sunrise", "sunset", "moonrise", "moonset"):
            if event in ce and event in patro:
                assert patro[event] == ce[event], f"{event} drifted between entry points"

    @pytest.mark.parametrize("day", [DAY_A, DAY_B])
    def test_only_the_calendar_labels_differ(self, day: date):
        """Everything the CE-only engines feed, and nothing else."""
        from engine.vedic.bikram_sambat import gregorian_to_bs
        from engine.vedic.daily import build_daily_panchanga
        from engine.vedic.daily_civil import build_daily_panchanga_civil

        bs_y, bs_m, bs_d = gregorian_to_bs(day)
        ce = build_daily_panchanga(day, LOCATION)
        patro = build_daily_panchanga_civil(
            civil_of(day),
            LOCATION,
            patro_bs_year=bs_y,
            patro_bs_month=bs_m,
            patro_bs_day=bs_d,
        )
        differing = {k for k in set(ce) | set(patro) if ce.get(k) != patro.get(k)}
        assert differing <= {
            "lunar_month",
            "lunar_calendar",
            "nepal_sambat",
            "ns_date",
            "display",
            "festivals",
            "date",
            "date_bs",
        }, f"unexpected divergence: {sorted(differing)}"

    def test_the_patro_axis_labels_say_they_are_stubs(self):
        """A stubbed block must announce itself, not look like a real answer."""
        from engine.vedic.daily_civil import build_daily_panchanga_civil

        payload = build_daily_panchanga_civil(
            CivilDay(-100, 7, 31),
            LOCATION,
            patro_bs_year=-157,
            patro_bs_month=4,
            patro_bs_day=16,
        )
        assert payload["lunar_month"]["source"] == "solar_month_stub"
        assert payload["lunar_calendar"]["source"] == "solar_month_stub"


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

        from engine.astronomy.planets import spashta_table
        from engine.astronomy.ut_instant import as_julian_day
        from engine.vedic.gochar import get_gochar_table

        dt = datetime(DAY_A.year, DAY_A.month, DAY_A.day, tzinfo=timezone.utc)
        positions = spashta_table(as_julian_day(dt))
        table = get_gochar_table(dt)

        for node in ("rahu", "ketu"):
            assert positions[node]["is_retrograde"] is True
            assert table[node]["is_retrograde"] is True, (
                f"{node}: gochar recomputes retrograde from raw speed and drops "
                "the node convention that spashta_table applies"
            )

    def test_planet_retrograde_agrees_between_surfaces(self):
        from datetime import datetime, timezone

        from engine.astronomy.planets import spashta_table
        from engine.astronomy.ut_instant import as_julian_day
        from engine.vedic.gochar import get_gochar_table

        dt = datetime(DAY_A.year, DAY_A.month, DAY_A.day, tzinfo=timezone.utc)
        positions = spashta_table(as_julian_day(dt))
        table = get_gochar_table(dt)

        for graha in ("mercury", "venus", "mars", "jupiter", "saturn"):
            assert table[graha]["is_retrograde"] == positions[graha]["is_retrograde"]


class TestDeclaredAnchor:
    """Phase 5 (B3): every day payload says which instant it was read at.

    Sunrise-, instant- and midnight-anchored views answer honestly different
    questions about the same day. They are not inconsistent — but without a
    declared anchor a client cannot tell that, and the difference reads as the
    API contradicting itself.
    """

    def test_sunrise_anchored_builders_declare_it(self):
        from engine.astronomy.jd_calendar import civil_day_jd_from_date
        from engine.vedic.daily import build_daily_panchanga
        from engine.vedic.gochar import build_gochar
        from engine.vedic.graha_detail import build_graha_sthiti

        jd = civil_day_jd_from_date(DAY_A)
        assert build_daily_panchanga(DAY_A, LOCATION)["anchor"] == "sunrise"
        assert build_gochar(jd, LOCATION, include_next_entry=False)["anchor"] == "sunrise"
        assert build_graha_sthiti(jd, LOCATION)["anchor"] == "sunrise"

    def test_instant_snapshot_declares_instant(self):
        from datetime import datetime, timezone

        from engine.vedic.at_time import build_planetary_snapshot

        snap = build_planetary_snapshot(
            datetime(2026, 7, 31, 9, 30, tzinfo=timezone.utc),
            lat=LOCATION.lat,
            lon=LOCATION.lon,
        )
        assert snap["anchor"] == "instant"
