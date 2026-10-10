import type { CalendarDay, GocharGraha, GocharIngressEvent, PlanetInfo } from "@/lib/api";
import {
  ingressEventBsDayForMonth,
  ingressEventRowDateAd,
  type IngressBrowseMonth,
} from "@/lib/dainikKranti/ingress-day-match";
import { rashiNoFromGraha } from "@/lib/dainikKranti/gochar-display";
import { GOCHAR_RASHI_TO_HOUSE } from "@/lib/kundali/north-indian-layout";
import { rashiNumberFromName } from "@/lib/rashi-i18n";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { GRAHA_KEY_TO_TRANSIT_ABBREV } from "./rashyadi";

function isMoonIngress(ev: GocharIngressEvent): boolean {
  const g = (ev.graha ?? "").toLowerCase();
  if (g === "moon" || g === "chandra") return true;
  const ne = ev.graha_ne ?? "";
  return ne.includes("चन्द्र") || ne.includes("चंद्र");
}

function ingressDayInRange(
  ev: GocharIngressEvent,
  rangeDays: CalendarDay[],
  allDays: CalendarDay[],
  browse?: IngressBrowseMonth,
): CalendarDay | undefined {
  if (browse) {
    const bsDay = ingressEventBsDayForMonth(
      ev,
      browse.year,
      browse.month,
      allDays,
    );
    if (bsDay == null) return undefined;
    return rangeDays.find((d) => d.day === bsDay);
  }
  const dateAd = ingressEventRowDateAd(ev, allDays);
  if (!dateAd) return undefined;
  return rangeDays.find((d) => d.date_ad === dateAd);
}

function rashiNoFromIngress(ev: GocharIngressEvent): number | undefined {
  return (
    rashiNumberFromName(ev.to_rashi) ??
    rashiNumberFromName(ev.to_rashi_ne)
  );
}

export function houseFromRashiNo(rashiNo: number): number | undefined {
  if (rashiNo < 1 || rashiNo > 12) return undefined;
  return GOCHAR_RASHI_TO_HOUSE[rashiNo];
}

function houseFromPlanetInfo(info?: PlanetInfo | string): number | undefined {
  if (!info || typeof info === "string") return undefined;
  const rashi =
    info.rashi_no ??
    (typeof info.rashi === "number" ? info.rashi : undefined);
  if (rashi == null) return undefined;
  return houseFromRashiNo(rashi);
}

function houseFromGraha(g: GocharGraha): number | undefined {
  const rashi = rashiNoFromGraha(g);
  if (rashi == null) return undefined;
  return houseFromRashiNo(rashi);
}

function nepaliHouse(n: number): string {
  return toNepaliDigits(n);
}

function nepaliHousePadded2(n: number): string {
  const s = toNepaliDigits(n);
  return s.length >= 2 ? s : `०${s}`;
}

/** सूर्य आरम्भ — सू०७ */
function formatSunStatic(house: number): string {
  return `सू${nepaliHousePadded2(house)}`;
}

/** सूर्य गोचर — १५सू८ */
function formatSunDated(bsDay: number, house: number): string {
  return `${toNepaliDigits(bsDay)}सू${nepaliHouse(house)}`;
}

/** मंगल/शनि आदि स्थिर — म.६ */
function formatGrahaStatic(grahaKey: string, house: number): string {
  const ab = GRAHA_KEY_TO_TRANSIT_ABBREV[grahaKey] ?? grahaKey;
  return `${ab}.${nepaliHouse(house)}`;
}

/** मंगल/शनि गोचर — १८म.७ */
function formatGrahaDated(bsDay: number, grahaKey: string, house: number): string {
  const ab = GRAHA_KEY_TO_TRANSIT_ABBREV[grahaKey] ?? grahaKey;
  return `${toNepaliDigits(bsDay)}${ab}.${nepaliHouse(house)}`;
}

/** राहु/केतु स्थिर — रा.९के.३ */
function formatRahuKetuStatic(rahuHouse: number, ketuHouse: number): string {
  return `रा.${nepaliHouse(rahuHouse)}के.${nepaliHouse(ketuHouse)}`;
}

/** राहु/केतु गोचर — १६रा.८ के.२ */
function formatRahuKetuDated(bsDay: number, rahuHouse: number, ketuHouse: number): string {
  return `${toNepaliDigits(bsDay)}रा.${nepaliHouse(rahuHouse)} के.${nepaliHouse(ketuHouse)}`;
}

type DatedIngress = {
  bsDay: number;
  graha: string;
  house: number;
  sortKey: string;
};

function collectDatedIngress(
  rangeDays: CalendarDay[],
  allDays: CalendarDay[],
  ingressEvents: GocharIngressEvent[],
  browse?: IngressBrowseMonth,
): DatedIngress[] {
  const out: DatedIngress[] = [];

  for (const ev of ingressEvents) {
    if (ev.level !== "rashi" || isMoonIngress(ev)) continue;
    if (ev.graha === "rahu" || ev.graha === "ketu") continue;
    const day = ingressDayInRange(ev, rangeDays, allDays, browse);
    const rNo = rashiNoFromIngress(ev);
    const house = rNo != null ? houseFromRashiNo(rNo) : undefined;
    if (!day || house == null || !ev.graha) continue;
    const dateAd = day.date_ad;
    out.push({
      bsDay: day.day,
      graha: ev.graha,
      house,
      sortKey: ev.entry_time_utc ?? `${dateAd}T12:00`,
    });
  }

  out.sort((a, b) => {
    if (a.bsDay !== b.bsDay) return a.bsDay - b.bsDay;
    return a.sortKey.localeCompare(b.sortKey);
  });
  return out;
}

function collectRahuKetuDated(
  rangeDays: CalendarDay[],
  allDays: CalendarDay[],
  ingressEvents: GocharIngressEvent[],
  browse?: IngressBrowseMonth,
): { bsDay: number; rahuHouse: number; ketuHouse: number; sortKey: string }[] {
  const byDate = new Map<string, { rahu?: number; ketu?: number; sortKey: string; bsDay: number }>();

  for (const ev of ingressEvents) {
    if (ev.level !== "rashi" || isMoonIngress(ev)) continue;
    if (ev.graha !== "rahu" && ev.graha !== "ketu") continue;
    const day = ingressDayInRange(ev, rangeDays, allDays, browse);
    const rNo = rashiNoFromIngress(ev);
    const house = rNo != null ? houseFromRashiNo(rNo) : undefined;
    if (!day || house == null) continue;
    const dateAd = day.date_ad;
    const slot = byDate.get(dateAd) ?? {
      bsDay: day.day,
      sortKey: ev.entry_time_utc ?? `${dateAd}T12:00`,
    };
    if (ev.graha === "rahu") slot.rahu = house;
    else slot.ketu = house;
    byDate.set(dateAd, slot);
  }

  return [...byDate.values()]
    .filter((x) => x.rahu != null && x.ketu != null)
    .map((x) => ({
      bsDay: x.bsDay,
      rahuHouse: x.rahu!,
      ketuHouse: x.ketu!,
      sortKey: x.sortKey,
    }))
    .sort((a, b) => {
      if (a.bsDay !== b.bsDay) return a.bsDay - b.bsDay;
      return a.sortKey.localeCompare(b.sortKey);
    });
}

/**
 * पापाशाः — पक्ष आरम्भको स्थिर घर-स्थिति।
 * प्रदर्शन: पापाशाःसू०७, म.६, श.१०, रा.९के.३
 */
export function buildPapanshaDisplayLine(anchorDay: CalendarDay): string {
  const planets = anchorDay.panchanga?.planets;
  const parts: string[] = [];

  const sunHouse = houseFromPlanetInfo(planets?.sun);
  if (sunHouse != null) parts.push(formatSunStatic(sunHouse));

  const marsHouse = houseFromPlanetInfo(planets?.mars);
  if (marsHouse != null) parts.push(formatGrahaStatic("mars", marsHouse));

  const satHouse = houseFromPlanetInfo(planets?.saturn);
  if (satHouse != null) parts.push(formatGrahaStatic("saturn", satHouse));

  const rahuHouse = houseFromPlanetInfo(planets?.rahu);
  const ketuHouse = houseFromPlanetInfo(planets?.ketu);
  if (rahuHouse != null && ketuHouse != null) {
    parts.push(formatRahuKetuStatic(rahuHouse, ketuHouse));
  }

  if (parts.length === 0) return "";
  return `पापाशाः${parts[0]}${parts.length > 1 ? `, ${parts.slice(1).join(", ")}` : ""}`;
}

/**
 * गा.पाशाः — पक्षभित्रका मात्र गोचर (दिन सहित)।
 * प्रदर्शन: गा.पाशाः१५सू८, १८म.७, १६रा.८ के.२
 */
export function buildGapanshaLine(
  rangeDays: CalendarDay[],
  allDays: CalendarDay[],
  ingressEvents: GocharIngressEvent[],
  browse?: IngressBrowseMonth,
): string {
  if (rangeDays.length === 0) return "";

  type Item = { bsDay: number; sortKey: string; text: string };
  const items: Item[] = [];

  for (const ev of collectDatedIngress(rangeDays, allDays, ingressEvents, browse)) {
    const text =
      ev.graha === "sun"
        ? formatSunDated(ev.bsDay, ev.house)
        : formatGrahaDated(ev.bsDay, ev.graha, ev.house);
    items.push({ bsDay: ev.bsDay, sortKey: ev.sortKey, text });
  }
  for (const ev of collectRahuKetuDated(rangeDays, allDays, ingressEvents, browse)) {
    items.push({
      bsDay: ev.bsDay,
      sortKey: ev.sortKey,
      text: formatRahuKetuDated(ev.bsDay, ev.rahuHouse, ev.ketuHouse),
    });
  }
  items.sort((a, b) => {
    if (a.bsDay !== b.bsDay) return a.bsDay - b.bsDay;
    return a.sortKey.localeCompare(b.sortKey);
  });

  const line = items.map((i) => i.text).join(", ");
  return line ? `गा.पाशाः${line}` : "";
}

export function buildGapanshaCodes(
  rangeDays: CalendarDay[],
  allDays: CalendarDay[],
  ingressEvents: GocharIngressEvent[],
): string[] {
  const line = buildGapanshaLine(rangeDays, allDays, ingressEvents);
  if (!line) return [];
  const body = line.replace(/^गा\.पाशाः/, "");
  return body.split(/,\s*/).filter(Boolean);
}

export function buildPapanshaLineFromGrahas(
  grahas: Array<GocharGraha & { key: string }>,
): string {
  const mars = grahas.find((g) => g.key === "mars");
  const saturn = grahas.find((g) => g.key === "saturn");
  const rahu = grahas.find((g) => g.key === "rahu");
  const ketu = grahas.find((g) => g.key === "ketu");
  const parts: string[] = [];
  const mh = mars ? houseFromGraha(mars) : undefined;
  const sh = saturn ? houseFromGraha(saturn) : undefined;
  const rh = rahu ? houseFromGraha(rahu) : undefined;
  const kh = ketu ? houseFromGraha(ketu) : undefined;
  if (mh != null) parts.push(formatGrahaStatic("mars", mh));
  if (sh != null) parts.push(formatGrahaStatic("saturn", sh));
  if (rh != null && kh != null) parts.push(formatRahuKetuStatic(rh, kh));
  return parts.join(", ");
}
