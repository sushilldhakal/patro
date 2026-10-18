import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.wiring import configure  # noqa: E402

# Tests that call the engine directly never import app.main, which wires the ports.
configure()
