"""BsDate and AngaState: the value objects reproduce the dicts they replaced."""

from __future__ import annotations

from datetime import date

import pytest

from engine.calendar.bikram_sambat import bs_month_name, format_bs_date, gregorian_to_bs
from engine.calendar.bs_date import BsDate
from engine.panchanga.anga_state import AngaState


def _stamp(iso):
    return None if iso is None else f"L[{iso}]"


def _element_state_before(block, stamp):
    """services.panchanga.panchanga_api.element_state as it was, with the stamp injected."""
    nxt = block.get("next") or {}
    state = {
        "name": block["name"],
        "name_ne": block.get("name_ne"),
        "start": stamp(block.get("start_time")),
        "end": stamp(block.get("end_time")),
        "next": nxt.get("name"),
        "next_ne": nxt.get("name_ne"),
        "end_ghati_clock": block.get("end_ghati_clock"),
        "end_hours_clock": block.get("end_hours_clock"),
        "progress": block.get("progress"),
    }
    if nxt.get("end_time"):
        state["next_end"] = stamp(nxt.get("end_time"))
        state["next_end_ghati_clock"] = nxt.get("end_ghati_clock")
        state["next_end_hours_clock"] = nxt.get("end_hours_clock")
    third = nxt.get("next")
    if third:
        state["next_next"] = third.get("name")
        state["next_next_ne"] = third.get("name_ne")
        state["next_next_end_ghati_clock"] = third.get("end_ghati_clock")
        state["next_next_end_hours_clock"] = third.get("end_hours_clock")
    return state


_BASE = {
    "name": "Saptami", "name_ne": "सप्तमी",
    "start_time": "2026-06-06T21:11:00+00:00", "end_time": "2026-06-07T21:55:00+00:00",
    "end_ghati_clock": "40:12", "end_hours_clock": "03:40", "progress": 0.42,
}
_NEXT = {"name": "Ashtami", "name_ne": "अष्टमी"}
_NEXT_ENDING = {**_NEXT, "end_time": "2026-06-08T20:01:00+00:00", "end_ghati_clock": "55:01", "end_hours_clock": "01:46"}
_THIRD = {"name": "Navami", "name_ne": "नवमी", "end_ghati_clock": "59:00", "end_hours_clock": "05:00"}


@pytest.mark.parametrize("block", [
    {**_BASE},                                                  # no next block at all
    {**_BASE, "next": _NEXT},                                   # next, end unknown
    {**_BASE, "next": _NEXT_ENDING},                            # next ends today
    {**_BASE, "next": {**_NEXT_ENDING, "next": _THIRD}},        # kshaya day
    {"name": "Vishti", "start_time": None, "end_time": None},   # sparse block
], ids=["bare", "next", "next-ends", "kshaya", "sparse"])
def test_anga_state_payload_is_the_old_dict(block):
    payload = AngaState.from_block(block, _stamp).to_payload()
    expected = _element_state_before(block, _stamp)
    assert payload == expected
    assert list(payload) == list(expected), "key order is part of the payload"


def test_bs_date_unpacks_formats_and_converts():
    bs = BsDate.from_gregorian(date(2026, 6, 7))
    assert tuple(bs) == gregorian_to_bs(date(2026, 6, 7))
    y, m, d = bs
    assert str(bs) == format_bs_date(y, m, d) == "2083-02-24"
    assert BsDate.parse("2083-02-24") == bs
    assert BsDate.of({"year": y, "month": m, "day": d, "extra": 1}) == bs
    assert bs.to_gregorian() == date(2026, 6, 7)
    assert bs.month_name(nepali=True) == bs_month_name(m, nepali=True)
    assert bs.is_valid() and not BsDate(2083, 2, 40).is_valid()
    assert BsDate(2083, 1, 30) < bs


@pytest.mark.parametrize("text", ["today", "2083-02", "2083-xx-01"])
def test_bs_date_parse_rejects_what_parse_bs_date_rejects(text):
    with pytest.raises(ValueError):
        BsDate.parse(text)


def test_festival_occurrence_is_the_old_entry():
    from datetime import date

    from engine.festivals.occurrence import FestivalOccurrence, occurrence_key, row_covers

    rule = {"name_en": "Tihar", "name_ne": "तिहार", "type": "lunar", "category": "hindu",
            "importance": "national", "notes": "Laxmi Puja to Bhai Tika"}
    occ = FestivalOccurrence.from_rule("tihar", rule, date(2026, 11, 8), date(2026, 11, 11), is_public_holiday=True)
    assert occ.to_payload() == {
        "id": "tihar", "name_en": "Tihar", "name_ne": "तिहार",
        "start_date": "2026-11-08", "end_date": "2026-11-11", "duration_days": 4,
        "type": "lunar", "category": "hindu", "importance": "national",
        "is_public_holiday": True, "notes": "Laxmi Puja to Bhai Tika",
    }
    assert occ.covers(date(2026, 11, 11)) and not occ.covers(date(2026, 11, 12))
    # One festival, two years: two occurrences.
    row = occ.to_payload()
    assert occ.key == occurrence_key(row) == ("tihar", "2026-11-08")
    assert occurrence_key({**row, "start_date": "2027-10-29"}) != occ.key
    assert row_covers(row, date(2026, 11, 9))
    # The rule's own name stands in when it has no English one.
    assert FestivalOccurrence.from_rule("x", {}, date(2026, 1, 1), date(2026, 1, 1), is_public_holiday=False).name_en == "x"


def test_tithi_payload_is_the_old_dict():
    from datetime import datetime, timezone

    from engine.panchanga.tithi import calculate_tithi, tithi_at

    for instant in (
        datetime(2026, 10, 21, 0, 30, tzinfo=timezone.utc),  # Dashami
        datetime(2026, 11, 8, 12, 0, tzinfo=timezone.utc),   # Amavasya (Laxmi Puja)
        datetime(2026, 10, 25, 18, 0, tzinfo=timezone.utc),  # Kojagrat Purnima
    ):
        tithi = tithi_at(instant)
        payload = calculate_tithi(instant)
        assert payload == tithi.to_payload()
        assert set(payload) == {"number", "display_number", "paksha", "name", "progress", "elongation"}
        assert 1 <= tithi.number <= 30 and 1 <= tithi.display_number <= 15
        assert tithi.is_amavasya == (tithi.number == 30) and tithi.is_purnima == (tithi.number == 15)
    assert tithi_at(datetime(2026, 11, 8, 12, 0, tzinfo=timezone.utc)).name == "Aausi"


def test_patro_day_unpacks_like_the_old_pair():
    from datetime import date

    from engine.calendar.bikram_sambat import iter_bs_month_days, iter_bs_year_days
    from engine.calendar.bs_date import BsDate

    days = list(iter_bs_month_days(2083, 7))
    first = days[0]
    bs_day, civil = first
    assert (bs_day, civil) == (1, date(2026, 10, 18)) == (first[0], first[1])
    assert first.bs == BsDate(2083, 7, 1) and first.gregorian == date(2026, 10, 18)
    assert [d.day for d in days] == list(range(1, len(days) + 1))
    year = list(iter_bs_year_days(2083))
    assert year[0].bs == BsDate(2083, 1, 1) and year[-1].bs.month == 12
    assert len({d.civil for d in year}) == len(year)
    # Before 1 CE the civil day is a CivilDay and there is no Gregorian date.
    early = next(iter(iter_bs_month_days(-57, 1)))
    assert early.gregorian is None
