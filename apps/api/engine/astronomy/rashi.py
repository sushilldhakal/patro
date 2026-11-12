"""RashiService — zodiac signs, ritu and ayana, keyed by Julian Day.

The twelve rashis are a pure function of an ecliptic longitude. Ritu and ayana
are delegated to :mod:`engine.astronomy.tropical_year` (tropical, real sky). All three used to live in
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

# ऋतु and अयन live in engine.astronomy.tropical_year, the one source of truth;
# re-exported here for existing imports.
from engine.astronomy.tropical_year import RITU_DATA, ayana_at, ritu_at  # noqa: E402


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
        """0–11 rashi index of the Sun (sidereal by default). Not for ritu/ayana."""
        return rashi_index(self._engine.sun_longitude(jd, sidereal=sidereal))

    # ── ritu and ayana: always the tropical year (engine.astronomy.tropical_year) ──

    def ritu(self, jd: float, *, lat: float | None = None) -> dict[str, Any]:
        """Season at the observer — tropical, flipped south of the equator."""
        return ritu_at(jd, lat)

    def aayan(self, jd: float) -> dict[str, Any]:
        """Uttarayana (Dec solstice → Jun solstice) / Dakshinayana — tropical."""
        return ayana_at(jd)


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
