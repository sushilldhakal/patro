"""Short-lived signed links to the private R2 bucket that holds the reader's audio.

The bucket is not public: the only way to fetch a recording is a SigV4
query-signed ``GET`` link that this module builds locally (no network call).
Each link names one object and stops working ``R2_SIGNED_URL_TTL_HOURS`` after
the start of the window it was issued in, so a link copied out of the network
tab or the JSON is useless a day later, and the bucket itself can't be listed or
crawled.

Links are deterministic within a window — signed at the window's start, not at
request time — so a whole chapter payload is identical for everyone during that
window and can still be cached (Redis, the edge, the browser). The window index
goes into the documents cache key (:func:`cache_token`); a new window builds new
links. With the defaults (6 h window, 30 h lifetime) every link handed out stays
valid for at least 24 h, which covers a reader left open overnight and the
app's one-hour staleTime with room to spare.

Turned on by setting the R2 S3 credentials (see :func:`config.r2_signing`). When
they're absent (local dev, tests), callers fall back to the public base URL.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from datetime import datetime, timezone
from urllib.parse import quote

import config

_REGION = "auto"
_SERVICE = "s3"


def _window(now: float | None = None) -> tuple[int, int]:
    """(window index, window start as a Unix timestamp) for ``now``."""
    size = config.r2_signing_window_seconds()
    t = int(time.time() if now is None else now)
    index = t // size
    return index, index * size


def cache_token(now: float | None = None) -> str:
    """The piece of the cache key that changes when signed links roll over ("" when unsigned)."""
    if config.r2_signing() is None:
        return ""
    return f"w{_window(now)[0]}"


def _hmac(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def signed_url(key: str, now: float | None = None) -> str | None:
    """A time-limited ``GET`` link to ``key`` in the bucket, or None when signing is off."""
    signing = config.r2_signing()
    if signing is None:
        return None
    _, start = _window(now)
    stamp = datetime.fromtimestamp(start, tz=timezone.utc)
    amz_date = stamp.strftime("%Y%m%dT%H%M%SZ")
    day = stamp.strftime("%Y%m%d")
    scope = f"{day}/{_REGION}/{_SERVICE}/aws4_request"
    host = signing.host
    path = "/" + quote(signing.bucket, safe="") + "/" + "/".join(quote(seg, safe="-_.~") for seg in key.split("/"))
    query = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": f"{signing.access_key_id}/{scope}",
        "X-Amz-Date": amz_date,
        "X-Amz-Expires": str(config.r2_signed_url_ttl_seconds()),
        "X-Amz-SignedHeaders": "host",
    }
    canonical_query = "&".join(
        f"{quote(k, safe='-_.~')}={quote(v, safe='-_.~')}" for k, v in sorted(query.items())
    )
    canonical_request = "\n".join(
        ["GET", path, canonical_query, f"host:{host}\n", "host", "UNSIGNED-PAYLOAD"]
    )
    string_to_sign = "\n".join(
        ["AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()]
    )
    k = _hmac(("AWS4" + signing.secret_access_key).encode("utf-8"), day)
    k = _hmac(k, _REGION)
    k = _hmac(k, _SERVICE)
    k = _hmac(k, "aws4_request")
    signature = hmac.new(k, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"https://{host}{path}?{canonical_query}&X-Amz-Signature={signature}"
