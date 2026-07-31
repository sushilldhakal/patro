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
    seconds = int(total_seconds % 60)
    return {
        "ghadi": ghadi,
        "pala": pala,
        "vipala": vipala,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "total_minutes": round(total_seconds / 60),
        "label_ne": f"{ghadi} घडी {pala} पला",
        "label_en": f"{hours}hr {minutes}min",
        "label_en_full": f"{hours} Hours {minutes} Mins {seconds:02d} Secs",
        "label_ne_full": f"{hours} घण्टा {minutes} मिनेट {seconds:02d} सेकेन्ड",
    }


def time_from_sunrise(
    end_dt: datetime,
    sunrise_dt: datetime,
    timezone_name: str | None = None,
) -> dict:
    """Time elapsed from sunrise in ghati:pala:vipala and extended-hour clocks.

    ``local_time``/``local_iso`` are the observer's wall clock when
    ``timezone_name`` is given; without it they fall back to ``end_dt`` as-is
    (historically UTC — kept for callers that don't localize).
    """
    from engine.astronomy.ut_instant import UtInstant, format_ut_instant_local

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

    local_dt = end_dt
    local_time: str
    local_iso: str
    if isinstance(end_dt, UtInstant):
        block = format_ut_instant_local(end_dt, timezone_name or "UTC")
        local_time = block["local_time"]
        local_iso = block["local"]
    else:
        if timezone_name is not None:
            from engine.astronomy.timescale import resolve_observer_timezone

            local_dt = end_dt.astimezone(resolve_observer_timezone(timezone_name))
        local_time = local_dt.strftime("%H:%M:%S")
        local_iso = local_dt.isoformat()

    return {
        "seconds_from_sunrise": round(delta),
        "ghati_clock": f"{ghati}:{pala:02d}:{vipala:02d}",
        "hours_clock": f"{hours}:{minutes:02d}:{seconds:02d}",
        "local_time": local_time,
        "local_iso": local_iso,
    }


def compute_dinamaan(sunrise_dt: datetime, sunset_dt: datetime) -> dict:
    """Day length (sunrise to sunset) in ghadi-pala."""
    duration = (sunset_dt - sunrise_dt).total_seconds()
    ghadi_info = seconds_to_ghadi_pala(duration)
    return {
        **ghadi_info,
        "label_full_ne": f"{ghadi_info['label_ne']} - {ghadi_info['label_en']}",
    }
