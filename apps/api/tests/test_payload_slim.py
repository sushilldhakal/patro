"""``slim=true`` trims only what the apps never read, and never changes the rest.

The client re-links the de-duplicated ``detail`` keys from the top level
(``relinkDayDetail`` in packages/api-client), so a slim day re-linked must equal
the default day minus ``rashifal``.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from services.payload_slim import (
    MONTH_EMBED_SLIM_DROP_KEYS,
    slim_day_payload,
    slim_month_payload,
)

client = TestClient(app)


def _relink(day: dict) -> dict:
    for key in day.pop("detail_shared", []):
        day["detail"][key] = day[key]
    return day


def test_slim_day_unit_copies_and_dedupes():
    shared = {"a": 1}
    payload = {"tithi": shared, "rashifal": {"x": 1}, "detail": {"tithi": shared, "only": 2, "rashifal": {}}}
    slim = slim_day_payload(payload)
    assert slim == {"tithi": shared, "detail": {"only": 2}, "detail_shared": ["tithi"]}
    # The input (possibly cached) is untouched.
    assert "rashifal" in payload and "tithi" in payload["detail"]


def test_slim_month_unit_drops_unread_blocks():
    row = {
        "day": 1,
        "festivals": ["x"],
        "panchanga": {"tithi": {}, "udaya_lagna": [1], "lagna_spans": [2], "hora": [], "rashifal": {}},
    }
    payload = {"calendar": [row]}
    slim = slim_month_payload(payload)
    embed = slim["calendar"][0]["panchanga"]
    assert set(embed) == {"tithi", "udaya_lagna"}
    assert slim["calendar"][0]["festivals"] == ["x"]
    assert "hora" in row["panchanga"]


def test_slim_month_keeps_lagna_spans_without_udaya_lagna():
    slim = slim_month_payload({"calendar": [{"panchanga": {"udaya_lagna": [], "lagna_spans": [2]}}]})
    assert slim["calendar"][0]["panchanga"]["lagna_spans"] == [2]


def test_slim_day_route_relinks_to_default_minus_rashifal():
    base = "/v1/panchanga/2026-10-16?era=ad&festivals=true&detail=true"
    full = client.get(base).json()
    slim = client.get(base + "&slim=true").json()
    assert "rashifal" not in slim
    assert len(str(slim)) < len(str(full)) * 0.6
    expected = {k: v for k, v in full.items() if k != "rashifal"}
    expected["detail"] = {k: v for k, v in full["detail"].items() if k != "rashifal"}
    assert _relink(slim) == expected


def test_slim_full_month_route_keeps_rows():
    base = "/v1/panchanga/2083/6?full=true&era=bs&language=ne"
    full = client.get(base).json()
    slim = client.get(base + "&slim=true").json()
    assert len(slim["calendar"]) == len(full["calendar"])
    for f_row, s_row in zip(full["calendar"], slim["calendar"]):
        assert {k: v for k, v in f_row.items() if k != "panchanga"} == {
            k: v for k, v in s_row.items() if k != "panchanga"
        }
        assert not MONTH_EMBED_SLIM_DROP_KEYS & set(s_row["panchanga"])
        for key, value in s_row["panchanga"].items():
            assert f_row["panchanga"][key] == value


def test_lite_month_ignores_slim():
    base = "/v1/panchanga/2083/6?era=bs&language=ne"
    assert client.get(base).json() == client.get(base + "&slim=true").json()
