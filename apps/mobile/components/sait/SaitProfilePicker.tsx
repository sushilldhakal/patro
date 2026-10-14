import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Text } from "@/components/ui/Text";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { useSaitProfilePicker } from "@vedic-patro/features/sait";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";

/**
 * Lets a signed-in user pick one of their saved profiles so the sait dates get
 * a native (birth-chart) verdict. Guests get a "sign in to personalise" chip.
 *
 * The web app uses a `<select>`; on native that becomes a bottom sheet, the
 * same pattern the rest of the app uses for option lists.
 */
export function SaitProfilePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const { isAuthenticated } = useAuth();
  const picker = useSaitProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy } = picker;

  const label = (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name="person-outline" size={16} color={colors.secondary} />
      <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle()}>
        {copy.label}
      </Text>
    </View>
  );

  if (picker.status === "guest") {
    return (
      <>
        <View className={saitClasses.pickerRow}>
          {label}
          <Pressable
            onPress={picker.openAuth}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-primary" style={nepaliTextStyle()}>
              {copy.signIn}
            </Text>
          </Pressable>
        </View>
        <AuthDialog open={picker.authOpen} onOpenChange={picker.setAuthOpen} initialMode="login" />
      </>
    );
  }

  if (picker.status === "empty") {
    return (
      <View className={saitClasses.pickerRow}>
        {label}
        <Text className="text-xs text-muted-foreground" style={nepaliTextStyle()}>
          {copy.empty}
        </Text>
      </View>
    );
  }

  const sheet = (
    <View>
      <View className="border-b border-border px-4 py-3">
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle()}>
          {picker.sheetTitle}
        </Text>
      </View>
      <ScrollView>
        {picker.options.map((opt) => {
          const { active } = opt;
          return (
            <Pressable
              key={opt.id ?? "__none"}
              onPress={() => picker.select(opt.id)}
              className={cn(
                "flex-row items-center justify-between gap-3 border-b border-border px-4 py-3.5 active:opacity-80",
                active && "bg-secondary/10",
              )}
            >
              <Text
                numberOfLines={1}
                style={nepaliTextStyle()}
                className={cn("shrink text-sm", active ? "text-secondary" : "text-foreground")}
              >
                {opt.name}
              </Text>
              {active ? (
                <Ionicons name="checkmark" size={17} color={colors.secondary} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <>
      <View className={saitClasses.pickerRow}>
        {label}
        <Pressable
          disabled={picker.loading}
          onPress={() => picker.setMenuOpen(true)}
          style={{ opacity: picker.loading ? 0.6 : 1 }}
          className="h-9 min-w-[10rem] max-w-[16rem] flex-row items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 active:bg-muted"
        >
          <Text
            numberOfLines={1}
            className="shrink text-sm text-foreground"
            style={nepaliTextStyle()}
          >
            {picker.current}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <BottomSheetModal
        visible={picker.menuOpen}
        onClose={() => picker.setMenuOpen(false)}
        variant={isTablet ? "center" : "bottom"}
        maxHeight="70%"
        sheetStyle={{
          backgroundColor: colors.card,
          paddingBottom: Math.max(insets.bottom, 12),
          ...(isTablet
            ? { borderWidth: 1, borderColor: colors.border }
            : { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: colors.border }),
        }}
      >
        {sheet}
      </BottomSheetModal>
    </>
  );
}

export default SaitProfilePicker;
