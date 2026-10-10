"""LagnaService — the sidereal ascendant, keyed by Julian Day.

The lagna is the one panchanga quantity that is as much about *where* the
observer stands as *when* they stand there: it is the ecliptic degree rising on
the eastern horizon, so it sweeps a full circle every day and moves ~1° per four
minutes of clock time. That makes it the quantity most sensitive to getting the
instant right, which is exactly why it belongs on a JD-keyed service rather than
behind a ``datetime`` facade.

Lifted from :mod:`engine.astronomy.positions` (``get_lagna``,
``get_sidereal_asc_longitude``, ``find_lagna_end``) unchanged apart from taking
a JD. See docs/computation-architecture-audit.md (section A2, phase 2).
"""

from __future__ import annotations

from typing import Any

from engine.astronomy.engine import SIDM_LAHIRI, default_engine
from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE, rashi_index

# Bisection window for the next rashi boundary. The ascendant crosses a sign in
# roughly two hours at Kathmandu's latitude; four hours brackets even the slowest
# sign at high latitude, and 50 halvings take a 4-hour window well below the
# 30-second tolerance.
_SEARCH_WINDOW_DAYS = 4.0 / 24.0
_TOLERANCE_DAYS = 30.0 / 86400.0
_MAX_BISECTIONS = 50


class LagnaService:
    """Ascendant at a Julian Day for an observer. Stateless — see ``lagna_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    def longitude(
        self, jd: float, *, lat: float, lon: float, ayanamsa: int = SIDM_LAHIRI
    ) -> float:
        """Sidereal ascendant longitude (0–360°) at *jd* for the observer."""
        return self._engine.ascendant(jd, lat, lon, ayanamsa=ayanamsa)

    def rashi_index(
        self, jd: float, *, lat: float, lon: float, ayanamsa: int = SIDM_LAHIRI
    ) -> int:
        """0–11 index of the rising sign."""
        return rashi_index(self.longitude(jd, lat=lat, lon=lon, ayanamsa=ayanamsa))

    def lagna(
        self, jd: float, *, lat: float, lon: float, ayanamsa: int = SIDM_LAHIRI
    ) -> dict[str, Any]:
        """The lagna block — number, names, longitude and degree within the sign."""
        asc = self.longitude(jd, lat=lat, lon=lon, ayanamsa=ayanamsa)
        index = rashi_index(asc)
        return {
            "number": index + 1,
            "name": RASHI_NAMES[index],
            "name_ne": RASHI_NAMES_NE[index],
            "longitude": round(asc, 6),
            "degree_in_rashi": round(asc % 30, 4),
            "anchor": "sunrise",
        }

    def next_boundary(
        self, jd: float, *, lat: float, lon: float, ayanamsa: int = SIDM_LAHIRI
    ) -> float:
        """JD at which the ascendant next enters the following rashi.

        Bisection rather than an analytic inversion: the ascendant's rate depends
        on the obliquity, the observer's latitude and the current sign, so there
        is no closed form worth maintaining for a search that converges in ~20
        steps against a memoised ephemeris.
        """
        current = self.rashi_index(jd, lat=lat, lon=lon, ayanamsa=ayanamsa)
        start = jd
        end = jd + _SEARCH_WINDOW_DAYS

        for _ in range(_MAX_BISECTIONS):
            if end - start < _TOLERANCE_DAYS:
                return end
            mid = start + (end - start) / 2
            if self.rashi_index(mid, lat=lat, lon=lon, ayanamsa=ayanamsa) == current:
                start = mid
            else:
                end = mid
        return end


lagna_service = LagnaService()
