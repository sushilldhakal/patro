"""Ashtakoota (Guna Milan) — server-side compatibility computation."""

from engine.vedic.at_time import parse_query_datetime
from engine.vedic.milan import (
    GANA_OF_NAKSHATRA,
    NADI_OF_NAKSHATRA,
    YONI_OF_NAKSHATRA,
    build_kundali_milan,
    compute_ashtakuta,
)

TZ = "Asia/Kathmandu"


def _person(rashi: int, nak: int):
    """Minimal person dict for the pure-kuta math."""
    return {"_rashi": rashi, "_nak": nak}


def test_per_nakshatra_tables_have_27_entries():
    assert len(YONI_OF_NAKSHATRA) == 27
    assert len(GANA_OF_NAKSHATRA) == 27
    assert len(NADI_OF_NAKSHATRA) == 27
    assert set(NADI_OF_NAKSHATRA) == {0, 1, 2}


def test_identical_charts_score_high_but_flag_nadi_dosha():
    # Same rashi + same nakshatra → same Nadi → Nadi dosha (0 of 8 points).
    person = _person(rashi=0, nak=0)  # Mesha, Ashwini
    result = compute_ashtakuta(person, person, lang="en")
    assert result["nadiDosha"] is True
    nadi = next(k for k in result["kutas"] if k["id"] == "nadi")
    assert nadi["obtained"] == 0
    assert result["totalMax"] == 36


def test_bhakuta_dosha_for_two_twelve_placement():
    boy = _person(rashi=0, nak=0)   # Mesha
    girl = _person(rashi=1, nak=4)  # Vrishabha (2-12 from Mesha)
    result = compute_ashtakuta(boy, girl, lang="en")
    assert result["bhakutaUnfavorable"] is True
    bhakuta = next(k for k in result["kutas"] if k["id"] == "bhakuta")
    assert bhakuta["obtained"] == 0


def test_total_is_sum_of_kutas_and_within_range():
    boy = parse_query_datetime("1990-05-15T10:30:00", timezone_name=TZ)
    girl = parse_query_datetime("1992-11-20T14:45:00", timezone_name=TZ)
    out = build_kundali_milan(boy, girl, ayanamsha="lahiri", lang="ne")
    result = out["result"]
    assert len(result["kutas"]) == 8
    assert 0 <= result["totalObtained"] <= 36
    assert abs(sum(k["obtained"] for k in result["kutas"]) - result["totalObtained"]) < 1e-9
    # Nepali values surface when lang=ne.
    varna = next(k for k in result["kutas"] if k["id"] == "varna")
    assert varna["boyValue"] and not varna["boyValue"].isascii()


def test_person_payload_exposes_moon_details():
    boy = parse_query_datetime("1990-05-15T10:30:00", timezone_name=TZ)
    girl = parse_query_datetime("1992-11-20T14:45:00", timezone_name=TZ)
    out = build_kundali_milan(boy, girl, ayanamsha="lahiri", lang="en")
    for side in ("boy", "girl"):
        p = out[side]
        assert 1 <= p["moonRashiNum"] <= 12
        assert 0 <= p["nakshatraIndex"] <= 26
        assert 1 <= p["pada"] <= 4
        assert p["moonRashiEn"] and p["nakshatraEn"]
        assert "_rashi" not in p  # internal helpers stripped from response
