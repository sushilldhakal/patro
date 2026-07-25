"""Post a photo to a Facebook Page via the Graph API.

Stdlib only (urllib) — the image is passed by public URL, so the Graph API
fetches it directly and we never upload bytes. Used by the daily panchanga
poster (scripts/post_daily_panchanga.py).
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
    Returns the new post id. Raises FacebookPostError on any failure."""
    endpoint = (
        f"https://graph.facebook.com/{config.fb_graph_api_version()}/{page_id}/photos"
    )
    body = urllib.parse.urlencode(
        {
            "url": image_url,
            "caption": caption,
            "published": "true" if published else "false",
            "access_token": access_token,
        }
    ).encode("utf-8")

    request = urllib.request.Request(endpoint, data=body, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise FacebookPostError(f"Graph API HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise FacebookPostError(f"Graph API request failed: {exc}") from exc

    post_id = payload.get("post_id") or payload.get("id")
    if not post_id:
        raise FacebookPostError(f"Unexpected Graph API response: {payload}")
    return str(post_id)
