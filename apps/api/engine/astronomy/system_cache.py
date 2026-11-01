"""``functools.lru_cache`` that also keys on the request's calculation system.

A result computed from the ephemeris (a month start, a sankranti moment, a
samvatsara) differs between drik and the Surya Siddhanta, so a plain cache would
hand one system's answer to the other. Use this on anything whose value depends
on ``default_engine``; static data loaders keep the plain ``lru_cache``.
"""

from __future__ import annotations

import functools
from collections.abc import Callable
from typing import Any, TypeVar

from engine.astronomy.engine import active_system

F = TypeVar("F", bound=Callable[..., Any])


def system_lru_cache(maxsize: int | None = 128) -> Callable[[F], F]:
    def decorate(fn: F) -> F:
        @functools.lru_cache(maxsize=maxsize)
        def cached(_system: str, *args: Any, **kwargs: Any) -> Any:
            return fn(*args, **kwargs)

        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return cached(active_system(), *args, **kwargs)

        wrapper.cache_clear = cached.cache_clear  # type: ignore[attr-defined]
        wrapper.cache_info = cached.cache_info  # type: ignore[attr-defined]
        return wrapper  # type: ignore[return-value]

    return decorate
