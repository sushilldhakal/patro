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


def test_vivah_rule_has_classical_month_and_planet_gates():
    """4.7.0 additions: solar-month gate, Simhastha-guru veto, Guru/Śukra
    bala-vriddha rejection, and the Kṣaya-pakṣa veto."""
    from engine.vedic.sait_rules import SIMHASTHA_GURU_RASHI, VIVAH_SUN_RASHIS

    rule = CEREMONY_RULES["vivah"]
    assert rule.sun_rashis == VIVAH_SUN_RASHIS == frozenset({1, 2, 3, 8, 10, 11})
    assert rule.avoid_guru_rashis == frozenset({SIMHASTHA_GURU_RASHI})  # Simha
    assert rule.reject_guru_shukra_bala_vriddha
    assert rule.block_kshaya_paksha
    # The dual gate keeps the existing lunar-month season constraint too.
    assert rule.lunar_months and rule.require_guru_udaya and rule.require_shukra_udaya


def test_day_gate_rejects_simhastha_and_bala_vriddha():
    """The vivāha day-gate drops a Simhastha-guru day and a bāla/vṛddha Guru/Śukra
    day even when the sunrise chart is otherwise in season."""
    from dataclasses import replace

    from engine.vedic.muhurta_engine import _day_gate
    from engine.vedic.sait_rules import DayPanchanga

    rule = CEREMONY_RULES["vivah"]
    clean = DayPanchanga(
        gregorian=date(2026, 2, 1),
        tithi_absolute=5, tithi_display=5, paksha="shukla",
        nakshatra=13, vaara=5, sun_rashi=11, sun_longitude=315.0,
        jupiter_combust=False, venus_combust=False, mercury_combust=False,
        lunar_month="Magh", is_adhik_maas=False, aayan="Uttarayana",
        mercury_quadrant=True, jupiter_quadrant=True, jupiter_rashi=6,
    )
    with patch("engine.vedic.muhurta_engine.build_day_panchanga", return_value=clean), \
         patch("engine.vedic.muhurta_engine.is_kshaya_paksha", return_value=False):
        assert _day_gate(rule, clean.gregorian, DEFAULT_LOCATION).ok
    simhastha = replace(clean, jupiter_rashi=5)
    with patch("engine.vedic.muhurta_engine.build_day_panchanga", return_value=simhastha), \
         patch("engine.vedic.muhurta_engine.is_kshaya_paksha", return_value=False):
        assert not _day_gate(rule, simhastha.gregorian, DEFAULT_LOCATION).ok
    weak = replace(clean, venus_bala_vriddha=True)
    with patch("engine.vedic.muhurta_engine.build_day_panchanga", return_value=weak), \
         patch("engine.vedic.muhurta_engine.is_kshaya_paksha", return_value=False):
        assert not _day_gate(rule, weak.gregorian, DEFAULT_LOCATION).ok


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


def test_bratabandha_strict_classical_filters():
    """Upanayana opts into the stricter classical vetoes: Vishti (Bhadra),
    Vyatipata & Vaidhriti yoga, Sankranti, eclipse, and slot-only Dur-muhurta."""
    rule = CEREMONY_RULES["bratabandha"]
    assert "Vishti" in rule.avoid_karanas
    assert {17, 27} <= rule.avoid_yogas  # Vyatipata=17, Vaidhriti=27
    assert rule.block_sankranti
    assert rule.block_dur_muhurta
    assert rule.eclipse_pad_days == 3
    # Dur-muhurta must stay slot-only for Upanayana (no whole-day kill).
    assert not rule.day_kill_on_major_dosha


def test_griha_aarambha_strict_vastu_filters():
    """Griha-aarambha follows the strict classical Vastu-muhurta config."""
    rule = CEREMONY_RULES["griha-aarambha"]
    assert rule.tithis == frozenset({2, 3, 5, 7, 10, 11, 12})  # no Pratipada/Trayodashi
    assert rule.nakshatras == frozenset({4, 5, 7, 12, 13, 14, 15, 17, 21, 22, 23, 26, 27})
    assert rule.lagnas == frozenset({2, 3, 5, 6, 8, 9, 11, 12})  # fixed + dual only
    assert {17, 27} <= rule.avoid_yogas  # Vyatipata & Vaidhriti
    assert "Vishti" in rule.avoid_karanas
    assert rule.block_dur_muhurta and not rule.day_kill_on_major_dosha  # slot-only
    assert rule.sankranti_buffer_hours == 6.0 and rule.major_sankranti_buffer_hours == 16.0
    assert rule.eclipse_pad_days == 1
    assert rule.daytime_only  # foundation is a daytime rite


def test_griha_pravesh_strict_filters_and_fallback():
    """Griha-pravesh adds the classical vetoes, a fixed+dual lagna policy, and
    an adaptive nakshatra fallback for scarce years."""
    rule = CEREMONY_RULES["griha-pravesh"]
    assert {17, 27} <= rule.avoid_yogas  # Vyatipata & Vaidhriti
    assert "Vishti" in rule.avoid_karanas
    assert rule.block_dur_muhurta and not rule.day_kill_on_major_dosha  # slot-only
    assert rule.sankranti_buffer_hours == 6.0 and rule.major_sankranti_buffer_hours == 16.0
    assert rule.eclipse_pad_days == 1
    assert rule.lagnas == frozenset({2, 3, 5, 6, 8, 9, 11, 12})  # fixed + dual
    # Fallback widens the 8-star set to also admit Hasta(13)/Svati(15)/
    # Shravana(22)/Dhanishtha(23) when a year has < 12 days.
    assert rule.fallback_min_days == 12
    assert rule.fallback_nakshatras == rule.nakshatras | frozenset({13, 15, 22, 23})


def test_byaparik_business_opening_is_lenient_but_filtered():
    """Business opening: lenient (no Guru/Shukra udaya, Chaturmasa allowed,
    eclipse day only) but still filtered (yoga/karana/lagna/dur-muhurta)."""
    rule = CEREMONY_RULES["byaparik-pratisthan"]
    # Lenient side
    assert not rule.require_guru_udaya and not rule.require_shukra_udaya
    assert not rule.block_chaturmas
    assert rule.eclipse_pad_days == 1  # eclipse day only, not +-3
    # Still filtered
    assert {17, 27} <= rule.avoid_yogas  # Vyatipata & Vaidhriti
    assert "Vishti" in rule.avoid_karanas
    assert rule.block_dur_muhurta and not rule.day_kill_on_major_dosha  # slot-only
    assert rule.lagnas == frozenset({2, 3, 5, 6, 8, 9, 11, 12})  # fixed + dual
    assert rule.block_sankranti and rule.daytime_only
    assert rule.avoid_varas == frozenset({1, 3, 7})  # Mon/Wed/Thu/Fri only


def test_annaprasan_adds_universal_dosha_filters():
    """Annaprasan gains the standard doshas but keeps a broad lagna (age window
    already thins the practical set)."""
    rule = CEREMONY_RULES["annaprasan"]
    assert {17, 27} <= rule.avoid_yogas  # Vyatipata & Vaidhriti
    assert "Vishti" in rule.avoid_karanas
    assert rule.block_dur_muhurta and not rule.day_kill_on_major_dosha  # slot-only
    assert rule.eclipse_pad_days == 1
    assert rule.daytime_only
    assert rule.avoid_varas == frozenset({1, 3, 7})  # Mon/Wed/Thu/Fri only
    # Lagna kept broad: any except Mesha(1)/Vrishchika(8)/Mina(12).
    assert rule.lagnas == frozenset({2, 3, 4, 5, 6, 7, 9, 10, 11})
