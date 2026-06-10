"""Application configuration — loads .env from project root on import."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from core.paths import PROJECT_ROOT

load_dotenv(PROJECT_ROOT / ".env")


def cors_origins() -> list[str] | None:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if not raw:
        return None
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def log_level() -> str:
    return os.getenv("LOG_LEVEL", "INFO").upper()
