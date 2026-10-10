import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import {
  formatAngaTransition,
  formatClockNepali,
  type AngaDetail,
  formatMonthMoonEventDisplay,
  getMoonriseDisplay,
  getPanchangaDetail,
  getRituDisplay,
  getRituSeason,
  getSunriseDisplay,
  getSunsetDisplay,
} from "@vedic-patro/domain/panchanga-format";
import { pickLocale } from "@vedic-patro/domain/locale";

export type PanchangaDetailCell = {
  label: string;
  value?: string;
  hint?: string;
  wide?: boolean;
  mono?: boolean;
};

export function buildPanchangaDetailCells(
  p: PanchangaDay,
  lang: string,
  selectedDay?: CalendarDay | null,
  labels?: {
    sunriseSunset: string;
    moonrise: string;
    ritu: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    dash: string;
  },
): PanchangaDetailCell[] {
  const detail = getPanchangaDetail(p);
  const nakshatra = detail?.nakshatra ?? p.nakshatra;
  const yoga = detail?.yoga ?? p.yoga;
  const karana = detail?.karana ?? p.karana;

  const angaName = (anga?: AngaDetail | null) =>
    pickLocale(lang, anga?.name_ne ?? anga?.name, anga?.name ?? anga?.name_ne);

  const sunrise =
    getSunriseDisplay(p, lang) ??
    (selectedDay?.sunrise ? formatClockNepali(selectedDay.sunrise, lang) : undefined);
  const sunset =
    getSunsetDisplay(p, lang) ??
    (selectedDay?.sunset ? formatClockNepali(selectedDay.sunset, lang) : undefined);
  const moonrise =
    getMoonriseDisplay(p, lang) ??
    (selectedDay ? formatMonthMoonEventDisplay(selectedDay, "moonrise", lang) : undefined);

  const L = labels ?? {
    sunriseSunset: "सूर्योदय / सूर्यास्त",
    moonrise: "चन्द्रोदय",
    ritu: "ऋतु",
    nakshatra: "नक्षत्र",
    yoga: "योग",
    karana: "करण",
    dash: "—",
  };

  return [
    {
      label: L.sunriseSunset,
      value: sunrise && sunset ? `${sunrise} / ${sunset}` : undefined,
      mono: true,
    },
    { label: L.moonrise, value: moonrise ?? L.dash, mono: true },
    { label: L.ritu, value: getRituDisplay(p, lang), hint: getRituSeason(p, lang) },
    {
      label: L.nakshatra,
      value: angaName(nakshatra),
      hint: formatAngaTransition(nakshatra, lang),
    },
    {
      label: L.yoga,
      value: angaName(yoga),
      hint: formatAngaTransition(yoga, lang),
    },
    {
      label: L.karana,
      value: angaName(karana),
      hint: formatAngaTransition(karana, lang),
    },
  ];
}
