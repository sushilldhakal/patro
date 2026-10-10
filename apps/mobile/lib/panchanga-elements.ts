/** Registry for panchanga element routes — mirrors web `panchanga-elements.ts`. */

export type ElementKind = "span" | "table";

export interface ElementMeta {
  id: string;
  kind: ElementKind;
  titleNe: string;
  titleEn: string;
  blurbNe: string;
  blurbEn: string;
}

export const ELEMENT_META: ElementMeta[] = [
  {
    id: "tithi",
    kind: "span",
    titleNe: "तिथि",
    titleEn: "Tithi",
    blurbNe: "चन्द्र–सूर्य कोणका आधारमा दिनको चरण",
    blurbEn: "Lunar day phase from Sun–Moon angle",
  },
  {
    id: "nakshatra",
    kind: "span",
    titleNe: "नक्षत्र",
    titleEn: "Nakshatra",
    blurbNe: "चन्द्रको नक्षत्रमा बसाइ",
    blurbEn: "Moon’s nakshatra placement",
  },
  {
    id: "yoga",
    kind: "span",
    titleNe: "योग",
    titleEn: "Yoga",
    blurbNe: "सूर्य र चन्द्रको योग संयोजन",
    blurbEn: "Sun + Moon yoga combination",
  },
  {
    id: "karana",
    kind: "span",
    titleNe: "करण",
    titleEn: "Karana",
    blurbNe: "आधा तिथिको करण",
    blurbEn: "Half-tithi karana",
  },
  {
    id: "chandra-rashi",
    kind: "span",
    titleNe: "चन्द्र राशि",
    titleEn: "Moon sign",
    blurbNe: "चन्द्रमाको राशि",
    blurbEn: "Moon’s rashi",
  },
  {
    id: "choghadiya",
    kind: "table",
    titleNe: "चौघडिया",
    titleEn: "Choghadiya",
    blurbNe: "दिन/रातका शुभ–अशुभ खण्ड",
    blurbEn: "Auspicious/inauspicious day & night slots",
  },
  {
    id: "hora",
    kind: "table",
    titleNe: "होरा",
    titleEn: "Hora",
    blurbNe: "ग्रह होरा तालिका",
    blurbEn: "Planetary hora table",
  },
  {
    id: "lagna",
    kind: "table",
    titleNe: "लग्न",
    titleEn: "Lagna",
    blurbNe: "दिनभरि लग्न परिवर्तन",
    blurbEn: "Lagna changes through the day",
  },
  {
    id: "chandrabala",
    kind: "table",
    titleNe: "चन्द्रबल",
    titleEn: "Chandrabalam",
    blurbNe: "चन्द्रबल सारणी",
    blurbEn: "Chandrabalam grid",
  },
  {
    id: "tarabala",
    kind: "table",
    titleNe: "ताराबल",
    titleEn: "Tarabalam",
    blurbNe: "ताराबल सारणी",
    blurbEn: "Tarabalam grid",
  },
  {
    id: "panchaka-rahita",
    kind: "table",
    titleNe: "पञ्चक रहित",
    titleEn: "Panchaka-free",
    blurbNe: "पञ्चक रहित समय",
    blurbEn: "Times free of panchaka",
  },
  {
    id: "pushkara",
    kind: "table",
    titleNe: "पुष्कर",
    titleEn: "Pushkara",
    blurbNe: "पुष्कर नवांश/भाग",
    blurbEn: "Pushkara navamsha windows",
  },
];

export const ELEMENT_BY_ID: Record<string, ElementMeta> = Object.fromEntries(
  ELEMENT_META.map((e) => [e.id, e]),
);

export interface CeremonyMeta {
  id: string;
  titleNe: string;
  titleEn: string;
}

export const CEREMONY_META: CeremonyMeta[] = [
  { id: "vivah", titleNe: "विवाह", titleEn: "Marriage" },
  { id: "bratabandha", titleNe: "व्रतबन्ध", titleEn: "Sacred thread" },
  { id: "griha-aarambha", titleNe: "गृह आरम्भ", titleEn: "House start" },
  { id: "griha-pravesh", titleNe: "गृह प्रवेश", titleEn: "House warming" },
  { id: "byaparik-pratisthan", titleNe: "व्यापारिक प्रतिष्ठान", titleEn: "Business opening" },
  { id: "rudri-jurne", titleNe: "रुद्री जुर्ने", titleEn: "Rudri homa" },
  { id: "agni-jurne", titleNe: "अग्नि जुर्ने", titleEn: "Agni homa" },
  { id: "annaprasan", titleNe: "अन्नप्राशन", titleEn: "Annaprashan" },
];

/** Daily tables with their own static route (`/panchanga/<id>`); the rest use `/panchanga/element/<id>`. */
const STATIC_TABLE_IDS = new Set([
  "choghadiya",
  "hora",
  "lagna",
  "chandrabala",
  "tarabala",
  "panchaka-rahita",
  "pushkara",
]);

export function elementHref(id: string): string {
  return STATIC_TABLE_IDS.has(id) ? `/panchanga/${id}` : `/panchanga/element/${id}`;
}
