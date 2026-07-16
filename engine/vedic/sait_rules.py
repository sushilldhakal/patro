"""Rule-based auspicious-date (साइत) filters from sunrise panchanga.

These encode traditional Nepali muhurta rules well enough to serve as a
*computed fallback* when a year/category is not present in the curated
official listings (``rules/sait_dates_v1.json``). The curated data always
takes precedence — see :mod:`services.sait_api`. The goal here is to be
conservative and traditionally defensible (exclude what the shastra clearly
forbids) rather than to reproduce the Panchang Nirnayak Samiti list exactly,
which is partly hand-curated and cannot be derived algorithmically.

Every category is vetted through the core muhurta layers where they apply:

    1. Month gate — lunar (festival masa) for saṃskāra, or the Sun-sign /
       solar month where the shastra fixes it (e.g. Griha Aarambha / Pravesh).
    2. Tithi (lunar day) elimination — rikta, Aausi, etc.
    3. Nakshatra suitability.
    4. Yoga / Karana / Vaara / Aayan vetoes.
    5. Planetary combustion (Tara Dubeko) and kendra checks.

Key exclusions applied across the saṃskāra categories:
  * Adhik Maas (मलमास)        — no auspicious saṃskāra in an intercalary month.
  * Kharmas / Dhanurmas       — Sun in Dhanu or late Meena (मलमास-तुल्य).
  * Chaturmas (चातुर्मास)     — Vishnu's sleep; marriages/saṃskāra paused.
  * Tara-ast (गुरु/शुक्र अस्त) — Jupiter/Venus combust (vivah, vrata, vyapar).
  * Rikta tithi & Aausi    — inauspicious lunar days.

Nakshatra indices are 1-based (Ashwini = 1 … Revati = 27).
Sun rashi (solar month) indices are 1-based:
    1 Mesha=Baisakh, 2 Vrishabha=Jeth, 3 Mithuna=Ashadh, 4 Karka=Shrawan,
    5 Simha=Bhadra, 6 Kanya=Ashwin, 7 Tula=Kartik, 8 Vrishchika=Marga,
    9 Dhanu=Poush, 10 Makara=Magh, 11 Kumbha=Falgun, 12 Meena=Chaitra.
Vaara: Sunday = 1 … Saturday = 7.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.positions import (
    get_aayan,
    get_karana,
    get_nakshatra,
    get_sidereal_asc_longitude,
    get_surya_rashi,
    get_vaara,
    get_yoga,
)
from engine.astronomy.swiss_eph import calculate_sunrise, get_planet_position
from engine.vedic.lunar_month import get_lunar_calendar_layers
from engine.vedic.tithi import calculate_tithi_at_sunrise


def _angular_separation(lon_a: float, lon_b: float) -> float:
    diff = (lon_a - lon_b) % 360.0
    return min(diff, 360.0 - diff)


# Combustion (अस्त / astaṅgata) orbs — the planet is too close to the Sun to be
# seen and is treated as set. Guru/Śukra combust bars vivāha, vrata, vyāpāra.
JUPITER_COMBUST_ORB = 11.0
VENUS_COMBUST_ORB = 10.0
MERCURY_COMBUST_ORB = 14.0

# Bālya / Vārdhakya (बाल्य / वृद्ध) — a Guru/Śukra just *outside* combustion is
# either newly-risen (bāla, "child") after heliacal rising or about-to-set
# (vṛddha, "old") before heliacal setting: visible but weak, and classically
# rejected for marriage. The days-based śāstra rule is approximated here by an
# angular band immediately beyond the combustion orb.
JUPITER_BALA_VRIDDHA_ORB = 14.0
VENUS_BALA_VRIDDHA_ORB = 13.0

# Solar months (Sun rāśi, 1-based) in which marriage is permitted — Meṣa,
# Vṛṣabha, Mithuna, Vṛśchika, Makara, Kumbha. The classical method gates vivāha
# on the *solar* month first; combined with the lunar VIVAH_LUNAR_MONTHS gate,
# this drops the boundary days where the two reckonings disagree (e.g. a lunar
# Baiśākh day whose Sun is still in Mīna, or a lunar Aṣāḍha day whose Sun has
# already entered Karka and begun Chaturmāsa).
VIVAH_SUN_RASHIS = frozenset({1, 2, 3, 8, 10, 11})

# Simhastha Guru — Jupiter transiting Siṃha (Leo, rāśi 5). Many traditions bar
# marriage for the whole of this transit (the Siṃhastha-guru doṣa).
SIMHASTHA_GURU_RASHI = 5


def _is_combust(planet_lon: float, sun_lon: float, orb: float) -> bool:
    return _angular_separation(planet_lon, sun_lon) < orb


def _is_bala_vriddha(
    planet_lon: float, sun_lon: float, combust_orb: float, weak_orb: float
) -> bool:
    """True when the planet is outside combustion but still within the weak
    (bāla / vṛddha) band — i.e. ``combust_orb ≤ separation < weak_orb``."""
    sep = _angular_separation(planet_lon, sun_lon)
    return combust_orb <= sep < weak_orb


def _planet_in_quadrant(planet_rashi: int, lagna_rashi: int) -> bool:
    """Whole-sign house; quadrants are kendras 1, 4, 7, 10."""
    house = ((planet_rashi - lagna_rashi) % 12) + 1
    return house in (1, 4, 7, 10)


def is_kharmas(sun_longitude: float) -> bool:
    """Sun in Dhanu (240–270°) or late Meena (330–360°)."""
    return (240.0 <= sun_longitude < 270.0) or (330.0 <= sun_longitude < 360.0)


def is_rikta_tithi(display_tithi: int) -> bool:
    """Rikta tithis — 4 (Chaturthi), 9 (Navami), 14 (Chaturdashi)."""
    return display_tithi in (4, 9, 14)


def agni_on_earth(tithi_absolute: int, vaara_number: int) -> bool:
    """Agni Vāsa — True only when Agni resides on Earth (Bhūmi), the sole abode
    auspicious for a havan / अग्नि जुर्ने.

    Muhūrta Chintāmaṇi 2.36, on the *absolute* tithi (1–30: śukla 1–15 then
    kṛṣṇa 16–30) and the vāra (Sunday = 1 … Saturday = 7):

        (tithi + vāra + 1) mod 4 →
            0 · Bhūmi  (Earth)  → auspicious (happiness / success)
            3 · Bhūmi  (Earth)  → auspicious
            1 · Svarga (Heaven) → avoid (prāṇa-nāśa, loss of life)
            2 · Pātāla (nether) → avoid (artha-nāśa, loss of wealth)

    Only the two Bhūmi remainders {0, 3} qualify. This is the exact verse form;
    it selects the same days as the earlier ``(tithi + vāra) mod 4 ∈ {2, 3}``
    (algebraically identical, since (T+V+1) shifts the remainder by one) but now
    labels each abode correctly instead of lumping Pātāla in with Earth.
    """
    return ((tithi_absolute + vaara_number + 1) % 4) in (0, 3)


# The two great inauspicious yogas (Muhūrta Chintāmaṇi 1.34) and the malefic
# Viṣṭi (Bhadrā) karaṇa, all barred for sacrificial rites such as a homa.
# Yoga numbers are 1-based (Vyatipata = 17, Vaidhriti = 27); Viṣṭi is the 7th
# of the repeating movable karaṇas.
VYATIPATA_YOGA = 17
VAIDHRITI_YOGA = 27
SACRIFICIAL_AVOID_YOGAS = frozenset({VYATIPATA_YOGA, VAIDHRITI_YOGA})
VISHTI_KARANA = "Vishti"


def rudra_on_earth(tithi_absolute: int) -> bool:
    """Śiva Vāsa — Rudra Abhiṣeka is auspicious only where Śiva resides well.

    Classic Śiva-vāsa shloka on the *absolute* tithi (1–30):

        (2 × tithi + 5) mod 7 →
            1 Kailāsa · 2 Gaurī · 3 Vṛṣabha (Nandi)   → auspicious
            4 Sabhā · 5 Bhojana · 6 Krīḍā · 0 Śmaśāna → avoid

    Per Muhūrta Chintāmaṇi only Kailāsa/Gaurī/Nandi (remainders {1,2,3}) are
    auspicious; Amāvasyā (30) is excluded. (Note: this is stricter than the
    Nepal Samiti's own published rudri list, which also lists Bhojana days —
    by explicit choice we follow the shastra rule for computed years, while
    curated official data still takes precedence where it exists.)
    """
    if tithi_absolute == 30:  # Aausi
        return False
    return (((2 * tithi_absolute) + 5) % 7) in (1, 2, 3)


# --- Lunar (festival masa) month sets ----------------------------------------
# Chaturmas: the four lunar months between Devshayani (Ashadh Shukla 11) and
# Haribodhini (Kartik Shukla 11) Ekadashi, during which Vishnu sleeps and
# marriages / saṃskāra are paused.
CHATURMAS_LUNAR_MONTHS = frozenset({"Shrawan", "Bhadra", "Ashwin", "Kartik"})

# Lunar months in which each saṃskāra is traditionally performed in Nepal.
VIVAH_LUNAR_MONTHS = frozenset(
    {"Mangsir", "Magh", "Falgun", "Baishakh", "Jestha", "Ashadh"}
)
BRATABANDHA_LUNAR_MONTHS = frozenset(
    {"Mangsir", "Magh", "Falgun", "Baishakh", "Jestha"}
)
# Griha Pravesh (house-warming) — the six lunar months the shastra permits:
# Magh, Falgun, Chaitra, Baishakh, Jestha, Mangsir. This discards Chaturmas
# (Ashadh/Shrawan/Bhadra/Ashwin), Poush, Kartik, and — via the adhik gate — any
# intercalary (Adhik) month, keeping only the śuddha (nija) reckoning.
GRIHA_PRAVESH_LUNAR_MONTHS = frozenset(
    {"Magh", "Falgun", "Chaitra", "Baishakh", "Jestha", "Mangsir"}
)

# --- Solar months (Sun rashi) where the shastra fixes the Sun-sign -----------
# Griha Aarambha (Muhūrta Chintāmaṇi): Meṣa, Vṛṣabha, Siṃha, Vṛśchika, Makara,
# Kumbha (1,2,5,8,10,11).
GRIHA_AARAMBHA_SUN_RASHIS = frozenset({1, 2, 5, 8, 10, 11})
# (Griha Pravesh is gated by lunar month, not Sun-sign — see
# GRIHA_PRAVESH_LUNAR_MONTHS above.)
# Surya Bala — Griha Pravesh is banned when the Sun (a Malamas/Kharmas-like
# weakness) is in Mithuna (3), Vrishchika (8), or Meena (12).
GRIHA_PRAVESH_MALAMAS_RASHIS = frozenset({3, 8, 12})

# --- Nakshatra sets (1-based) ------------------------------------------------
# Rohini, Mrigashira, Magha, U.Phalguni, Hasta, Swati, Anuradha, Mula,
# P.Ashadha, U.Ashadha, U.Bhadrapada, Revati
MARRIAGE_NAKSHATRAS = frozenset({4, 5, 10, 12, 13, 15, 17, 19, 20, 21, 26, 27})
# Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, U.Phalguni, Hasta, Chitra,
# Swati, Anuradha, U.Ashadha, Shravana, Dhanishta, Shatabhisha, U.Bhadrapada, Revati
BRATABANDHA_NAKSHATRAS = frozenset(
    {1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27}
)
# Rohini, Mrigashira, Pushya, U.Phalguni, Hasta, Chitra, Swati, Anuradha,
# U.Ashadha, Shravana, Dhanishta, U.Bhadrapada
GRIHA_AARAMBHA_NAKSHATRAS = frozenset({4, 5, 8, 12, 13, 14, 15, 17, 21, 22, 23, 26})
# Griha Pravesh — Sthira (fixed) + Chara/Mridu (gentle) nakshatras only:
# Rohini(4), Mrigashira(5), U.Phalguni(12), Chitra(14), Anuradha(17),
# U.Ashadha(21), U.Bhadrapada(26), Revati(27).
GRIHA_PRAVESH_NAKSHATRAS = frozenset({4, 5, 12, 14, 17, 21, 26, 27})
# Ashwini, Rohini, Mrigashira, Pushya, U.Phalguni, Hasta, Chitra, Anuradha,
# U.Ashadha, Shravana, Dhanishta, Revati
BUSINESS_NAKSHATRAS = frozenset({1, 4, 5, 8, 12, 13, 14, 17, 21, 22, 23, 27})
# Annaprasan (Muhūrta Chintāmaṇi 5.16) — the 16 Mṛdu/Laghu/Chara/Sthira stars:
# Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, U.Phalguni, Hasta, Chitra,
# Swati, Anuradha, U.Ashadha, Shravana, Dhanishta, Shatabhisha, U.Bhadrapada,
# Revati. (Kept in sync with muhurta_engine.ANNAPRASAN_MUHURTA_NAKSHATRAS.)
ANNAPRASAN_NAKSHATRAS = frozenset({1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27})

# --- Tithi sets --------------------------------------------------------------
# Dwitiya, Tritiya, Panchami, Saptami, Dashami, Ekadashi, Dwadashi (block 13+)
BRATABANDHA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 12})
# Growth tithis for Griha Pravesh: 2,3,5,7,10,11,13 (rikta 4/9/14 and Aausi
# excluded; Dwadashi 12 dropped per the growth rule). Combined with the rule's
# shukla-only gate, only waxing growth tithis qualify.
GRIHA_PRAVESH_GROWTH_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 13})
# Shukla growth tithis for commerce: 2, 3, 5, 7, 10, 11, 13
BUSINESS_SHUKLA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 13})
# Annaprasan śubha tithis (Muhūrta Chintāmaṇi 5.16), by pakṣa. Bars Nanda
# (1/6/11), rikta (4/9/14), Aṣṭamī and Dvādaśī; Pūrṇimā (śukla 15) is allowed,
# Amāvasyā (kṛṣṇa 15) is not. (Kept in sync with the muhurta engine's sets.)
ANNAPRASAN_SHUKLA_TITHIS = frozenset({2, 3, 5, 7, 10, 13, 15})
ANNAPRASAN_KRISHNA_TITHIS = frozenset({2, 3, 5, 7, 10, 13})

# --- Dagdha & Shunya tithis --------------------------------------------------
# Dagdha ("burnt") — a weekday × display-tithi clash that scorches the day. Vaara
# is Sunday = 1 … Saturday = 7; the tithi is the display number (1–15), and the
# clash applies identically in both Shukla and Krishna paksha.
DAGDHA_TITHI_BY_VAARA: dict[int, int] = {
    1: 12,  # Sunday    — Dwadashi
    2: 11,  # Monday    — Ekadashi
    3: 5,   # Tuesday   — Panchami
    4: 3,   # Wednesday — Tritiya
    5: 6,   # Thursday  — Shashthi
    6: 8,   # Friday    — Ashtami
    7: 9,   # Saturday  — Navami
}


def is_dagdha(vaara: int, display_tithi: int) -> bool:
    """True when the weekday × tithi combination is a burnt (Dagdha) day."""
    return DAGDHA_TITHI_BY_VAARA.get(vaara) == display_tithi


# Shunya ("empty/void") — a display tithi drains specific rashis of their light.
# If the Moon's transit rashi (or the house's ruling sign) falls in the drained
# set, the day is void. Rashis are 1-based: Mesha = 1 … Meena = 12.
SHUNYA_TITHI_RASHIS: dict[int, frozenset[int]] = {
    1:  frozenset({7, 10}),   # Pratipada  — Tula, Makara
    2:  frozenset({9, 12}),   # Dwitiya    — Dhanu, Meena
    3:  frozenset({5, 10}),   # Tritiya    — Simha, Makara
    5:  frozenset({3, 6}),    # Panchami   — Mithuna, Kanya
    7:  frozenset({4, 9}),    # Saptami    — Karka, Dhanu
    9:  frozenset({4, 5}),    # Navami     — Karka, Simha
    11: frozenset({9, 12}),   # Ekadashi   — Dhanu, Meena
    13: frozenset({2, 12}),   # Trayodashi — Vrishabha, Meena
}


# --- Weekdays (Sunday = 1 … Saturday = 7) ------------------------------------
VIVAH_VAARA = frozenset({1, 2, 4, 5, 6})  # avoid Tue, Sat
BRATABANDHA_VAARA = frozenset({2, 4, 5, 6})  # Mon, Wed, Thu, Fri
GRIHA_VAARA = frozenset({2, 4, 5, 6})  # Mon, Wed, Thu, Fri
BUSINESS_VAARA = frozenset({2, 4, 5, 6})  # Mon, Wed, Thu, Fri — avoid Tue, Sat
ANNAPRASAN_VAARA = frozenset({2, 4, 5, 6})  # Mon, Wed, Thu, Fri


@dataclass(frozen=True)
class DayPanchanga:
    gregorian: date
    tithi_absolute: int
    tithi_display: int
    paksha: str
    nakshatra: int
    vaara: int
    sun_rashi: int
    sun_longitude: float
    jupiter_combust: bool
    venus_combust: bool
    mercury_combust: bool
    lunar_month: str | None
    is_adhik_maas: bool
    aayan: str
    mercury_quadrant: bool
    jupiter_quadrant: bool
    # Appended with defaults so existing keyword constructions stay valid.
    jupiter_rashi: int = 0  # 1-based; used for the Simhastha-guru veto
    jupiter_bala_vriddha: bool = False  # Guru newly-risen / about-to-set (weak)
    venus_bala_vriddha: bool = False  # Śukra newly-risen / about-to-set (weak)
    yoga: int = 0  # 1-based yoga at sunrise; Vyatipata=17, Vaidhriti=27
    karana: str = ""  # karaṇa name at sunrise; Viṣṭi (Bhadrā) is barred


def build_day_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> DayPanchanga:
    sunrise_utc = calculate_sunrise(
        target,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    tithi_info = calculate_tithi_at_sunrise(target, location)
    nak_num, _, _ = get_nakshatra(sunrise_utc)
    vaara_num, _, _ = get_vaara(sunrise_utc, location.timezone)
    surya = get_surya_rashi(sunrise_utc)
    aayan = get_aayan(sunrise_utc)
    yoga_num, _, _ = get_yoga(sunrise_utc)
    _, karana_name = get_karana(sunrise_utc)

    sun_lon = surya["longitude"]
    jupiter = get_planet_position(sunrise_utc, "jupiter")["longitude"]
    venus = get_planet_position(sunrise_utc, "venus")["longitude"]
    mercury = get_planet_position(sunrise_utc, "mercury")["longitude"]

    asc_lon = get_sidereal_asc_longitude(
        sunrise_utc, lat=location.lat, lon=location.lon,
    )
    lagna_rashi = int(asc_lon / 30) % 12 + 1
    jupiter_rashi = int(jupiter / 30) % 12 + 1
    mercury_rashi = int(mercury / 30) % 12 + 1

    # Use the pakṣa-resolved pūrṇimānta layer, not the coarse `festival_masa`
    # one: only this layer splits an Adhik Māsa correctly. Without it the śuddha
    # (nija) pakṣa of an adhik year — e.g. Śuddha Jyeṣṭha kṛṣṇa in BS 2083, which
    # spills into Baiśākh 19–31 — is wrongly tagged adhik and every saṃskāra there
    # gets dropped. On non-adhik years the two layers are identical.
    lunar_layers = get_lunar_calendar_layers(target, tithi_info["paksha"])
    purnimanta = lunar_layers.get("purnimant") or {}
    lunar_month = purnimanta.get("name")
    is_adhik_maas = bool(purnimanta.get("is_adhik"))

    return DayPanchanga(
        gregorian=target,
        tithi_absolute=tithi_info["number"],
        tithi_display=tithi_info["display_number"],
        paksha=tithi_info["paksha"],
        nakshatra=nak_num,
        vaara=vaara_num + 1,  # Sunday = 1 … Saturday = 7
        sun_rashi=surya["number"],
        sun_longitude=sun_lon,
        jupiter_combust=_is_combust(jupiter, sun_lon, JUPITER_COMBUST_ORB),
        venus_combust=_is_combust(venus, sun_lon, VENUS_COMBUST_ORB),
        mercury_combust=_is_combust(mercury, sun_lon, MERCURY_COMBUST_ORB),
        lunar_month=lunar_month,
        is_adhik_maas=is_adhik_maas,
        aayan=aayan["name"],
        mercury_quadrant=_planet_in_quadrant(mercury_rashi, lagna_rashi),
        jupiter_quadrant=_planet_in_quadrant(jupiter_rashi, lagna_rashi),
        jupiter_rashi=jupiter_rashi,
        jupiter_bala_vriddha=_is_bala_vriddha(
            jupiter, sun_lon, JUPITER_COMBUST_ORB, JUPITER_BALA_VRIDDHA_ORB
        ),
        venus_bala_vriddha=_is_bala_vriddha(
            venus, sun_lon, VENUS_COMBUST_ORB, VENUS_BALA_VRIDDHA_ORB
        ),
        yoga=yoga_num,
        karana=karana_name,
    )


# ── Shared predicates ────────────────────────────────────────────────────────

def _not_kharmas(day: DayPanchanga) -> bool:
    return not is_kharmas(day.sun_longitude)


def _is_Aausi(day: DayPanchanga) -> bool:
    return day.tithi_absolute == 30


def _is_krishna_pratipada(day: DayPanchanga) -> bool:
    return day.paksha == "krishna" and day.tithi_display == 1


def _auspicious_tithi(day: DayPanchanga) -> bool:
    """Exclude the universally inauspicious lunar days: rikta and Aausi."""
    return not is_rikta_tithi(day.tithi_display) and not _is_Aausi(day)


def _in_chaturmas(day: DayPanchanga) -> bool:
    return day.lunar_month in CHATURMAS_LUNAR_MONTHS


def _samskara_base_ok(day: DayPanchanga) -> bool:
    """Common gate for life-cycle saṃskāra: no Malmas, no Kharmas, clean tithi."""
    if day.is_adhik_maas:
        return False
    if not _not_kharmas(day):
        return False
    return _auspicious_tithi(day)


# ── Category checks ──────────────────────────────────────────────────────────

# 1. विवाह (Marriage)
# (Kṣaya-pakṣa — a fortnight that loses a tithi — is a whole-fortnight veto that
# needs the observer + neighbouring days, so it lives in the time-resolved
# muhūrta engine, not this single-day sunrise gate.)
def check_vivah(day: DayPanchanga) -> bool:
    if not _samskara_base_ok(day):
        return False
    # Solar-month (Sun-sign) gate — the classical method fixes vivāha on the Sun's
    # rāśi first (Meṣa/Vṛṣabha/Mithuna/Vṛśchika/Makara/Kumbha).
    if day.sun_rashi not in VIVAH_SUN_RASHIS:
        return False
    # Simhastha Guru — no marriage while Jupiter transits Siṃha (Leo).
    if day.jupiter_rashi == SIMHASTHA_GURU_RASHI:
        return False
    # Guru / Shukra must be udaya — neither combust (तारा अस्त) nor bāla / vṛddha
    # (newly-risen or about-to-set, and so weak).
    if day.jupiter_combust or day.venus_combust:
        return False
    if day.jupiter_bala_vriddha or day.venus_bala_vriddha:
        return False
    # No marriages during Chaturmas, or outside the recognised vivah months.
    if _in_chaturmas(day) or day.lunar_month not in VIVAH_LUNAR_MONTHS:
        return False
    if day.nakshatra not in MARRIAGE_NAKSHATRAS:
        return False
    if day.vaara not in VIVAH_VAARA:
        return False
    if _is_krishna_pratipada(day):
        return False
    return True


# 2. व्रतबन्ध (Upanayana / Sacred Thread)
def check_bratabandha(day: DayPanchanga) -> bool:
    if not _samskara_base_ok(day):
        return False
    # Upanayana is an Uttarayana saṃskāra; Guru should not be combust.
    if day.aayan != "Uttarayana":
        return False
    if day.jupiter_combust:
        return False
    if _in_chaturmas(day) or day.lunar_month not in BRATABANDHA_LUNAR_MONTHS:
        return False
    if day.nakshatra not in BRATABANDHA_NAKSHATRAS:
        return False
    if day.vaara not in BRATABANDHA_VAARA:
        return False
    # Shukla paksha is strongly preferred for vrata-bandha.
    if day.paksha != "shukla":
        return False
    if day.tithi_display not in BRATABANDHA_TITHIS:
        return False
    return True


# 3. गृह आरम्भ (Foundation Laying / Bhumi Pujan)
# Sun-sign (Muhūrta Chintāmaṇi): Meṣa, Vṛṣabha, Siṃha, Vṛśchika, Makara, Kumbha.
def check_griha_aarambha(day: DayPanchanga) -> bool:
    if day.is_adhik_maas:
        return False
    if not _auspicious_tithi(day):
        return False
    if day.sun_rashi not in GRIHA_AARAMBHA_SUN_RASHIS:
        return False
    # Guru & Śukra must be udaya — neither combust nor bāla/vṛddha (Dharma Sindhu
    # applies the ast/bāla/vṛddha bar to vāstu karma).
    if day.jupiter_combust or day.venus_combust:
        return False
    if day.jupiter_bala_vriddha or day.venus_bala_vriddha:
        return False
    if day.nakshatra not in GRIHA_AARAMBHA_NAKSHATRAS:
        return False
    if day.vaara not in GRIHA_VAARA:
        return False
    return True


# 4. गृह प्रवेश (House Warming) — shastra filter:
#   1. Month: only the six permitted lunar months; never Adhik Maas / Chaturmas.
#   2. Surya Bala: Sun not in Mithuna/Vrishchika/Meena (Malamas).
#   3. Chandra Bala: waxing (Shukla) growth tithis only — 2,3,5,7,10,11,13.
#   4. Nakshatra: Sthira (fixed) + Chara/Mridu (gentle) only.
#   5. Asta Shuddhi: Guru (Jupiter) and Shukra (Venus) must be udaya — neither
#      combust nor bāla/vṛddha (Dharma Sindhu applies this to vāstu karma).
#   6. Dagdha: reject a burnt weekday × tithi clash.
# (The Moon-house side of Chandra Bala, Graha Vedha, and the Shunya-tithi veto are
# time/chart-resolved and live in the muhūrta engine, not this sunrise gate.)
def check_griha_pravesh(day: DayPanchanga, *, apurva: bool = True) -> bool:
    # Step 1 — month alignment (śuddha months only; the adhik flag comes from the
    # pakṣa-resolved layer, so Śuddha Jyeṣṭha is correctly allowed).
    if day.is_adhik_maas:
        return False
    if day.lunar_month not in GRIHA_PRAVESH_LUNAR_MONTHS:
        return False
    # Step 2 — Surya Bala.
    if day.sun_rashi in GRIHA_PRAVESH_MALAMAS_RASHIS:
        return False
    # Step 3 — Chandra Bala: strictly Shukla paksha, growth tithis only (the set
    # already omits rikta 4/9/14 and Aausi).
    if day.paksha != "shukla":
        return False
    if day.tithi_display not in GRIHA_PRAVESH_GROWTH_TITHIS:
        return False
    # Step 4 — fixed / gentle nakshatra.
    if day.nakshatra not in GRIHA_PRAVESH_NAKSHATRAS:
        return False
    # Step 5 — Guru / Shukra must not be combust, bāla or vṛddha.
    if day.jupiter_combust or day.venus_combust:
        return False
    if day.jupiter_bala_vriddha or day.venus_bala_vriddha:
        return False
    # Step 6 — Dagdha: reject a burnt weekday × tithi clash. (Shunya — which needs
    # the Moon's rashi — is applied in the time-resolved muhūrta engine.)
    if is_dagdha(day.vaara, day.tithi_display):
        return False
    return True


# 5. व्यापारिक प्रतिष्ठान (Business / Shop Inauguration)
def check_byaparik_pratisthan(day: DayPanchanga) -> bool:
    if day.is_adhik_maas or not _not_kharmas(day):
        return False
    if not _auspicious_tithi(day):
        return False
    # Trade favours Budha/Guru strength: neither should be combust, and at
    # least one of them should occupy a kendra (quadrant) from the lagna.
    if day.jupiter_combust or day.mercury_combust:
        return False
    if not (day.mercury_quadrant or day.jupiter_quadrant):
        return False
    if day.vaara not in BUSINESS_VAARA:
        return False
    if day.nakshatra not in BUSINESS_NAKSHATRAS:
        return False
    if day.paksha != "shukla":
        return False
    if day.tithi_display not in BUSINESS_SHUKLA_TITHIS:
        return False
    return True


# 6. रुद्री जुर्ने (Rudra Abhishekam / Shiva Puja)
# Rudri is a Rudrābhiṣeka + homa, so both the deity's abode (Śiva-vāsa) and the
# fire's abode (Agni-vāsa) must be favourable, and the universal sacrificial
# doṣas (Vyatipāta/Vaidhṛti yoga, Viṣṭi karaṇa) are scrubbed.
#   1. Śiva-vāsa — (2×tithi+5) mod 7 ∈ {1,2,3} (Kailāsa/Gaurī/Nandi); Amāvasyā out.
#   2. Agni-vāsa — fire on Earth (Bhūmi) to receive the oblation ((T+V+1) mod 4 ∈ {0,3}).
#   3. Reject Vyatipāta / Vaidhṛti yoga and Viṣṭi (Bhadrā) karaṇa.
# (Ashtami/Chaturdashi tithi and the Śrāvaṇa/Kārtika months are traditionally
# *preferred*, and Chandra/Tārā Bala is native-specific — these rank days rather
# than gate them, so they are not applied to the year-wide listing.)
def check_rudri_jurne(day: DayPanchanga) -> bool:
    if not rudra_on_earth(day.tithi_absolute):
        return False
    if not agni_on_earth(day.tithi_absolute, day.vaara):
        return False
    if day.yoga in SACRIFICIAL_AVOID_YOGAS:
        return False
    if day.karana == VISHTI_KARANA:
        return False
    return True


# 7. अग्नि जुर्ने (Agni Vas / Havan)
def check_agni_jurne(day: DayPanchanga) -> bool:
    return agni_on_earth(day.tithi_absolute, day.vaara)


# 8. अन्नप्रासन (First Rice Feeding) — nakshatra/tithi/vaara day filter per
# Muhūrta Chintāmaṇi 5.16. The month/age window and full lagna-śuddhi (5.17)
# need the child's birth date and are handled at the API / muhūrta layer.
# (Annaprasan is a MUHURTA_CATEGORY, so live generation runs through the
# muhūrta engine; this sunrise checker is the day-level fallback, kept faithful
# to the same verse so the two never diverge.)
def check_annaprasan(day: DayPanchanga) -> bool:
    if day.is_adhik_maas or not _not_kharmas(day):
        return False
    # MC 5.16 tithi set — bars Nanda (1/6/11), rikta (4/9/14), Aṣṭamī, Dvādaśī
    # and Amāvasyā; Pūrṇimā allowed in śukla only.
    allowed_tithis = (
        ANNAPRASAN_SHUKLA_TITHIS if day.paksha == "shukla"
        else ANNAPRASAN_KRISHNA_TITHIS
    )
    if day.tithi_display not in allowed_tithis:
        return False
    if day.nakshatra not in ANNAPRASAN_NAKSHATRAS:
        return False
    if day.vaara not in ANNAPRASAN_VAARA:
        return False
    return True


CATEGORY_CHECKS = {
    "vivah": check_vivah,
    "bratabandha": check_bratabandha,
    "griha-aarambha": check_griha_aarambha,
    "griha-pravesh": lambda d: check_griha_pravesh(d, apurva=True),
    "byaparik-pratisthan": check_byaparik_pratisthan,
    "agni-jurne": check_agni_jurne,
    "rudri-jurne": check_rudri_jurne,
    "annaprasan": check_annaprasan,
}
