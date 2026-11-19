"""The calculation a request computes in: a siddhanta — drik (default) or the Surya
Siddhanta — and, under drik, the ayanamsha the reader chose (Lahiri by default).

The middleware (app/siddhanta_middleware.py) picks both per request with
:func:`use_siddhanta` and :func:`use_ayanamsha`; they live in ContextVars, so they
follow the request into the threadpool and never leak into another.
``engine.astronomy.engine.default_engine`` forwards to :func:`current_siddhanta`'s
engine, and drik's engine reads :func:`current_ayanamsha` for every sidereal
position, so every builder — panchanga, BS months, festivals, साइत, kundali —
computes in the reader's calculation.
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
#: The ayanamsha the request asked for (None: the siddhanta's default).
_AYANAMSHA: ContextVar[str | None] = ContextVar("ayanamsha", default=None)

__all__ = [
    "AyanamshaChoice",
    "ComputableRange",
    "DRIK",
    "SIDDHANTA_IDS",
    "SURYA_SIDDHANTA",
    "Siddhanta",
    "calculation_id",
    "current_ayanamsha",
    "requested_ayanamsha",
    "current_siddhanta",
    "is_default_calculation",
    "namespaced_cache_key",
    "resolve_siddhanta",
    "siddhanta",
    "use_ayanamsha",
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


@contextmanager
def use_ayanamsha(requested: str | None) -> Iterator[AyanamshaChoice]:
    """Compute with the ayanamsha *requested* (None: the siddhanta's default) for the block.

    Resolved by the active siddhanta first, so an unknown name raises ValueError here.
    """
    choice = current_siddhanta().resolve_ayanamsha(requested)
    token = _AYANAMSHA.set(requested)
    try:
        yield choice
    finally:
        _AYANAMSHA.reset(token)


def requested_ayanamsha() -> str | None:
    """The raw ayanamsha name the request asked for (None: the default). For the drik engine's
    hot path, which resolves it itself; everything else uses :func:`current_ayanamsha`."""
    return _AYANAMSHA.get()


def current_ayanamsha() -> AyanamshaChoice:
    """The ayanamsha of the current request, as its siddhanta resolves it."""
    return current_siddhanta().resolve_ayanamsha(_AYANAMSHA.get())


def calculation_id() -> str:
    """The request's whole calculation as one stable id, for cache keys.

    ``drik`` for drik with its default (Lahiri — the "nepal" name is the same mode),
    ``drik.<ayanamsha>`` for drik with another (``drik.kp``), the siddhanta's id otherwise.
    Two names for one engine mode share an id, so they share cached results.
    """
    active = current_siddhanta()
    choice = active.resolve_ayanamsha(_AYANAMSHA.get())
    default = active.resolve_ayanamsha(None)
    if choice.mode is None or choice.mode == default.mode:
        return active.id
    from engine.astronomy.sidereal import canonical_ayanamsha_key

    return f"{active.id}.{canonical_ayanamsha_key(choice.mode)}"


def is_default_calculation() -> bool:
    """Drik with its default ayanamsha — the calculation the shared precomputed stores hold."""
    return calculation_id() == DRIK


def namespaced_cache_key(key: str) -> str:
    """*key* for a persistent cache: unchanged for drik with Lahiri, suffixed with the
    calculation otherwise (``~surya_siddhanta``, ``~drik.kp``)."""
    calc = calculation_id()
    namespace = current_siddhanta().cache_namespace if calc == current_siddhanta().id else calc
    return f"{key}~{namespace}" if namespace else key
