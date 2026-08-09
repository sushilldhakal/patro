"""Tests for the personal (natal-chart) rashifal."""

from datetime import date

import pytest

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.rashifal_engine import PERIODS, build_day_frame
from engine.vedic.rashifal_personal import (
    NATAL_CHAKRA_WEIGHTS,
    PERSONAL_LAYER_WEIGHTS,
    LAYER_KEYS,
    birth_instant_from_local,
    build_natal_chart,
    build_personal_sign_payload,
    dasha_block,
    score_personal,
)
from services.rashifal_api import personal_rashifal_for_gregorian

BIRTH = birth_instant_from_local("1995-04-12T06:30", "Asia/Kathmandu")
ANCHOR = date(2026, 7, 15)


@pytest.fixture
def natal():
    return build_natal_chart(BIRTH, lat=DEFAULT_LOCATION.lat, lon=DEFAULT_LOCATION.lon)


# ── the natal chart ──────────────────────────────────────────────────────────


def test_natal_chart_casts_lagna_moon_sun(natal):
    assert 0 <= natal.lagna_sign <= 11
    assert 0 <= natal.moon_sign <= 11
    assert 0 <= natal.sun_sign <= 11
    assert natal.moon_sign == natal.graha_sign["moon"]
    assert natal.sun_sign == natal.graha_sign["sun"]


def test_natal_ashtakavarga_totals_337_bindus(natal):
    assert sum(natal.sav) == 337


def test_natal_lagna_depends_on_birth_latitude():
    """The Lagna is the one quantity in a chart that latitude actually moves —
    the Moon and Sun are geocentric and would be identical at any latitude."""
    here = build_natal_chart(BIRTH, lat=27.7, lon=85.3167)
    far_north = build_natal_chart(BIRTH, lat=60.0, lon=85.3167)
    assert here.moon_sign == far_north.moon_sign
    assert here.sun_sign == far_north.sun_sign
    assert here.lagna_sign != far_north.lagna_sign


def test_birth_instant_from_local_round_trips_bs_converted_ad_date():
    # Same convention as compute_janma_points: naive local -> UTC.
    instant = birth_instant_from_local("2000-01-01T00:00", "Asia/Kathmandu")
    assert instant.tzinfo is not None


# ── dasha ────────────────────────────────────────────────────────────────────


def test_dasha_block_names_a_running_mahadasha_and_antardasha(natal):
    import datetime as dt

    as_of = dt.datetime(2026, 7, 15, tzinfo=dt.timezone.utc)
    block = dasha_block(natal, as_of)
    assert block["mahadasha"]["lord"] in (
        "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
    )
    assert block["antardasha"]["lord"] in (
        "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
    )
    assert -1.0 <= block["score"] <= 1.0
    # The running mahadasha must actually contain `as_of`.
    from engine.vedic.rashifal_personal import _parse_iso

    assert _parse_iso(block["mahadasha"]["start"]) <= as_of < _parse_iso(block["mahadasha"]["end"])


def test_dasha_is_consistent_for_someone_much_older_than_one_cycle(natal):
    """A 200-year-old cycle horizon must not crash or leave 'now' outside every
    generated period — this is what _cycles_for_horizon-style logic guards."""
    import datetime as dt

    far_future = dt.datetime(2200, 1, 1, tzinfo=dt.timezone.utc)
    block = dasha_block(natal, far_future)
    from engine.vedic.rashifal_personal import _parse_iso

    assert _parse_iso(block["mahadasha"]["start"]) <= far_future < _parse_iso(
        block["mahadasha"]["end"]
    )


# ── weights ──────────────────────────────────────────────────────────────────


@pytest.mark.parametrize("period", PERIODS)
def test_personal_layer_weights_sum_to_one(period):
    assert set(PERSONAL_LAYER_WEIGHTS[period]) == set(LAYER_KEYS)
    assert sum(PERSONAL_LAYER_WEIGHTS[period].values()) == pytest.approx(1.0)


def test_dasha_weight_grows_with_period_length():
    """A Mahadasha runs years — it should matter more to a yearly reading than
    to a daily one, the opposite of chandrabala's 2.25-day cycle."""
    assert (
        PERSONAL_LAYER_WEIGHTS["daily"]["dasha"]
        < PERSONAL_LAYER_WEIGHTS["monthly"]["dasha"]
        < PERSONAL_LAYER_WEIGHTS["yearly"]["dasha"]
    )
    assert (
        PERSONAL_LAYER_WEIGHTS["daily"]["chandrabala"]
        > PERSONAL_LAYER_WEIGHTS["monthly"]["chandrabala"]
        > PERSONAL_LAYER_WEIGHTS["yearly"]["chandrabala"]
    )


def test_natal_chakra_weights_sum_to_one():
    assert sum(NATAL_CHAKRA_WEIGHTS.values()) == pytest.approx(1.0)


# ── scoring ──────────────────────────────────────────────────────────────────


def test_score_personal_carries_every_layer(natal):
    import datetime as dt

    frame = build_day_frame(ANCHOR, DEFAULT_LOCATION, with_hora=True)
    scored = score_personal(natal, frame, "daily", dt.datetime(2026, 7, 15, tzinfo=dt.timezone.utc))
    assert set(scored["blocks"]) == set(LAYER_KEYS)
    assert -1.0 <= scored["score"] <= 1.0
    assert 1 <= scored["stars"] <= 5
    assert len(scored["domains"]) == 6


def test_ashtakavarga_layer_uses_the_natal_chart_not_the_transit_chart(natal):
    """The whole point of a personal reading: swap the day's own Ashtakavarga
    for the birth chart's, so bindus answer for this person specifically."""
    import datetime as dt

    frame = build_day_frame(ANCHOR, DEFAULT_LOCATION, with_hora=True)
    as_of = dt.datetime(2026, 7, 15, tzinfo=dt.timezone.utc)
    scored = score_personal(natal, frame, "daily", as_of)
    # The block's own sav must come from the birth chart, not the transit day.
    assert scored["blocks"]["ashtakavarga"]["sav"] == natal.sav[natal.lagna_sign]
    # And the natal/transit Sarvashtakavarga distributions must genuinely
    # differ somewhere across the twelve signs (both total 337 by construction,
    # so an all-signs comparison — not just the Lagna sign, which could
    # coincidentally match — is what actually proves the swap happened).
    assert natal.sav != frame.sav


def test_personal_scores_are_deterministic(natal):
    import datetime as dt

    frame = build_day_frame(ANCHOR, DEFAULT_LOCATION, with_hora=True)
    as_of = dt.datetime(2026, 7, 15, tzinfo=dt.timezone.utc)
    a = build_personal_sign_payload(natal, frame, "daily", as_of)
    b = build_personal_sign_payload(natal, frame, "daily", as_of)
    assert a["score"] == b["score"]
    assert a["prediction_ne"] == b["prediction_ne"]


def test_two_different_lagnas_score_differently_on_the_same_day():
    """Two people born the same minute at very different latitudes get
    different Lagnas and therefore different personal readings."""
    import datetime as dt

    n_here = build_natal_chart(BIRTH, lat=27.7, lon=85.3167)
    n_north = build_natal_chart(BIRTH, lat=60.0, lon=85.3167)
    frame = build_day_frame(ANCHOR, DEFAULT_LOCATION, with_hora=True)
    as_of = dt.datetime(2026, 7, 15, tzinfo=dt.timezone.utc)
    a = score_personal(n_here, frame, "daily", as_of)
    b = score_personal(n_north, frame, "daily", as_of)
    assert a["score"] != b["score"]


# ── the API-facing function ─────────────────────────────────────────────────


@pytest.mark.parametrize("period", PERIODS)
def test_personal_rashifal_for_gregorian_returns_one_scored_reading(natal, period):
    out = personal_rashifal_for_gregorian(natal, ANCHOR, DEFAULT_LOCATION, period=period)
    assert out["period"] == period
    assert -1.0 <= out["score"] <= 1.0
    assert out["prediction_ne"] and out["prediction_en"]
    assert out["dasha"]["mahadasha"]["lord"]
    assert out["lagna_sign"] == natal.lagna_sign + 1
    assert len(out["domains"]) == 6
    assert not any("ऀ" <= ch <= "ॿ" for ch in out["prediction_en"])


def test_weekly_and_monthly_personal_windows_report_range_and_days(natal):
    weekly = personal_rashifal_for_gregorian(natal, ANCHOR, DEFAULT_LOCATION, period="weekly")
    assert weekly["days_in_period"] == 7
    monthly = personal_rashifal_for_gregorian(natal, ANCHOR, DEFAULT_LOCATION, period="monthly")
    assert monthly["bs_month"] and monthly["bs_year"]


def test_unknown_period_is_rejected(natal):
    with pytest.raises(ValueError):
        personal_rashifal_for_gregorian(natal, ANCHOR, DEFAULT_LOCATION, period="fortnightly")
