from datetime import date, datetime, timezone

from fastapi.testclient import TestClient

from app.main import app
from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.swiss_eph import calculate_sunrise
from engine.astronomy.ut_instant import as_julian_day, parse_ephemeris_instant
from engine.vedic.gochar import (
    find_next_nakshatra_entry,
    find_next_pada_entry,
    find_next_rashi_entry,
    build_gochar_ingress_range,
    build_gochar_ingress_range_civil,
    find_ingress_entries_in_range,
)

# BS 20 Baisakh 1 lands in 37 BCE — the era where `datetime.date` gives up.
EARLY_BS_RANGE = {"from": "20-04-14", "to": "20-05-14", "era": "bs"}
BCE_AD_RANGE = {"from": "-0037-07-02", "to": "-0037-08-02", "era": "ad"}
LOCATION_PARAMS = {"lat": 27.7172, "lon": 85.324, "tz": "Asia/Kathmandu"}


def _event_jds(payload: dict) -> list[float]:
    return [
        as_julian_day(parse_ephemeris_instant(e["entry_time_utc"]))
        for e in payload["events"]
    ]


def test_find_next_pada_entry_sun():
    sunrise = calculate_sunrise(
        date(2026, 6, 22),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    entry = find_next_pada_entry("sun", sunrise)
    assert entry is not None
    assert entry["level"] == "pada"
    assert 1 <= entry["to_pada"] <= 4
    assert entry["to_nakshatra_ne"]
    assert "मा" in entry["label_ne"]


def test_find_next_nakshatra_entry_sun():
    sunrise = calculate_sunrise(
        date(2026, 6, 22),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    entry = find_next_nakshatra_entry("sun", sunrise)
    assert entry is not None
    assert entry["level"] == "nakshatra"
    assert entry["to_nakshatra_ne"]


def test_pada_ingress_range_july():
    payload = build_gochar_ingress_range(
        date(2026, 6, 1),
        date(2026, 7, 31),
        DEFAULT_LOCATION,
        level="pada",
        grahas=["sun"],
    )
    events = payload["events"]
    assert len(events) >= 10
    assert all(e["graha"] == "sun" for e in events)
    assert all("label_ne" in e for e in events)
    assert all("entry_time_local_short" in e for e in events)


def test_pada_ingress_range_ashar_2083():
    """Ashar 2083 should list sun/mars pada changes plus mercury rashi re-entry."""
    payload = build_gochar_ingress_range(
        date(2026, 6, 15),
        date(2026, 7, 16),
        DEFAULT_LOCATION,
        level="patro",
    )
    events = payload["events"]
    assert len(events) >= 25
    grahas = {e["graha"] for e in events}
    assert "sun" in grahas
    assert "mars" in grahas
    assert "mercury" in grahas
    assert "venus" in grahas
    mercury_rashi = [e for e in events if e["graha"] == "mercury" and e["level"] == "rashi"]
    assert len(mercury_rashi) >= 2
    assert any("पुनः" in e.get("label_ne", "") for e in mercury_rashi)


def test_bisect_finds_retrograde_rashi_loop():
    sunrise = calculate_sunrise(
        date(2026, 6, 15),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    entry = find_next_rashi_entry("mercury", sunrise)
    assert entry is not None
    assert entry["to_rashi_ne"] == "कर्कट"
    start = datetime(2026, 6, 1, tzinfo=timezone.utc)
    end = datetime(2026, 6, 30, tzinfo=timezone.utc)
    events = find_ingress_entries_in_range(
        start, end, level="pada", grahas=["mercury"]
    )
    times = [e["entry_time_utc"] for e in events]
    assert times == sorted(times)


def test_ingress_range_civil_bce():
    """A 37 BCE month still yields a sunrise-anchored, chronological timeline."""
    payload = build_gochar_ingress_range_civil(
        CivilDay(-37, 7, 2),
        CivilDay(-37, 8, 2),
        DEFAULT_LOCATION,
        level="pada",
        grahas=["sun"],
    )
    assert payload["from_jd"] == CivilDay(-37, 7, 2).to_jd_ut()
    assert payload["to_jd"] == CivilDay(-37, 8, 2).to_jd_ut()
    events = payload["events"]
    assert len(events) >= 8
    assert _event_jds(payload) == sorted(_event_jds(payload))
    for e in events:
        assert e["graha"] == "sun"
        assert e["entry_time_utc"].startswith("-0037-")
        assert "entry_jd" in e
        assert "entry_vedic_jd" in e
        assert "entry_date_ad" not in e
        assert len(e["entry_time_local_short"]) == 5
        assert "मा" in e["label_ne"]


def test_ingress_range_civil_patro_level_bce():
    """The merged patro level (pada + rashi + udayast + motion) survives BCE."""
    payload = build_gochar_ingress_range_civil(
        CivilDay(-37, 7, 2), CivilDay(-37, 8, 2), DEFAULT_LOCATION, level="patro",
    )
    assert len(payload["events"]) >= 25
    assert {"pada", "rashi"} <= {e["level"] for e in payload["events"]}
    assert _event_jds(payload) == sorted(_event_jds(payload))


def test_ingress_range_civil_orders_across_bce_year_boundary():
    """BCE ISO strings sort backwards — ordering must come from the JD, not text."""
    payload = build_gochar_ingress_range_civil(
        CivilDay(-38, 12, 20),
        CivilDay(-37, 1, 20),
        DEFAULT_LOCATION,
        level="pada",
        grahas=["sun"],
    )
    dates = [e["entry_jd"] for e in payload["events"]]
    assert any(CivilDay.from_jd_ut(jd).year == -38 for jd in dates)
    assert any(CivilDay.from_jd_ut(jd).year == -37 for jd in dates)
    assert _event_jds(payload) == sorted(_event_jds(payload))


def test_ingress_endpoint_early_bs_range():
    """BS < 60 used to 422 at query validation ("input is too short")."""
    client = TestClient(app)
    resp = client.get(
        "/v1/nepal/gochar/ingress",
        params={**EARLY_BS_RANGE, "level": "pada", **LOCATION_PARAMS},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload.get("from_jd_date") or payload.get("from_jd")
    assert payload["events"]


def test_ingress_endpoint_negative_ad_range():
    """Negative AD years used to 422 ("invalid character in year")."""
    client = TestClient(app)
    resp = client.get(
        "/v1/nepal/gochar/ingress",
        params={**BCE_AD_RANGE, "level": "pada", **LOCATION_PARAMS},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload.get("from_jd_date")
    assert payload.get("to_jd_date")
    assert payload["events"]


def test_ingress_endpoint_bs_and_ad_agree_in_bce():
    """BS 20-04-14 *is* -0037-07-02, so both eras must resolve to one timeline."""
    client = TestClient(app)
    bs = client.get(
        "/v1/nepal/gochar/ingress",
        params={**EARLY_BS_RANGE, "level": "pada", "grahas": "sun", **LOCATION_PARAMS},
    ).json()
    ad = client.get(
        "/v1/nepal/gochar/ingress",
        params={**BCE_AD_RANGE, "level": "pada", "grahas": "sun", **LOCATION_PARAMS},
    ).json()
    def _core_events(payload: dict) -> list[dict]:
        keep = {"graha", "level", "entry_time_utc", "entry_jd", "entry_vedic_jd", "label_ne"}
        return [{k: e[k] for k in keep if k in e} for e in payload["events"]]

    assert _core_events(bs) == _core_events(ad)


def test_ingress_endpoint_ce_range_unchanged():
    """The CE path keeps its plain-date behaviour and its 400 for garbage."""
    client = TestClient(app)
    resp = client.get(
        "/v1/nepal/gochar/ingress",
        params={"from": "2026-06-01", "to": "2026-06-10", "era": "ad",
                "level": "pada", "grahas": "sun", **LOCATION_PARAMS},
    )
    assert resp.status_code == 200
    assert resp.json().get("from_jd_date") == "2026-06-01"

    bad = client.get(
        "/v1/nepal/gochar/ingress",
        params={"from": "garbage", "to": "2026-06-10", "era": "ad", **LOCATION_PARAMS},
    )
    assert bad.status_code == 400

    bad_graha = client.get(
        "/v1/nepal/gochar/ingress",
        params={**BCE_AD_RANGE, "grahas": "pluto", **LOCATION_PARAMS},
    )
    assert bad_graha.status_code == 400
    assert "pluto" in bad_graha.json()["detail"]
