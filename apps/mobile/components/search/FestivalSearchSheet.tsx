import { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useRouter } from "expo-router";
import { useHolidaysPage, type HolidayRow } from "@vedic-patro/features/holidays";
import { useLearnHub } from "@vedic-patro/features/learn";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { useNavPages } from "@/components/navigation/MobileNavMenu";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import type { DrawerIconName } from "@/lib/drawer-icons";
import { getCurrentBs, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { Ionicons } from "@/components/icons/Ionicons";
import { SearchSheetFrame } from "@/components/search/SearchSheetFrame";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

/** A page of the app or a Learn article, listed above the festivals while something is typed. */
type LinkRow = { kind: "link"; key: string; label: string; href: string; icon: DrawerIconName | null };
type Row = HolidayRow | LinkRow;
type Section = { key: string; title: string; first: boolean; tone?: "plain"; data: Row[] };

const MAX_LINKS = 6;
const isLink = (row: Row): row is LinkRow => (row as LinkRow).kind === "link";

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
 * The app's one search, drawn like Apple Calendar's (SearchSheetFrame). With nothing typed it lists the
 * festivals coming from today, under their days. Typing also finds the app's pages (every side-menu
 * entry: "चौघडिया", "रूपान्तरण"…) and Learn articles, above the festivals of the whole Bikram Sambat year.
 */
export function FestivalSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { location } = usePanchangaLocation();
  const page = useHolidaysPage({ year: getCurrentBs().year, era: "bs", location: location.params });
  const [query, setQuery] = useState("");
  const pages = useNavPages();
  const learn = useLearnHub();
  const { setQuery: setLearnQuery } = learn;
  useEffect(() => setLearnQuery(query), [query, setLearnQuery]);

  const { setSearch, setTab } = page;
  // Every festival: the public holidays are among them, marked in red.
  useEffect(() => setTab("festivals"), [setTab]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  useEffect(() => setSearch(query), [query, setSearch]);

  const sections = useMemo((): Section[] => {
    const today = new Date().toISOString().slice(0, 10);
    const q = query.trim().toLowerCase();
    const rows = q ? page.rows : page.rows.filter((row) => row.adDate >= today);
    const festivals = groupByDay(rows, lang === "en" ? WEEKDAYS_SHORT : WEEKDAYS_SHORT_NE);
    if (!q) return festivals;
    const pageRows: LinkRow[] = pages
      .filter((p) => p.label.toLowerCase().includes(q))
      .slice(0, MAX_LINKS)
      .map((p) => ({ kind: "link", key: `page:${p.href}`, label: p.label, href: p.href, icon: p.icon }));
    const articleRows: LinkRow[] = learn.results
      .slice(0, MAX_LINKS)
      .map((a) => ({ kind: "link", key: `learn:${a.slug}`, label: a.title, href: hrefForLearnSlug(a.slug) as string, icon: "book-open" }));
    const links: Section[] = [
      ...(pageRows.length ? [{ key: "pages", title: t("ui.search.pages"), first: false, tone: "plain" as const, data: pageRows }] : []),
      ...(articleRows.length ? [{ key: "articles", title: t("ui.search.articles"), first: false, tone: "plain" as const, data: articleRows }] : []),
    ];
    return [...links, ...festivals.map((s) => ({ ...s, first: s.first && links.length === 0 }))];
  }, [page.rows, query, lang, pages, learn.results, t]);

  return (
    <SearchSheetFrame
      open={open}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      placeholder={t("ui.search.everything_placeholder")}
      label={t("ui.search.festivals_title")}
    >
      {(contentContainerStyle) => (
        <SectionList
          sections={sections}
          keyExtractor={(row: Row) => row.key}
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
                style={[nepaliTextStyle(19), { color: section.first && section.tone !== "plain" ? colors.danger : colors.foreground }]}
              >
                {section.title}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          renderItem={({ item }) =>
            isLink(item) ? (
              <Pressable
                onPress={() => {
                  onClose();
                  router.push(item.href as never);
                }}
                className="flex-row items-center gap-3 py-3.5 active:opacity-60"
              >
                <View className="h-6 w-6 items-center justify-center">
                  {item.icon ? <AppNavIcon name={item.icon} size={18} color={colors.secondary} /> : null}
                </View>
                <Text className="min-w-0 flex-1 text-body text-foreground" numberOfLines={1} style={nepaliTextStyle(18)}>
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : (
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
            )
          }
        />
      )}
    </SearchSheetFrame>
  );
}
