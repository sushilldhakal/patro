"""Tests for Surya/Toyanath day-block Panchanga renderer."""

from __future__ import annotations

from services.presentation.canonical import to_canonical
from services.presentation.panchanga_renderer import (
    render_day_block,
    render_day_block_from_state,
    render_month_stream,
)


def _sample_daily_state() -> dict:
    return {
        "date_bs": "2083-02-06",
        "date_ad": "2026-05-20",
        "weekday": "बुधबार",
        "weekday_en": "Wednesday",
        "sun": {"sunrise": "05:12", "sunset": "18:45", "noon": "12:00"},
        "moon": {"rise": "22:10", "set": "08:30"},
        "tithi": {
            "name": "Shashthi",
            "name_ne": "षष्ठी",
            "start": "2026-05-19 14:00",
            "end": "2026-05-20 17:05",
            "next": "Saptami",
            "next_ne": "सप्तमी",
        },
        "nakshatra": {
            "name": "Magha",
            "name_ne": "मघा",
            "end": "2026-05-20 09:57",
        },
        "yoga": {"name": "Siddhi", "name_ne": "सिद्धि", "end": "2026-05-20 18:12"},
        "karana": {"name": "Garaja", "name_ne": "गरज"},
        "paksha": "Krishna Paksha",
        "paksha_ne": "कृष्ण पक्ष",
        "chandra_rashi": "Simha",
        "chandra_rashi_ne": "सिंह",
        "surya_rashi": "Vrishabha",
        "surya_rashi_ne": "वृष",
        "ritu": "Grishma",
        "ritu_ne": "ग्रीष्म",
        "aayan": "Uttarayana",
        "aayan_ne": "उत्तरायण",
        "dinamaan": "13h 33m",
        "muhurta": {
            "rahu_kalam": {"start_time": "13:30", "end_time": "15:00"},
            "yamaganda": {"start_time": "09:00", "end_time": "10:30"},
            "gulika": {"start_time": "07:30", "end_time": "09:00"},
            "abhijit": {"start_time": "11:48", "end_time": "12:36"},
        },
        "location": {"name": "Kathmandu", "city_id": "1283240", "timezone": "Asia/Kathmandu"},
        "lunar_month": {"name": "Jyeshtha", "name_ne": "ज्येष्ठ"},
        "bs_date": {"year": 2083, "month": 2, "day": 6, "month_name": "Jestha", "month_name_ne": "जेठ"},
        "festivals": [{"id": "mohini_ekadashi", "name": "Mohini Ekadashi", "name_ne": "मोहिनी एकादशी"}],
        "from_cache": True,
    }


def test_render_day_block_contains_key_lines():
    canonical = to_canonical(_sample_daily_state())
    text = render_day_block(
        canonical,
        lunar_month="Jyeshtha",
        bs_month_name="Jestha",
    )
    assert "6, Jyeshtha" in text
    assert "Krishna Paksha, Shashthi" in text
    assert "Sunrise 05:12 | Sunset 18:45" in text
    assert "Moon: Simha" in text
    assert "Nakshatra: Magha (ends 09:57)" in text
    assert "Tithi ends: 17:05" in text
    assert "Yoga: Siddhi (ends 18:12)" in text
    assert "Karana: Garaja" in text
    assert "Rahu Kalam: 13:30-15:00" in text
    assert "Festival: Mohini Ekadashi" in text


def test_render_day_block_from_state_ne_locale():
    text = render_day_block_from_state(_sample_daily_state(), locale="ne")
    assert "षष्ठी" in text or "कृष्ण" in text
    assert "सूर्योदय" in text
    assert "नक्षत्र" in text
    assert "पर्व" in text


def test_render_month_stream_joins_blocks():
    state = _sample_daily_state()
    month_payload = {
        "year_bs": 2083,
        "month_bs": 2,
        "month_name": "Jestha",
        "month_name_ne": "जेठ",
        "lunar_month": "Jyeshtha",
        "location": {"name": "Kathmandu"},
        "calendar": [
            {"day": 6, "date_ad": "2026-05-20", "panchanga": state, "festivals": ["Mohini Ekadashi"]},
            {"day": 7, "date_ad": "2026-05-21", "tithi": "Saptami", "nakshatra": "Purva Phalguni", "sunrise": "05:12", "sunset": "18:46"},
        ],
    }
    payload = render_month_stream(month_payload, header={"shaka_sambat": "1948", "gregorian": "May 2026"})
    assert payload["meta"]["format"] == "dayblock_month"
    assert len(payload["days"]) == 2
    assert "────────────────────" in payload["text"]
    assert "Jestha 2083" in payload["text"]
    assert "Mohini Ekadashi" in payload["days"][0]
