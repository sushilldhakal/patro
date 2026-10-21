"""Reminder rules and devices — owner-scoped, like profiles.

A reminder is a *rule* ("10 min before Rahu Kaal on Mondays"), not a date. Its
weekdays are 0 (Sunday) to 6, kept sorted and once each. A device is known by
its push token: registering the same token again moves it to whoever is signed
in now. Another user's reminder or device does not exist for you, so a foreign
id and an unknown id fail the same way.
"""

from __future__ import annotations

from typing import Protocol


class ReminderNotFound(LookupError):
    def __init__(self) -> None:
        super().__init__("Reminder not found")


class DeviceNotFound(LookupError):
    def __init__(self) -> None:
        super().__init__("Device not found")


class BadWeekdays(ValueError):
    def __init__(self) -> None:
        super().__init__("weekdays must be 0 (Sunday) to 6")


class Owned(Protocol):
    id: str
    user_id: str


def owned(row: Owned | None, owner_id: str, missing: type[LookupError]) -> Owned:
    if row is None or row.user_id != owner_id:
        raise missing
    return row


def encode_weekdays(days: list[int]) -> str:
    """``[3, 1, 3]`` → ``"1,3"``; raises :class:`BadWeekdays` outside 0..6."""
    if any(d < 0 or d > 6 for d in days):
        raise BadWeekdays
    return ",".join(str(d) for d in sorted(set(days)))


def decode_weekdays(stored: str) -> list[int]:
    return [int(d) for d in stored.split(",") if d != ""]
