/** Shared by apps/web/src/components/avakahada/AvakahadaWheel.tsx and apps/mobile/components/avakahada/AvakahadaWheel.tsx (moved here from both, unchanged). */
import type { NakshatraRow, Gana } from "@vedic-patro/domain/jyotish/avakahada-data";
import { rowMetaFromCharans, localizeNakshatra, localizeLord, localizeVarna, localizeVashya, localizeYoni, localizeNadi, localizeGana, localizeRashi } from "@vedic-patro/domain/jyotish/avakahada-locale";

export const CX = 310;

export const CY = 310;

/** Outside → inside */
export const R = {
  nakOut: 302,
  nakIn: 254,
  padaOut: 254,
  padaIn: 224,
  rashiOut: 224,
  rashiIn: 208,
  lordOut: 208,
  lordIn: 192,
  varnaOut: 192,
  varnaIn: 176,
  vashyaOut: 176,
  vashyaIn: 160,
  yoniOut: 160,
  yoniIn: 144,
  ganaOut: 144,
  ganaIn: 128,
  nadiOut: 128,
  nadiIn: 112,
  hub: 104,
} as const;

export const ATTR_RINGS = [
  { id: "rashi" as const, rOut: R.rashiOut, rIn: R.rashiIn },
  { id: "lord" as const, rOut: R.lordOut, rIn: R.lordIn },
  { id: "varna" as const, rOut: R.varnaOut, rIn: R.varnaIn },
  { id: "vashya" as const, rOut: R.vashyaOut, rIn: R.vashyaIn },
  { id: "yoni" as const, rOut: R.yoniOut, rIn: R.yoniIn },
  { id: "gana" as const, rOut: R.ganaOut, rIn: R.ganaIn },
  { id: "nadi" as const, rOut: R.nadiOut, rIn: R.nadiIn },
] as const;

export type AttrRingId = (typeof ATTR_RINGS)[number]["id"];

export type AvakahadaWheelRow = {
  index: number;
  ne: string;
  en: string;
  nakshatraLabel: string;
  aksharas: string[];
  charanRashis: string[];
  lord: string;
  varna: string;
  vashya: string;
  yoni: string;
  vairiYoni: string;
  gana: Gana;
  nadi: string;
};

export function toWheelRow(r: NakshatraRow, lang: string): AvakahadaWheelRow {
  const meta = rowMetaFromCharans(r.charanRashis);
  return {
    index: r.index,
    ne: r.ne,
    en: r.en,
    nakshatraLabel: localizeNakshatra(r, lang),
    aksharas: r.aksharas,
    charanRashis: r.charanRashis,
    lord: localizeLord(meta.lord, lang),
    varna: localizeVarna(meta.varna, lang),
    vashya: localizeVashya(meta.vashya, lang),
    yoni: localizeYoni(r.yoni, lang),
    vairiYoni: localizeYoni(r.vairiYoni, lang),
    gana: r.gana,
    nadi: localizeNadi(r.nadi, lang),
  };
}

export function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export function sectorPath(rIn: number, rOut: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = polar(rOut, a0);
  const [x2, y2] = polar(rOut, a1);
  const [x3, y3] = polar(rIn, a1);
  const [x4, y4] = polar(rIn, a0);
  return [
    `M${x1.toFixed(2)},${y1.toFixed(2)}`,
    `A${rOut},${rOut} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
    `L${x3.toFixed(2)},${y3.toFixed(2)}`,
    `A${rIn},${rIn} 0 ${large} 0 ${x4.toFixed(2)},${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function formatRashi(row: AvakahadaWheelRow, lang: string): string {
  const u = [...new Set(row.charanRashis)];
  if (u.length === 1) return localizeRashi(u[0]!, lang);
  return u.map((r) => localizeRashi(r, lang)).join("/");
}

export function formatDual(value: string): string {
  return value.replace(/ \/ /g, "·");
}

export function attrValue(id: AttrRingId, row: AvakahadaWheelRow, lang: string): string {
  switch (id) {
    case "rashi":
      return formatRashi(row, lang);
    case "lord":
      return formatDual(row.lord);
    case "varna":
      return formatDual(row.varna);
    case "vashya":
      return localizeVashya(row.vashya, lang, true);
    case "yoni":
      return row.yoni;
    case "gana":
      return localizeGana(row.gana, lang);
    case "nadi":
      return row.nadi;
  }
}
