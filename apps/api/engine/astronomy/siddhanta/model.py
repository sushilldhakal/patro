"""What a siddhanta is: one complete way of computing the sky, chosen per request.

A siddhanta owns everything that differs between traditions — its engine (where
the grahas are, when the Sun rises, the lagna), its own idea of the ayanamsha, the
span of days it can compute, and the namespace its results are cached under — and
answers for all of it itself. Nothing downstream asks *which* siddhanta is active;
it asks the active one (:func:`~engine.astronomy.siddhanta.current_siddhanta`)
for what it needs. Drik never consults the Surya Siddhanta, and the Surya
Siddhanta never consults drik or Lahiri.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from engine.astronomy.engine import EngineBase


@dataclass(frozen=True)
class AyanamshaChoice:
    """The ayanamsha a request computes with, as the siddhanta resolved it.

    ``key`` is what the response reports; ``mode`` is the engine's mode id, or
    None when the siddhanta has a single ayanamsha of its own.
    """

    key: str
    mode: int | None


@dataclass(frozen=True)
class ComputableRange:
    """The days a siddhanta can compute, in JD (UT) and in whole proleptic years."""

    jd_min: float
    jd_max: float
    #: Deepest whole BCE year whose every month builds.
    deepest_bce_year: int
    #: Last whole CE year whose every month builds.
    last_ce_year: int


class Siddhanta(ABC):
    #: Stable id: the API's ``?siddhanta=`` value and the apps' stored preference.
    id: str

    @property
    @abstractmethod
    def engine(self) -> "EngineBase":
        """The engine every position, rise/set and lagna of this siddhanta comes from."""

    @abstractmethod
    def resolve_ayanamsha(self, requested: str | None) -> AyanamshaChoice:
        """The ayanamsha for a request that asked for *requested* (None: the default)."""

    @abstractmethod
    def computable_range(self) -> ComputableRange:
        """The span of days this siddhanta answers for."""

    @property
    def cache_namespace(self) -> str:
        """Prefix that keeps this siddhanta's cached results apart. Empty for drik,
        whose results the shared precomputed stores already hold."""
        return self.id

    def jovian_years_elapsed(self, jd_ut: float) -> int | None:
        """Mean-Jupiter sign ingresses (बार्हस्पत्य years) since a fixed epoch, when the
        siddhanta defines Jupiter's mean motion in closed form; None otherwise."""
        return None
