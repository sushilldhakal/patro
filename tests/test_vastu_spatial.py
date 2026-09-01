"""Tests for the canonical Vastu spatial coordinate system (engine/vedic/vastu/spatial.py)."""

from __future__ import annotations

from engine.vedic.vastu import spatial


def test_counts():
    assert len(spatial.DIRECTION8) == 9  # 8 + centre
    assert len(spatial.DIRECTION16) == 16
    assert len(spatial.PADA32) == 32
    assert len(spatial.INNER4) == 4


def test_pada_code_matches_known_values():
    # Cross-checked against the web wheel and the user's own quoted content.
    assert spatial.PADA32_BY_ID["roga"].code == "N1"
    assert spatial.PADA32_BY_ID["soma"].code == "N5"
    assert spatial.PADA32_BY_ID["gandharva"].code == "S6"
    assert spatial.PADA32_BY_ID["bhringraj"].code == "S7"
    assert spatial.PADA32_BY_ID["pushpadanta"].code == "W4"
    assert spatial.PADA32_BY_ID["varuna"].code == "W5"


def test_pada_wall_and_index_are_internally_consistent():
    for pada in spatial.PADA32:
        assert pada.code == f"{pada.wall}{pada.index}"
        assert 1 <= pada.index <= 8
        assert pada.wall in ("N", "E", "S", "W")


def test_pada_bearing_is_11_25_degree_steps():
    for pada in spatial.PADA32:
        assert pada.bearing == pada.slot * 11.25


def test_dir16_ssw_padas_match_known_pair():
    ssw = spatial.DIRECTION16_BY_ID["ssw"]
    assert set(ssw.padas) == {"gandharva", "bhringraj"}


def test_dir16_bearings_are_22_5_degree_steps():
    for i, d in enumerate(spatial.DIRECTION16):
        assert d.bearing == i * 22.5


def test_zone_exists():
    assert spatial.zone_exists("pada32", "gandharva")
    assert spatial.zone_exists("dir16", "ssw")
    assert spatial.zone_exists("dir8", "southwest")
    assert spatial.zone_exists("inner4", "vivasvan")
    assert not spatial.zone_exists("pada32", "not-a-real-pada")
    assert not spatial.zone_exists("not-a-granularity", "x")


def test_inner4_bearings_match_cardinal_directions():
    for inner in spatial.INNER4:
        assert spatial.DIRECTION8_BY_ID[inner.direction].bearing == inner.bearing
