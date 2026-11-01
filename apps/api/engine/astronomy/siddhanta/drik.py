"""Drik: the Swiss Ephemeris (JPL DE431), with the ayanamsha the request names."""

from __future__ import annotations

import threading

from engine.astronomy.siddhanta.model import AyanamshaChoice, ComputableRange, Siddhanta

#: Ayanamsha ids a drik request may name, and the default.
DEFAULT_AYANAMSHA = "lahiri"

# Measured on the production host (29 Oct 2026) against the installed .se1 set:
# the at-time panchanga answers from 27 Dec 13000 BCE to 30 Jan 16997 CE, and
# month calendars for every month of 12998 BCE … 16995 CE. The JD window is the
# first and last at-time days, 35 days in. Swiss Ephemeris stops at 11 Aug
# 13000 BCE and 7 Jan 17000 CE whatever files are installed.
DRIK_RANGE = ComputableRange(
    jd_min=-3026431.5,
    jd_max=7929081.5,
    deepest_bce_year=12998,
    last_ce_year=16995,
)


class Drik(Siddhanta):
    id = "drik"

    def __init__(self) -> None:
        self._engine = None
        self._lock = threading.Lock()

    @property
    def engine(self):
        if self._engine is None:
            with self._lock:
                if self._engine is None:
                    from engine.astronomy.engine import SwissEphemerisEngine

                    self._engine = SwissEphemerisEngine()
        return self._engine

    def resolve_ayanamsha(self, requested: str | None) -> AyanamshaChoice:
        from engine.astronomy.sidereal import AYANAMSHA_MODES

        key = (requested or DEFAULT_AYANAMSHA).strip().lower()
        if key not in AYANAMSHA_MODES:
            raise ValueError(f"Unknown ayanamsha '{requested}'. Use one of: {', '.join(sorted(AYANAMSHA_MODES))}")
        return AyanamshaChoice(key=key, mode=AYANAMSHA_MODES[key])

    def computable_range(self) -> ComputableRange:
        return DRIK_RANGE

    @property
    def cache_namespace(self) -> str:
        return ""
