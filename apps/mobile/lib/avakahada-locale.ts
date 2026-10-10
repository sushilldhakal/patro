import type { Gana, Nadi, NakshatraRow } from "@/lib/avakahada-data";
import { RASHI_META } from "@/lib/avakahada-data";
import { resolveRashiDisplay } from "@/lib/rashi-i18n";

export function isEnglishLocale(lang?: string): boolean {
  return (lang ?? "ne").startsWith("en");
}

const LORD_NE_TO_EN: Record<string, string> = {
  मंगल: "Mars",
  मङ्गल: "Mars",
  भौम: "Mars",
  शुक्र: "Venus",
  बुध: "Mercury",
  चन्द्र: "Moon",
  सूर्य: "Sun",
  गुरु: "Jupiter",
  शनि: "Saturn",
  केतु: "Ketu",
  राहु: "Rahu",
};

const VARNA_NE_TO_EN: Record<string, string> = {
  विप्र: "Brahmin",
  क्षत्रिय: "Kshatriya",
  वैश्य: "Vaishya",
  शूद्र: "Shudra",
};

const VASHYA_NE_TO_EN: Record<string, string> = {
  चतुष्पद: "Quadruped",
  द्विपद: "Biped",
  जलचर: "Aquatic",
  वनचर: "Forest",
  कीट: "Insect",
};

const VASHYA_SHORT_EN: Record<string, string> = {
  Quadruped: "Quad",
  Biped: "Biped",
  Aquatic: "Aqua",
  Forest: "Forest",
  Insect: "Insect",
};

const YONI_NE_TO_EN: Record<string, string> = {
  अश्व: "Horse",
  घोडा: "Horse",
  महिष: "Buffalo",
  भैंस: "Buffalo",
  राँगो: "Buffalo",
  रांगो: "Buffalo",
  गज: "Elephant",
  हात्ती: "Elephant",
  सिंह: "Lion",
  अज: "Goat",
  बोका: "Goat",
  वानर: "Monkey",
  बाँदर: "Monkey",
  सर्प: "Serpent",
  नकुल: "Mongoose",
  श्वान: "Dog",
  कुकुर: "Dog",
  मृग: "Deer",
  हरिण: "Deer",
  मार्जार: "Cat",
  बिरालो: "Cat",
  मूषक: "Rat",
  मुसा: "Rat",
  गौ: "Cow",
  गाई: "Cow",
  व्याघ्र: "Tiger",
  बाघ: "Tiger",
  मेष: "Ram",
};

/** Patro-style Nepali labels (not Sanskrit) for the योनि / वैरि-योनि columns. */
const YONI_DISPLAY_NE: Record<string, string> = {
  अश्व: "घोडा",
  महिष: "राँगो",
  गज: "हात्ती",
  सिंह: "सिंह",
  अज: "बोका",
  वानर: "बाँदर",
  सर्प: "सर्प",
  नकुल: "नकुल",
  श्वान: "कुकुर",
  मृग: "हरिण",
  मार्जार: "बिरालो",
  मूषक: "मुसा",
  गौ: "गाई",
  व्याघ्र: "बाघ",
};

const GANA_NE_TO_EN: Record<Gana, string> = {
  देव: "Deva",
  नर: "Manushya",
  राक्षस: "Rakshasa",
};

const NADI_NE_TO_EN: Record<Nadi, string> = {
  आद्य: "Adya",
  मध्य: "Madhya",
  अन्त्य: "Antya",
};

const NAKSHATRA_SLUG_TO_EN: Record<string, string> = {
  ashvini: "Ashwini",
  bharani: "Bharani",
  krittika: "Krittika",
  rohini: "Rohini",
  mrigashira: "Mrigashira",
  ardra: "Ardra",
  punarvasu: "Punarvasu",
  pushya: "Pushya",
  ashlesha: "Ashlesha",
  magha: "Magha",
  purvaphalguni: "Purva Phalguni",
  uttaraphalguni: "Uttara Phalguni",
  hasta: "Hasta",
  chitra: "Chitra",
  swati: "Swati",
  vishakha: "Vishakha",
  anuradha: "Anuradha",
  jyeshtha: "Jyeshtha",
  mula: "Mula",
  purvashada: "Purva Ashadha",
  uttarashada: "Uttara Ashadha",
  shravana: "Shravana",
  dhanishta: "Dhanishta",
  shatabhisha: "Shatabhisha",
  purvabhadrapada: "Purva Bhadrapada",
  uttarabhadrapada: "Uttara Bhadrapada",
  revati: "Revati",
};

const VARGA_NE_TO_EN: Record<string, string> = {
  गरुड: "Garuda",
  सर्प: "Serpent",
  मार्जार: "Cat",
  मूषक: "Rat",
  सिंह: "Lion",
  मृग: "Deer",
  श्वान: "Dog",
  मेष: "Ram",
};

function mapJoined(value: string, map: Record<string, string>): string {
  return value
    .split(" / ")
    .map((v) => map[v.trim()] ?? v)
    .join(" / ");
}

export function localizeRashi(ne: string, lang?: string): string {
  const display = RASHI_META[ne]?.ne ?? ne;
  if (!isEnglishLocale(lang)) return display;
  return resolveRashiDisplay(display, undefined, "en") ?? resolveRashiDisplay(ne, undefined, "en") ?? ne;
}

export function localizeRashis(rashis: string[], lang?: string): string {
  return rashis.map((r) => localizeRashi(r, lang)).join(" / ");
}

export function localizeLord(lord: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return lord;
  return mapJoined(lord, LORD_NE_TO_EN);
}

export function localizeVarna(varna: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return varna;
  return mapJoined(varna, VARNA_NE_TO_EN);
}

export function localizeVashya(vashya: string, lang?: string, short = false): string {
  if (!isEnglishLocale(lang)) {
    if (!short) return vashya;
    const shortNe: Record<string, string> = {
      चतुष्पद: "चतु",
      द्विपद: "द्वि",
      जलचर: "जल",
      वनचर: "वन",
    };
    return vashya
      .split(" / ")
      .map((v) => shortNe[v] ?? v)
      .join("·");
  }
  const en = mapJoined(vashya, VASHYA_NE_TO_EN);
  if (!short) return en;
  return en
    .split(" / ")
    .map((v) => VASHYA_SHORT_EN[v] ?? v)
    .join("·");
}

export function localizeYoni(yoni: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return YONI_DISPLAY_NE[yoni] ?? yoni;
  return YONI_NE_TO_EN[yoni] ?? yoni;
}

export function localizeGana(gana: Gana, lang?: string): string {
  if (!isEnglishLocale(lang)) return gana;
  return GANA_NE_TO_EN[gana];
}

export function localizeNadi(nadi: Nadi | string, lang?: string): string {
  if (!isEnglishLocale(lang)) return nadi;
  return NADI_NE_TO_EN[nadi as Nadi] ?? nadi;
}

export function localizeNakshatra(row: Pick<NakshatraRow, "ne" | "en">, lang?: string): string {
  if (!isEnglishLocale(lang)) return row.ne;
  return NAKSHATRA_SLUG_TO_EN[row.en] ?? row.en;
}

export function localizeVarga(varga: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return varga;
  return VARGA_NE_TO_EN[varga] ?? varga;
}

const DEITY_NE_TO_EN: Record<string, string> = {
  अश्विनीकुमार: "Ashvini Kumaras",
  "अश्विनी कुमार": "Ashvini Kumaras",
  "अ.क.": "Ashvini Kumaras",
  यम: "Yama",
  अग्नि: "Agni",
  ब्रह्मा: "Brahma",
  ब्रम्हा: "Brahma",
  चन्द्र: "Chandra",
  शिव: "Shiva",
  अदिति: "Aditi",
  बृहस्पति: "Brihaspati",
  वृहस्पति: "Brihaspati",
  सर्प: "Serpent",
  पितर: "Pitrs",
  भग: "Bhaga",
  अर्यमा: "Aryaman",
  सूर्य: "Surya",
  विश्वकर्मा: "Vishvakarma",
  वायु: "Vayu",
  इन्द्राग्नि: "Indra-Agni",
  मित्र: "Mitra",
  इन्द्र: "Indra",
  निर्ऋति: "Nirriti",
  राक्षस: "Rakshasa",
  जल: "Jala",
  विश्वदेव: "Vishvedevas",
  विष्णु: "Vishnu",
  वसु: "Vasu",
  वरुण: "Varuna",
  अजेकपाद: "Ajaikapada",
  अजेकपा: "Ajaikapada",
  अहिर्बुध्न्य: "Ahirbudhnya",
  अहिध्य: "Ahirbudhnya",
  पूषा: "Pusha",
};

const JATI_NE_TO_EN: Record<string, string> = {
  वैश्य: "Vaishya",
  म्लेच्छ: "Mleccha",
  चाण्डाल: "Chandala",
  ब्राह्मण: "Brahmin",
  ब्राम्हण: "Brahmin",
  शूद्र: "Shudra",
  कृषक: "Krishaka (farmer)",
  कूरजाति: "Kurajati",
  करजाति: "Karajati",
  क्षत्रिय: "Kshatriya",
};

const SANJNA_NE_TO_EN: Record<string, string> = {
  लघु: "Laghu / Kshipra",
  उग्र: "Ugra / Krura",
  मिश्र: "Mishra / Sadharana",
  ध्रुव: "Dhruva / Sthira",
  मृदु: "Mridu / Maitri",
  तीक्ष्ण: "Tikshna / Daruna",
  चर: "Chara / Chala",
  "ल.": "Laghu / Kshipra",
  "उ.": "Ugra / Krura",
  "मि.": "Mishra / Sadharana",
  "ध्रु.": "Dhruva / Sthira",
  "मृ.": "Mridu / Maitri",
  "ती.": "Tikshna / Daruna",
  "च.": "Chara / Chala",
  "क्षि.": "Laghu / Kshipra",
  "उ.कू.": "Ugra / Krura",
  "उ.क.": "Ugra / Krura",
  "मि.सा.": "Mishra / Sadharana",
  "धु.स्थि.": "Dhruva / Sthira",
  "ध्रु.स्थि.": "Dhruva / Sthira",
  "धू.स्थि.": "Dhruva / Sthira",
  "म.मै.": "Mridu / Maitri",
  "मु.मै.": "Mridu / Maitri",
  "ती.दा.": "Tikshna / Daruna",
  "च.च.": "Chara / Chala",
  "ल.क्षि.": "Laghu / Kshipra",
};

const SANJNA_FULL_NE: Record<string, string> = {
  लघु: "लघु / क्षिप्र",
  उग्र: "उग्र / क्रूर",
  मिश्र: "मिश्र / साधारण",
  ध्रुव: "ध्रुव / स्थिर",
  मृदु: "मृदु / मैत्री",
  तीक्ष्ण: "तीक्ष्ण / दारुण",
  चर: "चर / चल",
  "ल.": "लघु / क्षिप्र",
  "उ.": "उग्र / क्रूर",
  "मि.": "मिश्र / साधारण",
  "ध्रु.": "ध्रुव / स्थिर",
  "मृ.": "मृदु / मैत्री",
  "ती.": "तीक्ष्ण / दारुण",
  "च.": "चर / चल",
};

const MUKHA_NE_TO_EN: Record<string, string> = {
  तिर्यङ्: "Horizontal",
  तिर्यङ: "Horizontal",
  अधो: "Downward",
  ऊर्ध्व: "Upward",
};

export function localizeDeity(deity: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return deity;
  return DEITY_NE_TO_EN[deity] ?? deity;
}

export function localizeJati(jati: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return jati;
  return JATI_NE_TO_EN[jati] ?? jati;
}

export function localizeSanjna(sanjna: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return sanjna;
  return SANJNA_NE_TO_EN[sanjna] ?? sanjna;
}

export function sanjnaTitle(sanjna: string, lang?: string): string | undefined {
  if (isEnglishLocale(lang)) return SANJNA_NE_TO_EN[sanjna];
  return SANJNA_FULL_NE[sanjna];
}

export function localizeMukha(mukha: string, lang?: string): string {
  if (!isEnglishLocale(lang)) return mukha;
  return MUKHA_NE_TO_EN[mukha] ?? mukha;
}

export function rowMetaFromCharans(charanRashis: string[]) {
  const metas = charanRashis.map((x) => RASHI_META[x]!);
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    lord: uniq(metas.map((m) => m.lord)).join(" / "),
    varna: uniq(metas.map((m) => m.varna)).join(" / "),
    vashya: uniq(metas.map((m) => m.vashya)).join(" / "),
  };
}

function uniquePreserve(xs: string[]): string[] {
  return [...new Set(xs)];
}

/** राशि / स्वामी — e.g. मेष (मंगल) or मेष / वृष (मंगल / शुक्र). */
export function formatRashiSwami(charanRashis: string[], lang?: string): string {
  const rashis = uniquePreserve(charanRashis.map((x) => RASHI_META[x]?.ne ?? x));
  const lords = uniquePreserve(charanRashis.map((x) => RASHI_META[x]!.lord));
  return `${rashis.map((r) => localizeRashi(r, lang)).join(" / ")} (${lords.map((l) => localizeLord(l, lang)).join(" / ")})`;
}

/** राशि वर्ण/वश्य — single: क्षत्रिय / चतुष्पद; split: क्षत्रिय / वैश्य (चतुष्पद). */
export function formatVarnaVashya(charanRashis: string[], lang?: string): string {
  const rashis = uniquePreserve(charanRashis);
  const varnas = uniquePreserve(rashis.map((x) => RASHI_META[x]!.varna));
  const vashyas = uniquePreserve(rashis.map((x) => RASHI_META[x]!.vashya));
  const varnaText = varnas.map((v) => localizeVarna(v, lang)).join(" / ");
  const vashyaText = vashyas.map((v) => localizeVashya(v, lang)).join(" / ");
  if (rashis.length === 1) return `${varnaText} / ${vashyaText}`;
  return `${varnaText} (${vashyaText})`;
}

const SANJNA_SHORT_EN: Record<string, string> = {
  लघु: "Laghu",
  उग्र: "Ugra",
  मिश्र: "Mishra",
  ध्रुव: "Dhruva",
  मृदु: "Mridu",
  तीक्ष्ण: "Tikshna",
  चर: "Chara",
};

/** संज्ञा/मुख — e.g. लघु / तिर्यङ्. */
export function formatSanjnaMukha(sanjna: string, mukha: string, lang?: string): string {
  const s = isEnglishLocale(lang) ? (SANJNA_SHORT_EN[sanjna] ?? localizeSanjna(sanjna, lang)) : sanjna;
  return `${s} / ${localizeMukha(mukha, lang)}`;
}

/** योनि / वैरी योनि — e.g. घोडा / राँगो. */
export function formatYoniPair(yoni: string, vairiYoni: string, lang?: string): string {
  return `${localizeYoni(yoni, lang)} / ${localizeYoni(vairiYoni, lang)}`;
}
