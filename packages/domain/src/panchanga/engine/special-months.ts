// `/nepal/special-months/{bs_year}`: the BS year's adhik and kshaya lunar months, as
// patro::festivals::special_months_payload and panchanga::lunar_month::special_months_for_gregorian_year make it.
import {
  bsMonth,
  civilFromJdn,
  isoFromJdn,
  jdnFromIso,
  lunarYear,
  observedYear,
  sankrantisInPeriod,
  type PatroObserver,
} from "../../astronomy/lunar-month";
import { masaNe } from "./calendar-blocks";
import { locationBlock, type DayInput } from "./day";
import { BS_MONTH_NAMES, RASHI_NAMES } from "./tables.generated";

type Json = Record<string, unknown>;

function kshayaPossible(o: PatroObserver, year: number): boolean {
  let adhik = 0;
  for (let y = year - 1; y <= year + 1; y += 1) adhik += lunarYear(o.sky, y).months.filter((m) => m.isAdhik).length;
  return adhik >= 2;
}

function kshayaInfo(o: PatroObserver, start: number, end: number): Json | null {
  const s = sankrantisInPeriod(o.sky, start, end);
  if (s.length < 2) return null;
  const kept = BS_MONTH_NAMES[(s[0] + 11) % 12];
  const dropped = BS_MONTH_NAMES[s[0]];
  return {
    is_kshaya: true,
    month_name: kept,
    dropped_month_name: dropped,
    full_name_en: `${kept}–${dropped} Kshaya`,
    full_name_ne: `${masaNe(kept)}–${masaNe(dropped)} क्षय`,
    first_sankranti_rashi: s[0],
    second_sankranti_rashi: s[1],
    first_rashi_name: RASHI_NAMES[s[0]],
    second_rashi_name: RASHI_NAMES[s[1]],
    description: `Kshaya Maas: Sun enters ${RASHI_NAMES[s[0]]} and ${RASHI_NAMES[s[1]]} within this single lunar month`,
  };
}

/** `special_months_for_gregorian_year`: adhik and kshaya months of one lunar year at the observer. */
export function specialMonthsForGregorianYear(o: PatroObserver, gregorianYear: number): { adhik_months: Json[]; kshaya_maas: Json } {
  const year = observedYear(o, gregorianYear);
  const adhikMonths: Json[] = [];
  year.year.months.forEach((m, i) => {
    if (!m.isAdhik) return;
    const d = year.days[i];
    adhikMonths.push({
      has_adhik_maas: true,
      month_name: m.name,
      full_name_en: `Adhik ${m.name}`,
      full_name_ne: `अधिक ${masaNe(m.name)}`,
      start_date: isoFromJdn(d.first),
      end_date: isoFromJdn(d.last),
      purnima_date: isoFromJdn(d.purnima),
    });
  });
  let kshaya: Json = { is_kshaya: false };
  if (kshayaPossible(o, gregorianYear)) {
    for (let i = 0; i < year.year.months.length; i += 1) {
      const m = year.year.months[i];
      const info = kshayaInfo(o, m.startAausi, m.endAausi);
      if (!info) continue;
      info.start_date = isoFromJdn(year.days[i].first);
      info.end_date = isoFromJdn(year.days[i].last);
      info.adhik_months = adhikMonths.map((a) => ({
        month_name: a.month_name,
        full_name_en: a.full_name_en,
        full_name_ne: a.full_name_ne,
        start_date: a.start_date,
        end_date: a.end_date,
      }));
      kshaya = info;
      break;
    }
  }
  return { adhik_months: adhikMonths, kshaya_maas: kshaya };
}

/** The `/nepal/special-months/{bs_year}` payload, or null when the device cannot name the year. */
export function specialMonthsPayload(sky: PatroObserver["sky"], place: Omit<DayInput, "year" | "month" | "day">, bsYear: number): Json | null {
  const first = bsMonth(bsYear, 1);
  const next = bsMonth(bsYear + 1, 1);
  if (!first || !next) return null;
  const [start, end] = [first.first, next.first - 1];
  const o: PatroObserver = { sky, latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone };
  const byStart = new Map<string, Json>();
  let kshaya: Json = { is_kshaya: false };
  for (let g = civilFromJdn(start).year - 1; g <= civilFromJdn(end).year; g += 1) {
    const special = specialMonthsForGregorianYear(o, g);
    for (const month of special.adhik_months) {
      const day = month.start_date as string;
      const jdn = jdnFromIso(day)!;
      if (start <= jdn && jdn <= end && !byStart.has(day)) byStart.set(day, month);
    }
    const k = special.kshaya_maas;
    if (k.is_kshaya === true) {
      const jdn = jdnFromIso(k.start_date as string)!;
      if (start <= jdn && jdn <= end) kshaya = k;
    }
  }
  const adhikMonths = [...byStart.keys()].sort().map((k) => byStart.get(k)!);
  return {
    bs_year: bsYear,
    gregorian_range: { start: isoFromJdn(start), end: isoFromJdn(end) },
    location: locationBlock({ ...place, year: 0, month: 0, day: 0 }),
    adhik_maas: adhikMonths[0] ?? { has_adhik_maas: false },
    adhik_months: adhikMonths,
    kshaya_maas: kshaya,
  };
}

