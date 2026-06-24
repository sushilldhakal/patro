from panchanga.choghadiya import build_choghadiya, day_ghati_from_sun_times


def test_day_ghati_from_sun_times():
    g = day_ghati_from_sun_times("05:08", "18:42")
    assert g is not None
    assert 30 < g < 35


def test_build_choghadiya_sixteen_segments():
    segments = build_choghadiya(32.0, 1)
    assert len(segments) == 16
    assert segments[0]["phase"] == "day"
    assert segments[8]["phase"] == "night"
    assert segments[0]["start_g"] == 0
    assert segments[-1]["end_g"] == 60.0
