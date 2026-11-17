"""Anonymous install counting: which app installs exist and when they were last opened.

An install is a random UUID the app generated for itself (see
:class:`database.models.AppInstallation`); nothing here identifies a person or a
device. The app reports in on launch and on return to the foreground; this
module turns those reports into one row per install plus a small event log:

* ``first_open`` — the first report ever from an install.
* ``app_update`` — a report carrying a different app version than the last one.
* ``app_open``   — at most one per install per UTC day, however often it reports.

Beside that, each time the app is opened (cold start or back from the background
after a while) it counts one *session* (:func:`record_session`, a running total
per day and platform), and while it is on screen it pings every minute so the
admin page can show who has it open right now (:func:`record_presence`, Redis
only, never stored).

Counts are of installs that *opened* the app, not of installs still on a phone:
an uninstall sends nothing, so "active in 30 days" is the honest ceiling and the
exact installed base stays a store-side number. "Lapsed" (not seen for 30 days)
is the closest stand-in for uninstalls this side can give.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

import time

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.models import AppDailySessions, AppInstallation, AppInstallationEvent
from services.platform import redis_cache

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


# ─── Sessions and presence ────────────────────────────────────────────────────

PRESENCE_KEY = "app-installs"
# How long a ping keeps an install counted as "open now". The app pings every 60 s while on screen.
ONLINE_WINDOW_S = 150
# Longest live window the admin page asks for; older pings are dropped from Redis.
PRESENCE_KEEP_S = 3600


def record_session(db: Session, platform: str, now: datetime | None = None) -> None:
    """Add one app open to today's running total for ``platform``."""
    now = now or datetime.now(timezone.utc)
    day = now.date().isoformat()
    bump = (
        update(AppDailySessions)
        .where(AppDailySessions.day == day, AppDailySessions.platform == platform)
        .values(sessions=AppDailySessions.sessions + 1)
    )
    try:
        if db.execute(bump).rowcount == 0:
            db.add(AppDailySessions(day=day, platform=platform, sessions=1))
        db.commit()
    except IntegrityError:
        # Another worker created today's row between the update and the insert.
        db.rollback()
        db.execute(bump)
        db.commit()


def record_presence(installation_id: str, platform: str, now: float | None = None) -> bool:
    """Mark the install as having the app on screen now. False when Redis is unavailable."""
    return redis_cache.presence_touch(
        PRESENCE_KEY, f"{platform}:{installation_id}", time.time() if now is None else now, PRESENCE_KEEP_S
    )


def live(now: float | None = None) -> dict[str, Any]:
    """Installs with the app open now and in the last 15 / 60 minutes, by platform. Nulls when unknown."""
    now = time.time() if now is None else now

    def window(seconds: int) -> dict[str, int] | None:
        members = redis_cache.presence_members(PRESENCE_KEY, now - seconds)
        if members is None:
            return None
        counts = {"total": len(members), "ios": 0, "android": 0}
        for member in members:
            platform = member.split(":", 1)[0]
            if platform in counts:
                counts[platform] += 1
        return counts

    return {
        "online_now": window(ONLINE_WINDOW_S),
        "last_15m": window(15 * 60),
        "last_60m": window(60 * 60),
        "as_of": datetime.fromtimestamp(now, tz=timezone.utc).isoformat(),
    }


def _sessions_by_day(db: Session, since: date) -> dict[str, dict[str, int]]:
    rows = db.execute(
        select(AppDailySessions.day, AppDailySessions.platform, AppDailySessions.sessions).where(
            AppDailySessions.day >= since.isoformat()
        )
    ).all()
    out: dict[str, dict[str, int]] = {}
    for day, platform, sessions in rows:
        out.setdefault(day, {})[platform] = int(sessions)
    return out


def retention(db: Session, now: datetime | None = None, lookback_days: int = 90) -> dict[str, Any]:
    """Day-1 / day-7 / day-30 retention: of installs first seen on day X, the share that opened the app on X+N.

    Only cohorts old enough to have reached day N count, and only from the last ``lookback_days``.
    A rate is None until at least one cohort qualifies.
    """
    now = now or datetime.now(timezone.utc)
    today = now.date()
    since = datetime.combine(today - timedelta(days=lookback_days + 30), datetime.min.time(), tzinfo=timezone.utc)
    rows = db.execute(
        select(AppInstallationEvent.installation_id, AppInstallationEvent.event_type, AppInstallationEvent.created_at)
        .where(AppInstallationEvent.created_at >= since)
        .where(AppInstallationEvent.event_type.in_(("first_open", "app_open")))
    ).all()
    first: dict[str, date] = {}
    days_open: dict[str, set[date]] = {}
    for installation_id, event_type, created_at in rows:
        day = _aware(created_at).date()
        days_open.setdefault(installation_id, set()).add(day)
        if event_type == "first_open":
            first[installation_id] = day
    out: dict[str, Any] = {}
    for n in (1, 7, 30):
        cohort = [i for i, d in first.items() if today - timedelta(days=lookback_days) <= d <= today - timedelta(days=n)]
        kept = sum(1 for i in cohort if first[i] + timedelta(days=n) in days_open.get(i, ()))
        out[f"d{n}"] = {"rate": (kept / len(cohort)) if cohort else None, "retained": kept, "cohort": len(cohort)}
    return out


def _count(db: Session, *where) -> int:
    return int(db.execute(select(func.count()).select_from(AppInstallation).where(*where)).scalar_one())


def overview(db: Session, now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    def seen(days: int) -> int:
        return _count(db, AppInstallation.last_seen_at >= now - timedelta(days=days))

    total = _count(db)
    active_24h, active_7d, active_30d = seen(1), seen(7), seen(30)
    sessions = _sessions_by_day(db, now.date() - timedelta(days=6))
    sessions_today = sum(sessions.get(now.date().isoformat(), {}).values())
    sessions_7d = sum(sum(day.values()) for day in sessions.values())
    return {
        "total_installations": total,
        "active_24h": active_24h,
        "active_7d": active_7d,
        "active_30d": active_30d,
        "android": _count(db, AppInstallation.platform == "android"),
        "ios": _count(db, AppInstallation.platform == "ios"),
        "new_today": _count(db, AppInstallation.first_seen_at >= today),
        "new_7d": _count(db, AppInstallation.first_seen_at >= today - timedelta(days=6)),
        "signed_in": _count(db, AppInstallation.user_id.is_not(None)),
        # Not seen for 30 days: uninstalled or stopped using it. The app cannot report an uninstall.
        "lapsed_30d": total - active_30d,
        "sessions_today": sessions_today,
        "sessions_7d": sessions_7d,
        "sessions_per_active_today": round(sessions_today / active_24h, 2) if active_24h else None,
        # Stickiness: the share of the month's users who opened the app in the last day.
        "dau_mau": round(active_24h / active_30d, 3) if active_30d else None,
        "retention": retention(db, now),
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
    sessions = _sessions_by_day(db, first_day)
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
                "sessions": sum(sessions.get(day.isoformat(), {}).values()),
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
