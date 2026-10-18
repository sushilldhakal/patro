"""Opt-in trimmed shapes (``slim=true``) for the two heaviest payloads the apps load.

The default shapes stay as they are — they are public API and installed app
versions depend on them. ``slim`` only removes data the website and the app
never read from that response:

* **Day** (``/panchanga/{date}``): ``rashifal`` (~17 KB; the rashifal screens
  call ``/panchanga/rashifal``), and every key of ``detail`` that is identical to
  the same top-level key (~70 KB), listed in ``detail_shared``. The client
  re-links those keys into ``detail`` after parsing (``relinkDayDetail`` in packages/api-client), so
  readers of ``detail.muhurta`` / ``detail.planets`` keep working.
* **Month with ``full=true``** (only Dainik Kranti asks for it): the per-day
  blocks no month view draws — rashifal, muhurta, hora, choghadiya, the navatara
  tables, nivas/shool, the anchor planets and the embedded festival list (the
  row carries its own ``festivals``). ``lagna_spans`` is dropped when
  ``udaya_lagna`` is present, because the lagna matrix reads ``udaya_lagna``
  first. ~80 KB → ~15 KB per day.
"""

from __future__ import annotations

from typing import Any

DAY_SLIM_DROP_KEYS = frozenset({"rashifal"})

MONTH_EMBED_SLIM_DROP_KEYS = frozenset(
    {
        "rashifal",
        "muhurta",
        "hora",
        "hora_day",
        "choghadiya",
        "tarabala_table",
        "chandrabala_table",
        "nivas_shool",
        "planets_anchor",
        "festivals",
    }
)


def slim_day_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """A trimmed copy of a daily panchanga payload (see module docstring).

    Copies rather than mutates: the input can be shared with an in-process cache.
    """
    slim = {k: v for k, v in payload.items() if k not in DAY_SLIM_DROP_KEYS}
    detail = slim.get("detail")
    if isinstance(detail, dict):
        kept: dict[str, Any] = {}
        shared: list[str] = []
        for k, v in detail.items():
            if k in DAY_SLIM_DROP_KEYS:
                continue
            if k in slim and k != "detail" and slim[k] == v:
                shared.append(k)
            else:
                kept[k] = v
        slim["detail"] = kept
        # The keys the client copies back into `detail` from the top level.
        slim["detail_shared"] = shared
    return slim


def _slim_month_embed(embed: dict[str, Any]) -> dict[str, Any]:
    slim = {k: v for k, v in embed.items() if k not in MONTH_EMBED_SLIM_DROP_KEYS}
    if slim.get("udaya_lagna"):
        slim.pop("lagna_spans", None)
    return slim


def slim_month_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """A copy of a ``full=true`` month with each day's ``panchanga`` block trimmed."""
    calendar = []
    for row in payload.get("calendar") or []:
        embed = row.get("panchanga") if isinstance(row, dict) else None
        calendar.append({**row, "panchanga": _slim_month_embed(embed)} if isinstance(embed, dict) else row)
    return {**payload, "calendar": calendar}
