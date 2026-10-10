import { useMemo } from "react";
import { Sunrise, Sunset } from "lucide-react";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import type { CalendarMonthContext } from "@/components/CalendarView";
import { bilingualText, useLocale } from "@/i18n/locale";
import { type CalendarDay, type PanchangaDay } from "@/lib/api";
import {
  AD_MONTH_NAMES,
  AD_MONTH_NAMES_NE,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  adToBS,
} from "@/lib/bs-calendar";
import { civilIsoWeekday, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import {
  formatClockNepali,
  daysDiffFromAd,
  formatNepalSambatDisplay,
  formatPakshaLabel,
  formatTimeShort,
  getSunrise,
  getSunset,
} from "@/lib/panchanga-format";
import {
  formatPatroDayCrossEraSubtitle,
  patroHeadlineDigits,
} from "@/lib/patro-headline-subtitle";
import {
  tithiIndexFromCalendarDay,
  tithiIndexFromPanchanga,
} from "@/lib/tithi-wheel-data";
import { cn } from "@/lib/utils";

const WEEKDAY_NE = [
  "आइतबार",
  "सोमबार",
  "मङ्गलबार",
  "बुधबार",
  "बिहीबार",
  "शुक्रबार",
  "शनिबार",
] as const;

const WEEKDAY_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type Props = {
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  todayAd: string;
  monthContext: CalendarMonthContext;
  p?: PanchangaDay;
  className?: string;
};

function moonPhasePhrase(index: number, lang: string): string {
  if (index === 14) return bilingualText(lang, "पूर्णिमा", "Full moon");
  if (index === 29) return bilingualText(lang, "औंसी", "New moon");
  if (index >= 6 && index <= 8) return bilingualText(lang, "बढ्दो अर्धचन्द्र", "Waxing half moon");
  if (index >= 21 && index <= 23) return bilingualText(lang, "घट्दो अर्धचन्द्र", "Waning half moon");
  if (index < 14) return bilingualText(lang, "बढ्दो चन्द्र", "Waxing moon");
  return bilingualText(lang, "घट्दो चन्द्र", "Waning moon");
}

function daysAwayLabel(
  days: number,
  lang: string,
  digits: (value: string | number) => string,
): string {
  const count = digits(Math.abs(days));
  const english = lang.slice(0, 2) === "en";
  if (days > 0) {
    if (english) return days === 1 ? "After 1 day" : `After ${count} days`;
    return `${count} दिनपछि`;
  }
  if (english) return days === -1 ? "1 day ago" : `${count} days ago`;
  return `${count} दिन अघि`;
}

function clockLabel(
  raw: string | undefined,
  lang: string,
  digits: (value: string | number) => string,
): string | undefined {
  if (!raw) return undefined;
  const short = formatTimeShort(raw) ?? raw;
  if (lang.slice(0, 2) === "en") return short;
  return formatClockNepali(short) ?? digits(short);
}

/**
 * The selected day's date, festival, moon, sunrise and sunset. Rendered once,
 * inside the आजको पञ्चाङ्ग card, on every screen size.
 */
export function TodayHighlightCard({
  selectedDay,
  selectedAdDate,
  todayAd,
  monthContext,
  p,
  className,
}: Props) {
  const { lang, digits } = useLocale();
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

  const dayNumber = monthContext.isAdCalendar
    ? (selectedDay && !selectedDay.outsideMonth ? selectedDay.day : undefined) ??
      Number(selectedAdDate.slice(8, 10))
    : (bs?.day ?? selectedDay?.day);

  const monthIndex = Math.max(
    0,
    (monthContext.isAdCalendar ? monthContext.adMonth : (bs?.month ?? monthContext.month)) - 1,
  );
  const monthName = monthContext.isAdCalendar
    ? bilingualText(lang, AD_MONTH_NAMES_NE[monthIndex], AD_MONTH_NAMES[monthIndex])
    : bilingualText(lang, BS_MONTHS_NE[monthIndex], BS_MONTH_NAMES[monthIndex]);
  const yearNumber = monthContext.isAdCalendar
    ? monthContext.adYear
    : (bs?.year ?? monthContext.year);

  const weekdayIndex = civilIsoWeekday(selectedAdDate);
  const weekday = bilingualText(
    lang,
    selectedDay?.weekday_ne ?? WEEKDAY_NE[weekdayIndex],
    selectedDay?.weekday_en ?? WEEKDAY_EN[weekdayIndex],
  );

  const crossEraLine = formatPatroDayCrossEraSubtitle(
    p?.date_ad ?? selectedAdDate,
    monthContext.isAdCalendar ? "ad" : "bs",
    lang,
    patroHeadlineDigits(lang),
  );

  const nsLabel = p ? formatNepalSambatDisplay(p, lang) : undefined;

  const festivals = useMemo(() => {
    const fromApi = (p?.festivals ?? [])
      .map((fest) =>
        bilingualText(lang, fest.name_ne ?? fest.name, fest.name_en ?? fest.name ?? fest.name_ne, ""),
      )
      .map((name) => name.trim())
      .filter(Boolean);
    if (fromApi.length) return fromApi.slice(0, 3);
    return (selectedDay?.festivals ?? []).map((name) => name.trim()).filter(Boolean).slice(0, 3);
  }, [p?.festivals, selectedDay?.festivals, lang]);

  const tithi = bilingualText(
    lang,
    p?.tithi?.name_ne ?? selectedDay?.tithi_ne ?? selectedDay?.tithi,
    p?.tithi?.name ?? selectedDay?.tithi ?? selectedDay?.tithi_ne,
    "",
  );
  const paksha = formatPakshaLabel(p, lang, selectedDay?.paksha_ne, selectedDay?.paksha) ?? "";
  const nakshatra = bilingualText(
    lang,
    p?.nakshatra?.name_ne ?? selectedDay?.nakshatra_ne,
    p?.nakshatra?.name ?? selectedDay?.nakshatra,
    "",
  );

  const specialTitle = festivals.length
    ? festivals.join(" / ")
    : tithi || bilingualText(lang, "यस दिनको पञ्चाङ्ग", "This day's panchanga");
  const pakshaShort = (() => {
    const stripped = paksha.replace(/\s*पक्ष/g, "").replace(/\s*paksha/gi, "").trim();
    if (monthName && stripped.toLowerCase().startsWith(monthName.toLowerCase())) {
      return stripped.slice(monthName.length).trim();
    }
    return stripped;
  })();
  const specialSubtitle = [monthName, pakshaShort, festivals.length ? tithi : nakshatra]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");

  const tithiIndex = p
    ? tithiIndexFromPanchanga(p)
    : selectedDay
      ? tithiIndexFromCalendarDay(selectedDay)
      : undefined;
  const phaseLabel = tithiIndex != null ? moonPhasePhrase(tithiIndex, lang) : undefined;

  const sunrise = clockLabel((p ? getSunrise(p) : undefined) ?? selectedDay?.sunrise, lang, digits);
  const sunset = clockLabel((p ? getSunset(p) : undefined) ?? selectedDay?.sunset, lang, digits);

  return (
    <div id="home-today-highlight" className={cn("bg-card px-4 py-4", className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-[3.4rem] pt-0.5 text-[2.75rem] font-bold leading-none text-danger">
          {dayNumber != null ? digits(dayNumber) : "—"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold leading-tight text-foreground">
            {monthName} {digits(yearNumber)}
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">{weekday}</div>
          <div className="text-sm text-muted-foreground">{crossEraLine}</div>
          {nsLabel ? <div className="mt-0.5 text-xs text-muted-foreground">{nsLabel}</div> : null}
        </div>
      </div>

      <div className="mt-3.5 border-t border-border pt-3">
        <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {isToday
            ? bilingualText(lang, "आज विशेष", "Special today")
            : daysAwayLabel(daysAway, lang, digits)}
        </div>
        <div className="mt-1 text-base font-bold leading-snug text-danger">{specialTitle}</div>
        {specialSubtitle ? (
          <div className="mt-0.5 text-sm text-muted-foreground">{specialSubtitle}</div>
        ) : null}

        {phaseLabel && tithiIndex != null ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <CalendarMoonPhaseIcon tithiIndex={tithiIndex} className="size-6" title={phaseLabel} />
            <span>{phaseLabel}</span>
          </div>
        ) : null}

        {sunrise || sunset ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
            {sunrise ? (
              <span className="inline-flex items-center gap-1.5">
                <Sunrise className="size-4 text-warning" aria-hidden />
                <span className="font-num">{sunrise}</span>
              </span>
            ) : null}
            {sunset ? (
              <span className="inline-flex items-center gap-1.5">
                <Sunset className="size-4 text-warning" aria-hidden />
                <span className="font-num">{sunset}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
