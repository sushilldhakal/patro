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

#: One name per engine mode, for cache keys and generated tables ("nepal" is Lahiri, "krishnamurti" is KP).
_CANONICAL_KEY = {
    SIDM_LAHIRI: "lahiri",
    SIDM_RAMAN: "raman",
    SIDM_KRISHNAMURTI: "kp",
    SIDM_TRUE_CITRA: "true_citra",
    SIDM_TRUE_PUSHYA: "true_pushya",
}


def canonical_ayanamsha_key(mode: int) -> str:
    return _CANONICAL_KEY[mode]


_LABEL = {
    "lahiri": "Lahiri",
    "raman": "Raman",
    "kp": "KP (Krishnamurti)",
    "true_citra": "True Chitra",
    "true_pushya": "True Pushya",
}


def ayanamsha_label() -> str:
    """Display name of the request's ayanamsha ("Lahiri", "KP (Krishnamurti)", "Surya Siddhanta")."""
    from engine.astronomy.siddhanta import current_ayanamsha

    choice = current_ayanamsha()
    if choice.mode is None:
        return "Surya Siddhanta"
    return _LABEL[canonical_ayanamsha_key(choice.mode)]


def resolve_ayanamsha_mode(mode: str | None) -> tuple[str, int | None]:
    """(reported key, engine mode id) for a request's ``ayanamsha``, as its siddhanta decides.

    Drik looks the name up in AYANAMSHA_MODES (default Lahiri). The Surya Siddhanta
    has one ayanamsha of its own and answers ("surya_siddhanta", None) whatever was
    asked, without consulting this catalogue.
    """
    from engine.astronomy.siddhanta import current_siddhanta

    choice = current_siddhanta().resolve_ayanamsha(mode)
    return choice.key, choice.mode
