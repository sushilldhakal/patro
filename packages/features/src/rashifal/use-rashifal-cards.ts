/**
 * One rashifal card, drawn by `@vedic-patro/ui/kit/jyotish` RashifalSignCard
 * and RashifalPersonalCard: the header, strength meter, life areas, prediction,
 * lucky cells and the "why this reading" details.
 */
import { useState } from "react";
import type {
  NavataraTone,
  RashifalDayMarker,
  RashifalGocharRow,
  RashifalPeriod,
  RashifalPersonal,
  RashifalSignBlock,
} from "@vedic-patro/api-client";
import { formatBsCivilIsoLong } from "@vedic-patro/domain/calendar/bs-calendar";
import { civilIsoFromDate } from "@vedic-patro/domain/calendar/patro-day";
import { formatPatroCivilDayLabel } from "@vedic-patro/domain/calendar/patro-headline-subtitle";
import { getRashiName } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { toNepaliDigits } from "@vedic-patro/domain/jyotish/rashifal-ui";
import { useLocale } from "@vedic-patro/i18n/react";

export type RashifalLuckyKey = "color" | "number" | "direction" | "time";

type Bilingual<K extends string> = { [P in `${K}_ne` | `${K}_en`]: string };
type Domain = Bilingual<"label"> & { key: NonNullable<RashifalSignBlock["domains"]>[number]["key"]; percent: number; tone?: NavataraTone };
type Component = Bilingual<"label" | "note"> & { key: string; percent: number; tone?: NavataraTone };

/**
 * Best/weak day of a weekly, monthly or yearly window. The server's own BS
 * label wins when it sends one; without it, Nepali still gets a Vikram date
 * from the offline table rather than a bare AD date.
 */
function dayMarkerLabel(marker: RashifalDayMarker, lang: string): string {
  if (lang.slice(0, 2) !== "ne") return marker.date_ad;
  return marker.date_bs ?? formatBsCivilIsoLong(marker.date_ad, lang, (n) => toNepaliDigits(n, lang));
}

/** Dasha end date: the Vikram date in Nepali, the AD label in English. */
function formatDasha(iso: string, lang: string): string {
  const digitFn = (n: number | string) => toNepaliDigits(n, lang);
  try {
    const civilIso = civilIsoFromDate(new Date(iso));
    return lang.slice(0, 2) === "ne" ? formatBsCivilIsoLong(civilIso, lang, digitFn) : formatPatroCivilDayLabel(civilIso, lang, digitFn);
  } catch {
    return iso.slice(0, 10);
  }
}

function useCardBase({
  percent,
  tone,
  stars,
  domains,
  components,
  gochar,
}: {
  percent: number;
  tone?: NavataraTone;
  stars: number;
  domains?: Domain[];
  components?: Component[];
  gochar?: RashifalGocharRow[];
}) {
  const { t, lang } = useLocale();
  const ne = lang === "ne";
  const [open, setOpen] = useState(false);
  const lucky = (key: RashifalLuckyKey, labelKey: string, value: string | null | undefined) =>
    value ? [{ key, label: t(labelKey), value }] : [];
  return {
    t,
    lang,
    ne,
    lucky,
    base: {
      open,
      toggle: () => setOpen((v) => !v),
      stars,
      tone,
      /** Width of the meter, 0–100. */
      percent,
      percentLabel: toNepaliDigits(percent, lang),
      domains: (domains ?? []).map((d) => {
        const label = ne ? d.label_ne : d.label_en;
        return { key: d.key, label, percent: d.percent, tone: d.tone, title: `${label} · ${d.percent}%` };
      }),
      whyLabel: t("rashifal.why_this"),
      components: (components ?? []).map((c) => ({
        key: c.key,
        label: ne ? c.label_ne : c.label_en,
        note: ne ? c.note_ne : c.note_en,
        value: toNepaliDigits(c.percent, lang),
        tone: c.tone,
      })),
      gochar: gochar ?? [],
    },
  };
}

export function useRashifalSignCard({ sign, period }: { sign: RashifalSignBlock; period: RashifalPeriod }) {
  const { t, lang, ne, lucky, base } = useCardBase({
    percent: sign.percent ?? 50,
    tone: sign.tone,
    stars: sign.stars ?? 3,
    domains: sign.domains,
    components: sign.components,
    gochar: sign.gochar,
  });
  const lord = sign.rashi_lord;
  const time = sign.lucky_time;
  const remedy = ne ? sign.remedy_ne : sign.remedy_en;
  return {
    ...base,
    glyph: { name: getRashiName(sign.id, lang), number: sign.id },
    name: ne ? sign.name : `${sign.title_en} · ${sign.name}`,
    sub: sign.syllables_ne,
    grade: ne ? sign.grade_ne : sign.grade_en,
    prediction: ne ? sign.prediction_ne : sign.prediction_en,
    lucky: [
      ...lucky("color", "rashifal.lucky_color", ne ? sign.lucky_color_ne : sign.lucky_color_en),
      ...lucky("number", "rashifal.lucky_number", ne ? sign.lucky_number_ne : sign.lucky_number_en),
      ...lucky("direction", "rashifal.lucky_direction", ne ? sign.lucky_direction_ne : sign.lucky_direction_en),
      ...lucky("time", "rashifal.lucky_time", time?.start_local_time_short ? `${time.start_local_time_short}–${time.end_local_time_short ?? ""}` : null),
    ],
    lordLine: lord
      ? t("rashifal.lord_line", {
          lord: ne ? lord.lord_ne : lord.lord_en,
          house: toNepaliDigits(lord.house, lang),
          sign: ne ? lord.sign_ne : lord.sign_en,
          dignity: ne ? lord.dignity_ne : lord.dignity_en,
        })
      : null,
    windowDays:
      period !== "daily" && sign.best_day && sign.weak_day
        ? t("rashifal.window_days", { best: dayMarkerLabel(sign.best_day, lang), weak: dayMarkerLabel(sign.weak_day, lang) })
        : null,
    remedy: remedy ? `${t("rashifal.remedy")}: ${remedy}` : null,
  };
}

export function useRashifalPersonalCard({ personal }: { personal: RashifalPersonal }) {
  const { t, lang, ne, lucky, base } = useCardBase({
    percent: personal.percent ?? 50,
    tone: personal.tone,
    stars: personal.stars ?? 3,
    domains: personal.domains,
    components: personal.components,
    gochar: personal.gochar,
  });
  const lord = personal.rashi_lord;
  const dasha = personal.dasha;
  const maha = dasha ? (ne ? dasha.mahadasha.lord_ne : dasha.mahadasha.lord_en) : "";
  const antar = dasha ? (ne ? dasha.antardasha.lord_ne : dasha.antardasha.lord_en) : "";
  return {
    ...base,
    /** Leads with the Rashi (Moon sign); the Lagna is named alongside. */
    glyph: { name: getRashiName(personal.moon_sign, lang), number: personal.moon_sign },
    sub: t("rashifal.personal.lagna_line", {
      lagna: ne ? personal.lagna_sign_ne : personal.lagna_sign_en,
      moon: ne ? personal.moon_sign_ne : personal.moon_sign_en,
      sun: ne ? personal.sun_sign_ne : personal.sun_sign_en,
    }),
    dashaLine: dasha ? t("rashifal.personal.dasha_line", { maha, antar }) : null,
    prediction: ne ? personal.prediction_ne : personal.prediction_en,
    lucky: [
      ...lucky("color", "rashifal.lucky_color", ne ? personal.lucky_color_ne : personal.lucky_color_en),
      ...lucky("number", "rashifal.lucky_number", ne ? personal.lucky_number_ne : personal.lucky_number_en),
      ...lucky("direction", "rashifal.lucky_direction", ne ? personal.lucky_direction_ne : personal.lucky_direction_en),
    ],
    lordLine: lord
      ? t("rashifal.personal.lord_line", {
          lord: ne ? lord.lord_ne : lord.lord_en,
          house: toNepaliDigits(lord.house, lang),
          sign: ne ? lord.sign_ne : lord.sign_en,
          dignity: ne ? lord.dignity_ne : lord.dignity_en,
        })
      : null,
    dashaRange: dasha
      ? t("rashifal.personal.dasha_range", {
          maha,
          mahaEnd: formatDasha(dasha.mahadasha.end, lang),
          antar,
          antarEnd: formatDasha(dasha.antardasha.end, lang),
        })
      : null,
  };
}
