import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { Text } from "@/components/ui/Text";
import {
  apiKeys,
  fetchSaitMonthAll,
  type CalendarDay,
  type LocationParams,
  type PanchangaDay,
} from "@/lib/api";
import {
  AD_MONTH_NAMES,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  adToBS,
} from "@/lib/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatClockNepali, formatPakshaLabel, getSunrise, getSunset } from "@/lib/panchanga-format";
import { formatPatroCivilDayLabel, patroHeadlineDigits } from "@/lib/patro-headline-subtitle";
import { parseCivilIsoToDate } from "@/lib/patro-day";
import { SAIT_CATEGORIES, SAIT_CATEGORY_LABELS } from "@/lib/sait-data";
import { tithiIndexFromCalendarDay, tithiIndexFromPanchanga } from "@/lib/tithi-wheel-data";
import { useThemeColors } from "@/lib/theme-context";

const WEEKDAY_NE = ["आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Props = {
  selectedDay: CalendarDay | null;
  selectedAdDate: string;
  todayAd: string;
  isAdCalendar: boolean;
  /** Browsed month (BS month number, or AD month in Gregorian mode) and year. */
  year: number;
  month: number;
  location?: LocationParams;
  p?: PanchangaDay;
  onOpenDay: () => void;
};

function moonPhasePhrase(index: number, pick: (ne: string, en: string) => string): string {
  if (index === 14) return pick("पूर्णिमा", "Full moon");
  if (index === 29) return pick("औंसी", "New moon");
  if (index >= 6 && index <= 8) return pick("बढ्दो अर्धचन्द्र", "Waxing half moon");
  if (index >= 21 && index <= 23) return pick("घट्दो अर्धचन्द्र", "Waning half moon");
  if (index < 14) return pick("बढ्दो चन्द्र", "Waxing moon");
  return pick("घट्दो चन्द्र", "Waning moon");
}

/**
 * Phone-only summary directly under the calendar: the selected day's festival,
 * tithi, moon, sunrise/sunset and sait. Mirrors the web `TodayHighlightCard`.
 */
export function TodayHighlightCard({
  selectedDay,
  selectedAdDate,
  todayAd,
  isAdCalendar,
  year,
  month,
  location,
  p,
  onOpenDay,
}: Props) {
  const { pick, lang, digits } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const isToday = selectedAdDate === todayAd;

  const bs = useMemo(() => {
    const v = p?.date_parts?.vikram;
    if (p?.bs_date && typeof p.bs_date === "object") return p.bs_date;
    if (v?.year && v.month && v.day) return { year: v.year, month: v.month, day: v.day };
    try {
      return adToBS(parseCivilIsoToDate(selectedAdDate));
    } catch {
      return null;
    }
  }, [p, selectedAdDate]);

  const adDate = useMemo(() => new Date(`${selectedAdDate}T12:00:00`), [selectedAdDate]);
  const dayNumber = isAdCalendar ? adDate.getDate() : (bs?.day ?? selectedDay?.day);
  const monthName = isAdCalendar
    ? AD_MONTH_NAMES[adDate.getMonth()]!
    : pick(BS_MONTHS_NE[(bs?.month ?? month) - 1] ?? "", BS_MONTH_NAMES[(bs?.month ?? month) - 1] ?? "");
  const yearNumber = isAdCalendar ? adDate.getFullYear() : (bs?.year ?? year);
  const weekdayIndex = adDate.getDay();
  const weekday = pick(
    selectedDay?.weekday_ne ?? WEEKDAY_NE[weekdayIndex]!,
    selectedDay?.weekday_en ?? WEEKDAY_EN[weekdayIndex]!,
  );
  const crossEraLine = formatPatroCivilDayLabel(p?.date_ad ?? selectedAdDate, lang, patroHeadlineDigits(lang));

  const festivals = useMemo(() => {
    const fromApi = (p?.festivals ?? [])
      .map((f) => pick(f.name_ne ?? f.name ?? "", f.name_en ?? f.name ?? f.name_ne ?? "").trim())
      .filter(Boolean);
    if (fromApi.length) return fromApi.slice(0, 3);
    return (selectedDay?.festivals ?? []).map((n) => n.trim()).filter(Boolean).slice(0, 3);
  }, [p?.festivals, selectedDay?.festivals, pick]);

  const tithi = pick(
    p?.tithi?.name_ne ?? selectedDay?.tithi_ne ?? selectedDay?.tithi ?? "",
    p?.tithi?.name ?? selectedDay?.tithi ?? selectedDay?.tithi_ne ?? "",
  );
  const paksha = formatPakshaLabel(p, lang, selectedDay?.paksha_ne, selectedDay?.paksha) ?? "";
  const nakshatra = pick(
    p?.nakshatra?.name_ne ?? selectedDay?.nakshatra_ne ?? "",
    p?.nakshatra?.name ?? selectedDay?.nakshatra ?? "",
  );

  const specialTitle = festivals.length
    ? festivals.join(" / ")
    : tithi || pick("यस दिनको पञ्चाङ्ग", "This day's panchanga");
  const pakshaShort = (() => {
    const stripped = paksha.replace(/\s*पक्ष/g, "").replace(/\s*paksha/gi, "").trim();
    return monthName && stripped.toLowerCase().startsWith(monthName.toLowerCase())
      ? stripped.slice(monthName.length).trim()
      : stripped;
  })();
  const specialSubtitle = [monthName, pakshaShort, festivals.length ? tithi : nakshatra]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");

  const tithiIndex = p ? tithiIndexFromPanchanga(p) : selectedDay ? tithiIndexFromCalendarDay(selectedDay) : undefined;
  const phaseLabel = tithiIndex != null ? moonPhasePhrase(tithiIndex, pick) : undefined;

  const clock = (raw?: string) => {
    if (!raw) return undefined;
    const short = raw.match(/(\d{1,2}):(\d{2})/)?.[0] ?? raw;
    return lang === "en" ? short : (formatClockNepali(short) ?? digits(short));
  };
  const sunrise = clock((p ? getSunrise(p) : undefined) ?? selectedDay?.sunrise);
  const sunset = clock((p ? getSunset(p) : undefined) ?? selectedDay?.sunset);

  const saitEnabled = bs != null && bs.year >= BS_SUPPORTED_START_YEAR && bs.year <= BS_SUPPORTED_END_YEAR;
  const saitQ = useQuery({
    queryKey: apiKeys.saitMonthAll(bs?.year ?? 0, bs?.month ?? 0, location),
    queryFn: () => fetchSaitMonthAll(bs!.year, bs!.month, location),
    enabled: saitEnabled,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
  const todaySait = useMemo(() => {
    if (!bs || !saitQ.data) return [];
    return SAIT_CATEGORIES.filter((cat) => (saitQ.data.categories[cat.id] ?? []).includes(bs.day));
  }, [bs, saitQ.data]);

  return (
    <View nativeID="home-today-highlight" className="gap-2.5">
      <Pressable
        onPress={onOpenDay}
        accessibilityRole="button"
        className="rounded-2xl border border-border bg-card px-4 py-4 active:opacity-90"
      >
        <View className="flex-row items-start gap-3">
          <Text className="min-w-[56px] text-[44px] font-bold leading-[50px] text-danger">
            {dayNumber != null ? digits(dayNumber) : "—"}
          </Text>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="text-base font-bold text-foreground" style={nepaliTextStyle(16)}>
                {monthName} {digits(yearNumber)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </View>
            <Text className="mt-0.5 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>{weekday}</Text>
            <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>{crossEraLine}</Text>
          </View>
        </View>

        <View className="mt-3.5 border-t border-border pt-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" style={nepaliTextStyle(11)}>
            {isToday ? pick("आज विशेष", "Special today") : pick("यस दिनको विशेष", "Special this day")}
          </Text>
          <Text className="mt-1 text-base font-bold leading-snug text-danger" style={nepaliTextStyle(16)}>
            {specialTitle}
          </Text>
          {specialSubtitle ? (
            <Text className="mt-0.5 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>{specialSubtitle}</Text>
          ) : null}

          {phaseLabel && tithiIndex != null ? (
            <View className="mt-3 flex-row items-center gap-2">
              <CalendarMoonPhaseIcon tithiIndex={tithiIndex} size={24} title={phaseLabel} />
              <Text className="text-sm text-foreground" style={nepaliTextStyle(14)}>{phaseLabel}</Text>
            </View>
          ) : null}

          {sunrise || sunset ? (
            <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
              {sunrise ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="sunny-outline" size={16} color="#d98a00" />
                  <Text className="text-sm text-foreground">{sunrise}</Text>
                </View>
              ) : null}
              {sunset ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="partly-sunny-outline" size={16} color="#d98a00" />
                  <Text className="text-sm text-foreground">{sunset}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>

      <View className="rounded-2xl border border-border bg-card px-4 py-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-sm font-bold text-foreground" style={nepaliTextStyle(14)}>
            {pick("यस दिनको साइतहरू", "Sait this day")}
          </Text>
          <Pressable onPress={() => router.push("/panchanga/details" as never)} hitSlop={8}>
            <Text className="text-sm font-semibold text-danger" style={nepaliTextStyle(14)}>
              {pick("सबै हेर्नुहोस्", "See all")}
            </Text>
          </Pressable>
        </View>
        {saitQ.isLoading ? (
          <View className="mt-2 h-5 w-28 rounded bg-muted" />
        ) : saitQ.isError ? (
          <Text className="mt-2 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("साइत डाटा उपलब्ध छैन।", "Sait data is not available yet.")}
          </Text>
        ) : todaySait.length ? (
          <View className="mt-2 gap-1">
            {todaySait.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => router.push((cat.id === "vivah" ? "/vivah-sait" : `/sait/${cat.id}`) as never)}
              >
                <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle(14)}>
                  {pick(SAIT_CATEGORY_LABELS[cat.id].ne, SAIT_CATEGORY_LABELS[cat.id].en)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="mt-2 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("यस दिन कुनै साइत छैन", "No sait on this day")}
          </Text>
        )}
      </View>
    </View>
  );
}
