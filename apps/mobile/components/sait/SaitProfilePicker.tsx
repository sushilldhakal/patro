import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Text } from "@/components/ui/Text";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { useProfilesQuery } from "@/lib/kundali/profiles-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

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
  const { pick } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoint();
  const { isAuthenticated } = useAuth();
  const { data: profiles, isLoading } = useProfilesQuery(isAuthenticated);
  const [authOpen, setAuthOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const label = (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name="person-outline" size={15} color={colors.secondary} />
      <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(13)}>
        {pick("आफ्नो प्रोफाइलअनुसार", "Personalise")}
      </Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <>
        <View className="flex-row flex-wrap items-center gap-2">
          {label}
          <Pressable
            onPress={() => setAuthOpen(true)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 active:opacity-80"
          >
            <Text
              style={{ color: colors.primary, ...nepaliTextStyle(12) }}
              className="text-caption font-semibold"
            >
              {pick("प्रोफाइल छान्न लग-इन गर्नुहोस्", "Sign in to pick your profile")}
            </Text>
          </Pressable>
        </View>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
      </>
    );
  }

  if (profiles && profiles.length === 0) {
    return (
      <View className="flex-row flex-wrap items-center gap-2">
        {label}
        <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
          {pick(
            "सेभ गरिएको प्रोफाइल छैन — खातामा थप्नुहोस्।",
            "No saved profiles — add one in your account.",
          )}
        </Text>
      </View>
    );
  }

  const selected = profiles?.find((p) => p.id === selectedId) ?? null;
  const buttonLabel = isLoading
    ? pick("लोड हुँदै…", "Loading…")
    : (selected?.full_name ?? pick("सामान्य (प्रोफाइल बिना)", "General (no profile)"));

  const options: { id: string | null; name: string }[] = [
    { id: null, name: pick("सामान्य (प्रोफाइल बिना)", "General (no profile)") },
    ...(profiles ?? []).map((p) => ({ id: p.id, name: p.full_name })),
  ];

  const sheet = (
    <View>
      <View className="border-b border-border px-4 py-3">
        <Text className="text-body font-semibold text-foreground" style={nepaliTextStyle(15)}>
          {pick("प्रोफाइल छान्नुहोस्", "Choose a profile")}
        </Text>
      </View>
      <ScrollView>
        {options.map((opt) => {
          const active = (opt.id ?? null) === (selectedId ?? null);
          return (
            <Pressable
              key={opt.id ?? "__none"}
              onPress={() => {
                onSelect(opt.id ? (profiles?.find((p) => p.id === opt.id) ?? null) : null);
                setSheetOpen(false);
              }}
              style={active ? { backgroundColor: colorWithAlpha("#0b565a", 0.1) } : undefined}
              className="flex-row items-center justify-between gap-3 border-b border-border px-4 py-3.5 active:opacity-80"
            >
              <Text
                numberOfLines={1}
                style={{
                  color: active ? colors.secondary : colors.foreground,
                  ...nepaliTextStyle(14),
                }}
                className="text-body shrink"
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
      <View className="flex-row flex-wrap items-center gap-2">
        {label}
        <Pressable
          disabled={isLoading}
          onPress={() => setSheetOpen(true)}
          style={{ minWidth: 160, maxWidth: 256, opacity: isLoading ? 0.6 : 1 }}
          className="h-9 flex-row items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 active:bg-muted"
        >
          <Text
            numberOfLines={1}
            className="text-body shrink text-foreground"
            style={nepaliTextStyle(13)}
          >
            {buttonLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <BottomSheetModal
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
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
