"""Write the API's OpenAPI document for the TypeScript client's contract check.

    python scripts/export_openapi.py            # write packages/api-client/contracts/openapi.json
    python scripts/export_openapi.py --check    # exit 1 if that file is out of date

The auth/profile routes are only mounted when an auth database is configured,
so this sets a placeholder DATABASE_URL before importing the app. Nothing
connects to it: building the schema never opens a connection.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parents[1] / "packages" / "api-client" / "contracts" / "openapi.json"

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://openapi:unused@127.0.0.1:9/openapi")
os.environ.setdefault("AUTH_DATABASE_ENABLED", "true")
os.environ.pop("API_PUBLIC_PREFIX", None)
sys.path.insert(0, str(ROOT))

from app import app  # noqa: E402


def main() -> int:
    text = json.dumps(app.openapi(), indent=1, sort_keys=True, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print(f"{OUT.relative_to(ROOT.parents[1])} is out of date — run python scripts/export_openapi.py")
            return 1
        print("openapi.json up to date")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT.parents[1])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
