"""
Human-readable Panchanga day-block renderer (Surya / Toyanath print style).

Transforms canonical Panchanga JSON into linear, print-ready text blocks —
one vertical narrative per day, not a grid or raw ephemeris dump.
"""

from __future__ import annotations

from typing import Any, Literal

from engine.vedic.names_ne import to_nepali_digits
from services.presentation.canonical import to_canonical
from services.presentation.helpers import ENGINE_VERSION, primary_festival

Locale = Literal["en", "ne"]
DAY_SEPARATOR = "────────────────────"


def render_day_block(
    canonical: dict[str, Any],
    *,
    lunar_month: str | None = None,
    bs_month_name: str | None = None,
    locale: Locale = "en",
) -> str:
    """Render one canonical day → Surya/Toyanath-style text block."""
    date_block = canonical.get("date") or {}
    panchanga = canonical.get("panchanga") or {}
    sun = canonical.get("sun") or {}
    astrology = canonical.get("astrology") or {}
    muhurta = canonical.get("muhurta") or {}
    special = canonical.get("special") or {}

    bs_day, month_label = _header_labels(
        date_block.get("bs"),
        lunar_month=lunar_month,
        bs_month_name=bs_month_name,
        locale=locale,
    )

    paksha = _pick(
        locale,
        panchanga.get("paksha_ne"),
        panchanga.get("paksha"),
    )
    tithi = panchanga.get("tithi") or {}
    nakshatra = panchanga.get("nakshatra") or {}
    yoga = panchanga.get("yoga") or {}
    karana = panchanga.get("karana") or {}

    tithi_only = _tithi_without_paksha(
        _pick(locale, tithi.get("name_ne"), tithi.get("name")),
        paksha,
    )
    paksha_line = _paksha_tithi_line(paksha, tithi_only, locale)

    moon_rashi = _pick(
        locale,
        astrology.get("moon_rashi_ne"),
        astrology.get("moon_rashi"),
    )
    nak_name = _pick(locale, nakshatra.get("name_ne"), nakshatra.get("name"))
    yoga_name = _pick(locale, yoga.get("name_ne"), yoga.get("name"))
    karana_name = _pick(locale, karana.get("name_ne"), karana.get("name"))

    festival_line = _festival_line(canonical.get("festivals"), locale)
    special_lines = _special_lines(special, locale)

    lines = [
        f"{bs_day}, {month_label}",
        paksha_line,
        "",
        _sun_line(sun, locale),
        _label(locale, "Moon", "चन्द्र") + f": {moon_rashi or '-'}",
        _nakshatra_line(nak_name, nakshatra.get("end_time"), locale),
        "",
        _ends_line(locale, "Tithi", "तिथि", tithi.get("end_time")),
        _yoga_line(yoga_name, yoga.get("end_time"), locale),
        _label(locale, "Karana", "करण") + f": {karana_name or '-'}",
        "",
        _muhurta_line(locale, "Rahu Kalam", "राहु काल", muhurta.get("rahu_kalam")),
        _muhurta_line(locale, "Yamaganda", "यमगण्ड", muhurta.get("yamaganda")),
        _muhurta_line(locale, "Gulika", "गुलिक", muhurta.get("gulika")),
        _muhurta_line(locale, "Abhijit", "अभिजित", muhurta.get("abhijit")),
    ]

    if festival_line:
        lines.extend(["", festival_line])
    lines.extend(special_lines)

    return "\n".join(lines).rstrip()


def render_day_block_from_state(
    daily_state: dict[str, Any],
    *,
    locale: Locale = "en",
) -> str:
    """Map engine daily_state → canonical → day block text."""
    canonical = to_canonical(daily_state)
    lunar = daily_state.get("lunar_month") or {}
    bs_date = daily_state.get("bs_date") or {}
    return render_day_block(
        canonical,
        lunar_month=lunar.get("name"),
        bs_month_name=bs_date.get("month_name"),
        locale=locale,
    )


def render_dayblock_payload(
    daily_state: dict[str, Any],
    *,
    locale: Locale = "en",
) -> dict[str, Any]:
    """Day block wrapped for JSON API responses."""
    canonical = to_canonical(daily_state)
    text = render_day_block_from_state(daily_state, locale=locale)
    return {
        "meta": {
            "format": "dayblock",
            "locale": locale,
            "engine_version": ENGINE_VERSION,
            "from_cache": daily_state.get("from_cache", False),
        },
        "date": canonical.get("date"),
        "location": canonical.get("location"),
        "text": text,
    }


def render_month_stream(
    month_payload: dict[str, Any],
    *,
    header: dict[str, Any] | None = None,
    locale: Locale = "en",
) -> dict[str, Any]:
    """
    BS month as concatenated day blocks (linear Panchanga page).

    When calendar rows include full `panchanga` daily_state (full=True),
    each block is rich; otherwise a compact block from grid row fields.
    """
    hdr = header or {}
    month_name = _pick(
        locale,
        month_payload.get("month_name_ne"),
        month_payload.get("month_name"),
    )
    bs_year = month_payload.get("year_bs")
    title = f"{month_name} {bs_year}"
    if locale == "ne":
        title = f"{month_name} {to_nepali_digits(str(bs_year))}"

    blocks: list[str] = []
    for row in month_payload.get("calendar", []):
        panchanga_state = row.get("panchanga")
        if panchanga_state:
            state = dict(panchanga_state)
            if not state.get("festivals") and row.get("festivals"):
                state["festivals"] = [{"name": name} for name in row["festivals"]]
            blocks.append(render_day_block_from_state(state, locale=locale))
        else:
            blocks.append(_compact_day_block(row, month_name, locale))

    header_text = f"📅 {title}" if locale == "en" else f"📅 {title}"
    body = f"\n\n{DAY_SEPARATOR}\n\n".join(blocks)
    full_text = f"{header_text}\n\n{DAY_SEPARATOR}\n\n{body}" if blocks else header_text

    return {
        "meta": {
            "format": "dayblock_month",
            "locale": locale,
            "engine_version": ENGINE_VERSION,
            "view": "linear_panchanga_stream",
        },
        "header": {
            "title": title,
            "bs_year": bs_year,
            "bs_month": month_payload.get("month_bs"),
            "month_name": month_name,
            "lunar_month": month_payload.get("lunar_month"),
            "location": (month_payload.get("location") or {}).get("name"),
            "shaka": hdr.get("shaka_sambat"),
            "nepal_sambat": hdr.get("nepal_sambat"),
            "gregorian": hdr.get("gregorian"),
        },
        "days": blocks,
        "text": full_text,
    }


def _compact_day_block(row: dict[str, Any], month_name: str | None, locale: Locale) -> str:
    """Fallback block from lightweight month grid row (no full daily_state)."""
    day = row.get("day")
    if locale == "ne" and day is not None:
        day = to_nepali_digits(str(day))

    lines = [
        f"{day}, {month_name or '-'}",
        row.get("tithi_ne") if locale == "ne" else row.get("tithi") or "-",
        "",
        _sun_line(
            {"sunrise": row.get("sunrise"), "sunset": row.get("sunset")},
            locale,
        ),
        _label(locale, "Nakshatra", "नक्षत्र") + f": {row.get('nakshatra') or '-'}",
    ]
    festivals = row.get("festivals") or []
    if festivals:
        fest_label = _label(locale, "Festival", "पर्व")
        lines.extend(["", f"{fest_label}: {', '.join(festivals)}"])
    return "\n".join(lines)


def _header_labels(
    bs_date: str | None,
    *,
    lunar_month: str | None,
    bs_month_name: str | None,
    locale: Locale,
) -> tuple[str, str]:
    bs_day = "-"
    if bs_date:
        parts = bs_date.split("-")
        if len(parts) == 3:
            bs_day = parts[2].lstrip("0") or parts[2]
    if locale == "ne":
        bs_day = to_nepali_digits(bs_day)
    month_label = lunar_month or bs_month_name or "-"
    return bs_day, month_label


def _pick(locale: Locale, ne: str | None, en: str | None) -> str | None:
    if locale == "ne":
        return ne or en
    return en or ne


def _label(locale: Locale, en: str, ne: str) -> str:
    return ne if locale == "ne" else en


def _paksha_tithi_line(paksha: str | None, tithi_only: str | None, locale: Locale) -> str:
    if not paksha and not tithi_only:
        return "-"
    if locale == "ne":
        if paksha and tithi_only:
            return f"{paksha}, {tithi_only}"
        return paksha or tithi_only or "-"
    if paksha and tithi_only:
        paksha_en = paksha if "Paksha" in paksha else f"{paksha} Paksha"
        return f"{paksha_en}, {tithi_only}"
    return paksha or tithi_only or "-"


def _tithi_without_paksha(tithi_name: str | None, paksha: str | None) -> str | None:
    if not tithi_name:
        return None
    for prefix in ("Shukla ", "Krishna ", "शुक्ल ", "कृष्ण "):
        if tithi_name.startswith(prefix):
            return tithi_name[len(prefix) :]
    if paksha and tithi_name.lower().startswith(paksha.lower()):
        return tithi_name[len(paksha) :].strip(" ,")
    return tithi_name


def _sun_line(sun: dict[str, Any], locale: Locale) -> str:
    sunrise = sun.get("sunrise") or "-"
    sunset = sun.get("sunset") or "-"
    if locale == "ne":
        return f"सूर्योदय {sunrise} | सूर्यास्त {sunset}"
    return f"Sunrise {sunrise} | Sunset {sunset}"


def _nakshatra_line(name: str | None, end_time: str | None, locale: Locale) -> str:
    label = _label(locale, "Nakshatra", "नक्षत्र")
    if not name:
        return f"{label}: -"
    if end_time:
        ends = _label(locale, "ends", "समाप्त")
        return f"{label}: {name} ({ends} {end_time})"
    return f"{label}: {name}"


def _ends_line(locale: Locale, en: str, ne: str, end_time: str | None) -> str:
    label = _label(locale, en, ne)
    return f"{label} {_label(locale, 'ends', 'समाप्त')}: {end_time or '-'}"


def _yoga_line(name: str | None, end_time: str | None, locale: Locale) -> str:
    label = _label(locale, "Yoga", "योग")
    if not name:
        return f"{label}: -"
    if end_time:
        ends = _label(locale, "ends", "समाप्त")
        return f"{label}: {name} ({ends} {end_time})"
    return f"{label}: {name}"


def _muhurta_line(locale: Locale, en: str, ne: str, window: str | None) -> str:
    label = _label(locale, en, ne)
    return f"{label}: {window or '-'}"


def _festival_line(festivals: list[dict[str, Any]] | None, locale: Locale) -> str | None:
    if not festivals:
        return None
    label = _label(locale, "Festival", "पर्व")
    names = [
        _pick(locale, f.get("name_ne"), f.get("name")) or ""
        for f in festivals
    ]
    names = [n for n in names if n]
    if not names:
        primary = primary_festival(festivals)
        if not primary:
            return None
        return f"{label}: {primary}"
    return f"{label}: {', '.join(names)}"


def _special_lines(special: dict[str, Any], locale: Locale) -> list[str]:
    lines: list[str] = []
    if special.get("adhik_maas"):
        lines.append(_label(locale, "Adhik Maas", "अधिक मास"))
    if special.get("kshaya_maas"):
        lines.append(_label(locale, "Kshaya Maas", "क्षय मास"))
    sankranti = special.get("sankranti")
    if sankranti:
        sign = _pick(locale, sankranti.get("sign_ne"), sankranti.get("sign"))
        ts = sankranti.get("timestamp") or ""
        label = _label(locale, "Sankranti", "सङ्क्रान्ति")
        lines.append(f"{label}: {sign} ({ts})")
    return [""] + lines if lines else []
