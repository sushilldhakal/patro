"""Choghadiya (चौघडिया) — classical day/night segments from sunrise to next sunrise."""

from __future__ import annotations

from typing import Any

CHOGHADIYA = [
    {"name_ne": "उद्वेग", "bad": True},
    {"name_ne": "चर"},
    {"name_ne": "लाभ"},
    {"name_ne": "अमृत"},
    {"name_ne": "काल", "bad": True},
    {"name_ne": "शुभ"},
    {"name_ne": "रोग", "bad": True},
]

CHO_DAY_START = [0, 3, 6, 2, 5, 1, 4]
CHO_NIGHT_START = [5, 1, 4, 0, 3, 6, 2]


def _parse_hhmm(time_short: str | None) -> int | None:
    if not time_short:
        return None
    parts = time_short.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        return None


def day_ghati_from_sun_times(sunrise_short: str | None, sunset_short: str | None) -> float | None:
    """Ghati from sunrise to sunset on the 0–60 vedic-day scale."""
    sunrise_min = _parse_hhmm(sunrise_short)
    sunset_min = _parse_hhmm(sunset_short)
    if sunrise_min is None or sunset_min is None:
        return None
    g = (sunset_min - sunrise_min) / 24.0
    while g < 0:
        g += 60
    return min(g, 60.0)


def build_choghadiya(day_ghati: float, vaara_num: int) -> list[dict[str, Any]]:
    """Eight day + eight night choghadiya segments in ghati coordinates."""
    segments: list[dict[str, Any]] = []
    d_seg = day_ghati / 8.0
    n_seg = (60.0 - day_ghati) / 8.0
    dow = int(vaara_num) % 7

    for i in range(8):
        c = CHOGHADIYA[(CHO_DAY_START[dow] + i) % 7]
        segments.append(
            {
                "name_ne": c["name_ne"],
                "start_g": i * d_seg,
                "end_g": (i + 1) * d_seg,
                "bad": bool(c.get("bad")),
                "phase": "day",
            }
        )
    for i in range(8):
        c = CHOGHADIYA[(CHO_NIGHT_START[dow] + i) % 7]
        segments.append(
            {
                "name_ne": c["name_ne"],
                "start_g": day_ghati + i * n_seg,
                "end_g": day_ghati + (i + 1) * n_seg,
                "bad": bool(c.get("bad")),
                "phase": "night",
            }
        )
    return segments
