"""This context's answer to ``services.panchanga.festival_port.FestivalCalendar``."""

from __future__ import annotations

from datetime import date
from typing import Any

from engine.astronomy.location import ObserverLocation
from services.festivals import holiday_generator, patro_generator


class GeneratedFestivalCalendar:
    """Looks each generator up at call time, so a patched module is honoured."""

    def festivals_on_date(self, target: date, location: ObserverLocation) -> dict[str, Any]:
        return holiday_generator.festivals_on_date(target, location)

    def collect_bs_year_festivals(self, bs_year: int, location: ObserverLocation) -> list[dict]:
        return patro_generator.collect_bs_year_festivals(bs_year, location)

    def festivals_for_day(self, festivals: list[dict], target: date) -> list[dict]:
        return patro_generator.festivals_for_day(festivals, target)
