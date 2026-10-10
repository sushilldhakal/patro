"""Post to a Facebook Page via the Graph API.

Stdlib only (urllib). Used by the daily panchanga poster
(scripts/post_daily_panchanga.py).
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request

import config

logger = logging.getLogger(__name__)


class FacebookPostError(RuntimeError):
    """Raised when the Graph API rejects or fails the post."""


def _graph_post(*, node: str, fields: dict[str, str], timeout: int) -> dict:
    endpoint = f"https://graph.facebook.com/{config.fb_graph_api_version()}/{node}"
    body = urllib.parse.urlencode(fields).encode("utf-8")

    request = urllib.request.Request(endpoint, data=body, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise FacebookPostError(f"Graph API HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise FacebookPostError(f"Graph API request failed: {exc}") from exc


def post_link(
    *,
    link: str,
    message: str,
    page_id: str,
    access_token: str,
    published: bool = True,
    timeout: int = 30,
) -> str:
    """Publish a link post to the Page's feed. Facebook crawls `link` for its
    own og:title/og:description/og:image and renders the whole card —
    including the picture — as a tappable link to that URL (unlike a plain
    photo upload, whose image never links anywhere). Returns the new post id."""
    payload = _graph_post(
        node=f"{page_id}/feed",
        fields={
            "link": link,
            "message": message,
            "published": "true" if published else "false",
            "access_token": access_token,
        },
        timeout=timeout,
    )
    post_id = payload.get("id")
    if not post_id:
        raise FacebookPostError(f"Unexpected Graph API response: {payload}")
    return str(post_id)


def post_photo_by_url(
    *,
    image_url: str,
    caption: str,
    page_id: str,
    access_token: str,
    published: bool = True,
    timeout: int = 30,
) -> str:
    """Publish a photo (fetched by the Graph API from `image_url`) to the Page.
    Note: the photo itself is not tappable to an external site — Facebook's
    photo-upload API has no outbound-link field. Prefer `post_link` when the
    picture should open vedicpatro.com on tap. Returns the new post id."""
    payload = _graph_post(
        node=f"{page_id}/photos",
        fields={
            "url": image_url,
            "caption": caption,
            "published": "true" if published else "false",
            "access_token": access_token,
        },
        timeout=timeout,
    )
    post_id = payload.get("post_id") or payload.get("id")
    if not post_id:
        raise FacebookPostError(f"Unexpected Graph API response: {payload}")
    return str(post_id)
