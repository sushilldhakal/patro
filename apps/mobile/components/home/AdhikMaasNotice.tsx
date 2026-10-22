import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { useAdhikMaasNotice } from "@vedic-patro/features/home";

/** "This year's adhik maas" — one quiet row under the calendar; a tap opens the month, its span and a jump to it. */
export function AdhikMaasNotice({
  bsYear,
  onJump,
}: {
  bsYear: number;
  /** Shows the adhik month's BS month in the calendar; omitted when the calendar can't jump there. */
  onJump?: (year: number, month: number) => void;
}) {
  const colors = useThemeColors();
  const notice = useAdhikMaasNotice(bsYear);
  if (!notice) return null;

  return (
    <View className="rounded-xl border border-border bg-card">
      <Pressable
        onPress={notice.toggle}
        className="flex-row items-center gap-2.5 px-3 py-2 active:opacity-80"
        accessibilityRole="button"
        accessibilityState={{ expanded: notice.open }}
        accessibilityLabel={notice.label}
      >
        <Ionicons name="moon-outline" size={16} color={colors.secondary} />
        <Text numberOfLines={1} className="min-w-0 flex-1 text-sm text-foreground" style={nepaliTextStyle()}>
          {notice.label}
        </Text>
        <Ionicons name={notice.open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </Pressable>
      {notice.open ? (
        <View className="border-t border-border px-3 pb-3 pt-2">
          <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle()}>
            {notice.detail}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-muted-foreground" style={nepaliTextStyle()}>
            {notice.why}
          </Text>
          {onJump ? (
            <Pressable
              onPress={() => onJump(notice.target.year, notice.target.month)}
              className="mt-2 self-start active:opacity-70"
              accessibilityRole="button"
            >
              <Text className="text-xs font-medium text-secondary" style={nepaliTextStyle()}>
                {notice.jumpLabel} →
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
