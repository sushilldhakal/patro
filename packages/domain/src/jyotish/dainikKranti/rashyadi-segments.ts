import { toNepaliDigits } from "../../panchanga/panchanga-format";
import { GRAHA_KEY_TO_TRANSIT_ABBREV, type RashyadiSegment } from "./rashyadi";

export const LUNAR_MONTH_INITIAL: Record<string, string> = {
  baisakh: "वै.",
  baishakh: "वै.",
  vaisakha: "वै.",
  vaishakha: "वै.",
  jestha: "ज्ये.",
  jyeshtha: "ज्ये.",
  jyestha: "ज्ये.",
  ashadh: "आषा.",
  ashadha: "आषा.",
  asar: "आषा.",
  shrawan: "श्रा.",
  shrawn: "श्रा.",
  shravan: "श्रा.",
  shravana: "श्रा.",
  bhadra: "भा.",
  bhadau: "भा.",
  bhadrapada: "भा.",
  ashwin: "आश्व.",
  ashwina: "आश्व.",
  aswin: "आश्व.",
  kartik: "का.",
  kartika: "का.",
  mangsir: "मार्ग.",
  margashir: "मार्ग.",
  margashirsha: "मार्ग.",
  margasirsa: "मार्ग.",
  poush: "पौ.",
  paush: "पौ.",
  pausha: "पौ.",
  push: "पौ.",
  magh: "माघ.",
  magha: "माघ.",
  falgun: "फा.",
  phalgun: "फा.",
  phalguna: "फा.",
  chaitra: "चै.",
  chait: "चै.",
  chaitya: "चै.",
};

export type PakshaSegmentInfo = { key: string; label: string };

export type RashyadiRangeTables = {
  start: RashyadiSegment | null;
  end: RashyadiSegment | null;
};

export function formatGapashaCode(
  bsDay: number,
  grahaKey: string,
  rashiNo: number,
): string | undefined {
  const abbrev = GRAHA_KEY_TO_TRANSIT_ABBREV[grahaKey];
  if (!abbrev) return undefined;
  return `${toNepaliDigits(bsDay)}${abbrev}${toNepaliDigits(rashiNo)}`;
}
