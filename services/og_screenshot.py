"""Headless-browser renderer for the Panchanga Open Graph image.

Screenshots the real दिन-चक्र timeline chart from the front-end's
`/panchanga/og-preview` page (Playwright + Chromium) so the share preview is
pixel-identical to the site and stays in sync as the chart evolves.

Kept deliberately simple: sync Playwright, launched per render inside FastAPI's
threadpool (sync endpoint), serialized by a lock so only one Chromium runs at a
time, with a small on-disk cache — a shared /panchanga link's chart is
deterministic, so the first crawler hit renders and the rest are served cached.
If anything here fails (Chromium missing, preview page down, timeout), the
caller falls back to the Pillow card, so /og-image always returns an image.
"""

from __future__ import annotations

import hashlib
import io
import logging
import threading
import time
from pathlib import Path

import config

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_CACHE_DIR = Path("/tmp/vedicpatro-og-cache")
_CACHE_TTL_SECONDS = 24 * 60 * 60  # a shared date is fixed; the bare "today" rolls daily
_VIEWPORT = {"width": 1280, "height": 960}

# Final Open Graph frame: 1200×630 (the 1.91:1 Facebook/X expect), rendered at
# 2× for crispness. The tall chart is fit-scaled and centred on a cream canvas so
# the whole timeline stays visible — no cropping — with seamless padding (the
# chart's own background is the same cream).
OG_W, OG_H, OG_SCALE = 1200, 630, 2
_CANVAS_BG = (247, 243, 234)  # #F7F3EA — matches the preview page background


def screenshot_available() -> bool:
    """Cheap gate so /og-image can skip straight to the card fallback."""
    if not config.og_screenshot_enabled():
        return False
    try:
        import playwright.sync_api  # noqa: F401
    except Exception:
        return False
    return True


def _cache_path(query: str) -> Path:
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()[:24]
    return _CACHE_DIR / f"{digest}.png"


def _read_cache(path: Path) -> bytes | None:
    try:
        if path.is_file() and (time.time() - path.stat().st_mtime) < _CACHE_TTL_SECONDS:
            return path.read_bytes()
    except OSError:
        pass
    return None


def _write_cache(path: Path, data: bytes) -> None:
    try:
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(path)
    except OSError:
        logger.debug("Could not write OG screenshot cache", exc_info=True)


def _letterbox(png: bytes) -> bytes:
    """Fit the captured chart (variable height) onto a fixed 1200×630 cream
    canvas, centred — the whole chart stays visible, never cropped."""
    from PIL import Image

    src = Image.open(io.BytesIO(png)).convert("RGB")
    target_w, target_h = OG_W * OG_SCALE, OG_H * OG_SCALE
    scale = min(target_w / src.width, target_h / src.height)
    new_w = max(1, round(src.width * scale))
    new_h = max(1, round(src.height * scale))
    resized = src.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGB", (target_w, target_h), _CANVAS_BG)
    canvas.paste(resized, ((target_w - new_w) // 2, (target_h - new_h) // 2))

    out = io.BytesIO()
    canvas.save(out, format="PNG", optimize=True)
    return out.getvalue()


def _capture(query: str, timeout_ms: int) -> bytes:
    from playwright.sync_api import sync_playwright

    url = f"{config.og_preview_base_url()}/panchanga/og-preview"
    if query:
        url = f"{url}?{query}"

    launch_kwargs: dict = {"args": ["--no-sandbox", "--disable-dev-shm-usage"]}
    chromium_path = config.og_chromium_path()
    if chromium_path:
        launch_kwargs["executable_path"] = chromium_path

    with sync_playwright() as pw:
        browser = pw.chromium.launch(**launch_kwargs)
        try:
            page = browser.new_page(viewport=_VIEWPORT, device_scale_factor=2)
            page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            page.wait_for_selector('#og-capture[data-og-ready="1"]', timeout=timeout_ms)
            element = page.query_selector("#og-capture")
            if element is None:
                raise RuntimeError("og-capture element not found")
            return element.screenshot(type="png")
        finally:
            browser.close()


def render_timeline_png(query: str, *, timeout_ms: int = 30000) -> bytes:
    """Screenshot the timeline chart for the given shareable-URL query string.
    Raises on any failure so the caller can fall back to the card."""
    cache = _cache_path(query)
    cached = _read_cache(cache)
    if cached is not None:
        return cached

    with _lock:
        # Another thread may have populated the cache while we waited for the lock.
        cached = _read_cache(cache)
        if cached is not None:
            return cached
        png = _letterbox(_capture(query, timeout_ms))

    _write_cache(cache, png)
    return png
