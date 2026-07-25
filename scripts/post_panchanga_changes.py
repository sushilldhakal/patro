#!/usr/bin/env python3
"""Post a Facebook update whenever a Kathmandu panchanga anga changes.

Reads the tithi / nakshatra / yoga / karana running *now* for Kathmandu and, for
each one that differs from the last-seen value, posts a short update — the same
daily Kathmandu image plus a link to vedicpatro.com/panchanga. Meant to run every
few minutes from a systemd timer; it detects the transition on the next poll
after it happens.

Dormant unless FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are set.

    python scripts/post_panchanga_changes.py --dry-run   # print, don't post
    python scripts/post_panchanga_changes.py --reset      # set baseline, no posts
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import pathlib
import sys
from datetime import date, datetime

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import config  # noqa: E402
from engine.vedic.at_time import build_panchanga_at_time  # noqa: E402
from services.fb_post_content import (  # noqa: E402
    KATHMANDU_TZ,
    image_url,
    kathmandu_location,
    ne_digits,
    page_url,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fb_anga_changes")

_STATE_FILE = pathlib.Path(
    os.getenv("FB_ANGA_STATE_FILE", "/var/tmp/vedicpatro-fb-anga-state.json")
)
# (payload key, Nepali label) — the angas we announce when they change.
_ELEMENTS: list[tuple[str, str]] = [
    ("tithi", "तिथि"),
    ("nakshatra", "नक्षत्र"),
    ("yoga", "योग"),
    ("karana", "करण"),
]


def _current_angas(now: datetime) -> dict[str, str]:
    payload = build_panchanga_at_time(now, kathmandu_location())
    angas: dict[str, str] = {}
    for key, _ in _ELEMENTS:
        block = payload.get(key) or {}
        name = block.get("name_ne") or block.get("name")
        if name:
            angas[key] = str(name)
    return angas


def _load_state() -> dict[str, str] | None:
    try:
        data = json.loads(_STATE_FILE.read_text())
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def _save_state(state: dict[str, str]) -> None:
    try:
        _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        _STATE_FILE.write_text(json.dumps(state, ensure_ascii=False))
    except OSError:
        logger.warning("Could not write anga-state file %s", _STATE_FILE)


def _caption(label: str, name: str, now: datetime, day: date) -> str:
    return (
        f"{label} परिवर्तन — अब {name}\n"
        f"काठमाडौँ · {ne_digits(now.strftime('%H:%M'))}\n"
        f"{page_url(day)}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="Print any detected change instead of posting.")
    parser.add_argument("--reset", action="store_true",
                        help="Record the current angas as the baseline and exit.")
    args = parser.parse_args(argv)

    page_id = config.fb_page_id()
    token = config.fb_page_access_token()
    if not (page_id and token) and not (args.dry_run or args.reset):
        logger.info("FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set — nothing to do.")
        return 0

    now = datetime.now(KATHMANDU_TZ)
    current = _current_angas(now)

    if args.reset:
        _save_state(current)
        logger.info("Baseline recorded: %s", current)
        return 0

    previous = _load_state()
    if previous is None:
        # First ever run: establish a baseline so we don't announce all four.
        _save_state(current)
        logger.info("Baseline recorded (no posts): %s", current)
        return 0

    changes = [
        (key, label, current[key])
        for key, label in _ELEMENTS
        if current.get(key) and current[key] != previous.get(key)
    ]
    if not changes:
        logger.info("No anga change.")
        return 0

    day = now.date()
    photo_url = image_url(day)

    post_photo_by_url = None
    FacebookPostError = Exception  # noqa: N806
    if not args.dry_run:
        from services.fb_page import FacebookPostError, post_photo_by_url  # noqa: N806

    # Start from the previous state and only advance an element once its post
    # succeeds, so a failed post is retried on the next poll.
    next_state = dict(previous)
    for key, label, name in changes:
        caption = _caption(label, name, now, day)
        if args.dry_run:
            print("---")
            print("IMAGE:", photo_url)
            print(caption)
            next_state[key] = name
            continue
        try:
            post_id = post_photo_by_url(
                image_url=photo_url, caption=caption, page_id=page_id, access_token=token
            )
            logger.info("Posted %s change → %s (post %s)", label, name, post_id)
            next_state[key] = name
        except FacebookPostError:
            logger.exception("Facebook post failed for %s change", label)

    _save_state(next_state)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
