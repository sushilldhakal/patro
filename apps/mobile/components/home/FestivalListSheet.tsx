import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import type { CalendarDay } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { useThemeColors } from "@/lib/theme-context";

type Props = {
  visible: boolean;
  day: CalendarDay | null;
  festivals: string[];
  onClose: () => void;
};

export function FestivalListSheet({ visible, day, festivals, onClose }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { pick, digits, lang } = useLocale();

  if (!day) return null;

  const weekday = pick(day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday);
  const adDate = parseCivilIsoToDate(day.date_ad).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      maxHeight="70%"
      sheetStyle={{
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          className="text-body font-bold text-foreground"
          style={lang === "en" ? undefined : nepaliTextStyle(16)}
        >
          {pick("चाडपर्व", "Festivals")}
        </Text>
        <Text className="text-body mt-1 text-muted-foreground" style={lang === "en" ? undefined : nepaliTextStyle(14)}>
          {weekday} · {pick("वि.सं.", "BS")} {digits(day.day)} · {adDate}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {festivals.map((name, i) => (
          <View
            key={`${name}-${i}`}
            className="rounded-lg border border-border bg-muted/40 px-3 py-2.5"
          >
            <Text
              className="text-body font-semibold text-foreground"
              style={lang === "en" ? undefined : nepaliTextStyle(14)}
            >
              {name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </BottomSheetModal>
  );
}
