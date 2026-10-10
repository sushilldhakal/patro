/** House-detail-dialog helpers that stay client-side because they're
 * computed from the specific chart being viewed (`houses`), not static
 * content. The static reference text itself (house themes, karakatva,
 * bhavesh-phala, Lal Kitab, and the fixed rashi-lord table) now lives
 * server-side — see `BhavaReferencePayload` in `@/lib/api`, sourced from
 * nepali-holiday-api's `engine/vedic/bhava_reference.py`. */

import type { BhavaHouse } from "@/lib/bhava";
import { drishtiTargetHouses } from "@/lib/bhava";

/** Sanskrit ordinal house names, 1st house first — used in dialog titles
 * ("भाव २ — द्वितीय भाव"). Pure i18n labels, not classical content, so they
 * stay local rather than round-tripping to the server. */
export const HOUSE_ORDINAL_NE = [
  "प्रथम", "द्वितीय", "तृतीय", "चतुर्थ", "पञ्चम", "षष्ठ",
  "सप्तम", "अष्टम", "नवम", "दशम", "एकादश", "द्वादश",
] as const;

export const HOUSE_ORDINAL_EN = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth",
  "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth",
] as const;

/** Classical "lord of house N" terms (लग्नेश, द्वितीयेश, …), 1st house
 * first — used in the bhavesh (house-lord) section of the detail dialog. */
export const HOUSE_LORD_TITLE_NE = [
  "लग्नेश", "द्वितीयेश", "तृतीयेश", "चतुर्थेश", "पञ्चमेश", "षष्ठेश",
  "सप्तमेश", "अष्टमेश", "नवमेश", "दशमेश", "एकादशेश", "द्वादशेश",
] as const;

/** Comma-separated reference strings (house themes, graha subjects) split
 * into their individual items for chip/list rendering. */
export function splitList(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Every graha that casts a graha-drishti onto `targetHouse`, given where each
 * graha sits across the whole chart. Mirrors buildBhavaTable's aspectedBy
 * logic in bhava.ts, recomputed here since D1Chart doesn't carry that table. */
export function computeAspectedBy(houses: BhavaHouse[], targetHouse: number): string[] {
  const result: string[] = [];
  for (const house of houses) {
    for (const planet of house.planets) {
      if (drishtiTargetHouses(planet.key, house.house).includes(targetHouse)) {
        result.push(planet.key);
      }
    }
  }
  return result;
}
