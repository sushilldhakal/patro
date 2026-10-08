"""Rule tables behind the Vastu plot sketch (``sketch.py``).

Moved here from the web/mobile clients' ``vastu-plan.ts`` so the clients carry
no placement rules. Zone ids are the nine ``dir8`` ids plus ``center``.
Sizes are metres / square metres.
"""

from __future__ import annotations

ALL_ZONES: tuple[str, ...] = (
    "northeast", "east", "southeast", "south", "southwest",
    "west", "northwest", "north", "center",
)

# Viśvakarmā Prakāśa 16-zone mapping — ``preferred`` is the classical seat.
SPACE_ZONE_RULES: dict[str, dict] = {
    'puja': {
        'preferred': ['northeast'],
        'acceptable': ['east', 'north'],
        'avoid': ['south', 'southwest', 'southeast', 'center'],
    },
    'kitchen': {
        'preferred': ['southeast'],
        'acceptable': ['east', 'south'],
        'avoid': ['northeast', 'center'],
    },
    'living': {
        'preferred': ['north'],
        'acceptable': ['east', 'northeast'],
        'avoid': ['southwest'],
    },
    'dining': {
        'preferred': ['west'],
        'acceptable': ['east'],
        'avoid': ['northeast'],
    },
    'kitchen_dining': {
        'preferred': ['southeast'],
        'acceptable': ['east', 'south'],
        'avoid': ['northeast', 'center'],
        'notes': [{'source': 'placeholder — pending source check', 'note': "Mirrors kitchen's seat (southeast/fire) rather than dining's (west): cooking is treated as the dominant classical concern until confirmed otherwise. Classical kitchen/dining separation is rooted in wood-fire smoke and ash; with modern gas/electric cooking that constraint doesn't apply, so combining is offered as an opt-in modern choice, not the default."}],
    },
    'master_bedroom': {
        'preferred': ['southwest'],
        'acceptable': ['south', 'west'],
        'avoid': ['northeast'],
    },
    'bedroom': {
        'preferred': ['south', 'northwest'],
        'acceptable': ['west'],
        'avoid': ['northeast', 'southeast'],
    },
    'toilet': {
        'preferred': ['northwest', 'south'],
        'acceptable': ['west'],
        'avoid': ['northeast', 'southwest', 'center', 'east'],
    },
    'bathroom': {
        'preferred': ['east'],
        'acceptable': ['north'],
        'avoid': ['northeast', 'southwest', 'center'],
    },
    'combined': {
        'preferred': ['northwest', 'south'],
        'acceptable': ['west'],
        'avoid': ['northeast', 'southwest', 'center', 'east'],
    },
    'study': {
        'preferred': ['west'],
        'acceptable': ['north', 'east'],
        'avoid': ['southwest'],
    },
    'office': {
        'preferred': ['north'],
        'acceptable': ['west', 'northwest'],
        'avoid': ['southeast'],
    },
    'store': {
        'preferred': ['south'],
        'acceptable': ['west'],
        'avoid': ['northeast', 'southwest'],
    },
    'laundry': {
        'preferred': ['northwest'],
        'acceptable': ['west'],
        'avoid': ['northeast'],
    },
    'staircase': {
        'preferred': ['south', 'west'],
        'acceptable': ['northwest'],
        'avoid': ['northeast', 'center', 'southwest'],
    },
    'garage': {
        'preferred': ['northwest', 'southeast'],
        'acceptable': ['west'],
        'avoid': ['northeast'],
    },
    'guest': {
        'preferred': ['northwest'],
        'acceptable': ['west', 'north'],
        'avoid': ['southwest'],
    },
    'family': {
        'preferred': ['north'],
        'acceptable': ['west', 'northwest'],
        'avoid': ['southeast'],
    },
    'balcony': {
        'preferred': ['north', 'east', 'northeast'],
        'acceptable': ['west'],
        'avoid': ['southwest'],
    },
    'courtyard': {
        'preferred': ['center', 'northeast'],
        'acceptable': ['north'],
        'avoid': ['southwest'],
    },
    'garden': {
        'preferred': ['northeast', 'north', 'east'],
        'acceptable': ['west'],
        'avoid': ['southwest'],
    },
    'servant': {
        'preferred': ['northwest', 'west'],
        'acceptable': ['south'],
        'avoid': ['northeast', 'southwest'],
    },
    'gym': {
        'preferred': ['west', 'south'],
        'acceptable': ['northwest'],
        'avoid': ['northeast'],
    },
    'library': {
        'preferred': ['north', 'northeast', 'west'],
        'acceptable': ['east'],
        'avoid': ['southeast'],
    },
}

# Sleeping rooms claim a zone first; wet rooms are placed after so they do not pile up.
ASSIGN_ORDER: tuple[str, ...] = (
    "puja", "kitchen", "master_bedroom", "living", "dining", "bedroom", "guest",
    "family", "study", "office", "combined", "bathroom", "toilet", "staircase",
    "store", "laundry", "garage", "courtyard", "garden", "balcony", "library",
    "gym", "servant",
)

WET_KINDS: frozenset[str] = frozenset({"toilet", "bathroom", "combined"})

# Rooms a wet room may be attached to (en-suite) inside one zone.
HOST_KINDS: frozenset[str] = frozenset(
    {"master_bedroom", "bedroom", "guest", "living", "dining", "family"}
)

# Comfortable room size — never shrink below this to force a request onto the plan.
IDEAL_SIZE: dict[str, dict[str, float]] = {
    'master_bedroom': {'minSide': 2.9, 'minArea': 10.5},
    'bedroom': {'minSide': 2.7, 'minArea': 9},
    'guest': {'minSide': 2.7, 'minArea': 9},
    'living': {'minSide': 2.9, 'minArea': 12},
    'family': {'minSide': 2.8, 'minArea': 10},
    'dining': {'minSide': 2.4, 'minArea': 7},
    'kitchen': {'minSide': 2.4, 'minArea': 7},
    'kitchen_dining': {'minSide': 2.9, 'minArea': 13},
    'puja': {'minSide': 1.8, 'minArea': 3.5},
    'study': {'minSide': 2.4, 'minArea': 6.5},
    'office': {'minSide': 2.4, 'minArea': 7},
    'store': {'minSide': 1.6, 'minArea': 3},
    'laundry': {'minSide': 1.6, 'minArea': 3},
    'staircase': {'minSide': 1.15, 'minArea': 2.8},
    'garage': {'minSide': 2.8, 'minArea': 12},
    'balcony': {'minSide': 1.2, 'minArea': 2.5},
    'courtyard': {'minSide': 2, 'minArea': 6},
    'garden': {'minSide': 2, 'minArea': 6},
    'servant': {'minSide': 2.2, 'minArea': 6},
    'gym': {'minSide': 2.6, 'minArea': 8},
    'library': {'minSide': 2.4, 'minArea': 6.5},
    'toilet': {'minSide': 1, 'minArea': 1.5},
    'bathroom': {'minSide': 1.5, 'minArea': 2.8},
    'combined': {'minSide': 1.5, 'minArea': 3},
}

STAIR_WIDTH_M = 1.25

# Typical default storey when the user leaves a room on "any".
DEFAULT_STOREY: dict[str, int] = {
    "puja": 0, "kitchen": 0, "living": 0, "dining": 0, "kitchen_dining": 0,
    "garage": 0, "store": 0, "laundry": 0, "courtyard": 0, "garden": 0,
    "servant": 0, "staircase": 0,
    "master_bedroom": 1, "bedroom": 1, "toilet": 1, "bathroom": 1, "combined": 1,
    "study": 1, "office": 1, "family": 1, "guest": 1, "balcony": 1,
    "gym": 2, "library": 2,
}

# Which corner of each wall is generally preferred for an entrance — the lighter
# water/air corners over the heavy south-west one. A rough, commonly-cited
# heuristic, not a substitute for a site-specific reading.
ENTRANCE_PREFERRED_CORNER: dict[str, str] = {
    "north": "northeast",
    "east": "northeast",
    "south": "southeast",
    "west": "northwest",
}
