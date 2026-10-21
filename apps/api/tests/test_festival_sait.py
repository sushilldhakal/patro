"""Festival saits are computed at the observer, never converted from Kathmandu."""

from __future__ import annotations

from datetime import date, datetime

import pytest

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.festival_sait import SAIT_RULES, festival_saits
from engine.vedic.lunar_month import clear_lunar_year_cache

MELBOURNE = ObserverLocation(lat=-37.81, lon=144.96, timezone="Australia/Melbourne", name="Melbourne")
LONDON = ObserverLocation(lat=51.51, lon=-0.13, timezone="Europe/London", name="London")

DASHAIN_TIKA_2026 = date(2026, 10, 21)
LAXMI_PUJA_2026 = date(2026, 11, 8)


@pytest.fixture(autouse=True)
def _clear_cache():
    clear_lunar_year_cache()
    yield
    clear_lunar_year_cache()


def _one(day: date, fid: str, location: ObserverLocation) -> dict:
    saits = festival_saits(day, [fid], location)
    assert len(saits) == 1, saits
    return saits[0]


def test_days_without_a_ritual_festival_read_no_sky():
    assert festival_saits(DASHAIN_TIKA_2026, ["manvadi", "devi-visarjan"]) == []
    assert festival_saits(DASHAIN_TIKA_2026, []) == []


def test_dashain_tika_kathmandu_is_abhijit_under_dhanu():
    sait = _one(DASHAIN_TIKA_2026, "vijaya-dashami", DEFAULT_LOCATION)
    assert sait["ritual"] == "dashain-tika"
    assert sait["kaal"] == "abhijit"
    assert sait["lagna"]["name"] == "Dhanu"
    assert "11:00" <= sait["sait"]["start_local"] <= "12:30"


def test_dashain_tika_melbourne_follows_its_own_horizon():
    """South of the equator Dhanu has set before local Abhijit; the sait moves to it."""
    sait = _one(DASHAIN_TIKA_2026, "vijaya-dashami", MELBOURNE)
    assert sait["timezone"] == "Australia/Melbourne"
    assert sait["lagna"]["name"] == "Dhanu"
    assert "09:00" <= sait["sait"]["start_local"] <= "10:30"
    # Not a converted Kathmandu instant.
    ktm = _one(DASHAIN_TIKA_2026, "vijaya-dashami", DEFAULT_LOCATION)
    assert sait["sait"]["start"] != ktm["sait"]["start"]


@pytest.mark.parametrize("location", [DEFAULT_LOCATION, MELBOURNE, LONDON])
def test_laxmi_puja_is_vrishabha_in_local_pradosh(location):
    sait = _one(LAXMI_PUJA_2026, "laxmi-puja", location)
    assert sait["kaal"] == "pradosh"
    assert sait["lagna"]["name"] == "Vrishabha"
    window_start = datetime.fromisoformat(sait["window"]["start"])
    window_end = datetime.fromisoformat(sait["window"]["end"])
    start = datetime.fromisoformat(sait["sait"]["start"])
    end = datetime.fromisoformat(sait["sait"]["end"])
    assert window_start <= start < end <= window_end


def test_every_rule_names_known_kaals():
    from engine.vedic.festival_sait import _kaal_windows

    now = datetime(2026, 1, 1)
    known = _kaal_windows(now, now.replace(hour=12), now.replace(day=2))
    for rule in SAIT_RULES.values():
        assert set(rule.windows) <= set(known)


def test_phulpati_is_a_midday_sait():
    sait = _one(date(2026, 10, 17), "fulpati", DEFAULT_LOCATION)
    assert sait["ritual"] == "fulpati"
    assert sait["kaal"] == "abhijit"
    assert sait["lagna"] is not None


def test_early_morning_sait_also_offers_abhijit():
    """Ghatasthapana at the sunrise Kanya lagna may equally be done in Abhijit."""
    sait = _one(date(2026, 10, 11), "ghatasthapana", DEFAULT_LOCATION)
    assert sait["kaal"] == "pratah"
    assert sait["alternate"]["kaal"] == "abhijit"
    assert "11:00" <= sait["alternate"]["start_local"] <= "12:30"
    # A sait already in Abhijit needs no alternative.
    assert _one(DASHAIN_TIKA_2026, "vijaya-dashami", DEFAULT_LOCATION)["alternate"] is None


def test_ceremony_saits_name_a_permitted_local_lagna():
    from engine.vedic.festival_sait import CEREMONY_SAITS, ceremony_saits

    rows = ceremony_saits(date(2027, 2, 11), DEFAULT_LOCATION)
    assert {row["ritual"] for row in rows} == {"vivah", "bratabandha", "griha-pravesh"}
    for row in rows:
        assert row["kind"] == "ceremony"
        assert row["lagna"]["number"] in CEREMONY_SAITS[row["ritual"]]
        start = datetime.fromisoformat(row["sait"]["start"])
        end = datetime.fromisoformat(row["sait"]["end"])
        assert datetime.fromisoformat(row["window"]["start"]) <= start < end <= datetime.fromisoformat(row["window"]["end"])


def test_refined_muhurta_windows_sit_within_one_scan_step():
    from engine.vedic.muhurta_engine import _STEP, muhurta_windows

    day = date(2027, 2, 11)
    coarse = muhurta_windows("griha-pravesh", day, DEFAULT_LOCATION)
    fine = muhurta_windows("griha-pravesh", day, DEFAULT_LOCATION, refine=True)
    assert len(coarse) == len(fine) > 0
    for c, f in zip(coarse, fine):
        assert c.start - _STEP < f.start <= c.start
        assert c.end - _STEP <= f.end <= c.end
