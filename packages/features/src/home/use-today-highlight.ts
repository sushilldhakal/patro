/**
 * The selected day's highlight on the home page, shared by the website's and
 * the app's `components/home/TodayHighlightCard.tsx`: the big date, month and
 * weekday, the cross-era and Nepal Sambat lines, the festival or tithi title,
 * the moon phase, the sunrise/sunset, and — on Dashain, Tihar and the other
 * ritual festivals — each rite's sait at the selected location.
 */
import { useMemo } from "react";
import type { CalendarDay, PanchangaDay } from "@vedic-patro/api-client";
import { AD_MONTH_NAMES, AD_MONTH_NAMES_NE, BS_MONTH_NAMES, BS_MONTHS_NE, adToBS } from "@vedic-patro/domain/bs-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import {
  daysDiffFromAd,
  formatClockNepali,
  formatNepalSambatDisplay,
  formatPakshaLabel,
  formatTimeShort,
  getSunrise,
  getSunset,
} from "@vedic-patro/domain/panchanga-format";
import { civilIsoWeekday, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { formatPatroDayCrossEraSubtitle, patroHeadlineDigits } from "@vedic-patro/domain/patro-headline-subtitle";
import { tithiIndexFromCalendarDay, tithiIndexFromPanchanga } from "@vedic-patro/domain/tithi-wheel-data";
import { useLocale } from "@vedic-patro/i18n/react";
import { lazyList } from "@vedic-patro/i18n/runtime";

const WEEKDAY_NE = lazyList("ne", "ui.home.x_3d1c9c30");
const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
/** "paksha" in Devanagari, stripped from the paksha label. */
const PAKSHA_WORD = /\s*\u092A\u0915\u094D\u0937/g; // copy-ok

function moonPhaseKey(index: number): string {
  if (index === 14) return "ui.learn.full_moon";
  if (index === 29) return "ui.learn.new_moon";
  if (index >= 6 && index <= 8) return "ui.home.waxing_half_moon";
  if (index >= 21 && index <= 23) return "ui.home.waning_half_moon";
  return index < 14 ? "ui.home.waxing_moon" : "ui.home.waning_moon";
}

// Literal keys, not `ui.home.sait_ritual_${ritual}`: the website's i18n bundle keeps
// only the `ui.*` keys that appear as literals in its source.
const SAIT_RITUAL_KEYS: Record<string, string> = {
  ghatasthapana: "ui.home.sait_ritual_ghatasthapana",
  fulpati: "ui.home.sait_ritual_fulpati",
  "dashain-tika": "ui.home.sait_ritual_dashain_tika",
  "laxmi-puja": "ui.home.sait_ritual_laxmi_puja",
  "bhai-tika": "ui.home.sait_ritual_bhai_tika",
  vivah: "ui.home.sait_ritual_vivah",
  bratabandha: "ui.home.sait_ritual_bratabandha",
  "griha-pravesh": "ui.home.sait_ritual_griha_pravesh",
};
const SAIT_DIRECTION_KEYS: Record<string, string> = {
  east: "ui.home.sait_dir_east",
  south: "ui.home.sait_dir_south",
  west: "ui.home.sait_dir_west",
  north: "ui.home.sait_dir_north",
};

/** One rite on the card: its clock times, one per lagna stretch. */
export type SaitRow = {
  key: string;
  label: string;
  times: Array<{ key: string; time: string; detail: string }>;
  /** Tika rites: the direction to face (Chandra Vasa). */
  facing?: string;
};

export function useTodayHighlight({
  selectedDay,
  selectedAdDate,
  todayAd,
  isAdCalendar,
  year,
  month,
  p,
}: {
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  todayAd: string;
  isAdCalendar: boolean;
  /** Browsed month (BS month number, or AD month in Gregorian mode) and year. */
  year: number;
  month: number;
  p?: PanchangaDay;
}) {
  const { t, lang, digits } = useLocale();
  const english = lang === "en";
  const isToday = selectedAdDate === todayAd;
  const daysAway = isToday ? 0 : daysDiffFromAd(todayAd, selectedAdDate);

  const fallbackBs = useMemo(() => {
    try {
      return adToBS(parseCivilIsoToDate(selectedAdDate));
    } catch {
      return null;
    }
  }, [selectedAdDate]);

  const vikram = p?.date_parts?.vikram;
  const bsFromApi =
    p?.bs_date && typeof p.bs_date === "object"
      ? p.bs_date
      : vikram?.year && vikram.month && vikram.day
        ? { year: vikram.year, month: vikram.month, day: vikram.day }
        : null;
  const bs = bsFromApi ?? fallbackBs;

  const dayNumber = isAdCalendar
    ? ((selectedDay && !selectedDay.outsideMonth ? selectedDay.day : undefined) ?? Number(selectedAdDate.slice(8, 10)))
    : (bs?.day ?? selectedDay?.day);
  const monthIndex = Math.max(0, (isAdCalendar ? month : (bs?.month ?? month)) - 1);
  const monthName = isAdCalendar
    ? bilingualText(lang, AD_MONTH_NAMES_NE[monthIndex], AD_MONTH_NAMES[monthIndex])
    : bilingualText(lang, BS_MONTHS_NE[monthIndex], BS_MONTH_NAMES[monthIndex]);
  const yearNumber = isAdCalendar ? year : (bs?.year ?? year);

  const weekdayIndex = civilIsoWeekday(selectedAdDate);
  const weekday = bilingualText(lang, selectedDay?.weekday_ne ?? WEEKDAY_NE[weekdayIndex], selectedDay?.weekday_en ?? WEEKDAY_EN[weekdayIndex]);

  const festivals = useMemo(() => {
    const fromApi = (p?.festivals ?? [])
      .map((fest) => bilingualText(lang, fest.name_ne ?? fest.name, fest.name_en ?? fest.name ?? fest.name_ne, "").trim())
      .filter(Boolean);
    if (fromApi.length) return fromApi.slice(0, 3);
    return (selectedDay?.festivals ?? []).map((name) => name.trim()).filter(Boolean).slice(0, 3);
  }, [p?.festivals, selectedDay?.festivals, lang]);

  const tithi = bilingualText(lang, p?.tithi?.name_ne ?? selectedDay?.tithi_ne ?? selectedDay?.tithi, p?.tithi?.name ?? selectedDay?.tithi ?? selectedDay?.tithi_ne, "");
  const paksha = formatPakshaLabel(p, lang, selectedDay?.paksha_ne, selectedDay?.paksha) ?? "";
  const nakshatra = bilingualText(lang, p?.nakshatra?.name_ne ?? selectedDay?.nakshatra_ne, p?.nakshatra?.name ?? selectedDay?.nakshatra, "");

  const pakshaShort = (() => {
    const stripped = paksha.replace(PAKSHA_WORD, "").replace(/\s*paksha/gi, "").trim();
    return monthName && stripped.toLowerCase().startsWith(monthName.toLowerCase()) ? stripped.slice(monthName.length).trim() : stripped;
  })();

  const tithiIndex = p ? tithiIndexFromPanchanga(p) : selectedDay ? tithiIndexFromCalendarDay(selectedDay) : undefined;

  const clock = (raw: string | undefined) => {
    if (!raw) return undefined;
    const short = formatTimeShort(raw) ?? raw;
    return english ? short : (formatClockNepali(short) ?? digits(short));
  };

  // Saits come from the day payload, which is fetched per location: a new
  // location brings its own local kaal, lagna and clock times. One row per
  // rite; a ceremony split across several lagnas lists each stretch.
  // Far from Nepal the tithi can hold on the local day before or after the
  // patro's; such a sait carries its own date.
  const span = (w: { date_local?: string; start_local: string; end_local: string }) => {
    const times = `${clock(w.start_local)} – ${clock(w.end_local)}`;
    if (!w.date_local || w.date_local === selectedAdDate) return times;
    const [, m, d] = w.date_local.split("-").map(Number);
    const monthLabel = bilingualText(lang, AD_MONTH_NAMES_NE[m - 1], AD_MONTH_NAMES[m - 1]);
    return `${monthLabel} ${digits(d)}, ${times}`;
  };
  const saits: SaitRow[] = [];
  const label = (keys: Record<string, string>, id: string | null | undefined) => {
    const key = id ? keys[id] : undefined;
    return key ? t(key) : "";
  };
  for (const sait of p?.festival_saits ?? []) {
    const lagna = sait.lagna ? t("ui.home.sait_lagna", { v0: bilingualText(lang, sait.lagna.name_ne, sait.lagna.name) }) : "";
    const time = {
      key: sait.sait.start,
      time: span(sait.sait),
      detail: lagna,
    };
    const key = `${sait.festival_id}:${sait.ritual}`;
    const row = saits.find((r) => r.key === key);
    if (row) {
      row.times.push(time);
      continue;
    }
    saits.push({
      key,
      label: label(SAIT_RITUAL_KEYS, sait.ritual),
      times: [time],
      facing: sait.facing
        ? t("ui.home.sait_facing", {
            v0: label(SAIT_DIRECTION_KEYS, sait.facing.direction),
            v1: bilingualText(lang, sait.facing.moon_rashi.name_ne, sait.facing.moon_rashi.name),
          })
        : undefined,
    });
  }

  // Set by the API when a daytime sait lies outside the local Abhijit muhurta.
  const abhijitAlternate = (p?.festival_saits ?? []).some((sait) => sait.alternate);

  const count = digits(Math.abs(daysAway));
  const kicker = isToday
    ? t("ui.home.special_today")
    : daysAway > 0
      ? english
        ? daysAway === 1
          ? "After 1 day"
          : `After ${count} days`
        : t("ui.home.x_261cd2ac", { v0: count })
      : english
        ? daysAway === -1
          ? "1 day ago"
          : `${count} days ago`
        : t("ui.home.x_796f4d7b", { v0: count });

  return {
    day: dayNumber != null ? digits(dayNumber) : "—",
    month: `${monthName} ${digits(yearNumber)}`,
    weekday,
    crossEra: formatPatroDayCrossEraSubtitle(p?.date_ad ?? selectedAdDate, isAdCalendar ? "ad" : "bs", lang, patroHeadlineDigits(lang)),
    nepalSambat: p ? formatNepalSambatDisplay(p, lang) : undefined,
    kicker,
    title: festivals.length ? festivals.join(" / ") : tithi || t("ui.home.this_day_s_panchanga"),
    subtitle: [monthName, pakshaShort, festivals.length ? tithi : nakshatra]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" · "),
    tithiIndex,
    phase: tithiIndex != null ? t(moonPhaseKey(tithiIndex)) : undefined,
    sunrise: clock((p ? getSunrise(p) : undefined) ?? selectedDay?.sunrise),
    sunset: clock((p ? getSunset(p) : undefined) ?? selectedDay?.sunset),
    saits,
    saitHeading: t("ui.home.sait_heading"),
    // A daytime festival rite may be done in Abhijit when its sait does not suit.
    saitNote: [t("ui.home.sait_local_note"), abhijitAlternate ? t("ui.home.sait_abhijit_note") : ""].filter(Boolean).join(" "),
  };
}
