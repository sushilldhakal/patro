"""AngaState — one anga (tithi, nakshatra, yoga or karana) as a day shows it.

The anga in force, its span and progress, the one that follows it, and — on a
kshaya day, when a third anga starts and ends inside the same day — the one after
that. Built from an engine anga block (``build_tithi_block`` and friends);
timestamps come in already formatted, so this stays free of timezone handling.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class FollowingEnd:
    """When the next anga ends (only known when the block carries it)."""

    end: str | None
    end_ghati_clock: Any
    end_hours_clock: Any


@dataclass(frozen=True)
class ThirdAnga:
    """The anga after the next one, present on kshaya days."""

    name: str | None
    name_ne: str | None
    end_ghati_clock: Any
    end_hours_clock: Any


@dataclass(frozen=True)
class AngaState:
    name: str
    name_ne: str | None
    start: str | None
    end: str | None
    next: str | None
    next_ne: str | None
    end_ghati_clock: Any
    end_hours_clock: Any
    progress: Any
    following_end: FollowingEnd | None = None
    third: ThirdAnga | None = None

    @classmethod
    def from_block(cls, block: Mapping[str, Any], stamp: Callable[[str | None], str | None]) -> AngaState:
        """*stamp* turns a block's ISO instant into the local display string."""
        nxt = block.get("next") or {}
        third = nxt.get("next")
        return cls(
            name=block["name"],
            name_ne=block.get("name_ne"),
            start=stamp(block.get("start_time")),
            end=stamp(block.get("end_time")),
            next=nxt.get("name"),
            next_ne=nxt.get("name_ne"),
            end_ghati_clock=block.get("end_ghati_clock"),
            end_hours_clock=block.get("end_hours_clock"),
            progress=block.get("progress"),
            following_end=FollowingEnd(
                end=stamp(nxt.get("end_time")),
                end_ghati_clock=nxt.get("end_ghati_clock"),
                end_hours_clock=nxt.get("end_hours_clock"),
            ) if nxt.get("end_time") else None,
            third=ThirdAnga(
                name=third.get("name"),
                name_ne=third.get("name_ne"),
                end_ghati_clock=third.get("end_ghati_clock"),
                end_hours_clock=third.get("end_hours_clock"),
            ) if third else None,
        )

    def to_payload(self) -> dict[str, Any]:
        """The day-state JSON shape: ``next_end*`` / ``next_next*`` keys only when known."""
        payload: dict[str, Any] = {
            "name": self.name,
            "name_ne": self.name_ne,
            "start": self.start,
            "end": self.end,
            "next": self.next,
            "next_ne": self.next_ne,
            "end_ghati_clock": self.end_ghati_clock,
            "end_hours_clock": self.end_hours_clock,
            "progress": self.progress,
        }
        if self.following_end is not None:
            payload["next_end"] = self.following_end.end
            payload["next_end_ghati_clock"] = self.following_end.end_ghati_clock
            payload["next_end_hours_clock"] = self.following_end.end_hours_clock
        if self.third is not None:
            payload["next_next"] = self.third.name
            payload["next_next_ne"] = self.third.name_ne
            payload["next_next_end_ghati_clock"] = self.third.end_ghati_clock
            payload["next_next_end_hours_clock"] = self.third.end_hours_clock
        return payload
