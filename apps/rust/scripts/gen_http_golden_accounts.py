"""Record the account layer's behaviour as a scripted scenario (Python is the reference).

Run from apps/api against a scratch Postgres database (it is wiped first);
PATRO_GOLDEN_SCENARIO=guidance records the daily-guidance scenario instead:

    PATRO_GOLDEN_DATABASE_URL=postgresql+psycopg://patro@127.0.0.1:5499/patro_py_test \
    REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_accounts.py

Each step is a request; `${name}` in a path, header or body is a value captured
from an earlier response (`capture`), and `${outbox:verify}` / `${outbox:reset}`
is the token of the last verification / reset email. The Rust test
(`tests/http_golden_accounts.rs`) replays the steps against its own database and
compares status, the listed headers and the body after both sides' volatile
values (ids, tokens, timestamps) are replaced by first-seen placeholders.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

URL = os.environ.get("PATRO_GOLDEN_DATABASE_URL")
if not URL or "patro_py_test" not in URL:
    sys.exit("set PATRO_GOLDEN_DATABASE_URL to a scratch database named patro_py_test")

os.environ["DATABASE_URL"] = URL
os.environ["AUTH_DATABASE_ENABLED"] = "true"
os.environ.pop("PATRO_LOCAL_DEV", None)
os.environ["REDIS_URL"] = ""
os.environ["PGTZ"] = "UTC"
os.environ["JWT_SECRET"] = "golden-secret"
os.environ["ADMIN_API_KEY"] = "golden-admin-key"
os.environ["ADMIN_EMAILS"] = "alice.test@example.com"
for key in ("GOOGLE_CLIENT_ID", "GOOGLE_IOS_CLIENT_ID", "GOOGLE_ANDROID_CLIENT_ID", "GOOGLE_CLIENT_IDS",
            "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "SMTP_HOST", "APPLE_BUNDLE_ID", "APPLE_SERVICES_ID",
            "APPLE_CLIENT_IDS"):
    os.environ.pop(key, None)

sys.path.insert(0, os.getcwd())

from sqlalchemy import text  # noqa: E402

from database.db import get_engine, init_db  # noqa: E402

with get_engine().begin() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
init_db()

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from services.identity import emailer  # noqa: E402

OUTBOX: list[dict] = []


def _verify(to, token):
    OUTBOX.append({"kind": "verify", "to": to, "token": token})


def _reset(to, token):
    OUTBOX.append({"kind": "reset", "to": to, "token": token})


def _invite(to, title, ics, *, organizer_name, cancelled=False):
    OUTBOX.append({"kind": "invite", "to": to, "title": title, "ics": ics,
                   "organizer_name": organizer_name, "cancelled": cancelled})


emailer.send_verification_email = _verify
emailer.send_password_reset_email = _reset
emailer.send_event_invite = _invite

HEADERS = ("content-type", "www-authenticate", "cache-control", "content-disposition", "vary", "content-encoding")

A = {"Authorization": "Bearer ${alice}"}
B = {"Authorization": "Bearer ${bob}"}
INSTALL = "8d2f4c1e-3b7a-4f5e-9c2d-1a2b3c4d5e6f"

STEPS: list[dict] = [
    # ── sign-up, log-in, me ──────────────────────────────────────────────────
    {"m": "POST", "p": "/auth/signup", "json": {}},
    {"m": "POST", "p": "/auth/signup", "json": {"email": "nope", "password": "short"}},
    {"m": "POST", "p": "/auth/signup", "json": {"email": "a@b.test", "password": "password123", "full_name": "x" * 121}},
    {"m": "POST", "p": "/auth/signup", "raw": "{bad json", "headers": {"content-type": "application/json"}},
    {"m": "POST", "p": "/auth/signup", "raw": "email=x", "headers": {"content-type": "text/plain"}},
    {"m": "POST", "p": "/auth/signup", "json": {"email": "Alice.Test@Example.COM", "password": "password123"},
     "capture": {"alice": "access_token", "alice_refresh": "refresh_token"}},
    {"m": "POST", "p": "/auth/signup", "json": {"email": "alice.test@example.com", "password": "password123"}},
    {"m": "POST", "p": "/auth/login", "json": {"email": "alice.test@example.com", "password": "wrong-pass"}},
    {"m": "POST", "p": "/auth/login", "json": {"email": "nobody@example.com", "password": "password123"}},
    {"m": "POST", "p": "/auth/login", "json": {"email": "ALICE.test@example.com", "password": "password123"},
     "capture": {"alice2_refresh": "refresh_token"}},
    {"m": "POST", "p": "/auth/login", "json": {"email": "alice.test@example.com", "password": ""}},
    {"m": "GET", "p": "/auth/me"},
    {"m": "GET", "p": "/auth/me", "headers": {"Authorization": "Basic abc"}},
    {"m": "GET", "p": "/auth/me", "headers": {"Authorization": "Bearer"}},
    {"m": "GET", "p": "/auth/me", "headers": {"Authorization": "Bearer not.a.jwt"}},
    {"m": "GET", "p": "/auth/me", "headers": A},
    # ── email verification ──────────────────────────────────────────────────
    {"m": "POST", "p": "/auth/resend-verification", "headers": A},
    {"m": "POST", "p": "/auth/verify-email", "json": {"token": "bogus"}},
    {"m": "POST", "p": "/auth/verify-email", "json": {"token": "${outbox:verify}"}},
    {"m": "POST", "p": "/auth/verify-email", "json": {"token": "${outbox:verify}"}},
    {"m": "GET", "p": "/auth/me", "headers": A},
    {"m": "POST", "p": "/auth/resend-verification", "headers": A},
    # ── refresh rotation ────────────────────────────────────────────────────
    {"m": "POST", "p": "/auth/refresh", "json": {"refresh_token": "${alice_refresh}"}, "capture": {"r3": "refresh_token"}},
    {"m": "POST", "p": "/auth/refresh", "json": {"refresh_token": "${alice_refresh}"}, "capture": {"r4": "refresh_token"}},
    {"m": "POST", "p": "/auth/refresh", "json": {"refresh_token": "${r3}"}},
    {"m": "POST", "p": "/auth/refresh", "json": {"refresh_token": "${alice_refresh}"}},
    {"m": "POST", "p": "/auth/logout", "json": {"refresh_token": "${r4}"}},
    {"m": "POST", "p": "/auth/refresh", "json": {"refresh_token": "${r4}"}},
    {"m": "POST", "p": "/auth/logout", "json": {"refresh_token": "never-issued"}},
    {"m": "POST", "p": "/auth/refresh", "json": {}},
    # ── password reset ──────────────────────────────────────────────────────
    {"m": "POST", "p": "/auth/forgot-password", "json": {"email": "ghost@example.com"}},
    {"m": "POST", "p": "/auth/forgot-password", "json": {"email": "Alice.Test@example.com"}},
    {"m": "POST", "p": "/auth/reset-password", "json": {"token": "bogus", "password": "short"}},
    {"m": "POST", "p": "/auth/reset-password", "json": {"token": "bogus", "password": "longenough1"}},
    {"m": "POST", "p": "/auth/reset-password", "json": {"token": "${outbox:reset}", "password": "newpassword1"}},
    {"m": "POST", "p": "/auth/reset-password", "json": {"token": "${outbox:reset}", "password": "newpassword2"}},
    {"m": "POST", "p": "/auth/login", "json": {"email": "alice.test@example.com", "password": "password123"}},
    {"m": "POST", "p": "/auth/refresh", "json": {"refresh_token": "${alice2_refresh}"}},
    {"m": "POST", "p": "/auth/login", "json": {"email": "alice.test@example.com", "password": "newpassword1"},
     "capture": {"alice": "access_token"}},
    # ── providers (none configured but Apple's default audience) ────────────
    {"m": "POST", "p": "/auth/google", "json": {"id_token": "x"}},
    {"m": "POST", "p": "/auth/facebook", "json": {"access_token": "x"}},
    {"m": "POST", "p": "/auth/apple", "json": {"identity_token": "x", "email": "a@b.com"}},
    {"m": "POST", "p": "/auth/apple", "json": {}},
    # ── a second account ────────────────────────────────────────────────────
    {"m": "POST", "p": "/auth/signup", "json": {"email": "bob@example.org", "password": "bobpassword"},
     "capture": {"bob": "access_token"}},
    # ── profiles ────────────────────────────────────────────────────────────
    {"m": "GET", "p": "/profiles", "headers": A},
    {"m": "GET", "p": "/profiles"},
    {"m": "POST", "p": "/profiles", "headers": A, "json": {"full_name": ""}},
    {"m": "POST", "p": "/profiles", "headers": A,
     "json": {"full_name": "Ram", "latitude": 100, "longitude": "abc", "email": "bad", "is_default": "maybe"}},
    {"m": "POST", "p": "/profiles", "json": {"full_name": ""}},
    {"m": "POST", "p": "/profiles", "headers": A,
     "json": {"full_name": "Ram Sharma", "email": "Ram@Example.COM", "gender": "male", "country": "Nepal",
              "city": "Kathmandu", "location_label": "Kathmandu, Nepal", "latitude": 27.7172, "longitude": 85.324,
              "timezone": "Asia/Kathmandu", "birth_date": "2050-05-15", "birth_time": "06:30", "birth_era": "bs",
              "notes": "self"},
     "capture": {"p1": "id"}},
    {"m": "POST", "p": "/profiles", "headers": A, "json": {"full_name": "Sita", "is_default": False, "latitude": 27},
     "capture": {"p2": "id"}},
    {"m": "POST", "p": "/profiles", "headers": A, "json": {"full_name": "Hari", "is_default": True, "phone": "98"},
     "capture": {"p3": "id"}},
    {"m": "GET", "p": "/profiles", "headers": A},
    {"m": "GET", "p": "/profiles/${p1}", "headers": A},
    {"m": "GET", "p": "/profiles/does-not-exist", "headers": A},
    {"m": "GET", "p": "/profiles/${p1}", "headers": B},
    {"m": "PATCH", "p": "/profiles/${p2}", "headers": A, "json": {"is_default": True, "phone": "123", "notes": None}},
    {"m": "PATCH", "p": "/profiles/${p1}", "headers": A, "json": {"latitude": -91}},
    {"m": "PATCH", "p": "/profiles/${p1}", "headers": A, "json": {}},
    {"m": "PATCH", "p": "/profiles/${p1}", "headers": B, "json": {"phone": "1"}},
    {"m": "GET", "p": "/profiles", "headers": A},
    {"m": "DELETE", "p": "/profiles/${p2}", "headers": A},
    {"m": "DELETE", "p": "/profiles/${p2}", "headers": A},
    {"m": "GET", "p": "/profiles", "headers": A},
    # ── devices ─────────────────────────────────────────────────────────────
    {"m": "POST", "p": "/devices", "headers": A, "json": {"push_token": "short", "platform": "web"}},
    {"m": "POST", "p": "/devices", "headers": A,
     "json": {"push_token": "ExponentPushToken[abc123]", "platform": "ios", "timezone": "Asia/Kathmandu"},
     "capture": {"d1": "id"}},
    {"m": "POST", "p": "/devices", "headers": A,
     "json": {"push_token": "ExponentPushToken[abc123]", "platform": "ios", "locale": "ne"}},
    {"m": "POST", "p": "/devices", "headers": B, "json": {"push_token": "ExponentPushToken[abc123]", "platform": "android"}},
    {"m": "DELETE", "p": "/devices/${d1}", "headers": A},
    {"m": "DELETE", "p": "/devices/${d1}", "headers": B},
    # ── reminder rules ──────────────────────────────────────────────────────
    {"m": "GET", "p": "/reminders", "headers": A},
    {"m": "POST", "p": "/reminders", "headers": A, "json": {"window_kind": "bad", "window_key": "", "lead_minutes": 500}},
    {"m": "POST", "p": "/reminders", "headers": A, "json": {"window_kind": "ashubh", "window_key": "rahu_kalam", "weekdays": [7]}},
    {"m": "POST", "p": "/reminders", "headers": A,
     "json": {"window_kind": "ashubh", "window_key": "rahu_kalam", "weekdays": [3, 1, 3], "profile_id": "${p1}", "label": "Rahu"},
     "capture": {"rem1": "id"}},
    {"m": "POST", "p": "/reminders", "headers": B, "json": {"window_kind": "shubh", "window_key": "abhijit", "profile_id": "${p1}"}},
    {"m": "PUT", "p": "/reminders/${rem1}", "headers": A,
     "json": {"window_kind": "shubh", "window_key": "abhijit", "lead_minutes": 0, "enabled": False}},
    {"m": "PUT", "p": "/reminders/${rem1}", "headers": B, "json": {"window_kind": "shubh", "window_key": "abhijit"}},
    {"m": "GET", "p": "/reminders", "headers": A},
    {"m": "DELETE", "p": "/reminders/${rem1}", "headers": A},
    {"m": "DELETE", "p": "/reminders/${rem1}", "headers": A},
    # ── events ──────────────────────────────────────────────────────────────
    {"m": "POST", "p": "/events", "headers": A, "json": {}},
    {"m": "POST", "p": "/events", "headers": A, "json": {"title": "Naive", "starts_at": "2026-12-01T10:00:00"}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "Backwards", "starts_at": "2026-12-01T10:00:00Z", "ends_at": "2026-12-01T09:00:00Z"}},
    {"m": "POST", "p": "/events", "headers": A, "json": {"title": "R", "starts_at": "2026-12-01T10:00:00Z", "repeat": "hourly"}},
    {"m": "POST", "p": "/events", "headers": A, "json": {"title": "K", "starts_at": "2026-12-01T10:00:00Z", "kind": "meeting"}},
    {"m": "POST", "p": "/events", "headers": A, "json": {"title": "   ", "starts_at": "2026-12-01T10:00:00Z"}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "I", "starts_at": "2026-12-01T10:00:00Z", "invitees": ["ok@example.com", "not an email"]}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "A", "starts_at": "2026-12-01T10:00:00Z", "alerts": [1, 2, 3], "priority": 5}},
    {"m": "POST", "p": "/events", "headers": A, "json": {"title": "D", "starts_at": "tomorrow"}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "P", "starts_at": "2026-12-01T10:00:00Z", "profile_id": "does-not-exist"}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "  Bratabandha, muhurta; family ceremony at the temple with the whole extended family  ", "starts_at": "2026-12-01T10:15:00+05:45",
              "ends_at": "2026-12-01T12:00:00+05:45", "location": " Pashupati ", "notes": "Bring\\nflowers",
              "alerts": [1440, 99999], "repeat": "yearly", "kind": "appointment", "priority": 3,
              "source_kind": "sait", "source_key": "bratabandha", "profile_id": "${p1}",
              "invitees": [" Guest@Example.com ", "guest@example.com", "two@example.org"]},
     "capture": {"e1": "id"}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "Dashain", "all_day": True, "starts_at": "2026-10-20T18:15:00Z", "ends_at": "2026-10-22T18:14:00Z",
              "timezone": "Asia/Kathmandu", "kind": "task", "priority": 1}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "Old one", "starts_at": 1600000000, "repeat": "never"}},
    {"m": "POST", "p": "/events", "headers": A,
     "json": {"title": "From phone", "starts_at": "2026-11-30T03:00:00Z", "source_kind": "device"}},
    {"m": "GET", "p": "/events", "headers": A},
    {"m": "GET", "p": "/events?since=2026-01-01T00:00:00Z", "headers": A},
    {"m": "GET", "p": "/events?since=yesterday", "headers": A},
    {"m": "PUT", "p": "/events/${e1}", "headers": A,
     "json": {"title": "Bratabandha", "starts_at": "2026-12-01T04:30:00Z", "invitees": ["two@example.org", "three@example.net"],
              "notes": None, "timezone": "Asia/Kathmandu"}},
    {"m": "PUT", "p": "/events/${e1}", "headers": B, "json": {"title": "x", "starts_at": "2026-12-01T04:30:00Z"}},
    {"m": "PUT", "p": "/events/${e1}", "headers": A, "json": {"title": "x", "starts_at": "2026-12-01T04:30:00"}},
    # ── the subscription feed ───────────────────────────────────────────────
    {"m": "GET", "p": "/events/feed", "headers": A, "capture": {"feed": "token"}},
    {"m": "GET", "p": "/events/feed", "headers": A},
    {"m": "GET", "p": "/calendar/${feed}.ics", "headers": {"User-Agent": "Mozilla/5.0"}},
    {"m": "GET", "p": "/events/feed", "headers": A},
    {"m": "GET", "p": "/calendar/${feed}.ics", "headers": {"User-Agent": "Google-Calendar-Importer"}},
    {"m": "GET", "p": "/events/feed", "headers": A},
    {"m": "POST", "p": "/events/feed/reset", "headers": A, "capture": {"feed2": "token"}},
    {"m": "GET", "p": "/calendar/${feed}.ics"},
    {"m": "GET", "p": "/calendar/${feed2}.ics", "headers": {"User-Agent": "iOS/17.0 (21A329) dataaccessd/1.0"}},
    {"m": "GET", "p": "/calendar/${feed2}"},
    {"m": "DELETE", "p": "/events/${e1}", "headers": A},
    {"m": "DELETE", "p": "/events/${e1}", "headers": A},
    # ── install analytics ───────────────────────────────────────────────────
    {"m": "POST", "p": "/v1/analytics/install/register", "json": {"installation_id": "x", "platform": "web"}},
    {"m": "POST", "p": "/v1/analytics/install/register",
     "json": {"installation_id": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", "platform": "ios"}},
    {"m": "POST", "p": "/v1/analytics/install/register",
     "json": {"installation_id": "8d2f4c1e-3b7a-1f5e-9c2d-1a2b3c4d5e6f", "platform": "ios"}},
    {"m": "POST", "p": "/v1/analytics/install/register", "headers": A,
     "json": {"installation_id": INSTALL.upper(), "platform": "ios", "app_version": " 1.2.3 ", "os_version": "18.1"},
     "extra_headers": {"cf-ipcountry": "np"}},
    {"m": "POST", "p": "/v1/analytics/install/heartbeat",
     "json": {"installation_id": INSTALL, "platform": "ios", "app_version": "1.2.4", "session_start": True}},
    {"m": "POST", "p": "/v1/analytics/install/register",
     "json": {"installation_id": "1c9e6a47-55aa-4b3c-8d1e-2f3a4b5c6d7e", "platform": "android", "app_version": "1.2.3"},
     "extra_headers": {"cf-ipcountry": "XX"}},
    {"m": "POST", "p": "/v1/analytics/install/ping", "json": {"installation_id": INSTALL, "platform": "ios"}},
    {"m": "POST", "p": "/v1/analytics/install/ping", "json": {"installation_id": INSTALL}},
    {"m": "GET", "p": "/v1/admin/analytics/installs/overview"},
    {"m": "GET", "p": "/v1/admin/analytics/installs/overview", "headers": {"X-Admin-Key": "wrong"}},
    {"m": "GET", "p": "/v1/admin/analytics/installs/overview", "headers": B},
    {"m": "GET", "p": "/v1/admin/analytics/installs/overview", "headers": A},
    {"m": "GET", "p": "/v1/admin/analytics/installs/daily?days=0", "headers": {"X-Admin-Key": "golden-admin-key"}},
    {"m": "GET", "p": "/v1/admin/analytics/installs/daily?days=2", "headers": {"X-Admin-Key": "golden-admin-key"}},
    {"m": "GET", "p": "/v1/admin/analytics/installs/platforms", "headers": {"X-Admin-Key": "golden-admin-key"}},
    {"m": "GET", "p": "/v1/admin/analytics/installs/live", "headers": {"X-Admin-Key": "golden-admin-key"}},
    # ── deleting an account ─────────────────────────────────────────────────
    {"m": "DELETE", "p": "/auth/me", "headers": B},
    {"m": "GET", "p": "/auth/me", "headers": B},
    {"m": "DELETE", "p": "/auth/me", "headers": A},
    {"m": "GET", "p": "/profiles", "headers": A},
]


GUIDANCE_STEPS: list[dict] = [
    {"m": "POST", "p": "/auth/signup", "json": {"email": "carol@example.com", "password": "carolpassword"},
     "capture": {"carol": "access_token"}},
    {"m": "POST", "p": "/auth/signup", "json": {"email": "dave@example.com", "password": "davepassword"},
     "capture": {"dave": "access_token"}},
    {"m": "POST", "p": "/profiles", "headers": {"Authorization": "Bearer ${carol}"},
     "json": {"full_name": "Carol BS", "birth_date": "2050-05-15", "birth_time": "06:30", "birth_era": "bs",
              "latitude": 27.7172, "longitude": 85.324, "timezone": "Asia/Kathmandu"},
     "capture": {"g1": "id"}},
    {"m": "POST", "p": "/profiles", "headers": {"Authorization": "Bearer ${carol}"},
     "json": {"full_name": "No birth"}, "capture": {"g2": "id"}},
    {"m": "POST", "p": "/profiles", "headers": {"Authorization": "Bearer ${carol}"},
     "json": {"full_name": "Carol AD", "birth_date": "1990-02-03", "birth_time": "23:45", "birth_era": "ad",
              "latitude": 40.7128, "longitude": -74.006, "timezone": "America/New_York"},
     "capture": {"g3": "id"}},
    {"m": "POST", "p": "/profiles", "headers": {"Authorization": "Bearer ${carol}"},
     "json": {"full_name": "Bad birth", "birth_date": "2050-05", "latitude": 27.7, "longitude": 85.3},
     "capture": {"g4": "id"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?from=2026-11-22&days=3", "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g2}/daily-guidance?from=2026-11-22&days=2&lat=27.7172&lon=85.324&timezone=Asia/Kathmandu",
     "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g3}/daily-guidance?from=2027-03-14&days=2&lat=40.7128&lon=-74.006&timezone=America/New_York",
     "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g4}/daily-guidance?from=2026-12-31&days=1", "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?days=1", "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?from=2030-01-01T00:00:00&days=1", "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?lat=abc"},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?lat=abc&days=0&from=x", "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?days=40&from=2026-11-22T05:00:00", "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?from=2026-11-22", "headers": {"Authorization": "Bearer ${dave}"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?city=Nowhereville-Zzz", "headers": {"Authorization": "Bearer ${carol}"}},
    {"m": "GET", "p": "/profiles/${g1}/daily-guidance?city=Nowhereville-Zzz"},
]


def substitute(value, env):
    if isinstance(value, str):
        def repl(m):
            name = m.group(1)
            if name.startswith("outbox:"):
                kind = name.split(":", 1)[1]
                return [o for o in OUTBOX if o["kind"] == kind][-1]["token"]
            return env[name]
        return re.sub(r"\$\{([^}]+)\}", repl, value)
    if isinstance(value, dict):
        return {k: substitute(v, env) for k, v in value.items()}
    if isinstance(value, list):
        return [substitute(v, env) for v in value]
    return value


def main() -> None:
    from datetime import datetime, timezone

    guidance = os.environ.get("PATRO_GOLDEN_SCENARIO") == "guidance"
    client = TestClient(app)
    env: dict[str, str] = {}
    out = []
    started = datetime.now(timezone.utc).isoformat()
    for step in (GUIDANCE_STEPS if guidance else STEPS):
        headers = {**step.get("headers", {}), **step.get("extra_headers", {})}
        headers = substitute(headers, env)
        path = substitute(step["p"], env)
        before = len(OUTBOX)
        kwargs = {"headers": headers}
        if "json" in step:
            kwargs["json"] = substitute(step["json"], env)
        if "raw" in step:
            kwargs["content"] = step["raw"]
        resp = client.request(step["m"], path, **kwargs)
        try:
            body = resp.json()
        except ValueError:
            body = resp.text
        if step.get("capture") and resp.status_code >= 300:
            print("CAPTURE FAILED", step, resp.status_code, body)
        for name, key in step.get("capture", {}).items():
            env[name] = body[key]
        out.append({
            "step": step,
            "status": resp.status_code,
            "headers": {h: v for h, v in resp.headers.items() if h not in ("content-length", "date", "server")},
            "body": body,
            "outbox": [{k: v for k, v in o.items() if k != "token"} for o in OUTBOX[before:]],
        })
    fixtures = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
    if guidance:
        dest = fixtures / "http_golden_guidance.json"
        dest.write_text(json.dumps({"now": started, "steps": out}, ensure_ascii=False, indent=1) + "\n")
    else:
        dest = fixtures / "http_golden_accounts.json"
        dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {len(out)} steps to {dest}")


main()
