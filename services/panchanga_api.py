"""Panchanga computation API — structured time-state responses."""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.positions import ayana_kranti_mark
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.bikram_sambat import (
    bs_month_name,
    bs_to_gregorian,
    format_bs_date,
    get_bs_month_length,
    get_bs_month_start,
    gregorian_to_bs,
    iter_bs_month_days,
    parse_bs_date,
    shaka_year,
)
from engine.vedic.samvatsara import samvatsara_payload_for_bs_year
from engine.vedic.daily import get_daily_panchanga
from services.patro_generator import _collect_bs_year_festivals, _festivals_for_day


def _local_stamp(iso_dt: str | None, timezone_name: str) -> str | None:
    if not iso_dt:
        return None
    from datetime import datetime

    dt = datetime.fromisoformat(iso_dt)
    local = dt.astimezone(resolve_observer_timezone(timezone_name))
    return local.strftime("%Y-%m-%d %H:%M")


def _element_state(block: dict, timezone_name: str) -> dict[str, Any]:
    nxt = block.get("next") or {}
    state = {
        "name": block["name"],
        "name_ne": block.get("name_ne"),
        "start": _local_stamp(block.get("start_time"), timezone_name),
        "end": _local_stamp(block.get("end_time"), timezone_name),
        "next": nxt.get("name"),
        "next_ne": nxt.get("name_ne"),
        "end_ghati_clock": block.get("end_ghati_clock"),
        "end_hours_clock": block.get("end_hours_clock"),
        "progress": block.get("progress"),
    }
    # Carry the next anga's end + any third anga (kshaya days) so the client can
    # render a skipped tithi's ending rather than dropping it.
    if nxt.get("end_time"):
        state["next_end"] = _local_stamp(nxt.get("end_time"), timezone_name)
        state["next_end_ghati_clock"] = nxt.get("end_ghati_clock")
        state["next_end_hours_clock"] = nxt.get("end_hours_clock")
    third = nxt.get("next")
    if third:
        state["next_next"] = third.get("name")
        state["next_next_ne"] = third.get("name_ne")
        state["next_next_end_ghati_clock"] = third.get("end_ghati_clock")
        state["next_next_end_hours_clock"] = third.get("end_hours_clock")
    return state


def resolve_panchanga_date(
    date_key: str,
    *,
    era: Literal["bs", "ad"] = "bs",
) -> date:
    """Resolve ``2083-10-12`` (BS) or ``2027-01-25`` (AD) to Gregorian."""
    if era == "ad":
        return date.fromisoformat(date_key)
    bs_year, bs_month, bs_day = parse_bs_date(date_key)
    return bs_to_gregorian(bs_year, bs_month, bs_day)


def build_daily_state(
    greg: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
    include_detail: bool = True,
) -> dict[str, Any]:
    """Single-day astronomical state — the grid row as JSON."""
    raw = get_daily_panchanga(greg, location, include_festivals=include_festivals)
    from_cache = bool(raw.pop("_from_cache", False))
    bs = raw["bs_date"]
    tz = location.timezone

    payload: dict[str, Any] = {
        "date_bs": format_bs_date(bs["year"], bs["month"], bs["day"]),
        "date_ad": greg.isoformat(),
        "weekday": raw["vaara"]["name_ne"],
        "weekday_en": raw["vaara"]["name_english"],
        "sun": {
            "sunrise": raw["sunrise"]["local_time_short"],
            "sunset": raw["sunset"]["local_time_short"],
            "noon": (raw.get("muhurta") or {}).get("abhijit", {}).get("solar_noon"),
        },
        "moon": {
            "rise": (raw["moonrise"] or {}).get("local_time_short"),
            "set": (raw["moonset"] or {}).get("local_time_short"),
        },
        "tithi": _element_state(raw["tithi"], tz),
        "nakshatra": _element_state(raw["nakshatra"], tz),
        "yoga": _element_state(raw["yoga"], tz),
        "karana": _element_state(raw["karana"], tz),
        "paksha": raw["paksha"]["label_en"],
        "paksha_ne": raw["paksha"]["label_ne"],
        "chandra_rashi": raw["chandra_rashi"]["name"],
        "chandra_rashi_ne": raw["chandra_rashi"]["name_ne"],
        "surya_rashi": raw["surya_rashi"]["name"],
        "surya_rashi_ne": raw["surya_rashi"]["name_ne"],
        "ritu": raw["ritu"]["name"],
        "ritu_ne": raw["ritu"]["name_ne"],
        "aayan": raw["aayan"]["name"],
        "aayan_ne": raw["aayan"]["name_ne"],
        "ayana_mark": ayana_kranti_mark(raw["aayan"]),
        "lagna": raw["lagna"]["name"],
        "lagna_ne": raw["lagna"]["name_ne"],
        "lagna_spans": raw.get("lagna_spans") or [],
        "udaya_lagna": raw.get("udaya_lagna") or [],
        "planets": raw.get("planets"),
        "planets_anchor": raw.get("planets_anchor"),
        "solar_corrections": raw.get("solar_corrections"),
        "dinamaan": raw["dinamaan"]["label_en"],
        "muhurta":  raw.get("muhurta"),
        "nivas_shool": raw.get("nivas_shool"),
        "location": raw["location"],
        "lunar_calendar": raw.get("lunar_calendar"),
        "lunar_month": raw.get("lunar_month"),
        "bs_date": raw["bs_date"],
        "from_cache": from_cache,
    }

    if include_festivals and "festivals" in raw:
        payload["festivals"] = [
            {
                "id": f["id"],
                "name": f.get("name_en") or f.get("name"),
                "name_ne": f.get("name_ne"),
                "type": f.get("type"),
                "category": f.get("category"),
            }
            for f in raw["festivals"]
        ]

    if include_detail:
        payload["detail"] = raw

    hora = raw.get("hora") or []
    payload["hora"] = hora
    payload["hora_day"] = [slot for slot in hora if slot.get("phase") == "day"]
    payload["choghadiya"] = raw.get("choghadiya") or []
    payload["tarabala_table"] = raw.get("tarabala_table")
    payload["chandrabala_table"] = raw.get("chandrabala_table")

    return payload


def _day_festival_names(
    day_festivals: list[dict[str, Any]],
    *,
    exclude_international: bool = False,
) -> list[str]:
    """Festival display names for a calendar day — Nepali-first.

    The month grid renders these strings directly, so we emit ``name_ne`` (the
    Nepali label) and fall back to English only when a Nepali name is missing.
    ``exclude_international`` drops "international"-category observances (World
    days) — used by the panchanga month grid where they add noise.
    """
    names: list[str] = []
    for f in day_festivals:
        if exclude_international and f.get("category") == "international":
            continue
        name = f.get("name_ne") or f.get("name_en") or f.get("name")
        if name:
            names.append(name)
    return names


def build_patro_month(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Printable Surya-style monthly Patro grid (canonical month view)."""
    from services.presentation.patro import to_patro_month

    month_payload = build_month_calendar(bs_year, bs_month, location)
    header = build_calendar_header(bs_year, bs_month, location)
    return to_patro_month(month_payload, header=header)


def build_month_calendar_at_clock(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    clock: str = "12:00",
    *,
    full: bool = False,
    exclude_international: bool = False,
) -> dict[str, Any]:
    """BS month grid with ephemeris-mode panchanga at a fixed civil clock each day."""
    from engine.vedic.at_time import instant_row_from_date

    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")

    festivals = _collect_bs_year_festivals(bs_year, location)
    calendar: list[dict[str, Any]] = []

    for bs_day, greg in iter_bs_month_days(bs_year, bs_month):
        day_festivals = _festivals_for_day(festivals, greg)
        row = instant_row_from_date(greg, clock, location)
        row["festivals"] = _day_festival_names(day_festivals, exclude_international=exclude_international)
        if not full:
            row.pop("panchanga", None)
        calendar.append(row)

    month_start = get_bs_month_start(bs_year, bs_month)
    month_length = get_bs_month_length(bs_year, bs_month)
    mid_greg = bs_to_gregorian(bs_year, bs_month, min(15, month_length))
    mid_panchanga = get_daily_panchanga(mid_greg, location)
    lunar = mid_panchanga["lunar_month"]
    return {
        "year_bs": bs_year,
        "month_bs": bs_month,
        "month_name": bs_month_name(bs_month),
        "month_name_ne": bs_month_name(bs_month, nepali=True),
        "month_start_ad": month_start.isoformat(),
        "month_length": month_length,
        "lunar_month": lunar.get("name"),
        "lunar_month_full": lunar.get("full_name"),
        "lunar_month_is_adhik": lunar.get("is_adhik", False),
        "lunar_month_type": lunar.get("type"),
        "location": location.as_dict(),
        "mode": "ephemeris",
        "clock": clock,
        "calendar": calendar,
    }


def build_month_calendar(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    full: bool = False,
    exclude_international: bool = False,
) -> dict[str, Any]:
    """BS month as a calendar array — the Patro grid as JSON."""
    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")

    festivals = _collect_bs_year_festivals(bs_year, location)
    calendar: list[dict[str, Any]] = []

    for bs_day, greg in iter_bs_month_days(bs_year, bs_month):
        day_festivals = _festivals_for_day(festivals, greg)
        panchanga = get_daily_panchanga(greg, location)
        row: dict[str, Any] = {
            "day": bs_day,
            "date_ad": greg.isoformat(),
            "weekday": panchanga["vaara"]["name_ne"],
            "weekday_en": panchanga["vaara"]["name_english"],
            "weekday_ne": panchanga["vaara"]["name_ne"],
            "tithi": panchanga["tithi"]["name"],
            "tithi_ne": panchanga["tithi"]["name_ne"],
            "paksha": panchanga["paksha"]["name"],
            "paksha_ne": panchanga["paksha"].get("name_ne"),
            "nakshatra": panchanga["nakshatra"]["name"],
            "nakshatra_ne": panchanga["nakshatra"].get("name_ne"),
            "yoga": panchanga["yoga"]["name"],
            "yoga_ne": panchanga["yoga"].get("name_ne"),
            "karana": panchanga["karana"]["name"],
            "karana_ne": panchanga["karana"].get("name_ne"),
            "chandra_rashi": panchanga["chandra_rashi"]["name"],
            "chandra_rashi_ne": panchanga["chandra_rashi"].get("name_ne"),
            "sunrise": panchanga["sunrise"]["local_time_short"],
            "sunset": panchanga["sunset"]["local_time_short"],
            "aayan": panchanga["aayan"]["name"],
            "aayan_ne": panchanga["aayan"]["name_ne"],
            "ayana_mark": ayana_kranti_mark(panchanga["aayan"]),
            "moonrise": (panchanga.get("moonrise") or {}).get("local_time_short"),
            "moonrise_local": (panchanga.get("moonrise") or {}).get("local"),
            "moonset": (panchanga.get("moonset") or {}).get("local_time_short"),
            "moonset_local": (panchanga.get("moonset") or {}).get("local"),
            "festivals": _day_festival_names(day_festivals, exclude_international=exclude_international),
        }
        if full:
            row["panchanga"] = build_daily_state(
                greg,
                location,
                include_festivals=True,
                include_detail=False,
            )
        calendar.append(row)

    month_start = get_bs_month_start(bs_year, bs_month)
    month_length = get_bs_month_length(bs_year, bs_month)
    mid_greg = bs_to_gregorian(bs_year, bs_month, min(15, month_length))
    mid_panchanga = get_daily_panchanga(mid_greg, location)
    lunar = mid_panchanga["lunar_month"]
    return {
        "year_bs": bs_year,
        "month_bs": bs_month,
        "month_name": bs_month_name(bs_month),
        "month_name_ne": bs_month_name(bs_month, nepali=True),
        "month_start_ad": month_start.isoformat(),
        "month_length": month_length,
        "lunar_month": lunar.get("name"),
        "lunar_month_full": lunar.get("full_name"),
        "lunar_month_is_adhik": lunar.get("is_adhik", False),
        "lunar_month_type": lunar.get("type"),
        "location": location.as_dict(),
        "calendar": calendar,
    }


def build_year_sun_times(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Sunrise/sunset/ayana per day for a whole BS year.

    The सूर्यक्रान्ति grid needs only these three facts per day, so this skips
    the full panchanga build entirely: two rise/set searches plus one solar
    longitude per day (~2 ms) instead of ~80 ms — a cold year computes in
    about a second instead of ~30 s.
    """
    from engine.astronomy.positions import get_aayan
    from engine.astronomy.swiss_eph import calculate_sunrise, calculate_sunset
    from engine.vedic.bikram_sambat import BS_MONTH_NAMES_NEPALI

    tz = resolve_observer_timezone(location.timezone)
    months: list[dict[str, Any]] = []

    for bs_month in range(1, 13):
        calendar: list[dict[str, Any]] = []
        for bs_day, greg in iter_bs_month_days(bs_year, bs_month):
            sunrise_utc = calculate_sunrise(
                greg, latitude=location.lat, longitude=location.lon,
                timezone_name=location.timezone,
            )
            sunset_utc = calculate_sunset(
                greg, latitude=location.lat, longitude=location.lon,
                timezone_name=location.timezone,
            )
            aayan = get_aayan(sunrise_utc)
            calendar.append(
                {
                    "day": bs_day,
                    "date_ad": greg.isoformat(),
                    "sunrise": sunrise_utc.astimezone(tz).strftime("%H:%M"),
                    "sunset": sunset_utc.astimezone(tz).strftime("%H:%M"),
                    "aayan": aayan.get("name"),
                    "aayan_ne": aayan.get("name_ne"),
                    "ayana_mark": ayana_kranti_mark(aayan),
                }
            )
        months.append(
            {
                "month_bs": bs_month,
                "month_name": bs_month_name(bs_month),
                "month_name_ne": BS_MONTH_NAMES_NEPALI[bs_month - 1],
                "month_start_ad": get_bs_month_start(bs_year, bs_month).isoformat(),
                "month_length": get_bs_month_length(bs_year, bs_month),
                "calendar": calendar,
            }
        )

    return {
        "year_bs": bs_year,
        "location": location.as_dict(),
        "months": months,
    }


# Per-day state blocks the panchanga *wheel* never reads. The year view renders
# only the wheel (no day-timeline / muhurta / hora panels), so for its bulk
# payload these blocks are dead weight — dropping them shrinks each embedded day
# from ~50 KB to ~5 KB. `lagna_spans` (~6.6 KB/day, half the whole payload) is the
# biggest: the wheel renderer reads the single `lagna` object, never the 12-span
# array (verified in the client's wheel-data buildWheelDetail/buildWheelMarkers —
# lagna_spans is only used by the daily-detail, timeline and month-patro pages,
# which fetch their own full payloads). Full per-day state is still available from
# the daily and month endpoints for the pages that actually show it.
_WHEEL_DAY_DROP_KEYS = frozenset(
    {
        "lagna_spans",
        "muhurta",
        "hora",
        "hora_day",
        "nivas_shool",
        "udaya_lagna",
        "tarabala_table",
        "chandrabala_table",
        "choghadiya",
        "solar_corrections",
        "lunar_calendar",
        "planets_anchor",
    }
)


# Flat top-level per-day keys the wheel actually needs. The client seeds the wheel
# from the nested `panchanga` block and only falls back to these three flat fields
# (date_ad + sunrise/sunset) when the nested copy lacks them; the ~20 other flat
# fields (tithi/nakshatra/yoga/karana/moon/aayan/… ) merely duplicate the nested
# block and are pure transfer weight for the wheel, so they are dropped here.
_WHEEL_DAY_KEEP_FLAT = frozenset({"day", "date_ad", "sunrise", "sunset"})


def _slim_day_for_wheel(day: dict[str, Any]) -> dict[str, Any]:
    """Copy a calendar day trimmed to wheel-only keys (flat + embedded)."""
    embed = day.get("panchanga")
    if not isinstance(embed, dict):
        return day
    slim = {k: v for k, v in day.items() if k in _WHEEL_DAY_KEEP_FLAT}
    slim["panchanga"] = {k: v for k, v in embed.items() if k not in _WHEEL_DAY_DROP_KEYS}
    return slim


def build_year_calendar(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    full: bool = False,
    shape: str = "full",
) -> dict[str, Any]:
    """BS year — all month grids in one payload for year scrubbers.

    ``shape="wheel"`` returns a slimmed payload for the year *wheel*: every day
    lives once in the flat ``calendar`` (with wheel-only per-day state), and
    ``months`` carries month metadata only — no duplicated per-day grids. The
    default ``shape="full"`` keeps the legacy shape (days in both ``months`` and
    ``calendar``) for any consumer that needs the complete state.
    """
    wheel = shape == "wheel"
    months: list[dict[str, Any]] = []
    calendar: list[dict[str, Any]] = []
    year_length = 0

    for bs_month in range(1, 13):
        month_payload = build_month_calendar(bs_year, bs_month, location, full=full)
        year_length += month_payload["month_length"]
        if wheel:
            calendar.extend(_slim_day_for_wheel(d) for d in month_payload["calendar"])
            # Metadata only — the heavy per-day grid is already in `calendar`.
            months.append({k: v for k, v in month_payload.items() if k != "calendar"})
        else:
            months.append(month_payload)
            calendar.extend(month_payload["calendar"])

    return {
        "year_bs": bs_year,
        "year_length": year_length,
        "location": location.as_dict(),
        "months": months,
        "calendar": calendar,
    }


def build_calendar_header(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Multi-era header for a BS month."""
    month_start = get_bs_month_start(bs_year, bs_month)
    mid_greg = bs_to_gregorian(bs_year, bs_month, min(15, get_bs_month_length(bs_year, bs_month)))
    mid_panchanga = get_daily_panchanga(mid_greg, location)
    lunar = mid_panchanga["lunar_month"]
    ns = mid_panchanga["ns_date"]

    greg_label = month_start.strftime("%B %Y")
    ns_label = f"{ns['year']}"
    if ns.get("paksha_ne"):
        ns_label = f"{ns['year']} ({ns['paksha_ne']})"

    return {
        "bikram_sambat": str(bs_year),
        "bikram_sambat_month": bs_month_name(bs_month),
        "bikram_sambat_month_ne": bs_month_name(bs_month, nepali=True),
        "gregorian": greg_label,
        "gregorian_range": {
            "start": month_start.isoformat(),
            "end": (
                bs_to_gregorian(bs_year, bs_month, get_bs_month_length(bs_year, bs_month)).isoformat()
            ),
        },
        "lunar_month": lunar.get("name"),
        "lunar_month_full": lunar.get("full_name"),
        "lunar_month_is_adhik": lunar.get("is_adhik", False),
        "lunar_month_type": lunar.get("type"),
        "shaka_sambat": str(shaka_year(month_start)),
        "samvatsara": samvatsara_payload_for_bs_year(bs_year),
        "nepal_sambat": ns_label,
        "nepal_sambat_detail": ns,
        "location": location.as_dict(),
    }


def build_festivals_for_date(
    date_key: str,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    era: Literal["bs", "ad"] = "bs",
) -> dict[str, Any]:
    greg = resolve_panchanga_date(date_key, era=era)
    bs_year, bs_month, bs_day = gregorian_to_bs(greg)
    festivals = _collect_bs_year_festivals(bs_year, location)
    active = _festivals_for_day(festivals, greg)

    return {
        "date_bs": format_bs_date(bs_year, bs_month, bs_day),
        "date_ad": greg.isoformat(),
        "festivals": [
            {
                "id": f["id"],
                "name": f.get("name_en") or f.get("name"),
                "name_ne": f.get("name_ne"),
                "type": f.get("type"),
                "category": f.get("category"),
            }
            for f in active
        ],
    }


def build_kundali(
    date_key: str,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    era: Literal["bs", "ad"] = "bs",
) -> dict[str, Any]:
    """Planetary positions at sunrise — API-only kundali snapshot."""
    greg = resolve_panchanga_date(date_key, era=era)
    raw = get_daily_panchanga(greg, location)
    bs = raw["bs_date"]
    planets: dict[str, str] = {}

    for name, pos in raw["planets"].items():
        degree = pos["longitude"] % 30
        planets[name] = f"{pos['rashi_name']} {degree:.1f}°"

    return {
        "date_bs": format_bs_date(bs["year"], bs["month"], bs["day"]),
        "date_ad": greg.isoformat(),
        "location": raw["location"],
        "planets": planets,
        "planets_detail": raw["planets"],
        "lagna_note": "Lagna requires birth time; positions are at sunrise (udaya).",
    }
