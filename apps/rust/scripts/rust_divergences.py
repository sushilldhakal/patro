"""Where the Rust server deliberately differs from production Python, applied to
Python in-process so the golden recorders describe the Rust behaviour.

Every recorder (and gen_yoga_tables.py) calls ``apply()`` right after importing
the app. Each entry names the Python bug it corrects; when Python gets the same
fix, delete the entry here.

1. Vasumati — Python requires the four upachayas (3, 6, 10, 11) from the Moon to
   each hold a benefic, counting the Moon itself, so it can never form. The
   source (data/yoga_reference.json #9, Raman) puts the benefics IN the
   upachayas, from the Lagna or the Moon: from the Lagna Jupiter, Venus, Mercury
   and a waxing Moon; from the Moon Jupiter, Venus and Mercury.
2. Kulavardhana — the source (#74) reads "all planets in the 5th from Lagna,
   Sun, and Moon", which taken literally cannot occur. It stays never-present
   (no invented OR); its English text now states the source rule, and the row
   carries an ``evaluation`` listing what occupies the 5th from each point.
3. Graha Shanti step 3(a) — for a Capricorn/Aquarius lagna Saturn is itself a
   Lagnesha/5th/9th lord, and Python reported "Saturn is conjunct Saturn".
   A graha is never conjunct itself.

4. Gregorian browse months (``build_gregorian_browse_month_calendar``): a BC
   December ran to January of BC ``year + 1`` — a year *earlier* — so its length
   came out −700 and the grid was empty; and a month whose middle day has no
   ``datetime`` (before 1582-10-15) was named by a cut ISO string ("1500-02",
   "-0044-0") instead of its English name. Rust ends BC December at January of
   BC ``year - 1`` (AD 1 after BC 1) and always prints the English month name.

5. ``/convert/bs-to-ad`` before 1582-10-15: ``BsDate.to_gregorian`` returns a
   ``CivilDay`` there and the route's ``greg.strftime("%A")`` raised (500). Rust
   answers with the Julian / BCE civil label and its weekday; the patch gives
   ``CivilDay`` the ``strftime`` the route expects.
6. Not patchable here, so not in any golden: the cutover day 1582-10-04 (Julian)
   mixes a ``UtInstant`` sunrise with a ``datetime`` next sunrise and Python
   raises ``TypeError`` (the day route and the October 1582 AD grid 500). Rust
   reads every instant of that day as a Julian Day and answers.

7. Not patched: ``/convert/ad-to-bs`` before 1582-10-15 maps the date as a Julian
   label (like every other route) but printed the proleptic-Gregorian weekday
   (1500-01-01 → BS 1556-10-05, "Monday"). Rust prints that Julian day's weekday
   ("Wednesday").

8. Not patched: ``/v1/nepal/special-months/{bs_year}`` for a BCE year — Python
   hands an expanded date (``-0043-06-17``) to ``date.fromisoformat`` and answers
   400; Rust answers 200 with the year's special months.

9. Gochar ``entry_time_local`` for a BCE entry: Python cut the offset-less local
   ISO with ``[:16]``, which on a 17-character BCE date drops a minute digit
   (``-0044-03-15 06:2``). Rust prints the whole ``YYYY-MM-DD HH:MM``.

10. Not patched: ``/share/panchanga`` for a day before 1582-10-15 — Python
    answers 500; Rust renders the page from the Julian-day state.

    from rust_divergences import apply; apply()
"""

from __future__ import annotations

from typing import Any

UPACHAYA = {3, 6, 10, 11}

VASUMATI_TEXT = (
    "Natural benefics all occupy upachaya houses (3, 6, 10, 11) — Jupiter, Venus, "
    "Mercury and a waxing Moon from the Lagna, or Jupiter, Venus and Mercury from the "
    "Moon — a wealth yoga that grows through effort, skill and expanding networks over time."
)
VASUMATI_TEXT_NE = (
    "लग्नबाट बृहस्पति, शुक्र, बुध र शुक्ल पक्षको चन्द्र, वा चन्द्रबाट बृहस्पति, शुक्र र बुध — "
    "सबै उपचय (३, ६, १०, ११) भावमा हुँदा वसुमती योग — परिश्रम, सीप र बढ्दो सञ्जालबाट बढ्ने धन।"
)
KULAVARDHANA_TEXT = (
    "Raman (Three Hundred Important Combinations, #74): all planets in the 5th from the "
    "Lagna, the Sun and the Moon. Read literally this cannot occur — the Sun and the Moon "
    "are themselves among the planets — so it is never marked present; the evaluation "
    "lists what occupies the 5th from each point. Classically, an unbroken family line "
    "and a wealthy, healthy life."
)
SEVEN = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]


def waxing(chart: Any) -> bool:
    """The bright half: the Moon 0°–180° ahead of the Sun."""
    return (chart.planets["moon"].longitude - chart.planets["sun"].longitude) % 360 < 180


def vasumati(chart: Any) -> bool:
    from engine.jyotish.interpretation import house_from

    P = chart.planets
    from_lagna = ["jupiter", "venus", "mercury"] + (["moon"] if waxing(chart) else [])
    lagna_ok = all(house_from(P[k].sign, chart.lagna_sign) in UPACHAYA for k in from_lagna)
    moon_ok = all(house_from(P[k].sign, chart.moon_sign) in UPACHAYA for k in ("jupiter", "venus", "mercury"))
    return lagna_ok or moon_ok


def kulavardhana_evaluation(chart: Any) -> dict[str, Any]:
    P = chart.planets
    benefics = ["jupiter", "venus", "mercury"] + (["moon"] if waxing(chart) else [])
    refs = {"lagna": chart.lagna_sign, "sun": chart.sun_sign, "moon": chart.moon_sign}
    evaluations = {}
    for name, sign in refs.items():
        fifth = (sign + 4) % 12
        planets = [k for k in SEVEN if P[k].sign == fifth]
        evaluations[name] = {
            "fifth_house_sign": fifth + 1,
            "planets": planets,
            "benefics": [k for k in planets if k in benefics],
        }
    return {
        "source": "B.V. Raman, Three Hundred Important Combinations",
        "combination": 74,
        "definition": "All planets in 5th from Lagna, Sun, and Moon.",
        "benefic_rule": "Jupiter, Venus, Mercury; the Moon when waxing (0–180° ahead of the Sun)",
        "reference_evaluations": evaluations,
        "literal_interpretation": "requires_source_verification",
        "verification_status": "interpretation_pending",
    }


def apply() -> None:
    import engine.jyotish.interpretation as it
    import engine.jyotish.kundali_detail as kd
    import engine.jyotish.shanti_recommendation as sr

    if getattr(it, "_rust_divergences", False):
        return
    it._rust_divergences = True

    original_catalog = it.full_yoga_catalog

    def catalog(chart):
        rows = original_catalog(chart)
        for row in rows:
            if row["key"] == "vasumati":
                row["present"] = vasumati(chart)
                row["text"] = VASUMATI_TEXT
            elif row["key"] == "kulavardhana":
                row["text"] = KULAVARDHANA_TEXT
                row["evaluation"] = kulavardhana_evaluation(chart)
        return rows

    it.full_yoga_catalog = catalog
    kd.full_yoga_catalog = catalog
    kd.YOGA_DESC_NE["vasumati"] = VASUMATI_TEXT_NE

    original_api = kd._yogas_to_api

    def yogas_to_api(rows):
        out = original_api(rows)
        for row, api in zip(rows, out):
            if "evaluation" in row:
                api["evaluation"] = row["evaluation"]
        return out

    kd._yogas_to_api = yogas_to_api

    _patch_gregorian_browse_month()
    _patch_civil_day_strftime()
    _patch_gochar_local_stamp()

    original_conjunct = sr._conjunct
    sr._conjunct = lambda chart, a, b: a != b and original_conjunct(chart, a, b)


MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)


def _patch_gregorian_browse_month() -> None:
    import engine.calendar.era as era_mod
    import services.panchanga.panchanga_api as pa
    from engine.astronomy.jd_calendar import CivilDay

    original = pa.build_gregorian_browse_month_calendar

    def fixed(era, browse_year, browse_month, location=pa.DEFAULT_LOCATION, **kw):
        real = era_mod.to_jd

        def to_jd(e, y, m=None, d=None):
            if era == "bc" and browse_month == 12 and e == "bc" and y == browse_year + 1:
                return real("bc", browse_year - 1, 1, 1) if browse_year > 1 else real("ad", 1, 1, 1)
            return real(e, y, m, d)

        era_mod.to_jd = to_jd
        try:
            payload = original(era, browse_year, browse_month, location, **kw)
        finally:
            era_mod.to_jd = real
        start = real(era, browse_year, browse_month, 1)
        mid = CivilDay.from_jd_ut(start + min(14, payload["month_length"] - 1))
        payload["month_name"] = payload["month_name_ne"] = MONTHS[mid.month - 1]
        return payload

    pa.build_gregorian_browse_month_calendar = fixed


def _patch_civil_day_strftime() -> None:
    from engine.astronomy.jd_calendar import CivilDay, format_civil_strftime

    def strftime(self, fmt: str) -> str:
        return format_civil_strftime(
            fmt, year=self.year, month=self.month, day=self.day, weekday=self.weekday()
        )

    CivilDay.strftime = strftime


def _patch_gochar_local_stamp() -> None:
    import engine.jyotish.gochar as gochar
    from engine.astronomy.ut_instant import (
        UtInstant,
        format_ut_instant_local,
        parse_ephemeris_instant,
    )

    original = gochar._attach_local_time

    def attach(entry, tz, *, sunrise_local=None):
        out = original(entry, tz, sunrise_local=sunrise_local)
        parsed = parse_ephemeris_instant(str(out["entry_time_utc"]))
        if isinstance(parsed, UtInstant):
            local = format_ut_instant_local(parsed, getattr(tz, "key", str(tz)))["local"]
            out["entry_time_local"] = local.replace("T", " ")[:-3]
        return out

    gochar._attach_local_time = attach
