"""Verify Sign in with Apple identity tokens (the JWT the native button returns).

Validates the RS256 signature against Apple's published JWKS, plus audience
(the iOS bundle ID and any Services IDs), issuer, and expiry.
"""

from __future__ import annotations

import logging
from typing import Any

import jwt
from jwt import PyJWKClient

import config

logger = logging.getLogger(__name__)

_APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
_APPLE_ISSUER = "https://appleid.apple.com"

_jwks_client = PyJWKClient(_APPLE_KEYS_URL)


class AppleAuthError(Exception):
    """Raised when an Apple identity token can't be trusted."""


def verify_apple_identity_token(token: str) -> dict[str, Any]:
    audiences = config.apple_client_ids()
    if not audiences:
        raise AppleAuthError("Apple sign-in is not configured")

    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audiences,
            issuer=_APPLE_ISSUER,
        )
    except Exception as exc:
        logger.warning("Apple identity token verification failed: %s: %s", type(exc).__name__, exc)
        raise AppleAuthError("Invalid or expired Apple token") from exc

    sub = claims.get("sub")
    if not sub or not isinstance(sub, str):
        raise AppleAuthError("Apple token did not include a user identifier")

    return claims
