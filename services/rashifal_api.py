"""Rashifal API — daily, weekly, monthly and yearly from the scored engine.

The window is resolved here and the per-day work is deliberately *not* the full
panchanga: :func:`engine.vedic.rashifal_engine.build_day_frame` needs one
ephemeris batch, one lagna and one Ashtakavarga per sunrise (~3 ms), so a whole
BS year sweeps in about a second instead of the ~30 s a
``get_daily_panchanga``-per-day loop would cost.

Window definitions, all anchored on the observer's own sunrise:

``daily``
    The anchor day.
``weekly``
    The **Aitabar→Sanibar week containing** the anchor day, not seven days
    starting from it — asking for Wednesday's weekly rashifal should give the
    same week as asking on Monday.
``monthly``
    The BS month containing the anchor day.
``yearly``
    The BS year containing the anchor day, sampled every
    :data:`YEARLY_SAMPLE_STEP` days. Jupiter and Saturn — the grahas a yearly
    reading actually leans on — move ~0.08°/day, so a 3-day sample cannot miss a
    sign change that matters.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.bikram_sambat import (
    bs_month_name,
    bs_year_date_range,
    gregorian_to_bs,
    iter_bs_month_civil_days,
)
from engine.vedic.rashifal_engine import (
    DayFrame,
    Period,
    aggregate_sign,
    build_day_frame,
    build_sign_payload,
    detect_ingresses,
    method_block,
)

#: Days between samples in a yearly sweep. Slow grahas cannot skip a sign in 3.
YEARLY_SAMPLE_STEP = 3

#: Grahas whose ingress is worth reporting in each aggregate window.
_INGRESS_GRAHAS: dict[str, tuple[str, ...]] = {
    "weekly": ("moon", "mercury", "venus", "sun"),
    "monthly": ("sun", "mercury", "venus", "mars"),
    "yearly": ("jupiter", "saturn", "rahu", "ketu", "mars"),
}


def _week_start(greg: date) -> date:
    """The Sunday on or before ``greg`` — the Nepali week starts at Aitabar."""
    # date.weekday() is Monday=0 … Sunday=6.
    return greg - timedelta(days=(greg.weekday() + 1) % 7)


def rashifal_window_key(greg: date, period: Period) -> str:
    """Identity of the *window* ``greg`` falls in, for response caching.

    Every day of a BS month asks for the same monthly rashifal, so keying the
    cache on the anchor date would store thirty identical payloads and miss
    twenty-nine times out of thirty.
    """
    if period == "daily":
        return greg.isoformat()
    if period == "weekly":
        return _week_start(greg).isoformat()
    bs_year, bs_month, _ = gregorian_to_bs(greg)
    if period == "monthly":
        return f"bs{bs_year}-{bs_month:02d}"
    if period == "yearly":
        return f"bs{bs_year}"
    raise ValueError(f"unsupported rashifal period: {period!r}")


def _frames_for_range(
    start: date,
    end: date,
    location: ObserverLocation,
    *,
    step: int = 1,
) -> list[DayFrame]:
    frames: list[DayFrame] = []
    current = start
    while current <= end:
        frames.append(build_day_frame(current, location))
        current += timedelta(days=step)
    if frames and frames[-1].date_ad != end.isoformat():
        frames.append(build_day_frame(end, location))
    return frames


def _bs_label(greg: date) -> dict[str, Any]:
    year, month, day = gregorian_to_bs(greg)
    return {
        "bs_year": year,
        "bs_month": month,
        "bs_day": day,
        "bs_month_name_ne": bs_month_name(month, nepali=True),
        "bs_month_name_en": bs_month_name(month),
    }


def _daily(greg: date, location: ObserverLocation) -> dict[str, Any]:
    from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE

    frame = build_day_frame(greg, location, with_hora=True)
    return {
        "period": "daily",
        "anchor": "sunrise",
        "date_ad": greg.isoformat(),
        **_bs_label(greg),
        "vaara_num": frame.vaara_num,
        "moon_index": frame.moon_sign,
        "moon_label": RASHI_NAMES_NE[frame.moon_sign],
        "moon_label_en": RASHI_NAMES[frame.moon_sign],
        "signs": [build_sign_payload(frame, rashi, "daily") for rashi in range(12)],
        "frame": _frame_summary(frame),
        "method": method_block("daily", sample_step=1, days=1),
    }


def _frame_summary(frame: DayFrame) -> dict[str, Any]:
    """The day-wide state every sign was read against — shown once in the UI."""
    from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE

    return {
        "date_ad": frame.date_ad,
        "jd_sunrise": frame.jd_sunrise,
        "vaara_num": frame.vaara_num,
        "paksha": frame.paksha,
        "tithi_index": frame.tithi_index,
        "day_fraction": frame.day_fraction,
        "moon_sign": frame.moon_sign + 1,
        "moon_sign_ne": RASHI_NAMES_NE[frame.moon_sign],
        "moon_sign_en": RASHI_NAMES[frame.moon_sign],
        "sun_sign": frame.sun_sign + 1,
        "sun_sign_ne": RASHI_NAMES_NE[frame.sun_sign],
        "sun_sign_en": RASHI_NAMES[frame.sun_sign],
        "lagna_sign": frame.lagna_sign + 1,
        "lagna_sign_ne": RASHI_NAMES_NE[frame.lagna_sign],
        "lagna_sign_en": RASHI_NAMES[frame.lagna_sign],
        "sarvashtakavarga": frame.sav,
    }


def _aggregate(
    period: Period,
    frames: list[DayFrame],
    *,
    sample_step: int,
) -> dict[str, Any]:
    from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE

    signs = [aggregate_sign(rashi, frames, period) for rashi in range(12)]
    mid = frames[len(frames) // 2]
    return {
        "period": period,
        "anchor": "sunrise",
        "range_start_ad": frames[0].date_ad,
        "range_end_ad": frames[-1].date_ad,
        "days_computed": len(frames),
        "moon_index": mid.moon_sign,
        "moon_label": RASHI_NAMES_NE[mid.moon_sign],
        "moon_label_en": RASHI_NAMES[mid.moon_sign],
        "signs": signs,
        "frame": _frame_summary(mid),
        "ingress": detect_ingresses(frames, _INGRESS_GRAHAS[period]),
        "method": method_block(period, sample_step=sample_step, days=len(frames)),
    }


def rashifal_for_gregorian(
    greg: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    period: Period = "daily",
) -> dict[str, Any]:
    """Scored rashifal for the window ``period`` places around ``greg``."""
    if period == "daily":
        return _daily(greg, location)

    if period == "weekly":
        start = _week_start(greg)
        frames = _frames_for_range(start, start + timedelta(days=6), location)
        payload = _aggregate("weekly", frames, sample_step=1)
        payload.update(_bs_label(start))
        return payload

    if period == "monthly":
        bs_year, bs_month, _ = gregorian_to_bs(greg)
        frames = [
            build_day_frame(date.fromisoformat(civil_iso), location)
            for _bs_day, civil_iso in iter_bs_month_civil_days(bs_year, bs_month)
        ]
        if not frames:
            raise ValueError(f"no civil days for BS {bs_year}-{bs_month}")
        payload = _aggregate("monthly", frames, sample_step=1)
        payload["bs_year"] = bs_year
        payload["bs_month"] = bs_month
        payload["bs_month_name_ne"] = bs_month_name(bs_month, nepali=True)
        payload["bs_month_name_en"] = bs_month_name(bs_month)
        return payload

    if period == "yearly":
        bs_year, _, _ = gregorian_to_bs(greg)
        start, end = bs_year_date_range(bs_year)
        frames = _frames_for_range(start, end, location, step=YEARLY_SAMPLE_STEP)
        payload = _aggregate("yearly", frames, sample_step=YEARLY_SAMPLE_STEP)
        payload["bs_year"] = bs_year
        return payload

    raise ValueError(f"unsupported rashifal period: {period!r}")
