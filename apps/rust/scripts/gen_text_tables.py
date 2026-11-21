#!/usr/bin/env python3
"""Generate crates/panchanga/src/text_tables.rs from the Python modules' text data.

The Nepali and English strings of the daily payload (choghadiya, navatara, rashifal,
ritu, muhurta, nivas-shool) are copied from the Python source by this script, never by
hand, so a Rust response carries exactly the Python text.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_text_tables.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))

from engine.astronomy import tropical_year as ty  # noqa: E402
from engine.panchanga import choghadiya as ch  # noqa: E402
from engine.panchanga import hora  # noqa: E402
from engine.panchanga import navatara as nv  # noqa: E402
from engine.panchanga import rashifal as rf  # noqa: E402
from engine.panchanga import nivas_shool as ns  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "crates/panchanga/src/text_tables.rs"


def lit(s) -> str:
    return "None" if s is None else json.dumps(s, ensure_ascii=False)


def strs(name: str, values, doc: str) -> str:
    body = ", ".join(lit(v) for v in values)
    return f"/// {doc}\npub(crate) const {name}: [&str; {len(values)}] = [{body}];\n"


out = [
    "//! Text of the daily payload, generated from the Python modules by",
    "//! `scripts/gen_text_tables.py`. Do not edit by hand.",
    "",
    "/// `(name_ne, name_en, quality_ne, quality_en, bad)` per choghadiya, Udvega first.",
    f"pub(crate) const CHOGHADIYA: [(&str, &str, &str, &str, bool); {len(ch.CHOGHADIYA)}] = [",
]
for c in ch.CHOGHADIYA:
    out.append(f"    ({lit(c['name_ne'])}, {lit(c['name_en'])}, {lit(c['quality_ne'])}, {lit(c['quality_en'])}, {str(bool(c.get('bad'))).lower()}),")
out.append("];")
out.append(f"/// Choghadiya day/night start index per weekday (Sunday first).\npub(crate) const CHO_DAY_START: [usize; 7] = {ch.CHO_DAY_START};")
out.append(f"pub(crate) const CHO_NIGHT_START: [usize; 7] = {ch.CHO_NIGHT_START};")
out.append(strs("HORA_SEQUENCE", hora._HORA_SEQUENCE, "Chaldean hora order."))
out.append(strs("DAY_LORD", hora._DAY_LORD, "Weekday lords, Sunday first."))
out.append("/// `(key, planet_ne, planet_en, bad)` per hora lord.")
out.append(f"pub(crate) const HORA_PLANETS: [(&str, &str, &str, bool); {len(hora._PLANETS)}] = [")
for k, v in hora._PLANETS.items():
    out.append(f"    ({lit(k)}, {lit(v['planet_ne'])}, {lit(v['planet_en'])}, {str(v['bad']).lower()}),")
out.append("];")
out.append("/// `(number, name, name_sanskrit, name_ne, season)` per ritu, Vasanta first.")
out.append(f"pub(crate) const RITU: [(u32, &str, &str, &str, &str); {len(ty.RITU_DATA)}] = [")
for r in ty.RITU_DATA:
    out.append(f"    ({r['number']}, {lit(r['name'])}, {lit(r['name_sanskrit'])}, {lit(r['name_ne'])}, {lit(r['season'])}),")
out.append("];")
out.append("/// `(tara, tara_en, quality, quality_en, tone)` per navatara 1–9.")
out.append(f"pub(crate) const NAVATARA: [(&str, &str, &str, &str, &str); {len(nv._NAVATARA_TYPES)}] = [")
for t in nv._NAVATARA_TYPES:
    out.append(f"    ({lit(t['tara'])}, {lit(t['tara_en'])}, {lit(t['quality'])}, {lit(t['quality_en'])}, {lit(t['tone'])}),")
out.append("];")
out.append(strs("RASHI_NAMA_AKSHARAS_NE", rf.RASHI_NAMA_AKSHARAS_NE, "Nama-rashi syllables, Mesha first."))
out.append(strs("RASHI_TITLE_EN", rf.RASHI_TITLE_EN, "Rashi titles for the rashifal."))
moortis = ["swarna", "rajata", "tamra", "loha"]
for name, table in (("MOORTI_NE", rf._MOORTI_NE), ("MOORTI_EN", rf._MOORTI_EN), ("LUCKY_COLOR_NE", rf._LUCKY_COLOR_NE),
                    ("LUCKY_COLOR_EN", rf._LUCKY_COLOR_EN), ("MOORTI_PHALA_NE", rf._MOORTI_PHALA_NE), ("MOORTI_PHALA_EN", rf._MOORTI_PHALA_EN)):
    out.append(strs(name, [table[m] for m in moortis], f"`{name}`, by moorti (swarna, rajata, tamra, loha)."))
tones = ["best", "good", "neutral", "bad", "worst"]
out.append(strs("TONE_PHALA_NE", [rf._TONE_PHALA_NE[t] for t in tones], "By tone (best, good, neutral, bad, worst)."))
out.append(strs("TONE_PHALA_EN", [rf._TONE_PHALA_EN[t] for t in tones], "By tone (best, good, neutral, bad, worst)."))
out.append(strs("REMEDY_NE", rf._REMEDY_NE, "Remedies for a weak day, by rashi."))
out.append(strs("REMEDY_EN", rf._REMEDY_EN, "Remedies for a weak day, by rashi."))


def rows(name, items, keys, doc):
    types = ", ".join("bool" if isinstance(items[0][k], bool) else "&str" for k in keys)
    out.append(f"/// {doc} Fields: {', '.join('`' + k + '`' for k in keys)}.")
    out.append(f"pub(crate) const {name}: [({types}); {len(items)}] = [")
    for it in items:
        out.append("    (" + ", ".join(str(it[k]).lower() if isinstance(it[k], bool) else lit(it[k]) for k in keys) + "),")
    out.append("];")


rows("DIRECTIONS", ns._DIRECTIONS, ["key", "name_en", "name_ne"], "Disha shool directions (E, W, N, S).")
rows("RAHU_VASA", [ns._RAHU_VASA_BY_PY_WEEKDAY[i] for i in range(7)], ["direction_key", "name_en", "name_ne"], "Rahu vasa by Python weekday (Monday first).")
rows("AGNIVASA", ns._AGNIVASA, ["name_en", "name_ne", "subtitle_en", "subtitle_ne", "is_auspicious"], "Agnivasa abodes.")
rows("SHIVAVASA", ns._SHIVAVASA, ["name_en", "name_ne", "is_auspicious"], "Shiva vasa abodes, Kailase first.")
rows("HOMAHUTI_GRAHAS", ns._HOMAHUTI_GRAHAS, ["key", "symbol", "name_en", "name_ne", "is_auspicious"], "Homahuti graha mukhas.")
rows("KUMBHACHAKRA_PARTS", ns._KUMBHACHAKRA_PARTS, ["name_en", "name_ne", "is_auspicious"], "Kumbha chakra parts.")
rows("BHADRA_LOKA", [ns._BHADRA_LOKA[k] for k in ("swarga", "prithvi", "patala")], ["name_en", "name_ne", "subtitle_en", "subtitle_ne", "is_auspicious"], "Bhadra loka (swarga, prithvi, patala).")
OUT.write_text("\n".join(out) + "\n")
print(f"wrote {OUT.name} ({OUT.stat().st_size} bytes)")
