"""Shared content helpers for the Facebook panchanga posters (daily + changes).

Single source of truth for the Kathmandu location, the image/link URLs, and
Devanagari-digit formatting so both posters stay consistent.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import config
from engine.astronomy.location import ObserverLocation, resolve_location

KATHMANDU_TZ = ZoneInfo("Asia/Kathmandu")
KATHMANDU_CITY_ID = 1283240  # GeoNames id — used to build the shareable link

_DEVANAGARI_DIGITS = "०१२३४५६७८९"
_ANGA_LABELS = [("tithi", "तिथि"), ("nakshatra", "नक्षत्र"), ("yoga", "योग"), ("karana", "करण")]


def ne_digits(value: str) -> str:
    """Latin → Devanagari digits (non-digits untouched)."""
    return "".join(_DEVANAGARI_DIGITS[int(c)] if c.isdigit() else c for c in value)


def kathmandu_location() -> ObserverLocation:
    return resolve_location(lat=27.7172, lon=85.324, timezone="Asia/Kathmandu", name="Kathmandu")


def image_url(day: date) -> str:
    """Public image URL for Kathmandu on `day` — the full-height chart (full=1),
    the same image the daily poster uses, fetched by Facebook to attach. Served
    via /api/og-image (nginx already proxies /api → FastAPI)."""
    query = urlencode({"city": KATHMANDU_CITY_ID, "date": day.isoformat(), "full": "1"})
    return f"{config.frontend_url()}/api/og-image?{query}"


def page_url() -> str:
    """Bare /panchanga link. No query params on purpose: with no stored
    preference and no URL params, the page already defaults to today in
    Kathmandu — the exact place/date the daily post is about — so the plain
    URL is both simpler and correct."""
    return f"{config.frontend_url()}/panchanga"


def card_page_url(card: str, day: date) -> str:
    """Link for an extra daily post (``periods`` / ``d1``). The ``card`` param picks
    the share image (see services.og_screenshot / the web og-preview page); ``date``
    makes the URL unique per day so Facebook's link-preview cache can't serve
    yesterday's card. ``app`` (only when APP_LINK is set) fills the image's
    reserved mobile-app slot."""
    query = {"card": card, "date": day.isoformat()}
    app = config.app_link()
    if app:
        query["app"] = _strip_scheme(app)
    return f"{config.frontend_url()}/panchanga?{urlencode(query)}"


def _strip_scheme(url: str) -> str:
    return url.removeprefix("https://").removeprefix("http://").rstrip("/")


def app_caption_line() -> str:
    """Caption tail pointing at the mobile app, or "" until APP_LINK is configured."""
    app = config.app_link()
    return f"\n\nमोबाइल एप: {app}" if app else ""


def dated_header(fields: dict[str, Any]) -> str:
    """``मंगलवार · असोज २७, २०८३ (१३ अक्टोबर २०२६) · सूर्योदय ०६:०२ · सूर्यास्त १७:३७``."""
    date_bit = fields["bs_line"] or fields["ad_line"]
    if fields["bs_line"] and fields["ad_line"]:
        date_bit = f"{fields['bs_line']} ({fields['ad_line']})"
    header = " · ".join(x for x in (fields["weekday"], date_bit) if x)
    return header + f" · सूर्योदय {ne_digits(fields['sunrise'])} · सूर्यास्त {ne_digits(fields['sunset'])}"


def _span(block: dict[str, Any] | None) -> str | None:
    if not block or not block.get("start_time") or not block.get("end_time"):
        return None
    return ne_digits(f"{block['start_time']}–{block['end_time']}")


def periods_summary(payload: dict[str, Any]) -> str:
    """One line of headline windows, e.g. ``अभिजित् मुहूर्त ११:२६–१२:१२ · राहु काल १४:४३–१६:१०``."""
    m = payload.get("muhurta") or {}
    items = [
        (n, _span(m.get(k)))
        for n, k in (("अभिजित् मुहूर्त", "abhijit"), ("राहु काल", "rahu_kalam"), ("यमगण्ड", "yamaganda"), ("गुलिक काल", "gulika"))
    ]
    return " · ".join(f"{n} {t}" for n, t in items if t)


def planets_summary(payload: dict[str, Any]) -> str:
    """``सूर्य कन्या · चन्द्र तुला · …`` — each graha's rashi at the payload's anchor."""
    planets = payload.get("planets") or {}
    return " · ".join(
        f"{label} {planets[key].get('rashi_ne') or planets[key].get('rashi_name')}"
        for key, label in _PLANET_NE
        if planets.get(key) and (planets[key].get("rashi_ne") or planets[key].get("rashi_name"))
    )


def periods_caption(fields: dict[str, Any], payload: dict[str, Any], link: str) -> str:
    """शुभ / अशुभ समय post — the headline windows; the image carries the full lists."""
    m = payload.get("muhurta") or {}
    good = [(n, _span(m.get(k))) for n, k in (("अभिजित् मुहूर्त", "abhijit"),)]
    bad = [
        (n, _span(m.get(k)))
        for n, k in (("राहु काल", "rahu_kalam"), ("यमगण्ड", "yamaganda"), ("गुलिक काल", "gulika"))
    ]
    lines = []
    if any(t for _, t in good):
        lines.append("शुभ: " + " · ".join(f"{n} {t}" for n, t in good if t))
    if any(t for _, t in bad):
        lines.append("अशुभ: " + " · ".join(f"{n} {t}" for n, t in bad if t))
    body = "\n".join(lines)
    return (
        f"आजका शुभ र अशुभ समय — काठमाडौँ\n{dated_header(fields)}\n\n"
        + (f"{body}\n\n" if body else "")
        + f"सबै शुभ र अशुभ समय: {link}"
        + app_caption_line()
    )


_PLANET_NE = [
    ("sun", "सूर्य"), ("moon", "चन्द्र"), ("mars", "मंगल"), ("mercury", "बुध"),
    ("jupiter", "बृहस्पति"), ("venus", "शुक्र"), ("saturn", "शनि"), ("rahu", "राहु"), ("ketu", "केतु"),
]


def d1_caption(fields: dict[str, Any], payload: dict[str, Any], link: str) -> str:
    """D1 चक्र / उदयकालिक स्पष्टग्रह post — each graha's rashi at sunrise."""
    planets = payload.get("planets") or {}
    parts = [
        f"{label} {planets[key].get('rashi_ne') or planets[key].get('rashi_name')}"
        for key, label in _PLANET_NE
        if planets.get(key) and (planets[key].get("rashi_ne") or planets[key].get("rashi_name"))
    ]
    return (
        f"आजको ग्रहस्थिति (D1 चक्र) — काठमाडौँ\n{dated_header(fields)}\n\n"
        f"उदयकालिक स्पष्टग्रह (सूर्योदय {ne_digits(fields['sunrise'])}):\n"
        + " · ".join(parts)
        + f"\n\nपूर्ण चक्र: {link}"
        + app_caption_line()
    )


def sunrise_datetime(payload: dict[str, Any], day: date) -> datetime | None:
    """Kathmandu sunrise (HH:MM in the payload) as an aware datetime on `day`."""
    sunrise = (payload.get("sun") or {}).get("sunrise")
    if not sunrise:
        return None
    try:
        hour, minute = (int(x) for x in sunrise.split(":"))
    except ValueError:
        return None
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=KATHMANDU_TZ)


def _parse_local(text: str) -> datetime | None:
    try:
        return datetime.strptime(text, "%Y-%m-%d %H:%M").replace(tzinfo=KATHMANDU_TZ)
    except (ValueError, TypeError):
        return None


def anga_transition_lines(
    payload: dict[str, Any], day: date, location: ObserverLocation
) -> list[str]:
    """One Nepali line per anga describing its change(s) within the sunrise→sunrise
    day, e.g. ``करण: विष्टि → बव (११:५०) → बालव (०१:०२)`` or ``नक्षत्र: ज्येष्ठा (दिनभर)``.

    Each block carries its current name + first boundary (`end`→`next_ne`) and a
    second boundary time (`next_end`); the anga running after that second boundary
    is named with one at-time lookup (needed for karana, which changes twice).
    """
    sunrise = sunrise_datetime(payload, day)
    window_end = (sunrise or datetime(day.year, day.month, day.day, tzinfo=KATHMANDU_TZ)) + timedelta(days=1)

    lines: list[str] = []
    for key, label in _ANGA_LABELS:
        block = payload.get(key) or {}
        current = block.get("name_ne") or block.get("name") or "—"

        segments: list[tuple[datetime, str]] = []
        end = _parse_local(block.get("end", ""))
        if end is not None and end < window_end:
            segments.append((end, block.get("next_ne") or block.get("next") or "—"))
            next_end = _parse_local(block.get("next_end", ""))
            if next_end is not None and next_end < window_end:
                after = _anga_name_at(key, next_end + timedelta(minutes=1), location)
                if after:
                    segments.append((next_end, after))

        if not segments:
            lines.append(f"{label}: {current} (दिनभर)")
            continue
        chain = current
        for when, name in segments:
            chain += f" → {name} ({ne_digits(when.strftime('%H:%M'))})"
        lines.append(f"{label}: {chain}")
    return lines


def _anga_name_at(key: str, instant: datetime, location: ObserverLocation) -> str | None:
    from engine.vedic.at_time import build_panchanga_at_time

    block = build_panchanga_at_time(instant, location).get(key) or {}
    return block.get("name_ne") or block.get("name")
