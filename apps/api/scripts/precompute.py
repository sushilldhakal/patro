#!/usr/bin/env python3
"""Precompute holiday cache for a year range (cron-friendly).

Example:
    python scripts/precompute.py --start 2026 --end 2036
    python scripts/precompute.py --start 2026 --years 10
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from engine.astronomy.location import DEFAULT_LOCATION, resolve_location
from services.holiday_generator import precompute_range


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute Nepali holiday cache files")
    parser.add_argument("--start", type=int, required=True, help="First Gregorian year")
    parser.add_argument("--end", type=int, help="Last Gregorian year (inclusive)")
    parser.add_argument("--years", type=int, help="Number of years from --start")
    parser.add_argument("--lat", type=float, help="Observer latitude")
    parser.add_argument("--lon", type=float, help="Observer longitude")
    parser.add_argument("--timezone", type=str, help="IANA timezone")
    args = parser.parse_args()

    if args.end is None:
        span = args.years if args.years is not None else 10
        end_year = args.start + span - 1
    else:
        end_year = args.end

    location = (
        resolve_location(lat=args.lat, lon=args.lon, timezone=args.timezone)
        if any(v is not None for v in (args.lat, args.lon, args.timezone))
        else DEFAULT_LOCATION
    )

    paths = precompute_range(args.start, end_year, location)
    print(f"Wrote {len(paths)} cache files for {args.start}–{end_year} @ {location.as_dict()}")


if __name__ == "__main__":
    main()
