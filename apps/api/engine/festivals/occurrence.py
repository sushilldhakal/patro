"""FestivalOccurrence — one festival on the days it falls in one year.

A festival (a rule in ``rules/festival_rules_v3.json``) recurs every year; an
occurrence is one of those instances, so its identity is the festival *and*
its start date — two BS years' Dashains are two occurrences of one festival.
It spans whole civil days, ``start`` through ``end`` inclusive.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass(frozen=True)
class FestivalOccurrence:
    festival_id: str
    name_en: str
    name_ne: str | None
    start: date
    end: date
    kind: str
    category: str | None
    importance: str | None
    is_public_holiday: bool
    notes: str | None

    @classmethod
    def from_rule(
        cls, festival_id: str, rule: Mapping[str, Any], start: date, end: date, *, is_public_holiday: bool,
    ) -> FestivalOccurrence:
        return cls(
            festival_id=festival_id,
            name_en=rule.get("name_en", festival_id),
            name_ne=rule.get("name_ne"),
            start=start,
            end=end,
            kind=rule.get("type", "lunar"),
            category=rule.get("category"),
            importance=rule.get("importance"),
            is_public_holiday=is_public_holiday,
            notes=rule.get("notes"),
        )

    @property
    def duration_days(self) -> int:
        return (self.end - self.start).days + 1

    @property
    def key(self) -> tuple[str, str]:
        return occurrence_key({"id": self.festival_id, "start_date": self.start.isoformat()})

    def covers(self, day: date) -> bool:
        return self.start <= day <= self.end

    def to_payload(self) -> dict[str, Any]:
        return {
            "id": self.festival_id,
            "name_en": self.name_en,
            "name_ne": self.name_ne,
            "start_date": self.start.isoformat(),
            "end_date": self.end.isoformat(),
            "duration_days": self.duration_days,
            "type": self.kind,
            "category": self.category,
            "importance": self.importance,
            "is_public_holiday": self.is_public_holiday,
            "notes": self.notes,
        }


def occurrence_key(row: Mapping[str, Any]) -> tuple[str, str]:
    """A festival row's identity: its id and its start date (``YYYY-MM-DD``)."""
    return row["id"], row.get("start_date", "")


def row_covers(row: Mapping[str, Any], day: date) -> bool:
    """Whether a festival row (``start_date`` … ``end_date``) includes ``day``."""
    return date.fromisoformat(row["start_date"]) <= day <= date.fromisoformat(row["end_date"])
