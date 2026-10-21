"""The kundali report — a deterministic reading of the birth chart, cached per
birth instant, observer, ayanamsha and language (``kundali_report_cache``).

``/kundali/report`` resolves the birth instant and streams what this returns.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.astronomy.location import ObserverLocation
from engine.astronomy.sidereal import resolve_ayanamsha_mode
from engine.jyotish.interpretation import iter_report
from engine.jyotish.shadbala import compute_shadbala
from engine.jyotish.vimshottari import vimshottari_dasha
from engine.panchanga.at_time import build_planetary_snapshot, resolve_vedic_day_anchor
from services.jyotish.kundali_report_cache import get_cached_report, make_cache_key, store_report_cache
from services.panchanga.panchanga_at_time import build_panchanga_at_time


def _birth_context(instant: datetime, location: ObserverLocation, mode_id: int) -> dict[str, Any]:
    """Gulika/Mandi and day/night birth, which several classical yoga rules read.

    Best effort, as on /kundali/detail: a chart without them still reads.
    """
    context: dict[str, Any] = {"is_day": None, "gulika_lon": None, "mandi_lon": None}
    try:
        panchanga = build_panchanga_at_time(instant, location, ayanamsa=mode_id)
        upagrahas = {row["key"]: row for row in (panchanga.get("detail") or {}).get("upagrahas") or []}
        context["gulika_lon"] = upagrahas.get("gulika", {}).get("longitude")
        context["mandi_lon"] = upagrahas.get("mandi", {}).get("longitude")
        _, sunrise_utc, sunset_utc, _ = resolve_vedic_day_anchor(instant, location)
        context["is_day"] = sunrise_utc <= instant.astimezone(timezone.utc) < sunset_utc
    except Exception:  # noqa: BLE001 - optional inputs; the report reads without them
        pass
    return context


def kundali_report(
    instant: datetime,
    location: ObserverLocation,
    *,
    ayanamsha: str | None = None,
    lang: str | None = None,
    force: bool = False,
) -> tuple[dict[str, Any], list[dict], str]:
    """``(header, records, cache_status)`` for the chart at ``instant``.

    Raises :class:`ValueError` for an unknown ayanamsha or an instant the
    ephemeris cannot place.
    """
    _, mode_id = resolve_ayanamsha_mode(ayanamsha)
    instant_utc = instant.astimezone(timezone.utc)
    snapshot = build_planetary_snapshot(instant_utc, lat=location.lat, lon=location.lon, ayanamsa=mode_id)
    planets, lagna = snapshot["planets"], snapshot["lagna"]
    dasha = vimshottari_dasha(planets["moon"]["longitude"], instant_utc, cycles=1)
    shadbala = compute_shadbala(
        instant_utc, lat=location.lat, lon=location.lon, timezone_name=location.timezone, ayanamsa=mode_id,
    )
    context = _birth_context(instant, location, mode_id)

    report_lang = "en" if str(lang or "ne").startswith("en") else "ne"
    ayanamsha_id = ayanamsha or "lahiri"
    birth_instant = instant.isoformat()
    header = {"ayanamsha": ayanamsha_id, "location": location.as_dict(), "birth_instant": birth_instant}
    cache_key = make_cache_key(birth_instant, location, ayanamsha_id, report_lang)

    records = None if force else get_cached_report(cache_key)
    if records is not None:
        return header, records, "hit"
    records = list(
        iter_report(
            planets, lagna, shadbala, dasha, now=datetime.now(timezone.utc), lang=report_lang,
            is_day=context["is_day"], gulika_lon=context["gulika_lon"], mandi_lon=context["mandi_lon"],
        )
    )
    store_report_cache(
        cache_key,
        birth_instant=birth_instant,
        location=location,
        ayanamsha=ayanamsha_id,
        lang=report_lang,
        records=records,
    )
    return header, records, "miss"
