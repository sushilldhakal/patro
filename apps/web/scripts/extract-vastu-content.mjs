// Reproducible extraction + tagging pipeline for the Vastu zone-use content
// that already lives in strings.ts (best/avoid room-use text per zone,
// cross-referenced by the product owner against five classical texts —
// Mayamata, Manasara, Vishvakarma Prakasha, Samarangana Sutradhara,
// Aparajitaprccha). Produces two files for the nepali-holiday-api backend:
//
//   vastu_zone_uses.json  — one row per zone (dir8/dir16/pada32/inner4),
//                            verbatim ne+en best/avoid text. Zero interpretation.
//   vastu_room_index.json — derived room/feature/opening -> zone index, built
//                            by splitting each zone's best/avoid text into
//                            individual mentions and matching them against an
//                            explicit, reviewable vocabulary below. Every
//                            mapping keeps its original matched phrase
//                            (ne+en where the two texts' segment counts
//                            align) so it's spot-checkable against the
//                            source, not a black box.
//
// Reads directly from vastu.ts/strings.ts (both import-free leaf modules —
// no path-alias resolution needed) so it stays correct if the source content
// changes. Run: node scripts/extract-vastu-content.mjs [outDir]
// Default outDir: ../nepali-holiday-api/data (sibling repo).

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  VASTU_DIRECTIONS,
  VASTU_DIR16,
  VASTU_PADA_IDS,
  VASTU_INNER4,
} from "../src/lib/vastu.ts";
import { strings } from "../src/i18n/strings.ts";

const VERSION = "2026.09.01.2"; // .2: added family/servant/library/combined via vastu.plan.why.*
const SOURCES = ["mayamata", "manasara", "vishvakarma", "samarangana", "aparajita"];

// ── 1. Extract zone-use content verbatim ────────────────────────────────────

function pick(prefix, id, field) {
  const row = strings[`${prefix}.${id}.${field}`];
  return row ? { ne: row.ne, en: row.en } : null;
}

const zones = [];

for (const d of VASTU_DIRECTIONS) {
  if (d.id === "center") continue; // Brahmasthan, not a placement zone
  zones.push({
    granularity: "dir8",
    id: d.id,
    bearing: d.bearing,
    element: d.element,
    guna: d.guna,
    name: pick("vastu.dir", d.id, "name"),
    deity: pick("vastu.dir", d.id, "deity"),
    importance: pick("vastu.dir", d.id, "importance"),
    best: pick("vastu.dir", d.id, "best"),
    avoid: pick("vastu.dir", d.id, "avoid"),
  });
}
for (const d of VASTU_DIR16) {
  zones.push({
    granularity: "dir16",
    id: d.id,
    bearing: d.bearing,
    abbr: d.abbr,
    element: d.element,
    guna: d.guna,
    name: pick("vastu.dir16", d.id, "name"),
    quality: pick("vastu.dir16", d.id, "quality"),
    deity: pick("vastu.dir16", d.id, "deity"),
    importance: pick("vastu.dir16", d.id, "importance"),
    best: pick("vastu.dir16", d.id, "best"),
    avoid: pick("vastu.dir16", d.id, "avoid"),
  });
}
for (const id of VASTU_PADA_IDS) {
  zones.push({
    granularity: "pada32",
    id,
    name: pick("vastu.pada", id, "name"),
    deity: pick("vastu.pada", id, "deity"),
    importance: pick("vastu.pada", id, "importance"),
    best: pick("vastu.pada", id, "best"),
    avoid: pick("vastu.pada", id, "avoid"),
  });
}
for (const d of VASTU_INNER4) {
  zones.push({
    granularity: "inner4",
    id: d.id,
    bearing: d.bearing,
    direction: d.direction,
    element: d.element,
    guna: d.guna,
    name: pick("vastu.pada", d.id, "name"),
    importance: pick("vastu.pada", d.id, "importance"),
    best: pick("vastu.pada", d.id, "best"),
    avoid: pick("vastu.pada", d.id, "avoid"),
  });
}

const missing = zones.filter((z) => !z.best || !z.avoid);
if (missing.length) {
  console.error("Missing best/avoid content for:", missing.map((z) => `${z.granularity}:${z.id}`));
  process.exit(1);
}

// ── 2. Tag each zone's best/avoid text into a room/feature/opening index ───
// Ordered: first match wins, most-specific patterns first.
const VOCAB = [
  ["master_bedroom", "room", /master bedroom/i],
  ["bedroom", "room", /newlyweds'? bedroom|new bride'?s room|sleeping bed|a child'?s bed|the main bed|guest bedroom|secondary guest bedroom|bedrooms?\b/i],
  ["guest", "room", /guest room/i],
  ["childrens_room", "room", /children'?s (room|bedroom|study)|kids room/i],
  ["living", "room", /living room|open living room|(?:a |the )?(?:light )?sitting (?:room|area)|place for social visits|informal talk room|music( or leisure)?|leisure room/i],
  ["dining", "room", /dining room/i],
  ["study", "room", /study room|\bstudy\b|bookcase/i],
  ["puja", "room", /puja(?: room)?|meditation|\byoga\b/i],
  ["kitchen", "room", /kitchen/i],
  ["toilet", "room", /toilets?\b/i],
  ["bathroom", "room", /bathroom|washroom/i],
  ["staircase", "room", /\bstairs?\b|staircase|foot of the stairs/i],
  ["garage", "room", /garage|vehicle parking/i],
  ["garden", "room", /\bgarden\b/i],
  ["store", "room", /storage|\bstores?\b|junk|grain store|dry-goods storage|cattle shed|filthy junk|junk pile|heavy junk|utility nook|churning\/work nook/i],
  ["laundry", "room", /washing machine|laundry spot|cupboards/i],
  ["office", "room", /\boffice\b/i],
  ["gym", "room", /\bgym\b|exercise room/i],
  ["dressing_room", "room", /dressing room|a place for scents/i],
  ["guard_room", "room", /guard room|rear service gate|service gate/i],
  ["first_aid_room", "room", /first-aid|medicine storage/i],

  ["main_door", "opening", /main (door|entrance)|\bentrance\b|(east|west|north|south)-facing (main )?door|\ba (north|south|east|west) door\b/i],
  ["window", "opening", /large windows?|light window|ventilated window|exhaust fan|ventilation|\bwindows?\b/i],

  ["water_tank_underground", "feature", /underground water( tank)?|water boring|\bboring\b|water source|\bwell\b/i],
  ["water_tank_overhead", "feature", /overhead water tank|a heavy overhead tank|overhead tank/i],
  ["safe_locker", "feature", /treasury|money safe|jewellery locker|the main safe|\bsafe\b|\blocker\b|place for gems/i],
  ["septic", "feature", /septic( tank)?|toilet outlet pipe|outlet pipe/i],
  ["waste_dump", "feature", /dustbin|waste dump|waste spot|waste store|disposal (zone|fittings)|piles of waste|\bfilth\b/i],
  ["electrical", "feature", /electrical (meter|appliances)|generator|\bheater\b|\bgeyser\b|\binverter\b|gas stove|\bstove\b|\boven\b/i],
  ["courtyard", "feature", /open courtyard/i],
  ["balcony", "feature", /open balcony/i],
  ["rcc_pillar", "feature", /heavy RCC pillar|a pillar\b/i],
  ["heavy_load", "feature", /heav(y|iest)|a large open gap|an open gap|open and light space|open space|firm floor/i],
];

// Real content, but pure commentary/description — not a room/feature mention
// worth indexing. Explicit and reviewable rather than silently dropped.
const IGNORE = [
  /most sacred corner of a home/i,
  /keep the mind restless/i,
  /closed southwest-like wall/i,
  /a higher south wall/i,
  /a quiet sit for the mind/i,
  /^play$/i,
  /an open west/i,
  /^light,? ?the? ?air$/i,
  /^air$/i,
  /the core toward/i,
  /blocking it with tall walls/i,
  /heavy structures/i,
  /wherever morning light should reach/i,
  /^light$/i,
];

function splitMentions(text, { ne = false } = {}) {
  // Parenthetical asides (incl. any em dash inside them) are notes, not
  // separate items — strip first so they can't be mis-split on the dash,
  // then split the remainder on commas/"or" (or Nepali "वा").
  const notes = [];
  const stripped = text.replace(/[（(]([^)）]*)[)）]/g, (_, inner) => {
    notes.push(inner.trim());
    return "";
  });
  const mentions = stripped
    .split(ne ? /,| वा / : /,| or /)
    .map((s) => s.trim())
    .filter(Boolean);
  return { mentions, notes };
}

function classify(mention) {
  if (IGNORE.some((p) => p.test(mention))) return "ignore";
  for (const [subject, subject_type, pattern] of VOCAB) {
    if (pattern.test(mention)) return { subject, subject_type };
  }
  return null;
}

const mappings = [];
const unmatched = [];

for (const z of zones) {
  const zoneRef = `${z.granularity}:${z.id}`;
  for (const polarity of ["best", "avoid"]) {
    const en = z[polarity].en;
    const ne = z[polarity].ne;
    const { mentions, notes } = splitMentions(en);
    const { mentions: neMentions } = splitMentions(ne, { ne: true });
    const noteText = notes.length ? notes.join("; ") : null;
    const aligned = neMentions.length === mentions.length;
    mentions.forEach((mention, i) => {
      const hit = classify(mention);
      if (hit === "ignore") return;
      if (!hit) {
        unmatched.push({ zone: zoneRef, polarity, mention });
        return;
      }
      mappings.push({
        subject: hit.subject,
        subject_type: hit.subject_type,
        zone: zoneRef,
        polarity,
        matched_phrase_en: mention,
        matched_phrase_ne: aligned ? neMentions[i] : null,
        zone_note: noteText,
      });
    });
  }
}

if (unmatched.length) {
  console.error(`${unmatched.length} unmatched mentions — extend VOCAB or IGNORE:`, unmatched);
  process.exit(1);
}

// ── 2b. A handful of subjects (family, servant, library, combined) have no
// mention anywhere in the zone wheel's best/avoid text — they're covered
// instead by a separate `vastu.plan.why.<subject>` block in strings.ts
// (per-room placement rationale, not part of the zone-wheel content the
// product owner cross-referenced against the five classical texts). Each
// entry below is a literal, manual transcription of the *named cardinal
// directions only* in that text — nothing inferred (e.g. "the
// householder's corner" in the servant text or "the air zone" in the
// combined text are references, not named directions, so they're left out
// rather than resolved to a guessed zone). A run-time check confirms each
// named direction word still appears in the live strings.ts text, so this
// table can't silently drift out of sync with its source.
const WHY_DIRECTION_MAPPINGS = [
  {
    subject: "family",
    sourceKey: "vastu.plan.why.family",
    // "A family room rests in the north or west; southeast fire is busier."
    best: ["north", "west"],
    avoid: ["southeast"],
  },
  {
    subject: "servant",
    sourceKey: "vastu.plan.why.servant",
    // "A service room sits northwest or west — apart from the northeast and the householder's corner."
    best: ["northwest", "west"],
    avoid: ["northeast"],
  },
  {
    subject: "library",
    sourceKey: "vastu.plan.why.library",
    // "A library likes quiet light in the north, northeast or west; southeast is busier."
    best: ["north", "northeast", "west"],
    avoid: ["southeast"],
  },
  {
    subject: "combined",
    sourceKey: "vastu.plan.why.combined",
    // "Even as one room, a toilet-bath is kept off the northeast and center, toward the air zone."
    best: [],
    avoid: ["northeast"],
  },
];

const DIR8_WORD = {
  north: { en: "north", ne: "उत्तर" },
  northeast: { en: "northeast", ne: "ईशान" },
  east: { en: "east", ne: "पूर्व" },
  southeast: { en: "southeast", ne: "दक्षिणपूर्व" },
  south: { en: "south", ne: "दक्षिण" },
  southwest: { en: "southwest", ne: "दक्षिणपश्चिम" },
  west: { en: "west", ne: "पश्चिम" },
  northwest: { en: "northwest", ne: "उत्तरपश्चिम" },
};

for (const { subject, sourceKey, best, avoid } of WHY_DIRECTION_MAPPINGS) {
  const row = strings[sourceKey];
  if (!row) {
    console.error(`WHY_DIRECTION_MAPPINGS references missing key: ${sourceKey}`);
    process.exit(1);
  }
  for (const [polarity, dirs] of [["best", best], ["avoid", avoid]]) {
    for (const dir of dirs) {
      const word = DIR8_WORD[dir];
      if (!word) {
        console.error(`Unknown dir8 id "${dir}" in WHY_DIRECTION_MAPPINGS for ${subject}`);
        process.exit(1);
      }
      if (!new RegExp(word.en, "i").test(row.en)) {
        console.error(`"${word.en}" no longer appears in ${sourceKey} (en) — WHY_DIRECTION_MAPPINGS is stale`);
        process.exit(1);
      }
      mappings.push({
        subject,
        subject_type: "room",
        zone: `dir8:${dir}`,
        polarity,
        matched_phrase_en: word.en,
        matched_phrase_ne: row.ne.includes(word.ne) ? word.ne : null,
        zone_note: `From ${sourceKey} — app placement rationale, not the classical-text-cross-referenced zone wheel.`,
      });
    }
  }
}

// ── 3. Write output ──────────────────────────────────────────────────────
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(here, "../../nepali-holiday-api/data");
mkdirSync(outDir, { recursive: true });

writeFileSync(
  path.join(outDir, "vastu_zone_uses.json"),
  JSON.stringify({ version: VERSION, sources: SOURCES, verification_status: "user_verified", zones }, null, 2),
);
writeFileSync(
  path.join(outDir, "vastu_room_index.json"),
  JSON.stringify({ version: VERSION, sources: SOURCES, verification_status: "user_verified", mappings }, null, 2),
);

console.log(
  `Wrote ${zones.length} zones and ${mappings.length} room-index mappings to ${outDir}`,
);
