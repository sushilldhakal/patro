#!/usr/bin/env python3
"""Rashifal tables for the shared engine, converted from the Rust constants (the server's source of truth).

Run from the repo root: python3 scripts/gen-rashifal-tables.py
"""
import re

SRC = "apps/rust/crates/jyotish/src/"
OUT = "packages/domain/src/jyotish/rashifal/tables.generated.ts"
STR = re.compile(r'"(?:[^"\\]|\\.)*"')


def conv(value: str) -> str:
    parts, last = [], 0
    for m in STR.finditer(value):
        parts.append(("c", value[last : m.start()]))
        parts.append(("s", m.group(0)))
        last = m.end()
    parts.append(("c", value[last:]))
    out = ""
    for kind, text in parts:
        if kind == "s":
            out += text
            continue
        text = text.replace("&[", "[").replace("(", "[").replace(")", "]")
        text = re.sub(r"Graha::(\w+)", lambda m: '"' + m.group(1).lower() + '"', text)
        out += text
    return out


lines = ["// Generated from apps/rust/crates/jyotish/src/rashifal/{tables,personal_tables}.rs by scripts/gen-rashifal-tables.py; do not edit.\n"]
for f in ["rashifal/tables.rs", "rashifal/personal_tables.rs"]:
    s = open(SRC + f).read()
    s = re.sub(r"^\s*///.*\n", "", s, flags=re.M)
    for m in re.finditer(r"pub\(crate\) const (\w+): [^=]+=\s*(.*?);\n(?=\n|pub|$)", s, flags=re.S):
        lines.append(f"export const {m.group(1)} = {conv(m.group(2))} as const;\n")
av = open(SRC + "ashtakavarga.rs").read()
m = re.search(r"const BENEFIC_HOUSES: [^=]+=\s*(\[.*?\n\]);", av, flags=re.S)
body = re.sub(r"^\s*//.*\n", "", m.group(1), flags=re.M)
lines.append(f"export const BENEFIC_HOUSES = {conv(body)} as const;\n")
for name in ["RASIMANA", "GRAHAMANA"]:
    m = re.search(rf"const {name}: [^=]+=\s*(\[[^\]]*\]);", av)
    lines.append(f"export const {name} = {conv(m.group(1))} as const;\n")
open(OUT, "w").write("\n".join(lines))
