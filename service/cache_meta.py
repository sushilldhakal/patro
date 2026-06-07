"""Versioned cache metadata and invalidation."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

RULE_VERSION = "v3"
ENGINE_VERSION = "1.0.2"

RULES_PATH = Path(__file__).resolve().parent.parent / "rules" / "festival_rules_v3.json"


def rules_file_hash() -> str:
    return hashlib.sha256(RULES_PATH.read_bytes()).hexdigest()[:12]


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
