"""Classical Vimshottari / Yogini / Tribhagi arithmetic."""

from datetime import datetime, timedelta, timezone

from engine.vedic.kundali_detail import subdivide_dasha_period
from engine.vedic.tribhagi import tribhagi_dasha
from engine.vedic.vimshottari import (
    DASHA_SEQUENCE,
    DASHA_YEARS,
    NAKSHATRA_SPAN_DEG,
    YEAR_DAYS,
    vimshottari_dasha,
)
from engine.vedic.yogini import YOGINI_SEQUENCE, YOGINI_YEARS, _yogini_index_for_nakshatra, yogini_dasha

BIRTH = datetime(1990, 5, 15, 6, 30, tzinfo=timezone.utc)


def test_vimshottari_lord_years_and_120_year_cycle():
    assert DASHA_SEQUENCE == [
        "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
    ]
    assert DASHA_YEARS == {
        "ketu": 7, "venus": 20, "sun": 6, "moon": 10, "mars": 7,
        "rahu": 18, "jupiter": 16, "saturn": 19, "mercury": 17,
    }
    assert sum(DASHA_YEARS.values()) == 120
    # Mean Gregorian year, not a 360-day savana year — see vimshottari.py's
    # comment on YEAR_DAYS for why (drifted real dates ~5 days/year vs.
    # every mainstream reference implementation).
    assert YEAR_DAYS == 365.2425


def test_vimshottari_balance_is_remaining_nakshatra_times_lord_years():
    # Rohini starts at 3 × 13°20' = 40°. Moon 5° into Rohini → 8/13.333 remaining.
    lon = 3 * NAKSHATRA_SPAN_DEG + 5.0
    result = vimshottari_dasha(lon, BIRTH, cycles=1)
    remaining = 1 - 5.0 / NAKSHATRA_SPAN_DEG
    assert result["mahadasha_lord"] == "moon"
    assert abs(result["balance_years"] - remaining * 10) < 1e-9
    assert result["sequence"][0]["start"] == BIRTH.isoformat()
    assert result["sequence"][1]["lord"] == "mars"
    assert result["sequence"][1]["years"] == 7


def test_rahu_jupiter_antardasha_is_2_4_years():
    """18 × 16 / 120 = 2.4 years, converted at the real (365.2425-day) year."""
    start = datetime(2000, 1, 1, tzinfo=timezone.utc)
    end = start + timedelta(days=18 * YEAR_DAYS)
    children = subdivide_dasha_period("rahu", start, end, parent_full_years=18)
    jupiter = next(c for c in children if c["lord"] == "jupiter")
    days = (
        datetime.fromisoformat(jupiter["end"]) - datetime.fromisoformat(jupiter["start"])
    ).total_seconds() / 86400
    assert abs(days - 2.4 * YEAR_DAYS) < 0.01


def test_birth_balance_skips_antardashas_already_consumed():
    """75% of Venus mahadasha elapsed → first visible bhukti is not Venus-Venus."""
    bharani_start = NAKSHATRA_SPAN_DEG  # 13°20'
    lon = bharani_start + 0.75 * NAKSHATRA_SPAN_DEG
    result = vimshottari_dasha(lon, BIRTH, cycles=1)
    assert result["mahadasha_lord"] == "venus"
    assert abs(result["balance_years"] - 5.0) < 1e-9

    start = datetime.fromisoformat(result["sequence"][0]["start"])
    end = datetime.fromisoformat(result["sequence"][0]["end"])
    children = subdivide_dasha_period("venus", start, end, parent_full_years=20)
    # Elapsed 15y of Venus: V+Su+Mo+Ma+Ra+Ju = 12.833y, then Saturn (3.167y).
    assert children[0]["lord"] == "saturn"
    assert children[0]["start"] == start.isoformat()
    assert [c["lord"] for c in children] == ["saturn", "mercury", "ketu"]


def test_yogini_order_years_and_starting_lord_mod_eight():
    assert YOGINI_YEARS == {
        "mangala": 1, "pingala": 2, "dhanya": 3, "bhramari": 4,
        "bhadrika": 5, "ulka": 6, "siddha": 7, "sankata": 8,
    }
    assert sum(YOGINI_YEARS.values()) == 36
    # 1-based (n + 3) % 8 → rem 1=Mangala … rem 0=Sankata.
    # Ashwini (1) → rem 4 = Bhramari; Purva Bhadrapada (25) → rem 4 = Bhramari.
    assert YOGINI_SEQUENCE[_yogini_index_for_nakshatra(0)] == "bhramari"
    assert YOGINI_SEQUENCE[_yogini_index_for_nakshatra(24)] == "bhramari"
    # Ardra is 1-based 6 → rem 1 = Mangala.
    assert YOGINI_SEQUENCE[_yogini_index_for_nakshatra(5)] == "mangala"


def test_yogini_balance_uses_remaining_nakshatra():
    lon = 24 * NAKSHATRA_SPAN_DEG + NAKSHATRA_SPAN_DEG / 4
    result = yogini_dasha(lon, BIRTH, cycles=1)
    assert result["mahadasha_lord"] == "bhramari"
    assert abs(result["balance_years"] - 0.75 * 4) < 1e-9


def test_tribhagi_is_vimshottari_divided_by_three():
    lon = 3 * NAKSHATRA_SPAN_DEG + 5.0
    vims = vimshottari_dasha(lon, BIRTH, cycles=1)
    trib = tribhagi_dasha(lon, BIRTH, cycles=1)
    assert trib["mahadasha_lord"] == vims["mahadasha_lord"] == "moon"
    assert abs(trib["balance_years"] - vims["balance_years"] / 3) < 1e-9
    assert trib["sequence"][1]["lord"] == "mars"
    assert abs(trib["sequence"][1]["years"] - 7 / 3) < 1e-9
    assert abs(sum(DASHA_YEARS[p] / 3 for p in DASHA_SEQUENCE) - 40) < 1e-9
