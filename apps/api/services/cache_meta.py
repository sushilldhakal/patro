"""Versioned cache metadata and invalidation."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from services.payload_version import stamp

RULE_VERSION = "v3"
# 1.0.4: year festival lists run the same-day redundancy filter.
# Festival dates resolve through udaya (sunrise) tithi, so the astronomy axis is
# folded in and an ephemeris fix invalidates the holiday payloads too.
# 1.0.5: lunar festivals resolve through the amanta month name, which is now
# taken from the Sankranti a month contains rather than the Sun's rashi at its
# Purnima. Moves every festival whose masa was mis-named — Buddha Jayanti and
# Holi 2079 BS, among others — so the cached holiday payloads must be orphaned.
# 1.0.6: kaal-vyapini date_selection (madhyahna / pradosh) — the rules file hash
# covers the JSON side of this change, but the selection logic itself lives in
# the engine and needs its own bump.
ENGINE_VERSION = stamp("1.0.6")

RULES_PATH = Path(__file__).resolve().parent.parent / "rules" / "festival_rules_v3.json"
OVERRIDES_PATH = Path(__file__).resolve().parent.parent / "rules" / "holiday_overrides_v1.json"


def rules_file_hash() -> str:
    digest = hashlib.sha256()
    for path in (RULES_PATH, OVERRIDES_PATH):
        if path.exists():
            digest.update(path.name.encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def payload_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload.get("holidays", []), sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(canonical.encode()).hexdigest()[:12]
    return digest


def current_cache_meta(location_key: str) -> dict[str, str]:
    return {
        "rule_version": RULE_VERSION,
        "engine_version": ENGINE_VERSION,
        "rules_hash": rules_file_hash(),
        "location_key": location_key,
    }


def cache_is_valid(cached: dict[str, Any], location_key: str) -> bool:
    meta = current_cache_meta(location_key)
    return (
        cached.get("rule_version") == meta["rule_version"]
        and cached.get("engine_version") == meta["engine_version"]
        and cached.get("rules_hash") == meta["rules_hash"]
        and cached.get("location_key") == meta["location_key"]
    )


def stamp_payload(payload: dict[str, Any], location_key: str) -> dict[str, Any]:
    stamped = {
        **payload,
        **current_cache_meta(location_key),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    stamped["hash"] = payload_hash(stamped)
    return stamped
