"""Anonymous install counting: which app installs exist and when they were last opened.

An install is a random UUID the app generated for itself (see
:class:`database.models.AppInstallation`); nothing here identifies a person or a
device. The app reports in on launch and on return to the foreground; this
module turns those reports into one row per install plus a small event log:

* ``first_open`` — the first report ever from an install.
* ``app_update`` — a report carrying a different app version than the last one.
* ``app_open``   — at most one per install per UTC day, however often it reports.

Counts are of installs that *opened* the app, not of installs still on a phone:
an uninstall sends nothing, so "active in 30 days" is the honest ceiling and the
exact installed base stays a store-side number.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.models import AppInstallation, AppInstallationEvent

PLATFORMS = ("ios", "android")
# What a client may log itself; first_open / app_open / app_update are derived here.
CLIENT_EVENTS = ("app_open",)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _clip(value: str | None, size: int) -> str | None:
    value = (value or "").strip()
    return value[:size] or None


def record_seen(
    db: Session,
    *,
    installation_id: str,
    platform: str,
    app_version: str | None = None,
    os_version: str | None = None,
    country_code: str | None = None,
    user_id: str | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Register an install or refresh its ``last_seen_at``; log the events that follow from it."""
    now = now or datetime.now(timezone.utc)
    app_version = _clip(app_version, 32)
    os_version = _clip(os_version, 32)
    country = (country_code or "").strip().upper()
    # Cloudflare sends XX for unknown and T1 for Tor; neither is a country.
    country = country if len(country) == 2 and country.isalpha() and country != "XX" else None

    row = db.execute(
        select(AppInstallation).where(AppInstallation.installation_id == installation_id)
    ).scalar_one_or_none()
    events: list[str] = []
    if row is None:
        row = AppInstallation(
            installation_id=installation_id,
            platform=platform,
            app_version=app_version,
            os_version=os_version,
            country_code=country,
            user_id=user_id,
            first_seen_at=now,
            last_seen_at=now,
        )
        db.add(row)
        events.append("first_open")
    else:
        if app_version and row.app_version and app_version != row.app_version:
            events.append("app_update")
        if _aware(row.last_seen_at).date() < now.date():
            events.append("app_open")
        row.platform = platform
        row.app_version = app_version or row.app_version
        row.os_version = os_version or row.os_version
        row.country_code = country or row.country_code
        if user_id:
            row.user_id = user_id
        row.is_active = True
        row.last_seen_at = now
    for event_type in events:
        db.add(
            AppInstallationEvent(
                installation_id=installation_id, event_type=event_type, app_version=app_version, created_at=now
            )
        )
    try:
        db.commit()
    except IntegrityError:
        # Two first reports raced on the unique installation_id; the other one registered it.
        db.rollback()
        return {"installation_id": installation_id, "new": False, "events": []}
    return {"installation_id": installation_id, "new": "first_open" in events, "events": events}


def _count(db: Session, *where) -> int:
    return int(db.execute(select(func.count()).select_from(AppInstallation).where(*where)).scalar_one())


def overview(db: Session, now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    def seen(days: int) -> int:
        return _count(db, AppInstallation.last_seen_at >= now - timedelta(days=days))

    return {
        "total_installations": _count(db),
        "active_24h": seen(1),
        "active_7d": seen(7),
        "active_30d": seen(30),
        "android": _count(db, AppInstallation.platform == "android"),
        "ios": _count(db, AppInstallation.platform == "ios"),
        "new_today": _count(db, AppInstallation.first_seen_at >= today),
        "signed_in": _count(db, AppInstallation.user_id.is_not(None)),
        "as_of": now.isoformat(),
    }


def daily(db: Session, days: int = 30, now: datetime | None = None) -> list[dict[str, Any]]:
    """Per UTC day, oldest first: new installs, installs that opened the app, and updates."""
    now = now or datetime.now(timezone.utc)
    first_day = now.date() - timedelta(days=days - 1)
    since = datetime.combine(first_day, datetime.min.time(), tzinfo=timezone.utc)
    rows = db.execute(
        select(
            AppInstallationEvent.installation_id, AppInstallationEvent.event_type, AppInstallationEvent.created_at
        ).where(AppInstallationEvent.created_at >= since)
    ).all()
    new: dict[date, set[str]] = {}
    active: dict[date, set[str]] = {}
    updates: dict[date, int] = {}
    for installation_id, event_type, created_at in rows:
        day = _aware(created_at).date()
        if event_type == "app_update":
            updates[day] = updates.get(day, 0) + 1
            continue
        active.setdefault(day, set()).add(installation_id)
        if event_type == "first_open":
            new.setdefault(day, set()).add(installation_id)
    out = []
    for offset in range(days):
        day = first_day + timedelta(days=offset)
        out.append(
            {
                "date": day.isoformat(),
                "new_installations": len(new.get(day, ())),
                "active_installations": len(active.get(day, ())),
                "app_updates": updates.get(day, 0),
            }
        )
    return out


def platforms(db: Session, now: datetime | None = None) -> dict[str, Any]:
    """Installs by platform, app version and country, with how many were active in 30 days."""
    now = now or datetime.now(timezone.utc)
    recent = now - timedelta(days=30)

    def grouped(column) -> list[dict[str, Any]]:
        rows = db.execute(select(column, AppInstallation.last_seen_at)).all()
        totals: dict[str, list[int]] = {}
        for value, last_seen in rows:
            bucket = totals.setdefault(value or "unknown", [0, 0])
            bucket[0] += 1
            if _aware(last_seen) >= recent:
                bucket[1] += 1
        return [
            {"value": value, "installations": total, "active_30d": active}
            for value, (total, active) in sorted(totals.items(), key=lambda item: -item[1][0])
        ]

    return {
        "platforms": grouped(AppInstallation.platform),
        "app_versions": grouped(AppInstallation.app_version),
        "countries": grouped(AppInstallation.country_code),
    }
