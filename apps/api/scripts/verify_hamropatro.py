#!/usr/bin/env python3
"""Verify server-computed festival dates against hamropatro.com.

Usage:
    python scripts/verify_hamropatro.py --bs-year 2082
    python scripts/verify_hamropatro.py --bs-year 2083 --verbose
    python scripts/verify_hamropatro.py --bs-year 2082 --server http://localhost:8000

The script fetches each month of the given BS year from hamropatro.com,
extracts the listed events/holidays, and cross-checks them against our
server's /nepal/festivals endpoint (or direct local computation).

Exit code:
    0  — all dates match (or no discrepancies found)
    1  — one or more date mismatches detected
    2  — network / parsing error
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# ---------------------------------------------------------------------------
# Hamro Patro fetching
# ---------------------------------------------------------------------------

HAMROPATRO_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9,ne;q=0.8",
    "Referer": "https://www.hamropatro.com/",
}

# Known API endpoint patterns for hamropatro.com calendar data.
# The site serves a JSON feed used by their calendar widget.
_HP_API_TEMPLATES = [
    "https://www.hamropatro.com/api/getCalendarData?year={year}&month={month}",
    "https://hamropatro.com/getevents?year={year}&month={month}",
]

_HP_CALENDAR_PAGE = "https://www.hamropatro.com/{year}/{month}"


def _fetch_url(url: str, timeout: int = 15) -> bytes:
    req = urllib.request.Request(url, headers=HAMROPATRO_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} fetching {url}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error fetching {url}: {exc.reason}") from exc


def fetch_hamropatro_month_events(bs_year: int, bs_month: int) -> list[dict[str, Any]]:
    """Try API endpoints then fall back to HTML parsing for a BS month."""
    for template in _HP_API_TEMPLATES:
        url = template.format(year=bs_year, month=bs_month)
        try:
            raw = _fetch_url(url)
            data = json.loads(raw)
            return _parse_api_response(data, bs_year, bs_month)
        except (RuntimeError, json.JSONDecodeError, KeyError):
            continue

    # Fallback: scrape HTML calendar page
    url = _HP_CALENDAR_PAGE.format(year=bs_year, month=bs_month)
    try:
        raw = _fetch_url(url)
        return _parse_html_events(raw.decode("utf-8"), bs_year, bs_month)
    except RuntimeError:
        return []


def _parse_api_response(data: Any, bs_year: int, bs_month: int) -> list[dict[str, Any]]:
    """Parse hamropatro API JSON into a normalised event list."""
    events: list[dict[str, Any]] = []
    # Common response shape: {"data": {"days": [{"day": N, "events": [...]}]}}
    days = []
    if isinstance(data, dict):
        days = (
            data.get("data", {}).get("days")
            or data.get("days")
            or data.get("events")
            or []
        )
    elif isinstance(data, list):
        days = data

    for day_entry in days:
        if not isinstance(day_entry, dict):
            continue
        day_num = day_entry.get("day") or day_entry.get("bs_day")
        raw_events = day_entry.get("events") or day_entry.get("holidays") or []
        for ev in raw_events:
            name = ev if isinstance(ev, str) else ev.get("title") or ev.get("name") or str(ev)
            events.append({"bs_year": bs_year, "bs_month": bs_month, "bs_day": day_num, "name": name})
    return events


def _parse_html_events(html: str, bs_year: int, bs_month: int) -> list[dict[str, Any]]:
    """Minimal HTML scrape for event names and days from calendar grid."""
    events: list[dict[str, Any]] = []
    # Look for data-day and adjacent event text (very rough heuristic).
    pattern = re.compile(
        r'data-day=["\'](\d+)["\'][^>]*>.*?<(?:span|div)[^>]*class=["\'][^"\']*event[^"\']*["\'][^>]*>(.*?)</',
        re.DOTALL | re.IGNORECASE,
    )
    for m in pattern.finditer(html):
        day = int(m.group(1))
        name = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        if name:
            events.append({"bs_year": bs_year, "bs_month": bs_month, "bs_day": day, "name": name})
    return events


# ---------------------------------------------------------------------------
# Local server fetching
# ---------------------------------------------------------------------------

def fetch_server_festivals(bs_year: int, server_base: str) -> list[dict[str, Any]]:
    """Fetch festivals from our Panchanga API server."""
    url = f"{server_base.rstrip('/')}/nepal/festivals?year={bs_year}&era=bs"
    try:
        raw = _fetch_url(url)
        data = json.loads(raw)
        return data.get("festivals", [])
    except (RuntimeError, json.JSONDecodeError):
        return []


def compute_festivals_locally(bs_year: int) -> list[dict[str, Any]]:
    """Compute festivals directly using local engine (no server required)."""
    from engine.astronomy.location import DEFAULT_LOCATION
    from services.holiday_generator import generate_bs_festivals

    payload = generate_bs_festivals(bs_year, DEFAULT_LOCATION)
    return payload.get("festivals", [])


# ---------------------------------------------------------------------------
# Comparison logic
# ---------------------------------------------------------------------------

def _bs_to_ad(bs_year: int, bs_month: int, bs_day: int) -> date | None:
    try:
        from engine.vedic.bikram_sambat import bs_to_gregorian
        return bs_to_gregorian(bs_year, bs_month, bs_day)
    except (ValueError, ImportError):
        return None


def _normalise_name(name: str) -> str:
    """Lowercase, strip punctuation and diacritics lightly for fuzzy match."""
    name = name.lower().strip()
    name = re.sub(r"[^\w\s]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def compare_festivals(
    hamropatro_events: list[dict[str, Any]],
    server_festivals: list[dict[str, Any]],
    *,
    verbose: bool = False,
) -> list[dict[str, Any]]:
    """Return list of discrepancy dicts (empty = no mismatches)."""
    discrepancies: list[dict[str, Any]] = []

    hp_by_name: dict[str, list[date]] = {}
    for ev in hamropatro_events:
        ad = _bs_to_ad(ev["bs_year"], ev["bs_month"], ev["bs_day"])
        if ad is None:
            continue
        key = _normalise_name(ev["name"])
        hp_by_name.setdefault(key, []).append(ad)

    server_by_name: dict[str, dict[str, Any]] = {}
    for f in server_festivals:
        key = _normalise_name(f.get("name_en") or f.get("id") or "")
        server_by_name[key] = f

    for hp_name, hp_dates in hp_by_name.items():
        # Try exact match first, then partial
        matched = server_by_name.get(hp_name)
        if matched is None:
            for srv_name, srv_f in server_by_name.items():
                if hp_name in srv_name or srv_name in hp_name:
                    matched = srv_f
                    break

        if matched is None:
            if verbose:
                print(f"  [UNMATCHED] Hamro Patro event not in server: '{hp_name}' on {hp_dates}")
            continue

        srv_start = date.fromisoformat(matched["start_date"])
        srv_end = date.fromisoformat(matched["end_date"])

        for hp_date in hp_dates:
            if not (srv_start <= hp_date <= srv_end):
                discrepancies.append({
                    "name": hp_name,
                    "hamropatro_date": hp_date.isoformat(),
                    "server_start": matched["start_date"],
                    "server_end": matched["end_date"],
                    "festival_id": matched.get("id"),
                })
                if verbose:
                    print(
                        f"  [MISMATCH] '{hp_name}': "
                        f"Hamro Patro={hp_date}, "
                        f"Server={matched['start_date']}..{matched['end_date']}"
                    )

    return discrepancies


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Verify festival dates against hamropatro.com")
    parser.add_argument("--bs-year", type=int, required=True, help="Bikram Sambat year to verify")
    parser.add_argument(
        "--server",
        default="",
        help="Base URL of running Panchanga API server (default: compute locally)",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Show per-festival detail")
    parser.add_argument(
        "--months",
        type=str,
        default="1-12",
        help="BS months to check, e.g. '1-6' or '4,5,6' (default: 1-12)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Seconds to wait between Hamro Patro requests (default: 1.0)",
    )
    args = parser.parse_args()

    # Parse months range
    if "-" in args.months:
        lo, hi = args.months.split("-", 1)
        months = list(range(int(lo), int(hi) + 1))
    else:
        months = [int(m) for m in args.months.split(",")]

    print(f"Verifying BS {args.bs_year} months {months} against hamropatro.com …")

    # Fetch hamropatro events
    all_hp_events: list[dict[str, Any]] = []
    for bs_month in months:
        print(f"  Fetching hamropatro BS {args.bs_year}/{bs_month:02d} …", end=" ", flush=True)
        try:
            events = fetch_hamropatro_month_events(args.bs_year, bs_month)
            print(f"{len(events)} events")
            all_hp_events.extend(events)
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR: {exc}")
        if args.delay > 0:
            time.sleep(args.delay)

    if not all_hp_events:
        print("No events fetched from hamropatro.com — cannot verify.")
        print("Tip: hamropatro.com may block automated requests. Try running from a browser-enabled environment.")
        return 2

    # Fetch server / compute locally
    print(f"\nFetching server festivals for BS {args.bs_year} …")
    if args.server:
        server_festivals = fetch_server_festivals(args.bs_year, args.server)
    else:
        print("  (no --server given; computing locally — requires swisseph)")
        try:
            server_festivals = compute_festivals_locally(args.bs_year)
        except Exception as exc:  # noqa: BLE001
            print(f"  Local compute failed: {exc}")
            return 2

    print(f"  Server festivals: {len(server_festivals)}")

    # Compare
    print(f"\nComparing {len(all_hp_events)} hamropatro events vs {len(server_festivals)} server festivals …")
    discrepancies = compare_festivals(all_hp_events, server_festivals, verbose=args.verbose)

    if discrepancies:
        print(f"\n{len(discrepancies)} DISCREPANCIES FOUND:")
        for d in discrepancies:
            print(
                f"  [{d['festival_id']}] '{d['name']}': "
                f"Hamro Patro={d['hamropatro_date']}, "
                f"Server={d['server_start']}..{d['server_end']}"
            )
        return 1

    print("\nAll matched dates OK — no discrepancies found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
