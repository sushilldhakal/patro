import { useMemo, useState, type ReactNode } from "react";
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
import { formatHolidayBsDisplay } from "@vedic-patro/domain/panchanga-format";
import { useThemeColors } from "@/lib/theme-context";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { TableScrollShell, tableColumnLayout, useTableFillLayout } from "@/components/ui/DataTable";
import { cn } from "@vedic-patro/domain/utils";
import { holidaysClasses } from "@vedic-patro/design-tokens/classes/holidays-classes";

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
  { key: "adDate", ne: "ई.सं. मिति", en: "AD Date", width: 124 },
  { key: "days", ne: "दिन", en: "Days", width: 80 },
  { key: "type", ne: "प्रकार", en: "Type", width: 124 },
] as const;

const FESTIVAL_COLUMNS = [
  { key: "name", ne: "नाम", en: "Name", width: 200 },
  { key: "bsDate", ne: "वि.सं. मिति", en: "BS Date", width: 160 },
  { key: "adDate", ne: "ई.सं. मिति", en: "AD Date", width: 124 },
  { key: "type", ne: "प्रकार", en: "Type", width: 124 },
  { key: "isPublic", ne: "सरकारी बिदा", en: "Gov't Holiday", width: 124 },
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
    queryFn: () => fetchFestivals(year, { language: lang }),
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
    { id: "holidays" as const, ne: "सरकारी बिदा", en: "Government Holidays", icon: "flag" as const, count: holidays.length },
    { id: "festivals" as const, ne: "सबै पर्वहरू", en: "All Festivals", icon: "party-popper" as const, count: festivals.length },
  ];

  return (
    <AppShell title={t("nav.holidays")} showHeader={false}>
      <PatroPageHeader
        className="mb-8"
        icon={<AppNavIcon name="party-popper" size={24} color={colors.secondary} />}
        title={t("holidays.page_title")}
        subtitle={t("holidays.page_subtitle")}
      />

      <PatroYearNavBlock
        className="mb-8"
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        gregorianRange={gregorianRange}
      />

      <View className={cn("mb-8", holidaysClasses.tabBar)}>
        {tabs.map((item) => {
          const active = tab === item.id;
          const tint = active ? colors.secondary : colors.foreground;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              className={cn(
                holidaysClasses.tab,
                "active:opacity-70",
                active ? holidaysClasses.tabActive : holidaysClasses.tabIdle,
              )}
            >
              {item.icon === "party-popper" ? (
                <AppNavIcon name="party-popper" size={16} color={tint} />
              ) : (
                <Ionicons name="flag-outline" size={16} color={tint} />
              )}
              <Text
                style={nepaliTextStyle()}
                className={cn(holidaysClasses.tabLabel, active ? holidaysClasses.tabLabelActive : holidaysClasses.tabLabelIdle)}
              >
                {pick(item.ne, item.en)}
              </Text>
              {item.count > 0 ? (
                <View className={holidaysClasses.tabCount}>
                  <Text className={holidaysClasses.tabCountText}>{digits(item.count)}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className={cn("mb-8 flex-row items-center gap-2 px-3", holidaysClasses.searchBox)}>
        <Ionicons name="search" size={16} color={colors.foreground} />
        <TextInput
          className={cn("flex-1", holidaysClasses.searchInput)}
          value={filter}
          onChangeText={setFilter}
          placeholder={t("ui.holidays.search_festivals")}
          placeholderTextColor={colors.mutedForeground}
        />
        {filter ? (
          <Pressable onPress={() => setFilter("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {isError ? (
        <View className={cn("mb-8", holidaysClasses.errorBox)}>
          <Text className={holidaysClasses.errorText} style={nepaliTextStyle()}>
            {t("holidays.error")}
          </Text>
        </View>
      ) : loading ? (
        <Text className="mb-8 text-sm text-muted-foreground" style={nepaliTextStyle()}>
          {t("common.loading")}
        </Text>
      ) : (
        <View className="mb-8">
          <TableScrollShell className="bg-transparent">
            <View className={cn("w-full flex-row", holidaysClasses.tableHead)}>
              {columns.map((col) => {
                const active = sort.key === col.key;
                return (
                  <HolidayHeaderCell key={col.key} width={col.width} onPress={() => toggleSort(col.key as keyof Row)}>
                    <Text
                      numberOfLines={1}
                      className={cn("shrink", holidaysClasses.headText)}
                      style={nepaliTextStyle()}
                    >
                      {pick(col.ne, col.en)}
                    </Text>
                    <Ionicons
                      name={active ? (sort.dir === "asc" ? "chevron-up" : "chevron-down") : "swap-vertical"}
                      size={12}
                      color={colors.foreground}
                      style={active ? undefined : { opacity: 0.4 }}
                    />
                  </HolidayHeaderCell>
                );
              })}
            </View>

            {rows.length === 0 ? (
              <View className={holidaysClasses.emptyCell}>
                <Text className={holidaysClasses.emptyText} style={nepaliTextStyle()}>
                  {t("avakahada.no_results")}
                </Text>
              </View>
            ) : (
              rows.map((row) => (
                <View key={row.key} className={cn("w-full flex-row", holidaysClasses.row)}>
                  {columns.map((col) => {
                    if (col.key === "type") {
                      return (
                        <HolidayCell key={col.key} width={col.width}>
                          <View className={cn("self-start", holidaysClasses.typeBadge)}>
                            <Text className={holidaysClasses.typeBadgeText} style={nepaliTextStyle()}>
                              {row.type}
                            </Text>
                          </View>
                        </HolidayCell>
                      );
                    }
                    if (col.key === "isPublic") {
                      return (
                        <HolidayCell key={col.key} width={col.width}>
                          {row.isPublic ? (
                            <View className={holidaysClasses.govtFlag}>
                              <Ionicons name="flag-outline" size={12} color={colors.destructive} />
                              <Text className={holidaysClasses.govtFlagText} style={nepaliTextStyle()}>
                                {t("common.yes")}
                              </Text>
                            </View>
                          ) : null}
                        </HolidayCell>
                      );
                    }
                    const mono = col.key === "bsDate" || col.key === "adDate";
                    const value = row[col.key as keyof Row] as string;
                    return (
                      <HolidayCell key={col.key} width={col.width}>
                        <Text
                          style={nepaliTextStyle()}
                          className={col.key === "name" ? holidaysClasses.cellName : mono ? holidaysClasses.cellMono : holidaysClasses.cellText}
                        >
                          {value}
                        </Text>
                      </HolidayCell>
                    );
                  })}
                </View>
              ))
            )}
          </TableScrollShell>
        </View>
      )}
      <SeoContentSection route="holidays" />
    </AppShell>
  );
}

/* Web table cells are `px-4 py-3`; the shared TableCell pads 10/8, so the
   rows here are built from the same column layout with the web padding. */
function HolidayHeaderCell({
  width,
  onPress,
  children,
}: {
  width: number;
  onPress: () => void;
  children: ReactNode;
}) {
  const { fill } = useTableFillLayout();
  return (
    <Pressable
      onPress={onPress}
      style={tableColumnLayout(fill, width)}
      className={cn("flex-row items-center gap-1 active:opacity-70", holidaysClasses.headCell)}
    >
      {children}
    </Pressable>
  );
}

function HolidayCell({ width, children }: { width: number; children?: ReactNode }) {
  const { fill } = useTableFillLayout();
  return (
    <View style={tableColumnLayout(fill, width)} className={cn("items-start justify-center", holidaysClasses.cell)}>
      {children}
    </View>
  );
}
