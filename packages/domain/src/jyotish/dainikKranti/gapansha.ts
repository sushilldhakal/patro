import { GOCHAR_RASHI_TO_HOUSE } from "../kundali/north-indian-layout";
import { toNepaliDigits } from "../../panchanga/panchanga-format";
import { GRAHA_KEY_TO_TRANSIT_ABBREV } from "./rashyadi";

export function houseFromRashiNo(rashiNo: number): number | undefined {
  if (rashiNo < 1 || rashiNo > 12) return undefined;
  return GOCHAR_RASHI_TO_HOUSE[rashiNo];
}

function nepaliHouse(n: number): string {
  return toNepaliDigits(n);
}

function nepaliHousePadded2(n: number): string {
  const s = toNepaliDigits(n);
  return s.length >= 2 ? s : `०${s}`;
}

/** सूर्य आरम्भ — सू०७ */
export function formatSunStatic(house: number): string {
  return `सू${nepaliHousePadded2(house)}`;
}

/** सूर्य गोचर — १५सू८ */
export function formatSunDated(bsDay: number, house: number): string {
  return `${toNepaliDigits(bsDay)}सू${nepaliHouse(house)}`;
}

/** मंगल/शनि आदि स्थिर — म.६ */
export function formatGrahaStatic(grahaKey: string, house: number): string {
  const ab = GRAHA_KEY_TO_TRANSIT_ABBREV[grahaKey] ?? grahaKey;
  return `${ab}.${nepaliHouse(house)}`;
}

/** मंगल/शनि गोचर — १८म.७ */
export function formatGrahaDated(bsDay: number, grahaKey: string, house: number): string {
  const ab = GRAHA_KEY_TO_TRANSIT_ABBREV[grahaKey] ?? grahaKey;
  return `${toNepaliDigits(bsDay)}${ab}.${nepaliHouse(house)}`;
}

/** राहु/केतु स्थिर — रा.९के.३ */
export function formatRahuKetuStatic(rahuHouse: number, ketuHouse: number): string {
  return `रा.${nepaliHouse(rahuHouse)}के.${nepaliHouse(ketuHouse)}`;
}

/** राहु/केतु गोचर — १६रा.८ के.२ */
export function formatRahuKetuDated(bsDay: number, rahuHouse: number, ketuHouse: number): string {
  return `${toNepaliDigits(bsDay)}रा.${nepaliHouse(rahuHouse)} के.${nepaliHouse(ketuHouse)}`;
}

export type DatedIngress = {
  bsDay: number;
  graha: string;
  house: number;
  sortKey: string;
};
