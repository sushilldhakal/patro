"""
Graha udaya / asta (heliacal rising & setting) — Surya Siddhanta combustion orbs.

Visibility is based on geocentric sidereal elongation from the Sun. When elongation
drops below the graha-specific threshold the planet is asta (combust); when it rises
above the threshold it is udita (visible).

Nepali patro labels:
  पूर्वमा उदय / पूर्वमा अस्त  — morning sky (planet west of Sun)
  पश्चिममा उदय / पश्चिममा अस्त — evening sky (planet east of Sun)
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from engine.astronomy.swiss_eph import get_planet_position, init_ephemeris
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.gochar import GRAHA_META, GRAHA_ORDER, _attach_local_time, _longitude_for

# Slow grahas + inner planets (exclude Sun/Moon/Rahu/Ketu for patro udayast rows).
UDAYAST_GRAHAS: list[str] = ["mars", "mercury", "jupiter", "venus", "saturn"]

_SCAN_STEP = timedelta(hours=2)
_TOLERANCE = timedelta(minutes=5)


def _elongation(graha: str, dt: datetime) -> tuple[float, bool, bool]:
    """Return (separation_deg, east_of_sun, retrograde)."""
    sun_lon = _longitude_for("sun", dt)
    planet_lon = _longitude_for(graha, dt)
    diff = (planet_lon - sun_lon) % 360.0
    separation = min(diff, 360.0 - diff)
    east_of_sun = diff < 180.0
    speed = float(get_planet_position(dt, graha)["speed"])
    retrograde = speed < 0.0
    return separation, east_of_sun, retrograde


def combustion_threshold(graha: str, retrograde: bool, east_of_sun: bool) -> float:
    """
    Surya Siddhanta udaya/asta arcus visionis (degrees), simplified.

    Mercury & Venus use smaller orbs when retrograde; Venus also differs by hemisphere.
    """
    if graha == "mars":
        return 17.0
    if graha == "jupiter":
        return 11.0
    if graha == "saturn":
        return 15.0
    if graha == "venus":
        if retrograde:
            return 8.0
        return 10.0
    if graha == "mercury":
        if retrograde:
            return 12.0
        return 14.0
    return 14.0


def is_heliacally_visible(graha: str, dt: datetime) -> bool:
    sep, east, retro = _elongation(graha, dt)
    return sep >= combustion_threshold(graha, retro, east)


def _hemisphere_ne(east_of_sun: bool) -> str:
    return "पश्चिम" if east_of_sun else "पूर्व"


def _event_label(east_of_sun: bool, becoming_visible: bool) -> str:
    direction = _hemisphere_ne(east_of_sun)
    event = "उदय" if becoming_visible else "अस्त"
    return f"{direction}मा {event}"


def _bisect_visibility_change(
    graha: str,
    t_lo: datetime,
    t_hi: datetime,
    *,
    target_visible: bool,
) -> datetime:
    for _ in range(50):
        if t_hi - t_lo < _TOLERANCE:
            break
        t_mid = t_lo + (t_hi - t_lo) / 2
        if is_heliacally_visible(graha, t_mid) == target_visible:
            t_hi = t_mid
        else:
            t_lo = t_mid
    return t_hi


def find_udayast_events_in_range(
    from_dt: datetime,
    until_dt: datetime,
    *,
    grahas: list[str] | None = None,
) -> list[dict[str, Any]]:
    """All heliacal udaya/asta transitions between from_dt and until_dt."""
    if grahas is None:
        grahas = list(UDAYAST_GRAHAS)

    init_ephemeris()
    events: list[dict[str, Any]] = []

    for graha in grahas:
        if graha not in GRAHA_META:
            continue

        cursor = from_dt
        was_visible = is_heliacally_visible(graha, cursor)

        while cursor < until_dt:
            probe = min(cursor + _SCAN_STEP, until_dt)
            now_visible = is_heliacally_visible(graha, probe)
            if now_visible == was_visible:
                cursor = probe
                continue

            crossing = _bisect_visibility_change(
                graha,
                cursor,
                probe,
                target_visible=now_visible,
            )
            if crossing > until_dt:
                break

            _, east, retro = _elongation(graha, crossing)
            becoming_visible = now_visible
            meta = GRAHA_META[graha]
            motion_ne = "वक्र" if retro else "मार्गी"

            events.append({
                "graha": graha,
                "graha_vedic": meta["vedic"],
                "graha_ne": meta["ne"],
                "level": "udayast",
                "event": "udaya" if becoming_visible else "asta",
                "hemisphere": "west" if east else "east",
                "is_retrograde": retro,
                "motion_ne": motion_ne,
                "label_ne": _event_label(east, becoming_visible),
                "entry_time_utc": crossing.isoformat(),
            })

            was_visible = now_visible
            cursor = crossing + timedelta(seconds=90)

    events.sort(key=lambda e: e["entry_time_utc"])
    return events


def build_udayast_range(
    from_date: date,
    to_date: date,
    location: Any,
    *,
    grahas: list[str] | None = None,
) -> dict[str, Any]:
    """Udaya/asta timeline between civil dates (inclusive), anchored at sunrise."""
    from engine.astronomy.swiss_eph import calculate_sunrise

    if to_date < from_date:
        raise ValueError("to_date must be on or after from_date")

    init_ephemeris()
    tz = resolve_observer_timezone(location.timezone)
    from_sunrise = calculate_sunrise(
        from_date,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    until_sunrise = calculate_sunrise(
        to_date + timedelta(days=1),
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    raw = find_udayast_events_in_range(
        from_sunrise,
        until_sunrise,
        grahas=grahas,
    )
    events = [_attach_local_time(dict(e), tz) for e in raw]
    return {
        "from_date_ad": from_date.isoformat(),
        "to_date_ad": to_date.isoformat(),
        "level": "udayast",
        "location": location.as_dict(),
        "events": events,
    }
