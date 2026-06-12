"""Format registry — canonical Surya schema is the default; Toyanath derives from it."""

from __future__ import annotations

from typing import Any, Literal

from services.presentation.canonical import to_canonical
from services.presentation.panchanga_renderer import render_dayblock_payload, render_month_stream
from services.presentation.patro import to_patro_month
from services.presentation.rules import Variant, apply_variant
from services.presentation.surya import to_surya, to_surya_month
from services.presentation.toyanath import to_toyanath, to_toyanath_month

FormatStyle = Literal["canonical", "surya", "toyanath", "patro", "dayblock", "raw"]
Locale = Literal["en", "ne"]


def render_panchanga(
    daily_state: dict[str, Any],
    *,
    style: FormatStyle = "surya",
    variant: Variant = "default",
    locale: Locale = "en",
) -> dict[str, Any]:
    if style == "raw":
        return apply_variant(daily_state, variant)

    if style == "dayblock":
        payload = render_dayblock_payload(daily_state, locale=locale)
        return apply_variant(payload, variant)

    if style == "toyanath":
        payload = to_toyanath(daily_state)
    else:
        # canonical and surya share the same Surya Panchanga schema
        payload = to_canonical(daily_state)
        if style == "surya":
            payload["meta"]["format"] = "surya"

    return apply_variant(payload, variant)


def render_panchanga_month(
    month_payload: dict[str, Any],
    *,
    style: FormatStyle = "patro",
    variant: Variant = "default",
    header: dict[str, Any] | None = None,
    locale: Locale = "en",
) -> dict[str, Any]:
    if style == "raw":
        return apply_variant(month_payload, variant)
    if style == "dayblock":
        payload = render_month_stream(month_payload, header=header, locale=locale)
        return apply_variant(payload, variant)
    if style == "toyanath":
        payload = to_toyanath_month(month_payload)
    elif style in ("patro", "canonical", "surya"):
        payload = to_patro_month(month_payload, header=header)
        if style == "surya":
            payload["meta"]["format"] = "surya_month"
    else:
        payload = to_patro_month(month_payload, header=header)
    return apply_variant(payload, variant)
