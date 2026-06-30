from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.bikram_sambat import gregorian_to_bs
from engine.vedic.gochar import build_gochar_ingress_range
from engine.vedic.udayast import build_udayast_range, find_udayast_events_in_range
from engine.astronomy.swiss_eph import calculate_sunrise


def test_mercury_western_asta_ashar_2083():
    """Retrograde Mercury evening (western) asta during Ashar 2083."""
    payload = build_udayast_range(
        date(2026, 6, 15),
        date(2026, 7, 16),
        DEFAULT_LOCATION,
        grahas=["mercury"],
    )
    asta = [e for e in payload["events"] if e["event"] == "asta"]
    assert asta, "expected at least one mercury asta event"
    west_asta = [e for e in asta if e["hemisphere"] == "west"]
    assert west_asta, "expected western (evening) asta for retrograde mercury"
    # BS ~21 (July 5) per Surya Siddhanta 12° retrograde orb
    bs_days = [gregorian_to_bs(date.fromisoformat(e["entry_date_ad"]))[2] for e in west_asta]
    assert any(20 <= d <= 22 for d in bs_days)


def test_patro_includes_udayast_and_motion():
    payload = build_gochar_ingress_range(
        date(2027, 1, 15),
        date(2027, 2, 12),
        DEFAULT_LOCATION,
        level="patro",
    )
    mars = [e for e in payload["events"] if e["graha"] == "mars" and e["level"] == "pada"]
    assert len(mars) >= 1
    motion = [e for e in payload["events"] if e["level"] == "motion"]
    assert any(e["graha"] == "mercury" and e["label_ne"] == "वक्री" for e in motion)
    assert all("entry_vedic_date_ad" in e for e in payload["events"])
    payload = build_gochar_ingress_range(
        date(2026, 6, 15),
        date(2026, 7, 16),
        DEFAULT_LOCATION,
        level="patro",
    )
    levels = {e["level"] for e in payload["events"]}
    assert "udayast" in levels
    assert "motion" in levels
    assert "pada" in levels
    assert "rashi" in levels


def test_udayast_labels_ne():
    sunrise = calculate_sunrise(
        date(2026, 6, 15),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    end = calculate_sunrise(
        date(2026, 7, 17),
        latitude=DEFAULT_LOCATION.lat,
        longitude=DEFAULT_LOCATION.lon,
        timezone_name=DEFAULT_LOCATION.timezone,
    )
    events = find_udayast_events_in_range(sunrise, end, grahas=["mercury"])
    assert events
    assert all("मा" in e["label_ne"] for e in events)
    assert all(e["label_ne"].endswith(("उदय", "अस्त")) or "मा उदय" in e["label_ne"] or "मा अस्त" in e["label_ne"] for e in events)
