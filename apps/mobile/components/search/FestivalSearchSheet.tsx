import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, SectionList, TextInput, View } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHolidaysPage, type HolidayRow } from "@vedic-patro/features/holidays";
import { getCurrentBs, WEEKDAYS_SHORT, WEEKDAYS_SHORT_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { space } from "@vedic-patro/design-tokens";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
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
 * Festival search, drawn like Apple Calendar's: the days as headings with each festival under its
 * day, and the search field floating at the foot of the screen beside a round close button. With
 * nothing typed it lists what is coming from today; typing searches the whole Bikram Sambat year.
 * iOS raises it as the system page sheet (the same motion as "+"), Android slides it up.
 */
export function FestivalSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
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

  /* The field sits on the keyboard as it rises, frame by frame, like Voice Memos' and Calendar's.
     (KeyboardAvoidingView measured the page sheet wrong and left the field under the keyboard.) */
  const keyboard = useAnimatedKeyboard();
  const restOffset = Math.max(insets.bottom, space.md);
  // Android resizes the window for the keyboard itself, so the field is already above it there.
  const followKeyboard = Platform.OS === "ios";
  /* Everything the bar needs is in this one animated style: a plain style or class beside an
     animated one gets dropped. */
  const barStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    transform: [
      { translateY: -Math.max((followKeyboard ? keyboard.height.get() : 0) + space.sm, restOffset) },
    ],
  }));

  const close = () => {
    haptics.tick();
    onClose();
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          // The rows scroll clear of the keyboard (iOS); the floating field rides on top of it.
          automaticallyAdjustKeyboardInsets
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingTop: Platform.OS === "ios" ? space.lg : insets.top + space.sm,
            paddingHorizontal: space.xl,
            // Clear of the floating search field.
            paddingBottom: space["5xl"] * 2.5,
          }}
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

        {/* The floating search field and the round close button, at the foot like Apple Calendar's. */}
        <Animated.View style={barStyle}>
          <View className="h-14 min-w-0 flex-1 flex-row items-center gap-2 rounded-full border border-border bg-card px-4 shadow-md">
            <Ionicons name="search-outline" size={22} color={colors.foreground} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={t("ui.search.festivals_placeholder")}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={t("ui.search.festivals_title")}
              returnKeyType="search"
              autoCorrect={false}
              className="min-w-0 flex-1 text-body text-foreground"
              style={nepaliTextStyle(18)}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel={t("ui.search.search")}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t("ui.search.cancel")}
            className="h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-md active:opacity-60"
          >
            <Ionicons name="close" size={26} color={colors.foreground} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
