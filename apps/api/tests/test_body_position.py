"""BodyPosition — the Astronomy context's position value object."""

from __future__ import annotations

from engine.astronomy.engine import default_engine
from engine.astronomy.planets import graha_positions, planet_service
from engine.astronomy.position import BodyPosition, CelestialCoordinates
from engine.panchanga.spashta import spashta_table

JD = 2461335.0  # 2026-10-21 12:00 UT


def test_derived_fields_come_from_the_stored_longitude():
    pos = BodyPosition(body="mars", longitude=95.5, speed=0.6)
    assert pos.rashi_index == 3
    assert pos.rashi == 4
    assert pos.deg_in_rashi == 5.5
    assert pos.is_retrograde is False
    assert pos.motion() == "Margi"


def test_nodes_are_retrograde_by_convention():
    rahu = BodyPosition(body="rahu", longitude=10.0, speed=0.05)
    assert rahu.is_retrograde is True
    assert rahu.motion(locale="ne") == "वक्री"


def test_opposite_is_the_other_end_of_the_axis():
    rahu = BodyPosition(body="rahu", longitude=350.25, speed=-0.053)
    ketu = rahu.opposite("ketu")
    assert ketu == BodyPosition(body="ketu", longitude=170.25, speed=0.053)


def test_payload_is_the_spashta_row_with_coordinates_appended():
    coords = CelestialCoordinates(latitude=1.0, right_ascension=2.0, declination=3.0)
    pos = BodyPosition(body="sun", longitude=200.0, speed=1.0)
    assert list(pos.to_payload()) == [
        "longitude", "speed", "rashi", "rashi_name", "rashi_ne", "dms",
        "deg_in_rashi", "dms_in_rashi", "is_retrograde",
    ]
    full = pos.with_coordinates(coords).to_payload()
    assert list(full)[-3:] == ["latitude", "right_ascension", "declination"]


def test_engine_service_and_table_agree():
    engine_pos = default_engine.planet_position(JD, "jupiter")
    assert planet_service.position(JD, "jupiter") == engine_pos
    assert graha_positions(JD)["jupiter"] == engine_pos
    row = spashta_table(JD)["jupiter"]
    assert row == {**engine_pos.to_payload(), "is_combust": row["is_combust"]}
