from datetime import datetime, timezone

from engine.calendar.tropical_seasons import solar_apparent_longitude, tropical_season_cycle


def test_solar_longitude_in_range():
    lon = solar_apparent_longitude(datetime(2026, 6, 22, 12, tzinfo=timezone.utc))
    assert 0 <= lon < 360


def test_tropical_season_cycle_six_boundaries():
    cycle = tropical_season_cycle(datetime(2026, 6, 22, 12, tzinfo=timezone.utc))
    assert len(cycle) == 6
    assert sum(1 for b in cycle if b["is_current"]) == 1
    slots = {b["slot"] for b in cycle}
    assert slots == {0, 1, 2, 3, 4, 5}


def test_ritus_are_60_degree_arcs_with_the_solstices_on_their_edges():
    """Varsha opens at the June solstice, Shishira at the December one; the
    equinoxes fall mid-Vasanta and mid-Sharad."""
    from zoneinfo import ZoneInfo

    from engine.astronomy.engine import default_engine
    from engine.astronomy.rashi import rashi_service

    cycle = tropical_season_cycle(
        datetime(2026, 6, 22, 12, tzinfo=timezone.utc), ZoneInfo("Asia/Kathmandu")
    )
    by_slot = {b["slot"]: b for b in cycle}
    assert {s: b["angle"] for s, b in by_slot.items()} == {
        0: 330, 1: 30, 2: 90, 3: 150, 4: 210, 5: 270,
    }
    assert by_slot[5]["start_ad"] == "2026-12-22"  # solstice 21 Dec 20:50 UTC = 22 Dec 02:35 NPT

    def ritu_at(y, m, d):
        jd = default_engine.julian_day(datetime(y, m, d, 6, tzinfo=timezone.utc))
        return rashi_service.ritu(jd)["name"]

    assert ritu_at(2026, 6, 20) == "Grishma" and ritu_at(2026, 6, 22) == "Varsha"
    assert ritu_at(2026, 12, 21) == "Hemanta" and ritu_at(2026, 12, 23) == "Shishira"
    assert ritu_at(2026, 3, 20) == "Vasanta" and ritu_at(2026, 9, 23) == "Sharad"
