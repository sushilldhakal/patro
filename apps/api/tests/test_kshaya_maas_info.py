"""Kshaya Maas payload: the surviving/dropped month names the apps display."""

from __future__ import annotations

from datetime import datetime

from engine.panchanga import kshaya_maas


def test_poush_magha_kshaya_names(monkeypatch):
    # Sun enters Makara (9) then Kumbha (10) inside one lunar month — 1983.
    monkeypatch.setattr(kshaya_maas, "count_sankrantis_in_period", lambda s, e: [9, 10])
    info = kshaya_maas.get_kshaya_maas_info(datetime(1983, 1, 15), datetime(1983, 2, 13))
    assert info is not None
    assert info["is_kshaya"] is True
    assert info["month_name"] == "Poush"
    assert info["dropped_month_name"] == "Magh"
    assert info["full_name_en"] == "Poush–Magh Kshaya"
    assert info["full_name_ne"] == "पौष–माघ क्षय"


def test_ordinary_month_is_not_kshaya(monkeypatch):
    monkeypatch.setattr(kshaya_maas, "count_sankrantis_in_period", lambda s, e: [9])
    assert kshaya_maas.get_kshaya_maas_info(datetime(2026, 1, 1), datetime(2026, 1, 30)) is None


def test_real_1983_poush_counts_both_sankrantis():
    """Makar Sankranti lands within hours of the Aausi that opens Poush 2039 —
    it must still be counted, or the Kshaya month goes undetected."""
    from engine.panchanga.lunar_month import get_lunar_year

    poush = next(
        m
        for m in get_lunar_year(1982).months
        if m.start_Aausi.date().isoformat() == "1983-01-14"
    )
    assert kshaya_maas.count_sankrantis_in_period(poush.start_Aausi, poush.end_Aausi) == [9, 10]
    info = kshaya_maas.get_kshaya_maas_info(poush.start_Aausi, poush.end_Aausi)
    assert info["full_name_en"] == "Poush–Magh Kshaya"


def test_bs_2039_has_two_adhik_months_and_one_kshaya():
    """BS 2039 (1982-83): Adhik Ashwin, the Poush–Magh Kshaya, Adhik Falgun."""
    from services.festivals.holiday_generator import get_special_months_for_bs_year

    r = get_special_months_for_bs_year(2039)
    assert [(a["month_name"], a["start_date"]) for a in r["adhik_months"]] == [
        ("Ashwin", "1982-09-17"),
        ("Falgun", "1983-02-13"),
    ]
    assert r["adhik_maas"]["month_name"] == "Ashwin"
    assert r["kshaya_maas"]["is_kshaya"] is True
    assert r["kshaya_maas"]["full_name_en"] == "Poush–Magh Kshaya"
    assert r["kshaya_maas"]["start_date"] == "1983-01-14"


def test_bs_2020_kshaya_between_two_adhik_months():
    from services.festivals.holiday_generator import get_special_months_for_bs_year

    r = get_special_months_for_bs_year(2020)
    assert [a["month_name"] for a in r["adhik_months"]] == ["Kartik", "Chaitra"]
    assert r["kshaya_maas"]["month_name"] == "Kartik"


def test_ordinary_bs_year_has_no_kshaya():
    from services.festivals.holiday_generator import get_special_months_for_bs_year

    r = get_special_months_for_bs_year(2038)
    assert r["kshaya_maas"]["is_kshaya"] is False
    assert r["adhik_months"] == []
