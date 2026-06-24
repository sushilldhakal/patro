"""Ayanamsha mode mapping for API query parameters."""

from __future__ import annotations

import swisseph as swe

AYANAMSHA_MODES: dict[str, int] = {
    "nepal": swe.SIDM_LAHIRI,
    "lahiri": swe.SIDM_LAHIRI,
    "raman": swe.SIDM_RAMAN,
    "kp": swe.SIDM_KRISHNAMURTI,
    "krishnamurti": swe.SIDM_KRISHNAMURTI,
    "true_citra": swe.SIDM_TRUE_CITRA,
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
