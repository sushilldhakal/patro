"""Tests for the time-resolved muhurta engine."""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.bikram_sambat import bs_to_gregorian
from engine.vedic.muhurta_engine import (
    CEREMONY_RULES,
    CeremonyRule,
    MUHURTA_CATEGORIES,
    _eclipse_near,
    _window_ok,
    has_muhurta,
    muhurta_windows,
)
from engine.vedic.sait_rules import build_day_panchanga


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


def test_vivah_rule_has_classical_vetoes():
    rule = CEREMONY_RULES["vivah"]
    assert "Vishti" in rule.avoid_karanas
    # STRICT śāstra: all nine aśubha yogas, Tue/Sat barred, no Godhūli rescue.
    assert {1, 6, 9, 10, 13, 15, 17, 19, 27} <= rule.avoid_yogas
    assert {3, 7} <= rule.avoid_varas  # Tuesday & Saturday
    assert rule.block_dur_muhurta
    assert rule.eclipse_pad_days == 3
    assert rule.sankranti_buffer_hours > 0
    assert rule.major_sankranti_buffer_hours > rule.sankranti_buffer_hours
    assert not rule.godhuli_overrides_dagdha_shunya
    assert rule.day_kill_on_major_dosha
    assert rule.check_dagdha and rule.check_shunya
    # General year-list stays at the anga level — no chart (lagna-śuddhi) layer.
    assert not rule.avoid_malefic_houses
    assert not rule.avoid_moon_houses


def test_day_kill_when_vishti_touches_practical_window():
    """A Vishti slice inside sunrise→sunset must scrub the entire day."""
    from engine.vedic.muhurta_engine import _major_dosha_touches_practical_window

    rule = CeremonyRule(
        key="test",
        avoid_karanas=frozenset({"Vishti"}),
        day_kill_on_major_dosha=True,
    )
    sunrise = datetime(2026, 2, 1, 1, 0, tzinfo=timezone.utc)  # ~06:45 NPT
    sunset = datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)
    next_sunrise = datetime(2026, 2, 2, 1, 0, tzinfo=timezone.utc)

    def _karana_side_effect(dt):
        # Vishti only for one mid-morning sample; rest clean.
        if dt == sunrise + timedelta(hours=3):
            return (7, "Vishti")
        return (1, "Bava")

    with patch("engine.vedic.muhurta_engine.get_karana", side_effect=_karana_side_effect):
        assert _major_dosha_touches_practical_window(
            rule,
            sunrise=sunrise,
            sunset=sunset,
            next_sunrise=next_sunrise,
            day_vaara=5,
            pierced_naks=frozenset(),
            dur_intervals=[],
            sankranti_intervals=[],
        )


def test_no_day_kill_when_dosha_only_after_sunset():
    """Doṣa after sunset must not scrub a clean daytime window."""
    from engine.vedic.muhurta_engine import _major_dosha_touches_practical_window

    rule = CeremonyRule(
        key="test",
        avoid_karanas=frozenset({"Vishti"}),
        day_kill_on_major_dosha=True,
    )
    sunrise = datetime(2026, 2, 1, 1, 0, tzinfo=timezone.utc)
    sunset = datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)
    next_sunrise = datetime(2026, 2, 2, 1, 0, tzinfo=timezone.utc)

    def _karana_side_effect(dt):
        if dt >= sunset:
            return (7, "Vishti")
        return (1, "Bava")

    with patch("engine.vedic.muhurta_engine.get_karana", side_effect=_karana_side_effect):
        assert not _major_dosha_touches_practical_window(
            rule,
            sunrise=sunrise,
            sunset=sunset,
            next_sunrise=next_sunrise,
            day_vaara=5,
            pierced_naks=frozenset(),
            dur_intervals=[],
            sankranti_intervals=[],
        )


def test_dur_muhurta_does_not_day_kill():
    """Dur-muhūrta voids its slot but must not scrub the whole day."""
    from engine.vedic.muhurta_engine import _major_dosha_touches_practical_window

    rule = CeremonyRule(
        key="test",
        block_dur_muhurta=True,
        day_kill_on_major_dosha=True,
    )
    sunrise = datetime(2026, 2, 1, 1, 0, tzinfo=timezone.utc)
    sunset = datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)
    next_sunrise = datetime(2026, 2, 2, 1, 0, tzinfo=timezone.utc)
    dur = [(sunrise + timedelta(hours=2), sunrise + timedelta(hours=3))]

    with patch("engine.vedic.muhurta_engine.get_karana", return_value=(1, "Bava")):
        assert not _major_dosha_touches_practical_window(
            rule,
            sunrise=sunrise,
            sunset=sunset,
            next_sunrise=next_sunrise,
            day_vaara=5,
            pierced_naks=frozenset(),
            dur_intervals=dur,
            sankranti_intervals=[],
        )

def test_vivah_rejects_saturday():
    # STRICT śāstra bars Tuesday & Saturday for vivāha. BS 2083 Ashadh 13 is a
    # Saturday in the vivāha season — the weekday veto must reject the whole day.
    greg = bs_to_gregorian(2083, 3, 13)
    assert build_day_panchanga(greg).vaara == 7  # Saturday
    assert not has_muhurta("vivah", greg)


def test_dagdha_day_kills():
    """STRICT: a Dagdha slice touching sunrise→sunset scrubs the whole day."""
    from engine.vedic.muhurta_engine import _major_dosha_touches_practical_window

    rule = CeremonyRule(
        key="test",
        check_dagdha=True,
        day_kill_on_major_dosha=True,
    )
    sunrise = datetime(2026, 2, 1, 1, 0, tzinfo=timezone.utc)
    sunset = datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)
    next_sunrise = datetime(2026, 2, 2, 1, 0, tzinfo=timezone.utc)

    # Sunday (vaara=1) × Dwadashi (12) is Dagdha all day; must day-kill.
    with (
        patch("engine.vedic.muhurta_engine.get_tithi_angle", return_value=150.0),
        patch("engine.vedic.muhurta_engine.get_tithi_number", return_value=12),
        patch("engine.vedic.muhurta_engine.get_display_tithi", return_value=12),
    ):
        assert _major_dosha_touches_practical_window(
            rule,
            sunrise=sunrise,
            sunset=sunset,
            next_sunrise=next_sunrise,
            day_vaara=1,
            pierced_naks=frozenset(),
            dur_intervals=[],
            sankranti_intervals=[],
        )


def test_eclipse_pad_rejects_near_eclipse():
    # 2026-08-12 is a total solar eclipse (global max).
    assert _eclipse_near(date(2026, 8, 12), 1)
    assert _eclipse_near(date(2026, 8, 11), 1)
    assert _eclipse_near(date(2026, 8, 13), 1)
    assert not _eclipse_near(date(2026, 8, 20), 1)


def test_godhuli_shields_dagdha():
    """Inside Godhūli, a Dagdha clash is allowed when the ceremony opts in."""
    rule = CeremonyRule(
        key="test",
        check_dagdha=True,
        godhuli_overrides_dagdha_shunya=True,
        tithis=frozenset({12}),
    )
    dt = datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)
    # Sunday (vaara=1) × Dwadashi (12) is Dagdha — fake the ephemeris tithi.
    with (
        patch("engine.vedic.muhurta_engine.get_tithi_angle", return_value=150.0),
        patch("engine.vedic.muhurta_engine.get_tithi_number", return_value=12),
        patch("engine.vedic.muhurta_engine.get_display_tithi", return_value=12),
        patch("engine.vedic.muhurta_engine.get_paksha", return_value="shukla"),
        patch("engine.vedic.muhurta_engine.get_nakshatra", return_value=(13, "Hasta", 0.0)),
        patch(
            "engine.vedic.muhurta_engine.get_sidereal_asc_longitude",
            return_value=15.0,
        ),
    ):
        rejected, *_ = _window_ok(
            rule, dt, {}, frozenset(), 1, DEFAULT_LOCATION, in_godhuli=False
        )
        assert not rejected
        allowed, tithi, *_ = _window_ok(
            rule, dt, {}, frozenset(), 1, DEFAULT_LOCATION, in_godhuli=True
        )
        assert allowed
        assert tithi == 12


def test_vishti_and_vaidhriti_rejected():
    rule = CeremonyRule(
        key="test",
        avoid_karanas=frozenset({"Vishti"}),
        avoid_yogas=frozenset({27}),
        tithis=frozenset({5}),
    )
    dt = datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc)
    with (
        patch("engine.vedic.muhurta_engine.get_tithi_angle", return_value=50.0),
        patch("engine.vedic.muhurta_engine.get_tithi_number", return_value=5),
        patch("engine.vedic.muhurta_engine.get_display_tithi", return_value=5),
        patch("engine.vedic.muhurta_engine.get_paksha", return_value="shukla"),
        patch("engine.vedic.muhurta_engine.get_yoga", return_value=(27, "Vaidhriti", 0.0)),
        patch("engine.vedic.muhurta_engine.get_karana", return_value=(7, "Vishti")),
        patch("engine.vedic.muhurta_engine.get_nakshatra", return_value=(13, "Hasta", 0.0)),
        patch(
            "engine.vedic.muhurta_engine.get_sidereal_asc_longitude",
            return_value=15.0,
        ),
    ):
        ok, *_ = _window_ok(rule, dt, {}, frozenset(), 5, DEFAULT_LOCATION)
        assert not ok
