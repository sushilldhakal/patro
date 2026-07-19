"""Vimshopaka Bala (20-point divisional strength) unit tests."""

from engine.vedic.vimshopaka import (
    SWAVISHWA,
    VARGA_VISHWA,
    _grade,
    _varga_vishwa,
    compute_vimshopaka,
)
from engine.vedic.vargas import varga_rashi_from_longitude


def _d1_signs(lons):
    return {p: int(l // 30) % 12 for p, l in lons.items()}


def test_all_classification_points_sum_to_20():
    for cls, pts in SWAVISHWA.items():
        assert pts is not None, f"{cls} not defined"
        assert abs(sum(pts.values()) - 20.0) < 1e-9, f"{cls} ≠ 20"


def test_scores_bounded_and_graded():
    # A representative set of longitudes across the zodiac.
    lons = {
        "sun": 95.0, "moon": 200.0, "mars": 15.0, "mercury": 260.0,
        "jupiter": 330.0, "venus": 48.0, "saturn": 118.0,
    }
    out = compute_vimshopaka(lons, _d1_signs(lons))
    assert [c["key"] for c in out["classifications"]] == [
        "shadvarga", "saptavarga", "dashavarga", "shodashavarga",
    ]
    assert out["max_score"] == 20
    for pl in out["planets"]:
        for cls in ("shadvarga", "saptavarga", "dashavarga", "shodashavarga"):
            s = pl["scores"][cls]
            assert 0.0 <= s["score"] <= 20.0
            assert s["grade"] in {"full", "mediocre", "little", "incapable"}


def test_own_sign_gives_full_varga_vishwa():
    # Sun's own sign is Leo (index 4); relationship points must be 20 there.
    d1 = {"sun": 4}
    assert _varga_vishwa("sun", 4, d1) == 20.0


def test_exaltation_sign_gives_full_varga_vishwa():
    # Sun exalts in Aries (index 0) — treated as 20 even though Mars rules it.
    d1 = {"sun": 0, "mars": 0}
    assert _varga_vishwa("sun", 0, d1) == 20.0


def test_debilitation_sign_gives_zero():
    # Sun debilitates in Libra (index 6, 7th from Aries) — bereft of strength.
    d1 = {"sun": 6, "venus": 6, "moon": 0, "mars": 0, "mercury": 0,
          "jupiter": 0, "saturn": 0}
    assert _varga_vishwa("sun", 6, d1) == 0.0
    # Moon debilitates in Scorpio (index 7); Mars debilitates in Cancer (3).
    assert _varga_vishwa("moon", 7, {"moon": 7}) == 0.0
    assert _varga_vishwa("mars", 3, {"mars": 3}) == 0.0


def test_grade_bands():
    assert _grade(20.0) == "full"
    assert _grade(15.0) == "full"
    assert _grade(14.99) == "mediocre"
    assert _grade(10.0) == "mediocre"
    assert _grade(9.99) == "little"
    assert _grade(5.0) == "little"
    assert _grade(4.99) == "incapable"


def test_max_score_when_all_divisions_own_or_friendly():
    # Sun placed so its D1 sign is Leo; even if only D1 is own, the score must
    # not exceed 20 and each division contributes points × (≤20)/20.
    lons = {p: 0.0 for p in ("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")}
    lons["sun"] = 4 * 30 + 1.0  # 1° Leo
    out = compute_vimshopaka(lons, _d1_signs(lons))
    sun = next(p for p in out["planets"] if p["key"] == "sun")
    assert sun["scores"]["shadvarga"]["score"] <= 20.0


def test_varga_vishwa_table_matches_book():
    # Extreme friend 18, friend 15, neutral 10, enemy 7, extreme enemy 5.
    assert VARGA_VISHWA == {2: 18.0, 1: 15.0, 0: 10.0, -1: 7.0, -2: 5.0}
