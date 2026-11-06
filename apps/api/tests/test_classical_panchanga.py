"""Classical चन्द्रबल houses, Wednesday अभिजित्, and the shared tara names."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.panchanga.balam_panchaka import CHANDRA_GOOD_HOUSES, build_chandrabalam
from engine.panchanga.daily import build_daily_panchanga
from engine.panchanga.navatara import TARA_NAMES_EN, TARA_NAMES_NE, build_chandrabalam_table


def _set_names(moon_number: int) -> set[str]:
    block = build_chandrabalam(
        datetime(2026, 11, 6, tzinfo=ZoneInfo("Asia/Kathmandu")),
        [{"number": moon_number}],
    )
    return {chip["name_ne"] for chip in block["set1"]}


def test_chandra_good_houses_are_classical():
    assert CHANDRA_GOOD_HOUSES == (1, 3, 6, 7, 10, 11)


def test_kanya_set1_is_the_classical_rashis():
    assert _set_names(6) == {"कन्या", "कर्कट", "मेष", "मीन", "धनु", "वृश्चिक"}


def test_set1_and_set2_use_the_same_houses():
    block = build_chandrabalam(
        datetime(2026, 11, 6, tzinfo=ZoneInfo("Asia/Kathmandu")),
        [{"number": 1}, {"number": 2}],
    )
    assert {chip["name_ne"] for chip in block["set1"]} == {"मेष", "कुम्भ", "वृश्चिक", "तुला", "कर्कट", "मिथुन"}
    assert {chip["name_ne"] for chip in block["set2"]} == {"वृष", "मीन", "धनु", "वृश्चिक", "सिंह", "कर्कट"}


def test_chandrabala_table_for_kanya_follows_the_house():
    raw = build_daily_panchanga(date(2026, 11, 6), DEFAULT_LOCATION)
    assert raw["chandra_rashi"]["name_ne"] == "कन्या"
    rows = {row["name"]: row for row in raw["chandrabala_table"]["rows"]}
    expect = {
        "कन्या": (1, "good", "शुभ"),
        "वृश्चिक": (11, "good", "शुभ"),
        "कुम्भ": (8, "worst", "अष्टम चन्द्र"),
        "मेष": (6, "good", "शुभ"),
        "मिथुन": (4, "bad", "अशुभ"),
        "तुला": (12, "bad", "अशुभ"),
    }
    for name, (house, tone, quality) in expect.items():
        assert rows[name]["house"] == house
        assert rows[name]["tone"] == tone
        assert rows[name]["quality"] == quality
        assert "tara_num" not in rows[name]
    rashifal = {sign["name"]: sign for sign in raw["rashifal"]["signs"]}
    assert raw["rashifal"]["method"]["chandrabala"] == "transit_moon_house"
    for name, (house, tone, _) in expect.items():
        assert rashifal[name]["tone"] == tone
        assert rashifal[name]["house_from_moon"] == house
        assert rashifal[name]["lucky_number_en"] == str(house)


def test_house_table_covers_every_rashi_once():
    table = build_chandrabalam_table({"number": 6, "name_ne": "कन्या", "name": "Kanya"})
    assert sorted(row["house"] for row in table["rows"]) == list(range(1, 13))


def test_tara_names_are_the_shared_table():
    assert TARA_NAMES_NE == ("जन्म", "सम्पत्", "विपत्", "क्षेम", "प्रत्यक्", "साधक", "निधन", "मित्र", "परम मित्र")
    assert TARA_NAMES_EN == (
        "Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhaka", "Naidhana", "Mitra", "Parama Mitra",
    )


def test_wednesday_has_no_abhijit_and_thursday_does():
    wednesday = build_daily_panchanga(date(2026, 11, 4), DEFAULT_LOCATION)
    assert wednesday["vaara"]["number"] == 3
    assert wednesday["muhurta"]["abhijit"] is None
    assert "abhijit" not in {entry["key"] for entry in wednesday["muhurta"]["auspicious_timings"]}

    thursday = build_daily_panchanga(date(2026, 11, 5), DEFAULT_LOCATION)
    assert thursday["vaara"]["number"] == 4
    assert thursday["muhurta"]["abhijit"]["start_time"]
    assert "abhijit" in {entry["key"] for entry in thursday["muhurta"]["auspicious_timings"]}


def test_wednesday_follows_the_local_sunrise_not_utc():
    """Tokyo sunrise on a Wednesday is still Tuesday in UTC."""
    tokyo = ObserverLocation(lat=35.68, lon=139.76, timezone="Asia/Tokyo", name="Tokyo")
    day = build_daily_panchanga(date(2026, 11, 4), tokyo)
    assert day["vaara"]["name_english"] == "Wednesday"
    assert day["muhurta"]["abhijit"] is None
    hour, minute = (int(part) for part in day["sunrise"]["local_time_short"].split(":"))
    sunrise = datetime(2026, 11, 4, hour, minute, tzinfo=ZoneInfo("Asia/Tokyo"))
    assert sunrise.astimezone(ZoneInfo("UTC")).weekday() != 2
