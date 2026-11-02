"""Drik's ayanamsha catalogue, and the per-request resolution every route uses."""

from __future__ import annotations

from engine.astronomy.engine import SIDM_KRISHNAMURTI, SIDM_LAHIRI, SIDM_RAMAN, SIDM_TRUE_CITRA, SIDM_TRUE_PUSHYA

AYANAMSHA_MODES: dict[str, int] = {
    "nepal": SIDM_LAHIRI,
    "lahiri": SIDM_LAHIRI,
    "raman": SIDM_RAMAN,
    "kp": SIDM_KRISHNAMURTI,
    "krishnamurti": SIDM_KRISHNAMURTI,
    "true_citra": SIDM_TRUE_CITRA,
    "true_pushya": SIDM_TRUE_PUSHYA,
}

DEFAULT_AYANAMSHA = "lahiri"


def resolve_ayanamsha_mode(mode: str | None) -> tuple[str, int | None]:
    """(reported key, engine mode id) for a request's ``ayanamsha``, as its siddhanta decides.

    Drik looks the name up in AYANAMSHA_MODES (default Lahiri). The Surya Siddhanta
    has one ayanamsha of its own and answers ("surya_siddhanta", None) whatever was
    asked, without consulting this catalogue.
    """
    from engine.astronomy.siddhanta import current_siddhanta

    choice = current_siddhanta().resolve_ayanamsha(mode)
    return choice.key, choice.mode
