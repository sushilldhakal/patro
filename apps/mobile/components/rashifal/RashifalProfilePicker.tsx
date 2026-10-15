import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Profile } from "@/lib/auth/client";
import { useRashifalProfilePicker } from "@vedic-patro/features/rashifal";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";

type Props = {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
};

export function RashifalProfilePicker({ selectedId, onSelect }: Props) {
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const picker = useRashifalProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy, menuOpen } = picker;

  const label = (
    <View className={cn("flex-row", rashifalClasses.picker.label)}>
      <Ionicons name="person-outline" size={16} color={colors.secondary} />
      <Text className={rashifalClasses.picker.labelText} style={nepaliTextStyle()}>
        {copy.label}
      </Text>
    </View>
  );

  if (picker.status === "guest") {
    return (
      <View className={cn("flex-row", rashifalClasses.picker.row)}>
        {label}
        <Pressable
          onPress={picker.openAuth}
          className={cn(rashifalClasses.picker.signInButton, "active:opacity-80")}
        >
          <Text className={rashifalClasses.picker.signInText}>{copy.signIn}</Text>
        </Pressable>
        <AuthDialog open={picker.authOpen} onOpenChange={picker.setAuthOpen} initialMode="login" />
      </View>
    );
  }

  if (picker.status === "empty") {
    return (
      <View className={cn("flex-row", rashifalClasses.picker.row)}>
        {label}
        <Text className={rashifalClasses.picker.empty}>
          {copy.empty}
        </Text>
      </View>
    );
  }

  return (
    <View className="items-center gap-1">
      <View className="flex-row flex-wrap items-center justify-center gap-2">
        {label}
        <Pressable
          onPress={picker.toggleMenu}
          disabled={picker.loading}
          className={cn("flex-row items-center gap-1 active:opacity-80", rashifalClasses.picker.select)}
        >
          <Text className={cn("flex-1", rashifalClasses.picker.selectText)} numberOfLines={1} style={nepaliTextStyle()}>
            {picker.current}
          </Text>
          <Ionicons name={menuOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {menuOpen && picker.status === "ready" ? (
        <View className={rashifalClasses.picker.menu}>
          {picker.options.map((o, i) => (
            <Pressable
              key={o.id ?? "__all"}
              onPress={() => picker.select(o.id)}
              className={cn(
                rashifalClasses.picker.menuItem,
                i === 0 && rashifalClasses.picker.menuItemDivider,
                "active:bg-muted",
                o.active && rashifalClasses.picker.menuItemActive,
              )}
            >
              <Text className={rashifalClasses.picker.menuText}>{o.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
