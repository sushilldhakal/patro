"""Tests for profile-based (native) sāit annotation, incl. Graha Śuddhi."""

from engine.astronomy.location import DEFAULT_LOCATION
from services.sait_personalize import (
    _overall_shuddhi_tone,
    _planet_tone,
    _verdict,
    personalize_sait,
)

# Jupiter's good houses (2/5/7/9/11) reused as a sample "good" set.
_GURU_GOOD = frozenset({2, 5, 7, 9, 11})


def test_planet_tone_house_mapping():
    for h in (2, 5, 7, 9, 11):
        assert _planet_tone(h, _GURU_GOOD) == "good"
    for h in (4, 8, 12):
        assert _planet_tone(h, _GURU_GOOD) == "avoid"
    for h in (1, 3, 6, 10):  # not good, not avoid → needs śānti
        assert _planet_tone(h, _GURU_GOOD) == "shanti"


def test_overall_shuddhi_tone():
    assert _overall_shuddhi_tone(["good", "good"]) == "good"
    assert _overall_shuddhi_tone(["good", "shanti"]) == "shanti"
    assert _overall_shuddhi_tone(["good", "avoid"]) == "avoid"  # one bad vetoes
    assert _overall_shuddhi_tone([]) == "shanti"


def test_verdict_folds_in_shuddhi_tone():
    assert _verdict("best", "best", False, "avoid") == "avoid"
    assert _verdict("best", "best", False, "shanti") == "neutral"  # capped
    assert _verdict("best", "best", False, "good") == "favourable"
    assert _verdict("bad", "best", False, "good") == "avoid"
    # Non-shuddhi categories (tone=None) keep the prior behaviour.
    assert _verdict("best", "best", False, None) == "favourable"
    assert _verdict("best", "best", False) == "favourable"


def test_bratabandha_shuddhi_is_single_planet_guru():
    res = personalize_sait(2083, "bratabandha", 18, 8, DEFAULT_LOCATION)
    assert res["days"], "expected some generally-auspicious days to annotate"
    for d in res["days"]:
        sh = d["shuddhi"]
        assert sh is not None
        assert [p["planet"] for p in sh["planets"]] == ["guru"]
        assert sh["tone"] in {"good", "shanti", "avoid"}
        if sh["tone"] == "avoid":
            assert d["suitability"] == "avoid"
        if sh["tone"] == "shanti":
            assert d["suitability"] in {"neutral", "avoid"}


def test_griha_aarambha_checks_four_grahas():
    res = personalize_sait(2083, "griha-aarambha", 18, 8, DEFAULT_LOCATION)
    assert res["days"], "expected some generally-auspicious days to annotate"
    for d in res["days"]:
        sh = d["shuddhi"]
        assert sh is not None
        assert [p["planet"] for p in sh["planets"]] == ["sun", "moon", "guru", "shukra"]
        for p in sh["planets"]:
            assert 1 <= p["house"] <= 12
            assert p["rashi_ne"]
        # Any planet in 4/8/12 → overall avoid → day avoided.
        if any(p["house"] in {4, 8, 12} for p in sh["planets"]):
            assert sh["tone"] == "avoid"
            assert d["suitability"] == "avoid"


def test_non_shuddhi_category_has_no_shuddhi():
    res = personalize_sait(2083, "rudri-jurne", 18, 8, DEFAULT_LOCATION)
    for d in res["days"]:
        assert d["shuddhi"] is None
