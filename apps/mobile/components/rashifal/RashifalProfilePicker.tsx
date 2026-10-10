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
import { cn } from "@/lib/utils";
import { nepaliTextStyle } from "@/lib/nepali-text";

type Props = {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
};

export function RashifalProfilePicker({ selectedId, onSelect }: Props) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: profiles, isLoading } = useProfilesQuery(isAuthenticated);

  const label = (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name="person-outline" size={16} color={colors.secondary} />
      <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(14)}>
        {pick("प्रोफाइल", "Profile")}
      </Text>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View className="flex-row flex-wrap items-center gap-2">
        {label}
        <Pressable
          onPress={() => setAuthOpen(true)}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 active:opacity-80"
        >
          <Text className="text-caption font-semibold text-primary">{pick("साइन इन", "Sign in")}</Text>
        </Pressable>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
      </View>
    );
  }

  if (!isLoading && profiles?.length === 0) {
    return (
      <View className="flex-row flex-wrap items-center gap-2">
        {label}
        <Text className="text-caption text-muted-foreground">
          {pick("कुण्डली प्रोफाइल थप्नुहोस्।", "Add a kundali profile.")}
        </Text>
      </View>
    );
  }

  const selected = profiles?.find((p) => p.id === selectedId) ?? null;
  const buttonLabel = selected
    ? selected.full_name
    : isLoading
      ? pick("लोड…", "Loading…")
      : pick("सबै राशि", "All signs");

  return (
    <View className="items-center gap-1">
      <View className="flex-row flex-wrap items-center justify-center gap-2">
        {label}
        <Pressable
          onPress={() => setMenuOpen((v) => !v)}
          disabled={isLoading}
          className="min-h-9 max-w-[16rem] flex-row items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 active:opacity-80"
        >
          <Text className="text-body flex-1 text-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
            {buttonLabel}
          </Text>
          <Ionicons name={menuOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {menuOpen && profiles?.length ? (
        <View className="w-full max-w-sm overflow-hidden rounded-lg border border-border bg-card">
          <Pressable
            onPress={() => {
              onSelect(null);
              setMenuOpen(false);
            }}
            className={cn(
              "border-b border-border/60 px-3 py-2.5 active:bg-muted",
              !selectedId && "bg-tab-active",
            )}
          >
            <Text className="text-body font-medium text-foreground">{pick("सबै राशि", "All signs")}</Text>
          </Pressable>
          {profiles.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                onSelect(p);
                setMenuOpen(false);
              }}
              className={cn("px-3 py-2.5 active:bg-muted", p.id === selectedId && "bg-tab-active")}
            >
              <Text className="text-body text-foreground">{p.full_name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
