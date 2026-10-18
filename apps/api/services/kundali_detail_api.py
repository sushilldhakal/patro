"""The /kundali/detail use case: a birth-instant panchanga plus the chart around it."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from engine.astronomy.location import ObserverLocation
from engine.astronomy.sidereal import resolve_ayanamsha_mode
from engine.vedic.kundali_detail import assemble_kundali_detail
from services.panchanga_at_time import build_panchanga_at_time


def build_kundali_detail(
    instant_local: datetime,
    location: ObserverLocation,
    ayanamsha: str | None = None,
) -> dict[str, Any]:
    """Assemble the full /kundali/detail JSON payload."""
    _, mode_id = resolve_ayanamsha_mode(ayanamsha)
    panchanga = build_panchanga_at_time(instant_local, location, ayanamsa=mode_id)
    return assemble_kundali_detail(instant_local, location, panchanga, ayanamsha=ayanamsha)
