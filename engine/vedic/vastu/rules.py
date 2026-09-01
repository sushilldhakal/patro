"""Rule/zone-use data shapes — matches how the real content is structured.

Two shapes, not one, because that's how the actual source content (extracted
from the web client's existing, cross-referenced zone descriptions) is
naturally organized:

  ZoneUse         — per-zone: what's best there, what to avoid, verbatim.
                    This is the audit-safe base layer — zero interpretation.
  RoomZoneMapping — per subject↔zone↔polarity: the *derived* index built by
                    splitting each zone's best/avoid text into individual
                    mentions and matching them to a room/feature/opening
                    subject. Each mapping keeps its original matched phrase
                    so it's checkable against the source, not a black box.

Neither table is invented — see ``data/vastu_zone_uses.json`` /
``data/vastu_room_index.json``, produced by
``dhakal-patro/scripts/extract-vastu-content.mjs``. If a Vastu question has
no rule in either table, the correct answer is "no data available", not a
guess — see ``zones_for_subject`` below, which returns an empty list rather
than inventing a default.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Polarity = Literal["best", "avoid"]
SubjectType = Literal["room", "opening", "feature"]


@dataclass(frozen=True)
class Source:
    id: str
    edition: str | None = None
    chapter: str | None = None
    verse: str | None = None
    page: str | None = None


@dataclass(frozen=True)
class ZoneText:
    ne: str
    en: str


@dataclass(frozen=True)
class ZoneUse:
    granularity: str  # dir8 | dir16 | pada32 | inner4
    id: str
    name: ZoneText | None
    deity: ZoneText | None
    importance: ZoneText | None
    best: ZoneText
    avoid: ZoneText
    sources: tuple[str, ...]
    verification_status: str

    @property
    def ref(self) -> str:
        return f"{self.granularity}:{self.id}"


@dataclass(frozen=True)
class RoomZoneMapping:
    subject: str
    subject_type: SubjectType
    zone: str  # "granularity:id", e.g. "pada32:gandharva"
    polarity: Polarity
    matched_phrase_en: str
    matched_phrase_ne: str | None
    zone_note: str | None


def zones_for_subject(mappings: list[RoomZoneMapping], subject: str, polarity: Polarity) -> list[str]:
    """Deduplicated zone refs for one subject+polarity — a subject can be
    mentioned more than once within the same zone's text (e.g. "puja room,
    meditation, yoga" in one zone all map to subject="puja"), which the raw
    mapping table preserves for audit but a consumer wants collapsed."""
    seen: dict[str, None] = {}
    for m in mappings:
        if m.subject == subject and m.polarity == polarity:
            seen[m.zone] = None
    return list(seen.keys())


def subjects_for_zone(mappings: list[RoomZoneMapping], zone: str) -> list[RoomZoneMapping]:
    return [m for m in mappings if m.zone == zone]
