"""Divisional (varga) rashi rules — regression tests for the BPHS method."""

from engine.vedic.vargas import varga_rashi_from_longitude as v


def test_d4_quarters_are_kendras_from_sign():
    # Aries: the four 7.5° quarters → 1st/4th/7th/10th signs (Ar, Cn, Li, Cp).
    assert [v(4, x) for x in (1, 9, 17, 25)] == [1, 4, 7, 10]
    # Taurus: Ta, Le, Sc, Aq.
    assert [v(4, 30 + x) for x in (1, 9, 17, 25)] == [2, 5, 8, 11]


def test_d27_starts_by_element():
    # Fire→Aries, Earth→Cancer, Air→Libra, Water→Capricorn (first part of each).
    assert v(27, 0 * 30 + 0.1) == 1     # Aries (fire)
    assert v(27, 1 * 30 + 0.1) == 4     # Taurus (earth) → Cancer
    assert v(27, 2 * 30 + 0.1) == 7     # Gemini (air) → Libra
    assert v(27, 3 * 30 + 0.1) == 10    # Cancer (water) → Capricorn


def test_d30_even_sign_jupiter_saturn_spans():
    # Taurus (even): 12–18 → Jupiter/Pisces(12); 18–25 → Saturn/Capricorn(10).
    assert v(30, 30 + 15) == 12
    assert v(30, 30 + 19) == 10
    assert v(30, 30 + 24) == 10
    # 25–30 → Mars/Scorpio(8); 0–5 Venus/Taurus(2); 5–12 Mercury/Virgo(6).
    assert v(30, 30 + 26) == 8
    assert v(30, 30 + 2) == 2
    assert v(30, 30 + 8) == 6


def test_d30_odd_sign_spans_unchanged():
    # Aries (odd): Mars 0–5 Aries(1), Saturn 5–10 Aquarius(11), Jupiter 10–18
    # Sagittarius(9), Mercury 18–25 Gemini(3), Venus 25–30 Libra(7).
    assert [v(30, x) for x in (2, 8, 15, 20, 27)] == [1, 11, 9, 3, 7]


def test_d60_counts_from_own_sign_all_signs():
    # First shashtiamsha of any sign is the sign itself (no odd/even reversal).
    assert v(60, 0.3) == 1        # Aries
    assert v(60, 30 + 0.3) == 2   # Taurus
    assert v(60, 60 + 0.3) == 3   # Gemini
    # Second (0.5–1.0°) is the next sign.
    assert v(60, 30 + 0.7) == 3   # Taurus → Gemini
