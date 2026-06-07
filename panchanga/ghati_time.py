"""Ghati / ghadi-pala time and dinamaan helpers."""

from __future__ import annotations

from datetime import datetime, timedelta


def seconds_to_ghadi_pala(total_seconds: float) -> dict:
    """Convert duration to ghadi (24 min) and pala (24 sec)."""
    ghadi = int(total_seconds // (24 * 60))
    remaining = total_seconds % (24 * 60)
    pala = int(remaining // 24)
    vipala = int((remaining % 24) * (60 / 24))
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    return {
        "ghadi": ghadi,
        "pala": pala,
        "vipala": vipala,
        "hours": hours,
        "minutes": minutes,
        "total_minutes": round(total_seconds / 60),
        "label_ne": f"{ghadi} घडी {pala} पला",
        "label_en": f"{hours}hr {minutes}min",
    }


def time_from_sunrise(end_dt: datetime, sunrise_dt: datetime) -> dict:
    """Time elapsed from sunrise in ghati:pala:vipala and extended-hour clocks."""
    delta = (end_dt - sunrise_dt).total_seconds()
    if delta < 0:
        delta += 86400

    ghati = int(delta // (24 * 60))
    rem_minutes = (delta % (24 * 60)) / 60
    pala = int(rem_minutes * 60 / 24)
    vipala = int((rem_minutes * 60 % 24) * (60 / 24))

    hours = int(delta // 3600)
    minutes = int((delta % 3600) // 60)
    seconds = int(delta % 60)

    return {
        "seconds_from_sunrise": round(delta),
        "ghati_clock": f"{ghati}:{pala:02d}:{vipala:02d}",
        "hours_clock": f"{hours}:{minutes:02d}:{seconds:02d}",
        "local_time": end_dt.strftime("%H:%M:%S"),
        "local_iso": end_dt.isoformat(),
    }


def compute_dinamaan(sunrise_dt: datetime, sunset_dt: datetime) -> dict:
    """Day length (sunrise to sunset) in ghadi-pala."""
    duration = (sunset_dt - sunrise_dt).total_seconds()
    ghadi_info = seconds_to_ghadi_pala(duration)
    return {
        **ghadi_info,
        "label_full_ne": f"{ghadi_info['label_ne']} - {ghadi_info['label_en']}",
    }
