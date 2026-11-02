"""The siddhanta a request computes in — drik (default) or the Surya Siddhanta.

The middleware (app/siddhanta_middleware.py) picks one per request with
:func:`use_siddhanta`; it lives in a ContextVar, so it follows the request into
the threadpool and never leaks into another. ``engine.astronomy.engine.default_engine``
forwards to :func:`current_siddhanta`'s engine, so every builder computes in it.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar

from engine.astronomy.siddhanta.drik import Drik
from engine.astronomy.siddhanta.model import AyanamshaChoice, ComputableRange, Siddhanta
from engine.astronomy.siddhanta.surya_siddhanta import SuryaSiddhanta

DRIK = "drik"
SURYA_SIDDHANTA = "surya_siddhanta"

_SIDDHANTAS: dict[str, Siddhanta] = {DRIK: Drik(), SURYA_SIDDHANTA: SuryaSiddhanta()}
SIDDHANTA_IDS: tuple[str, ...] = tuple(_SIDDHANTAS)

_ALIASES = {"surya": SURYA_SIDDHANTA, "ss": SURYA_SIDDHANTA, "drig": DRIK, "modern": DRIK}

_CURRENT: ContextVar[str] = ContextVar("siddhanta", default=DRIK)

__all__ = [
    "AyanamshaChoice",
    "ComputableRange",
    "DRIK",
    "SIDDHANTA_IDS",
    "SURYA_SIDDHANTA",
    "Siddhanta",
    "current_siddhanta",
    "namespaced_cache_key",
    "resolve_siddhanta",
    "siddhanta",
    "use_siddhanta",
]


def resolve_siddhanta(raw: str | None) -> str:
    """A ``siddhanta`` query value → its id (drik when absent). ValueError when unknown."""
    if raw is None or raw.strip() == "":
        return DRIK
    value = raw.strip().lower().replace("-", "_")
    value = _ALIASES.get(value, value)
    if value not in _SIDDHANTAS:
        raise ValueError(f"siddhanta must be one of {', '.join(SIDDHANTA_IDS)}; got {raw!r}")
    return value


def siddhanta(siddhanta_id: str) -> Siddhanta:
    return _SIDDHANTAS[siddhanta_id]


def current_siddhanta() -> Siddhanta:
    """The siddhanta of the current request (drik outside one)."""
    return _SIDDHANTAS[_CURRENT.get()]


@contextmanager
def use_siddhanta(siddhanta_id: str) -> Iterator[Siddhanta]:
    """Compute in *siddhanta_id* for the duration of the block."""
    chosen = _SIDDHANTAS[siddhanta_id]
    token = _CURRENT.set(siddhanta_id)
    try:
        yield chosen
    finally:
        _CURRENT.reset(token)


def namespaced_cache_key(key: str) -> str:
    """*key* for a persistent cache: unchanged under drik, suffixed with the siddhanta otherwise."""
    namespace = current_siddhanta().cache_namespace
    return f"{key}~{namespace}" if namespace else key
