"""The festivals a panchanga view shows — asked of the Festivals context through a port.

Festivals are downstream of the panchanga (a festival is a rule over tithis and
sankrantis), so this context never imports ``services.festivals``. The daily
and month views still list festivals; ``app.wiring`` plugs the Festivals
context in here at startup.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Protocol

from engine.astronomy.location import ObserverLocation


class FestivalCalendar(Protocol):
    def festivals_on_date(self, target: date, location: ObserverLocation) -> dict[str, Any]:
        """``{"festivals": [...], ...}`` for every festival active on *target*."""
        ...

    def collect_bs_year_festivals(self, bs_year: int, location: ObserverLocation) -> list[dict]: ...

    def festivals_for_day(self, festivals: list[dict], target: date) -> list[dict]:
        """The rows of *festivals* whose start..end range covers *target*."""
        ...


_calendar: FestivalCalendar | None = None


def use_festival_calendar(calendar: FestivalCalendar) -> None:
    global _calendar
    _calendar = calendar


def festival_calendar() -> FestivalCalendar:
    if _calendar is None:
        raise RuntimeError(
            "services.panchanga has no FestivalCalendar; call app.wiring.configure() at startup"
        )
    return _calendar
