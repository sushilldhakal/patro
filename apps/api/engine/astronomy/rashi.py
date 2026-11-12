"""RashiService — zodiac signs, ritu and ayana, keyed by Julian Day.

The twelve rashis are a pure function of an ecliptic longitude, and ritu and
ayana are functions of the Sun's rashi. All three used to live in
:mod:`engine.astronomy.positions` behind ``datetime``-shaped helpers
(``get_surya_rashi``, ``get_chandra_rashi``, ``get_ritu``, ``get_aayan``).

Splitting them out is what lets ``positions.py`` go away: the name tables have a
home that is not a facade, and the arithmetic takes a JD like everything else in
this package.

See docs/computation-architecture-audit.md (section A2, phase 2).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from engine.astronomy.engine import default_engine

RASHI_NAMES = [
    "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
    "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
]

RASHI_NAMES_NE = [
    "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
]

RITU_DATA = [
    {"number": 1, "name": "Vasanta", "name_sanskrit": "Vasanta", "name_ne": "वसन्त", "season": "Spring"},
    {"number": 2, "name": "Grishma", "name_sanskrit": "Grishma", "name_ne": "ग्रीष्म", "season": "Summer"},
    {"number": 3, "name": "Varsha", "name_sanskrit": "Varsha", "name_ne": "वर्षा", "season": "Monsoon"},
    {"number": 4, "name": "Sharad", "name_sanskrit": "Sharad", "name_ne": "शरद", "season": "Autumn"},
    {"number": 5, "name": "Hemanta", "name_sanskrit": "Hemanta", "name_ne": "हेमन्त", "season": "Pre-winter"},
    {"number": 6, "name": "Shishira", "name_sanskrit": "Shishira", "name_ne": "शिशिर", "season": "Winter"},
]

# South of the equator the same arc of the Sun's path is the opposite season:
# three ritus (180°) on. The seasons page shifts its cards the same way
# (``displayRituSlot`` in packages/domain/src/calendar/ritu-display.ts).
SOUTHERN_RITU_SHIFT = 3

# Makara → Mithuna (rashi index 9, 10, 11, 0, 1, 2) is the sun's northward half. Read on the
# tropical zodiac that is exactly winter solstice → summer solstice.
UTTARAYANA_RASHI_INDICES = frozenset({9, 10, 11, 0, 1, 2})


def rashi_index(longitude: float) -> int:
    """0–11 index into :data:`RASHI_NAMES` for an ecliptic longitude."""
    return int(longitude / 30) % 12


@dataclass(frozen=True, slots=True)
class RashiPlacement:
    """Which rashi an ecliptic longitude falls in, and how far through it.

    ``longitude`` is kept unrounded, so the rashi is cut from the exact value;
    :meth:`to_payload` rounds it for the rashi block a route returns.
    """

    longitude: float

    @property
    def index(self) -> int:
        """0–11 index into :data:`RASHI_NAMES`."""
        return rashi_index(self.longitude)

    @property
    def number(self) -> int:
        """1–12."""
        return self.index + 1

    @property
    def name(self) -> str:
        return RASHI_NAMES[self.index]

    @property
    def name_ne(self) -> str:
        return RASHI_NAMES_NE[self.index]

    @property
    def degree_in_rashi(self) -> float:
        return self.longitude % 30

    @property
    def progress(self) -> float:
        """0–1 through the rashi."""
        return self.degree_in_rashi / 30

    def to_payload(self) -> dict[str, Any]:
        """The rashi block — number, names, longitude and progress."""
        return {
            "number": self.number,
            "name": self.name,
            "name_ne": self.name_ne,
            "longitude": round(self.longitude, 6),
            "progress": round(self.progress, 4),
        }


class RashiService:
    """Rashi, ritu and ayana at a Julian Day. Stateless — see ``rashi_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    # ── rashi ───────────────────────────────────────────────────────────────

    def of_longitude(self, longitude: float) -> RashiPlacement:
        """The rashi of a bare longitude."""
        return RashiPlacement(longitude)

    def surya(self, jd: float, *, ayanamsa: int | None = None) -> RashiPlacement:
        """Sun's rashi (सूर्य राशि)."""
        return self.of_longitude(
            self._engine.sun_longitude(jd, sidereal=True, ayanamsa=ayanamsa)
        )

    def chandra(self, jd: float, *, ayanamsa: int | None = None) -> RashiPlacement:
        """Moon's rashi (चन्द्र राशि)."""
        return self.of_longitude(
            self._engine.moon_longitude(jd, sidereal=True, ayanamsa=ayanamsa)
        )

    def sun_index(self, jd: float, *, sidereal: bool = True) -> int:
        """0–11 rashi index of the Sun — the input ritu and ayana are cut from."""
        return rashi_index(self._engine.sun_longitude(jd, sidereal=sidereal))

    # ── ritu ────────────────────────────────────────────────────────────────

    def _ritu_from_sun(self, jd: float, *, sidereal: bool) -> dict[str, Any]:
        # Six 60° arcs of the Sun's path, paired Meena + Mesha (Vasanta) … Makara +
        # Kumbha (Shishira). Read tropically that is the real sky: Shishira opens
        # at the winter solstice with Uttarayana, Varsha at the summer solstice
        # with Dakshinayana, and each equinox falls mid-Vasanta / mid-Sharad.
        # Read sidereally it is the solar-month (pauranik) ritu, Chaitra–Baisakh
        # Vasanta, which lags the real seasons by the ayanamsa.
        index = self.sun_index(jd, sidereal=True) if sidereal else self.tropical_sun_index(jd)
        ritu = RITU_DATA[((index + 1) % 12) // 2]
        return {
            **{k: ritu[k] for k in ("number", "name", "name_sanskrit", "name_ne", "season")},
            "sun_rashi": index + 1,
            "basis": "sidereal" if sidereal else "tropical",
        }

    def tropical_sun_index(self, jd: float) -> int:
        """0–11 tropical sign of the Sun in the real sky (Swiss Ephemeris), whatever
        siddhanta the request computes in. The seasons are the Sun's real place on
        its path; the Surya Siddhanta's sayana longitude (its nirayana longitude plus
        its trepidating ayanamsha) does not follow them, so it never decides a ritu."""
        from engine.astronomy.siddhanta import DRIK, siddhanta

        return rashi_index(siddhanta(DRIK).engine.sun_longitude(jd, sidereal=False))

    def ritu(
        self,
        jd: float,
        *,
        sidereal: bool = False,
        lat: float | None = None,
        timezone_name: str = "Asia/Kathmandu",
    ) -> dict[str, Any]:
        """Season at the observer — the tropical (sayana) ritu, flipped south of the equator.

        ``sidereal=True`` gives the pauranik solar-month ritu instead (kept for the
        classical rules defined by it; never shown as the day's season).
        ``timezone_name`` is accepted for callers' symmetry; the season depends only
        on the instant and the hemisphere.
        """
        ritu = self._ritu_from_sun(jd, sidereal=sidereal)
        if sidereal or lat is None or lat >= 0:
            return ritu
        flipped = RITU_DATA[(ritu["number"] - 1 + SOUTHERN_RITU_SHIFT) % 6]
        return {
            **ritu,
            **{k: flipped[k] for k in ("number", "name", "name_sanskrit", "name_ne", "season")},
            "basis": "tropical_southern",
        }

    # ── ayana ───────────────────────────────────────────────────────────────

    def aayan(self, jd: float, *, sidereal: bool = False) -> dict[str, Any]:
        """Uttarayana / Dakshinayana from the Sun's rashi.

        Tropical by default: the Sun really turns north at the winter solstice
        (tropical 270°, ~Poush 6) and south at the summer solstice (90°, ~Ashadh 6).
        The sidereal rashi (Makar Sankranti → Karka Sankranti) lags those turns by
        the ayanamsa — about 24 days now, and ~50″ (~20 min of the Sun's motion)
        more every year — so it is kept only for the classical muhurta rules that
        are defined by it (``sidereal=True``).
        """
        # Tropical is the real sky (Swiss Ephemeris) under every siddhanta, like ritu.
        index = self.sun_index(jd, sidereal=True) if sidereal else self.tropical_sun_index(jd)
        uttara = index in UTTARAYANA_RASHI_INDICES
        return {
            "name": "Uttarayana" if uttara else "Dakshinayana",
            "name_ne": "उत्तरायण" if uttara else "दक्षिणायण",
            "name_sanskrit": "Uttarayana" if uttara else "Dakshinayana",
            "sun_rashi": index + 1,
            "basis": "sidereal" if sidereal else "tropical",
            "kranti_mark": "उ" if uttara else "द",
        }


def ayana_kranti_mark(aayan: dict) -> str:
    """उ / द mark for Suryakranti — works with fresh and cached aayan dicts.

    Cached payloads predate ``kranti_mark``, so the name fields are the fallback.
    """
    mark = aayan.get("kranti_mark")
    if mark in ("उ", "द"):
        return mark
    if aayan.get("name") == "Uttarayana":
        return "उ"
    return "उ" if "उत्तर" in (aayan.get("name_ne") or "") else "द"


rashi_service = RashiService()
