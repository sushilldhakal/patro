"""Tests for the server rashifal — legacy chandrabala block and the scored engine."""

from datetime import date, timedelta

import pytest

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.daily import get_daily_panchanga
from engine.vedic.rashifal import build_daily_rashifal
from engine.vedic.rashifal_engine import (
    DOMAIN_KEYS,
    GRAHA_PERIOD_WEIGHT,
    LAYER_KEYS,
    LAYER_WEIGHTS,
    PERIODS,
    VEDHA,
    VEDHA_EXEMPT,
    build_day_frame,
    build_sign_payload,
    house_from,
    tone_for_score,
)
from services.rashifal_api import rashifal_for_gregorian, rashifal_window_key

ANCHOR = date(2026, 7, 15)


# ── the legacy block still embedded in the daily panchanga payload ──────────


def test_daily_payload_includes_rashifal():
    raw = get_daily_panchanga(ANCHOR, DEFAULT_LOCATION)
    rf = raw.get("rashifal")
    assert isinstance(rf, dict)
    assert rf.get("period") == "daily"
    assert len(rf.get("signs") or []) == 12
    for sign in rf["signs"]:
        assert sign.get("prediction_ne")
        assert sign.get("prediction_en")
        assert sign.get("syllables_ne")
        assert sign.get("moorti") in ("swarna", "rajata", "tamra", "loha")


def test_build_daily_rashifal_matches_chandrabala_tone():
    raw = get_daily_panchanga(ANCHOR, DEFAULT_LOCATION)
    table = raw["chandrabala_table"]
    built = build_daily_rashifal(table)
    for row, sign in zip(table["rows"], built["signs"], strict=True):
        assert row["tone"] == sign["tone"]
        assert row["tara_num"] == sign["tara_num"]


# ── weight tables ───────────────────────────────────────────────────────────


@pytest.mark.parametrize("period", PERIODS)
def test_layer_weights_sum_to_one(period):
    assert set(LAYER_WEIGHTS[period]) == set(LAYER_KEYS)
    assert sum(LAYER_WEIGHTS[period].values()) == pytest.approx(1.0)


@pytest.mark.parametrize("period", PERIODS)
def test_only_daily_uses_the_hora_layer(period):
    """A weekly or longer window has no single day lord, so the layer is off."""
    expected = period == "daily"
    assert (LAYER_WEIGHTS[period]["vaara_hora"] > 0) is expected


def test_period_profiles_shift_weight_from_moon_to_the_slow_grahas():
    daily = GRAHA_PERIOD_WEIGHT["daily"]
    yearly = GRAHA_PERIOD_WEIGHT["yearly"]
    assert daily["moon"] > yearly["moon"]
    assert yearly["jupiter"] > daily["jupiter"]
    assert yearly["saturn"] > daily["saturn"]


def test_vedha_tables_are_self_consistent():
    for graha, table in VEDHA.items():
        for house, vedha_house in table.items():
            assert 1 <= house <= 12, graha
            assert 1 <= vedha_house <= 12, graha
            assert house != vedha_house, graha
    assert frozenset({"sun", "saturn"}) in VEDHA_EXEMPT
    assert frozenset({"moon", "mercury"}) in VEDHA_EXEMPT
    # The nodes are read unobstructed rather than given an invented table.
    assert VEDHA["rahu"] == {}
    assert VEDHA["ketu"] == {}


def test_house_from_counts_inclusively():
    assert house_from(3, 3) == 1
    assert house_from(4, 3) == 2
    assert house_from(2, 3) == 12


def test_tone_bands_are_monotonic():
    ranked = [tone_for_score(s) for s in (-1.0, -0.6, -0.3, 0.0, 0.3, 0.6, 1.0)]
    assert ranked[0] == "worst"
    assert ranked[3] == "neutral"
    assert ranked[-1] == "best"


# ── the scored engine ───────────────────────────────────────────────────────


def test_day_frame_is_internally_consistent():
    frame = build_day_frame(ANCHOR, DEFAULT_LOCATION)
    assert 0 <= frame.moon_sign <= 11
    assert 0 <= frame.lagna_sign <= 11
    assert frame.paksha in ("shukla", "krishna")
    assert 0 <= frame.tithi_index <= 29
    # Sarvashtakavarga over the twelve signs always totals 337 bindus.
    assert sum(frame.sav) == 337
    assert frame.graha_sign["ketu"] == (frame.graha_sign["rahu"] + 6) % 12


def test_sign_payload_carries_every_layer_and_domain():
    frame = build_day_frame(ANCHOR, DEFAULT_LOCATION, with_hora=True)
    payload = build_sign_payload(frame, 0, "daily")
    assert payload["id"] == 1
    assert -1.0 <= payload["score"] <= 1.0
    assert 0 <= payload["percent"] <= 100
    assert 1 <= payload["stars"] <= 5
    assert {c["key"] for c in payload["components"]} == set(LAYER_KEYS)
    assert [d["key"] for d in payload["domains"]] == list(DOMAIN_KEYS)
    assert len(payload["gochar"]) == 9
    assert payload["prediction_ne"] and payload["prediction_en"]
    # The English reading must not leak Devanagari.
    assert not any("ऀ" <= ch <= "ॿ" for ch in payload["prediction_en"])


def test_scores_are_deterministic():
    a = build_sign_payload(build_day_frame(ANCHOR, DEFAULT_LOCATION), 5, "daily")
    b = build_sign_payload(build_day_frame(ANCHOR, DEFAULT_LOCATION), 5, "daily")
    assert a["score"] == b["score"]
    assert a["prediction_ne"] == b["prediction_ne"]


def test_signs_do_not_all_score_alike():
    """The whole point of the rewrite: twelve signs, twelve different readings."""
    out = rashifal_for_gregorian(ANCHOR, DEFAULT_LOCATION, period="daily")
    scores = {s["score"] for s in out["signs"]}
    assert len(scores) >= 8


def test_day_fraction_is_pure_latitude_geometry():
    from engine.vedic.rashifal_engine import day_fraction_for

    # Equinox: twelve hours everywhere.
    assert day_fraction_for(27.7, 0.0) == pytest.approx(0.5)
    # Northern summer: longer days the further north you stand.
    assert day_fraction_for(60.0, 23.4) > day_fraction_for(27.7, 23.4) > 0.5
    # Polar day and polar night clamp instead of blowing up on the arccos.
    assert day_fraction_for(80.0, 23.4) == 1.0
    assert day_fraction_for(80.0, -23.4) == 0.0


def test_latitude_changes_the_reading():
    """Natonnata bala is what keeps a rashifal from being the same everywhere."""
    from engine.astronomy.location import ObserverLocation

    far_north = ObserverLocation(
        lat=60.0, lon=85.3167, timezone="Asia/Kathmandu", altitude=0.0
    )
    here = rashifal_for_gregorian(ANCHOR, DEFAULT_LOCATION, period="daily")
    there = rashifal_for_gregorian(ANCHOR, far_north, period="daily")
    assert here["frame"]["day_fraction"] != there["frame"]["day_fraction"]
    assert any(
        a["score"] != b["score"]
        for a, b in zip(here["signs"], there["signs"], strict=True)
    )


@pytest.mark.parametrize("period", PERIODS)
def test_every_period_returns_twelve_scored_signs(period):
    out = rashifal_for_gregorian(ANCHOR, DEFAULT_LOCATION, period=period)
    assert out["period"] == period
    assert len(out["signs"]) == 12
    assert [s["id"] for s in out["signs"]] == list(range(1, 13))
    for sign in out["signs"]:
        assert sign["prediction_ne"] and sign["prediction_en"]
        assert sign["lucky_color_ne"] and sign["lucky_number_ne"]
        assert sign["tone"] in ("worst", "bad", "neutral", "good", "best")
    assert out["method"]["engine"] == "rashifal_v2"


def test_weekly_window_is_the_week_containing_the_anchor():
    """Wednesday and Friday of one week must resolve to the same seven days."""
    wednesday = date(2026, 7, 15)
    friday = wednesday + timedelta(days=2)
    a = rashifal_for_gregorian(wednesday, DEFAULT_LOCATION, period="weekly")
    b = rashifal_for_gregorian(friday, DEFAULT_LOCATION, period="weekly")
    assert a["range_start_ad"] == b["range_start_ad"]
    assert a["range_end_ad"] == b["range_end_ad"]
    assert date.fromisoformat(a["range_start_ad"]).weekday() == 6  # Sunday
    assert a["days_computed"] == 7


def test_aggregates_report_their_best_and_weakest_day():
    out = rashifal_for_gregorian(ANCHOR, DEFAULT_LOCATION, period="monthly")
    for sign in out["signs"]:
        assert sign["best_day"]["score"] >= sign["weak_day"]["score"]
        assert sign["best_day"]["date_ad"] <= out["range_end_ad"]
        assert sign["weak_day"]["date_ad"] >= out["range_start_ad"]


def test_yearly_reports_slow_graha_ingresses():
    out = rashifal_for_gregorian(ANCHOR, DEFAULT_LOCATION, period="yearly")
    assert out["days_computed"] > 100
    grahas = {e["graha"] for e in out["ingress"]}
    # A BS year always contains at least one Jupiter or Saturn sign change.
    assert grahas & {"jupiter", "saturn", "rahu", "ketu"}


def test_window_key_collapses_a_whole_month_to_one_cache_entry():
    first = date(2026, 7, 20)
    later = date(2026, 8, 10)
    assert rashifal_window_key(first, "monthly") == rashifal_window_key(later, "monthly")
    assert rashifal_window_key(first, "yearly") == rashifal_window_key(later, "yearly")
    assert rashifal_window_key(first, "daily") != rashifal_window_key(later, "daily")


def test_unknown_period_is_rejected():
    with pytest.raises(ValueError):
        rashifal_for_gregorian(ANCHOR, DEFAULT_LOCATION, period="fortnightly")
