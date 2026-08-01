from __future__ import annotations

from typing import TYPE_CHECKING

__all__ = ["AstronomyEngine"]

if TYPE_CHECKING:
    from engine.astronomy.engine import AstronomyEngine


def __getattr__(name: str):
    if name == "AstronomyEngine":
        from engine.astronomy.engine import AstronomyEngine

        return AstronomyEngine
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
