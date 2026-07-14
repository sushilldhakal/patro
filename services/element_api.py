"""Per-element panchanga API — flexible, reusable building blocks.

Every panchanga element is addressable standalone so the frontend can drive
dedicated element pages. Two element shapes:

* **span** elements (nakshatra, yoga, tithi, karana, chandra-rashi) — continuous
  values with begin→end transitions. ``element_spans`` walks the boundaries over
  any window: "Mrigashira begins 23:04 on Jan 01, ends 20:19 on Jan 02".
* **table** elements (choghadiya, hora, tarabala, chandrabala, panchaka-rahita,
  udaya-lagna, lagna, pushkara) — per-day tables. ``element_month`` returns one
  table per day across a BS month.

Both shapes support ``element_day`` (a single-day slice). Adding an element is a
single ``ELEMENTS`` registry entry — that is the reusable core.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable, Optional

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.positions import (
    KARANA_NAMES,
    get_chandra_rashi,
    get_karana,
    get_nakshatra,
    get_yoga,
)
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.bikram_sambat import get_bs_month_length, get_bs_month_start
from engine.vedic.daily import get_daily_panchanga
from engine.vedic.element_boundaries import (
    find_karana_end,
    find_karana_start,
    find_moon_rashi_end,
    find_nakshatra_end,
    find_nakshatra_start,
    find_yoga_end,
    find_yoga_start,
)
from engine.vedic.names_ne import (
    KARANA_NAMES_NE,
    NAKSHATRA_NAMES_NE,
    TITHI_NAMES_NE,
    YOGA_NAMES_NE,
)
from engine.vedic.tithi import calculate_tithi
from engine.vedic.tithi_boundaries import find_tithi_end, find_tithi_start

# ── "current value at instant" resolvers → (number, name_en, name_ne, extra) ──


def _nakshatra_current(dt: datetime) -> tuple[int, str, str, dict[str, Any]]:
    num, name_en, progress = get_nakshatra(dt)
    return num, name_en, NAKSHATRA_NAMES_NE[num - 1], {"progress": round(progress, 4)}


def _yoga_current(dt: datetime) -> tuple[int, str, str, dict[str, Any]]:
    num, name_en, progress = get_yoga(dt)
    return num, name_en, YOGA_NAMES_NE[num - 1], {"progress": round(progress, 4)}


def _karana_current(dt: datetime) -> tuple[int, str, str, dict[str, Any]]:
    _, name_en = get_karana(dt)
    try:
        idx = KARANA_NAMES.index(name_en)
    except ValueError:
        idx = -1
    name_ne = KARANA_NAMES_NE[idx] if 0 <= idx < len(KARANA_NAMES_NE) else name_en
    return (idx + 1 if idx >= 0 else 0), name_en, name_ne, {}


def _tithi_current(dt: datetime) -> tuple[int, str, str, dict[str, Any]]:
    t = calculate_tithi(dt)
    num = int(t["display_number"])
    paksha = t["paksha"]
    name_en = t["name"]
    if num == 15:
        name_ne = "पूर्णिमा" if paksha == "shukla" else "औंसी"
    else:
        name_ne = TITHI_NAMES_NE[num - 1]
    return num, name_en, name_ne, {"paksha": paksha}


def _chandra_rashi_current(dt: datetime) -> tuple[int, str, str, dict[str, Any]]:
    d = get_chandra_rashi(dt)
    return int(d["number"]), d["name"], d.get("name_ne", d["name"]), {}


# ── table extractors (raw daily payload → element data) ──────────────────────


def _extract_pushkara(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Pushkara Navamsha windows pulled out of the udaya-lagna table."""
    out: list[dict[str, Any]] = []
    for entry in raw.get("udaya_lagna") or []:
        pn = entry.get("pushkara_navamsha") or []
        if pn:
            out.append(
                {
                    "lagna": entry.get("name"),
                    "lagna_ne": entry.get("name_ne"),
                    "start_local_time_short": entry.get("start_local_time_short"),
                    "end_local_time_short": entry.get("end_local_time_short"),
                    "pushkara_navamsha": pn,
                }
            )
    return out


@dataclass(frozen=True)
class ElementSpec:
    key: str  # daily-payload key for the single-day slice
    label_ne: str
    label_en: str
    kind: str = "span"  # "span" | "table"
    current: Optional[Callable[[datetime], tuple[int, str, str, dict[str, Any]]]] = None
    start_of: Optional[Callable[[datetime], datetime]] = None
    end_of: Optional[Callable[[datetime], datetime]] = None
    extract: Optional[Callable[[dict[str, Any]], Any]] = None
    lookback_hours: float = 30.0  # span start search window when start_of is absent


ELEMENTS: dict[str, ElementSpec] = {
    # ── span elements ────────────────────────────────────────────────────────
    "nakshatra": ElementSpec(
        "nakshatra", "नक्षत्र", "Nakshatra", "span",
        _nakshatra_current, find_nakshatra_start, find_nakshatra_end,
    ),
    "yoga": ElementSpec(
        "yoga", "योग", "Yoga", "span", _yoga_current, find_yoga_start, find_yoga_end
    ),
    "tithi": ElementSpec(
        "tithi", "तिथि", "Tithi", "span", _tithi_current, find_tithi_start, find_tithi_end
    ),
    "karana": ElementSpec(
        "karana", "करण", "Karana", "span", _karana_current, find_karana_start, find_karana_end
    ),
    "chandra-rashi": ElementSpec(
        "chandra_rashi", "चन्द्र राशि", "Moon sign", "span",
        current=_chandra_rashi_current, end_of=find_moon_rashi_end, lookback_hours=72.0,
    ),
    # ── table elements (per-day) ──────────────────────────────────────────────
    "choghadiya": ElementSpec("choghadiya", "चौघडिया", "Choghadiya", "table"),
    "hora": ElementSpec("hora", "होरा", "Hora", "table"),
    "tarabala": ElementSpec("tarabala_table", "ताराबल", "Tarabala", "table"),
    "chandrabala": ElementSpec("chandrabala_table", "चन्द्रबल", "Chandrabala", "table"),
    "panchaka-rahita": ElementSpec("panchaka_rahita", "पञ्चक रहित", "Panchaka Rahita", "table"),
    "udaya-lagna": ElementSpec("udaya_lagna", "उदय लग्न", "Udaya Lagna", "table"),
    "lagna": ElementSpec("udaya_lagna", "लग्न", "Lagna", "table"),
    "pushkara": ElementSpec(
        "udaya_lagna", "पुष्कर नवांश", "Pushkara Navamsha", "table", extract=_extract_pushkara
    ),
}


def list_elements() -> list[dict[str, str]]:
    return [
        {"id": k, "label_ne": s.label_ne, "label_en": s.label_en, "kind": s.kind}
        for k, s in ELEMENTS.items()
    ]


def _spec(name: str) -> ElementSpec:
    spec = ELEMENTS.get(name)
    if spec is None:
        raise ValueError(f"Unknown element '{name}'. Available: {', '.join(ELEMENTS)}")
    return spec


def _element_data(spec: ElementSpec, raw: dict[str, Any]) -> Any:
    return spec.extract(raw) if spec.extract else raw.get(spec.key)


def element_day(name: str, greg: date, location: ObserverLocation = DEFAULT_LOCATION) -> dict[str, Any]:
    """Single-day slice: just this element's block from the daily payload."""
    spec = _spec(name)
    raw = get_daily_panchanga(greg, location)
    return {
        "element": name,
        "kind": spec.kind,
        "label_ne": spec.label_ne,
        "label_en": spec.label_en,
        "date_ad": greg.isoformat(),
        "sunrise": (raw.get("sunrise") or {}).get("local_time_short"),
        "sunset": (raw.get("sunset") or {}).get("local_time_short"),
        "location": raw.get("location"),
        "data": _element_data(spec, raw),
    }


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _stamp(dt: datetime, tz) -> dict[str, Any]:
    """Both machine ISO and pre-formatted display for one boundary instant."""
    local = _as_utc(dt).astimezone(tz)
    return {
        "iso": local.isoformat(),
        "weekday": local.strftime("%a"),
        "date_label": local.strftime("%b %d"),
        "time_label": local.strftime("%H:%M"),
        "display": f"{local.strftime('%H:%M')} on {local.strftime('%b %d')}",
    }


def _find_start_generic(
    cursor: datetime,
    current: Callable[[datetime], tuple[int, str, str, dict[str, Any]]],
    lookback_hours: float,
) -> datetime:
    """Backward binary-search the start of the span active at ``cursor``.

    Used for span elements that expose only an ``end_of`` boundary finder.
    """
    target = current(cursor)[0]
    lo = cursor - timedelta(hours=lookback_hours)
    if current(lo)[0] == target:
        return lo  # span longer than the lookback window — approximate
    hi = cursor
    for _ in range(48):
        mid = lo + (hi - lo) / 2
        if current(mid)[0] == target:
            hi = mid
        else:
            lo = mid
        if (hi - lo).total_seconds() < 20:
            break
    return hi


def element_spans(
    name: str,
    start: date,
    end: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Continuous begin→end spans of a span element over [start, end] (inclusive)."""
    spec = _spec(name)
    if spec.kind != "span" or spec.current is None or spec.end_of is None:
        raise TypeError(f"Element '{name}' is a {spec.kind} element — use day/month, not spans.")
    tz = resolve_observer_timezone(location.timezone)
    start_utc = datetime(start.year, start.month, start.day, tzinfo=tz).astimezone(timezone.utc)
    end_utc = (datetime(end.year, end.month, end.day, tzinfo=tz) + timedelta(days=1)).astimezone(timezone.utc)

    spans: list[dict[str, Any]] = []
    cursor = start_utc
    prev_end: datetime | None = None
    guard = 0
    while cursor < end_utc and guard < 4000:
        guard += 1
        number, name_en, name_ne, extra = spec.current(cursor)
        seg_end = _as_utc(spec.end_of(cursor))
        if seg_end <= cursor:  # never stall
            seg_end = cursor + timedelta(hours=1)
        if prev_end is not None:
            seg_start = prev_end
        elif spec.start_of is not None:
            seg_start = _as_utc(spec.start_of(cursor))
        else:
            seg_start = _find_start_generic(cursor, spec.current, spec.lookback_hours)
        span: dict[str, Any] = {
            "number": number,
            "name": name_en,
            "name_ne": name_ne,
            "begins": _stamp(seg_start, tz),
            "ends": _stamp(seg_end, tz),
        }
        if extra:
            span.update(extra)
        spans.append(span)
        prev_end = seg_end
        cursor = seg_end + timedelta(seconds=1)

    return {
        "element": name,
        "kind": "span",
        "label_ne": spec.label_ne,
        "label_en": spec.label_en,
        "timezone": location.timezone,
        "location": location.as_dict(),
        "window": {"start": start.isoformat(), "end": end.isoformat()},
        "spans": spans,
    }


def element_month(
    name: str,
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Per-day tables (or day-slices) for one element across a whole BS month."""
    spec = _spec(name)
    start = get_bs_month_start(bs_year, bs_month)
    length = get_bs_month_length(bs_year, bs_month)

    days: list[dict[str, Any]] = []
    for i in range(length):
        greg = start + timedelta(days=i)
        raw = get_daily_panchanga(greg, location)
        vaara = raw.get("vaara") or {}
        days.append(
            {
                "date_ad": greg.isoformat(),
                "bs_day": i + 1,
                "weekday_ne": vaara.get("name_ne"),
                "weekday_en": vaara.get("name_english"),
                "sunrise": (raw.get("sunrise") or {}).get("local_time_short"),
                "sunset": (raw.get("sunset") or {}).get("local_time_short"),
                "data": _element_data(spec, raw),
            }
        )

    return {
        "element": name,
        "kind": spec.kind,
        "label_ne": spec.label_ne,
        "label_en": spec.label_en,
        "bs_year": bs_year,
        "bs_month": bs_month,
        "start_ad": start.isoformat(),
        "location": location.as_dict(),
        "days": days,
    }
