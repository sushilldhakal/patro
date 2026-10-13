import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { useProfilesQuery } from "@/lib/kundali/profiles-query";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";

type Props = {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
};

export function RashifalProfilePicker({ selectedId, onSelect }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: profiles, isLoading } = useProfilesQuery(isAuthenticated);

  const label = (
    <View className={cn("flex-row", rashifalClasses.picker.label)}>
      <Ionicons name="person-outline" size={16} color={colors.secondary} />
      <Text className={rashifalClasses.picker.labelText} style={nepaliTextStyle()}>
        {t("ui.rashifal.profile")}
      </Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View className={cn("flex-row", rashifalClasses.picker.row)}>
        {label}
        <Pressable
          onPress={() => setAuthOpen(true)}
          className={cn(rashifalClasses.picker.signInButton, "active:opacity-80")}
        >
          <Text className={rashifalClasses.picker.signInText}>{t("ui.rashifal.sign_in")}</Text>
        </Pressable>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
      </View>
    );
  }

  if (!isLoading && profiles?.length === 0) {
    return (
      <View className={cn("flex-row", rashifalClasses.picker.row)}>
        {label}
        <Text className={rashifalClasses.picker.empty}>
          {t("ui.rashifal.add_a_kundali_profile")}
        </Text>
      </View>
    );
  }

  const selected = profiles?.find((p) => p.id === selectedId) ?? null;
  const buttonLabel = selected
    ? selected.full_name
    : isLoading
      ? t("ui.rashifal.loading")
      : t("rashifal.profile.all_signs");

  return (
    <View className="items-center gap-1">
      <View className="flex-row flex-wrap items-center justify-center gap-2">
        {label}
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          disabled={isLoading}
          className={cn("flex-row items-center gap-1 active:opacity-80", rashifalClasses.picker.select)}
        >
          <Text className={cn("flex-1", rashifalClasses.picker.selectText)} numberOfLines={1} style={nepaliTextStyle()}>
            {buttonLabel}
          </Text>
          <Ionicons name={menuOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {menuOpen && profiles?.length ? (
        <View className={rashifalClasses.picker.menu}>
          <Pressable
            onPress={() => {
              onSelect(null);
              setMenuOpen(false);
            }}
            className={cn(
              rashifalClasses.picker.menuItem,
              rashifalClasses.picker.menuItemDivider,
              "active:bg-muted",
              !selectedId && rashifalClasses.picker.menuItemActive,
            )}
          >
            <Text className={rashifalClasses.picker.menuText}>{t("rashifal.profile.all_signs")}</Text>
          </Pressable>
          {profiles.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                onSelect(p);
                setMenuOpen(false);
              }}
              className={cn(
                rashifalClasses.picker.menuItem,
                "active:bg-muted",
                p.id === selectedId && rashifalClasses.picker.menuItemActive,
              )}
            >
              <Text className={rashifalClasses.picker.menuText}>{p.full_name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
