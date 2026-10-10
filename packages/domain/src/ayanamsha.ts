export type AyanamshaMode = "nepal" | "lahiri" | "raman" | "kp" | "true_citra";

export interface AyanamshaModeInfo {
  id: AyanamshaMode;
  label: string;
  labelNe: string;
  tagline: string;
  taglineNe: string;
  tier: "default" | "advanced";
}

export const AYANAMSHA_MODES: AyanamshaModeInfo[] = [
  {
    id: "nepal",
    label: "Nepal Panchang",
    labelNe: "नेपाल पञ्चाङ्ग",
    tagline: "Matches Nepal Panchang Nirnayak Samiti & Nepali calendars",
    taglineNe: "नेपाल पञ्चाङ्ग निर्णायक समिति र नेपाली पात्रोसँग मिल्ने",
    tier: "default",
  },
  {
    id: "lahiri",
    label: "Lahiri (Standard Vedic)",
    labelNe: "लाहिरी (मानक वैदिक)",
    tagline: "Industry standard — used by most Vedic astrology software",
    taglineNe: "धेरैजसो ज्योतिष सफ्टवेयरले प्रयोग गर्ने मानक अयनांश",
    tier: "advanced",
  },
  {
    id: "raman",
    label: "Raman",
    labelNe: "रमन",
    tagline: "For the B.V. Raman astrology tradition",
    taglineNe: "बि.भि. रमन परम्पराका ज्योतिषीहरूका लागि",
    tier: "advanced",
  },
  {
    id: "kp",
    label: "Krishnamurti (KP)",
    labelNe: "कृष्णमूर्ति (KP)",
    tagline: "For KP astrology — sub-lord & cuspal analysis",
    taglineNe: "केपी ज्योतिष (सब-लर्ड तथा कस्पल विश्लेषण) का लागि",
    tier: "advanced",
  },
  {
    id: "true_citra",
    label: "True Chitrapaksha",
    labelNe: "ट्रू चित्रपक्ष",
    tagline: "Most astronomically precise — tracks the star Spica directly",
    taglineNe: "चित्रा तारा (स्पाइका) को वास्तविक स्थितिमा आधारित — अनुसन्धान/उन्नत प्रयोगका लागि",
    tier: "advanced",
  },
];

/**
 * True when the mode's zodiac matches the API's panchanga angas, which are
 * always computed in Lahiri (Nepal Panchang uses a Lahiri-equivalent
 * ayanamsha). For other modes the graha/lagna longitudes come back shifted,
 * so nakshatra-derived fields must be recomputed from the longitude instead
 * of read from the Lahiri anga blocks.
 */
export function matchesPanchangaAngas(mode: AyanamshaMode): boolean {
  return mode === "nepal" || mode === "lahiri";
}

export function getAyanamshaModeInfo(mode: AyanamshaMode): AyanamshaModeInfo {
  return AYANAMSHA_MODES.find((m) => m.id === mode) ?? AYANAMSHA_MODES[0]!;
}
