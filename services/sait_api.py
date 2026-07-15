"""Load and serve auspicious-date (साइत) listings — official JSON + computed ephemeris."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from services.sait_generator import get_generated_sait

ROOT = Path(__file__).resolve().parents[1]
SAIT_RULES_PATH = ROOT / "rules" / "sait_dates_v1.json"
SAIT_ABOUT_PATH = ROOT / "rules" / "sait_about.json"

# Sait (auspicious-date) listings drive a year picker for ceremony planning, so
# they keep a practical window rather than the full engine range (BS 60–3000).
# Individual years outside this window still compute on /nepal/sait/{year}/....
SAIT_LIST_MIN_YEAR = 1700
SAIT_LIST_MAX_YEAR = 2200

BS_MONTHS_NE = [
    "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत",
]

ANNAPRASAN_NOTE = (
    "अन्नप्रासन requires the child's birth date to pick the 5–8 month window; "
    "year-wide listings show nakshatra-suitable days only."
)


@lru_cache(maxsize=1)
def _load_rules() -> dict[str, Any]:
    with SAIT_RULES_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def list_sait_categories() -> list[dict[str, str | bool]]:
    rules = _load_rules()
    categories = rules.get("categories") or {}
    result: list[dict[str, str | bool]] = []
    for cat_id, meta in categories.items():
        entry: dict[str, str | bool] = {
            "id": cat_id,
            "label_ne": meta.get("label_ne", cat_id),
        }
        if cat_id == "annaprasan":
            entry["requires_birth_date"] = True
        result.append(entry)
    return result


def list_sait_years() -> list[int]:
    """Practical BS-year window for the sait picker (1700–2200)."""
    return list(range(SAIT_LIST_MIN_YEAR, SAIT_LIST_MAX_YEAR + 1))


@lru_cache(maxsize=1)
def _load_about() -> dict[str, Any]:
    with SAIT_ABOUT_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def _category_method(meta: dict[str, Any], about: dict[str, Any]) -> dict[str, str | None]:
    """The 'how it is calculated' intro — the ceremony's own text if present,
    else the shared computed method from ``_meta``."""
    if meta.get("method_ne") or meta.get("method_en"):
        return {"ne": meta.get("method_ne"), "en": meta.get("method_en")}
    return {"ne": about["_meta"].get("method_ne"), "en": about["_meta"].get("method_en")}


def get_sait_about_all() -> dict[str, Any]:
    """Explanation metadata for every ceremony type (for the individual pages)."""
    about = _load_about()
    return {
        "method": {
            "ne": about["_meta"].get("method_ne"),
            "en": about["_meta"].get("method_en"),
        },
        "source": about["_meta"].get("source"),
        "categories": [
            {
                "id": cat_id,
                **meta,
                "method": _category_method(meta, about),
                "rules": meta.get("rules", []),
            }
            for cat_id, meta in (about.get("categories") or {}).items()
        ],
    }


def get_sait_about(category: str) -> dict[str, Any]:
    """Explanation metadata for one ceremony type — includes the per-ceremony
    calculation method and the classical rule list applied by the engine."""
    about = _load_about()
    meta = (about.get("categories") or {}).get(category)
    if meta is None:
        raise ValueError(f"Unknown sait category '{category}'.")
    return {
        "id": category,
        **meta,
        "source": about["_meta"].get("source"),
        "method": _category_method(meta, about),
        "rules": meta.get("rules", []),
    }


def _format_month_entries(by_month: dict[str, list[int]]) -> list[dict[str, Any]]:
    months: list[dict[str, Any]] = []
    for month_key, days in sorted(by_month.items(), key=lambda item: int(item[0])):
        month = int(month_key)
        day_list = sorted(int(d) for d in (days or []))
        if not day_list:
            continue
        months.append(
            {
                "month": month,
                "month_name_ne": BS_MONTHS_NE[month - 1],
                "days": day_list,
            }
        )
    return months


def get_sait_detail(
    bs_year: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Per-day *reasons* for a muhūrta listing: the panchāṅga (tithi, nakṣatra,
    yoga, karaṇa, vāra, lagna) of the representative window that made each day
    qualify. Powers the "Marriage Saait" explanation page. Muhūrta categories
    (vivāha, bratabandha, …) only — the deterministic Vās categories have no
    lagna window."""
    from datetime import date

    from engine.astronomy.positions import (
        KARANA_NAMES, NAKSHATRA_NAMES, RASHI_NAMES, YOGA_NAMES,
        get_display_tithi, get_karana, get_nakshatra, get_paksha,
        get_tithi_angle, get_tithi_number, get_yoga,
    )
    from engine.astronomy.timescale import resolve_observer_timezone
    from dataclasses import replace

    from engine.vedic.bikram_sambat import bs_to_gregorian
    from engine.vedic.muhurta_engine import (
        CEREMONY_RULES, MUHURTA_CATEGORIES, muhurta_windows,
    )
    from engine.vedic.names_ne import (
        KARANA_NAMES_NE, NAKSHATRA_NAMES_NE, PAKSHA_NAMES_NE, TITHI_NAMES_NE,
        VAARA_NAMES_NE, YOGA_NAMES_NE, lunar_masa_name_ne,
    )
    from engine.vedic.sait_rules import build_day_panchanga

    rules = _load_rules()
    categories = rules.get("categories") or {}
    if category not in categories:
        raise ValueError(f"Unknown sait category: {category}")
    if category not in MUHURTA_CATEGORIES:
        raise ValueError(f"Category '{category}' has no muhūrta-window detail.")

    tz = resolve_observer_timezone(location.timezone)
    generated = get_generated_sait(bs_year, category, location)
    by_month = generated.get("months") or {}

    # Reproduce each day's window with the SAME rule the listing was built with:
    # if the year used the widened nakṣatra fallback, the detail must too, else
    # the fallback-only days would yield no window and drop out of the page.
    base_rule = CEREMONY_RULES[category]
    detail_rule = (
        replace(base_rule, nakshatras=base_rule.fallback_nakshatras)
        if generated.get("nakshatra_fallback") and base_rule.fallback_nakshatras
        else base_rule
    )

    days_out: list[dict[str, Any]] = []
    for month_key, day_nums in sorted(by_month.items(), key=lambda kv: int(kv[0])):
        month = int(month_key)
        for bs_day in sorted(int(d) for d in (day_nums or [])):
            greg: date = bs_to_gregorian(bs_year, month, bs_day)
            windows = muhurta_windows(category, greg, location, rule=detail_rule)
            if not windows:
                continue
            # Representative = the longest clean window of the day.
            win = max(windows, key=lambda w: w.end - w.start)
            dp = build_day_panchanga(greg, location)
            start_local = win.start.astimezone(tz)
            end_local = win.end.astimezone(tz)
            tnum = get_tithi_number(get_tithi_angle(win.start))
            tdisp = get_display_tithi(tnum)
            paksha = get_paksha(tnum)
            nak = get_nakshatra(win.start)[0]
            yoga = get_yoga(win.start)[0]
            _, karana = get_karana(win.start)
            vaara0 = dp.vaara - 1  # 0=Sunday
            lagna = win.lagna
            days_out.append(
                {
                    "bs_month": month,
                    "bs_day": bs_day,
                    "bs_month_name_ne": BS_MONTHS_NE[month - 1],
                    "gregorian": greg.isoformat(),
                    "weekday_en": ["Sunday", "Monday", "Tuesday", "Wednesday",
                                   "Thursday", "Friday", "Saturday"][vaara0],
                    "weekday_ne": VAARA_NAMES_NE[vaara0],
                    "window_start": start_local.strftime("%H:%M"),
                    "window_end": end_local.strftime("%H:%M"),
                    "tithi_num": tdisp,
                    "tithi_en": _TITHI_EN[tdisp - 1],
                    "tithi_ne": TITHI_NAMES_NE[tdisp - 1],
                    "paksha": paksha,
                    "paksha_ne": PAKSHA_NAMES_NE.get(paksha, paksha),
                    "nakshatra_num": nak,
                    "nakshatra_en": NAKSHATRA_NAMES[nak - 1],
                    "nakshatra_ne": NAKSHATRA_NAMES_NE[nak - 1],
                    "yoga_en": YOGA_NAMES[yoga - 1],
                    "yoga_ne": YOGA_NAMES_NE[yoga - 1],
                    "karana_en": karana,
                    "karana_ne": KARANA_NAMES_NE[KARANA_NAMES.index(karana)]
                    if karana in KARANA_NAMES else karana,
                    "lagna_en": RASHI_NAMES[lagna - 1],
                    "lunar_month_en": dp.lunar_month,
                    "lunar_month_ne": lunar_masa_name_ne(dp.lunar_month),
                }
            )

    return {
        "bs_year": bs_year,
        "category": category,
        "category_label_ne": categories[category].get("label_ne", category),
        "engine_version": generated.get("engine_version"),
        "days": days_out,
    }


_TITHI_EN = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
    "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
    "Trayodashi", "Chaturdashi", "Purnima",
]


def get_sait_month_entries(
    bs_year: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    rules = _load_rules()
    categories = rules.get("categories") or {}
    if category not in categories:
        raise ValueError(f"Unknown sait category: {category}")

    # Always serve our own ephemeris-computed listing (the curated Nepal Samiti
    # dates in sait_dates_v1.json are kept only for regression benchmarking — the
    # app shows computed sait for every year and category).
    generated = get_generated_sait(bs_year, category, location)
    source = generated.get("source", "computed")
    by_month = generated.get("months") or {}

    payload: dict[str, Any] = {
        "bs_year": bs_year,
        "category": category,
        "category_label_ne": categories[category].get("label_ne", category),
        "months": _format_month_entries(by_month),
        "source": source,
    }
    if category == "annaprasan":
        payload["note"] = ANNAPRASAN_NOTE
    return payload
