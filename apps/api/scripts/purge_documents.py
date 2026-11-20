#!/usr/bin/env python3
"""Clear only the changed documents' pages from Cloudflare — never the whole site.

Documents are cached by Cloudflare alone (never Redis) for up to ~4 h, and
their URLs do not change on an edit. After a deploy that edits a manifest,
scripts/deploy.sh calls this with the changed slugs, and it purges exactly the
URLs the app requests for them (packages/api-client/src/documents.ts):

* the documents list (``/documents?v=<dv>``);
* each changed document's detail page;
* each chapter, whole (offline packs) and every forward page the reader walks
  (``?limit=25&v=<dv>``, then ``?cursor=…&direction=next&limit=25&v=<dv>``),
  found by following ``next_cursor`` against the API's loopback port.

Verse-centred and backward pages are not listed; they expire on their own
(s-maxage, at most ~4 h). Cloudflare takes 30 URLs per purge call.

    python apps/api/scripts/purge_documents.py rigveda agni-purana

Needs CLOUDFLARE_API_TOKEN (Zone → Cache Purge) and CLOUDFLARE_ZONE_ID in the
environment; without them it prints a note and exits 0.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from warm_cache import app_versions  # noqa: E402

PUBLIC = "https://www.vedicpatro.com/api/v1"
ORIGIN = os.getenv("INTERNAL_API_BASE", "http://127.0.0.1:8000").rstrip("/") + "/v1"
PAGE = 25
BATCH = 30


def _get(path: str) -> dict:
    req = urllib.request.Request(ORIGIN + path, headers={"Host": "www.vedicpatro.com", "User-Agent": "vedicpatro-purge"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def urls_for(slug: str, dv: str) -> list[str]:
    s = urllib.parse.quote(slug, safe="")
    urls = [f"/documents/{s}"]
    try:
        detail = _get(f"/documents/{s}")
    except Exception as exc:  # removed document: its detail is enough
        print(f"  {slug}: {exc}", file=sys.stderr)
        return urls
    for chapter in detail.get("chapters") or []:
        n = chapter.get("number")
        if n is None:
            continue
        base = f"/documents/{s}/chapters/{n}"
        urls.append(base)
        query = urllib.parse.urlencode({"limit": PAGE, "v": dv})
        for _ in range(2000):  # a chapter never has this many pages; guards a loop
            urls.append(f"{base}?{query}")
            try:
                page = _get(f"{base}?{query}")
            except Exception:
                break
            cursor = page.get("next_cursor")
            if cursor is None:
                break
            query = urllib.parse.urlencode({"cursor": cursor, "direction": "next", "limit": PAGE, "v": dv})
    return urls


def purge(urls: list[str], token: str, zone: str) -> int:
    failed = 0
    for i in range(0, len(urls), BATCH):
        body = json.dumps({"files": [PUBLIC + u for u in urls[i : i + BATCH]]}).encode()
        req = urllib.request.Request(
            f"https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache",
            data=body,
            method="POST",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if not json.loads(resp.read()).get("success"):
                    failed += 1
        except Exception as exc:
            print(f"  purge call failed: {exc}", file=sys.stderr)
            failed += 1
    return failed


def main() -> int:
    slugs = [s for s in sys.argv[1:] if s and not s.startswith("_")]
    token, zone = os.getenv("CLOUDFLARE_API_TOKEN", ""), os.getenv("CLOUDFLARE_ZONE_ID", "")
    if not token or not zone:
        print("NOTE: CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID not set; changed documents refresh within ~4 h.")
        return 0
    dv = app_versions()["dv"]
    urls = [f"/documents?v={dv}", "/documents"]
    for slug in slugs:
        urls += urls_for(slug, dv)
    urls = list(dict.fromkeys(urls))
    failed = purge(urls, token, zone)
    print(f"purged {len(urls)} document URLs for {len(slugs)} documents ({failed} failed calls)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
