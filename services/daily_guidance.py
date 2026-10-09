"""Per-profile daily guidance: what to do, what not to do, what to be careful of.

The text is rule-driven (``rules/daily_guidance_v1.json``) so wording can change
without a release, and the same payload feeds the mobile app's local
notifications today and server push later. Everything here is deterministic for a
(profile, date, location) — the app caches it for offline use.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

from engine.astronomy.location import ObserverLocation

GUIDANCE_VERSION = "1"
MAX_DAYS = 31

_RULES_PATH = Path(__file__).resolve().parents[1] / "rules" / "daily_guidance_v1.json"


@lru_cache(maxsize=1)
def _rules() -> dict[str, Any]:
    with _RULES_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def _lines(rule: dict[str, Any] | None, field: str) -> tuple[list[str], list[str]]:
    if not rule:
        return [], []
    return list(rule.get(f"{field}_ne", [])), list(rule.get(f"{field}_en", []))


def _hhmm(value: Any) -> str | None:
    if not value:
        return None
    text = str(value)
    return text[:5] if len(text) >= 5 and text[2] == ":" else None


def _windows(muhurta: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Every शुभ / अशुभ window of the day, exactly as the panchanga page lists them.

    The group a timing arrives in decides its kind, so a window the engine adds
    later (Bhadra, Ganda Moola, Sarvartha Siddhi …) is reminder-able without a
    change here.
    """
    out: list[dict[str, Any]] = []
    for group, kind in (("auspicious_timings", "shubh"), ("inauspicious_timings", "ashubh")):
        for timing in (muhurta or {}).get(group, []) or []:
            key = timing.get("key")
            if not key:
                continue
            for seg in timing.get("segments", []) or []:
                start = _hhmm(seg.get("start_local_time_short"))
                end = _hhmm(seg.get("end_local_time_short"))
                if not start:
                    continue
                out.append(
                    {
                        "kind": kind,
                        "key": key,
                        "name_ne": timing.get("name_ne"),
                        "name_en": timing.get("name_en"),
                        "start": start,
                        "end": end,
                    }
                )
    out.sort(key=lambda w: w["start"])
    return out


def _tithi_rule_key(name: str | None) -> str | None:
    lowered = (name or "").lower()
    for key in _rules()["tithi"]:
        if key in lowered:
            return key
    return None


def build_day_guidance(
    greg: date,
    location: ObserverLocation,
    natal: Any | None = None,
) -> dict[str, Any]:
    """One day's guidance. ``natal`` (a ``NatalChart``) adds the personal tone."""
    from services.panchanga_api import build_daily_state

    rules = _rules()
    state = build_daily_state(greg, location, include_detail=False)

    do_ne: list[str] = []
    do_en: list[str] = []
    dont_ne: list[str] = []
    dont_en: list[str] = []
    careful_ne: list[str] = []
    careful_en: list[str] = []

    def add(rule: dict[str, Any] | None) -> None:
        for field, (ne, en) in (
            ("do", (do_ne, do_en)),
            ("dont", (dont_ne, dont_en)),
            ("careful", (careful_ne, careful_en)),
        ):
            a, b = _lines(rule, field)
            ne.extend(a)
            en.extend(b)

    add(rules["weekday"].get(state.get("weekday_en") or ""))
    tithi_key = _tithi_rule_key((state.get("tithi") or {}).get("name"))
    if tithi_key:
        add(rules["tithi"][tithi_key])
    karana_name = ((state.get("karana") or {}).get("name") or "").lower()
    if "vishti" in karana_name:
        add(rules["karana"]["vishti"])

    windows = _windows(state.get("muhurta"))
    window_keys = {w["key"] for w in windows}
    for key in ("abhijit", "rahu_kalam", "yamaganda", "gulika"):
        if key in window_keys:
            add(rules["windows"][key])

    personal_tone: str | None = None
    if natal is not None:
        from services.rashifal_api import personal_rashifal_for_gregorian

        personal = personal_rashifal_for_gregorian(natal, greg, location, period="daily")
        personal_tone = personal.get("tone")
        add(rules["personal"].get(personal_tone or ""))

    summary_ne = " ".join((do_ne[:1] + careful_ne[:1] + dont_ne[:1])[:2])
    summary_en = " ".join((do_en[:1] + careful_en[:1] + dont_en[:1])[:2])

    return {
        "date": greg.isoformat(),
        "date_bs": state.get("date_bs"),
        "weekday_ne": state.get("weekday"),
        "weekday_en": state.get("weekday_en"),
        "tithi_ne": (state.get("tithi") or {}).get("name_ne"),
        "tithi_en": (state.get("tithi") or {}).get("name"),
        "nakshatra_ne": (state.get("nakshatra") or {}).get("name_ne"),
        "nakshatra_en": (state.get("nakshatra") or {}).get("name"),
        "personal_tone": personal_tone,
        "summary_ne": summary_ne,
        "summary_en": summary_en,
        "do_ne": do_ne,
        "do_en": do_en,
        "dont_ne": dont_ne,
        "dont_en": dont_en,
        "careful_ne": careful_ne,
        "careful_en": careful_en,
        "windows": windows,
    }


def build_guidance_range(
    start: date,
    days: int,
    location: ObserverLocation,
    natal: Any | None = None,
) -> dict[str, Any]:
    days = max(1, min(int(days), MAX_DAYS))
    return {
        "version": GUIDANCE_VERSION,
        "location": {"lat": location.lat, "lon": location.lon, "timezone": location.timezone},
        "days": [build_day_guidance(start + timedelta(days=i), location, natal) for i in range(days)],
    }
