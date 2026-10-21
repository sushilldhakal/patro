"""The title and description a shared /panchanga link previews with.

Link-preview bots read og:title / og:description; each card (the day's angas,
the शुभ / अशुभ periods, the D1 chart) has its own copy, always dated in Bikram
Sambat — the Gregorian date belongs in the URL, not the share title.
"""

from __future__ import annotations

from typing import Any

from services.sharing.fb_post_content import periods_summary, planets_summary
from services.sharing.og_image import og_fields


def share_copy(payload: dict[str, Any], *, date_ad: str, label: str, card: str | None) -> tuple[str, str]:
    """``(title, description)`` for the day ``payload`` at ``label``."""
    f = og_fields(payload, date_ad=date_ad, location_name=label)
    date_ne = f["bs_line"] or f["ad_line"]
    date_line = " · ".join(x for x in (f["weekday"], date_ne) if x)
    if card == "periods":
        # The daily शुभ / अशुभ समय post — same URL contract, different image + copy.
        title = f"आजका शुभ र अशुभ समय · {label} · {date_ne} | Vedic Patro"
        description = f"{label}, {date_line}। {periods_summary(payload)}।"
    elif card == "d1":
        title = f"आजको ग्रहस्थिति · D1 चक्र · {label} · {date_ne} | Vedic Patro"
        description = f"{label}, {date_line}। उदयकालिक स्पष्टग्रह: {planets_summary(payload)}।"
    else:
        title = f"{f['paksha']} {f['tithi']} · {label} · {date_ne} — पञ्चाङ्ग | Vedic Patro"
        description = (
            f"{label}, {date_line}। तिथि {f['tithi']}, नक्षत्र {f['nakshatra']}, "
            f"योग {f['yoga']}, करण {f['karana']}। सूर्योदय {f['sunrise']}, सूर्यास्त {f['sunset']}।"
        )
    return title, description
