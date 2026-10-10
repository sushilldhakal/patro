"""Ayanamsha mode mapping for API query parameters."""

from __future__ import annotations

from engine.astronomy.engine import SIDM_KRISHNAMURTI, SIDM_LAHIRI, SIDM_RAMAN, SIDM_TRUE_CITRA

AYANAMSHA_MODES: dict[str, int] = {
    "nepal": SIDM_LAHIRI,
    "lahiri": SIDM_LAHIRI,
    "raman": SIDM_RAMAN,
    "kp": SIDM_KRISHNAMURTI,
    "krishnamurti": SIDM_KRISHNAMURTI,
    "true_citra": SIDM_TRUE_CITRA,
}

DEFAULT_AYANAMSHA = "lahiri"


def resolve_ayanamsha_mode(mode: str | None) -> tuple[str, int]:
    key = (mode or DEFAULT_AYANAMSHA).strip().lower()
    if key not in AYANAMSHA_MODES:
        raise ValueError(
            f"Unknown ayanamsha '{mode}'. "
            f"Use one of: {', '.join(sorted(AYANAMSHA_MODES))}"
        )
    return key, AYANAMSHA_MODES[key]
