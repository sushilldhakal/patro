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

# Southern-hemisphere civil month → ritu number (inverted meteorological seasons).
SOUTHERN_MONTH_RITU: dict[int, int] = {
    12: 2, 1: 2, 2: 2,    # Dec–Feb summer
    3: 4, 4: 4, 5: 4,     # Mar–May autumn
    6: 6, 7: 6, 8: 6,     # Jun–Aug winter
    9: 1, 10: 1, 11: 1,   # Sep–Nov spring
}

# Makara → Mithuna (rashi index 9, 10, 11, 0, 1, 2) is the sun's northward half.
UTTARAYANA_RASHI_INDICES = frozenset({9, 10, 11, 0, 1, 2})


def rashi_index(longitude: float) -> int:
    """0–11 index into :data:`RASHI_NAMES` for an ecliptic longitude."""
    return int(longitude / 30) % 12


class RashiService:
    """Rashi, ritu and ayana at a Julian Day. Stateless — see ``rashi_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    # ── rashi ───────────────────────────────────────────────────────────────

    def of_longitude(self, longitude: float) -> dict[str, Any]:
        """The rashi block for a bare longitude — number, names, progress."""
        index = rashi_index(longitude)
        return {
            "number": index + 1,
            "name": RASHI_NAMES[index],
            "name_ne": RASHI_NAMES_NE[index],
            "longitude": round(longitude, 6),
            "progress": round((longitude % 30) / 30, 4),
        }

    def surya(self, jd: float, *, ayanamsa: int | None = None) -> dict[str, Any]:
        """Sun's rashi (सूर्य राशि)."""
        return self.of_longitude(
            self._engine.sun_longitude(jd, sidereal=True, ayanamsa=ayanamsa)
        )

    def chandra(self, jd: float, *, ayanamsa: int | None = None) -> dict[str, Any]:
        """Moon's rashi (चन्द्र राशि)."""
        return self.of_longitude(
            self._engine.moon_longitude(jd, sidereal=True, ayanamsa=ayanamsa)
        )

    def sun_index(self, jd: float, *, sidereal: bool = True) -> int:
        """0–11 rashi index of the Sun — the input ritu and ayana are cut from."""
        return rashi_index(self._engine.sun_longitude(jd, sidereal=sidereal))

    # ── ritu ────────────────────────────────────────────────────────────────

    def _ritu_from_sun(self, jd: float, *, sidereal: bool) -> dict[str, Any]:
        index = self.sun_index(jd, sidereal=sidereal)
        ritu = RITU_DATA[index // 2]
        return {
            **{k: ritu[k] for k in ("number", "name", "name_sanskrit", "name_ne", "season")},
            "sun_rashi": index + 1,
            "basis": "sidereal" if sidereal else "tropical",
        }

    def _ritu_from_southern_month(self, jd: float, timezone_name: str) -> dict[str, Any]:
        from engine.astronomy.ut_instant import local_civil_fields, ut_instant_from_jd

        month = local_civil_fields(ut_instant_from_jd(jd), timezone_name).month
        ritu = RITU_DATA[SOUTHERN_MONTH_RITU[month] - 1]
        return {
            **{k: ritu[k] for k in ("number", "name", "name_sanskrit", "name_ne", "season")},
            "sun_rashi": self.sun_index(jd, sidereal=False) + 1,
            "basis": "southern_local",
        }

    def ritu(
        self,
        jd: float,
        *,
        sidereal: bool = False,
        lat: float | None = None,
        timezone_name: str = "Asia/Kathmandu",
    ) -> dict[str, Any]:
        """Season — sun-sign ritu in the north, local civil season south of the equator."""
        if lat is not None and lat < 0:
            return self._ritu_from_southern_month(jd, timezone_name)
        return self._ritu_from_sun(jd, sidereal=sidereal)

    # ── ayana ───────────────────────────────────────────────────────────────

    def aayan(self, jd: float, *, sidereal: bool = True) -> dict[str, Any]:
        """Uttarayana / Dakshinayana from the Sun's rashi."""
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
