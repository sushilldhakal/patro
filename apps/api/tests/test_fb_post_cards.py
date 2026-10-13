"""The extra daily Facebook posts (शुभ/अशुभ समय, D1 चक्र) and the app-link slot."""

from __future__ import annotations

import importlib.util
import pathlib
from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import config
from services import fb_post_content as fpc

FIELDS = {
    "bs_line": "आश्विन २७, २०८३",
    "ad_line": "१३ अक्टोबर २०२६",
    "weekday": "मङ्गलवार",
    "sunrise": "06:02",
    "sunset": "17:37",
}
PAYLOAD = {
    "muhurta": {
        "abhijit": {"start_time": "11:26", "end_time": "12:12"},
        "rahu_kalam": {"start_time": "14:43", "end_time": "16:10"},
        "yamaganda": {"start_time": "08:56", "end_time": "10:22"},
        "gulika": {"start_time": "11:49", "end_time": "13:16"},
    },
    "planets": {
        "sun": {"rashi_ne": "कन्या"},
        "moon": {"rashi_ne": "तुला"},
        "ketu": {"rashi_name": "Simha"},
    },
}


@pytest.fixture(autouse=True)
def _no_app_link(monkeypatch):
    monkeypatch.delenv("APP_LINK", raising=False)
    monkeypatch.delenv("FB_POST_KINDS", raising=False)


def test_card_links_are_unique_per_day_and_carry_the_card():
    a = fpc.card_page_url("periods", date(2026, 10, 13))
    b = fpc.card_page_url("periods", date(2026, 10, 14))
    assert "card=periods" in a and "date=2026-10-13" in a
    assert a != b  # Facebook caches link previews by URL — yesterday's card must not be reused
    assert fpc.card_page_url("d1", date(2026, 10, 13)) != a


def test_app_link_slot_is_empty_until_configured(monkeypatch):
    assert "app=" not in fpc.card_page_url("d1", date(2026, 10, 13))
    assert fpc.app_caption_line() == ""
    monkeypatch.setenv("APP_LINK", "https://vedicpatro.com/app")
    assert "app=vedicpatro.com%2Fapp" in fpc.card_page_url("d1", date(2026, 10, 13))  # scheme stripped for the image
    assert fpc.app_caption_line().strip() == "मोबाइल एप: https://vedicpatro.com/app"


def test_periods_caption_lists_headline_windows():
    text = fpc.periods_caption(FIELDS, PAYLOAD, "https://x/y")
    assert "शुभ: अभिजित् मुहूर्त ११:२६–१२:१२" in text
    assert "राहु काल १४:४३–१६:१०" in text and "यमगण्ड ०८:५६–१०:२२" in text
    assert text.rstrip().endswith("https://x/y")  # no app line without APP_LINK


def test_periods_caption_survives_missing_muhurta():
    text = fpc.periods_caption(FIELDS, {}, "https://x/y")
    assert "https://x/y" in text and "शुभ:" not in text


def test_d1_caption_names_each_graha_and_falls_back_to_english_rashi():
    text = fpc.d1_caption(FIELDS, PAYLOAD, "https://x/d1")
    assert "सूर्य कन्या · चन्द्र तुला · केतु Simha" in text
    assert "सूर्योदय ०६:०२" in text


def test_post_kinds_default_and_filtering(monkeypatch):
    assert config.fb_post_kinds() == ["main", "periods", "d1"]
    monkeypatch.setenv("FB_POST_KINDS", "main, d1 ,bogus")
    assert config.fb_post_kinds() == ["main", "d1"]
    monkeypatch.setenv("FB_POST_KINDS", "bogus")
    assert config.fb_post_kinds() == ["main"]  # never silently post nothing-by-typo


def _poster():
    path = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "post_daily_panchanga.py"
    spec = importlib.util.spec_from_file_location("post_daily_panchanga", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_each_kind_has_its_own_once_a_day_guard(tmp_path, monkeypatch):
    mod = _poster()
    monkeypatch.setattr(mod, "_STATE_FILE", tmp_path / "last.txt")
    day = date(2026, 10, 13)
    mod._mark_posted("periods", day)
    assert mod._already_posted("periods", day)
    assert not mod._already_posted("d1", day) and not mod._already_posted("main", day)
    assert mod._state_file("main").name == "last.txt"  # original guard file is kept for `main`


def test_share_page_is_card_specific():
    from api import og

    app = FastAPI()
    app.include_router(og.router)
    client = TestClient(app)
    base = "/share/panchanga?city=1283240&date=2026-10-13"
    periods = client.get(base + "&card=periods").text
    d1 = client.get(base + "&card=d1").text
    plain = client.get(base).text
    assert "आजका शुभ र अशुभ समय" in periods and "राहु काल" in periods
    assert "ग्रहस्थिति" in d1 and "D1" in d1
    assert "आजका शुभ र अशुभ समय" not in plain and "ग्रहस्थिति" not in plain
    # the card choice rides along to the image so each post gets its own picture
    assert "card=periods" in periods.split("og:image")[1].split(">")[0]
