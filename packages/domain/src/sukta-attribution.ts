import raw from "./sukta-attribution-ne.json";

const DEVANAGARI = raw as Record<string, string>;

/** Nepali UI shows ऋषि, देवता and छन्द in Devanagari. English keeps the catalog spelling. */
export function suktaAttribution(lang: string, value: string | null): string | null {
  if (!value) return null;
  if (lang !== "ne") return value;
  return DEVANAGARI[value] ?? value;
}
