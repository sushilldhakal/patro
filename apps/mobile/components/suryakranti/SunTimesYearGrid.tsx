import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@/components/icons/Ionicons";
import { LucideNative } from "@/components/icons/LucideNative";
import { __iconNode as SunriseNode } from "lucide-react/dist/esm/icons/sunrise";
import { __iconNode as SunsetNode } from "lucide-react/dist/esm/icons/sunset";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import {
  fetchYearSunTimes,
  sunYearKeys,
  type LocationParams,
  type SunYearDay,
  type SunYearMonth,
  type SunYearResponse,
} from "@/lib/api";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  formatAyanaMarkShort,
  formatTimeShort,
  isAyanaNorthMark,
  toNepaliDigits,
} from "@vedic-patro/domain/panchanga-format";
import { eraToApi, isGregorianEra, type Era } from "@vedic-patro/domain/era";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { illustration } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { sunTimesClasses } from "@vedic-patro/design-tokens/classes/sun-times-classes";

const DAY_COL = 48;
const MONTH_COL = 84;

const GREGORIAN_MONTH_SHORT_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const GREGORIAN_MONTH_SHORT_NE = [
  "जन",
  "फेब",
  "मार्च",
  "अप्र",
  "मे",
  "जुन",
  "जुल",
  "अग",
  "सेप",
  "अक्ट",
  "नोभ",
  "डिस",
] as const;

type SunCell = {
  day: number;
  sunriseDisplay?: string;
  sunsetDisplay?: string;
  ayanaMark?: "उ" | "द";
  ayanaLabel?: string;
};

type CalendarLayout = {
  year: number;
  monthLabels: readonly string[];
  getMonthLength: (month: number) => number;
  maxDay: number;
  defaultMonth: string;
};

function resolveAyanaMark(day: SunYearDay, isEnglish: boolean): { mark?: "उ" | "द"; label?: string } {
  if (!day.ayana_mark) return {};
  const label = isEnglish
    ? (day.aayan ?? day.aayan_ne ?? (day.ayana_mark === "उ" ? "Uttarayana" : "Dakshinayana"))
    : (day.aayan_ne ?? day.aayan);
  return { mark: day.ayana_mark, label };
}

function dayCell(d: SunYearDay, nepaliDigits: boolean, isEnglish: boolean): SunCell {
  const sunrise = formatTimeShort(d.sunrise);
  const sunset = formatTimeShort(d.sunset);
  const { mark: ayanaMark, label: ayanaLabel } = resolveAyanaMark(d, isEnglish);
  const sunriseDisplay = sunrise
    ? nepaliDigits
      ? toNepaliDigits(sunrise)
      : sunrise
    : undefined;
  const sunsetDisplay = sunset
    ? nepaliDigits
      ? toNepaliDigits(sunset)
      : sunset
    : undefined;
  return { day: d.day, sunriseDisplay, sunsetDisplay, ayanaMark, ayanaLabel };
}

function buildBsYearGrid(
  months: SunYearMonth[] | undefined,
  nepaliDigits: boolean,
  isEnglish: boolean,
): Map<string, SunCell> {
  const grid = new Map<string, SunCell>();
  for (const block of months ?? []) {
    for (const d of block.calendar) {
      grid.set(`${block.month_bs}-${d.day}`, dayCell(d, nepaliDigits, isEnglish));
    }
  }
  return grid;
}

function parseDateAd(dateAd: string): Date {
  const [y, m, day] = dateAd.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
}

function buildAdYearGrid(
  responses: (SunYearResponse | undefined)[],
  adYear: number,
  nepaliDigits: boolean,
  isEnglish: boolean,
): Map<string, SunCell> {
  const grid = new Map<string, SunCell>();
  for (const resp of responses) {
    if (!resp) continue;
    for (const month of resp.months) {
      for (const d of month.calendar) {
        if (!d.date_ad) continue;
        const adDate = parseDateAd(d.date_ad);
        if (adDate.getFullYear() !== adYear) continue;
        const adMonth = adDate.getMonth() + 1;
        const adDay = adDate.getDate();
        grid.set(`${adMonth}-${adDay}`, { ...dayCell(d, nepaliDigits, isEnglish), day: adDay });
      }
    }
  }
  return grid;
}

function gregorianMonthLengthsFromData(data: SunYearResponse | undefined, gregorianYear: number): number[] {
  const lengths = Array.from({ length: 12 }, () => 0);
  if (!data) return Array.from({ length: 12 }, () => 31);
  for (const month of data.months) {
    for (const d of month.calendar) {
      if (!d.date_ad) continue;
      const adDate = parseDateAd(d.date_ad);
      if (adDate.getFullYear() !== gregorianYear) continue;
      const idx = adDate.getMonth();
      lengths[idx] = Math.max(lengths[idx], adDate.getDate());
    }
  }
  return lengths.map((len) => (len > 0 ? len : 31));
}

function defaultMonthFromResponse(months: SunYearMonth[] | undefined, todayAd: string): string {
  if (!months?.length) return "month-1";
  for (const m of months) {
    for (const d of m.calendar) {
      if (d.date_ad === todayAd) return `month-${m.month_bs}`;
    }
  }
  return "month-1";
}

function layoutFromVikramMonths(
  months: SunYearMonth[] | undefined,
  year: number,
  isEnglish: boolean,
  todayAd: string,
): CalendarLayout {
  const byBsMonth = new Map<number, SunYearMonth>();
  for (const m of months ?? []) byBsMonth.set(m.month_bs, m);
  const monthLabels = Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const m = byBsMonth.get(month);
    if (m) return isEnglish ? m.month_name : m.month_name_ne;
    return isEnglish ? BS_MONTH_NAMES[idx]! : BS_MONTHS_NE[idx]!;
  });
  const getMonthLength = (month: number) => byBsMonth.get(month)?.month_length ?? 30;
  const maxDay = Math.max(30, ...(months ?? []).map((m) => m.month_length));
  return {
    year,
    monthLabels,
    getMonthLength,
    maxDay,
    defaultMonth: defaultMonthFromResponse(months, todayAd),
  };
}

function layoutFromGregorianData(
  data: SunYearResponse | undefined,
  year: number,
  isEnglish: boolean,
): CalendarLayout {
  const monthLabels = isEnglish ? GREGORIAN_MONTH_SHORT_EN : GREGORIAN_MONTH_SHORT_NE;
  const lengths = gregorianMonthLengthsFromData(data, year);
  const maxDay = Math.max(...lengths);
  const today = new Date();
  const defaultMonth = today.getFullYear() === year ? String(today.getMonth() + 1) : "1";
  return {
    year,
    monthLabels,
    getMonthLength: (month) => lengths[month - 1] ?? 31,
    maxDay,
    defaultMonth: `month-${defaultMonth}`,
  };
}

function buildMonthRows(month: number, monthLen: number, grid: Map<string, SunCell>): SunCell[] {
  return Array.from({ length: monthLen }, (_, i) => {
    const day = i + 1;
    return grid.get(`${month}-${day}`) ?? { day };
  });
}

function SunTimesLegend() {
  const { pick } = useLocale();
  const colors = useThemeColors();
  return (
    <View className={cn("flex-row flex-wrap", sunTimesClasses.legend)}>
      <View className={cn("flex-row", sunTimesClasses.legendItems)}>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <LucideNative node={SunriseNode} size={16} color={colors.foreground} />
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {pick("सूर्योदय", "Sunrise")}
          </Text>
        </View>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <LucideNative node={SunsetNode} size={16} color={colors.foreground} />
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {pick("सूर्यास्त", "Sunset")}
          </Text>
        </View>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <Text className={sunTimesClasses.ayanaNorth}>{pick("उ", "N")}</Text>
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {pick("उत्तरायण", "Uttarayana")}
          </Text>
        </View>
        <View className={cn("flex-row", sunTimesClasses.legendItem)}>
          <Text className={sunTimesClasses.ayanaSouth}>{pick("द", "S")}</Text>
          <Text className={sunTimesClasses.legendLabel} style={nepaliTextStyle()}>
            {pick("दक्षिणायन", "Dakshinayana")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SunTimesYearMatrix({
  layout,
  grid,
}: {
  layout: CalendarLayout;
  grid: Map<string, SunCell>;
}) {
  const { pick, digits, lang } = useLocale();
  const { monthLabels, getMonthLength, maxDay } = layout;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View className="flex-row">
          <View
            style={{ width: DAY_COL }}
            className={cn("items-center justify-center", sunTimesClasses.matrixDayHead)}
          >
            <Text className={sunTimesClasses.matrixDayHeadText} style={nepaliTextStyle()}>
              {pick("दिन", "Day")}
            </Text>
          </View>
          {monthLabels.map((name, idx) => (
            <View
              key={`sun-month-${idx + 1}`}
              style={{ width: MONTH_COL }}
              className={cn("items-center justify-center", sunTimesClasses.matrixMonthHead)}
            >
              <Text numberOfLines={1} className={sunTimesClasses.matrixMonthHeadText} style={nepaliTextStyle()}>
                {name || " "}
              </Text>
            </View>
          ))}
        </View>

        {Array.from({ length: maxDay }, (_, rowIdx) => {
          const day = rowIdx + 1;
          return (
            <View key={day} className="flex-row">
              <View
                style={{ width: DAY_COL }}
                className={cn("items-center justify-center", sunTimesClasses.matrixDayRowHead)}
              >
                <Text className={sunTimesClasses.matrixDayRowText} style={nepaliTextStyle()}>
                  {digits(day)}
                </Text>
              </View>
              {Array.from({ length: 12 }, (_, colIdx) => {
                const month = colIdx + 1;
                if (day > getMonthLength(month)) {
                  return (
                    <View
                      key={month}
                      style={{ width: MONTH_COL }}
                      className={cn(sunTimesClasses.matrixCell, sunTimesClasses.matrixCellBlank)}
                    />
                  );
                }
                const cell = grid.get(`${month}-${day}`);
                return (
                  <View
                    key={month}
                    style={{ width: MONTH_COL }}
                    className={cn("justify-center", sunTimesClasses.matrixCell)}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      style={nepaliTextStyle()}
                      className={cn("text-center font-num", sunTimesClasses.matrixRise)}
                    >
                      {cell?.sunriseDisplay ?? "—"}
                      {cell?.ayanaMark ? (
                        <Text
                          className={
                            isAyanaNorthMark(cell.ayanaMark)
                              ? sunTimesClasses.ayanaNorth
                              : sunTimesClasses.ayanaSouth
                          }
                        >
                          {" "}
                          {formatAyanaMarkShort(cell.ayanaMark, lang)}
                        </Text>
                      ) : null}
                    </Text>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      style={nepaliTextStyle()}
                      className={cn("text-center font-num", sunTimesClasses.matrixSet)}
                    >
                      {cell?.sunsetDisplay ?? "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* Web month table: `h-10 px-3 py-3` head on bg-muted, `px-3 py-2.5` cells, border-b rows
   (none on the last), sunrise/sunset in text-base. Columns share the width 1:1:2:2. */
const MONTH_COLS = [
  { key: "day", flex: 1 },
  { key: "ayana", flex: 1 },
  { key: "sunrise", flex: 2 },
  { key: "sunset", flex: 2 },
] as const;

function MonthSunDataTable({ rows }: { rows: SunCell[] }) {
  const { pick, digits, lang } = useLocale();
  const { colors, isDark } = useTheme();
  const riseColor = isDark ? colors.accent : colors.primary;

  const head = (key: (typeof MONTH_COLS)[number]["key"]) => {
    if (key === "day") return pick("दिन", "Day");
    if (key === "ayana") return pick("अयन", "Ayana");
    const rise = key === "sunrise";
    return (
      <View className="flex-row items-center gap-1.5">
        <LucideNative
          node={rise ? SunriseNode : SunsetNode}
          size={16}
          color={rise ? colors.primary : illustration.sky60}
        />
        <Text className={sunTimesClasses.monthHeadText} style={nepaliTextStyle()}>
          {rise ? pick("सूर्योदय", "Sunrise") : pick("सूर्यास्त", "Sunset")}
        </Text>
      </View>
    );
  };

  return (
    <View>
      <View className={cn("flex-row border-b border-border", sunTimesClasses.monthHeadRow)}>
        {MONTH_COLS.map((c) => {
          const label = head(c.key);
          return (
            <View key={c.key} style={{ flex: c.flex }} className={cn("justify-center", sunTimesClasses.monthHeadCell)}>
              {typeof label === "string" ? (
                <Text className={sunTimesClasses.monthHeadText} style={nepaliTextStyle()}>
                  {label}
                </Text>
              ) : (
                label
              )}
            </View>
          );
        })}
      </View>
      {rows.map((row, i) => (
        <View key={row.day} className={cn("flex-row", i < rows.length - 1 && sunTimesClasses.monthRow)}>
          <View style={{ flex: 1 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            <Text className={cn("font-num", sunTimesClasses.monthDayText)} style={nepaliTextStyle()}>
              {digits(row.day)}
            </Text>
          </View>
          <View style={{ flex: 1 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            {row.ayanaMark ? (
              <Text
                className={isAyanaNorthMark(row.ayanaMark) ? sunTimesClasses.ayanaNorth : sunTimesClasses.ayanaSouth}
                style={nepaliTextStyle()}
              >
                {formatAyanaMarkShort(row.ayanaMark, lang)}
              </Text>
            ) : (
              <Text className={sunTimesClasses.monthPlainText} style={nepaliTextStyle()}>
                —
              </Text>
            )}
          </View>
          <View style={{ flex: 2 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            <Text className={cn("font-num", sunTimesClasses.monthRiseText)} style={[nepaliTextStyle(), { color: riseColor }]}>
              {row.sunriseDisplay ?? "—"}
            </Text>
          </View>
          <View style={{ flex: 2 }} className={cn("justify-center", sunTimesClasses.monthCell)}>
            <Text className={cn("font-num", sunTimesClasses.monthSetText)} style={nepaliTextStyle()}>
              {row.sunsetDisplay ?? "—"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SunTimesYearAccordion({
  layout,
  grid,
  isLoading,
}: {
  layout: CalendarLayout;
  grid: Map<string, SunCell>;
  isLoading: boolean;
}) {
  const { pick, digits } = useLocale();
  const colors = useThemeColors();
  const { monthLabels, getMonthLength, defaultMonth } = layout;
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) setOpenMonth(defaultMonth);
  }, [defaultMonth, isLoading, layout.year]);

  return (
    <View className={sunTimesClasses.accordion}>
      {monthLabels.map((name, idx) => {
        const month = idx + 1;
        const monthLen = getMonthLength(month);
        const value = `month-${month}`;
        const open = openMonth === value;
        const rows = buildMonthRows(month, monthLen, grid);
        const isLast = idx === monthLabels.length - 1;

        return (
          <View key={value} className={cn("border-border", !isLast && "border-b")}>
            <Pressable
              onPress={() => setOpenMonth(open ? null : value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              className={cn("flex-row items-start justify-between rounded-lg border border-transparent py-2.5 active:opacity-80", sunTimesClasses.accordionTrigger)}
            >
              <Text className={cn("flex-1 pr-2", sunTimesClasses.accordionTriggerText)} style={nepaliTextStyle()}>
                {name}
                <Text className={sunTimesClasses.accordionDays}>
                  {"  "}
                  {pick(`${digits(monthLen)} दिन`, `${monthLen} days`)}
                </Text>
              </Text>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
            {open ? (
              <View className="pb-2.5">
                <MonthSunDataTable rows={rows} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type Props = {
  era: Era;
  year: number;
  locationParams: LocationParams;
  timeZone: string;
};

/** Year sun matrix (≥992px) or per-month accordion — matches web `SunTimesYearGrid`. */
export function SunTimesYearGrid({ era, year, locationParams, timeZone }: Props) {
  const { pick, lang } = useLocale();
  const { width } = useBreakpoint();
  const showMatrix = width >= BREAKPOINTS.lg;
  const isEnglish = lang === "en";
  const nepaliDigits = !isEnglish;
  const gregorianEra = isGregorianEra(era);
  const apiEra = eraToApi(era);
  const todayAd = todayAdStringInTimezone(new Date(), timeZone);

  const query = useQuery({
    queryKey: sunYearKeys.year(year, apiEra, locationParams),
    queryFn: () => fetchYearSunTimes(year, apiEra, locationParams),
    staleTime: 1000 * 60 * 60,
  });

  const grid = useMemo(() => {
    if (gregorianEra) {
      return buildAdYearGrid(query.data ? [query.data] : [], year, nepaliDigits, isEnglish);
    }
    return buildBsYearGrid(query.data?.months, nepaliDigits, isEnglish);
  }, [query.data, gregorianEra, year, nepaliDigits, isEnglish]);

  const layout = useMemo((): CalendarLayout => {
    if (gregorianEra) {
      return layoutFromGregorianData(query.data, year, isEnglish);
    }
    return layoutFromVikramMonths(query.data?.months, year, isEnglish, todayAd);
  }, [gregorianEra, query.data, year, isEnglish, todayAd]);

  if (query.isError) {
    return (
      <View className={sunTimesClasses.card}>
        <Text className={sunTimesClasses.loadError} style={nepaliTextStyle()}>
          {pick("ल्याउन सकिएन।", "Could not load.")}
        </Text>
      </View>
    );
  }

  return (
    <View className={sunTimesClasses.card}>
      <View className={sunTimesClasses.cardClip}>
        <SunTimesLegend />

        {query.isLoading && !query.data ? (
          <Text className="px-4 py-8 text-sm" style={nepaliTextStyle()}>
            {pick("लोड हुँदै…", "Loading…")}
          </Text>
        ) : showMatrix ? (
          <SunTimesYearMatrix layout={layout} grid={grid} />
        ) : (
          <SunTimesYearAccordion layout={layout} grid={grid} isLoading={query.isLoading} />
        )}
      </View>
    </View>
  );
}
