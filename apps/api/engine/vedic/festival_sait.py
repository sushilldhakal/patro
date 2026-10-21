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
the stretch of the window the tithi covers.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Iterable

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.sun import calculate_sunrise, calculate_sunset
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.lagna_spans import build_lagna_spans
from engine.vedic.tithi import calculate_tithi
from engine.vedic.tithi_boundaries import find_tithi_end

# Rashi numbers (1 = Mesha … 12 = Meena).
STHIRA_LAGNAS = frozenset({2, 5, 8, 11})  # fixed: Vrishabha, Simha, Vrishchika, Kumbha
DWISWABHAVA_LAGNAS = frozenset({3, 6, 9, 12})  # dual: Mithuna, Kanya, Dhanu, Meena
SHUBHA_LAGNAS = STHIRA_LAGNAS | DWISWABHAVA_LAGNAS
VRISHABHA = frozenset({2})

Window = tuple[datetime, datetime]

# A lagna that only grazes the window is no sait: half a ghati at least.
MIN_SAIT = timedelta(minutes=12)


@dataclass(frozen=True)
class SaitRule:
    """How one festival's rite is timed."""

    ritual: str
    tithi: int
    paksha: str
    # Kāla names searched in order; see ``_kaal_windows``.
    windows: tuple[str, ...]
    # Lagna groups preferred in order; the first group with a rising sign wins.
    lagnas: tuple[frozenset[int], ...]

    @property
    def absolute_tithi(self) -> int:
        return self.tithi + 15 if self.paksha == "krishna" else self.tithi


# Festival id (festival_rules_v3.json) → rule. Only festivals whose rite is done
# at a chosen moment carry a sait; the rest of the patro has none to show.
SAIT_RULES: dict[str, SaitRule] = {
    # Kalash and jamara at a dual lagna in the forenoon of Pratipada; the Kanya
    # lagna is rising at sunrise in Ashwin.
    "ghatasthapana": SaitRule(
        ritual="ghatasthapana",
        tithi=1,
        paksha="shukla",
        windows=("pratah", "abhijit", "dinamaan"),
        lagnas=(DWISWABHAVA_LAGNAS, STHIRA_LAGNAS),
    ),
    # Tika in Abhijit under a benefic (fixed or dual) lagna while Dashami holds.
    "vijaya-dashami": SaitRule(
        ritual="dashain-tika",
        tithi=10,
        paksha="shukla",
        windows=("abhijit", "madhyahna", "dinamaan"),
        lagnas=(SHUBHA_LAGNAS,),
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
        windows=("abhijit_aparahna", "dinamaan"),
        lagnas=(SHUBHA_LAGNAS,),
    ),
}


def has_sait(festival_id: str) -> bool:
    return festival_id in SAIT_RULES


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
        "dinamaan": (sunrise, sunset),
        "pradosh": (sunset, sunset + night / 5),
        "purva_ratri": (sunset, sunset + night / 2),
    }


def _tithi_spans(start: datetime, end: datetime, target: int) -> list[Window]:
    """Stretches of ``[start, end)`` in which absolute tithi ``target`` prevails."""
    spans: list[Window] = []
    cursor = start
    # A day holds at most three tithis; the guard only stops a runaway loop.
    for _ in range(6):
        if cursor >= end:
            break
        boundary = find_tithi_end(cursor)
        if calculate_tithi(cursor)["number"] == target:
            spans.append((cursor, min(boundary, end)))
        cursor = boundary + timedelta(seconds=1)
    return spans


def _intersect(a: Window, b: Window) -> Window | None:
    start, end = max(a[0], b[0]), min(a[1], b[1])
    return (start, end) if end > start else None


def _clip_all(window: Window, spans: Iterable[Window]) -> list[Window]:
    return [part for span in spans if (part := _intersect(window, span))]


def _lagna_span_windows(spans: list[dict[str, Any]]) -> list[tuple[int, dict[str, Any], Window]]:
    return [
        (span["number"], span, (datetime.fromisoformat(span["start_time"]), datetime.fromisoformat(span["end_time"])))
        for span in spans
    ]


def _time_block(start: datetime, end: datetime, tz_name: str) -> dict[str, str]:
    tz = resolve_observer_timezone(tz_name)
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "start_local": start.astimezone(tz).strftime("%H:%M"),
        "end_local": end.astimezone(tz).strftime("%H:%M"),
    }


def compute_sait(
    rule: SaitRule,
    sunrise: datetime,
    sunset: datetime,
    next_sunrise: datetime,
    lagna_spans: list[dict[str, Any]],
    tz_name: str,
) -> dict[str, Any] | None:
    """The sait for one rule on one day, or ``None`` if its tithi never prevails."""
    kaals = _kaal_windows(sunrise, sunset, next_sunrise)
    tithi = _tithi_spans(sunrise, next_sunrise, rule.absolute_tithi)
    if not tithi:
        return None
    lagnas = _lagna_span_windows(lagna_spans)

    def entry(kaal: str, sait: Window, lagna: dict[str, Any] | None) -> dict[str, Any]:
        return {
            "ritual": rule.ritual,
            "kaal": kaal,
            "window": _time_block(*kaals[kaal], tz_name),
            "sait": _time_block(*sait, tz_name),
            "lagna": lagna,
        }

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

    for kaal in rule.windows:
        open_parts = _clip_all(kaals[kaal], tithi)
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

    for kaal in rule.windows:
        open_parts = _clip_all(kaals[kaal], tithi)
        if open_parts:
            return entry(kaal, open_parts[0], None)
    return None


def festival_saits(
    day: date,
    festival_ids: Iterable[str],
    location: ObserverLocation = DEFAULT_LOCATION,
) -> list[dict[str, Any]]:
    """Saits for the ritual festivals among ``festival_ids`` on ``day`` at ``location``.

    Cheap to call for a day with none: the sky is only read once a festival with
    a rule is present.
    """
    wanted = [fid for fid in dict.fromkeys(festival_ids) if fid in SAIT_RULES]
    if not wanted:
        return []

    sun = {"latitude": location.lat, "longitude": location.lon, "timezone_name": location.timezone}
    sunrise = calculate_sunrise(day, **sun)
    sunset = calculate_sunset(day, **sun)
    next_sunrise = calculate_sunrise(day + timedelta(days=1), **sun)
    spans = build_lagna_spans(
        sunrise, next_sunrise, lat=location.lat, lon=location.lon, timezone_name=location.timezone
    )

    out: list[dict[str, Any]] = []
    for fid in wanted:
        sait = compute_sait(SAIT_RULES[fid], sunrise, sunset, next_sunrise, spans, location.timezone)
        if sait is not None:
            out.append({"festival_id": fid, "timezone": location.timezone, **sait})
    return out
