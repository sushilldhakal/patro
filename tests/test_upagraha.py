"""Upagraha positions — sun-based formulas and kāla-velā portion scheme."""

from engine.astronomy.location import ObserverLocation
from engine.vedic.at_time import build_panchanga_at_time, parse_query_datetime
from engine.vedic.upagraha import sun_based_upagrahas


def test_sun_based_upagrahas_classical_arcs():
    # Reference chart: Sun at 57°28' sidereal.
    rows = {r["key"]: r["longitude"] for r in sun_based_upagrahas(57.4667)}
    assert abs(rows["dhuma"] - 190.80) < 0.01
    assert abs(rows["vyatipata"] - 169.20) < 0.01
    assert abs(rows["parivesha"] - 349.20) < 0.01
    assert abs(rows["indra_chapa"] - 10.80) < 0.01
    assert abs(rows["upaketu"] - 27.47) < 0.01
    # Vyatipata mirrors Dhuma; Indra Chapa mirrors Parivesha.
    assert abs((rows["dhuma"] + rows["vyatipata"]) % 360) < 1e-6
    assert abs((rows["parivesha"] + rows["indra_chapa"]) % 360) < 1e-6


def test_at_time_snapshot_includes_upagrahas():
    loc = ObserverLocation(
        name="Kathmandu", lat=27.7172, lon=85.3240, timezone="Asia/Kathmandu"
    )
    instant = parse_query_datetime("1990-08-15T06:30:00", timezone_name=loc.timezone)
    state = build_panchanga_at_time(instant, loc)
    rows = {r["key"]: r for r in state["detail"]["upagrahas"]}

    assert len(rows) == 11
    for row in rows.values():
        assert 0 <= row["longitude"] < 360
        assert 1 <= row["rashi"] <= 12

    # Daytime birth on a Wednesday: portions run Me Ju Ve Sa Su Mo Ma —
    # Ardha Prahara (Mercury) opens the day; Gulika rises at the start of
    # Saturn's portion and Mandi at its middle (JHora convention).
    assert rows["ardha_prahara"]["at_utc"] < rows["yama_ghantaka"]["at_utc"]
    assert rows["gulika"]["at_utc"] < rows["mandi"]["at_utc"]
    assert rows["mandi"]["at_utc"] < rows["kala"]["at_utc"]
    assert rows["kala"]["at_utc"] < rows["mrityu"]["at_utc"]
