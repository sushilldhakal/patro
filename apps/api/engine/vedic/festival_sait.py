"""Festival sait (साइत) — the auspicious window for a festival's rite, at the observer.

A sait is not a national clock time. Every input it is built from belongs to
the observer's own sky (Muhurta Chintamani's rule that all muhurtas are local):

* the **kāla** — Abhijit, Pradosh, Aparahna — is a fraction of the *local*
  daylight or night, measured from local sunrise or sunset;
* the **lagna** is the sign rising on the *local* eastern horizon. Classically
  it is reckoned with the Swodaya tables of Brihat Parasara Hora Sastra ch. 5
  (Lankodaya palas corrected by the latitude's Charakhandas, then walked from
  the Sun's Bhogya palas through the Ishta Kala); here it comes from
  :mod:`engine.astronomy.lagna`, the exact spherical form of the same
  computation, so it holds at any latitude rather than only where the
  Charakhanda approximation does;
* the **tithi** must prevail in that window, and its end is an instant, which
  lands at a different wall-clock time in every time zone (Deshantara).

So Dashain Tika's Dhanu lagna, rising in Kathmandu's Abhijit near 11:30 NPT,
rises in Melbourne's at its own local hour — the window has to be recomputed
for each place, not converted from Kathmandu.

Each rule names the windows to search in order of preference and the lagna
groups to prefer inside them. The sait is the first stretch of a window in
which the tithi prevails *and* a preferred lagna is rising; failing a lagna,
the stretch of the window the tithi covers. A rule's widest window is still
part of the day (forenoon, or up to Aparahna), never the evening. A daytime
sait outside Abhijit also carries the local Abhijit muhurta as an alternative,
since the rite may equally be done then.

A Tika rite (Dashain, Bhai Tika) also names the direction to face while
receiving it — Chandra Vāsa: towards the Moon, whose direction follows its
sign (Mesha/Simha/Dhanu east, Vrishabha/Kanya/Makara south,
Mithuna/Tula/Kumbha west, Karka/Vrishchika/Meena north), read at the sait.

Saṃskāra — marriage, Bratabandha, Griha Pravesh — have no fixed day; their
days and windows come from the muhūrta engine (:mod:`engine.vedic.muhurta_engine`,
also observer-local), and :func:`ceremony_saits` splits each window at the
local lagna changes so every row names the sign rising through it.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Callable, Iterable

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.panchanga import panchanga_service
from engine.astronomy.rashi import rashi_service
from engine.astronomy.sun import calculate_sunrise, calculate_sunset
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.element_boundaries import find_nakshatra_end, find_yoga_end
from engine.vedic.lagna_spans import build_lagna_spans
from engine.vedic.tithi import calculate_tithi
from engine.vedic.tithi_boundaries import find_tithi_end
from engine.astronomy.ut_instant import as_julian_day

# Rashi numbers (1 = Mesha … 12 = Meena).
STHIRA_LAGNAS = frozenset({2, 5, 8, 11})  # fixed: Vrishabha, Simha, Vrishchika, Kumbha
DWISWABHAVA_LAGNAS = frozenset({3, 6, 9, 12})  # dual: Mithuna, Kanya, Dhanu, Meena
SHUBHA_LAGNAS = STHIRA_LAGNAS | DWISWABHAVA_LAGNAS
VRISHABHA = frozenset({2})

CHITRA = 14  # nakshatra number
VAIDHRITI = 27  # yoga number

Window = tuple[datetime, datetime]

# A lagna that only grazes the window is no sait: half a ghati at least.
MIN_SAIT = timedelta(minutes=12)

# Night kālas: a rite timed in them has no Abhijit to fall back on.
NIGHT_KAALS = frozenset({"pradosh", "purva_ratri"})


@dataclass(frozen=True)
class SaitRule:
    """How one festival's rite is timed."""

    ritual: str
    tithi: int
    paksha: str
    # Kāla names searched in order; see ``_kaal_windows``. The last is the
    # widest stretch of the day the rite may still be done in — never the whole
    # day, so a forenoon rite cannot fall back to the evening.
    windows: tuple[str, ...]
    # Lagna groups preferred in order; the first group with a rising sign wins.
    lagnas: tuple[frozenset[int], ...]
    # Tika is received facing the Moon's direction (Chandra Vāsa).
    tika: bool = False
    # Stretches to avoid where the tithi leaves room elsewhere (avoided, not forbidden).
    avoid_nakshatras: frozenset[int] = frozenset()
    avoid_yogas: frozenset[int] = frozenset()

    @property
    def absolute_tithi(self) -> int:
        return self.tithi + 15 if self.paksha == "krishna" else self.tithi


# Festival id (festival_rules_v3.json) → rule. Only festivals whose rite is done
# at a chosen moment carry a sait; the rest of the patro has none to show.
SAIT_RULES: dict[str, SaitRule] = {
    # Kalash and jamara at a dual lagna in the forenoon of Pratipada; the Kanya
    # lagna is rising at sunrise in Ashwin. Chitra and Vaidhriti are avoided.
    "ghatasthapana": SaitRule(
        ritual="ghatasthapana",
        tithi=1,
        paksha="shukla",
        windows=("pratah", "abhijit", "until_madhyahna"),
        lagnas=(DWISWABHAVA_LAGNAS, STHIRA_LAGNAS),
        avoid_nakshatras=frozenset({CHITRA}),
        avoid_yogas=frozenset({VAIDHRITI}),
    ),
    # Phulpati is brought in at midday on Saptami under a benefic lagna.
    "fulpati": SaitRule(
        ritual="fulpati",
        tithi=7,
        paksha="shukla",
        windows=("abhijit", "madhyahna", "until_madhyahna"),
        lagnas=(SHUBHA_LAGNAS,),
    ),
    # Tika in Abhijit under a benefic (fixed or dual) lagna while Dashami holds.
    "vijaya-dashami": SaitRule(
        ritual="dashain-tika",
        tithi=10,
        paksha="shukla",
        windows=("abhijit", "madhyahna", "until_madhyahna"),
        lagnas=(SHUBHA_LAGNAS,),
        tika=True,
    ),
    # Lamps in Pradosh while Amavasya holds, under a fixed lagna — Vrishabha
    # first, which rises in the Kartik evening shortly after sunset.
    "laxmi-puja": SaitRule(
        ritual="laxmi-puja",
        tithi=15,
        paksha="krishna",
        windows=("pradosh", "purva_ratri"),
        lagnas=(VRISHABHA, STHIRA_LAGNAS),
    ),
    # Kartik Shukla Dwitiya, from Abhijit through Aparahna, benefic lagna.
    "bhai-tika": SaitRule(
        ritual="bhai-tika",
        tithi=2,
        paksha="shukla",
        windows=("abhijit_aparahna", "until_aparahna"),
        lagnas=(SHUBHA_LAGNAS,),
        tika=True,
    ),
}


# Chandra Vāsa: the Moon's sign → its direction, cycling east, south, west, north
# from Mesha.
CHANDRA_VASA_DIRECTIONS: tuple[str, ...] = ("east", "south", "west", "north")


def chandra_vasa(at: datetime) -> dict[str, Any]:
    """Direction to face for Tika at ``at``: the Moon's, from its sidereal sign."""
    moon = rashi_service.chandra(as_julian_day(at))
    return {
        "direction": CHANDRA_VASA_DIRECTIONS[(moon["number"] - 1) % 4],
        "moon_rashi": {"number": moon["number"], "name": moon["name"], "name_ne": moon["name_ne"]},
    }


def has_sait(festival_id: str) -> bool:
    return festival_id in SAIT_RULES


@dataclass(frozen=True)
class _Sky:
    """One local day (sunrise → next sunrise) at the observer."""

    day: date
    sunrise: datetime
    sunset: datetime
    next_sunrise: datetime
    lagna_spans: list[dict[str, Any]]


def _local_sky(day: date, location: ObserverLocation) -> _Sky:
    sun = {"latitude": location.lat, "longitude": location.lon, "timezone_name": location.timezone}
    sunrise = calculate_sunrise(day, **sun)
    next_sunrise = calculate_sunrise(day + timedelta(days=1), **sun)
    spans = build_lagna_spans(
        sunrise, next_sunrise, lat=location.lat, lon=location.lon, timezone_name=location.timezone, complete=True
    )
    return _Sky(day, sunrise, calculate_sunset(day, **sun), next_sunrise, spans)


def _kaal_windows(sunrise: datetime, sunset: datetime, next_sunrise: datetime) -> dict[str, Window]:
    """Every kāla a rule can name, as instants for this day at this place.

    All are proportional to local day or night length (a muhurta is a fifteenth
    of daylight, a pradosh a fifth of the night), never fixed clock spans.
    """
    day = sunset - sunrise
    night = next_sunrise - sunset
    muhurta = day / 15
    fifth = day / 5
    return {
        "pratah": (sunrise, sunrise + day / 3),
        "abhijit": (sunrise + 7 * muhurta, sunrise + 8 * muhurta),
        "madhyahna": (sunrise + 2 * fifth, sunrise + 3 * fifth),
        "aparahna": (sunrise + 3 * fifth, sunrise + 4 * fifth),
        "abhijit_aparahna": (sunrise + 7 * muhurta, sunrise + 4 * fifth),
        "until_madhyahna": (sunrise, sunrise + 3 * fifth),
        "until_aparahna": (sunrise, sunrise + 4 * fifth),
        "pradosh": (sunset, sunset + night / 5),
        "purva_ratri": (sunset, sunset + night / 2),
    }


def _spans_where(
    start: datetime,
    end: datetime,
    number_at: Callable[[datetime], int],
    end_of: Callable[[datetime], datetime],
    wanted: frozenset[int],
) -> list[Window]:
    """Stretches of ``[start, end)`` in which an anga numbered in ``wanted`` prevails."""
    spans: list[Window] = []
    cursor = start
    # A day holds at most three of any anga; the guard only stops a runaway loop.
    for _ in range(6):
        if cursor >= end:
            break
        boundary = end_of(cursor)
        if number_at(cursor) in wanted:
            spans.append((cursor, min(boundary, end)))
        cursor = boundary + timedelta(seconds=1)
    return spans


def _tithi_spans(start: datetime, end: datetime, target: int) -> list[Window]:
    """Stretches of ``[start, end)`` in which absolute tithi ``target`` prevails."""
    return _spans_where(start, end, lambda at: calculate_tithi(at)["number"], find_tithi_end, frozenset({target}))


def _avoided_spans(rule: SaitRule, start: datetime, end: datetime) -> list[Window]:
    spans: list[Window] = []
    if rule.avoid_nakshatras:
        spans += _spans_where(
            start, end, lambda at: panchanga_service.nakshatra(as_julian_day(at))["number"],
            find_nakshatra_end, rule.avoid_nakshatras,
        )
    if rule.avoid_yogas:
        spans += _spans_where(
            start, end, lambda at: panchanga_service.yoga(as_julian_day(at))["number"],
            find_yoga_end, rule.avoid_yogas,
        )
    return spans


def _intersect(a: Window, b: Window) -> Window | None:
    start, end = max(a[0], b[0]), min(a[1], b[1])
    return (start, end) if end > start else None


def _clip_all(window: Window, spans: Iterable[Window]) -> list[Window]:
    return [part for span in spans if (part := _intersect(window, span))]


def _subtract(spans: Iterable[Window], holes: Iterable[Window]) -> list[Window]:
    """``spans`` with every stretch of ``holes`` cut out."""
    out = list(spans)
    for hole in holes:
        cut: list[Window] = []
        for start, end in out:
            if hole[1] <= start or hole[0] >= end:
                cut.append((start, end))
                continue
            if start < hole[0]:
                cut.append((start, hole[0]))
            if hole[1] < end:
                cut.append((hole[1], end))
        out = cut
    return out


def _lagna_span_windows(spans: list[dict[str, Any]]) -> list[tuple[int, dict[str, Any], Window]]:
    return [
        (span["number"], span, (datetime.fromisoformat(span["start_time"]), datetime.fromisoformat(span["end_time"])))
        for span in spans
    ]


def _time_block(start: datetime, end: datetime, tz_name: str) -> dict[str, str]:
    tz = resolve_observer_timezone(tz_name)
    local_start = start.astimezone(tz)
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "date_local": local_start.date().isoformat(),
        "start_local": local_start.strftime("%H:%M"),
        "end_local": end.astimezone(tz).strftime("%H:%M"),
    }


@dataclass(frozen=True)
class _Found:
    sait: dict[str, Any]
    # Whether the tithi reaches the rite's own kāla, and whether a preferred
    # lagna was found: how well this day suits the rite.
    in_primary: bool
    has_lagna: bool


def _sait_on(rule: SaitRule, sky: _Sky, tz_name: str) -> _Found | None:
    """The sait for one rule on one local day, or ``None`` if its tithi never reaches its kālas."""
    kaals = _kaal_windows(sky.sunrise, sky.sunset, sky.next_sunrise)
    tithi = _tithi_spans(sky.sunrise, sky.next_sunrise, rule.absolute_tithi)
    if not tithi:
        return None
    lagnas = _lagna_span_windows(sky.lagna_spans)
    # Avoided stretches give way only where the tithi leaves no other room.
    clean = _subtract(tithi, _avoided_spans(rule, sky.sunrise, sky.next_sunrise))
    passes = [clean, tithi] if clean != tithi else [tithi]

    def entry(kaal: str, sait: Window, lagna: dict[str, Any] | None) -> _Found:
        return _Found(
            sait={
                "ritual": rule.ritual,
                "kaal": kaal,
                "window": _time_block(*kaals[kaal], tz_name),
                "sait": _time_block(*sait, tz_name),
                "lagna": lagna,
                "alternate": _abhijit_alternate(kaal, sait),
                "facing": chandra_vasa(sait[0]) if rule.tika else None,
            },
            in_primary=bool(_clip_all(kaals[rule.windows[0]], tithi)),
            has_lagna=lagna is not None,
        )

    def _abhijit_alternate(kaal: str, sait: Window) -> dict[str, Any] | None:
        """Abhijit, when a daytime sait lies outside it — the rite may be done then too."""
        if kaal in NIGHT_KAALS or _intersect(kaals["abhijit"], sait):
            return None
        parts = _clip_all(kaals["abhijit"], tithi)
        if not parts:
            return None
        return {"kaal": "abhijit", **_time_block(*parts[0], tz_name)}

    # A preferred lagna in any window beats the first window without one: south
    # of the equator, say, no benefic sign may rise inside Abhijit at all. In a
    # wider window, the lagna nearest the rite's own kāla wins — Dashain Tika in
    # Melbourne takes the Dhanu lagna that sets an hour before its Abhijit, not
    # the first benefic sign after sunrise.
    first = kaals[rule.windows[0]]
    anchor = first[0] + (first[1] - first[0]) / 2

    def distance(hit: Window) -> timedelta:
        if hit[0] <= anchor <= hit[1]:
            return timedelta(0)
        return min(abs(hit[0] - anchor), abs(hit[1] - anchor))

    for spans in passes:
        for kaal in rule.windows:
            open_parts = _clip_all(kaals[kaal], spans)
            for group in rule.lagnas:
                hits = [
                    (hit, number, span)
                    for number, span, lagna_window in lagnas
                    if number in group
                    for hit in _clip_all(lagna_window, open_parts)
                    if hit[1] - hit[0] >= MIN_SAIT
                ]
                if hits:
                    hit, number, span = min(hits, key=lambda h: (distance(h[0]), h[0][0]))
                    return entry(kaal, hit, {"number": number, "name": span["name"], "name_ne": span["name_ne"]})

    for spans in passes:
        for kaal in rule.windows:
            open_parts = _clip_all(kaals[kaal], spans)
            if open_parts:
                return entry(kaal, open_parts[0], None)
    return None


def festival_saits(
    day: date,
    festival_ids: Iterable[str],
    location: ObserverLocation = DEFAULT_LOCATION,
) -> list[dict[str, Any]]:
    """Saits for the ritual festivals among ``festival_ids`` on ``day`` at ``location``.

    ``day`` is the festival's date in the patro, fixed at Kathmandu. Far from
    Nepal its tithi may hold through the rite's kāla on the local day before
    (west) or after (east) instead — Dashami can end before New York's sunrise
    on Dashain itself. The neighbouring local day is then taken, and the sait's
    ``date_local`` says which day it is.

    Cheap to call for a day with none: the sky is only read once a festival with
    a rule is present.
    """
    wanted = [fid for fid in dict.fromkeys(festival_ids) if fid in SAIT_RULES]
    if not wanted:
        return []

    skies: dict[date, _Sky] = {}

    def sky(offset: int) -> _Sky:
        when = day + timedelta(days=offset)
        if when not in skies:
            skies[when] = _local_sky(when, location)
        return skies[when]

    out: list[dict[str, Any]] = []
    for fid in wanted:
        rule = SAIT_RULES[fid]
        best: _Found | None = None
        # The patro's own day first; a neighbour only if it suits the rite better.
        for offset in (0, -1, 1):
            found = _sait_on(rule, sky(offset), location.timezone)
            if found and (best is None or (found.in_primary, found.has_lagna) > (best.in_primary, best.has_lagna)):
                best = found
            if best and best.in_primary and best.has_lagna:
                break
        if best is not None:
            out.append({"kind": "festival", "festival_id": fid, "timezone": location.timezone, **best.sait})
    return out


# Saṃskāra shown with their clock times on the day they fall (muhūrta engine id →
# the lagnas a sait may be fixed in). The engine's own vivāha rule stops at the
# angas, so the lagna-śuddhi is applied here: Mithuna, Kanya, Tula best, then
# Vrishabha, Dhanu, Meena. Bratabandha and Griha Pravesh take a fixed or dual
# lagna, as the engine already requires for Griha Pravesh.
CEREMONY_SAITS: dict[str, frozenset[int]] = {
    "vivah": frozenset({2, 3, 6, 7, 9, 12}),
    "bratabandha": SHUBHA_LAGNAS,
    "griha-pravesh": SHUBHA_LAGNAS,
}


def ceremony_saits(day: date, location: ObserverLocation = DEFAULT_LOCATION) -> list[dict[str, Any]]:
    """Marriage, Bratabandha and Griha Pravesh windows on ``day`` at ``location``.

    One row per stretch of a muhūrta window under a single permitted local
    lagna, so the times are the minutes that lagna holds the horizon here.
    """
    from engine.vedic.muhurta_engine import muhurta_windows

    found = {cat: muhurta_windows(cat, day, location, refine=True) for cat in CEREMONY_SAITS}
    if not any(found.values()):
        return []

    lagnas = _lagna_span_windows(_local_sky(day, location).lagna_spans)

    out: list[dict[str, Any]] = []
    for cat, windows in found.items():
        for win in windows:
            whole: Window = (win.start, win.end)
            pieces = [
                (part, number, span)
                for number, span, lagna_window in lagnas
                if number in CEREMONY_SAITS[cat] and (part := _intersect(whole, lagna_window))
            ]
            # Slivers at a lagna change are no sait, as for the festivals.
            for part, number, span in pieces:
                if part[1] - part[0] < MIN_SAIT:
                    continue
                out.append(
                    {
                        "kind": "ceremony",
                        "festival_id": cat,
                        "timezone": location.timezone,
                        "ritual": cat,
                        "kaal": None,
                        "window": _time_block(*whole, location.timezone),
                        "sait": _time_block(*part, location.timezone),
                        "lagna": {"number": number, "name": span["name"], "name_ne": span["name_ne"]},
                        "alternate": None,
                        "facing": None,
                    }
                )
    return out
