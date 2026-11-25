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

11. Lunar month day edges follow the observer's own sunrise (the udaya rule), not
    Kathmandu's: which civil days a lunar month holds (first day, last day, Purnima
    day, the pūrṇimānta windows festivals search) are decided at each location.
    Month names and adhik / kshaya status are global instants and do not change.
    The patch makes Python's ``udaya_day_on_or_after`` read the observer of the
    entry point that called it.

12. (Superseded by 28 for the Rust server.) Kshaya years: the masa a kshaya month skips (its second sankranti's name) keeps no
    lunar festivals that year — the owner's rule. Python fell back to the
    neighbouring year's occurrence. 1983 (Poush–Magh kshaya): no Magh festivals.
    Only the occurrence the kshaya swallows is dropped (a fallback to another year's
    date, or a date inside the kshaya month): the Surya Siddhanta kshaya of
    16 Dec 2028 – 14 Jan 2029 skips Poush, and the regular Poush festivals of
    January 2028 stay.

13. ``reference=midnight`` on a DST transition day: Python bisected the midnight
    spans (lagna, chandra rashi, nakshatra pada, anga ends) between zone-aware local
    datetimes, and Python adds and subtracts same-zone datetimes on the wall clock,
    so on a day whose clock jumps (New York 2026-03-08) every span after the jump was
    wrong by the hour (Makara listed where Kumbha rose); and an instant read back
    from its printed text kept that text's fixed offset, so times after a fall-back
    printed with the summer offset (23:36-04:00 for 22:36-05:00). Rust does the
    arithmetic in UTC and always prints on the observer's zone clock. The patch runs Python's builder from the
    UTC instant of local midnight and re-prints its instants on the local clock;
    on every other day this is byte-identical to Python.

14. A clock time that does not exist on the observer's clock (the hour a DST
    spring-forward skips: New York 2027-03-14 02:30) named the moment by Python's
    ``fold=0`` rule but printed the impossible wall time (``02:30:00-05:00``). Rust
    names the same instant and prints it as the clock shows it (``03:30:00-04:00``).
    Affects ``query_instant`` of at-time and of month ``clock=`` rows.

15. Not patched: a BS month grid with ``?clock=`` before 1582-10-15 — Python answers
    400 (``Civil day CivilDay(...) is outside datetime.date range``); Rust reads each
    day at that clock on the Julian Day axis, as the at-time route does.

Bugs the Rust server fixed after copying them for a while (2026-11-22):

19. Akshamsha (``compute_akshamsha``): both sunrises are on the Gaurishankar meridian,
    but Python anchored the observer's on the observer's own zone and the reference's
    on Kathmandu's (the engine forces Kathmandu for the Nepal box), so a point outside
    Nepal got the zone offset added to the "latitude correction" (hours, not minutes).
    Both now start from Nepal's midnight.
20. ``method.frame`` of the rashifal blocks said ``drik_ganita`` though the default
    engine is the Surya Siddhanta; it now says ``surya_siddhanta``.
21. The shadbala ``method`` string said "Lahiri sidereal, JPL"; it now names the
    Surya Siddhanta longitudes it runs on.
22. Personal rashifal: when the loudest favourable transit is Rahu or Ketu (no
    Ashtakavarga row, so no bindu count) the sentence read "holds None bindus"; it now
    drops the bindu clause.
23. ``/kundali/yogas/reference?id=<unknown>``: the 404 was raised inside a ``try`` whose
    ``except Exception`` turned it into a 500; it is the 404 it meant.
24. ``/panchanga/at-time?datetime=`` with a date that does not exist (month 13, 30 Feb)
    was read as UTC and rolled into the next real date; it is a 400 now.
25. The festival calendar is the observer's own (snapped to 0.1°), Nepali cities
    included; Python gave every Kathmandu-zone observer Kathmandu's calendar and cache
    entry. The default observer keeps its exact coordinates.
26. House plan with an extra listed twice (``["living", "living"]``) answered 500 (the
    band search deleted one room key twice); a kind listed twice is one room now.

27. Not patched: the lunar calendar is the Surya Siddhanta's and the Gregorian (Julian
    before 1582-10-15) date is only a label read off it. ``lunar_year`` anchors on
    15 February as that label reads and runs for any year, BCE included. So a day
    before 1582-10-15 or before year 1 has its real lunar month (and the tithi
    beside it); Python printed the solar month's name (``solar_month_stub``) and
    ``/nepal/special-months`` answered 400 for BCE years (item 8). The parity rules
    (tests/support/parity.rs) skip the lunar-month fields of Julian-axis payloads.

The account layer (Postgres; not in any golden, the account recorder never sends these):

16. Not patched: a password longer than 72 bytes. bcrypt 5 raises ``ValueError``,
    so ``/auth/signup`` and ``/auth/reset-password`` answer 500 and ``/auth/login``
    401. Rust hashes and checks the first 72 bytes, as bcrypt 4 did.
17. Not patched: ``PATCH /profiles/{id}`` with ``"full_name": null`` or
    ``"is_default": null`` — the model accepts the null, the column is NOT NULL
    and Python answers 500. Rust leaves those two fields unchanged.
18. Not patched: two sign-ups racing for one email — the loser hits the unique
    index and Python answers 500. Rust answers the usual 409 "Email already
    registered".

    from rust_divergences import apply; apply()

28. Kshaya and adhik months (``apps/rust/rules/month_type_rules_v1.json``, owner ruling
   2026-11-24), Rust only and not patched into Python: a festival of the month a kshaya
   lunation swallowed follows into the first lunation after it instead of vanishing
   (Saraswati Puja 1983 is 18 Feb; Swasthani's opening is skipped when Poush is lost, as in
   2029); Padmini and Parama Ekadashi belong to the adhik lunation wherever it falls; and
   ``GET /v1/nepal/month-kinds/{bs_year}`` names each adhik lunation samsarpa or
   malimlucha. The Padmini / Parama part is patched into Python's recorders (``_patch_adhik_only_festivals``);
    production Python still pins both to an ordinary Jestha. The lost-month "follow" part is NOT
    imitated in Python (the golden test leaves that masa's festivals out in BS 2039 and 2085, see
    ``LOST_MASA``; ``crates/festivals/tests/month_type_rules.rs`` checks the owner's dates). Item 12's "no festivals for the lost
    masa" is superseded by this entry for the Rust server; no golden records a kshaya year.
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
    _patch_local_lunar_month_days()
    _patch_no_disk_festival_cache()
    _patch_kshaya_drops_festivals()
    _patch_adhik_only_festivals()
    _patch_midnight_utc_arithmetic()
    _patch_clock_gap_printing()
    _patch_fixed_bugs()

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


def _patch_local_lunar_month_days() -> None:
    """Thread the entry point's observer down to ``udaya_day_on_or_after``."""
    import contextvars
    from datetime import timedelta

    import engine.festivals.festival_rules as fr
    import engine.festivals.muhurta_engine as me
    import engine.festivals.sait_rules as sr
    import engine.panchanga.daily as daily
    import engine.panchanga.lunar_month as lm
    import engine.panchanga.nepal_sambat as ns
    import services.festivals.holiday_generator as hg
    import services.festivals.sait_generator as sg
    from engine.astronomy.location import DEFAULT_LOCATION
    from engine.astronomy.sun import calculate_sunrise
    from engine.astronomy.timescale import resolve_observer_timezone

    import services.panchanga.panchanga_cache as pc

    # Never read or write the persistent day / year caches with patched calculations:
    # a stored year would hide the patch, and a written one would leak it into the
    # local cache the unpatched server reads.
    pc.cache_enabled = lambda: False
    import gzip
    import json as _json

    import services.panchanga.year_cache as yc

    yc.read_year_cache = lambda *a, **k: None
    yc.write_year_cache = lambda bs_year, location, payload, *, variant: gzip.compress(
        _json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        compresslevel=6,
    )

    observer = contextvars.ContextVar("rust_divergence_observer", default=DEFAULT_LOCATION)

    def udaya_day_on_or_after(instant):
        loc = observer.get()
        day = instant.astimezone(resolve_observer_timezone(loc.timezone)).date()
        if calculate_sunrise(
            day, latitude=loc.lat, longitude=loc.lon, timezone_name=loc.timezone
        ) < instant:
            day += timedelta(days=1)
        return day

    lm.udaya_day_on_or_after = udaya_day_on_or_after

    def at(location_index, location_key, func):
        def wrapped(*args, **kwargs):
            loc = kwargs.get(location_key)
            if loc is None and len(args) > location_index:
                loc = args[location_index]
            token = observer.set(loc if loc is not None else DEFAULT_LOCATION)
            try:
                return func(*args, **kwargs)
            finally:
                observer.reset(token)

        return wrapped

    daily.build_daily_panchanga_at_jd = at(1, "location", daily.build_daily_panchanga_at_jd)
    compute = at(3, "location", fr.compute_festival_dates)
    fr.compute_festival_dates = compute
    hg.compute_festival_dates = compute
    find = at(6, "location", lm.find_festival_in_lunar_month)
    lm.find_festival_in_lunar_month = find
    ns.find_festival_in_lunar_month = find
    fr.find_festival_in_lunar_month = find
    build = at(1, "location", sr.build_day_panchanga)
    sr.build_day_panchanga = build
    me.build_day_panchanga = build
    sg.build_day_panchanga = build
    hg.get_special_months_for_bs_year = at(1, "location", hg.get_special_months_for_bs_year)


def _patch_kshaya_drops_festivals() -> None:
    import engine.festivals.festival_rules as fr
    import engine.panchanga.lunar_month as lm
    import engine.panchanga.nepal_sambat as ns
    from engine.calendar.constants import BS_MONTH_NAMES
    from engine.panchanga.kshaya_maas import count_sankrantis_in_period

    def kshaya_windows(name, gregorian_year):
        out = []
        for year in (gregorian_year - 1, gregorian_year):
            for m in lm.get_lunar_year(year).months:
                if gregorian_year not in (m.start_Aausi.year, m.end_Aausi.year):
                    continue
                sankrantis = count_sankrantis_in_period(m.start_Aausi, m.end_Aausi)
                if len(sankrantis) >= 2 and BS_MONTH_NAMES[sankrantis[0]] == name:
                    out.append((m.start_Aausi.date(), m.end_Aausi.date()))
        return out

    original = lm.find_festival_in_lunar_month

    def find(lunar_month_name, tithi, paksha, gregorian_year, *args, **kwargs):
        found = original(lunar_month_name, tithi, paksha, gregorian_year, *args, **kwargs)
        windows = kshaya_windows(lunar_month_name, gregorian_year) if found else []
        # Only the occurrence the kshaya swallowed goes: a fallback to another year's
        # date, or a date inside the kshaya month. A real occurrence earlier in the
        # same year stays (Poush in January 2028 survives the December 2028 kshaya).
        if windows and (found.year != gregorian_year or any(s <= found <= e for s, e in windows)):
            return None
        return found

    lm.find_festival_in_lunar_month = find
    ns.find_festival_in_lunar_month = find
    fr.find_festival_in_lunar_month = find


def _patch_no_disk_festival_cache() -> None:
    """The recorders always compute festival calendars fresh: the Python server keeps them in
    ``apps/api/cache/*.json`` stamped with its own code version, so a file written before a
    divergence was added would be recorded as if the divergence did not exist."""
    import services.festivals.holiday_generator as hg

    for name in (
        "load_festivals_cached",
        "load_cached",
        "load_bs_festivals_cached",
        "load_bs_cached",
    ):
        original = getattr(hg, name)
        none = lambda *args, **kwargs: None  # noqa: E731
        setattr(hg, name, none)
        _replace_everywhere(original, none)
    for name in (
        "save_festivals_cache",
        "save_cache",
        "save_bs_festivals_cache",
        "save_bs_cache",
    ):
        original = getattr(hg, name)
        nothing = lambda *args, **kwargs: None  # noqa: E731
        setattr(hg, name, nothing)
        _replace_everywhere(original, nothing)


def _patch_adhik_only_festivals() -> None:
    """The owner's month-type rules (``month_type_rules_v1.json``): Padmini and Parama Ekadashi
    belong to the adhik lunation itself (Python pinned them to Jestha), and a festival of the
    month a kshaya lunation swallowed follows into the lunation after it (Python dropped it,
    item 12) unless its rule says skip."""
    import engine.festivals.festival_rules as fr
    import engine.panchanga.lunar_month as lm

    original = fr.compute_festival_dates
    adhik_only = ("padmini-ekadashi", "parama-ekadashi")

    import json
    from datetime import timedelta
    from pathlib import Path

    import engine.panchanga.nepal_sambat  # noqa: F401  (imports the module the patch rebinds)
    from engine.calendar.constants import BS_MONTH_NAMES
    from engine.panchanga.kshaya_maas import count_sankrantis_in_period

    month_types = json.loads(
        (Path(__file__).resolve().parents[1] / "rules/month_type_rules_v1.json").read_text()
    )
    skip_ids = {
        fid
        for fid, o in month_types["kshaya_festival_transfer"]["overrides"].items()
        if o.get("policy") == "skip"
    }

    def following_day(rule, gregorian_year, location):
        """A lost month's festival is held in the first lunation after the kshaya lunation."""
        name = rule["lunar_month"]
        for year in (gregorian_year - 1, gregorian_year):
            months = lm.get_lunar_year(year).months
            for i, m in enumerate(months):
                sankrantis = count_sankrantis_in_period(m.start_Aausi, m.end_Aausi)
                if len(sankrantis) < 2 or BS_MONTH_NAMES[sankrantis[0]] != name:
                    continue
                nxt = months[i + 1] if i + 1 < len(months) else lm.get_lunar_year(year + 1).months[0]
                # The day must fall inside that lunation itself, not in another year's month
                # of the same name.
                for lookup_year in (year, year + 1):
                    day = lm.find_festival_in_lunar_month(
                        lunar_month_name=nxt.month_name,
                        tithi=int(rule["tithi"]),
                        paksha=rule["paksha"],
                        gregorian_year=lookup_year,
                        adhik_policy="use_adhik" if nxt.is_adhik else "skip",
                        date_selection=rule.get("date_selection", "udaya"),
                        location=location,
                        month_model="amanta",
                    )
                    if (
                        day is not None
                        and day.year == gregorian_year
                        and nxt.start_Aausi.date() <= day <= nxt.end_Aausi.date()
                    ):
                        return day
        return None

    # The follow rule is implemented in Rust only. Imitating it here gave dates a day apart and
    # fell back to next year's month, and Python is the rule being replaced, so it is not a
    # reference for it: the golden test leaves the lost masa's festivals out instead
    # (crates/festivals/tests/golden.rs, LOST_MASA), and month_type_rules.rs checks the owner's dates.
    follow_lost_month = False

    def compute(festival_id, rule, gregorian_year, location=fr.DEFAULT_LOCATION):
        if follow_lost_month and festival_id not in adhik_only and rule.get("type", "lunar") == "lunar":
            result = original(festival_id, rule, gregorian_year, location)
            if result is None and festival_id not in skip_ids and rule.get("lunar_month"):
                start = following_day(rule, gregorian_year, location)
                if start is not None:
                    duration = max(int(rule.get("duration_days", 1)), 1)
                    return start, start + timedelta(days=duration - 1)
            return result
        if festival_id not in adhik_only or rule.get("type", "lunar") != "lunar":
            return original(festival_id, rule, gregorian_year, location)
        adhik = next((m for m in lm.get_lunar_year(gregorian_year).months if m.is_adhik), None)
        if adhik is None:
            return None
        start = lm.find_festival_in_lunar_month(
            lunar_month_name=adhik.month_name,
            tithi=int(rule["tithi"]),
            paksha=rule["paksha"],
            gregorian_year=gregorian_year,
            adhik_policy="use_adhik",
            date_selection=rule.get("date_selection", "udaya"),
            location=location,
            month_model="amanta",
        )
        if start is None:
            return None
        duration = max(int(rule.get("duration_days", 1)), 1)
        return start, start + timedelta(days=duration - 1)

    fr.compute_festival_dates = compute
    _replace_everywhere(original, compute)


def _patch_midnight_utc_arithmetic() -> None:
    from datetime import datetime, timezone

    import services.panchanga.panchanga_at_time as pat
    from engine.astronomy.timescale import resolve_observer_timezone

    original = pat.build_panchanga_civil_day
    real_datetime = pat.datetime

    class UtcMidnight(real_datetime):
        def __new__(cls, *args, tzinfo=None, **kwargs):
            if tzinfo is not None and len(args) == 3 and not kwargs:
                u = real_datetime(*args, tzinfo=tzinfo).astimezone(timezone.utc)
                return real_datetime(
                    u.year, u.month, u.day, u.hour, u.minute, u.second, tzinfo=timezone.utc
                )
            return real_datetime.__new__(cls, *args, tzinfo=tzinfo, **kwargs)

    def relocal(value, tz):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in ("start_time", "end_time") and isinstance(item, str) and item.endswith("+00:00"):
                    value[key] = real_datetime.fromisoformat(item).astimezone(tz).isoformat()
                else:
                    relocal(item, tz)
        elif isinstance(value, list):
            for item in value:
                relocal(item, tz)

    overlay = (
        "tithi", "nakshatra", "yoga", "karana", "chandra_rashi_spans",
        "nakshatra_pada_spans", "lagna_spans", "udaya_lagna", "tarabalam",
        "chandrabalam", "panchaka_rahita",
    )

    def build(greg, location, *args, **kwargs):
        pat.datetime = UtcMidnight
        try:
            state = original(greg, location, *args, **kwargs)
        finally:
            pat.datetime = real_datetime
        tz = resolve_observer_timezone(location.timezone, lat=location.lat, lon=location.lon)
        detail = state.get("detail") or {}
        for key in overlay:
            relocal(detail.get(key), tz)
        relocal(state.get("lagna_spans"), tz)
        relocal(state.get("udaya_lagna"), tz)
        return state

    pat.build_panchanga_civil_day = build


def _patch_clock_gap_printing() -> None:
    from datetime import datetime, timezone

    import engine.panchanga.at_time as at
    import engine.panchanga.instants as inst
    import services.panchanga.panchanga_at_time as pat

    original = at.parse_clock_on_date

    def parse(*args, **kwargs):
        instant = original(*args, **kwargs)
        if isinstance(instant, datetime) and instant.tzinfo is not None:
            return instant.astimezone(timezone.utc).astimezone(instant.tzinfo)
        return instant

    at.parse_clock_on_date = parse
    inst.parse_clock_on_date = parse
    pat.parse_clock_on_date = parse


def _replace_everywhere(original, replacement) -> None:
    """Rebind ``original`` to ``replacement`` in every module that imported it by name."""
    import sys

    for module in list(sys.modules.values()):
        namespace = getattr(module, "__dict__", None)
        if not namespace:
            continue
        for key, value in list(namespace.items()):
            if value is original:
                namespace[key] = replacement


def _patch_fixed_bugs() -> None:
    import engine.jyotish.rashifal_engine as re_engine
    import engine.jyotish.rashifal_personal as personal
    import engine.jyotish.shadbala as shadbala
    import engine.panchanga.at_time as at
    import engine.panchanga.rashifal as daily_rashifal
    import engine.panchanga.solar_corrections as solar
    import services.festivals.holiday_generator as holidays
    import services.vastu.vastu_house_plan as house_plan

    # 19. Akshamsha on Nepal's own midnight.
    original_akshamsha = solar.compute_akshamsha

    def akshamsha(target, local_latitude, *, timezone_name, **kwargs):
        return original_akshamsha(
            target, local_latitude, timezone_name="Asia/Kathmandu", **kwargs
        )

    _replace_everywhere(original_akshamsha, akshamsha)

    # 20. The frame label.
    original_method = re_engine.method_block

    def method_block(*args, **kwargs):
        out = original_method(*args, **kwargs)
        out["frame"] = "surya_siddhanta"
        return out

    _replace_everywhere(original_method, method_block)
    original_daily = daily_rashifal.build_daily_rashifal

    def build_daily_rashifal(*args, **kwargs):
        out = original_daily(*args, **kwargs)
        out["method"]["frame"] = "surya_siddhanta"
        return out

    _replace_everywhere(original_daily, build_daily_rashifal)

    # 21. The shadbala method string.
    original_shadbala = shadbala.compute_shadbala

    def compute_shadbala(*args, **kwargs):
        out = original_shadbala(*args, **kwargs)
        out["method"] = "Parashari Shadbala (Surya Siddhanta sidereal longitudes)"
        return out

    _replace_everywhere(original_shadbala, compute_shadbala)

    # 22. No "None bindus" for Rahu / Ketu.
    original_prediction = personal._compose_prediction

    def compose_prediction(*args, **kwargs):
        text = original_prediction(*args, **kwargs)
        if isinstance(text, str):
            text = text.replace(", where your natal Ashtakavarga holds None bindus", "")
            text = text.replace(", जहाँ तपाईंको जन्म अष्टकवर्गमा None बिन्दु छन्", "")
        return text

    _replace_everywhere(original_prediction, compose_prediction)

    # 23. The 404 the yoga reference meant.
    from fastapi import HTTPException

    from app.main import app as fastapi_app
    from services.jyotish import yoga_reference_db as yoga_db

    for route in fastapi_app.routes:
        if not getattr(route, "path", "").endswith("/kundali/yogas/reference"):
            continue
        original_call = route.dependant.call

        def yoga_reference(id=None, q=None, _original=original_call):
            if id and yoga_db.get_by_id(id) is None:
                raise HTTPException(status_code=404, detail=f"No yoga combination with id {id!r}")
            return _original(id=id, q=q)

        route.dependant.call = yoga_reference

    # 24. A date that does not exist is a bad request.
    import re as _re

    original_parse = at.parse_query_datetime
    expanded = _re.compile(r"^(-?\d{1,8})-(\d{2})-(\d{2})[T ]\d{2}:\d{2}")

    def real_date(year: int, month: int, day: int) -> bool:
        if not 1 <= month <= 12 or day < 1:
            return False
        gregorian = (year, month, day) >= (1582, 10, 15)
        leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) if gregorian else year % 4 == 0
        length = 29 if month == 2 and leap else 28 if month == 2 else 30 if month in (4, 6, 9, 11) else 31
        return day <= length

    def parse_query_datetime(raw, **kwargs):
        from datetime import datetime

        if raw:
            text = raw.strip()
            if text.endswith("Z"):
                text = f"{text[:-1]}+00:00"
            match = expanded.match(text)
            if match and not real_date(*(int(g) for g in match.groups())):
                datetime.fromisoformat(text)
                raise ValueError(f"Invalid isoformat string: {text!r}")
        return original_parse(raw, **kwargs)

    _replace_everywhere(original_parse, parse_query_datetime)

    # 25. The festival calendar is the observer's own.
    from engine.astronomy.location import ObserverLocation

    original_festival_location = holidays.festival_location

    def festival_location(location):
        default = holidays.DEFAULT_LOCATION
        if (location.lat, location.lon, location.timezone) == (
            default.lat,
            default.lon,
            default.timezone,
        ):
            return default
        return ObserverLocation(
            lat=round(location.lat, 1),
            lon=round(location.lon, 1),
            timezone=location.timezone,
            name="observer",
        )

    _replace_everywhere(original_festival_location, festival_location)

    # 26. A room kind listed twice is one room.
    original_build = house_plan.build_house_plan

    def build_house_plan(site_input, requirement_input):
        extras = list(dict.fromkeys(requirement_input.extras))
        return original_build(site_input, requirement_input.model_copy(update={"extras": extras}))

    _replace_everywhere(original_build, build_house_plan)
