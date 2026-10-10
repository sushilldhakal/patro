// GENERATED from dhakal-patro/src/shared — do not edit here.
// Change it in the website repo, then run `npm run shared:sync`.
/**
 * वास्तु reference data — structure only.
 *
 * Every label lives in the bilingual catalogue under `vastu.*`, same as the
 * rest of the app; what is here is the part that is not copy: where each
 * direction sits on the compass, which element it carries, and which direction
 * each room belongs to.
 */

export type VastuElementId = "earth" | "water" | "fire" | "air" | "space";

export type VastuDirectionId =
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest"
  | "center";

export interface VastuDirection {
  id: VastuDirectionId;
  /** Compass bearing in degrees (north = 0, clockwise). `null` for the centre. */
  bearing: number | null;
  element: VastuElementId;
  guna: VastuGunaId;
  /** Cardinal points get the wider wheel segments in the drawing. */
  cardinal: boolean;
  /** Inner-four pada: Bhūdhara / Aryamā / Vivasvān / Mitra. */
  innerDeity?: "bhudhara" | "aryama" | "vivasvan" | "mitra";
}

export type VastuGunaId = "sattva" | "rajas" | "tamas";

/** Clockwise from north — the order the wheel is drawn and listed in. */
export const VASTU_DIRECTIONS: VastuDirection[] = [
  { id: "north", bearing: 0, element: "water", guna: "sattva", cardinal: true, innerDeity: "bhudhara" },
  { id: "northeast", bearing: 45, element: "water", guna: "sattva", cardinal: false },
  { id: "east", bearing: 90, element: "air", guna: "sattva", cardinal: true, innerDeity: "aryama" },
  { id: "southeast", bearing: 135, element: "fire", guna: "rajas", cardinal: false },
  { id: "south", bearing: 180, element: "fire", guna: "tamas", cardinal: true, innerDeity: "vivasvan" },
  { id: "southwest", bearing: 225, element: "earth", guna: "tamas", cardinal: false },
  { id: "west", bearing: 270, element: "space", guna: "tamas", cardinal: true, innerDeity: "mitra" },
  { id: "northwest", bearing: 315, element: "air", guna: "rajas", cardinal: false },
  { id: "center", bearing: null, element: "space", guna: "sattva", cardinal: false },
];

export const VASTU_WHEEL_DIRECTIONS = VASTU_DIRECTIONS.filter(
  (d): d is VastuDirection & { bearing: number } => d.bearing !== null,
);

export const VASTU_CENTER: VastuDirection = VASTU_DIRECTIONS[VASTU_DIRECTIONS.length - 1]!;

export const VASTU_ELEMENT_ORDER: VastuElementId[] = ["water", "air", "fire", "earth", "space"];

/** Pañcamahābhūta — Agni, Jala, Vāyu, Pṛthvī, Ākāśa. */
export const VASTU_ELEMENT_COLOR: Record<VastuElementId, string> = {
  fire: "#E76F3C",
  water: "#3B82C4",
  air: "#48A9A6",
  earth: "#A58A45",
  space: "#6B5B95",
};

export const VASTU_GUNA_COLOR: Record<VastuGunaId, string> = {
  sattva: "#F4DFA3",
  rajas: "#D96C4F",
  tamas: "#394052",
};

/** Ink for the printed-chart wheel and the 2D naksā overlay. */
export const VASTU_INK = {
  background: "#F7F4ED",
  line: "#B8B2A5",
  text: "#292722",
} as const;

/**
 * 16 directions clockwise from north (22.5° steps): Jala N–NE, Vāyu ENE–E and
 * ESE plus NW–NNW, Agni SE–SSE, Pṛthvī S–SW, Ākāśa WSW–WNW.
 */
export const VASTU_DIR16_ELEMENT: readonly VastuElementId[] = [
  "water",
  "water",
  "water",
  "air",
  "air",
  "air",
  "fire",
  "fire",
  "earth",
  "earth",
  "earth",
  "space",
  "space",
  "space",
  "air",
  "air",
];

export function vastuElementAtBearing(bearing: number): VastuElementId {
  const idx = Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16;
  return VASTU_DIR16_ELEMENT[idx]!;
}

export function vastuGunaAtBearing(bearing: number): VastuGunaId {
  const b = ((bearing % 360) + 360) % 360;
  if (b >= 337.5 || b < 112.5) return "sattva";
  if (b < 157.5) return "rajas";
  if (b < 292.5) return "tamas";
  return "rajas";
}

/** 32 perimeter padas, clockwise from Soma (north-wall centre). */
export const VASTU_PADA_IDS = [
  "soma",
  "bhujaga",
  "aditi",
  "diti",
  "shikhi",
  "parjanya",
  "jayanta",
  "mahendra",
  "surya",
  "satya",
  "bhrisha",
  "aakasha",
  "anila",
  "pushan",
  "vitatha",
  "grihakshata",
  "yama",
  "gandharva",
  "bhringraj",
  "mriga",
  "pitra",
  "dauvarika",
  "sugriva",
  "pushpadanta",
  "varuna",
  "asura",
  "shosha",
  "papayakshma",
  "roga",
  "naga",
  "mukhya",
  "bhallata",
] as const;

export type VastuPadaId = (typeof VASTU_PADA_IDS)[number];

export type VastuPadaStatus = "good" | "ok" | "bad" | "mixed";

export type VastuInner4Id = "bhudhara" | "aryama" | "vivasvan" | "mitra";

export const VASTU_INNER4: readonly {
  id: VastuInner4Id;
  bearing: number;
  direction: VastuDirectionId;
  element: VastuElementId;
  guna: VastuGunaId;
}[] = [
  { id: "bhudhara", bearing: 0, direction: "north", element: "water", guna: "sattva" },
  { id: "aryama", bearing: 90, direction: "east", element: "air", guna: "sattva" },
  { id: "vivasvan", bearing: 180, direction: "south", element: "fire", guna: "tamas" },
  { id: "mitra", bearing: 270, direction: "west", element: "space", guna: "tamas" },
];

export type VastuDir16Id =
  | "n"
  | "nne"
  | "ne"
  | "ene"
  | "e"
  | "ese"
  | "se"
  | "sse"
  | "s"
  | "ssw"
  | "sw"
  | "wsw"
  | "w"
  | "wnw"
  | "nw"
  | "nnw";

export type VastuSelectionId = VastuDirectionId | VastuDir16Id | VastuPadaId | VastuInner4Id;

/** @deprecated Use {@link VastuSelectionId}. */
export type VastuZoneId = VastuSelectionId;

export type VastuPadaWall = "N" | "E" | "S" | "W";

export interface VastuPada {
  id: VastuPadaId;
  slot: number;
  bearing: number;
  element: VastuElementId;
  guna: VastuGunaId;
  status: VastuPadaStatus;
  wall: VastuPadaWall;
  index: number;
  code: string;
}

const PADA_ELEMENT: Record<VastuPadaId, VastuElementId> = {
  shikhi: "water",
  parjanya: "water",
  jayanta: "air",
  mahendra: "air",
  surya: "air",
  satya: "air",
  bhrisha: "fire",
  aakasha: "fire",
  anila: "fire",
  pushan: "fire",
  vitatha: "earth",
  grihakshata: "earth",
  yama: "earth",
  gandharva: "earth",
  bhringraj: "earth",
  mriga: "earth",
  pitra: "earth",
  dauvarika: "earth",
  sugriva: "space",
  pushpadanta: "space",
  varuna: "space",
  asura: "space",
  shosha: "space",
  papayakshma: "space",
  roga: "air",
  naga: "air",
  mukhya: "water",
  bhallata: "water",
  soma: "water",
  bhujaga: "water",
  aditi: "water",
  diti: "water",
};

const PADA_GUNA: Record<VastuPadaId, VastuGunaId> = {
  shikhi: "sattva",
  parjanya: "sattva",
  jayanta: "sattva",
  mahendra: "sattva",
  surya: "sattva",
  satya: "sattva",
  bhrisha: "rajas",
  aakasha: "rajas",
  anila: "rajas",
  pushan: "rajas",
  vitatha: "tamas",
  grihakshata: "tamas",
  yama: "tamas",
  gandharva: "tamas",
  bhringraj: "tamas",
  mriga: "tamas",
  pitra: "tamas",
  dauvarika: "tamas",
  sugriva: "tamas",
  pushpadanta: "tamas",
  varuna: "tamas",
  asura: "tamas",
  shosha: "tamas",
  papayakshma: "tamas",
  roga: "rajas",
  naga: "rajas",
  mukhya: "sattva",
  bhallata: "sattva",
  soma: "sattva",
  bhujaga: "sattva",
  aditi: "sattva",
  diti: "sattva",
};

/** Door-pada quality from Mayamata / Viśvakarmā Prakāśa, wall by wall.
 *  `mixed` is + for some uses/people and − for others. */
export const VASTU_PADA_STATUS: Record<VastuPadaId, VastuPadaStatus> = {
  shikhi: "bad",
  parjanya: "mixed",
  jayanta: "good",
  mahendra: "good",
  surya: "bad",
  satya: "mixed",
  bhrisha: "bad",
  aakasha: "mixed",
  anila: "bad",
  pushan: "mixed",
  vitatha: "mixed",
  grihakshata: "good",
  yama: "bad",
  gandharva: "mixed",
  bhringraj: "mixed",
  mriga: "bad",
  pitra: "bad",
  dauvarika: "mixed",
  sugriva: "bad",
  pushpadanta: "good",
  varuna: "mixed",
  asura: "bad",
  shosha: "bad",
  papayakshma: "bad",
  roga: "bad",
  naga: "bad",
  mukhya: "good",
  bhallata: "good",
  soma: "good",
  bhujaga: "mixed",
  aditi: "good",
  diti: "mixed",
};

const PADA_N1_SLOT = VASTU_PADA_IDS.indexOf("roga");
const PADA_WALLS: readonly VastuPadaWall[] = ["N", "E", "S", "W"];

export const VASTU_PADAS: readonly VastuPada[] = VASTU_PADA_IDS.map((id, slot) => {
  const i = (slot - PADA_N1_SLOT + 32) % 32;
  const wall = PADA_WALLS[Math.floor(i / 8)]!;
  const index = (i % 8) + 1;
  const bearing = slot * 11.25 + 5.625;
  return {
    id,
    slot,
    bearing,
    element: PADA_ELEMENT[id],
    guna: PADA_GUNA[id],
    status: VASTU_PADA_STATUS[id],
    wall,
    index,
    code: `${wall}${index}`,
  };
});

const PADA_BY_ID = Object.fromEntries(VASTU_PADAS.map((p) => [p.id, p])) as Record<VastuPadaId, VastuPada>;
const INNER4_BY_ID = Object.fromEntries(VASTU_INNER4.map((d) => [d.id, d])) as Record<
  VastuInner4Id,
  (typeof VASTU_INNER4)[number]
>;

export function isPada(id: string): id is VastuPadaId {
  return Object.hasOwn(PADA_BY_ID, id);
}

export function vastuPada(id: VastuPadaId): VastuPada {
  return PADA_BY_ID[id]!;
}

export function isInner4(id: string): id is VastuInner4Id {
  return Object.hasOwn(INNER4_BY_ID, id);
}

export function vastuInner4(id: VastuInner4Id): (typeof VASTU_INNER4)[number] {
  return INNER4_BY_ID[id]!;
}

export const VASTU_DIR16_ATTR = [
  "vastu.wheel.attr.money",
  "vastu.wheel.attr.health",
  "vastu.wheel.attr.clarity",
  "vastu.wheel.attr.joy",
  "vastu.wheel.attr.social",
  "vastu.wheel.attr.anxiety",
  "vastu.wheel.attr.liquidity",
  "vastu.wheel.attr.power",
  "vastu.wheel.attr.fame",
  "vastu.wheel.attr.expense",
  "vastu.wheel.attr.bonds",
  "vastu.wheel.attr.learning",
  "vastu.wheel.attr.gains",
  "vastu.wheel.attr.detox",
  "vastu.wheel.attr.support",
  "vastu.wheel.attr.attraction",
] as const;

export interface VastuDir16 {
  id: VastuDir16Id;
  bearing: number;
  abbr: string;
  element: VastuElementId;
  guna: VastuGunaId;
  attrKey: (typeof VASTU_DIR16_ATTR)[number];
  padas: readonly [VastuPadaId, VastuPadaId];
}

function padasAtDir16Index(i: number): [VastuPadaId, VastuPadaId] {
  return [VASTU_PADA_IDS[(2 * i - 1 + 32) % 32]!, VASTU_PADA_IDS[(2 * i) % 32]!];
}

const DIR16_META: { id: VastuDir16Id; abbr: string; guna: VastuGunaId }[] = [
  { id: "n", abbr: "N", guna: "sattva" },
  { id: "nne", abbr: "NNE", guna: "sattva" },
  { id: "ne", abbr: "NE", guna: "sattva" },
  { id: "ene", abbr: "ENE", guna: "sattva" },
  { id: "e", abbr: "E", guna: "sattva" },
  { id: "ese", abbr: "ESE", guna: "rajas" },
  { id: "se", abbr: "SE", guna: "rajas" },
  { id: "sse", abbr: "SSE", guna: "tamas" },
  { id: "s", abbr: "S", guna: "tamas" },
  { id: "ssw", abbr: "SSW", guna: "tamas" },
  { id: "sw", abbr: "SW", guna: "tamas" },
  { id: "wsw", abbr: "WSW", guna: "tamas" },
  { id: "w", abbr: "W", guna: "tamas" },
  { id: "wnw", abbr: "WNW", guna: "rajas" },
  { id: "nw", abbr: "NW", guna: "rajas" },
  { id: "nnw", abbr: "NNW", guna: "sattva" },
];

export const VASTU_DIR16: readonly VastuDir16[] = DIR16_META.map((meta, i) => ({
  id: meta.id,
  bearing: i * 22.5,
  abbr: meta.abbr,
  element: VASTU_DIR16_ELEMENT[i]!,
  guna: meta.guna,
  attrKey: VASTU_DIR16_ATTR[i]!,
  padas: padasAtDir16Index(i),
}));

const DIR16_BY_ID = Object.fromEntries(VASTU_DIR16.map((d) => [d.id, d])) as Record<VastuDir16Id, VastuDir16>;

export function isDir16(id: string): id is VastuDir16Id {
  return Object.hasOwn(DIR16_BY_ID, id);
}

export function vastuDir16(id: VastuDir16Id): VastuDir16 {
  return DIR16_BY_ID[id]!;
}

export function vastuDir16AtBearing(bearing: number): VastuDir16Id {
  const idx = Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16;
  return VASTU_DIR16[idx]!.id;
}

/** @deprecated Use {@link vastuDir16AtBearing}. */
export function vastuZoneAtBearing(bearing: number): VastuDir16Id {
  return vastuDir16AtBearing(bearing);
}

export function vastuDir16ForPada(id: VastuPadaId): VastuDir16Id {
  const slot = vastuPada(id).slot;
  return VASTU_DIR16[Math.ceil(slot / 2) % 16]!.id;
}

function bearingDeltaSigned(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export function vastuDir8Padas(id: VastuDirectionId): VastuPadaId[] {
  const dir = vastuDirection(id);
  const center = dir.bearing;
  if (center === null) return [];
  return VASTU_PADAS.filter((p) => Math.abs(bearingDeltaSigned(center, p.bearing)) < 22.5).map((p) => p.id);
}

export type VastuSelectionKind = "dir8" | "dir16" | "pada" | "inner4";

export function vastuSelection(id: VastuSelectionId): {
  kind: VastuSelectionKind;
  id: VastuSelectionId;
  element: VastuElementId;
  guna: VastuGunaId;
  bearing: number | null;
  copyPrefix: string;
  innerDeity?: VastuDirection["innerDeity"];
  padas?: readonly VastuPadaId[];
  attrKey?: string;
  padaCode?: string;
  status?: VastuPadaStatus;
} {
  if (isInner4(id)) {
    const d = vastuInner4(id);
    return {
      kind: "inner4",
      id,
      element: d.element,
      guna: d.guna,
      bearing: d.bearing,
      copyPrefix: `vastu.pada.${id}`,
    };
  }
  if (isPada(id)) {
    const p = vastuPada(id);
    return {
      kind: "pada",
      id,
      element: p.element,
      guna: p.guna,
      bearing: p.bearing,
      copyPrefix: `vastu.pada.${id}`,
      padaCode: p.code,
      status: p.status,
    };
  }
  if (isDir16(id)) {
    const d = vastuDir16(id);
    return {
      kind: "dir16",
      id,
      element: d.element,
      guna: d.guna,
      bearing: d.bearing,
      copyPrefix: `vastu.dir16.${id}`,
      padas: d.padas,
      attrKey: d.attrKey,
    };
  }
  const d = vastuDirection(id);
  return {
    kind: "dir8",
    id,
    element: d.element,
    guna: d.guna,
    bearing: d.bearing,
    copyPrefix: `vastu.dir.${id}`,
    innerDeity: d.innerDeity,
    padas: vastuDir8Padas(id),
  };
}

/** @deprecated Use {@link vastuSelection}. */
export function vastuZone(id: VastuZoneId) {
  return vastuSelection(id);
}

function hexChannel(hex: string, i: number): number {
  return Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

/** Mix an element onto the parchment background (0 = ink.background, 1 = full element). */
export function vastuElementTint(element: VastuElementId, strength = 0.28): string {
  const a = VASTU_INK.background;
  const b = VASTU_ELEMENT_COLOR[element];
  const t = Math.min(1, Math.max(0, strength));
  const ch = (i: number) => Math.round(hexChannel(a, i) + (hexChannel(b, i) - hexChannel(a, i)) * t);
  return `#${[0, 1, 2].map((i) => ch(i).toString(16).padStart(2, "0")).join("")}`;
}

export interface VastuRoom {
  id: string;
  direction: VastuDirectionId;
}

/** Ordered the way a house is usually walked through, not alphabetically. */
export const VASTU_ROOMS: VastuRoom[] = [
  { id: "main_door", direction: "east" },
  { id: "puja", direction: "northeast" },
  { id: "living", direction: "north" },
  { id: "kitchen", direction: "southeast" },
  { id: "master_bedroom", direction: "southwest" },
  { id: "study", direction: "west" },
  { id: "bathroom", direction: "northwest" },
  { id: "staircase", direction: "southwest" },
  { id: "water_tank", direction: "northeast" },
  { id: "storage", direction: "southwest" },
];

/** Common doshas, most-asked first. Copy lives at `vastu.dosha.<id>.*`. */
export const VASTU_DOSHAS: string[] = [
  "northeast_fire",
  "center_heavy",
  "southwest_light",
  "northeast_heavy",
  "head_north",
  "blocked_door",
];

/**
 * The eight directions + Brahmasthan laid out as a North-up 3×3 house grid
 * (Vastu Purusha Mandala), in reading order — top-left → bottom-right:
 *
 *   NW │ N │ NE
 *   ───┼───┼───
 *    W │ C │ E
 *   ───┼───┼───
 *   SW │ S │ SE
 *
 * Shared with the mobile app so both platforms draw the same floor plan.
 */
export const VASTU_GRID_LAYOUT: VastuDirectionId[] = [
  "northwest",
  "north",
  "northeast",
  "west",
  "center",
  "east",
  "southwest",
  "south",
  "southeast",
];

/** Rooms grouped by their ideal direction, in the walk-through order of {@link VASTU_ROOMS}. */
export const VASTU_ROOMS_BY_DIRECTION: Record<VastuDirectionId, VastuRoom[]> =
  VASTU_DIRECTIONS.reduce(
    (acc, dir) => {
      acc[dir.id] = VASTU_ROOMS.filter((room) => room.direction === dir.id);
      return acc;
    },
    {} as Record<VastuDirectionId, VastuRoom[]>,
  );

export function vastuDirection(id: VastuDirectionId): VastuDirection {
  return VASTU_DIRECTIONS.find((d) => d.id === id) ?? VASTU_CENTER;
}

/** Rooms whose ideal direction matches `id` — for grouping {@link VASTU_ROOMS} by zone. */
export function roomsForDirection(id: VastuDirectionId): VastuRoom[] {
  return VASTU_ROOMS.filter((room) => room.direction === id);
}

export type CardinalWall = "north" | "east" | "south" | "west";

/** A rectangular plot has exactly these 4 walls — the subset of {@link VASTU_DIRECTIONS} with `cardinal: true`. */
export const CARDINAL_WALLS: CardinalWall[] = ["north", "east", "south", "west"];

/** The two corner directions adjacent to each wall, walking clockwise. */
export const WALL_CORNERS: Record<CardinalWall, [VastuDirectionId, VastuDirectionId]> = {
  north: ["northwest", "northeast"],
  east: ["northeast", "southeast"],
  south: ["southeast", "southwest"],
  west: ["southwest", "northwest"],
};

/** Point on the wheel for a bearing, with north at the top and east to the right. */
export function vastuWheelPoint(
  bearing: number,
  radius: number,
  cx = 0,
  cy = 0,
): { x: number; y: number } {
  const rad = ((bearing - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/** Annular sector spanning `halfAngle` degrees on each side of `bearing`, around (cx, cy). */
export function annularSectorPath(
  bearing: number,
  halfAngle: number,
  outerR: number,
  innerR: number,
  cx = 0,
  cy = 0,
): string {
  const from = bearing - halfAngle;
  const to = bearing + halfAngle;
  const o1 = vastuWheelPoint(from, outerR, cx, cy);
  const o2 = vastuWheelPoint(to, outerR, cx, cy);
  const i1 = vastuWheelPoint(to, innerR, cx, cy);
  const i2 = vastuWheelPoint(from, innerR, cx, cy);
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** Category edges for one ring — `count` evenly-spaced bearings starting at `first`. */
export function evenBearings(count: number, first: number): number[] {
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) => first + i * step);
}
