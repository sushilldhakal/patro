"""Tests for the time-resolved muhurta engine."""

from engine.vedic.bikram_sambat import bs_to_gregorian
from engine.vedic.muhurta_engine import (
    MUHURTA_CATEGORIES,
    has_muhurta,
    muhurta_windows,
)


def test_lagna_categories_registered():
    assert {"vivah", "bratabandha", "griha-pravesh"} <= MUHURTA_CATEGORIES


def test_official_vivah_day_has_window():
    # BS 2083 Baisakh 7 is an official Samiti vivah day; the engine should find
    # at least one auspicious window on it.
    greg = bs_to_gregorian(2083, 1, 7)
    assert has_muhurta("vivah", greg)
    windows = muhurta_windows("vivah", greg)
    assert windows
    w = windows[0]
    assert w.end > w.start
    assert 1 <= w.nakshatra <= 27
    assert 1 <= w.lagna <= 12


def test_off_season_has_no_vivah():
    # Deep Chaturmas (Shrawan/Bhadra) — no marriages.
    assert not has_muhurta("vivah", bs_to_gregorian(2083, 4, 15))
