"""Rule compatibility — astronomical truth vs published Panchanga conventions."""

from __future__ import annotations

from typing import Any, Callable, Literal

Variant = Literal["default", "nepal_official", "toyanath", "surya"]

_ADJUSTERS: dict[Variant, Callable[[dict[str, Any]], dict[str, Any]]] = {}


def register_variant(name: Variant, adjuster: Callable[[dict[str, Any]], dict[str, Any]]) -> None:
    _ADJUSTERS[name] = adjuster


def apply_variant(payload: dict[str, Any], variant: Variant = "default") -> dict[str, Any]:
    """
    Apply cultural / publisher-specific adjustments on top of canonical engine output.

    Astronomy (JPL — NASA's Jet Propulsion Laboratory) stays fixed; only interpretation labels and
    display conventions may change between Surya, Toyanath, and regional patro.
    """
    if variant == "default" or variant not in _ADJUSTERS:
        return payload
    adjusted = _ADJUSTERS[variant](payload)
    adjusted.setdefault("meta", {})
    if isinstance(adjusted["meta"], dict):
        adjusted["meta"]["variant"] = variant
    return adjusted


def _nepal_official(payload: dict[str, Any]) -> dict[str, Any]:
    """Nepal government / Hamro Patro style — udaya tithi at local sunrise."""
    meta = {**payload.get("meta", {}), "udaya_anchor": "local_sunrise", "publisher": "nepal_official"}
    return {**payload, "meta": meta}


def _toyanath(payload: dict[str, Any]) -> dict[str, Any]:
    """Toyanath Panchanga Patro — may use 06:00 local for graha in published tables."""
    meta = {**payload.get("meta", {}), "graha_anchor": "06:00_local", "publisher": "toyanath"}
    return {**payload, "meta": meta}


def _surya(payload: dict[str, Any]) -> dict[str, Any]:
    meta = {**payload.get("meta", {}), "engine": "surya_panchanga_api", "publisher": "surya"}
    return {**payload, "meta": meta}


register_variant("nepal_official", _nepal_official)
register_variant("toyanath", _toyanath)
register_variant("surya", _surya)
