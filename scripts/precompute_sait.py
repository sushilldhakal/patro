#!/usr/bin/env python3
"""Precompute sait cache files for a BS year range."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.location import DEFAULT_LOCATION  # noqa: E402
from panchanga.constants import BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR  # noqa: E402
from services.sait_generator import precompute_sait_range  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute sait JSON caches")
    parser.add_argument(
        "--start",
        type=int,
        default=BS_ESTIMATED_MIN_YEAR,
        help=f"Start BS year (default {BS_ESTIMATED_MIN_YEAR})",
    )
    parser.add_argument(
        "--end",
        type=int,
        default=BS_SUPPORTED_MAX_YEAR,
        help=f"End BS year (default {BS_SUPPORTED_MAX_YEAR})",
    )
    parser.add_argument(
        "--category",
        action="append",
        dest="categories",
        help="Limit to category id (repeatable). Default: all.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even when cache exists",
    )
    args = parser.parse_args()

    generated = precompute_sait_range(
        args.start,
        args.end,
        DEFAULT_LOCATION,
        categories=args.categories,
        skip_existing=not args.force,
    )
    print(f"Generated {len(generated)} cache files for BS {args.start}–{args.end}")


if __name__ == "__main__":
    main()
