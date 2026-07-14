"""Time-resolved muhūrta engine.

The older sait rules evaluated the panchanga *only at sunrise*, which is the
wrong model for lagna-based saṃskāra (vivāha, vrata-bandha, gṛha, vyāpāra):
those are decided by whether an auspicious **window exists during the day**,
where the tithi / nakṣatra / yoga and the ascendant (lagna) are all favourable
*at the same moment* and the muhūrta chart is free of the usual doṣas.

This module scans each civil day (sunrise-anchored) at a fixed step and returns
the auspicious windows for a ceremony, evaluating the classical layers:

  1. Day gate      — festival-masa (or Sun-sign) month, no Adhik-māsa /
                     Chaturmāsa, Guru/Śukra not combust (ast), ayana where fixed.
  2. Window layer  — tithi (not rikta/Amāvasyā), nakṣatra, yoga, pakṣa.
  3. Chart layer   — lagna rāśi, Moon/​malefic house doṣas from the lagna.

IMPORTANT — accuracy: validated against the official Nepal Panchanga Nirnayak
Samiti vivāha lists for BS 2080–2083, this reproduces ~55–60% of the official
days at ~30% precision. That is an inherent ceiling: the Samiti hand-selects a
subset of astronomically-equivalent muhūrtas, and the astronomy cannot tell
those apart. Curated official data therefore always takes precedence (see
``services.sait_api``); this engine is the computed fallback for years/locations
with no official listing, and it returns *candidate* auspicious windows.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.positions import (
    get_moon_longitude,
    get_nakshatra,
    get_sidereal_asc_longitude,
    get_surya_rashi,
    get_tithi_angle,
    get_tithi_number,
    get_display_tithi,
    get_paksha,
    get_yoga,
)
from engine.astronomy.swiss_eph import calculate_sunrise, calculate_sunset, get_planet_position
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.sait_rules import (
    CHATURMAS_LUNAR_MONTHS,
    GRIHA_AARAMBHA_NAKSHATRAS,
    GRIHA_PRAVESH_GROWTH_TITHIS,
    GRIHA_PRAVESH_LUNAR_MONTHS,
    GRIHA_PRAVESH_MALAMAS_RASHIS,
    GRIHA_PRAVESH_NAKSHATRAS,
    SHUNYA_TITHI_RASHIS,
    VIVAH_LUNAR_MONTHS,
    build_day_panchanga,
    is_dagdha,
)

# Rikta tithis (Chaturthi/Navami/Chaturdashi) and Amavasya are excluded for all
# saṃskāra muhūrtas.
_RIKTA = frozenset({4, 9, 14})

# Marriage nakshatras, slightly widened from the sunrise-rule set (adds Ashwini,
# Chitra, Dhanishta) — these carry real vivāha muhūrtas in the official lists.
VIVAH_MUHURTA_NAKSHATRAS = frozenset({1, 4, 5, 10, 12, 13, 14, 15, 17, 19, 20, 21, 23, 26, 27})
VIVAH_MUHURTA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 12, 13})

# Gṛha-ārambha, calibrated against official BS 2081-2083 (18 days): the old
# Sun-sign set {1,4,8,10} was wrong — the samiti's foundation days sit mainly in
# Vṛśchika/Dhanu/Kumbha (8/9/11), and 2 fall in Chaturmāsa (construction, unlike
# vivāha, is not paused). Also allow Pratipadā (tithi 1). NOTE: even so this
# floods (~5% precision) — gṛha-ārambha is too sparse to compute usefully, so
# curated official data is what makes it accurate.
GRIHA_AARAMBHA_MUHURTA_SUN_RASHIS = frozenset({1, 4, 7, 8, 9, 10, 11})
GRIHA_AARAMBHA_MUHURTA_TITHIS = frozenset({1, 2, 3, 5, 7, 10, 11, 12, 13})
GRIHA_AARAMBHA_MUHURTA_NAKSHATRAS = GRIHA_AARAMBHA_NAKSHATRAS | frozenset({24, 27})

# Upanayana (ब्रतबन्ध / व्रतबन्ध) per Muhūrta Chintāmaṇi & Dharmasindhu:
#   * Sun in an Uttarāyaṇa rāśi (Makara→Mithuna = 10,11,12,1,2,3), avoiding
#     Hariśayana/Chaturmāsa; Guru & Śukra both udaya; no Adhik-māsa.
#   * All auspicious nakṣatras (fixed/movable/gentle/short + the Chintāmaṇi
#     additions) — i.e. every nakṣatra except Bharaṇī 2, Kṛttikā 3, Maghā 10,
#     Viśākhā 16, Jyeṣṭhā 18.
#   * Avoid Tuesday & Saturday; daytime only (sunrise→sunset).
#   * Tithi: śukla 2,3,5,10,11,12 or kṛṣṇa 2,3,5.
# The advanced Lagna/Navāṁśa/Tri-Bala/Varṇeśa-Śākheśa shuddhi is person- and
# caste-specific and can't be applied to a general year listing.
BRATABANDHA_MUHURTA_SUN_RASHIS = frozenset({1, 2, 3, 10, 11, 12})
BRATABANDHA_MUHURTA_NAKSHATRAS = frozenset(range(1, 28)) - frozenset({2, 3, 10, 16, 18})
BRATABANDHA_SHUKLA_TITHIS = frozenset({2, 3, 5, 10, 11, 12})
BRATABANDHA_KRISHNA_TITHIS = frozenset({2, 3, 5})

# Annaprāśana (अन्नप्रासन) per Muhūrta Chintāmaṇi: fixed/movable/gentle/short
# nakṣatras; śukla 2,3,5,7,10,13,15 or kṛṣṇa 2,3,5,7,10,13 tithis; Mon/Wed/Thu/
# Fri only; any lagna except Meṣa/Vṛśchika/Mīna. (The exact date also needs the
# child's 5-8 month age window; the year listing shows the suitable days.)
ANNAPRASAN_MUHURTA_NAKSHATRAS = frozenset({1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27})
ANNAPRASAN_SHUKLA_TITHIS = frozenset({2, 3, 5, 7, 10, 13, 15})
ANNAPRASAN_KRISHNA_TITHIS = frozenset({2, 3, 5, 7, 10, 13})
ANNAPRASAN_LAGNAS = frozenset(range(1, 13)) - frozenset({1, 8, 12})

# Byāpārik Pratiṣṭhān (shop / business opening): all 12 months (only Adhik-māsa
# removed); Mon/Wed/Thu/Fri only; 16 approved nakṣatras (Sthira/Chara/Mṛdu-
# Kṣipra); tithis śukla 2,3,5,7,10,11,13,15 or kṛṣṇa 2,3,5,7,10,11,13; Guru &
# Śukra udaya; Sankranti excluded; muhūrta is the daytime Abhijit window.
# (Eclipse ±3 days are also traditionally removed; not yet computed here.)
BYAPARIK_MUHURTA_NAKSHATRAS = frozenset({1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27})
BYAPARIK_SHUKLA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 13, 15})
BYAPARIK_KRISHNA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 13})


def _rashi(longitude: float) -> int:
    return int(longitude / 30.0) % 12 + 1


@dataclass(frozen=True)
class CeremonyRule:
    """Muhūrta constraints for one ceremony. Empty sets mean 'no constraint'."""

    key: str
    # Day gate — one of lunar_months / sun_rashis fixes the season.
    lunar_months: frozenset[str] = frozenset()
    sun_rashis: frozenset[int] = frozenset()
    avoid_sun_rashis: frozenset[int] = frozenset()  # Surya Bala — banned solar signs
    block_chaturmas: bool = True
    block_sankranti: bool = False         # exclude solar sign-change days
    require_guru_udaya: bool = False      # Jupiter not combust
    require_shukra_udaya: bool = False    # Venus not combust
    require_uttarayana: bool = False
    # Window layer.
    tithis: frozenset[int] = frozenset()  # display 1-15; empty ⇒ any non-rikta
    # Pakṣa-specific tithi sets (display 1-15). When either is set they override
    # `tithis`: a window is allowed only if its tithi is in the set for its pakṣa.
    shukla_tithis: frozenset[int] = frozenset()
    krishna_tithis: frozenset[int] = frozenset()
    nakshatras: frozenset[int] = frozenset()
    shukla_only: bool = False
    avoid_varas: frozenset[int] = frozenset()  # 1=Sun … 7=Sat to exclude
    daytime_only: bool = False  # scan sunrise→sunset only (e.g. Upanayana)
    # Chart layer (houses counted whole-sign from the lagna).
    lagnas: frozenset[int] = frozenset()
    avoid_moon_houses: frozenset[int] = field(default_factory=frozenset)
    avoid_malefic_houses: frozenset[int] = field(default_factory=frozenset)
    check_graha_vedha: bool = False  # reject if a malefic's Latta pierces the day's nakshatra
    check_dagdha: bool = False       # reject burnt weekday × tithi clashes
    check_shunya: bool = False       # reject when the tithi drains the Moon's rashi


_MALEFICS = ("sun", "mars", "saturn", "rahu")

CEREMONY_RULES: dict[str, CeremonyRule] = {
    "vivah": CeremonyRule(
        key="vivah",
        lunar_months=VIVAH_LUNAR_MONTHS,
        require_guru_udaya=True,
        require_shukra_udaya=True,
        tithis=VIVAH_MUHURTA_TITHIS,
        nakshatras=VIVAH_MUHURTA_NAKSHATRAS,
    ),
    "bratabandha": CeremonyRule(
        key="bratabandha",
        sun_rashis=BRATABANDHA_MUHURTA_SUN_RASHIS,
        block_chaturmas=True,
        require_guru_udaya=True,
        require_shukra_udaya=True,
        nakshatras=BRATABANDHA_MUHURTA_NAKSHATRAS,
        avoid_varas=frozenset({3, 7}),  # avoid Tuesday & Saturday
        shukla_tithis=BRATABANDHA_SHUKLA_TITHIS,
        krishna_tithis=BRATABANDHA_KRISHNA_TITHIS,
        daytime_only=True,
    ),
    "griha-aarambha": CeremonyRule(
        key="griha-aarambha",
        sun_rashis=GRIHA_AARAMBHA_MUHURTA_SUN_RASHIS,
        block_chaturmas=False,
        tithis=GRIHA_AARAMBHA_MUHURTA_TITHIS,
        nakshatras=GRIHA_AARAMBHA_MUHURTA_NAKSHATRAS,
    ),
    # Gṛha Praveśa — four-step shastra filter (see sait_rules.check_griha_pravesh):
    #   1. Lunar month ∈ {Magh, Falgun, Chaitra, Baishakh, Jestha, Mangsir};
    #      Adhik Māsa / Chaturmāsa excluded (adhik via the pakṣa-resolved layer).
    #   2. Surya Bala — Sun not in Mithuna/Vrishchika/Meena (Malamas).
    #   3. Chandra Bala — waxing Moon: strictly Śukla-pakṣa growth tithis
    #      (2,3,5,7,10,11,13), and the Moon in a friendly house (1,3,6,7,10,11)
    #      from the muhūrta lagna (i.e. never the 2/4/5/8/9/12).
    #   4. Sthira/Mṛdu nakṣatras only.
    #   5. Asta Śuddhi — Guru & Śukra must be udaya (not combust).
    #   6. Graha Vedha — reject if a malefic's Latta ray strikes the day's
    #      nakṣatra (Sun/Mars/Saturn/Rāhu/Ketu; see latta_pierced_nakshatras).
    #   7. Dagdha — reject a burnt weekday × tithi clash.
    #   8. Shunya — reject when the tithi drains the Moon's transit rashi.
    "griha-pravesh": CeremonyRule(
        key="griha-pravesh",
        lunar_months=GRIHA_PRAVESH_LUNAR_MONTHS,
        avoid_sun_rashis=GRIHA_PRAVESH_MALAMAS_RASHIS,
        require_guru_udaya=True,
        require_shukra_udaya=True,
        shukla_only=True,
        tithis=GRIHA_PRAVESH_GROWTH_TITHIS,
        nakshatras=GRIHA_PRAVESH_NAKSHATRAS,
        avoid_moon_houses=frozenset({2, 4, 5, 8, 9, 12}),
        check_graha_vedha=True,
        check_dagdha=True,
        check_shunya=True,
    ),
    "byaparik-pratisthan": CeremonyRule(
        key="byaparik-pratisthan",
        block_chaturmas=False,  # all 12 lunar months kept (only Adhik-maas out)
        block_sankranti=True,
        require_guru_udaya=True,
        require_shukra_udaya=True,
        nakshatras=BYAPARIK_MUHURTA_NAKSHATRAS,
        shukla_tithis=BYAPARIK_SHUKLA_TITHIS,
        krishna_tithis=BYAPARIK_KRISHNA_TITHIS,
        avoid_varas=frozenset({1, 3, 7}),  # only Mon/Wed/Thu/Fri
        daytime_only=True,
    ),
    "annaprasan": CeremonyRule(
        key="annaprasan",
        block_chaturmas=False,
        nakshatras=ANNAPRASAN_MUHURTA_NAKSHATRAS,
        shukla_tithis=ANNAPRASAN_SHUKLA_TITHIS,
        krishna_tithis=ANNAPRASAN_KRISHNA_TITHIS,
        avoid_varas=frozenset({1, 3, 7}),  # only Mon/Wed/Thu/Fri
        lagnas=ANNAPRASAN_LAGNAS,
        daytime_only=True,
    ),
}

# Ceremonies whose auspicious days are found by this engine (lagna-based). The
# deterministic Vās categories (rudri/agni) keep their day-level rules in
# ``sait_rules``.
MUHURTA_CATEGORIES = frozenset(CEREMONY_RULES)

# Muhūrtas are computed sunrise → next sunrise (the vedic day, per Panchāṅga
# Śuddhi). 30-min steps keep a full-year build tractable while resolving windows
# finely enough for a day-level listing; windows shorter than MIN_WINDOW are
# discarded (the classical "at least 5 minutes" rule).
_SCAN_HOURS = 24.0
_STEP = timedelta(minutes=30)
MIN_WINDOW = timedelta(minutes=5)


@dataclass(frozen=True)
class MuhurtaWindow:
    start: datetime
    end: datetime
    tithi: int
    nakshatra: int
    lagna: int


@dataclass
class _DayGate:
    ok: bool
    planet_rashis: dict[str, int] = field(default_factory=dict)
    vaara: int = 0  # Sunday = 1 … Saturday = 7 (for the Dagdha check)


def _day_gate(rule: CeremonyRule, greg, location: ObserverLocation) -> _DayGate:
    """Season / ast / ayana gate evaluated once per day from the sunrise chart."""
    dp = build_day_panchanga(greg, location)
    if dp.is_adhik_maas:
        return _DayGate(False)
    if rule.block_sankranti:
        # Sankranti = the Sun changes sidereal rāśi within the vedic day.
        tz = resolve_observer_timezone(location.timezone)
        noon = datetime(greg.year, greg.month, greg.day, 12, 0, tzinfo=tz)
        if get_surya_rashi(noon)["number"] != get_surya_rashi(noon + timedelta(days=1))["number"]:
            return _DayGate(False)
    if rule.lunar_months and dp.lunar_month not in rule.lunar_months:
        return _DayGate(False)
    if rule.sun_rashis and dp.sun_rashi not in rule.sun_rashis:
        return _DayGate(False)
    if rule.avoid_sun_rashis and dp.sun_rashi in rule.avoid_sun_rashis:
        return _DayGate(False)
    if rule.block_chaturmas and dp.lunar_month in CHATURMAS_LUNAR_MONTHS:
        return _DayGate(False)
    if rule.require_guru_udaya and dp.jupiter_combust:
        return _DayGate(False)
    if rule.require_shukra_udaya and dp.venus_combust:
        return _DayGate(False)
    if rule.require_uttarayana and dp.aayan != "Uttarayana":
        return _DayGate(False)
    if rule.avoid_varas and dp.vaara in rule.avoid_varas:
        return _DayGate(False)
    return _DayGate(True, vaara=dp.vaara)


def _planet_rashis(greg, location: ObserverLocation) -> dict[str, int]:
    """Slow-planet rāśis at local noon (they barely move within a day)."""
    tz = resolve_observer_timezone(location.timezone)
    noon = datetime(greg.year, greg.month, greg.day, 12, 0, tzinfo=tz)
    return {p: _rashi(get_planet_position(noon, p)["longitude"]) for p in _MALEFICS}


# Graha Vedha (Latta): each planet "pierces" the Nth nakṣatra counting its own as
# the 1st, so the signed offset is (N − 1) positions — forward (+) or backward (−).
# Only malefic latta is a veto here; benefic (Amṛta) latta is not scored as a bonus.
#   Sun → 12th forward, Mars → 3rd forward, Saturn → 8th forward,
#   Rāhu / Ketu → 9th backward.  Validated: Sun in Aśvinī(1) → U.Phalgunī(12).
_MALEFIC_LATTA: dict[str, int] = {
    "sun": 11,     # 12th forward
    "mars": 2,     # 3rd forward
    "saturn": 7,   # 8th forward
    "rahu": -8,    # 9th backward
    "ketu": -8,    # 9th backward
}


def _nakshatra_of(longitude: float) -> int:
    """1-based nakṣatra (Aśvinī = 1 … Revatī = 27) for a sidereal longitude."""
    return int(longitude / (360.0 / 27.0)) % 27 + 1


def _latta_target(planet_nakshatra: int, offset: int) -> int:
    """Nakṣatra pierced by a planet in ``planet_nakshatra`` given its signed Latta offset."""
    return (planet_nakshatra - 1 + offset) % 27 + 1


def latta_pierced_nakshatras(greg, location: ObserverLocation) -> frozenset[int]:
    """Nakṣatras struck by a malefic's Latta ray on ``greg`` (evaluated at local
    noon — the malefics barely move within a day)."""
    tz = resolve_observer_timezone(location.timezone)
    noon = datetime(greg.year, greg.month, greg.day, 12, 0, tzinfo=tz)
    rahu_lon = get_planet_position(noon, "rahu")["longitude"]
    lons = {
        "sun": get_planet_position(noon, "sun")["longitude"],
        "mars": get_planet_position(noon, "mars")["longitude"],
        "saturn": get_planet_position(noon, "saturn")["longitude"],
        "rahu": rahu_lon,
        "ketu": (rahu_lon + 180.0) % 360.0,
    }
    return frozenset(
        _latta_target(_nakshatra_of(lons[planet]), offset)
        for planet, offset in _MALEFIC_LATTA.items()
    )


def _window_ok(
    rule: CeremonyRule, dt: datetime, planet_rashis, pierced_naks, day_vaara, location
) -> tuple[bool, int, int, int]:
    """Evaluate the window + chart layer at instant ``dt``."""
    tnum = get_tithi_number(get_tithi_angle(dt))
    tithi = get_display_tithi(tnum)
    if tithi in _RIKTA:
        return (False, 0, 0, 0)
    if rule.check_dagdha and is_dagdha(day_vaara, tithi):  # burnt weekday × tithi
        return (False, 0, 0, 0)
    if rule.check_shunya:  # tithi drains the Moon's transit rashi
        drained = SHUNYA_TITHI_RASHIS.get(tithi)
        if drained and _rashi(get_moon_longitude(dt)) in drained:
            return (False, 0, 0, 0)
    if rule.shukla_tithis or rule.krishna_tithis:
        allowed = rule.shukla_tithis if get_paksha(tnum) == "shukla" else rule.krishna_tithis
        if tithi not in allowed:
            return (False, 0, 0, 0)
    elif rule.tithis and tithi not in rule.tithis:
        return (False, 0, 0, 0)
    if rule.shukla_only and get_paksha(tnum) != "shukla":
        return (False, 0, 0, 0)
    nak = get_nakshatra(dt)[0]
    if rule.nakshatras and nak not in rule.nakshatras:
        return (False, 0, 0, 0)
    if pierced_naks and nak in pierced_naks:  # Graha Vedha — malefic Latta strike
        return (False, 0, 0, 0)
    lagna = _rashi(get_sidereal_asc_longitude(dt, lat=location.lat, lon=location.lon))
    if rule.lagnas and lagna not in rule.lagnas:
        return (False, 0, 0, 0)
    if rule.avoid_moon_houses:
        moon_h = (_rashi(get_moon_longitude(dt)) - lagna) % 12 + 1
        if moon_h in rule.avoid_moon_houses:
            return (False, 0, 0, 0)
    if rule.avoid_malefic_houses:
        for p in _MALEFICS:
            if (planet_rashis[p] - lagna) % 12 + 1 in rule.avoid_malefic_houses:
                return (False, 0, 0, 0)
    return (True, tithi, nak, lagna)


def muhurta_windows(
    category: str, greg, location: ObserverLocation = DEFAULT_LOCATION
) -> list[MuhurtaWindow]:
    """Auspicious muhūrta windows for ``category`` on the civil day ``greg``."""
    rule = CEREMONY_RULES.get(category)
    if rule is None:
        raise ValueError(f"No muhurta rule for category: {category}")

    gate = _day_gate(rule, greg, location)
    if not gate.ok:
        return []
    planet_rashis = _planet_rashis(greg, location) if rule.avoid_malefic_houses else {}
    pierced_naks = (
        latta_pierced_nakshatras(greg, location) if rule.check_graha_vedha else frozenset()
    )

    sunrise = calculate_sunrise(
        greg, latitude=location.lat, longitude=location.lon, timezone_name=location.timezone
    )
    # Upanayana and similar day-only rites are valid in daylight only; everything
    # else spans the vedic day (sunrise → next sunrise).
    if rule.daytime_only:
        end = calculate_sunset(
            greg, latitude=location.lat, longitude=location.lon, timezone_name=location.timezone
        )
    else:
        end = sunrise + timedelta(hours=_SCAN_HOURS)

    windows: list[MuhurtaWindow] = []
    run_start = None
    last = None
    dt = sunrise

    def _close(run, last_dt):
        if run is None or last_dt is None:
            return
        stop = min(last_dt + _STEP, end)
        if stop - run[0] >= MIN_WINDOW:
            s, ti, nk, lg = run
            windows.append(MuhurtaWindow(s, stop, ti, nk, lg))

    while dt <= end:
        ok, tithi, nak, lagna = _window_ok(
            rule, dt, planet_rashis, pierced_naks, gate.vaara, location
        )
        if ok:
            if run_start is None:
                run_start = (dt, tithi, nak, lagna)
            last = dt
        elif run_start is not None:
            _close(run_start, last)
            run_start = None
        dt = dt + _STEP
    _close(run_start, last)
    return windows


def has_muhurta(
    category: str, greg, location: ObserverLocation = DEFAULT_LOCATION
) -> bool:
    """True when ``category`` has at least one auspicious window on ``greg``."""
    return bool(muhurta_windows(category, greg, location))
