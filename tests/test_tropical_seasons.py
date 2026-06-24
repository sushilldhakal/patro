from datetime import datetime, timezone

from panchanga.tropical_seasons import solar_apparent_longitude, tropical_season_cycle


def test_solar_longitude_in_range():
    lon = solar_apparent_longitude(datetime(2026, 6, 22, 12, tzinfo=timezone.utc))
    assert 0 <= lon < 360


def test_tropical_season_cycle_six_boundaries():
    cycle = tropical_season_cycle(datetime(2026, 6, 22, 12, tzinfo=timezone.utc))
    assert len(cycle) == 6
    assert sum(1 for b in cycle if b["is_current"]) == 1
    slots = {b["slot"] for b in cycle}
    assert slots == {0, 1, 2, 3, 4, 5}
