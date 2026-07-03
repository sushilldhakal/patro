"""Verify Facebook Login access tokens via the Graph API."""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import config

_GRAPH_VERSION = "v21.0"


class FacebookAuthError(Exception):
    """Raised when a Facebook access token can't be trusted."""


def _graph_get(path: str, params: dict[str, str]) -> dict[str, Any]:
    url = f"https://graph.facebook.com/{_GRAPH_VERSION}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read().decode())
            message = body.get("error", {}).get("message", "Facebook API error")
        except Exception:
            message = "Facebook API error"
        raise FacebookAuthError(message) from exc
    except Exception as exc:
        raise FacebookAuthError("Could not reach Facebook") from exc


def verify_facebook_access_token(token: str) -> dict[str, Any]:
    app_id = config.facebook_app_id()
    app_secret = config.facebook_app_secret()
    if not app_id or not app_secret:
        raise FacebookAuthError("Facebook sign-in is not configured")

    debug = _graph_get(
        "debug_token",
        {"input_token": token, "access_token": f"{app_id}|{app_secret}"},
    )
    data = debug.get("data") or {}
    if not data.get("is_valid"):
        raise FacebookAuthError("Invalid or expired Facebook token")
    if str(data.get("app_id")) != app_id:
        raise FacebookAuthError("Facebook token was not issued for this app")

    profile = _graph_get("me", {"fields": "id,name,email", "access_token": token})
    if not profile.get("email"):
        raise FacebookAuthError(
            "Facebook account did not share an email. Grant email permission or use another sign-in method."
        )

    return profile
