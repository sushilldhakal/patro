"""Verify Google Identity Services ID tokens (the JWT the GIS button returns).

Validates the RS256 signature against Google's published JWKS, plus the audience
(our client ID), issuer, and expiry. No client secret is needed for this flow.
"""

from __future__ import annotations

from typing import Any

import jwt
from jwt import PyJWKClient

import config

_GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_ALLOWED_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}

# Caches Google's signing keys across requests (refetches when a new kid appears).
_jwks_client = PyJWKClient(_GOOGLE_CERTS_URL)


class GoogleAuthError(Exception):
    """Raised when a Google ID token can't be trusted."""


def verify_google_id_token(token: str) -> dict[str, Any]:
    client_id = config.google_client_id()
    if not client_id:
        raise GoogleAuthError("Google sign-in is not configured")

    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
        )
    except Exception as exc:  # invalid signature, audience, expiry, malformed, etc.
        raise GoogleAuthError("Invalid or expired Google token") from exc

    if claims.get("iss") not in _ALLOWED_ISSUERS:
        raise GoogleAuthError("Untrusted token issuer")
    if not claims.get("email"):
        raise GoogleAuthError("Google token did not include an email")
    if claims.get("email_verified") is False:
        raise GoogleAuthError("Google account email is not verified")

    return claims
