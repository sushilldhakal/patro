import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { AuthDialog } from "./AuthDialog";

/** Signed-out → लग-इन button; signed-in → avatar + account sheet. Mirrors web AccountMenu. */
export function AccountMenu() {
  const colors = useThemeColors();
  const { pick } = useLocale();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return <View className="h-8 w-8 rounded-full bg-muted" />;
  }

  if (!user) {
    return (
      <>
        <Pressable
          onPress={() => setAuthOpen(true)}
          className="h-9 flex-row items-center gap-1.5 rounded-lg border border-border bg-card px-3 active:bg-muted"
          accessibilityRole="button"
        >
          <Ionicons name="person-outline" size={15} color={colors.foreground} />
          <Text className="text-body font-semibold text-foreground">{pick("लग-इन", "Sign in")}</Text>
        </Pressable>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="login" />
      </>
    );
  }

  const initial = user.email.charAt(0).toUpperCase();

  return (
    <>
      <Pressable
        onPress={() => setMenuOpen(true)}
        className="h-8 w-8 items-center justify-center rounded-full bg-secondary/15 active:opacity-80"
        accessibilityLabel={pick("खाता मेनु", "Account menu")}
      >
        <Text className="text-body font-bold text-secondary">{initial}</Text>
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          className="flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setMenuOpen(false)}
        />
        <View
          className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border pb-8"
          style={{ backgroundColor: colors.card }}
        >
          <View className="items-center pt-2.5">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: colors.border }} />
          </View>
          <View className="flex-row items-center gap-3 px-4 py-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary/15">
              <Ionicons name="person-circle-outline" size={28} color={colors.secondary} />
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-body font-semibold text-foreground">
                {user.email}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                {user.is_verified ? (
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                ) : null}
                <Text className="text-caption text-muted-foreground">
                  {user.is_verified
                    ? pick("प्रमाणित", "Verified")
                    : pick("इमेल प्रमाणित भएको छैन", "Email not verified")}
                </Text>
              </View>
            </View>
          </View>
          <View className="mx-4 h-px bg-border" />
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              router.push("/account" as never);
            }}
            className="mx-2 mt-2 flex-row items-center gap-3 rounded-xl px-4 py-3.5 active:bg-muted"
          >
            <Ionicons name="person-outline" size={20} color={colors.foreground} />
            <Text className="text-body text-foreground">
              {pick("खाता र प्रोफाइल", "Account & profiles")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              void logout();
            }}
            className="mx-2 flex-row items-center gap-3 rounded-xl px-4 py-3.5 active:bg-muted"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.foreground} />
            <Text className="text-body text-foreground">{pick("लग-आउट", "Sign out")}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
