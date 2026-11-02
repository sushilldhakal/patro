"""सूर्य सिद्धान्त: the text's own arithmetic (surya_siddhanta_math), back to सत्य युग."""

from __future__ import annotations

import threading

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.siddhanta import surya_siddhanta_math as ss
from engine.astronomy.siddhanta.drik import DRIK_RANGE
from engine.astronomy.siddhanta.model import AyanamshaChoice, ComputableRange, Siddhanta

#: What a Surya Siddhanta response reports as its ayanamsha: the text's own libration.
AYANAMSHA_KEY = "surya_siddhanta"


def _range() -> ComputableRange:
    # The floor is the yuga itself, not a data file: the deepest whole BCE year
    # after this mahayuga's सत्य युग began (~3,891,196 BCE), two years in as for
    # drik (13000 → 12998). The ceiling is drik's, so both offer the same future.
    bce_floor = 1 - CivilDay.from_jd_ut(ss.SATYA_YUGA_START_JD).year
    return ComputableRange(
        jd_min=float(ss.SATYA_YUGA_START_JD),
        jd_max=DRIK_RANGE.jd_max,
        deepest_bce_year=bce_floor - 2,
        last_ce_year=DRIK_RANGE.last_ce_year,
    )


class SuryaSiddhanta(Siddhanta):
    id = "surya_siddhanta"

    def __init__(self) -> None:
        self._engine = None
        self._range: ComputableRange | None = None
        self._lock = threading.Lock()

    @property
    def engine(self):
        if self._engine is None:
            with self._lock:
                if self._engine is None:
                    from engine.astronomy.siddhanta.surya_siddhanta_engine import SuryaSiddhantaEngine

                    self._engine = SuryaSiddhantaEngine()
        return self._engine

    def resolve_ayanamsha(self, requested: str | None) -> AyanamshaChoice:
        """Always the text's own ayanamsha: a requested drik one (Lahiri, KP…) does not apply."""
        return AyanamshaChoice(key=AYANAMSHA_KEY, mode=None)

    def computable_range(self) -> ComputableRange:
        if self._range is None:
            self._range = _range()
        return self._range

    def jovian_years_elapsed(self, jd_ut: float) -> int:
        return ss.mean_sign_ingresses_since_kali("jupiter", jd_ut)
