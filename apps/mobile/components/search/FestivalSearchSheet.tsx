import { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useRouter } from "expo-router";
import { useHolidaysPage, type HolidayRow } from "@vedic-patro/features/holidays";
import { getCurrentBs, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { Ionicons } from "@/components/icons/Ionicons";
import { SearchSheetFrame } from "@/components/search/SearchSheetFrame";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

type Section = { key: string; title: string; first: boolean; data: HolidayRow[] };

/** Rows by start day, in date order: Apple Calendar's search list. */
function groupByDay(rows: readonly HolidayRow[], weekdays: readonly string[]): Section[] {
  const sorted = [...rows].sort((a, b) => String(a.sortValues.adDate).localeCompare(String(b.sortValues.adDate)));
  const sections: Section[] = [];
  for (const row of sorted) {
    const last = sections[sections.length - 1];
    if (last && last.key === row.adDate) {
      last.data.push(row);
      continue;
    }
    const day = Number.isNaN(Date.parse(row.adDate)) ? null : new Date(`${row.adDate}T12:00:00Z`).getUTCDay();
    const weekday = day == null ? "" : `${weekdays[day]} – `;
    sections.push({ key: row.adDate, title: `${weekday}${row.bsDate}`, first: sections.length === 0, data: [row] });
  }
  return sections;
}

/**
 * Festival search, drawn like Apple Calendar's (SearchSheetFrame): the days as headings with each
 * festival under its day. With nothing typed it lists what is coming from today; typing searches the
 * whole Bikram Sambat year.
 */
export function FestivalSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { location } = usePanchangaLocation();
  const page = useHolidaysPage({ year: getCurrentBs().year, era: "bs", location: location.params });
  const [query, setQuery] = useState("");

  const { setSearch, setTab } = page;
  // Every festival: the public holidays are among them, marked in red.
  useEffect(() => setTab("festivals"), [setTab]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  useEffect(() => setSearch(query), [query, setSearch]);

  const sections = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = query.trim() ? page.rows : page.rows.filter((row) => row.adDate >= today);
    return groupByDay(rows, lang === "en" ? WEEKDAYS_SHORT : WEEKDAYS_SHORT_NE);
  }, [page.rows, query, lang]);

  return (
    <SearchSheetFrame
      open={open}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      placeholder={t("ui.search.festivals_placeholder")}
      label={t("ui.search.festivals_title")}
    >
      {(contentContainerStyle) => (
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // The rows scroll clear of the keyboard (iOS); the floating field rides on top of it.
          automaticallyAdjustKeyboardInsets
          stickySectionHeadersEnabled={false}
          contentContainerStyle={contentContainerStyle}
          ListEmptyComponent={
            <Text className="pt-10 text-center text-body text-muted-foreground">
              {page.status === "loading" ? page.copy.loading : page.copy.empty}
            </Text>
          }
          renderSectionHeader={({ section }) => (
            <View className="mt-6 border-b border-border pb-2">
              <Text
                className="text-title font-semibold"
                style={[nepaliTextStyle(19), { color: section.first ? colors.danger : colors.foreground }]}
              >
                {section.title}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onClose();
                router.push(`/day/${item.adDate}` as never);
              }}
              className="flex-row items-center gap-3 py-3.5 active:opacity-60"
            >
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: item.isPublic ? colors.danger : colors.secondary }}
              >
                <Ionicons name="star" size={13} color={colors.card} />
              </View>
              <Text className="min-w-0 flex-1 text-body text-foreground" numberOfLines={1} style={nepaliTextStyle(18)}>
                {item.name}
              </Text>
              <Text className="text-body text-muted-foreground" style={nepaliTextStyle(15)}>
                {item.isPublic ? t("ui.search.public_holiday") : t("ui.search.all_day")}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SearchSheetFrame>
  );
}
