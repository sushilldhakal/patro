#!/usr/bin/env python3
"""Post today's Kathmandu panchanga image to a Facebook Page at sunrise.

Dormant unless FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are set. Designed to be run
by a systemd timer shortly before the earliest Kathmandu sunrise; with
``--wait-for-sunrise`` it computes today's exact sunrise and sleeps until then
before publishing.

    python scripts/post_daily_panchanga.py --wait-for-sunrise
    python scripts/post_daily_panchanga.py --dry-run     # print, don't post

The photo is fetched by the Graph API from the public /og-image endpoint
(``full=1`` → the full-height chart), so nothing is uploaded from here.
"""

from __future__ import annotations

import argparse
import logging
import os
import pathlib
import sys
import time
from datetime import date, datetime

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import config  # noqa: E402
from services.fb_post_content import (  # noqa: E402
    KATHMANDU_TZ,
    anga_transition_lines,
    image_url,
    kathmandu_location,
    ne_digits,
    page_url,
    sunrise_datetime,
)
from services.og_image import og_fields  # noqa: E402
from services.panchanga_api import build_daily_state  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fb_daily_post")

_STATE_FILE = pathlib.Path(
    os.getenv("FB_POST_STATE_FILE", "/var/tmp/vedicpatro-fb-last-post.txt")
)


def _build_caption(fields: dict, day: date, transition_lines: list[str]) -> str:
    header = " · ".join(x for x in (fields["weekday"], fields["ad_line"]) if x)
    header += f" · सूर्योदय {ne_digits(fields['sunrise'])} · सूर्यास्त {ne_digits(fields['sunset'])}"
    body = "\n".join(transition_lines)
    return (
        f"आजको पञ्चाङ्ग — काठमाडौँ\n"
        f"{header}\n\n"
        f"{body}\n\n"
        f"पूर्ण दिन-चक्र: {page_url(day)}"
    )


def _already_posted(day: date) -> bool:
    try:
        return _STATE_FILE.read_text().strip() == day.isoformat()
    except OSError:
        return False


def _mark_posted(day: date) -> None:
    try:
        _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        _STATE_FILE.write_text(day.isoformat())
    except OSError:
        logger.warning("Could not write post-state file %s", _STATE_FILE)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wait-for-sunrise", action="store_true",
                        help="Sleep until today's Kathmandu sunrise before posting.")
    parser.add_argument("--max-wait-min", type=int, default=180,
                        help="Cap on the sunrise sleep (safety).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print the image URL and caption instead of posting.")
    parser.add_argument("--force", action="store_true",
                        help="Post even if a post for today is already recorded.")
    args = parser.parse_args()

    page_id = config.fb_page_id()
    token = config.fb_page_access_token()
    if not (page_id and token) and not args.dry_run:
        logger.info("FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set — nothing to post.")
        return 0

    now = datetime.now(KATHMANDU_TZ)
    day = now.date()

    if not args.force and not args.dry_run and _already_posted(day):
        logger.info("Already posted for %s — skipping.", day.isoformat())
        return 0

    location = kathmandu_location()
    payload = build_daily_state(day, location, include_festivals=False, include_detail=True)
    fields = og_fields(payload, date_ad=day.isoformat(), location_name="Kathmandu")

    if args.wait_for_sunrise:
        sunrise = sunrise_datetime(payload, day)
        if sunrise and sunrise > now:
            wait_seconds = min((sunrise - now).total_seconds(), args.max_wait_min * 60)
            logger.info("Sleeping %.0f min until Kathmandu sunrise (%s).",
                        wait_seconds / 60, sunrise.strftime("%H:%M"))
            time.sleep(wait_seconds)
        else:
            logger.info("Sunrise already passed or unavailable — posting now.")

    photo_url = image_url(day)
    caption = _build_caption(fields, day, anga_transition_lines(payload, day, location))

    if args.dry_run:
        print("IMAGE URL:", photo_url)
        print("CAPTION:")
        print(caption)
        return 0

    from services.fb_page import FacebookPostError, post_photo_by_url

    try:
        post_id = post_photo_by_url(
            image_url=photo_url, caption=caption, page_id=page_id, access_token=token
        )
    except FacebookPostError:
        logger.exception("Facebook post failed for %s", day.isoformat())
        return 1

    logger.info("Posted %s to Facebook page %s (post %s).", day.isoformat(), page_id, post_id)
    _mark_posted(day)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
