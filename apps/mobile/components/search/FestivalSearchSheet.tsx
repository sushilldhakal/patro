import { useEffect, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useHolidaysPage } from "@vedic-patro/features/holidays";
import { getCurrentBs } from "@vedic-patro/domain/calendar/bs-calendar";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

/**
 * The search icon in the header and in the iPhone Duo toolbar: festivals and holidays of this
 * Bikram Sambat year, filtered as you type. Raised as the system page sheet on iOS, a bottom
 * sheet on Android. A result opens the full list on the Holidays page.
 */
export function FestivalSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { location } = usePanchangaLocation();
  const page = useHolidaysPage({ year: getCurrentBs().year, era: "bs", location: location.params });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  const { setSearch } = page;
  useEffect(() => setSearch(query), [query, setSearch]);

  return (
    <BottomSheetModal variant="page" visible={open} onClose={onClose} maxHeight="88%">
      <View className="gap-3 p-4" style={{ minHeight: 420 }}>
        <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
          {t("ui.search.festivals_title")}
        </Text>
        <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t("ui.search.festivals_placeholder")}
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            autoCorrect={false}
            className="flex-1 py-3 text-body text-foreground"
            style={nepaliTextStyle(16)}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel={t("ui.search.search")}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row gap-2">
          {page.tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => page.setTab(tab.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: tab.active }}
              className={tab.active ? "rounded-full bg-secondary px-3 py-1.5" : "rounded-full border border-border bg-card px-3 py-1.5"}
            >
              <Text
                className={tab.active ? "text-caption font-bold text-secondary-foreground" : "text-caption text-foreground"}
              >
                {tab.label}
                {tab.count > 0 ? ` · ${tab.countLabel}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
        {page.status === "loading" ? (
          <Text className="text-body text-muted-foreground">{page.copy.loading}</Text>
        ) : page.rows.length === 0 ? (
          <Text className="text-body text-muted-foreground">{page.copy.empty}</Text>
        ) : (
          <FlatList
            data={page.rows.slice(0, 60)}
            keyExtractor={(row) => row.key}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onClose();
                  router.push("/holidays" as never);
                }}
                className="gap-0.5 py-3 active:opacity-60"
              >
                <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(16)}>
                  {item.name}
                </Text>
                <Text className="text-caption text-muted-foreground">
                  {item.bsDate} · {item.adDate}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </BottomSheetModal>
  );
}
