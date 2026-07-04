from datetime import datetime, timezone

from engine.vedic.hora import build_hora, _lord_at


def test_lord_at_sunday_first_hora_is_sun():
    assert _lord_at(0, 0) == "sun"
    assert _lord_at(0, 1) == "venus"


def test_lord_at_monday_first_hora_is_moon():
    assert _lord_at(1, 0) == "moon"


def test_build_hora_twenty_four_slots():
    sunrise = datetime(2026, 7, 4, 0, 15, tzinfo=timezone.utc)
    sunset = datetime(2026, 7, 4, 13, 45, tzinfo=timezone.utc)
    next_sunrise = datetime(2026, 7, 5, 0, 16, tzinfo=timezone.utc)
    slots = build_hora(
        sunrise,
        sunset,
        next_sunrise,
        vaara_num=5,  # Friday → Venus day lord
        tz_name="Asia/Kathmandu",
        sunrise_short="05:45",
        sunset_short="18:30",
    )
    assert len(slots) == 24
    assert slots[0]["phase"] == "day"
    assert slots[0]["planet"] == "venus"
    assert slots[12]["phase"] == "night"
    assert slots[0]["start_local_time_short"]
    assert slots[0]["end_g"] > slots[0]["start_g"]
