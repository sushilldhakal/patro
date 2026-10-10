import type { CalendarDay, PanchangaDay } from "@/lib/api";
import { getPanchangaDetail } from "@/lib/panchanga-format";

const TITHI_BASE = [
  "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी",
  "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी",
] as const;

const TITHI_BASE_EN = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
] as const;

export interface WheelTithi {
  ne: string;
  en: string;
  paksha: string;
  pakshaEn: string;
  moon?: "full" | "new";
}

export const WHEEL_TITHIS: WheelTithi[] = (() => {
  const out: WheelTithi[] = [];
  TITHI_BASE.forEach((ne, i) =>
    out.push({ ne, en: TITHI_BASE_EN[i]!, paksha: "शुक्ल पक्ष", pakshaEn: "Shukla" })
  );
  out.push({ ne: "पूर्णिमा", en: "Purnima", paksha: "शुक्ल पक्ष", pakshaEn: "Shukla", moon: "full" });
  TITHI_BASE.forEach((ne, i) =>
    out.push({ ne, en: TITHI_BASE_EN[i]!, paksha: "कृष्ण पक्ष", pakshaEn: "Krishna" })
  );
  out.push({ ne: "औंसी", en: "Aunsi", paksha: "कृष्ण पक्ष", pakshaEn: "Krishna", moon: "new" });
  return out;
})();

export const KAR_MOV = ["बव", "बालव", "कौलव", "तैतिल", "गर", "वणिज", "विष्टि"] as const;

export const KAR_MOV_COLOR: Record<string, string> = {
  बव: "#e6b84e",
  बालव: "#d2b35c",
  कौलव: "#bcbb6c",
  तैतिल: "#9caa72",
  गर: "#8fa37e",
  वणिज: "#6f9a92",
  विष्टि: "#5286a0",
};

export const KAR_FIX_COLOR: Record<string, string> = {
  शकुनि: "#a23351",
  चतुष्पद: "#c14d72",
  नाग: "#d76d92",
  किंस्तुघ्न: "#e3a7c0",
};

export const KAR_FIX_NAMES = ["शकुनि", "चतुष्पद", "नाग", "किंस्तुघ्न"] as const;

export const KARANA_EN: Record<string, string> = {
  बव: "Bava",
  बालव: "Balava",
  कौलव: "Kaulava",
  तैतिल: "Taitila",
  गर: "Gara",
  वणिज: "Vanija",
  विष्टि: "Vishti",
  शकुनि: "Shakuni",
  चतुष्पद: "Chatushpada",
  नाग: "Naga",
  किंस्तुघ्न: "Kimstughna",
};

export interface KaranaEntry {
  ne: string;
  en: string;
  fixed: boolean;
}

export const KARANA_SEQ: KaranaEntry[] = (() => {
  const out: KaranaEntry[] = [];
  const mk = (ne: string, fixed: boolean): KaranaEntry => ({ ne, en: KARANA_EN[ne] ?? ne, fixed });
  for (let k = 0; k < 60; k++) {
    if (k === 0) out.push(mk("किंस्तुघ्न", true));
    else if (k >= 57) out.push(mk(KAR_FIX_NAMES[k - 57]!, true));
    else out.push(mk(KAR_MOV[(k - 1) % 7]!, false));
  }
  return out;
})();

export function karanaColor(k: KaranaEntry): string {
  return k.fixed ? (KAR_FIX_COLOR[k.ne] ?? "#a23351") : (KAR_MOV_COLOR[k.ne] ?? "#e6b84e");
}

export function tithiNum(idx: number): number {
  return idx < 15 ? idx + 1 : idx - 14;
}

export function tithiPaksha(idx: number): string {
  return idx < 15 ? "शुक्ल पक्ष" : "कृष्ण पक्ष";
}

export function tithiPakshaEn(idx: number): string {
  return idx < 15 ? "Shukla Paksha" : "Krishna Paksha";
}

/** Tithi band index 0–29 from moon–sun elongation (degrees). */
export function tithiIndexFromElongation(E: number): number {
  return Math.floor((((E % 360) + 360) % 360) / 12);
}

/** Map moon–sun elongation E to wheel longitude (0° Aaushi at bottom). */
export function mapElongation(E: number): number {
  const e = ((E % 360) + 360) % 360;
  return e <= 180 ? 180 - e : 540 - e;
}

export function moonIllumination(E: number): number {
  return Math.round(((1 - Math.cos((E * Math.PI) / 180)) / 2) * 100);
}

function normalizeTithiName(name?: string | null): string {
  if (!name) return "";
  return name
    .replace(/^शुक्ल\s*/i, "")
    .replace(/^कृष्ण\s*/i, "")
    .replace(/\s*पक्ष\s*/i, "")
    .trim();
}

function isKrishnaPaksha(p: PanchangaDay): boolean {
  const detail = getPanchangaDetail(p);
  const paksha = detail?.paksha ?? p.paksha;
  const label =
    typeof paksha === "object" && paksha !== null
      ? String((paksha as { name_ne?: string; name?: string }).name_ne ??
          (paksha as { name?: string }).name ??
          "")
      : String(paksha ?? "");
  return /कृष्ण|krishna/i.test(label);
}

export function tithiIndexFromPanchanga(p: PanchangaDay): number {
  const detail = getPanchangaDetail(p);
  const tithi = detail?.tithi ?? p.tithi;
  const raw =
    typeof tithi === "object" && tithi !== null
      ? ((tithi as { name_ne?: string; name?: string }).name_ne ??
        (tithi as { name?: string }).name)
      : undefined;
  const nameNe = normalizeTithiName(raw);

  if (/पूर्णिमा|purnima/i.test(nameNe)) return 14;
  if (/औंसी|औंसी|aunsi|Aaushi/i.test(nameNe)) return 29;

  const krishna = isKrishnaPaksha(p);
  const rangeStart = krishna ? 15 : 0;
  const rangeEnd = krishna ? 29 : 14;

  for (let i = rangeStart; i < rangeEnd; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe) return i;
  }

  for (let i = 0; i < 30; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe) return i;
  }

  return krishna ? 15 : 0;
}

function calendarDayKrishna(day: CalendarDay): boolean {
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return true;
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return false;
  return /कृष्ण|krishna/i.test(day.paksha_ne ?? day.paksha ?? "");
}

/** Wheel tithi index 0–29 from a month-grid {@link CalendarDay}. */
export function tithiIndexFromCalendarDay(day: CalendarDay): number | undefined {
  const nameNe = normalizeTithiName(day.tithi_ne ?? day.tithi);
  if (!nameNe) return undefined;

  if (/पूर्णिमा|purnima/i.test(nameNe)) return 14;
  if (/औंसी|aunsi|aaushi/i.test(nameNe)) return 29;

  const krishna = calendarDayKrishna(day);
  const rangeStart = krishna ? 15 : 0;
  const rangeEnd = krishna ? 29 : 14;

  for (let i = rangeStart; i < rangeEnd; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe) return i;
  }

  const nameEn = normalizeTithiName(day.tithi);
  for (let i = rangeStart; i < rangeEnd; i++) {
    if (WHEEL_TITHIS[i]!.en.toLowerCase() === nameEn.toLowerCase()) return i;
  }

  for (let i = 0; i < 30; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe || WHEEL_TITHIS[i]!.en.toLowerCase() === nameEn.toLowerCase()) {
      return i;
    }
  }

  return undefined;
}

/** Wheel tithi index 0–29 from a tithi element-page span (display_number + paksha). */
export function tithiIndexFromElementSpan(span: {
  number: number;
  name?: string;
  name_ne?: string;
  paksha?: string;
}): number {
  const nameNe = normalizeTithiName(span.name_ne ?? span.name);
  if (/पूर्णिमा|purnima/i.test(nameNe)) return 14;
  if (/औंसी|aunsi|aaushi/i.test(nameNe)) return 29;

  const krishna =
    span.paksha === "krishna" ||
    /कृष्ण|krishna/i.test(span.paksha ?? "") ||
    /कृष्ण|krishna/i.test(nameNe);

  const n = span.number;
  if (n >= 1 && n <= 15) {
    return krishna ? 14 + n : n - 1;
  }

  for (let i = 0; i < 30; i++) {
    if (WHEEL_TITHIS[i]!.ne === nameNe) return i;
  }
  return krishna ? 15 : 0;
}

/** 27 yoga names in Nepali, index 0 = Vishkambha, anchored at ecliptic 0°. */
export const WHEEL_YOGAS = [
  "विष्कम्भ", "प्रीति", "आयुष्मान्", "सौभाग्य", "शोभन",
  "अतिगण्ड", "सुकर्मा", "धृति", "शूल", "गण्ड",
  "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र",
  "सिद्धि", "व्यतीपात", "वरियान्", "परिघ", "शिव",
  "सिद्ध", "साध्य", "शुभ", "शुक्ल", "ब्रह्म",
  "इन्द्र", "वैधृति",
] as const;
