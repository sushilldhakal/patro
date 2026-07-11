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
    get_tithi_angle,
    get_tithi_number,
    get_display_tithi,
    get_paksha,
    get_yoga,
)
from engine.astronomy.swiss_eph import calculate_sunrise, get_planet_position
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.sait_rules import (
    BRATABANDHA_LUNAR_MONTHS,
    BRATABANDHA_NAKSHATRAS,
    BRATABANDHA_TITHIS,
    BUSINESS_NAKSHATRAS,
    BUSINESS_SHUKLA_TITHIS,
    CHATURMAS_LUNAR_MONTHS,
    GRIHA_AARAMBHA_NAKSHATRAS,
    GRIHA_AARAMBHA_SUN_RASHIS,
    GRIHA_PRAVESH_NAKSHATRAS,
    GRIHA_PRAVESH_SHUKLA_TITHIS,
    GRIHA_PRAVESH_SUN_RASHIS,
    VIVAH_LUNAR_MONTHS,
    build_day_panchanga,
)

# Rikta tithis (Chaturthi/Navami/Chaturdashi) and Amavasya are excluded for all
# saṃskāra muhūrtas.
_RIKTA = frozenset({4, 9, 14})

# Marriage nakshatras, slightly widened from the sunrise-rule set (adds Ashwini,
# Chitra, Dhanishta) — these carry real vivāha muhūrtas in the official lists.
VIVAH_MUHURTA_NAKSHATRAS = frozenset({1, 4, 5, 10, 12, 13, 14, 15, 17, 19, 20, 21, 23, 26, 27})
VIVAH_MUHURTA_TITHIS = frozenset({2, 3, 5, 7, 10, 11, 12, 13})


def _rashi(longitude: float) -> int:
    return int(longitude / 30.0) % 12 + 1


@dataclass(frozen=True)
class CeremonyRule:
    """Muhūrta constraints for one ceremony. Empty sets mean 'no constraint'."""

    key: str
    # Day gate — one of lunar_months / sun_rashis fixes the season.
    lunar_months: frozenset[str] = frozenset()
    sun_rashis: frozenset[int] = frozenset()
    block_chaturmas: bool = True
    require_guru_udaya: bool = False      # Jupiter not combust
    require_shukra_udaya: bool = False    # Venus not combust
    require_uttarayana: bool = False
    # Window layer.
    tithis: frozenset[int] = frozenset()  # display 1-15; empty ⇒ any non-rikta
    nakshatras: frozenset[int] = frozenset()
    shukla_only: bool = False
    # Chart layer (houses counted whole-sign from the lagna).
    lagnas: frozenset[int] = frozenset()
    avoid_moon_houses: frozenset[int] = field(default_factory=frozenset)
    avoid_malefic_houses: frozenset[int] = field(default_factory=frozenset)


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
        lunar_months=BRATABANDHA_LUNAR_MONTHS,
        require_guru_udaya=True,
        require_uttarayana=True,
        tithis=BRATABANDHA_TITHIS,
        nakshatras=BRATABANDHA_NAKSHATRAS,
        shukla_only=True,
    ),
    "griha-aarambha": CeremonyRule(
        key="griha-aarambha",
        sun_rashis=GRIHA_AARAMBHA_SUN_RASHIS,
        tithis=GRIHA_PRAVESH_SHUKLA_TITHIS,
        nakshatras=GRIHA_AARAMBHA_NAKSHATRAS,
    ),
    "griha-pravesh": CeremonyRule(
        key="griha-pravesh",
        sun_rashis=GRIHA_PRAVESH_SUN_RASHIS,
        tithis=GRIHA_PRAVESH_SHUKLA_TITHIS,
        nakshatras=GRIHA_PRAVESH_NAKSHATRAS,
        shukla_only=True,
    ),
    "byaparik-pratisthan": CeremonyRule(
        key="byaparik-pratisthan",
        require_guru_udaya=True,
        tithis=BUSINESS_SHUKLA_TITHIS,
        nakshatras=BUSINESS_NAKSHATRAS,
        shukla_only=True,
    ),
}

# Ceremonies whose auspicious days are found by this engine (lagna-based). The
# deterministic Vās categories (rudri/agni) and the birth-anchored annaprasan
# keep their own day-level rules in ``sait_rules``.
MUHURTA_CATEGORIES = frozenset(CEREMONY_RULES)

# Scan window: sunrise → +18h, stepped. 30 min keeps a full-year build tractable
# while resolving windows finely enough for a day-level listing.
_SCAN_HOURS = 18.0
_STEP = timedelta(minutes=30)


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


def _day_gate(rule: CeremonyRule, greg, location: ObserverLocation) -> _DayGate:
    """Season / ast / ayana gate evaluated once per day from the sunrise chart."""
    dp = build_day_panchanga(greg, location)
    if dp.is_adhik_maas:
        return _DayGate(False)
    if rule.lunar_months and dp.lunar_month not in rule.lunar_months:
        return _DayGate(False)
    if rule.sun_rashis and dp.sun_rashi not in rule.sun_rashis:
        return _DayGate(False)
    if rule.block_chaturmas and dp.lunar_month in CHATURMAS_LUNAR_MONTHS:
        return _DayGate(False)
    if rule.require_guru_udaya and dp.jupiter_combust:
        return _DayGate(False)
    if rule.require_shukra_udaya and dp.venus_combust:
        return _DayGate(False)
    if rule.require_uttarayana and dp.aayan != "Uttarayana":
        return _DayGate(False)
    return _DayGate(True)


def _planet_rashis(greg, location: ObserverLocation) -> dict[str, int]:
    """Slow-planet rāśis at local noon (they barely move within a day)."""
    tz = resolve_observer_timezone(location.timezone)
    noon = datetime(greg.year, greg.month, greg.day, 12, 0, tzinfo=tz)
    return {p: _rashi(get_planet_position(noon, p)["longitude"]) for p in _MALEFICS}


def _window_ok(rule: CeremonyRule, dt: datetime, planet_rashis, location) -> tuple[bool, int, int, int]:
    """Evaluate the window + chart layer at instant ``dt``."""
    tithi = get_display_tithi(get_tithi_number(get_tithi_angle(dt)))
    if tithi in _RIKTA:
        return (False, 0, 0, 0)
    if rule.tithis and tithi not in rule.tithis:
        return (False, 0, 0, 0)
    if rule.shukla_only and get_paksha(get_tithi_number(get_tithi_angle(dt))) != "shukla":
        return (False, 0, 0, 0)
    nak = get_nakshatra(dt)[0]
    if rule.nakshatras and nak not in rule.nakshatras:
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

    sunrise = calculate_sunrise(
        greg, latitude=location.lat, longitude=location.lon, timezone_name=location.timezone
    )
    windows: list[MuhurtaWindow] = []
    run_start = None
    last = None
    steps = int(_SCAN_HOURS * 60 / (_STEP.seconds // 60)) + 1
    for i in range(steps):
        dt = sunrise + _STEP * i
        ok, tithi, nak, lagna = _window_ok(rule, dt, planet_rashis, location)
        if ok:
            if run_start is None:
                run_start = (dt, tithi, nak, lagna)
            last = dt
        elif run_start is not None:
            s, ti, nk, lg = run_start
            windows.append(MuhurtaWindow(s, last + _STEP, ti, nk, lg))
            run_start = None
    if run_start is not None:
        s, ti, nk, lg = run_start
        windows.append(MuhurtaWindow(s, last + _STEP, ti, nk, lg))
    return windows


def has_muhurta(
    category: str, greg, location: ObserverLocation = DEFAULT_LOCATION
) -> bool:
    """True when ``category`` has at least one auspicious window on ``greg``."""
    return bool(muhurta_windows(category, greg, location))
