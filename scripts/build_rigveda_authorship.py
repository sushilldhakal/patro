#!/usr/bin/env python3
"""Build data/rigveda_authorship.json — traditional Rishi/Devata/Chhanda
attribution per Sukta, keyed "<mandala>.<sukta>".

This is authored by hand from the traditional Rigveda Anukramani (index of
seers, deities and metres) — it isn't in complete_rigveda_all_mandalas.json
at all, so it lives in its own small file that ingest_rigveda.py merges in
by (mandala, sukta) number. Kept separate from the ~10.5k-rik samhita data
so adding more Mandalas' worth of attribution later is a small, reviewable
diff instead of touching the big generated manifest by hand.

Currently covers all of Mandala 1 (Suktas 1-191). Mandalas 2-10 have no
entry yet and simply won't get a Rishi/Devata/Chhanda line on the page
until they're added here.

Run from the repo root:

    python3 scripts/build_rigveda_authorship.py
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/rigveda_authorship.json"

MANDALA = 1

# (sukta_start, sukta_end, rishi, devata, chhanda) — end is inclusive.
# Transcribed from the traditional Anukramani as supplied for Mandala 1,
# Suktas 1-129.
ROWS: list[tuple[int, int, str, str, str]] = [
    (1, 1, "Madhuchhanda Vaishvamitra", "Agni", "Gayatri"),
    (2, 2, "Madhuchhanda Vaishvamitra", "Vayu (1–3), Indra-Vayu (4–6), Mitra-Varuna (7–9)", "Gayatri"),
    (3, 3, "Madhuchhanda Vaishvamitra", "Ashvinikumar (1–3), Indra (4–6), Vishvedeva (7–9), Sarasvati (10–12)", "Gayatri"),
    (4, 4, "Madhuchhanda Vaishvamitra", "Indra", "Gayatri"),
    (5, 5, "Madhuchhanda Vaishvamitra", "Indra", "Gayatri"),
    (6, 6, "Madhuchhanda Vaishvamitra", "Indra (1–3), Maruts (4–10)", "Gayatri"),
    (7, 7, "Madhuchhanda Vaishvamitra", "Indra", "Gayatri"),
    (8, 8, "Madhuchhanda Vaishvamitra", "Indra", "Gayatri"),
    (9, 9, "Madhuchhanda Vaishvamitra", "Indra", "Gayatri"),
    (10, 10, "Madhuchhanda Vaishvamitra", "Indra", "Anushtup"),
    (11, 11, "Jeta Madhuchhandasa", "Indra", "Anushtup"),
    (12, 12, "Medhatithi Kanva", "Agni", "Gayatri"),
    (13, 13, "Medhatithi Kanva",
     "Apri Deities (Idhma/Agni, Tanunapat, Narashamsa, Ila, Barhis, Divya Dvarah, "
     "Uphasanakta, Daivya Hotara, Sarasvati-Ila-Bharati, Tvashta, Vanaspati, Svahakriti)",
     "Gayatri"),
    (14, 14, "Medhatithi Kanva", "Vishvedeva", "Gayatri"),
    (15, 15, "Medhatithi Kanva",
     "Ritu Devatas (Indra, Maruts, Tvashta, Agni, Mitra-Varuna, Dravinoda, Ashvinikumar, Garhapatya)",
     "Gayatri"),
    (16, 16, "Medhatithi Kanva", "Indra", "Gayatri"),
    (17, 17, "Medhatithi Kanva", "Indra-Varuna", "Gayatri"),
    (18, 18, "Medhatithi Kanva", "Brahmanaspati, Indra, Somadeva, Sadasaspati, Narashamsa", "Gayatri"),
    (19, 19, "Medhatithi Kanva", "Agni & Maruts", "Gayatri"),
    (20, 20, "Medhatithi Kanva", "Ribhugana", "Gayatri"),
    (21, 21, "Medhatithi Kanva", "Indragni", "Gayatri"),
    (22, 22, "Medhatithi Kanva",
     "Ashvinikumar, Savita, Agni, Devinis, Indrani, Varunani, Agnayi, Dyavaprithivi, Vishnu",
     "Gayatri"),
    (23, 23, "Medhatithi Kanva",
     "Vayu, Indra-Vayu, Mitra-Varuna, Indra-Marutvan, Vishvedeva, Pushan, Apah, Agni",
     "Gayatri, Pur-Ushnih, Pratishtha, Anushtup"),
    (24, 24, "Shunahshepa Ajigarti", "Agni, Prajapati, Savita, Varuna", "Trishtup, Gayatri"),
    (25, 25, "Shunahshepa Ajigarti", "Varuna", "Gayatri"),
    (26, 26, "Shunahshepa Ajigarti", "Agni (1–12), Devagana (13)", "Gayatri (1–12), Trishtup (13)"),
    (27, 27, "Shunahshepa Ajigarti", "Agni", "Gayatri"),
    (28, 28, "Shunahshepa Ajigarti",
     "Indra, Ulukhala, Ulukhala-Musala, Prajapati, Harishchandra, Soma",
     "Anushtup (1–6), Gayatri (7–9)"),
    (29, 29, "Shunahshepa Ajigarti", "Indra", "Pankti"),
    (30, 30, "Shunahshepa Ajigarti",
     "Indra (1–16), Ashvinikumar (17–19), Usha (20–22)",
     "Gayatri, Padanirvritt Gayatri, Trishtup"),
    (31, 31, "Hiranyastupa Angirasa", "Agni", "Jagati, Trishtup"),
    (32, 32, "Hiranyastupa Angirasa", "Indra", "Trishtup"),
    (33, 33, "Hiranyastupa Angirasa", "Indra", "Trishtup"),
    (34, 34, "Hiranyastupa Angirasa", "Ashvinikumar", "Jagati, Trishtup"),
    (35, 35, "Hiranyastupa Angirasa", "Agni, Mitra-Varuna, Ratri, Savita", "Trishtup, Jagati"),
    (36, 36, "Kanva Ghaura", "Agni, Yupa", "Barhata Pragatha, Brihati"),
    (37, 37, "Kanva Ghaura", "Maruts", "Gayatri"),
    (38, 38, "Kanva Ghaura", "Maruts", "Gayatri"),
    (39, 39, "Kanva Ghaura", "Maruts", "Barhata Pragatha"),
    (40, 40, "Kanva Ghaura", "Brahmanaspati", "Barhata Pragatha"),
    (41, 41, "Kanva Ghaura", "Varuna, Mitra, Aryama", "Gayatri"),
    (42, 42, "Kanva Ghaura", "Pushan", "Gayatri"),
    (43, 43, "Kanva Ghaura", "Rudra, Somadeva, Mitra-Varuna", "Gayatri, Anushtup"),
    (44, 44, "Praskanva Kanva", "Agni, Ashvinikumar", "Brihati, Satobrihati"),
    (45, 45, "Praskanva Kanva", "Agni, Devagana", "Anushtup"),
    (46, 46, "Praskanva Kanva", "Ashvinikumar", "Gayatri"),
    (47, 47, "Praskanva Kanva", "Ashvinikumar", "Barhata Pragatha"),
    (48, 48, "Praskanva Kanva", "Usha", "Barhata Pragatha"),
    (49, 49, "Praskanva Kanva", "Usha", "Anushtup"),
    (50, 50, "Praskanva Kanva", "Surya, Rogaghna Upanishad", "Gayatri, Anushtup"),
    (51, 57, "Savya Angirasa", "Indra", "Jagati, Trishtup"),
    (58, 60, "Nodha Gautama", "Agni (Vaishvanara Agni)", "Jagati, Trishtup"),
    (61, 63, "Nodha Gautama", "Indra", "Jagati, Trishtup"),
    (64, 64, "Nodha Gautama", "Maruts", "Jagati, Trishtup"),
    (65, 70, "Parashara Shaktya", "Agni", "Dvipada Virat"),
    (71, 73, "Parashara Shaktya", "Agni", "Trishtup"),
    (74, 79, "Gotama Rahugana", "Agni / Shuchi Agni", "Gayatri, Trishtup"),
    (80, 84, "Gotama Rahugana", "Indra", "Pankti, Jagati, Gayatri, Trishtup, Anushtup"),
    (85, 88, "Gotama Rahugana", "Maruts", "Jagati, Trishtup, Prastara Pankti"),
    (89, 89, "Gotama Rahugana", "Vishvedeva", "Jagati, Viratsthana, Trishtup"),
    (90, 90, "Gotama Rahugana", "Vishvedeva", "Gayatri, Anushtup"),
    (91, 91, "Gotama Rahugana", "Soma", "Trishtup, Gayatri, Ushnih"),
    (92, 92, "Gotama Rahugana", "Usha, Ashvinikumar", "Trishtup, Ushnih, Jagati"),
    (93, 93, "Gotama Rahugana", "Agni-Soma", "Anushtup, Trishtup, Gayatri, Jagati"),
    (94, 98, "Kutsa Angirasa", "Agni / Vaishvanara Agni", "Jagati, Trishtup"),
    (99, 99, "Kashyapa Maricha", "Agni (Jataveda Agni)", "Trishtup"),
    (100, 100, "Varshagira (Rijrashva, Ambarisha, Sahadeva, Bhayamana, Suradhas)", "Indra", "Trishtup"),
    (101, 104, "Kutsa Angirasa", "Indra", "Jagati, Trishtup"),
    (105, 105, "Trita Aptya / Kutsa Angirasa", "Vishvedeva", "Trishtup"),
    (106, 107, "Kutsa Angirasa", "Vishvedeva", "Jagati, Trishtup"),
    (108, 109, "Kutsa Angirasa", "Indragni", "Trishtup"),
    (110, 111, "Kutsa Angirasa", "Ribhugana", "Jagati, Trishtup"),
    (112, 112, "Kutsa Angirasa", "Dyavaprithivi, Agni, Ashvinikumar", "Jagati, Trishtup"),
    (113, 113, "Kutsa Angirasa", "Usha, Ratri", "Trishtup"),
    (114, 114, "Kutsa Angirasa", "Rudra", "Jagati, Trishtup"),
    (115, 115, "Kutsa Angirasa", "Surya", "Trishtup"),
    (116, 120, "Kakshivan Dairghatamasa", "Ashvinikumar", "Trishtup, Jagati"),
    (121, 121, "Kakshivan Dairghatamasa", "Indra / Vishvedeva", "Trishtup"),
    (122, 122, "Kakshivan Dairghatamasa", "Vishvedeva", "Trishtup, Viradrupa Trishtup"),
    (123, 124, "Kakshivan Dairghatamasa", "Usha", "Trishtup"),
    (125, 125, "Kakshivan Dairghatamasa", "Svanaya Danastuti", "Trishtup, Jagati"),
    (126, 126, "Kakshivan Dairghatamasa (1–5), Svanaya Bhavayavya (6), Romasha (7)",
     "Svanaya Bhavayavya (1–5, 7), Romasha (6)", "Trishtup (1–5), Anushtup (6–7)"),
    (127, 127, "Paruchhepa Daivodasi", "Agni", "Atyashti, Atidhriti"),
    (128, 128, "Paruchhepa Daivodasi", "Agni", "Atyashti"),
    (129, 129, "Paruchhepa Daivodasi", "Indra (1–5, 7–10), Indu (6)", "Atyashti, Atishakvari, Ashti"),
    (130, 130, "Paruchhepa Daivodasi", "Indra", "Atyashti"),
    (131, 131, "Paruchhepa Daivodasi", "Indra", "Atyashti"),
    (132, 132, "Paruchhepa Daivodasi", "Indra", "Atyashti"),
    (133, 133, "Paruchhepa Daivodasi", "Indra", "Atyashti"),
    (134, 134, "Paruchhepa Daivodasi", "Vayu", "Atyashti"),
    (135, 135, "Paruchhepa Daivodasi", "Vayu", "Atyashti"),
    (136, 136, "Paruchhepa Daivodasi", "Mitra-Varuna", "Atyashti"),
    (137, 137, "Paruchhepa Daivodasi", "Mitra-Varuna", "Atyashti"),
    (138, 138, "Paruchhepa Daivodasi", "Pushan", "Atyashti"),
    (139, 139, "Paruchhepa Daivodasi",
     "Vishvedeva, Mitra-Varuna, Ashvins, Indra, Agni, Maruts, Indragni, Brihaspati",
     "Atishakvari, Atyashti"),
    (140, 141, "Dirghatama Auchathya", "Agni", "Jagati, Trishtup"),
    (142, 142, "Dirghatama Auchathya", "Apri Deities (Agni, Tanunapat, Narashamsa, etc.)", "Anushtup"),
    (143, 150, "Dirghatama Auchathya", "Agni", "Jagati, Trishtup, Ushnih"),
    (151, 153, "Dirghatama Auchathya", "Mitra-Varuna", "Jagati, Trishtup"),
    (154, 156, "Dirghatama Auchathya", "Vishnu", "Jagati, Trishtup"),
    (157, 158, "Dirghatama Auchathya", "Ashvinikumar", "Jagati, Trishtup"),
    (159, 160, "Dirghatama Auchathya", "Dyavaprithivi", "Jagati, Trishtup"),
    (161, 161, "Dirghatama Auchathya", "Ribhugana", "Jagati, Trishtup"),
    (162, 163, "Dirghatama Auchathya", "Ashva (Metaphor for Nation/Agni), Mitra-Varuna, Rudra", "Jagati, Trishtup"),
    (164, 164, "Dirghatama Auchathya",
     "Vishvedeva (Asya Vamiya Sukta — Agni, Surya, Kala, Sarasvati)", "Jagati, Trishtup"),
    (165, 165, "Agastya Maitravaruni", "Indra & Maruts", "Trishtup"),
    (166, 168, "Agastya Maitravaruni", "Maruts / Indra-Maruts", "Jagati, Trishtup"),
    (169, 178, "Agastya Maitravaruni", "Indra (and Maruts)", "Trishtup"),
    (179, 179, "Lopamudra (1–2), Agastya (3–4), Brahmachari Disciple (5–6)", "Rati / Dampati", "Trishtup"),
    (180, 184, "Agastya Maitravaruni", "Ashvinikumar", "Trishtup, Jagati"),
    (185, 185, "Agastya Maitravaruni", "Dyavaprithivi", "Trishtup"),
    (186, 186, "Agastya Maitravaruni", "Vishvedeva", "Trishtup"),
    (187, 187, "Agastya Maitravaruni", "Anna / Oshadhis (Pitum)", "Gayatri, Anushtup, Trishtup"),
    (188, 188, "Agastya Maitravaruni", "Apri Hymn / Deities", "Gayatri"),
    (189, 189, "Agastya Maitravaruni", "Agni", "Trishtup"),
    (190, 190, "Agastya Maitravaruni", "Brihaspati", "Trishtup"),
    (191, 191, "Agastya Maitravaruni",
     "Ap, Oshadhis, Surya (Vishaghnopanishad / Poison Destroyer)", "Anushtup, Gayatri"),
]


def build() -> dict[str, Any]:
    out: dict[str, Any] = {}
    for start, end, rishi, devata, chhanda in ROWS:
        for sukta in range(start, end + 1):
            out[f"{MANDALA}.{sukta}"] = {"rishi": rishi, "devata": devata, "chhanda": chhanda}
    return out


def main() -> None:
    data = build()
    OUT.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False),
        encoding="utf-8",
    )
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(data)} suktas covered")


if __name__ == "__main__":
    main()
