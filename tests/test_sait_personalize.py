"""Tests for profile-based (native) sāit annotation, incl. Guru Śuddhi."""

from engine.astronomy.location import DEFAULT_LOCATION
from services.sait_personalize import (
    _guru_tone,
    _verdict,
    personalize_sait,
)


def test_guru_tone_house_mapping():
    # 2/5/7/9/11 auspicious; 1/3/6/10 needs śānti; 4/8/12 avoided.
    for h in (2, 5, 7, 9, 11):
        assert _guru_tone(h) == "good"
    for h in (1, 3, 6, 10):
        assert _guru_tone(h) == "shanti"
    for h in (4, 8, 12):
        assert _guru_tone(h) == "avoid"


def test_verdict_folds_in_guru_tone():
    # A strong Moon is still vetoed by an avoid-house Jupiter.
    assert _verdict("best", "best", False, "avoid") == "avoid"
    # A śānti house caps an otherwise-favourable day at neutral.
    assert _verdict("best", "best", False, "shanti") == "neutral"
    # A good house lets a strong Moon stay favourable.
    assert _verdict("best", "best", False, "good") == "favourable"
    # Tārā/Chandra doṣa still dominates.
    assert _verdict("bad", "best", False, "good") == "avoid"
    # Non-bratabandha (guru_tone=None) keeps the prior behaviour.
    assert _verdict("best", "best", False, None) == "favourable"
    assert _verdict("best", "best", False) == "favourable"


def test_bratabandha_days_carry_guru_shuddhi():
    # janma nakṣatra 18 (Jyeṣṭha) / rāśi 8 (Vṛścika) — arbitrary sample chart.
    res = personalize_sait(2083, "bratabandha", 18, 8, DEFAULT_LOCATION)
    assert res["days"], "expected some generally-auspicious days to annotate"
    for d in res["days"]:
        assert d["guru_house"] is not None
        assert 1 <= d["guru_house"] <= 12
        assert d["guru_tone"] in {"good", "shanti", "avoid"}
        assert d["guru_rashi_ne"]
        # verdict must respect the Guru Śuddhi rule.
        if d["guru_tone"] == "avoid":
            assert d["suitability"] == "avoid"
        if d["guru_tone"] == "shanti":
            assert d["suitability"] in {"neutral", "avoid"}


def test_non_bratabandha_has_no_guru_fields():
    # rudri-jurne is a Vās category; Guru Śuddhi does not apply.
    res = personalize_sait(2083, "rudri-jurne", 18, 8, DEFAULT_LOCATION)
    for d in res["days"]:
        assert d["guru_house"] is None
        assert d["guru_tone"] is None
