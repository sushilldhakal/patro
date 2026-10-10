"""Tests for Kṣaya (lost) tithi and Kṣaya Pakṣa (13-tithi fortnight) detection."""

from datetime import date, timedelta
from unittest.mock import patch

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.tithi import is_kshaya_paksha, is_kshaya_tithi_day


def _fake_sunrise_tithi(sequence: dict[date, tuple[int, str]]):
    """Return a calculate_tithi_at_sunrise stand-in driven by ``sequence``."""

    def _side_effect(date_val, location=DEFAULT_LOCATION):
        number, paksha = sequence[date_val]
        return {"number": number, "paksha": paksha}

    return _side_effect


def _run(first: date, tithis: list[tuple[int, str]]) -> dict[date, tuple[int, str]]:
    """Build a date→(tithi, paksha) map for consecutive days starting at ``first``."""
    return {first + timedelta(days=i): t for i, t in enumerate(tithis)}


def test_is_kshaya_tithi_day_detects_two_step():
    seq = {date(2026, 2, 1): (5, "shukla"), date(2026, 2, 2): (7, "shukla")}
    with patch(
        "engine.vedic.tithi.calculate_tithi_at_sunrise",
        side_effect=_fake_sunrise_tithi(seq),
    ):
        assert is_kshaya_tithi_day(date(2026, 2, 1))


def test_is_kshaya_tithi_day_false_on_normal_advance():
    seq = {date(2026, 2, 1): (5, "shukla"), date(2026, 2, 2): (6, "shukla")}
    with patch(
        "engine.vedic.tithi.calculate_tithi_at_sunrise",
        side_effect=_fake_sunrise_tithi(seq),
    ):
        assert not is_kshaya_tithi_day(date(2026, 2, 1))


def test_kshaya_paksha_true_on_13_day_fortnight():
    # A śukla fortnight of only 13 sunrise days (two tithis lost — here 4 and 9),
    # flanked by kṛṣṇa days so the contiguous-run walk terminates.
    tithis = (
        [(16, "krishna")]
        + [(t, "shukla") for t in (1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15)]
        + [(16, "krishna")]
    )
    seq = _run(date(2026, 1, 31), tithis)
    with patch(
        "engine.vedic.tithi.calculate_tithi_at_sunrise",
        side_effect=_fake_sunrise_tithi(seq),
    ):
        # Any day inside the 13-day fortnight reports the whole pakṣa as kṣaya.
        assert is_kshaya_paksha(date(2026, 2, 4))
        assert is_kshaya_paksha(date(2026, 2, 9))


def test_kshaya_paksha_false_on_single_lost_tithi():
    # A śukla fortnight of 14 sunrise days (only ONE tithi lost — tithi 4). This
    # is ordinary and must NOT be flagged (regression for the official Samiti
    # vivāha day of 2026-04-20, whose fortnight loses only Chaturthi).
    tithis = (
        [(16, "krishna")]
        + [(t, "shukla") for t in (1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)]
        + [(16, "krishna")]
    )
    seq = _run(date(2026, 1, 31), tithis)
    with patch(
        "engine.vedic.tithi.calculate_tithi_at_sunrise",
        side_effect=_fake_sunrise_tithi(seq),
    ):
        assert not is_kshaya_paksha(date(2026, 2, 4))


def test_kshaya_paksha_false_on_full_fortnight():
    tithis = (
        [(16, "krishna")]
        + [(t, "shukla") for t in range(1, 16)]  # 15 udaya tithis
        + [(16, "krishna")]
    )
    seq = _run(date(2026, 1, 31), tithis)
    with patch(
        "engine.vedic.tithi.calculate_tithi_at_sunrise",
        side_effect=_fake_sunrise_tithi(seq),
    ):
        assert not is_kshaya_paksha(date(2026, 2, 5))
