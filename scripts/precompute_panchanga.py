#!/usr/bin/env python3
"""Precompute panchanga SQLite cache for a city and date range.

Examples:
    python scripts/precompute_panchanga.py --city kathmandu --bs-year 2083
    python scripts/precompute_panchanga.py --city-id 1283240 --ad-year 2026
    python scripts/precompute_panchanga.py --popular --bs-year 2083
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from core.location import DEFAULT_LOCATION, resolve_location_from_query
from panchanga.bikram_sambat import iter_bs_month_days
from services.cities_db import POPULAR_CITY_IDS, get_city_by_id
from services.panchanga_cache import cache_stats, precompute_range, resolve_cache_keys


def _dates_for_bs_year(bs_year: int) -> list[date]:
    days: list[date] = []
    for month in range(1, 13):
        days.extend(greg for _, greg in iter_bs_month_days(bs_year, month))
    return days


def _dates_for_ad_year(ad_year: int) -> list[date]:
    start = date(ad_year, 1, 1)
    end = date(ad_year, 12, 31)
    days: list[date] = []
    current = start
    while current <= end:
        days.append(current)
        current += timedelta(days=1)
    return days


def _location_from_args(args: argparse.Namespace):
    if args.city_id is not None:
        row = get_city_by_id(args.city_id)
        if row is None:
            raise SystemExit(f"Unknown city_id: {args.city_id}")
        return resolve_location_from_query(city_id=args.city_id)
    if args.city:
        return resolve_location_from_query(city=args.city)
    if any(v is not None for v in (args.lat, args.lon, args.timezone)):
        return resolve_location_from_query(lat=args.lat, lon=args.lon, timezone=args.timezone)
    return DEFAULT_LOCATION


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute panchanga SQLite cache")
    parser.add_argument("--city", help="GeoNames city name (default: Kathmandu)")
    parser.add_argument("--city-id", type=int, help="GeoNames city id")
    parser.add_argument("--lat", type=float)
    parser.add_argument("--lon", type=float)
    parser.add_argument("--timezone", type=str)
    parser.add_argument("--bs-year", type=int, help="Warm all days in a BS year")
    parser.add_argument("--ad-year", type=int, help="Warm all days in a Gregorian year")
    parser.add_argument("--popular", action="store_true", help="Warm all popular cities")
    parser.add_argument(
        "--cities",
        choices=["popular"],
        help="Alias for --popular (e.g. --cities popular --bs-year 2083)",
    )
    parser.add_argument("--force", action="store_true", help="Recompute even if cached")
    args = parser.parse_args()

    if args.cities == "popular":
        args.popular = True

    if args.popular:
        if not args.bs_year and not args.ad_year:
            raise SystemExit("--popular requires --bs-year or --ad-year")
        dates = _dates_for_bs_year(args.bs_year) if args.bs_year else _dates_for_ad_year(args.ad_year)
        total = 0
        for city_id in POPULAR_CITY_IDS:
            loc = resolve_location_from_query(city_id=city_id)
            key, _ = resolve_cache_keys(loc)
            written = precompute_range(loc, dates, skip_existing=not args.force)
            total += written
            print(f"  {key}: +{written} days")
        print(f"Done. Wrote {total} rows. Cache: {cache_stats()}")
        return

    location = _location_from_args(args)
    if args.bs_year:
        dates = _dates_for_bs_year(args.bs_year)
    elif args.ad_year:
        dates = _dates_for_ad_year(args.ad_year)
    else:
        raise SystemExit("Specify --bs-year, --ad-year, or --popular")

    key, city_id = resolve_cache_keys(location)
    written = precompute_range(location, dates, skip_existing=not args.force)
    print(f"Wrote {written} rows for {key} (city_id={city_id})")
    print(f"Cache stats: {cache_stats()}")


if __name__ == "__main__":
    main()
