/**
 * Bundled राशि / नक्षत्र SVG URLs (`src/assets/rashi`, `src/assets/nakshatras`).
 * Order matches {@link rashiNumberFromName} and {@link NAKSHATRA_ICONS}.
 */
import { findNakshatraIcon, NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { rashiNumberFromName } from "@/lib/rashi-i18n";

import rashiMesha from "@/assets/rashi/mesha.svg?url";
import rashiVrishabha from "@/assets/rashi/vrishabha.svg?url";
import rashiMithuna from "@/assets/rashi/mithuna.svg?url";
import rashiKarkat from "@/assets/rashi/karkat.svg?url";
import rashiSimha from "@/assets/rashi/simha.svg?url";
import rashiKanya from "@/assets/rashi/kanya.svg?url";
import rashiThula from "@/assets/rashi/thula.svg?url";
import rashiVrushika from "@/assets/rashi/vrushika.svg?url";
import rashiDhanu from "@/assets/rashi/dhanu.svg?url";
import rashiMakara from "@/assets/rashi/makara.svg?url";
import rashiKumbha from "@/assets/rashi/kumbha.svg?url";
import rashiMeena from "@/assets/rashi/meena.svg?url";

import nakAshwini from "@/assets/nakshatras/ashwini.svg?url";
import nakBharani from "@/assets/nakshatras/bharani.svg?url";
import nakKrittika from "@/assets/nakshatras/krittika.svg?url";
import nakRohini from "@/assets/nakshatras/rohini.svg?url";
import nakMrigashira from "@/assets/nakshatras/mrigashira.svg?url";
import nakArdra from "@/assets/nakshatras/ardra.svg?url";
import nakPunarvasu from "@/assets/nakshatras/punarvasu.svg?url";
import nakPushya from "@/assets/nakshatras/pushya.svg?url";
import nakAshlesha from "@/assets/nakshatras/ashlesha.svg?url";
import nakMagha from "@/assets/nakshatras/magha.svg?url";
import nakPurvaphalguni from "@/assets/nakshatras/purvaphalguni.svg?url";
import nakUttaraphalguni from "@/assets/nakshatras/uttaraphalguni.svg?url";
import nakHasta from "@/assets/nakshatras/hasta.svg?url";
import nakChitra from "@/assets/nakshatras/chitra.svg?url";
import nakSwathi from "@/assets/nakshatras/swathi.svg?url";
import nakVishakha from "@/assets/nakshatras/vishakha.svg?url";
import nakAnuradha from "@/assets/nakshatras/anuradha.svg?url";
import nakJyeshta from "@/assets/nakshatras/jyeshta.svg?url";
import nakMula from "@/assets/nakshatras/mula.svg?url";
import nakPurvashada from "@/assets/nakshatras/purvashada.svg?url";
import nakUttarashada from "@/assets/nakshatras/uttarashada.svg?url";
import nakShravana from "@/assets/nakshatras/shravana.svg?url";
import nakDhanishta from "@/assets/nakshatras/dhanishta.svg?url";
import nakShatabisha from "@/assets/nakshatras/shatabisha.svg?url";
import nakPurvabhadrapada from "@/assets/nakshatras/purvabhadrapada.svg?url";
import nakUttarabhadrapada from "@/assets/nakshatras/uttarabhadrapada.svg?url";
import nakRevati from "@/assets/nakshatras/revati.svg?url";

export const RASHI_GLYPH_URL: readonly string[] = [
  rashiMesha,
  rashiVrishabha,
  rashiMithuna,
  rashiKarkat,
  rashiSimha,
  rashiKanya,
  rashiThula,
  rashiVrushika,
  rashiDhanu,
  rashiMakara,
  rashiKumbha,
  rashiMeena,
];

export const NAKSHATRA_GLYPH_URL: readonly string[] = [
  nakAshwini,
  nakBharani,
  nakKrittika,
  nakRohini,
  nakMrigashira,
  nakArdra,
  nakPunarvasu,
  nakPushya,
  nakAshlesha,
  nakMagha,
  nakPurvaphalguni,
  nakUttaraphalguni,
  nakHasta,
  nakChitra,
  nakSwathi,
  nakVishakha,
  nakAnuradha,
  nakJyeshta,
  nakMula,
  nakPurvashada,
  nakUttarashada,
  nakShravana,
  nakDhanishta,
  nakShatabisha,
  nakPurvabhadrapada,
  nakUttarabhadrapada,
  nakRevati,
];

export function rashiGlyphUrl(
  name?: string | null,
  number?: number | null,
): string | undefined {
  const n =
    number != null && number >= 1 && number <= 12
      ? number
      : rashiNumberFromName(name);
  if (!n) return undefined;
  return RASHI_GLYPH_URL[n - 1];
}

export function nakshatraGlyphUrl(
  name?: string | null,
  number?: number | null,
): string | undefined {
  if (number != null && number >= 1 && number <= 27) {
    return NAKSHATRA_GLYPH_URL[number - 1];
  }
  const icon = findNakshatraIcon(name);
  if (!icon) return undefined;
  const idx = NAKSHATRA_ICONS.indexOf(icon);
  return idx >= 0 ? NAKSHATRA_GLYPH_URL[idx] : undefined;
}
