import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@/components/icons/Ionicons";
import { LucideNative } from "@/components/icons/LucideNative";
import { __iconNode as SunriseNode } from "lucide-react/dist/esm/icons/sunrise";
import { __iconNode as SunsetNode } from "lucide-react/dist/esm/icons/sunset";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import {
  fetchYearSunTimes,
  sunTimesKeys,
  type LocationParams,
  type SunYearDay,
  type SunYearMonth,
  type SunYearResponse,
} from "@/lib/api";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  formatAyanaMarkShort,
  formatTimeShort,
  isAyanaNorthMark,
  toNepaliDigits,
} from "@/lib/panchanga-format";
import { browseEraToApi, isGregorianBrowseEra, type PatroBrowseEra } from "@/lib/patro-era";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { todayAdStringInTimezone } from "@/lib/zoned-time";

const DAY_COL = 48;
const MONTH_COL = 84;
const CELL_MIN_H = 40;
const CELL_FONT = 13;
const CELL_FONT_AYANA = 11;
const HEADER_FONT = 12;
const DAY_ROW_FONT = 13;

const AYANA_NORTH = "#2e7d32";
const AYANA_SOUTH = "#c62828";

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
    <View className="flex-row flex-wrap gap-3 border-b border-border px-4 pb-2.5 pt-3.5">
      <View className="flex-row items-center gap-1">
        <LucideNative node={SunriseNode} size={16} color={colors.primary} />
        <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
          {pick("सूर्योदय", "Sunrise")}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <LucideNative node={SunsetNode} size={16} color="#3b82f6" />
        <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
          {pick("सूर्यास्त", "Sunset")}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text style={{ color: AYANA_NORTH }} className="text-xs font-bold">
          {pick("उ", "N")}
        </Text>
        <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
          {pick("उत्तरायण", "Uttarayana")}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text style={{ color: AYANA_SOUTH }} className="text-xs font-bold">
          {pick("द", "S")}
        </Text>
        <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
          {pick("दक्षिणायन", "Dakshinayana")}
        </Text>
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
  const colors = useThemeColors();
  const { monthLabels, getMonthLength, maxDay } = layout;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View className="flex-row border-b border-border">
          <Text
            style={{ width: DAY_COL, ...nepaliTextStyle(HEADER_FONT) }}
            className="border-r border-border bg-card px-1 py-2.5 text-center text-sm font-bold text-foreground"
          >
            {pick("दिन", "Day")}
          </Text>
          {monthLabels.map((name, idx) => (
            <View
              key={`sun-month-${idx + 1}`}
              style={{ width: MONTH_COL }}
              className="items-center justify-center border-r border-border bg-card px-1 py-2"
            >
              <Text
                numberOfLines={2}
                style={{ ...nepaliTextStyle(HEADER_FONT), textAlign: "center" }}
                className="text-xs font-bold leading-snug text-foreground"
              >
                {name || " "}
              </Text>
            </View>
          ))}
        </View>

        {Array.from({ length: maxDay }, (_, rowIdx) => {
          const day = rowIdx + 1;
          return (
            <View key={day} className="flex-row border-b border-border">
              <Text
                style={{ width: DAY_COL, ...nepaliTextStyle(DAY_ROW_FONT) }}
                className="border-r border-border bg-card px-1 py-2.5 text-center font-num text-sm font-bold text-foreground"
              >
                {digits(day)}
              </Text>
              {Array.from({ length: 12 }, (_, colIdx) => {
                const month = colIdx + 1;
                if (day > getMonthLength(month)) {
                  return (
                    <View
                      key={month}
                      style={{
                        width: MONTH_COL,
                        minHeight: CELL_MIN_H,
                        backgroundColor: colors.surfaceMuted,
                        opacity: 0.45,
                      }}
                      className="border-r border-border"
                    />
                  );
                }
                const cell = grid.get(`${month}-${day}`);
                return (
                  <View
                    key={month}
                    style={{ width: MONTH_COL, minHeight: CELL_MIN_H }}
                    className="justify-center border-r border-border px-1 py-1.5"
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      style={{ color: colors.primary, ...nepaliTextStyle(CELL_FONT) }}
                      className="text-center font-num font-semibold leading-snug"
                    >
                      {cell?.sunriseDisplay ?? "—"}
                      {cell?.ayanaMark ? (
                        <Text
                          style={{
                            color: isAyanaNorthMark(cell.ayanaMark) ? AYANA_NORTH : AYANA_SOUTH,
                            fontSize: CELL_FONT_AYANA,
                          }}
                          className="font-bold"
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
                      style={{ color: colors.destructive, ...nepaliTextStyle(CELL_FONT) }}
                      className="text-center font-num font-semibold leading-snug"
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

function MonthSunDataTable({ rows }: { rows: SunCell[] }) {
  const { pick, digits, lang } = useLocale();
  const colors = useThemeColors();

  const columns: TableColumn[] = useMemo(
    () => [
      { key: "day", ne: "दिन", en: "Day", width: 52 },
      { key: "ayana", ne: "अयन", en: "Ayana", width: 44 },
      {
        key: "sunrise",
        ne: "सूर्योदय",
        en: "Sunrise",
        width: 96,
        header: (
          <View className="flex-row items-center gap-1">
            <LucideNative node={SunriseNode} size={16} color={colors.primary} />
            <Text className="text-xs font-semibold text-foreground" style={nepaliTextStyle(11)}>
              {pick("सूर्योदय", "Sunrise")}
            </Text>
          </View>
        ),
      },
      {
        key: "sunset",
        ne: "सूर्यास्त",
        en: "Sunset",
        width: 96,
        header: (
          <View className="flex-row items-center gap-1">
            <LucideNative node={SunsetNode} size={16} color="#3b82f6" />
            <Text className="text-xs font-semibold text-foreground" style={nepaliTextStyle(11)}>
              {pick("सूर्यास्त", "Sunset")}
            </Text>
          </View>
        ),
      },
    ],
    [colors.destructive, colors.primary, pick],
  );

  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        key: String(row.day),
        cells: [
          <Text key="d" className="font-num font-semibold text-foreground" style={nepaliTextStyle(13)}>
            {digits(row.day)}
          </Text>,
          row.ayanaMark ? (
            <Text
              key="a"
              style={{
                color: isAyanaNorthMark(row.ayanaMark) ? AYANA_NORTH : AYANA_SOUTH,
                ...nepaliTextStyle(13),
              }}
              className="font-bold"
            >
              {formatAyanaMarkShort(row.ayanaMark, lang)}
            </Text>
          ) : (
            "—"
          ),
          <Text
            key="sr"
            style={{ color: colors.primary, ...nepaliTextStyle(13) }}
            className="font-num font-semibold"
          >
            {row.sunriseDisplay ?? "—"}
          </Text>,
          <Text
            key="ss"
            style={{ color: colors.destructive, ...nepaliTextStyle(13) }}
            className="font-num font-semibold"
          >
            {row.sunsetDisplay ?? "—"}
          </Text>,
        ],
      })),
    [colors.destructive, colors.primary, digits, lang, rows],
  );

  return <DataTable stretch columns={columns} rows={tableRows} compact />;
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
    <View className="px-3 pb-3">
      {monthLabels.map((name, idx) => {
        const month = idx + 1;
        const monthLen = getMonthLength(month);
        const value = `month-${month}`;
        const open = openMonth === value;
        const rows = buildMonthRows(month, monthLen, grid);
        const isLast = idx === monthLabels.length - 1;

        return (
          <View
            key={value}
            style={{
              borderBottomWidth: isLast ? 0 : 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setOpenMonth(open ? null : value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              className="flex-row items-center justify-between px-1 py-3 active:opacity-80"
            >
              <Text className="flex-1 pr-2 text-base font-semibold text-foreground" style={nepaliTextStyle(16)}>
                {name}
                <Text className="text-sm font-normal text-muted-foreground">
                  {" "}
                  {pick(`${digits(monthLen)} दिन`, `${monthLen} days`)}
                </Text>
              </Text>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
            {open ? (
              <View className="pb-4">
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
  era: PatroBrowseEra;
  year: number;
  locationParams: LocationParams;
  timeZone: string;
};

/** Year sun matrix (≥992px) or per-month accordion — matches web `SunTimesYearGrid`. */
export function SunTimesYearGrid({ era, year, locationParams, timeZone }: Props) {
  const { pick, lang } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const showMatrix = width >= BREAKPOINTS.calendarWide;
  const isEnglish = lang === "en";
  const nepaliDigits = !isEnglish;
  const isGregorianEra = isGregorianBrowseEra(era);
  const apiEra = browseEraToApi(era);
  const todayAd = todayAdStringInTimezone(new Date(), timeZone);

  const query = useQuery({
    queryKey: sunTimesKeys.year(year, apiEra, locationParams),
    queryFn: () => fetchYearSunTimes(year, apiEra, locationParams),
    staleTime: 1000 * 60 * 60,
  });

  const grid = useMemo(() => {
    if (isGregorianEra) {
      return buildAdYearGrid(query.data ? [query.data] : [], year, nepaliDigits, isEnglish);
    }
    return buildBsYearGrid(query.data?.months, nepaliDigits, isEnglish);
  }, [query.data, isGregorianEra, year, nepaliDigits, isEnglish]);

  const layout = useMemo((): CalendarLayout => {
    if (isGregorianEra) {
      return layoutFromGregorianData(query.data, year, isEnglish);
    }
    return layoutFromVikramMonths(query.data?.months, year, isEnglish, todayAd);
  }, [isGregorianEra, query.data, year, isEnglish, todayAd]);

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <SunTimesLegend />

      {query.isLoading && !query.data ? (
        <Text className="px-4 py-8 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("लोड हुँदै…", "Loading…")}
        </Text>
      ) : query.isError ? (
        <Text
          style={{ color: colors.destructive, ...nepaliTextStyle(14) }}
          className="px-4 py-8 text-sm"
        >
          {pick("ल्याउन सकिएन।", "Could not load.")}
        </Text>
      ) : showMatrix ? (
        <SunTimesYearMatrix layout={layout} grid={grid} />
      ) : (
        <SunTimesYearAccordion layout={layout} grid={grid} isLoading={query.isLoading} />
      )}
    </View>
  );
}
