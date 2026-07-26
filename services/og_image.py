"""Open Graph share-image renderer for the Panchanga page.

Draws a 1200×630 PNG social preview card from an already-computed panchanga
payload, so a shared /panchanga link (Facebook, X, WhatsApp, …) shows a rich,
date/location-specific preview instead of a single static image.

Pure Pillow — no browser, no Node. Devanagari text needs complex shaping
(matras/conjuncts), which Pillow does via libraqm/HarfBuzz; install libraqm on
the server (`apt-get install libraqm0`) or the Nepali text will render with
misplaced vowel signs. Latin text renders fine either way.
"""

from __future__ import annotations

import io
from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

_FONT_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"

# 1200×630 is the size Facebook/X/LinkedIn recommend for og:image.
_W, _H = 1200, 630

# Brand palette (mirrors the web app's theme tokens).
_CREAM = (247, 243, 234)
_TEAL = (11, 86, 90)
_TEAL_SOFT = (23, 107, 111)
_GOLD = (217, 119, 6)
_GOLD_SOFT = (230, 185, 77)
_INK = (32, 42, 44)
_MUTED = (110, 120, 120)
_WHITE = (255, 255, 255)

_AD_MONTHS_NE = [
    "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
    "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
]

_DEVANAGARI_DIGITS = "०१२३४५६७८९"


def _ne_digits(value: Any) -> str:
    return "".join(_DEVANAGARI_DIGITS[int(c)] if c.isdigit() else c for c in str(value))


@lru_cache(maxsize=None)
def _font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    path = _FONT_DIR / f"Mukta-{weight}.ttf"
    try:
        return ImageFont.truetype(str(path), size, layout_engine=ImageFont.Layout.RAQM)
    except OSError:
        # Fallback: bundled font missing → default bitmap font (Latin only).
        return ImageFont.load_default()


def _text_w(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    return int(draw.textlength(text, font=font))


def _shukla(paksha: str | None) -> bool:
    return "shukla" in (paksha or "").lower()


def _name_ne(block: Any) -> str:
    """Nepali name from a {name, name_ne} anga block, tolerant of missing keys."""
    if isinstance(block, dict):
        return str(block.get("name_ne") or block.get("name") or "—")
    return "—"


def _draw_sun(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, color: tuple) -> None:
    """Small radiating-sun emblem echoing the site favicon."""
    import math

    for i in range(12):
        ang = math.pi * 2 * i / 12
        x1 = cx + math.cos(ang) * (r + 6)
        y1 = cy + math.sin(ang) * (r + 6)
        x2 = cx + math.cos(ang) * (r + 16)
        y2 = cy + math.sin(ang) * (r + 16)
        draw.line((x1, y1, x2, y2), fill=color, width=4)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)


def og_fields(payload: dict[str, Any], *, date_ad: str, location_name: str) -> dict[str, str]:
    """Distil the panchanga payload into the strings the card shows.

    Shared by the PNG renderer and the crawler HTML endpoint so the image and the
    og:title / og:description always agree.
    """
    tithi = payload.get("tithi") or {}
    paksha_label = "शुक्ल पक्ष" if _shukla(payload.get("paksha")) else "कृष्ण पक्ष"

    bs = payload.get("bs_date") or {}
    bs_line = ""
    if bs:
        month_ne = bs.get("month_name_ne") or bs.get("month_name") or ""
        bs_line = f"{month_ne} {_ne_digits(bs.get('day', ''))}, {_ne_digits(bs.get('year', ''))}"

    # Gregorian date as day → month → year (matches the site header).
    ad_line = date_ad
    try:
        y, m, d = (int(x) for x in date_ad.split("-"))
        ad_line = f"{_ne_digits(d)} {_AD_MONTHS_NE[m - 1]} {_ne_digits(y)}"
    except (ValueError, IndexError):
        pass

    sun = payload.get("sun") or {}
    return {
        "weekday": str(payload.get("weekday") or ""),
        "bs_line": bs_line,
        "ad_line": ad_line,
        "paksha": paksha_label,
        "tithi": _name_ne(tithi),
        "nakshatra": _name_ne(payload.get("nakshatra")),
        "yoga": _name_ne(payload.get("yoga")),
        "karana": _name_ne(payload.get("karana")),
        "sunrise": str(sun.get("sunrise") or "—"),
        "sunset": str(sun.get("sunset") or "—"),
        "location": location_name or str((payload.get("location") or {}).get("name") or ""),
    }


def render_panchanga_og(
    payload: dict[str, Any],
    *,
    date_ad: str,
    location_name: str,
) -> bytes:
    """Render the panchanga share card and return PNG bytes."""
    f = og_fields(payload, date_ad=date_ad, location_name=location_name)

    img = Image.new("RGB", (_W, _H), _CREAM)
    draw = ImageDraw.Draw(img)

    # ── Header band ──────────────────────────────────────────────────────────
    band_h = 132
    draw.rectangle((0, 0, _W, band_h), fill=_TEAL)
    draw.rectangle((0, band_h, _W, band_h + 4), fill=_GOLD)

    _draw_sun(draw, 74, band_h // 2, 26, _GOLD_SOFT)
    draw.text((122, 30), "वैदिक पात्रो", font=_font("ExtraBold", 46), fill=_WHITE)
    draw.text((124, 86), "VEDIC PATRO · PANCHANGA", font=_font("Bold", 20), fill=_GOLD_SOFT)

    url_font = _font("Bold", 24)
    draw.text((_W - 40 - _text_w(draw, "vedicpatro.com", url_font), 54),
              "vedicpatro.com", font=url_font, fill=_GOLD_SOFT)

    # ── Location + date line ─────────────────────────────────────────────────
    y = band_h + 42
    loc_font = _font("Bold", 34)
    draw.text((60, y), f.get("location") or "Nepal", font=loc_font, fill=_TEAL)

    # Bikram Sambat leads; the Gregorian date is the small secondary line.
    date_font = _font("Bold", 30)
    date_str = " · ".join(x for x in (f["weekday"], f["bs_line"] or f["ad_line"]) if x)
    draw.text((_W - 60 - _text_w(draw, date_str, date_font), y + 4),
              date_str, font=date_font, fill=_INK)

    if f["bs_line"]:
        draw.text((60, y + 46), f["ad_line"], font=_font("Regular", 26), fill=_MUTED)

    # ── Big tithi ────────────────────────────────────────────────────────────
    ty = y + 108
    draw.text((60, ty), f["paksha"], font=_font("Bold", 30), fill=_GOLD)
    draw.text((58, ty + 40), f["tithi"], font=_font("ExtraBold", 96), fill=_TEAL)

    # ── Nakshatra / Yoga / Karana columns ────────────────────────────────────
    cols = [("नक्षत्र", f["nakshatra"]), ("योग", f["yoga"]), ("करण", f["karana"])]
    col_y = ty + 168
    col_w = (_W - 120) // 3
    label_font = _font("Bold", 24)
    value_font = _font("ExtraBold", 44)
    for i, (label, value) in enumerate(cols):
        cx = 60 + i * col_w
        draw.text((cx, col_y), label, font=label_font, fill=_MUTED)
        draw.text((cx, col_y + 30), value, font=value_font, fill=_INK)

    # ── Sunrise / Sunset ─────────────────────────────────────────────────────
    sy = col_y + 108
    draw.line((60, sy - 14, _W - 60, sy - 14), fill=(224, 216, 200), width=2)
    sun_lbl = _font("Bold", 24)
    sun_val = _font("Bold", 30)
    sr = f"सूर्योदय  {_ne_digits(f['sunrise'])}"
    ss = f"सूर्यास्त  {_ne_digits(f['sunset'])}"
    draw.text((60, sy), sr, font=sun_val, fill=_TEAL)
    draw.text((60 + max(_text_w(draw, sr, sun_val), 260) + 80, sy), ss,
              font=sun_val, fill=_TEAL)
    tagline = "Nepali Calendar · Surya Panchanga"
    draw.text((_W - 60 - _text_w(draw, tagline, sun_lbl), sy + 4),
              tagline, font=sun_lbl, fill=_MUTED)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
