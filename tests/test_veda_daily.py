"""The daily Veda mantra: deterministic per date, always has audio, rotates through all four Vedas."""

from __future__ import annotations

from datetime import date, timedelta

from services import documents_db


def test_same_date_same_mantra():
    day = date(2026, 10, 10)
    assert documents_db.daily_veda_shloka(day) == documents_db.daily_veda_shloka(day)


def test_every_pick_has_audio_and_fits_a_card():
    for offset in range(40):
        s = documents_db.daily_veda_shloka(date(2026, 10, 1) + timedelta(days=offset))
        assert s is not None
        assert s["audio_key"]
        assert 20 <= len(s["sanskrit"]) <= 260


def test_all_four_vedas_come_round():
    seen = {
        documents_db.daily_veda_shloka(date(2026, 10, 1) + timedelta(days=i))["document_slug"]
        for i in range(8)
    }
    assert seen == set(documents_db.VEDA_SLUGS)


def test_endpoint_shape():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from api import documents

    app = FastAPI()
    app.include_router(documents.router)
    res = TestClient(app).get("/veda/daily?date=2026-10-10")
    assert res.status_code == 200
    body = res.json()
    assert body["veda"]["slug"] in documents_db.VEDA_SLUGS
    assert body["shloka"]["sanskrit"]
    assert body["shloka"]["audio_url"] is None or body["shloka"]["audio_url"].startswith("http")
    assert body["source_parts"][-1]["label_en"] == "Mantra"
    assert body["read_chapter"] >= 1
