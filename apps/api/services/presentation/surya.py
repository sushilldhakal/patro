"""Surya Panchanga — canonical is the primary format; this module re-exports it."""

from __future__ import annotations

from typing import Any

from services.presentation.canonical import to_canonical
from services.presentation.patro import to_patro_month


def to_surya(daily_state: dict[str, Any]) -> dict[str, Any]:
    """Surya Panchanga daily response (identical to canonical schema)."""
    payload = to_canonical(daily_state)
    payload["meta"]["format"] = "surya"
    return payload


def to_surya_month(month_payload: dict[str, Any], *, header: dict[str, Any] | None = None) -> dict[str, Any]:
    return to_patro_month(month_payload, header=header)
