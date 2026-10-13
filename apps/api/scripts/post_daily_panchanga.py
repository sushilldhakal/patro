#!/usr/bin/env python3
"""Post today's Kathmandu panchanga to a Facebook Page at sunrise, as links.

Three posts per run, each its own link so Facebook renders a different card:
  main     दिन-चक्र chart + anga changes            → /panchanga
  periods  शुभ / अशुभ समय lists                      → /panchanga?card=periods&date=…
  d1       D1 चक्र + उदयकालिक स्पष्टग्रह              → /panchanga?card=d1&date=…
``FB_POST_KINDS`` (default ``main,periods,d1``) picks which; each kind has its own
once-a-day guard, so a failure in one never blocks or duplicates the others.
``APP_LINK`` (optional) is added to the extra posts' captions and image once the
mobile app exists.

Dormant unless FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are set. Designed to be run
by a systemd timer shortly before the earliest Kathmandu sunrise; with
``--wait-for-sunrise`` it computes today's exact sunrise and sleeps until then
before publishing.

    python scripts/post_daily_panchanga.py --wait-for-sunrise
    python scripts/post_daily_panchanga.py --dry-run     # print, don't post

Posted as a link to /panchanga (not an uploaded photo): Facebook crawls that
URL itself for the title/description/image, so the picture it shows is
tappable and opens the site — a plain photo upload's image never links
anywhere.
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
    card_page_url,
    d1_caption,
    dated_header,
    image_url,
    kathmandu_location,
    page_url,
    periods_caption,
    sunrise_datetime,
)
from services.og_image import og_fields  # noqa: E402
from services.panchanga_api import build_daily_state  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("fb_daily_post")

_STATE_FILE = pathlib.Path(
    os.getenv("FB_POST_STATE_FILE", "/var/tmp/vedicpatro-fb-last-post.txt")
)
# Seconds between posts in one run, so they land as distinct items in the feed.
_POST_GAP_S = int(os.getenv("FB_POST_GAP_S", "20"))


def _state_file(kind: str) -> pathlib.Path:
    """``main`` keeps the original guard file; extra kinds get ``…-<kind>.txt``."""
    if kind == "main":
        return _STATE_FILE
    return _STATE_FILE.with_name(f"{_STATE_FILE.stem}-{kind}{_STATE_FILE.suffix}")


def _build_caption(fields: dict, transition_lines: list[str]) -> str:
    body = "\n".join(transition_lines)
    return (
        f"आजको पञ्चाङ्ग — काठमाडौँ\n"
        f"{dated_header(fields)}\n\n"
        f"{body}\n\n"
        f"पूर्ण दिन-चक्र: {page_url()}"
    )


def _already_posted(kind: str, day: date) -> bool:
    try:
        return _state_file(kind).read_text().strip() == day.isoformat()
    except OSError:
        return False


def _mark_posted(kind: str, day: date) -> None:
    path = _state_file(kind)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(day.isoformat())
    except OSError:
        logger.warning("Could not write post-state file %s", path)


def _build_post(kind: str, day: date, payload: dict, fields: dict, location) -> tuple[str, str]:
    """(link, caption) for one kind."""
    if kind == "periods":
        link = card_page_url("periods", day)
        return link, periods_caption(fields, payload, link)
    if kind == "d1":
        link = card_page_url("d1", day)
        return link, d1_caption(fields, payload, link)
    return page_url(), _build_caption(fields, anga_transition_lines(payload, day, location))


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
    parser.add_argument("--only", choices=["main", "periods", "d1"], action="append",
                        help="Post just this kind (repeatable). Default: FB_POST_KINDS.")
    args = parser.parse_args()

    page_id = config.fb_page_id()
    token = config.fb_page_access_token()
    if not (page_id and token) and not args.dry_run:
        logger.info("FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set — nothing to post.")
        return 0

    kinds = args.only or config.fb_post_kinds()
    now = datetime.now(KATHMANDU_TZ)
    day = now.date()

    if not args.force and not args.dry_run:
        kinds = [k for k in kinds if not _already_posted(k, day)]
        if not kinds:
            logger.info("Already posted everything for %s — skipping.", day.isoformat())
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

    if args.dry_run:
        for kind in kinds:
            link, caption = _build_post(kind, day, payload, fields, location)
            print(f"===== {kind} =====")
            print("LINK:", link)
            if kind == "main":
                print("IMAGE (via link's og:image):", image_url(day))
            print("CAPTION:")
            print(caption)
            print()
        return 0

    from services.fb_page import FacebookPostError, post_link

    failed = 0
    for i, kind in enumerate(kinds):
        if i:
            time.sleep(_POST_GAP_S)
        link, caption = _build_post(kind, day, payload, fields, location)
        try:
            # Link posts (not photo uploads): Facebook crawls `link` for the card, and
            # the card's image is tappable — a plain photo upload never links anywhere.
            post_id = post_link(link=link, message=caption, page_id=page_id, access_token=token)
        except FacebookPostError:
            logger.exception("Facebook %s post failed for %s", kind, day.isoformat())
            failed += 1
            continue
        logger.info("Posted %s/%s to Facebook page %s (post %s).", kind, day.isoformat(), page_id, post_id)
        _mark_posted(kind, day)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
