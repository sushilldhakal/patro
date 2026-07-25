"""Tests for the anga-change Facebook poster (change detection + caption)."""

from __future__ import annotations

import importlib.util
import json
import pathlib
from datetime import datetime
from zoneinfo import ZoneInfo

_SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "post_panchanga_changes.py"


def _load():
    spec = importlib.util.spec_from_file_location("post_panchanga_changes", _SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_caption_has_label_time_and_link():
    mod = _load()
    now = datetime(2026, 7, 25, 11, 50, tzinfo=ZoneInfo("Asia/Kathmandu"))
    caption = mod._caption("तिथि", "द्वादशी", now, now.date())
    assert caption.startswith("तिथि परिवर्तन — अब द्वादशी")
    assert "काठमाडौँ · ११:५०" in caption  # Devanagari-digit clock
    assert "/panchanga?city=1283240&date=2026-07-25" in caption


def test_first_run_records_baseline_without_posting(tmp_path, monkeypatch):
    mod = _load()
    state = tmp_path / "anga.json"
    monkeypatch.setattr(mod, "_STATE_FILE", state)
    monkeypatch.setattr(mod, "_current_angas", lambda now: {
        "tithi": "एकादशी", "nakshatra": "अनुराधा", "yoga": "ब्रह्म", "karana": "विष्टि",
    })
    monkeypatch.setenv("FB_PAGE_ID", "1")
    monkeypatch.setenv("FB_PAGE_ACCESS_TOKEN", "t")

    assert mod.main([]) == 0
    assert json.loads(state.read_text())["tithi"] == "एकादशी"  # baseline saved


def test_only_changed_angas_are_posted(tmp_path, monkeypatch):
    mod = _load()
    state = tmp_path / "anga.json"
    state.write_text(json.dumps({
        "tithi": "एकादशी", "nakshatra": "अनुराधा", "yoga": "ब्रह्म", "karana": "विष्टि",
    }, ensure_ascii=False))
    monkeypatch.setattr(mod, "_STATE_FILE", state)
    # tithi + karana change; nakshatra + yoga unchanged.
    monkeypatch.setattr(mod, "_current_angas", lambda now: {
        "tithi": "द्वादशी", "nakshatra": "अनुराधा", "yoga": "ब्रह्म", "karana": "बव",
    })
    monkeypatch.setenv("FB_PAGE_ID", "1")
    monkeypatch.setenv("FB_PAGE_ACCESS_TOKEN", "t")

    posted: list[str] = []

    def fake_post(*, image_url, caption, page_id, access_token):
        posted.append(caption)
        return "post_1"

    import services.fb_page as fb_page
    monkeypatch.setattr(fb_page, "post_photo_by_url", fake_post)

    assert mod.main([]) == 0
    assert len(posted) == 2
    labels = " ".join(posted)
    assert "तिथि परिवर्तन — अब द्वादशी" in labels
    assert "करण परिवर्तन — अब बव" in labels
    assert "नक्षत्र" not in labels and "योग परिवर्तन" not in labels
    # State advanced to the new values.
    saved = json.loads(state.read_text())
    assert saved["tithi"] == "द्वादशी" and saved["karana"] == "बव"


def test_failed_post_is_retried_next_run(tmp_path, monkeypatch):
    mod = _load()
    state = tmp_path / "anga.json"
    state.write_text(json.dumps({"tithi": "एकादशी"}, ensure_ascii=False))
    monkeypatch.setattr(mod, "_STATE_FILE", state)
    monkeypatch.setattr(mod, "_current_angas", lambda now: {"tithi": "द्वादशी"})
    monkeypatch.setenv("FB_PAGE_ID", "1")
    monkeypatch.setenv("FB_PAGE_ACCESS_TOKEN", "t")

    import services.fb_page as fb_page

    def boom(**_kwargs):
        raise fb_page.FacebookPostError("nope")

    monkeypatch.setattr(fb_page, "post_photo_by_url", boom)
    assert mod.main([]) == 0
    # tithi still shows the OLD value so the next poll retries the post.
    assert json.loads(state.read_text()).get("tithi") == "एकादशी"
