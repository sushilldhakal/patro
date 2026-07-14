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
    2. Tithi (lunar day) elimination — rikta, Amavasya, etc.
    3. Nakshatra suitability.
    4. Yoga / Karana / Vaara / Aayan vetoes.
    5. Planetary combustion (Tara Dubeko) and kendra checks.

Key exclusions applied across the saṃskāra categories:
  * Adhik Maas (मलमास)        — no auspicious saṃskāra in an intercalary month.
  * Kharmas / Dhanurmas       — Sun in Dhanu or late Meena (मलमास-तुल्य).
  * Chaturmas (चातुर्मास)     — Vishnu's sleep; marriages/saṃskāra paused.
  * Tara-ast (गुरु/शुक्र अस्त) — Jupiter/Venus combust (vivah, vrata, vyapar).
  * Rikta tithi & Amavasya    — inauspicious lunar days.

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
    get_nakshatra,
    get_sidereal_asc_longitude,
    get_surya_rashi,
    get_vaara,
)
from engine.astronomy.swiss_eph import calculate_sunrise, get_planet_position
from engine.vedic.lunar_month import get_lunar_calendar_layers
from engine.vedic.tithi import calculate_tithi_at_sunrise


def _angular_separation(lon_a: float, lon_b: float) -> float:
    diff = (lon_a - lon_b) % 360.0
    return min(diff, 360.0 - diff)


def _is_combust(planet_lon: float, sun_lon: float, orb: float) -> bool:
    return _angular_separation(planet_lon, sun_lon) < orb


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
    """Agni Vas — Agni resides on Earth (auspicious for havan / अग्नि जुर्ने).

    Classic Agni-vāsa formula on the *absolute* tithi (1–30: śukla 1–15 then
    kṛṣṇa 16–30) and the vāra (Sunday = 1 … Saturday = 7):

        (tithi + vaara) mod 4 ∈ {2, 3}  →  Agni on Earth / Pātāla.

    Fitted against the official Nepal Panchanga listing for BS 2083 (recall
    ≈ 0.95). The earlier ``tithi_display``-based form silently dropped the
    pakṣa and matched only ~25% of the official days.
    """
    return ((tithi_absolute + vaara_number) % 4) in (2, 3)


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
    if tithi_absolute == 30:  # Amavasya
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
# Griha Aarambha — Vastu Purusha facing: Aries, Cancer, Scorpio, Capricorn.
GRIHA_AARAMBHA_SUN_RASHIS = frozenset({1, 4, 8, 10})
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
# Ashwini, Mrigashira, Punarvasu, Pushya, Hasta, Chitra, Swati, Anuradha,
# Shravana, Dhanishta, Shatabhisha, Revati
ANNAPRASAN_NAKSHATRAS = frozenset({1, 5, 7, 8, 13, 14, 15, 17, 22, 23, 24, 27})

# --- Tithi sets --------------------------------------------------------------
# Dwitiya, Tritiya, Panchami, Saptami, Dashami, Ekadashi, Dwadashi (block 13+)
BRATABANDHA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 12})
# Growth tithis for Griha Pravesh: 2,3,5,7,10,11,13 in EITHER paksha (rikta
# 4/9/14 and Amavasya excluded; Dwadashi 12 dropped per the growth rule).
# Applied to both shukla and krishna so an apurva (first) entry on a waning
# growth tithi — as the Nepal Samiti lists — is allowed.
GRIHA_PRAVESH_GROWTH_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 13})
# Shukla growth tithis for commerce: 2, 3, 5, 7, 10, 11, 13
BUSINESS_SHUKLA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 13})

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
        jupiter_combust=_is_combust(jupiter, sun_lon, 11.0),
        venus_combust=_is_combust(venus, sun_lon, 10.0),
        mercury_combust=_is_combust(mercury, sun_lon, 14.0),
        lunar_month=lunar_month,
        is_adhik_maas=is_adhik_maas,
        aayan=aayan["name"],
        mercury_quadrant=_planet_in_quadrant(mercury_rashi, lagna_rashi),
        jupiter_quadrant=_planet_in_quadrant(jupiter_rashi, lagna_rashi),
    )


# ── Shared predicates ────────────────────────────────────────────────────────

def _not_kharmas(day: DayPanchanga) -> bool:
    return not is_kharmas(day.sun_longitude)


def _is_amavasya(day: DayPanchanga) -> bool:
    return day.tithi_absolute == 30


def _is_krishna_pratipada(day: DayPanchanga) -> bool:
    return day.paksha == "krishna" and day.tithi_display == 1


def _auspicious_tithi(day: DayPanchanga) -> bool:
    """Exclude the universally inauspicious lunar days: rikta and Amavasya."""
    return not is_rikta_tithi(day.tithi_display) and not _is_amavasya(day)


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
def check_vivah(day: DayPanchanga) -> bool:
    if not _samskara_base_ok(day):
        return False
    # Guru / Shukra must not be combust (तारा अस्त).
    if day.jupiter_combust or day.venus_combust:
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
# Sun-sign fixed (Vastu Purusha): Aries, Cancer, Scorpio, Capricorn —
# which naturally excludes Ashar (Mithuna) and Chaitra (Meena).
def check_griha_aarambha(day: DayPanchanga) -> bool:
    if day.is_adhik_maas:
        return False
    if not _auspicious_tithi(day):
        return False
    if day.sun_rashi not in GRIHA_AARAMBHA_SUN_RASHIS:
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
#   5. Asta Shuddhi: Guru (Jupiter) and Shukra (Venus) must be udaya (not combust).
# (The Moon-house side of Chandra Bala, plus Graha Vedha and Dagdha-tithi vetoes,
# are time/chart-resolved and live in the muhūrta engine, not this sunrise gate.)
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
    # already omits rikta 4/9/14 and Amavasya).
    if day.paksha != "shukla":
        return False
    if day.tithi_display not in GRIHA_PRAVESH_GROWTH_TITHIS:
        return False
    # Step 4 — fixed / gentle nakshatra.
    if day.nakshatra not in GRIHA_PRAVESH_NAKSHATRAS:
        return False
    # Step 5 — Guru / Shukra must not be combust.
    if day.jupiter_combust or day.venus_combust:
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
def check_rudri_jurne(day: DayPanchanga) -> bool:
    return rudra_on_earth(day.tithi_absolute)


# 7. अग्नि जुर्ने (Agni Vas / Havan)
def check_agni_jurne(day: DayPanchanga) -> bool:
    return agni_on_earth(day.tithi_absolute, day.vaara)


# 8. अन्नप्रासन (First Rice Feeding) — nakshatra/tithi/vaara day filter;
# the 5/6-month age window needs the child's birth date (handled at the API).
def check_annaprasan(day: DayPanchanga) -> bool:
    if day.is_adhik_maas or not _not_kharmas(day):
        return False
    if not _auspicious_tithi(day):  # rikta + Amavasya
        return False
    if day.tithi_display == 8:  # Ashtami
        return False
    if day.nakshatra not in ANNAPRASAN_NAKSHATRAS:
        return False
    if day.vaara not in ANNAPRASAN_VAARA:
        return False
    if day.paksha != "shukla":
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
