#!/usr/bin/env python3
"""Pre-build the pages people are about to open, so no real visitor pays for a cold build.

Why: the load test ran the same 300 users twice. With cold caches the 2-core
server sat at 87% CPU (100% at peaks) and slow pages timed out after 60 s;
with warm caches the same traffic used 16% CPU with no errors. Almost all of
the cold cost is pages that are the same for everyone in one city (sait,
calendar months, element spans, festivals, year pages), so building them ahead
of time removes it.

What it requests, for every popular city (/v1/nepal/cities/popular) and both
languages, with the exact URL shapes and cache versions the app sends, over
``--years`` years (default 10):

* each day from 2 days ago to ``--years`` years ahead (day page), daily
  rashifal for the coming month, weekly and monthly rashifal for today;
* every BS month from 3 months ago to ``--years`` years ahead, with its five
  element strips and the gochar ingress list, plus the city-less patro month
  and header;
* every sait category for each of those BS years: month lists, category lists
  and detail pages;
* festivals, holidays, special months and the year pages for each year.

Documents and the Veda reader are not warmed into Redis — Cloudflare alone
caches them; only today's Veda mantra is fetched through the public URL.

Two passes. With ``--origin`` (the systemd unit passes the API's loopback
port) every page is requested from the server directly, with the public Host
header so the Redis key is the one visitors hit: a page already in Redis costs
~1 ms, so the nightly pass over ten years takes minutes and only builds what
is new or was evicted. Then the pages people open first (this week, this
month) go through the public URL (``--base``) so Cloudflare holds them too.
Without ``--origin`` everything goes through ``--base``. It never runs more
than ``--workers`` requests at once (default 3), below the server's load-shed
lane, so it cannot crowd out real visitors.

Run by scripts/deploy.sh after every API deploy (in the background) and nightly
by the vedicpatro-warm-cache.timer systemd unit. Redis keeps these pinned
answers for 400 days (app/redis_response_middleware.py); one year for every
popular city measured ~160 MB, but with both siddhantas, both languages and old
cv versions ten years filled 2 GB; Redis now has 4 GB.

    python apps/api/scripts/warm_cache.py                              # 10 years via the public URL
    python apps/api/scripts/warm_cache.py --years 1 --days 7 --cities 3 # quick
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # repo root (apps/api/scripts → ../../..)
NEPAL_TZ = timezone(timedelta(hours=5, minutes=45))
UA = "vedicpatro-cache-warmer/1.0"
ELEMENTS = ("tithi", "nakshatra", "yoga", "karana", "chandra-rashi")
LANGS = ("ne", "en")


def app_versions() -> dict[str, str]:
    """Cache versions the shipped app puts in its URLs (packages/api-client)."""
    versions = {"cv": "", "sv": "", "gv": "", "dv": ""}
    client = ROOT / "packages/api-client/src/client.ts"
    docs = ROOT / "packages/api-client/src/documents.ts"
    patterns = {
        "cv": (client, r'PANCHANGA_CACHE_VERSION\s*=\s*"(\d+)"'),
        "sv": (client, r'SAIT_CACHE_VERSION\s*=\s*"(\d+)"'),
        "gv": (client, r'GRAHA_CACHE_VERSION\s*=\s*"(\d+)"'),
        "dv": (docs, r'DOCUMENTS_LIST_CACHE_VERSION\s*=\s*"(\d+)"'),
    }
    for name, (path, pattern) in patterns.items():
        try:
            m = re.search(pattern, path.read_text())
            if m:
                versions[name] = m.group(1)
        except OSError:
            pass
    return versions


class Warmer:
    def __init__(self, base: str, timeout: float, host: str | None = None):
        self.base = base.rstrip("/")
        self.timeout = timeout
        self.host = host
        self.stats = {"ok": 0, "cdn_hit": 0, "missing": 0, "failed": 0, "busy": 0}
        self.slow: list[tuple[float, str]] = []

    def fetch(self, path: str, *, want_json: bool = False):
        headers = {"User-Agent": UA, "Accept-Encoding": "gzip"}
        if self.host:
            headers["Host"] = self.host
        req = urllib.request.Request(self.base + path, headers=headers)
        if want_json:
            req.remove_header("Accept-encoding")
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            body = resp.read()
            return resp.headers, (json.loads(body) if want_json else None)

    def warm(self, path: str) -> None:
        started = time.monotonic()
        for attempt in range(3):
            try:
                headers, _ = self.fetch(path)
                if headers.get("cf-cache-status") == "HIT":
                    self.stats["cdn_hit"] += 1
                self.stats["ok"] += 1
                took = time.monotonic() - started
                if took > 3:
                    self.slow.append((took, path))
                return
            except urllib.error.HTTPError as exc:
                if exc.code in (404, 400, 422):
                    self.stats["missing"] += 1
                    return
                if exc.code in (503, 502, 504) and attempt < 2:
                    self.stats["busy"] += 1
                    time.sleep(3 * (attempt + 1))
                    continue
                self.stats["failed"] += 1
                return
            except Exception:
                if attempt < 2:
                    time.sleep(2)
                    continue
                self.stats["failed"] += 1
                return


def bs_today(w: Warmer) -> tuple[int, int]:
    today = datetime.now(NEPAL_TZ).date().isoformat()
    _, d = w.fetch(f"/convert/ad-to-bs/{today}", want_json=True)
    return int(d["bs_year"]), int(d["bs_month"])


def month_shift(y: int, m: int, k: int) -> tuple[int, int]:
    t = y * 12 + (m - 1) + k
    return t // 12, t % 12 + 1


def month_length(w: Warmer, y: int, m: int) -> int:
    try:
        _, d = w.fetch(f"/calendar/header/{y}/{m}", want_json=True)
        r = d["gregorian_range"]
        return (date.fromisoformat(r["end"]) - date.fromisoformat(r["start"])).days + 1
    except Exception:
        return 30


def build_paths(
    w: Warmer, v: dict[str, str], cities: list[int], days: int, months: int, years: int
) -> tuple[list[str], list[str]]:
    """(every page, the pages people open first). Both ordered soonest first."""
    cv, sv, gv, dv = v["cv"], v["sv"], v["gv"], v["dv"]
    now = datetime.now(NEPAL_TZ).date()
    by, bm = bs_today(w)
    ahead = max(months, years * 12)
    month_list = sorted(
        {month_shift(by, bm, k) for k in range(-months, ahead + 1)} | {(by, m) for m in range(1, 13)},
        key=lambda ym: abs((ym[0] * 12 + ym[1]) - (by * 12 + bm)),
    )
    lengths = {ym: month_length(w, *ym) for ym in month_list}
    year_list = list(range(by, by + max(1, years)))
    sait_years = year_list + ([by + len(year_list)] if bm >= 10 else [])
    try:
        _, about = w.fetch("/nepal/sait/about", want_json=True)
        categories = [c["id"] for c in about["categories"]]
    except Exception:
        categories = []

    # Ordered by how soon people open it: today first, far months last.
    first: list[str] = []
    later: list[str] = []

    cdn_only = [f"/veda/daily?date={(now + timedelta(days=d)).isoformat()}&v={dv}" for d in range(0, 4)]
    for y, m in month_list:
        target = first if abs((y * 12 + m) - (by * 12 + bm)) <= 1 else later
        target.append(f"/nepal/patro/{y}/{m}?cv={cv}")
        target.append(f"/calendar/header/{y}/{m}")
    for y in sait_years:
        (first if y == by else later).append(f"/nepal/special-months/{y}?cv={cv}")

    for city in cities:
        loc = f"city_id={city}"
        for offset in range(-2, days + 1):
            day = (now + timedelta(days=offset)).isoformat()
            target = first if offset <= 7 else later
            for lang in LANGS:
                target.append(
                    f"/panchanga/{day}?era=ad&festivals=true&detail=true&slim=true&cv={cv}&{loc}&language={lang}"
                )
            if -1 <= offset <= 30:
                (first if offset <= 7 else later).append(
                    f"/panchanga/rashifal?date={day}&era=ad&period=daily&cv={cv}&{loc}"
                )
        for period in ("weekly", "monthly"):
            first.append(f"/panchanga/rashifal?date={now.isoformat()}&era=ad&period={period}&cv={cv}&{loc}")

        for y, m in month_list:
            target = first if (y, m) == (by, bm) else later
            last = lengths[(y, m)]
            target.append(f"/nepal/gochar/ingress?from={y}-{m:02d}-01&to={y}-{m:02d}-{last:02d}&era=bs&level=patro&{loc}")
            for lang in LANGS:
                target.append(f"/panchanga/{y}/{m}?era=bs&language={lang}&cv={cv}&{loc}")
                for el in ELEMENTS:
                    target.append(
                        f"/panchanga/element/{el}/spans?era=bs&language={lang}&year={y}&month={m}&cv={cv}&{loc}"
                    )

        for y in sait_years:
            for m in range(1, 13):
                later.append(f"/nepal/sait/{y}/month/{m}?{loc}&sv={sv}")
            for cat in categories:
                later.append(f"/nepal/sait/{y}/{cat}?{loc}&sv={sv}")
                if not cat.endswith("-jurne"):  # agni-/rudri-jurne have no detail page (400)
                    later.append(f"/nepal/sait/{y}/{cat}/detail?{loc}&sv={sv}")

        for y in year_list:
            for lang in LANGS:
                q = f"era=bs&language={lang}&year={y}&{loc}"
                later += [
                    f"/nepal/festivals?year={y}&era=bs&language={lang}&{loc}&cv={cv}",
                    f"/nepal/holidays?year={y}&era=bs&language={lang}&{loc}&cv={cv}",
                    f"/nepal/panchak/year/{y}?{q}",
                    f"/nepal/eclipse/lunar/year/{y}?{q}&gv={gv}",
                    f"/nepal/eclipse/solar/year/{y}?{q}&gv={gv}",
                    f"/nepal/graha-asta/year/{y}?{q}&gv={gv}",
                    f"/nepal/graha-vakri/year/{y}?{q}&gv={gv}",
                    f"/panchanga/year/{y}/sun?{q}",
                ]
            later.append(f"/panchanga/year/{y}?wheel=true&era=bs&cv={cv}&{loc}")
        later.append(f"/seasons/tropical?{loc}")

    def unique(paths: list[str]) -> list[str]:
        return list(dict.fromkeys(paths))

    return unique(first + later), unique(first) + cdn_only


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--base", default="https://www.vedicpatro.com/api/v1")
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument(
        "--origin",
        help="request every page from the API directly first (e.g. http://127.0.0.1:8000/v1); "
        "--base then only gets the pages opened first",
    )
    ap.add_argument("--host", default="www.vedicpatro.com", help="Host header sent to --origin")
    ap.add_argument("--years", type=int, default=10)
    ap.add_argument("--days", type=int, default=0, help="days ahead (0 = 365 × --years)")
    ap.add_argument("--months", type=int, default=3, help="calendar months either side of now")
    ap.add_argument("--cities", type=int, default=0, help="only the first N popular cities (0 = all)")
    ap.add_argument("--timeout", type=float, default=60)
    args = ap.parse_args()

    w = Warmer(args.base, args.timeout)
    v = app_versions()
    days = args.days or 365 * args.years
    try:
        _, popular = w.fetch("/nepal/cities/popular", want_json=True)
        cities = [int(c["id"]) for c in popular["cities"]]
    except Exception as exc:
        print(f"cannot list popular cities: {exc}", file=sys.stderr)
        return 1
    if args.cities:
        cities = cities[: args.cities]
    every, first = build_paths(w, v, cities, days, args.months, args.years)
    passes = [(Warmer(args.origin, args.timeout, args.host), every), (w, first)] if args.origin else [(w, every)]

    ok = True
    for warmer, paths in passes:
        print(
            f"warming {len(paths)} pages for {len(cities)} cities, {args.years} years, "
            f"via {warmer.base} (versions {v})",
            flush=True,
        )
        started = time.monotonic()
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(warmer.warm, p) for p in paths]
            for i, _ in enumerate(as_completed(futures), 1):
                if i % 2000 == 0:
                    print(f"  {i}/{len(paths)} {warmer.stats}", flush=True)
        took = time.monotonic() - started
        print(f"done in {took:.0f}s: {warmer.stats}", flush=True)
        for t, p in sorted(warmer.slow, reverse=True)[:10]:
            print(f"  slow {t:.1f}s {p}")
        ok = ok and warmer.stats["failed"] < max(10, len(paths) // 50)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
