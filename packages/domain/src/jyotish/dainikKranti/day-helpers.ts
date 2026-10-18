export type Phase = "krishna" | "shukla";

/** Insert the rāśi before the trailing "मा" — "कृत्तिका १ मा" → "कृत्तिका १ वृषमा". */
export function embedRashi(labelNe: string, rashiNe?: string): string {
  if (!rashiNe) return labelNe;
  const out = labelNe.replace(/\s*मा\s*$/u, ` ${rashiNe}मा`);
  return out === labelNe ? `${labelNe} ${rashiNe}` : out;
}

/** Lunar (chāndra) month names in Sanskrit-Nepali, keyed by the API's English name. */
export const LUNAR_MONTH_NE: Record<string, string> = {
  baisakh: "वैशाख", baishakh: "वैशाख", vaisakha: "वैशाख", vaishakha: "वैशाख",
  jestha: "ज्येष्ठ", jyeshtha: "ज्येष्ठ", jyestha: "ज्येष्ठ",
  ashadh: "आषाढ", ashadha: "आषाढ", asar: "आषाढ",
  shrawan: "श्रावण", shrawn: "श्रावण", shravan: "श्रावण", shravana: "श्रावण",
  bhadra: "भाद्रपद", bhadau: "भाद्रपद", bhadrapada: "भाद्रपद",
  ashwin: "आश्विन", ashwina: "आश्विन", aswin: "आश्विन",
  kartik: "कार्तिक", kartika: "कार्तिक",
  mangsir: "मार्गशीर्ष", margashir: "मार्गशीर्ष", margashirsha: "मार्गशीर्ष", margasirsa: "मार्गशीर्ष",
  poush: "पौष", paush: "पौष", pausha: "पौष", push: "पौष",
  magh: "माघ", magha: "माघ",
  falgun: "फाल्गुन", phalgun: "फाल्गुन", phalguna: "फाल्गुन",
  chaitra: "चैत्र", chait: "चैत्र", chaitya: "चैत्र",
};

export function lunarMonthNe(en?: string, isEn = false): string | undefined {
  if (!en) return undefined;
  if (isEn) return en.charAt(0).toUpperCase() + en.slice(1);
  const key = en.toLowerCase().replace(/[^a-z]/g, "");
  return LUNAR_MONTH_NE[key] ?? en;
}

export type PakshaSegment = { key: string; label: string };

/** Day-of-week index from an AD date string (0 = Sunday … 6 = Saturday). */
export function dowOf(dateAd: string): number {
  const d = new Date(`${dateAd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? -1 : d.getDay();
}
