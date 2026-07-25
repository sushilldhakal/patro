"""Tests for the daily Facebook panchanga poster and the Graph API client."""

from __future__ import annotations

import importlib.util
import io
import json
import pathlib
from datetime import date

import pytest

_SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "post_daily_panchanga.py"


def _load_poster():
    spec = importlib.util.spec_from_file_location("post_daily_panchanga", _SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_caption_and_urls():
    poster = _load_poster()
    day = date(2026, 7, 25)
    fields = {
        "weekday": "शनिवार",
        "ad_line": "२५ जुलाई २०२६",
        "tithi": "एकादशी",
        "nakshatra": "ज्येष्ठा",
        "yoga": "ब्रह्म",
        "karana": "विष्टि",
        "sunrise": "05:22",
        "sunset": "18:57",
    }
    caption = poster._build_caption(fields, day)
    assert "एकादशी" in caption and "ज्येष्ठा" in caption
    assert "सूर्योदय ०५:२२" in caption  # times localised to Devanagari digits
    assert "/panchanga?city=1283240&date=2026-07-25" in caption

    assert poster._image_url(day).endswith("date=2026-07-25&full=1")


def test_post_photo_by_url_builds_request(monkeypatch):
    from services import fb_page

    captured: dict = {}

    class _FakeResp(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def fake_urlopen(request, timeout=0):
        captured["url"] = request.full_url
        captured["body"] = request.data.decode("utf-8")
        return _FakeResp(json.dumps({"id": "111", "post_id": "111_222"}).encode())

    monkeypatch.setattr(fb_page.urllib.request, "urlopen", fake_urlopen)

    post_id = fb_page.post_photo_by_url(
        image_url="https://vedicpatro.com/og-image?full=1",
        caption="नमस्ते",
        page_id="9999",
        access_token="TOK",
    )
    assert post_id == "111_222"
    assert "/9999/photos" in captured["url"]
    assert "access_token=TOK" in captured["body"]
    assert "url=" in captured["body"] and "caption=" in captured["body"]


def test_post_photo_raises_on_bad_response(monkeypatch):
    from services import fb_page

    class _FakeResp(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(
        fb_page.urllib.request,
        "urlopen",
        lambda *a, **k: _FakeResp(json.dumps({"error": {"message": "nope"}}).encode()),
    )
    with pytest.raises(fb_page.FacebookPostError):
        fb_page.post_photo_by_url(
            image_url="x", caption="y", page_id="1", access_token="t"
        )
