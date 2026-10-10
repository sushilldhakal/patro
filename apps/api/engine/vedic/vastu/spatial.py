"""Canonical Vāstu spatial coordinate system — geometry and naming only.

Ported faithfully from the web client's ``src/lib/vastu.ts`` (the existing,
already-drawn coordinate system behind the direction wheel) so the wheel and
the server never drift onto two different numbering schemes. Four
granularities, all clockwise from north:

  Direction8  — the 8 cardinal/intercardinal directions + centre (Brahmasthān)
  Direction16 — 16 compass points at 22.5° steps, each spanning 2 padas
  Pada32      — the 32-pada perimeter (Vāstu Puruṣa Maṇḍala boundary),
                8 padas per wall, numbered N1-N8/E1-E8/S1-S8/W1-W8
  Inner4      — the 4 inner deities (Bhūdhara/Aryamā/Vivasvān/Mitra) at the
                cardinal directions, one ring in from the perimeter

Deliberately no good/ok/bad verdicts here — which zone is auspicious for
which use is a Vāstu *rule* (see ``rules.py`` and the extracted zone-use
content in ``data/vastu_zone_uses.json``), not coordinate-system geometry.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ElementId = Literal["earth", "water", "fire", "air", "space"]
GunaId = Literal["sattva", "rajas", "tamas"]


@dataclass(frozen=True)
class Direction8:
    id: str
    bearing: float | None
    element: ElementId
    guna: GunaId
    cardinal: bool
    inner_deity: str | None = None


@dataclass(frozen=True)
class Direction16:
    id: str
    bearing: float
    abbr: str
    element: ElementId
    guna: GunaId
    padas: tuple[str, str]


@dataclass(frozen=True)
class Pada32:
    id: str
    slot: int
    bearing: float
    element: ElementId
    guna: GunaId
    wall: Literal["N", "E", "S", "W"]
    index: int
    code: str


@dataclass(frozen=True)
class Inner4:
    id: str
    bearing: float
    direction: str
    element: ElementId
    guna: GunaId


# ── Direction8 (vastu.ts VASTU_DIRECTIONS) ──────────────────────────────────

DIRECTION8: tuple[Direction8, ...] = (
    Direction8("north", 0, "water", "sattva", True, "bhudhara"),
    Direction8("northeast", 45, "water", "sattva", False),
    Direction8("east", 90, "air", "sattva", True, "aryama"),
    Direction8("southeast", 135, "fire", "rajas", False),
    Direction8("south", 180, "fire", "tamas", True, "vivasvan"),
    Direction8("southwest", 225, "earth", "tamas", False),
    Direction8("west", 270, "space", "tamas", True, "mitra"),
    Direction8("northwest", 315, "air", "rajas", False),
    Direction8("center", None, "space", "sattva", False),
)

DIRECTION8_BY_ID: dict[str, Direction8] = {d.id: d for d in DIRECTION8}

# ── Pada32 (vastu.ts VASTU_PADA_IDS, clockwise from Soma) ──────────────────

PADA32_IDS: tuple[str, ...] = (
    "soma", "bhujaga", "aditi", "diti", "shikhi", "parjanya", "jayanta", "mahendra",
    "surya", "satya", "bhrisha", "aakasha", "anila", "pushan", "vitatha", "grihakshata",
    "yama", "gandharva", "bhringraj", "mriga", "pitra", "dauvarika", "sugriva",
    "pushpadanta", "varuna", "asura", "shosha", "papayakshma", "roga", "naga",
    "mukhya", "bhallata",
)

_PADA_ELEMENT: dict[str, ElementId] = {
    "shikhi": "water", "parjanya": "water",
    "jayanta": "air", "mahendra": "air", "surya": "air", "satya": "air",
    "bhrisha": "fire", "aakasha": "fire", "anila": "fire", "pushan": "fire",
    "vitatha": "earth", "grihakshata": "earth", "yama": "earth", "gandharva": "earth",
    "bhringraj": "earth", "mriga": "earth", "pitra": "earth", "dauvarika": "earth",
    "sugriva": "space", "pushpadanta": "space", "varuna": "space", "asura": "space",
    "shosha": "space", "papayakshma": "space",
    "roga": "air", "naga": "air",
    "mukhya": "water", "bhallata": "water", "soma": "water", "bhujaga": "water",
    "aditi": "water", "diti": "water",
}

_PADA_GUNA: dict[str, GunaId] = {
    "shikhi": "sattva", "parjanya": "sattva", "jayanta": "sattva", "mahendra": "sattva",
    "surya": "sattva", "satya": "sattva",
    "bhrisha": "rajas", "aakasha": "rajas", "anila": "rajas", "pushan": "rajas",
    "vitatha": "tamas", "grihakshata": "tamas", "yama": "tamas", "gandharva": "tamas",
    "bhringraj": "tamas", "mriga": "tamas", "pitra": "tamas", "dauvarika": "tamas",
    "sugriva": "tamas", "pushpadanta": "tamas", "varuna": "tamas", "asura": "tamas",
    "shosha": "tamas", "papayakshma": "tamas",
    "roga": "rajas", "naga": "rajas",
    "mukhya": "sattva", "bhallata": "sattva", "soma": "sattva", "bhujaga": "sattva",
    "aditi": "sattva", "diti": "sattva",
}

_PADA_WALLS: tuple[Literal["N", "E", "S", "W"], ...] = ("N", "E", "S", "W")
_PADA_N1_SLOT = PADA32_IDS.index("roga")  # N1 is Roga — first north-wall cell


def _build_pada32() -> tuple[Pada32, ...]:
    out: list[Pada32] = []
    for slot, pid in enumerate(PADA32_IDS):
        i = (slot - _PADA_N1_SLOT + 32) % 32
        wall = _PADA_WALLS[i // 8]
        index = (i % 8) + 1
        out.append(
            Pada32(
                id=pid,
                slot=slot,
                bearing=slot * 11.25,
                element=_PADA_ELEMENT[pid],
                guna=_PADA_GUNA[pid],
                wall=wall,
                index=index,
                code=f"{wall}{index}",
            )
        )
    return tuple(out)


PADA32: tuple[Pada32, ...] = _build_pada32()
PADA32_BY_ID: dict[str, Pada32] = {p.id: p for p in PADA32}
PADA32_BY_CODE: dict[str, Pada32] = {p.code: p for p in PADA32}


def _padas_at_dir16_index(i: int) -> tuple[str, str]:
    return (PADA32_IDS[(2 * i - 1) % 32], PADA32_IDS[(2 * i) % 32])


# ── Direction16 (vastu.ts VASTU_DIR16 / DIR16_META) ─────────────────────────

_DIR16_ELEMENT: tuple[ElementId, ...] = (
    "water", "water", "water", "air", "air", "air", "fire", "fire",
    "earth", "earth", "earth", "space", "space", "space", "air", "air",
)

_DIR16_META: tuple[tuple[str, str, GunaId], ...] = (
    ("n", "N", "sattva"), ("nne", "NNE", "sattva"), ("ne", "NE", "sattva"),
    ("ene", "ENE", "sattva"), ("e", "E", "sattva"), ("ese", "ESE", "rajas"),
    ("se", "SE", "rajas"), ("sse", "SSE", "tamas"), ("s", "S", "tamas"),
    ("ssw", "SSW", "tamas"), ("sw", "SW", "tamas"), ("wsw", "WSW", "tamas"),
    ("w", "W", "tamas"), ("wnw", "WNW", "rajas"), ("nw", "NW", "rajas"),
    ("nnw", "NNW", "sattva"),
)

DIRECTION16: tuple[Direction16, ...] = tuple(
    Direction16(
        id=did,
        bearing=i * 22.5,
        abbr=abbr,
        element=_DIR16_ELEMENT[i],
        guna=guna,
        padas=_padas_at_dir16_index(i),
    )
    for i, (did, abbr, guna) in enumerate(_DIR16_META)
)

DIRECTION16_BY_ID: dict[str, Direction16] = {d.id: d for d in DIRECTION16}

# ── Inner4 (vastu.ts VASTU_INNER4) ──────────────────────────────────────────

INNER4: tuple[Inner4, ...] = (
    Inner4("bhudhara", 0, "north", "water", "sattva"),
    Inner4("aryama", 90, "east", "air", "sattva"),
    Inner4("vivasvan", 180, "south", "fire", "tamas"),
    Inner4("mitra", 270, "west", "space", "tamas"),
)

INNER4_BY_ID: dict[str, Inner4] = {d.id: d for d in INNER4}

GRANULARITIES = ("dir8", "dir16", "pada32", "inner4")


def zone_exists(granularity: str, zone_id: str) -> bool:
    if granularity == "dir8":
        return zone_id in DIRECTION8_BY_ID
    if granularity == "dir16":
        return zone_id in DIRECTION16_BY_ID
    if granularity == "pada32":
        return zone_id in PADA32_BY_ID
    if granularity == "inner4":
        return zone_id in INNER4_BY_ID
    return False
