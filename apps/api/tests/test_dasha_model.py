"""The dasha model (engine.jyotish.dasha) and the views built on it.

The kundali report computed its antardasha dates with a 360-day year after the
Vimshottari engine had moved to 365.2425 days, so for the same chart the report
ended Mercury's antardasha on 30 Dec 2026 while the kundali detail's dasha tree
said 24 Dec 2026. Every view now subdivides through one model.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from engine.jyotish.dasha import YEAR_DAYS, DashaPeriod, running, sub_periods, years_between
from engine.jyotish.interpretation import _dasha_detail
from engine.jyotish.kundali_detail import subdivide_dasha_period
from engine.jyotish.tribhagi import tribhagi_dasha, tribhagi_timeline
from engine.jyotish.vimshottari import DASHA_YEARS, VIMSHOTTARI, vimshottari_dasha, vimshottari_timeline
from engine.jyotish.yogini import YOGINI, YOGINI_CYCLE_YEARS, yogini_dasha, yogini_timeline

BIRTH = datetime(1990, 5, 12, 0, 45, tzinfo=timezone.utc)
MOON = 205.0  # Vishakha (200°–213°20′) → Jupiter mahadasha first


@pytest.mark.parametrize("build,timeline", [
    (vimshottari_dasha, vimshottari_timeline),
    (tribhagi_dasha, tribhagi_timeline),
    (yogini_dasha, yogini_timeline),
])
def test_the_payload_is_the_timeline(build, timeline):
    payload = build(MOON, BIRTH, cycles=2)
    assert payload == timeline(MOON, BIRTH, cycles=2).to_payload()
    sequence = payload["sequence"]
    assert sequence[0]["start"] == BIRTH.isoformat()
    for before, after in zip(sequence, sequence[1:]):
        assert before["end"] == after["start"]


def test_timelines_start_at_the_moons_nakshatra_lord_for_its_balance():
    vim = vimshottari_timeline(MOON, BIRTH)
    assert vim.mahadasha_lord == "jupiter"
    assert vim.periods[0].years < DASHA_YEARS["jupiter"]
    assert all(p.years == DASHA_YEARS[p.lord] for p in vim.periods[1:])
    assert sum(p.years for p in tribhagi_timeline(MOON, BIRTH).periods[1:]) == pytest.approx(
        sum(p.years for p in vim.periods[1:]) / 3
    )
    yog = yogini_timeline(MOON, BIRTH, cycles=1)
    assert len(yog.periods) == len(YOGINI.sequence)


def test_running_finds_the_period_that_contains_the_instant():
    timeline = vimshottari_timeline(MOON, BIRTH, cycles=2)
    at = datetime(2026, 10, 22, tzinfo=timezone.utc)
    period = timeline.running(at)
    assert period is not None and period.contains(at)
    assert running(timeline.periods, BIRTH - timedelta(days=1)) is None


def test_sub_periods_tile_the_parent_and_drop_what_ended_before_birth():
    first = vimshottari_timeline(MOON, BIRTH).periods[0]
    children = sub_periods(
        VIMSHOTTARI, first.lord, first.start, first.end, parent_full_years=float(DASHA_YEARS[first.lord]),
    )
    assert children[0].start == first.start  # cut at birth
    assert children[-1].end == first.end
    for before, after in zip(children, children[1:]):
        assert before.end == after.start
    # A full parent divides into all nine, in proportion to their years.
    whole = sub_periods(VIMSHOTTARI, "venus", BIRTH, BIRTH + timedelta(days=20 * YEAR_DAYS))
    assert [c.lord for c in whole] == ["venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury", "ketu"]
    assert years_between(whole[0].start, whole[0].end) == pytest.approx(20 * 20 / 120)
    yogini = sub_periods(YOGINI, "sankata", BIRTH, BIRTH + timedelta(days=8 * YEAR_DAYS))
    assert years_between(yogini[0].start, yogini[0].end) == pytest.approx(8 * 8 / YOGINI_CYCLE_YEARS)


def test_period_payload_round_trips():
    period = DashaPeriod("venus", "शुक्र", BIRTH, BIRTH + timedelta(days=100), years=None)
    assert DashaPeriod.from_payload(period.to_payload()) == period
    assert "years" not in period.to_payload()


@pytest.mark.parametrize("now", [
    datetime(2026, 10, 22, tzinfo=timezone.utc),
    datetime(1995, 1, 1, tzinfo=timezone.utc),
    datetime(2060, 6, 1, tzinfo=timezone.utc),
])
def test_the_report_and_the_dasha_tree_name_the_same_antardasha(now):
    sequence = vimshottari_dasha(MOON, BIRTH, cycles=2)["sequence"]
    detail = _dasha_detail(sequence, now)
    maha = next(p for p in sequence if p["start"] <= now.isoformat() < p["end"])
    tree = subdivide_dasha_period(
        maha["lord"],
        datetime.fromisoformat(maha["start"]),
        datetime.fromisoformat(maha["end"]),
        parent_full_years=float(DASHA_YEARS[maha["lord"]]),
    )
    antar = next(c for c in tree if c["start"] <= now.isoformat() < c["end"])
    assert detail["antar_lord"] == antar["lord"]
    assert detail["antar_start"].isoformat() == antar["start"]
    assert detail["antar_end"].isoformat() == antar["end"]
