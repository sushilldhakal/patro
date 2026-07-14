"""Tests for rule-based sait generation."""

from datetime import date

from engine.vedic.bikram_sambat import bs_to_gregorian
from engine.vedic.sait_rules import (
    DayPanchanga,
    agni_on_earth,
    build_day_panchanga,
    check_bratabandha,
    check_vivah,
    is_kharmas,
    is_rikta_tithi,
    rudra_on_earth,
)
from engine.astronomy.location import DEFAULT_LOCATION
from services.sait_generator import generate_sait_year_category


def _day(**overrides) -> DayPanchanga:
    """A clean, marriage-eligible day; override single fields per test."""
    base = dict(
        gregorian=date(2026, 2, 1),
        tithi_absolute=5,
        tithi_display=5,
        paksha="shukla",
        nakshatra=13,  # Hasta — a marriage nakshatra
        vaara=5,  # Thursday
        sun_rashi=11,
        sun_longitude=315.0,  # Kumbha — not Kharmas
        jupiter_combust=False,
        venus_combust=False,
        mercury_combust=False,
        lunar_month="Magh",  # a recognised vivah month
        is_adhik_maas=False,
        aayan="Uttarayana",
        mercury_quadrant=True,
        jupiter_quadrant=True,
    )
    base.update(overrides)
    return DayPanchanga(**base)


def test_rikta_tithis():
    assert is_rikta_tithi(4)
    assert is_rikta_tithi(9)
    assert is_rikta_tithi(14)
    assert not is_rikta_tithi(5)


def test_kharmas_sun_longitude():
    assert is_kharmas(250.0)
    assert is_kharmas(335.0)
    assert not is_kharmas(200.0)


def test_agni_rudra_vas_formulas():
    # Agni Vas on the absolute tithi (1-30): (tithi + vaara) % 4 in {2, 3} -> Earth.
    assert agni_on_earth(2, 4)  # (2+4)=6, 6%4=2 -> Earth (auspicious)
    assert not agni_on_earth(2, 3)  # (2+3)=5, 5%4=1 -> not Earth
    # Shiva Vas on the absolute tithi: (2*tithi + 5) % 7 in {1, 2, 3}
    # (Kailasa / Gauri / Nandi only — strict Muhurta Chintamani).
    assert rudra_on_earth(5)  # (10+5)=15, 15%7=1 -> Kailasa (auspicious)
    assert not rudra_on_earth(1)  # (2+5)=7, 7%7=0 -> Shmashana (inauspicious)
    assert not rudra_on_earth(7)  # (14+5)=19, 19%7=5 -> Bhojana (now excluded)
    assert not rudra_on_earth(30)  # Amavasya is always excluded


def test_build_day_panchanga_bs2083_sample():
    greg = bs_to_gregorian(2083, 1, 20)
    day = build_day_panchanga(greg, DEFAULT_LOCATION)
    assert day.tithi_absolute >= 1
    assert 1 <= day.nakshatra <= 27
    assert 1 <= day.vaara <= 7


def test_generate_vivah_produces_entries():
    by_month = generate_sait_year_category(2082, "vivah", DEFAULT_LOCATION)
    total_days = sum(len(days) for days in by_month.values())
    assert total_days > 0


def test_generate_agni_jurne_has_entries():
    by_month = generate_sait_year_category(2080, "agni-jurne", DEFAULT_LOCATION)
    assert by_month
    for key, days in by_month.items():
        assert key.isdigit()
        assert days


def test_vivah_accepts_clean_day():
    assert check_vivah(_day())


def test_vivah_rejects_adhik_maas():
    assert not check_vivah(_day(is_adhik_maas=True))


def test_vivah_rejects_chaturmas():
    # Shrawan is a Chaturmas lunar month — no marriages.
    assert not check_vivah(_day(lunar_month="Shrawan"))


def test_vivah_rejects_non_vivah_month():
    # Poush (Kharmas-adjacent) is not a recognised vivah month.
    assert not check_vivah(_day(lunar_month="Poush"))


def test_vivah_rejects_combust_guru_or_shukra():
    assert not check_vivah(_day(jupiter_combust=True))
    assert not check_vivah(_day(venus_combust=True))


def test_vivah_rejects_tuesday_and_rikta():
    assert not check_vivah(_day(vaara=3))  # Tuesday
    assert not check_vivah(_day(tithi_display=4))  # Rikta


def test_bratabandha_requires_uttarayana_and_shukla():
    assert check_bratabandha(_day(nakshatra=8))  # Pushya, Thursday, shukla
    assert not check_bratabandha(_day(nakshatra=8, aayan="Dakshinayana"))
    assert not check_bratabandha(_day(nakshatra=8, paksha="krishna"))


def test_engine_version_bumped():
    from services.sait_generator import SAIT_ENGINE_VERSION

    assert SAIT_ENGINE_VERSION == "3.9.0"


def test_shuddha_jestha_krishna_not_flagged_adhik_bs2083():
    """Regression: BS 2083 has an Adhik Jestha, but the Śuddha Jestha kṛṣṇa days
    that spill into Baiśākh 19–31 must NOT be tagged adhik (they carry the
    Samiti's vivāha dates). The true Adhik Jestha (śukla + its kṛṣṇa) stays adhik."""
    shuddha = build_day_panchanga(date(2026, 5, 5), DEFAULT_LOCATION)   # Jestha kṛṣṇa 3
    assert shuddha.lunar_month == "Jestha"
    assert shuddha.is_adhik_maas is False

    adhik = build_day_panchanga(date(2026, 5, 20), DEFAULT_LOCATION)    # Adhik Jestha śukla
    assert adhik.is_adhik_maas is True


def test_griha_pravesh_four_step_rule():
    from engine.vedic.sait_rules import check_griha_pravesh

    # A clean śuddha day: Baishakh, śukla Panchami, Rohini(4), Guru & Śukra udaya.
    ok = _day(lunar_month="Baishakh", paksha="shukla", tithi_display=5, nakshatra=4)
    assert check_griha_pravesh(ok)
    # Step 1 — Chaturmas / Poush / Adhik months rejected.
    assert not check_griha_pravesh(_day(lunar_month="Shrawan", nakshatra=4))
    assert not check_griha_pravesh(_day(lunar_month="Poush", nakshatra=4))
    assert not check_griha_pravesh(_day(lunar_month="Baishakh", nakshatra=4, is_adhik_maas=True))
    # Step 2 — growth tithis allowed in either paksha (apurva entry); rikta and
    # Dwadashi(12) still rejected regardless of paksha.
    assert check_griha_pravesh(
        _day(lunar_month="Baishakh", nakshatra=4, tithi_display=11, paksha="krishna")
    )
    assert not check_griha_pravesh(_day(lunar_month="Baishakh", nakshatra=4, tithi_display=4))
    assert not check_griha_pravesh(_day(lunar_month="Baishakh", nakshatra=4, tithi_display=12))
    # Step 3 — a non-fixed/gentle nakshatra (Hasta 13) rejected.
    assert not check_griha_pravesh(_day(lunar_month="Baishakh", nakshatra=13, tithi_display=5))
    # Step 4 — Guru or Śukra combust rejected.
    assert not check_griha_pravesh(_day(lunar_month="Baishakh", nakshatra=4, jupiter_combust=True))
    assert not check_griha_pravesh(_day(lunar_month="Baishakh", nakshatra=4, venus_combust=True))
