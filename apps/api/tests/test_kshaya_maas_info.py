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
