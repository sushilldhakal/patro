/**
 * Client-side registry for standalone panchanga-element pages.
 *
 * Titles and blurbs live in ne.json / en.json (`panchanga_elements.*`).
 * Use {@link elementTitle} and {@link elementBlurb} from `@/lib/panchanga-i18n`.
 */
import type { ElementKind } from "@/lib/api";

export interface ElementMeta {
  id: string;
  kind: ElementKind;
}

export const ELEMENT_META: ElementMeta[] = [
  { id: "tithi", kind: "span" },
  { id: "nakshatra", kind: "span" },
  { id: "yoga", kind: "span" },
  { id: "karana", kind: "span" },
  { id: "chandra-rashi", kind: "span" },
  { id: "choghadiya", kind: "table" },
  { id: "hora", kind: "table" },
  { id: "lagna", kind: "table" },
  { id: "chandrabala", kind: "table" },
  { id: "tarabala", kind: "table" },
  { id: "panchaka-rahita", kind: "table" },
  { id: "pushkara", kind: "table" },
];

export const ELEMENT_BY_ID: Record<string, ElementMeta> = Object.fromEntries(
  ELEMENT_META.map((e) => [e.id, e]),
);

export interface CeremonyMeta {
  id: string;
}

/** Shubha-muhurta ceremonies — labels in `sait.categories.*`. */
export const CEREMONY_META: CeremonyMeta[] = [
  { id: "vivah" },
  { id: "bratabandha" },
  { id: "griha-aarambha" },
  { id: "griha-pravesh" },
  { id: "byaparik-pratisthan" },
  { id: "rudri-jurne" },
  { id: "agni-jurne" },
  { id: "annaprasan" },
];
