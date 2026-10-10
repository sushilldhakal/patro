import { useMemo, useState } from "react";
import { SeoContentSection } from "@/components/seo/SeoContentSection";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { Text } from "@/components/ui/Text";
import { apiKeys, fetchFestivals, fetchHolidays, type Festival, type Holiday } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatHolidayBsDisplay } from "@/lib/panchanga-format";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import {
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableScrollShell,
  TableCell,
} from "@/components/ui/DataTable";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@/lib/utils";

type Tab = "holidays" | "festivals";
type SortDir = "asc" | "desc";

type Row = {
  key: string;
  name: string;
  bsDate: string;
  adDate: string;
  days: string;
  type: string;
  isPublic: boolean;
};

const HOLIDAY_COLUMNS = [
  { key: "name", ne: "नाम", en: "Name", width: 200 },
  { key: "bsDate", ne: "वि.सं. मिति", en: "BS Date", width: 160 },
  { key: "adDate", ne: "ई.सं. मिति", en: "AD Date", width: 118 },
  { key: "days", ne: "दिन", en: "Days", width: 62 },
  { key: "type", ne: "प्रकार", en: "Type", width: 108 },
] as const;

const FESTIVAL_COLUMNS = [
  { key: "name", ne: "नाम", en: "Name", width: 200 },
  { key: "bsDate", ne: "वि.सं. मिति", en: "BS Date", width: 160 },
  { key: "adDate", ne: "ई.सं. मिति", en: "AD Date", width: 118 },
  { key: "type", ne: "प्रकार", en: "Type", width: 108 },
  { key: "isPublic", ne: "सरकारी बिदा", en: "Gov't Holiday", width: 118 },
] as const;

function toRow(
  item: Holiday | Festival,
  lang: "ne" | "en",
  digits: (v: string | number) => string,
  index: number,
): Row {
  const start = item.start_date ?? "";
  const name =
    (lang === "en" ? (item.name_en ?? item.name_ne) : (item.name_ne ?? item.name_en)) ?? "—";
  return {
    key: `${item.id ?? name}-${start}-${index}`,
    name,
    bsDate: start
      ? formatHolidayBsDisplay({ bs_start_date: item.bs_start_date, start_date: start }, lang)
      : "—",
    adDate: start || "—",
    days: digits(item.duration_days ?? 1),
    type: item.type ?? "—",
    isPublic: Boolean(item.is_public_holiday),
  };
}

export default function HolidaysScreen() {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const { isCalendarWide } = useBreakpoint();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const [tab, setTab] = useState<Tab>("holidays");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: keyof Row; dir: SortDir }>({ key: "adDate", dir: "asc" });

  const holidaysQ = useQuery({
    queryKey: apiKeys.holidays(year),
    queryFn: () => fetchHolidays(year),
    staleTime: 1000 * 60 * 60,
  });

  const festivalsQ = useQuery({
    queryKey: apiKeys.festivals(year, lang),
    queryFn: () => fetchFestivals(year, lang),
    staleTime: 1000 * 60 * 60,
  });

  const loading = tab === "holidays" ? holidaysQ.isLoading : festivalsQ.isLoading;
  const isError = tab === "holidays" ? holidaysQ.isError : festivalsQ.isError;

  const holidays = holidaysQ.data?.holidays ?? [];
  const festivals = festivalsQ.data?.festivals ?? [];
  const columns = tab === "holidays" ? HOLIDAY_COLUMNS : FESTIVAL_COLUMNS;

  const gregorianRange =
    (tab === "holidays" ? holidaysQ.data?.gregorian_range : festivalsQ.data?.gregorian_range) ??
    holidaysQ.data?.gregorian_range ??
    festivalsQ.data?.gregorian_range;

  const rows = useMemo(() => {
    const source = tab === "holidays" ? holidays : festivals;
    const mapped = source.map((item, i) => toRow(item, lang, digits, i));
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? mapped.filter((r) =>
          [r.name, r.bsDate, r.adDate, r.type].join(" ").toLowerCase().includes(q),
        )
      : mapped;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => String(a[sort.key]).localeCompare(String(b[sort.key])) * dir,
    );
  }, [tab, holidays, festivals, lang, digits, filter, sort]);

  const toggleSort = (key: keyof Row) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  const tabs = [
    { id: "holidays" as const, ne: "सरकारी बिदा", en: "Government Holidays", icon: "flag-outline" as const, count: holidays.length },
    { id: "festivals" as const, ne: "सबै पर्वहरू", en: "All Festivals", icon: "sparkles-outline" as const, count: festivals.length },
  ];

  return (
    <AppShell title={pick("बिदा तथा पर्व", "Holidays")} showHeader={false}>
      <PatroPageHeader
        icon={<AppNavIcon name="party-popper" size={24} color={colors.secondary} />}
        title={t("holidays.page_title")}
        subtitle={t("holidays.page_subtitle")}
      />

      <PatroYearNavBlock
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        gregorianRange={gregorianRange}
      />

      <View className="mb-4 flex-row gap-1 border-b border-border">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={{
                borderBottomWidth: 2,
                borderBottomColor: active ? colors.secondary : "transparent",
                marginBottom: -1,
              }}
              className="flex-row items-center gap-2 px-4 py-2.5 active:opacity-70"
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={active ? colors.secondary : colors.mutedForeground}
              />
              <Text
                style={{
                  color: active ? colors.secondary : colors.mutedForeground,
                  ...nepaliTextStyle(13),
                }}
                className="text-body font-semibold"
              >
                {pick(item.ne, item.en)}
              </Text>
              {item.count > 0 ? (
                <View className="rounded-full bg-muted px-1.5 py-0.5">
                  <Text className="text-caption text-muted-foreground">{digits(item.count)}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className="mb-4 max-w-sm flex-row items-center gap-2 rounded-lg border border-border bg-background px-3">
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder={pick("पर्व खोज्नुहोस्…", "Search festivals…")}
          placeholderTextColor={colors.mutedForeground}
          style={{ flex: 1, paddingVertical: 9, color: colors.foreground, fontSize: 15 }}
        />
        {filter ? (
          <Pressable onPress={() => setFilter("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {isError ? (
        <View
          style={{
            backgroundColor: colorWithAlpha("#c62828", 0.1),
            borderColor: colorWithAlpha("#c62828", 0.2),
          }}
          className="rounded-xl border p-4"
        >
          <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className="text-body">
            {pick(
              "डाटा लोड गर्न सकिएन। API लाई केही बेर लाग्न सक्छ।",
              "Failed to load data. The API may need a moment to warm up.",
            )}
          </Text>
        </View>
      ) : loading ? (
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("लोड हुँदै…", "Loading…")}
        </Text>
      ) : (
        <TableScrollShell stretch scroll={false}>
          <TableHeader className="border-b border-border">
            {columns.map((col) => {
              const active = sort.key === col.key;
              return (
                <TableHeaderCell
                  key={col.key}
                  width={col.width}
                  onPress={() => toggleSort(col.key as keyof Row)}
                >
                  <Text
                    numberOfLines={2}
                    className="text-caption shrink font-semibold uppercase tracking-wide text-muted-foreground"
                    style={nepaliTextStyle(11)}
                  >
                    {pick(col.ne, col.en)}
                  </Text>
                  <Ionicons
                    name={
                      active ? (sort.dir === "asc" ? "chevron-up" : "chevron-down") : "swap-vertical"
                    }
                    size={11}
                    color={active ? colors.foreground : colors.mutedForeground}
                  />
                </TableHeaderCell>
              );
            })}
          </TableHeader>

              {rows.length === 0 ? (
                <View className="px-4 py-8">
                  <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                    {pick("कुनै नतिजा भेटिएन।", "No results found.")}
                  </Text>
                </View>
              ) : (
                rows.map((row, rowIndex) => (
                  <TableRow
                    key={row.key}
                    rowIndex={rowIndex}
                    borderTop={false}
                    className="border-b border-border"
                  >
                    {columns.map((col) => {
                      if (col.key === "type") {
                        return (
                          <TableCell key={col.key} width={col.width} align="left">
                            <View className="self-start rounded-full bg-muted px-2 py-0.5">
                              <Text className="text-caption capitalize text-foreground" style={nepaliTextStyle(11)}>
                                {row.type}
                              </Text>
                            </View>
                          </TableCell>
                        );
                      }
                      if (col.key === "isPublic") {
                        return (
                          <TableCell key={col.key} width={col.width} align="left">
                            {row.isPublic ? (
                              <View className="flex-row items-center gap-1">
                                <Ionicons name="flag" size={11} color={colors.destructive} />
                                <Text
                                  style={{ color: colors.destructive, ...nepaliTextStyle(11) }}
                                  className="text-caption font-semibold"
                                >
                                  {pick("हो", "Yes")}
                                </Text>
                              </View>
                            ) : null}
                          </TableCell>
                        );
                      }
                      const mono = col.key === "bsDate" || col.key === "adDate";
                      const value = row[col.key as keyof Row] as string;
                      return (
                        <TableCell key={col.key} width={col.width} align="left">
                          <Text
                            numberOfLines={2}
                            style={nepaliTextStyle(13)}
                            className={cn("text-body text-foreground", mono && "text-caption font-num")}
                          >
                            {value}
                          </Text>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
        </TableScrollShell>
      )}
      <SeoContentSection route="holidays" />
    </AppShell>
  );
}
