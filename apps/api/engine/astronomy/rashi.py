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

    def _ritu_from_sun(self, jd: float, *, sidereal: bool, southern: bool = False) -> dict[str, Any]:
        index = self.sun_index(jd, sidereal=sidereal)
        # Six 60° arcs of the Sun's path, paired Meena + Mesha (Vasanta) … Makara +
        # Kumbha (Shishira). Read tropically that is the real sky: Shishira opens
        # at the winter solstice with Uttarayana, Varsha at the summer solstice
        # with Dakshinayana, and each equinox falls mid-Vasanta / mid-Sharad.
        # Read sidereally it is the solar-month (pauranik) ritu, Chaitra–Baisakh
        # Vasanta, which lags the real seasons by the ayanamsa.
        slot = ((index + 1) % 12) // 2
        # South of the equator the same Sun brings the opposite season: the arcs
        # are read half a year on (three ritus), so the December solstice opens
        # Varsha there and the June one Shishira. The seasons page
        # (``displayRituSlot`` in the apps) shifts the same way, so the patro's
        # ritu and the seasons page agree for every place.
        if southern:
            slot = (slot + 3) % 6
        ritu = RITU_DATA[slot]
        return {
            **{k: ritu[k] for k in ("number", "name", "name_sanskrit", "name_ne", "season")},
            "sun_rashi": index + 1,
            "basis": ("sidereal" if sidereal else "tropical") + ("_southern" if southern else ""),
        }

    def ritu(
        self,
        jd: float,
        *,
        sidereal: bool = False,
        lat: float | None = None,
        timezone_name: str = "Asia/Kathmandu",
    ) -> dict[str, Any]:
        """Season at a place: the Sun's 60° arc, read half a year on south of the equator.

        ``timezone_name`` is kept for callers; the season itself turns on the Sun
        alone (the day it changes is the caller's local sunrise ``jd``).
        """
        del timezone_name
        return self._ritu_from_sun(jd, sidereal=sidereal, southern=lat is not None and lat < 0)

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
        index = self.sun_index(jd, sidereal=sidereal)
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
