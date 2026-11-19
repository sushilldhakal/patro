"""Build a profile's kundali in the background as soon as the profile is saved.

Why: a kundali is the one answer that can never come from a shared cache — it
belongs to one birth. Its first open costs the server real work (the chart,
twenty vargas, the dasha tree, the yoga catalog; the report on top). Built
right after the profile is saved, that work happens while the person is still
on the save screen, and the first open is a cache hit (the detail and report
routes keep each built chart on disk, keyed by birth).

It requests the same URL the app sends (packages/read-models profileBirthMoment
+ packages/domain appendInstantParams + api-client fetchKundaliDetail), against
this server's own loopback port, so the stored result is exactly the one the
app will ask for. It goes through the load-shed "personal" lane like any
kundali request: under load it is simply turned away, and the chart is built
on first open as before. Best effort; it never fails the save.
"""

from __future__ import annotations

import logging
import os
import re
import urllib.error
import urllib.request
from typing import Any
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# Mirrors packages/api-client/src/client.ts (KUNDALI_ENGINE_VERSION) and the
# app's default ayanamsha (packages/features … DEFAULT_AYANAMSHA_MODE).
KUNDALI_ENGINE_VERSION = "9"
DEFAULT_AYANAMSHA = "nepal"
REPORT_LANGS = ("ne",)

_DATE = re.compile(r"^\s*(-?\d{1,5})[-/.](\d{1,2})[-/.](\d{1,2})")
_CLOCK = re.compile(r"^\d{1,2}:\d{2}")


def _era(raw: str | None) -> str:
    value = (raw or "bs").strip().lower()
    if value in ("ad", "ce"):
        return "ad"
    if value in ("bc", "bce"):
        return "bc"
    if value == "bbs":
        return "bbs"
    return "bs"


def _num(value: float) -> str:
    """A coordinate as JavaScript's String(number) writes it (27.0 → "27")."""
    text = repr(float(value))
    return text[:-2] if text.endswith(".0") else text


def kundali_query(profile: Any) -> dict[str, str] | None:
    """The query the app sends for this profile's kundali, or None if it has no chart yet."""
    birth_date = getattr(profile, "birth_date", None)
    lat = getattr(profile, "latitude", None)
    lon = getattr(profile, "longitude", None)
    if not birth_date or lat is None or lon is None:
        return None
    m = _DATE.match(birth_date)
    if not m:
        return None
    year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (1 <= month <= 12 and 1 <= day <= 32):
        return None
    birth_time = getattr(profile, "birth_time", None) or ""
    clock = birth_time if _CLOCK.match(birth_time) else "12:00"
    era = _era(getattr(profile, "birth_era", None))
    query = {
        "inputEra": era, "era": era, "year": str(year), "month": str(month),
        "day": str(day), "clock": clock, "ayanamsha": DEFAULT_AYANAMSHA,
    }
    location = {"lat": _num(lat), "lon": _num(lon)}
    tz = getattr(profile, "timezone", None)
    if tz:
        location["timezone"] = tz
    return {**query, "_loc": urlencode(location)}


def _get(url: str, timeout: float) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "vedicpatro-kundali-precompute"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        while resp.read(65536):  # the report streams NDJSON; read it all so it is built and stored
            pass


def precompute_kundali(profile_snapshot: dict[str, Any]) -> None:
    """Background task: build and cache the profile's kundali detail and report."""
    if os.getenv("KUNDALI_PRECOMPUTE", "1") == "0":
        return

    class _P:  # attribute access over the snapshot taken at save time
        pass

    p = _P()
    p.__dict__.update(profile_snapshot)
    query = kundali_query(p)
    if query is None:
        return
    loc = query.pop("_loc")
    base = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/") + "/v1"
    detail = urlencode({**query, "ev": KUNDALI_ENGINE_VERSION})
    urls = [f"{base}/kundali/detail?{detail}&{loc}"]
    for lang in REPORT_LANGS:
        urls.append(f"{base}/kundali/report?{urlencode({**query, 'lang': lang})}&{loc}")
    for url in urls:
        try:
            _get(url, timeout=60)
        except urllib.error.HTTPError as exc:
            if exc.code == 503:  # personal lane busy: leave it for the first open
                return
            logger.info("kundali precompute %s for a saved profile", exc.code)
        except Exception as exc:  # pragma: no cover - best effort
            logger.info("kundali precompute skipped: %s", exc)
            return


def snapshot(profile: Any) -> dict[str, Any]:
    """The birth fields, copied before the DB session closes."""
    return {
        k: getattr(profile, k, None)
        for k in ("birth_date", "birth_time", "birth_era", "latitude", "longitude", "timezone")
    }
