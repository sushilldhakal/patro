"""What a festival is, when it falls and how it is observed — for the day panchanga.

The words come from ``rules/festival_details_v1.json``: an entry of its own for
the major festivals, and a short text by family (Ekadashi, shraddha, sankranti,
jatra, …) for the rest. ``when`` is built from the festival's own rule in
``festival_rules_v3.json``, so every festival carries at least that. Timings are
not here: rites with a sait carry it in ``festival_saits``, at the observer.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from engine.vedic.names_ne import LUNAR_MASA_NE, NEPALI_DIGITS, TITHI_NAMES_NE
from services.holiday_generator import is_public_holiday, load_rules

DETAILS_PATH = Path(__file__).resolve().parent.parent / "rules" / "festival_details_v1.json"

TITHI_NAMES_EN = (
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami",
    "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
)
PAKSHA_NE = {"shukla": "शुक्ल", "krishna": "कृष्ण"}
BS_MONTHS_NE = (
    "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत",
)
BS_MONTHS_EN = (
    "Baishakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
)
AD_MONTHS_NE = (
    "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
)
AD_MONTHS_EN = (
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
)


@lru_cache(maxsize=1)
def load_festival_details() -> dict[str, Any]:
    with open(DETAILS_PATH, encoding="utf-8") as f:
        return json.load(f)


def _ne_digits(n: int) -> str:
    return str(n).translate(NEPALI_DIGITS)


def festival_when(rule: dict[str, Any]) -> dict[str, str] | None:
    """The festival's place in the calendar, in both languages, from its rule."""
    kind = rule.get("type")
    if kind == "lunar" and rule.get("lunar_month") and rule.get("tithi"):
        tithi, paksha = int(rule["tithi"]), rule.get("paksha", "shukla")
        amavasya = tithi == 15 and paksha == "krishna"
        tithi_ne = "औंसी" if amavasya else TITHI_NAMES_NE[tithi - 1]
        tithi_en = "Amavasya" if amavasya else TITHI_NAMES_EN[tithi - 1]
        month = rule["lunar_month"]
        return {
            "ne": f"{LUNAR_MASA_NE.get(month, month)} {PAKSHA_NE.get(paksha, '')} {tithi_ne}",
            "en": f"{month} {paksha.capitalize()} {tithi_en}",
        }
    if kind in ("bs_fixed", "solar") and rule.get("bs_month"):
        day = int(rule.get("bs_day") or rule.get("solar_day") or 1)
        month = int(rule["bs_month"])
        return {
            "ne": f"{BS_MONTHS_NE[month - 1]} {_ne_digits(day)} गते",
            "en": f"{BS_MONTHS_EN[month - 1]} {day}",
        }
    if kind == "ad_fixed" and rule.get("ad_month") and rule.get("ad_day"):
        month, day = int(rule["ad_month"]), int(rule["ad_day"])
        return {"ne": f"{AD_MONTHS_NE[month - 1]} {_ne_digits(day)}", "en": f"{AD_MONTHS_EN[month - 1]} {day}"}
    return None


def _text_for(festival_id: str) -> dict[str, Any] | None:
    details = load_festival_details()
    own = details["festivals"].get(festival_id)
    if own is None:
        rule = load_rules().get(festival_id) or {}
        # An alias shares the text of the festival it names.
        alias = rule.get("alias_of") or rule.get("subsumed_by")
        own = details["festivals"].get(alias) if alias else None
    if own is None:
        own = next((family for family in details["families"] if family["match"] in festival_id), None)
    if own is None:
        return None
    return {
        "about": {"ne": own["about_ne"], "en": own["about_en"]},
        "vidhi": {"ne": own["vidhi_ne"], "en": own["vidhi_en"]} if own["vidhi_ne"] else None,
    }


def festival_details(festival_id: str) -> dict[str, Any]:
    rule = load_rules().get(festival_id) or {}
    text = _text_for(festival_id) or {"about": None, "vidhi": None}
    return {
        "is_public_holiday": is_public_holiday(festival_id),
        "importance": rule.get("importance"),
        "duration_days": rule.get("duration_days"),
        "when": festival_when(rule),
        **text,
    }


def attach_festival_details(payload: dict[str, Any]) -> None:
    """Enrich each of the day's festivals in place. Day routes only, like the saits."""
    for festival in payload.get("festivals") or []:
        fid = festival.get("id")
        if fid:
            festival.update(festival_details(fid))
