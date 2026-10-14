import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import type { BsCalendarFestivalDialog } from "@vedic-patro/features/home";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { calendarClasses } from "@vedic-patro/design-tokens/classes/calendar-classes";

type Props = {
  visible: boolean;
  dialog: BsCalendarFestivalDialog | null;
  onClose: () => void;
};

export function FestivalListSheet({ visible, dialog, onClose }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { lang } = useLocale();

  if (!dialog) return null;

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
        className="px-4 py-3.5"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          className="text-body font-bold text-foreground"
          style={lang === "en" ? undefined : nepaliTextStyle(16)}
        >
          {dialog.title}
        </Text>
        <Text className="text-body mt-1 text-muted-foreground" style={lang === "en" ? undefined : nepaliTextStyle(14)}>
          {dialog.description}
        </Text>
      </View>
      <ScrollView contentContainerClassName="gap-2 p-4">
        {dialog.festivals.map((name, i) => (
          <View
            key={`${name}-${i}`}
            className={calendarClasses.festivalItem}
          >
            <Text
              className={calendarClasses.festivalItemText}
              style={nepaliTextStyle()}
            >
              {name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </BottomSheetModal>
  );
}
