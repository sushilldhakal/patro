# Client logic audit — server computes, clients draw

**Rule.** Anything that decides *what is true* — astronomy, calendar arithmetic,
rule tables, placement, scoring, "which one wins" — runs in this repo and is
returned by the API. `dhakal-patro` (web) and `vedic-patro-mobile` (Expo) fetch
the payload and render it. Layout, formatting, translation, colour, SVG
geometry and input masking are presentation and stay in the clients.

This file records the audit of both clients against that rule: what has been
moved, what was checked and is consistent, and what is still computed in a
client. Written against `main` of all three repos on 2026-10-08.

---

## 1. Moved to the server

### Vastu plot sketch + Āyādi — `POST /v1/vastu/sketch`

Both clients carried a ~670-line copy of the room-placement logic
(`vastu-plan.ts`: `SPACE_ZONE_RULES`, `IDEAL_SIZE`, `assignVastuSpaces`,
storey resolution, en-suite/zone sharing) plus the Āyādi width check
(`vastu.ts`: `ayadiRemainder`, `nearestAuspiciousWidthHasta`, hasta conversion)
and the preferred-entrance-corner table. Neither client called the existing
`/vastu/*` routes.

Now: `engine/vedic/vastu/sketch.py` + `sketch_rules.py` own all of it; the
endpoint returns `assignments` (zone, fit, storey, `min_area`), `leftover`,
`ayadi` and `entrance`. The clients keep only form types/option lists and the
drawing code, and read `min_area` from the response instead of an `IDEAL_SIZE`
table.

**Verification.** The Python port was run against the *original* TypeScript on
600 seeded random plans (1–3 storeys, strict/flexible, random extras, per-room
floor preferences, with and without a plot size) and 300 Āyādi widths: 0
mismatches. A slice of that is committed as
`tests/data/golden_vastu_sketch.json` and replayed by `tests/test_vastu_sketch.py`.
`Math.round` (half-up) is reproduced explicitly — Python's `round` is banker's.

**Not the same as `/vastu/house-plan`.** That route is the full floor-plan
solver and derives its zone costs from the sourced `vastu_room_index` data (see
`engine/vedic/vastu/zone_rules.py`). The sketch keeps the client's own,
unsourced rule table so the courtyard sketch reads exactly as it did.
Reconciling the two tables is a content decision, not a refactor — until then
the sketch and the house-plan can disagree about where a room belongs.

**Deploy order.** Server first. The clients now need `/v1/vastu/sketch`; an old
server answers 404 and the sketch shows its "couldn't load" message.

---

## 2. Checked and consistent (data snapshots, not logic)

| What | Where in clients | Result |
|---|---|---|
| BS month-length tables | `bs-calendar-data.json` (web: BS 60–3000; mobile: 1700–2200) | All 100 official years (2000–2099) identical to `engine/vedic/constants.BS_CALENDAR_DATA`. Sampled estimated years (318, 542, 610, 1104, 1614, 1700, 1800, 1900, 1994, 1999, 2100, 2150, 2199, 2200, 2391, 2728) identical to `get_bs_month_length`. |
| Samvatsara table | `samvatsara-table.json` (web) | Byte-identical to `engine/vedic/samvatsara_table.json`. The UI already prefers the server's `samvatsara` payload and only falls back to the table. |

The web and mobile `bs-calendar-data.json` differ in *range* (not in values),
so an offline lookup of, say, BS 1500 works on web and not on mobile.

---

## 3. Kept in the mobile app on purpose (offline mode)

Some logic stays in `vedic-patro-mobile` because the app must work with no
network: the bundled BS month table and `bs-calendar.ts`/`local-calendar.ts`
(used by the AD↔BS converter fallback and the home grid), and a copy of the Vastu
sketch rules (`lib/vastu-offline.ts`, the fallback when `POST /vastu/sketch` is
unreachable). These are copies, not alternatives: the server stays the source of
truth, the Vastu copy is the original code the server's golden test was generated
from, and the BS table was checked against the server (section 2). Everything
else the app shows offline comes from responses downloaded from this API
(`lib/offline/`, see the mobile README).

## 4. Still computed in a client

Ordered by how much it matters, not how easy it is. None of these is wrong today;
each is a second copy that can drift.

1. **Offline BS ↔ AD conversion and month skeletons.**
   `lib/bs-calendar.ts` (`adToBS`, `bsToAD`, `getBSMonthLength`),
   `lib/local-calendar.ts` (`buildLocalMonthDays`, `buildCalendarGridDays`, AD/BS
   span labels) on both clients. Deliberate (offline mode, instant first paint),
   and verified above, but it is the largest remaining body of calendar logic in
   the clients. Server equivalents: `/convert/ad-to-bs`, `/convert/bs-to-ad`,
   `/calendar/header`, `/nepal/patro/...`. Moving it means deciding what the app
   does with no network.
2. **Bhava / house arithmetic and rule tables.** `lib/bhava.ts` (both):
   `rashiToHouse`, `houseClasses`/`houseBadge` (kendra/trikona/…),
   `RASHI_QUALITIES`, `SPECIAL_ASPECT_HOUSES` (its comment says it mirrors
   `interpretation.SPECIAL_ASPECTS`), `buildBhavaTable` (residents, owner,
   aspected-by). Used by ~10 components for natal, divisional and transit
   charts. Fix: have `/kundali/detail`, `/panchanga/at-time` and the gochar
   payload return the per-house table.
3. **Dainik-kranti tables.** `lib/dainikKranti/rashyadi.ts`
   (`rashyadiFromDegInSign`: degrees → aṁśa/kalā/vikalā/prati/truṭi),
   `gapansha.ts`, `rashyadi-segments.ts`, `month-patro-tables.ts`,
   `ingress-day-match.ts` (matches ingress events to days by JD). These build the
   printed-panchang style tables from raw per-day payloads.
4. **Day timeline.** Web `components/panchanga/day-timeline-data.ts`, mobile
   `lib/day-timeline-data.ts`: clock ↔ ghaṭī conversion, `nextKarana`, segment
   assembly for anga/lagna/graha/choghadiya/hora rows.
5. **Vastu door and pada data.** `vastu-house-template.ts` picks the door pada
   (`doorPada`: best-omened pada on the facing wall) and cuts zone blocks into
   rooms; `vastu.ts` holds `VASTU_PADA_STATUS` (good/ok/bad per pada) and the
   dir16/element/guṇa attributes. The block arithmetic is drawing; the pada
   status table and door choice are rules, and `/vastu/zones` already serves
   pada data.
6. **Hora ring.** `lib/hora-data.ts` derives each ring's ruler sequence from the
   weekday cycle; `HoraRing.tsx` takes the current weekday from the device clock.
   The server already returns hora slots per day.
7. **Learn-page simulations** (`sky3d/*`, `components/learn/*-math.ts`,
   `eclipse-math.ts`, `orbit-math.ts`): illustrative astronomy for teaching
   diagrams, not shown as a panchanga value. Left in the clients on purpose.

Out of scope by the rule above (presentation / input handling): the i18n
tables, Nepali-digit formatting, `birth-date.ts` input masking, SVG path
helpers (`hora*Path`, `annularSectorPath`, `vastuWheelPoint`), colour and tone
maps (`sait-suitability.ts`, `navatara-bala.ts` label translation).

## 5. Finding more

```bash
# in each client: files doing arithmetic that is not drawing
grep -rlE "julian|ayanamsa|% 12\b|% 27\b|% 30\b|/ 30\b" src lib components
```

Anything with a rule table or a modulus on a rashi/nakshatra/tithi index is a
candidate. Before adding a new one, check `api/*.py` for a route that already
returns it.
