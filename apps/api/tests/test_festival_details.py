"""Every festival on the day panchanga says when it falls; the major ones say what it is and how it is kept."""

from __future__ import annotations

from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from services.festival_details import festival_details, festival_when, load_festival_details
from services.holiday_generator import load_rules


def test_every_detail_entry_names_a_known_festival():
    rules = load_rules()
    details = load_festival_details()
    assert set(details["festivals"]) <= set(rules)
    for entry in [*details["festivals"].values(), *details["families"]]:
        assert entry["about_ne"] and entry["about_en"]
        assert len(entry["vidhi_ne"]) == len(entry["vidhi_en"])


def test_every_dated_festival_says_when_it_falls():
    missing = [fid for fid, rule in load_rules().items() if rule["type"] != "adhik_arambha" and not festival_when(rule)]
    assert missing == []


def test_when_reads_the_rule():
    rules = load_rules()
    assert festival_when(rules["vijaya-dashami"]) == {"ne": "आश्विन शुक्ल दशमी", "en": "Ashwin Shukla Dashami"}
    assert festival_when(rules["laxmi-puja"])["en"] == "Kartik Krishna Amavasya"
    assert festival_when(rules["bs-new-year"]) == {"ne": "वैशाख १ गते", "en": "Baishakh 1"}
    assert festival_when(rules["christmas"])["en"] == "December 25"


def test_major_festivals_carry_their_vidhi():
    for fid in ("ghatasthapana", "vijaya-dashami", "laxmi-puja", "bhai-tika", "teej", "shivaratri"):
        details = festival_details(fid)
        assert details["about"]["ne"], fid
        assert details["vidhi"]["ne"], fid
    assert festival_details("vijaya-dashami")["is_public_holiday"] is True


def test_families_cover_the_rest():
    assert "Ekadashi" in festival_details("kamika-ekadashi")["about"]["en"]
    assert "shraddha" in festival_details("shraddha-navami-ashwin")["about"]["en"]
    # An alias reads its festival's text.
    assert festival_details("navaratri-arambha")["about"] == festival_details("ghatasthapana")["about"]


def test_day_payload_festivals_carry_details_and_sait():
    from services.panchanga_api import attach_festival_saits, build_daily_state

    day = date(2026, 10, 21)
    payload = build_daily_state(day, DEFAULT_LOCATION, include_festivals=True, include_detail=False)
    attach_festival_saits(payload, day, DEFAULT_LOCATION)
    by_id = {f["id"]: f for f in payload["festivals"]}
    assert by_id["vijaya-dashami"]["vidhi"]["en"]
    assert by_id["manvadi"]["about"]["en"]
    assert {s["festival_id"] for s in payload["festival_saits"]} >= {"vijaya-dashami"}


def test_nepal_sambat_months_follow_the_amanta_month():
    """Laxmi Puja is Kaulā Āmāi: amānta Ashwin's dark half is कौलागा, not ञलागा."""
    from engine.vedic.daily import build_daily_panchanga
    from engine.vedic.nepal_sambat import NS_KRISHNA_PAKSHA_NE

    assert NS_KRISHNA_PAKSHA_NE["Ashwin"] == "कौलागा"
    assert NS_KRISHNA_PAKSHA_NE["Falgun"] == "चिल्लागा"
    eve = build_daily_panchanga(date(2026, 11, 8), DEFAULT_LOCATION)
    assert "कौलागा" in eve["display"]["ns_ne"]
    assert eve["ns_date"]["month_name_ne"] == "कौला"
