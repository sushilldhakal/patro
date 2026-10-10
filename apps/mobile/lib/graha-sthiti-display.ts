import type { GrahaSthitiRow } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { getRashiName } from "@/lib/rashi-i18n";
import { NAK_LORD_EN } from "@/lib/wheel-locale";

export function siderealRashiNumber(fullDegree: number): number {
  const lon = ((fullDegree % 360) + 360) % 360;
  return Math.floor(lon / 30) + 1;
}

export function grahaKeyFromLordNe(ne: string): GrahaKey | null {
  const trimmed = ne.trim();
  if (!trimmed) return null;
  for (const key of Object.keys(GRAHA_NAME) as GrahaKey[]) {
    if (GRAHA_NAME[key].ne === trimmed) return key;
  }
  for (const [neLord, enLord] of Object.entries(NAK_LORD_EN)) {
    if (neLord === trimmed) {
      for (const key of Object.keys(GRAHA_NAME) as GrahaKey[]) {
        if (GRAHA_NAME[key].en === enLord) return key;
      }
    }
  }
  return null;
}

function dmsParts(deg: number): { deg: number; minute: number; sec: number } {
  const d = deg % 30;
  const whole = Math.floor(d);
  const mFloat = (d - whole) * 60;
  const minute = Math.floor(mFloat);
  let sec = Math.round((mFloat - minute) * 60);
  let m = minute;
  let h = whole;
  if (sec >= 60) {
    sec -= 60;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    h += 1;
  }
  return { deg: h, minute: m, sec };
}

/** `21° Virgo 53′ 14″` from sidereal longitude. */
export function formatRekhamshaEn(fullDegree: number): string {
  const lon = ((fullDegree % 360) + 360) % 360;
  const rashiIdx = Math.floor(lon / 30) + 1;
  const { deg, minute, sec } = dmsParts(lon);
  const rashi = getRashiName(rashiIdx, "en");
  return `${String(deg).padStart(2, "0")}° ${rashi} ${String(minute).padStart(2, "0")}′ ${String(sec).padStart(2, "0")}″`;
}

/** `04° N 45′ 02″` from signed ecliptic latitude. */
export function formatSharaEn(sharaDeg: number): string {
  const hemi = sharaDeg >= 0 ? "N" : "S";
  const { deg, minute, sec } = dmsParts(Math.abs(sharaDeg));
  return `${String(deg).padStart(2, "0")}° ${hemi} ${String(minute).padStart(2, "0")}′ ${String(sec).padStart(2, "0")}″`;
}

export function grahaLordEn(ne: string): string {
  return NAK_LORD_EN[ne] ?? ne;
}

export function grahaSthitiName(row: GrahaSthitiRow, lang: string): string {
  if (row.graha === "lagna") {
    return lang === "en" ? "Ascendant" : row.name_ne;
  }
  const key = row.graha as GrahaKey;
  if (lang === "en") {
    return GRAHA_NAME[key]?.en ?? row.name_vedic ?? row.name_ne;
  }
  return row.name_ne;
}

export function grahaSthitiRekhamsha(row: GrahaSthitiRow, lang: string): string {
  return lang === "en" ? formatRekhamshaEn(row.full_degree) : row.rekhamsha;
}

export function grahaSthitiShara(row: GrahaSthitiRow, lang: string): string {
  if (lang === "en") return row.shara_deg != null ? formatSharaEn(row.shara_deg) : "—";
  return row.shara ?? "—";
}

export function grahaSthitiNakshatra(row: GrahaSthitiRow, lang: string): string {
  return lang === "en" ? row.nakshatra : row.nakshatra_ne;
}

export function grahaSthitiLord(row: GrahaSthitiRow, lang: string): string {
  const ne = row.nakshatra_lord_ne ?? "";
  return lang === "en" ? grahaLordEn(ne) : ne;
}

export function grahaSthitiSubLord(row: GrahaSthitiRow, lang: string): string {
  const ne = row.sub_lord_ne ?? "";
  return lang === "en" ? grahaLordEn(ne) : ne;
}
