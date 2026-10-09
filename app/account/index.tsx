import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { EMPTY_PROFILE, ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBiometricLock } from "@/lib/auth/BiometricLock";
import {
  apiResendVerification,
  deleteProfile,
  listProfiles,
  updateProfile,
  type Profile,
} from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

const ACCOUNT_PROFILES_KEY = ["account-profiles"] as const;

export default function AccountScreen() {
  const { pick } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, refreshUser, deleteAccount } = useAuth();
  const biometric = useBiometricLock();
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const [resent, setResent] = useState(false);

  const profilesQuery = useQuery({
    queryKey: ACCOUNT_PROFILES_KEY,
    queryFn: listProfiles,
    enabled: Boolean(user),
  });

  const profiles = profilesQuery.data ?? [];
  const reloadProfiles = () =>
    void queryClient.invalidateQueries({ queryKey: ACCOUNT_PROFILES_KEY });

  const onDelete = (p: Profile) => {
    Alert.alert(
      pick("प्रोफाइल मेट्ने?", "Delete profile?"),
      pick(
        `"${p.full_name}" स्थायी रूपमा मेटिनेछ।`,
        `"${p.full_name}" will be permanently removed.`,
      ),
      [
        { text: pick("रद्द", "Cancel"), style: "cancel" },
        {
          text: pick("मेट्नुहोस्", "Delete"),
          style: "destructive",
          onPress: async () => {
            await deleteProfile(p.id);
            reloadProfiles();
          },
        },
      ],
    );
  };

  const onMakeDefault = async (p: Profile) => {
    await updateProfile(p.id, { is_default: true });
    reloadProfiles();
  };

  if (authLoading) {
    return (
      <AppShell title={pick("खाता", "Account")}>
        <View className="items-center py-12">
          <ActivityIndicator />
        </View>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title={pick("खाता", "Account")}>
        <View className="items-center gap-3 rounded-xl border border-dashed border-border px-5 py-12">
          <Ionicons name="person-circle-outline" size={40} color={colors.mutedForeground} />
          <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("खाता हेर्न लगइन गर्नुहोस्।", "Log in to view your account.")}
          </Text>
          <Button
            label={pick("गृहपृष्ठ", "Go home")}
            variant="outline"
            size="sm"
            onPress={() => router.replace("/" as never)}
          />
        </View>

        <Pressable
          onPress={() => router.push("/account/offline-data" as never)}
          className="mt-6 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80"
        >
          <View className="flex-1 flex-row items-center gap-3 pr-3">
            <Ionicons name="download-outline" size={18} color={colors.secondary} />
            <View className="flex-1">
              <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(14)}>
                {pick("अफलाइन डाटा", "Offline Data")}
              </Text>
              <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(12)}>
                {pick(
                  "लगइन बिना पनि पात्रो अफलाइन डाटा व्यवस्थापन गर्न सकिन्छ।",
                  "Offline calendar data can be managed without logging in.",
                )}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
      </AppShell>
    );
  }

  return (
    <AppShell title={pick("खाता", "Account")} subtitle={user.email}>
      {!user.is_verified ? (
        <View
          style={{
            borderColor: "rgba(245,158,11,0.5)",
            backgroundColor: "rgba(245,158,11,0.12)",
          }}
          className="mb-6 flex-row items-start gap-3 rounded-lg border p-3"
        >
          <Ionicons name="mail-unread-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
          <View className="flex-1">
            <Text
              style={{ color: colors.primary, ...nepaliTextStyle(14) }}
              className="text-body"
            >
              {pick(
                "इमेल प्रमाणित गर्न बाँकी छ। तपाईंको इनबक्स जाँच्नुहोस्।",
                "Your email is not verified yet. Check your inbox.",
              )}
            </Text>
            <Pressable
              disabled={resent}
              onPress={async () => {
                await apiResendVerification();
                setResent(true);
              }}
              className="mt-1 self-start"
            >
              <Text
                style={{ color: colors.primary, opacity: resent ? 0.6 : 1, ...nepaliTextStyle(13) }}
                className="text-body font-semibold underline"
              >
                {resent
                  ? pick("पुनः पठाइयो", "Verification email sent")
                  : pick("पुनः पठाउनुहोस्", "Resend verification email")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-title font-semibold text-foreground" style={nepaliTextStyle(18)}>
          {pick("प्रोफाइलहरू", "Profiles")}
        </Text>
        {editing === null ? (
          <Button
            label={pick("प्रोफाइल थप", "Add profile")}
            size="sm"
            onPress={() => setEditing("new")}
          />
        ) : null}
      </View>

      {profilesQuery.isError ? (
        <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className="text-body mb-4">
          {pick("प्रोफाइल लोड गर्न सकिएन।", "Could not load your profiles.")}
        </Text>
      ) : null}

      {editing !== null ? (
        <ProfileForm
          initial={editing === "new" ? EMPTY_PROFILE : profileToInput(editing)}
          existing={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            reloadProfiles();
            await refreshUser();
          }}
        />
      ) : profilesQuery.isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : profiles.length === 0 ? (
        <View className="rounded-lg border border-dashed border-border py-10">
          <Text className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("अझै कुनै प्रोफाइल छैन।", "No profiles yet.")}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {profiles.map((p) => (
            <View
              key={p.id}
              className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    numberOfLines={1}
                    className="text-body shrink font-semibold text-foreground"
                    style={nepaliTextStyle(15)}
                  >
                    {p.full_name}
                  </Text>
                  {p.is_default ? (
                    <View
                      style={{ backgroundColor: colorWithAlpha("#0b565a", 0.15) }}
                      className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
                    >
                      <Ionicons name="star" size={10} color={colors.secondary} />
                      <Text
                        style={{ color: colors.secondary, ...nepaliTextStyle(10) }}
                        className="text-caption font-semibold"
                      >
                        {pick("पूर्वनिर्धारित", "Default")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  className="text-body mt-0.5 text-muted-foreground"
                  style={nepaliTextStyle(13)}
                >
                  {[
                    p.location_label || p.city,
                    p.birth_date && `${p.birth_date}${p.birth_time ? ` ${p.birth_time}` : ""}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || pick("जन्म विवरण छैन", "No birth details")}
                </Text>
              </View>
              <View className="shrink-0 flex-row items-center gap-1">
                {!p.is_default ? (
                  <IconBtn icon="star-outline" onPress={() => onMakeDefault(p)} />
                ) : null}
                <IconBtn icon="pencil-outline" onPress={() => setEditing(p)} />
                <IconBtn icon="trash-outline" tone={colors.destructive} onPress={() => onDelete(p)} />
              </View>
            </View>
          ))}
        </View>
      )}

      {biometric.available ? (
        <View className="mt-8 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5">
          <View className="flex-1 flex-row items-center gap-3 pr-3">
            <Ionicons name="finger-print-outline" size={18} color={colors.secondary} />
            <View className="flex-1">
              <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(14)}>
                {pick(`${biometric.label} ले खोल्नुहोस्`, `Unlock with ${biometric.label}`)}
              </Text>
              <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(12)}>
                {pick(
                  "तपाईं साइन इन नै रहनुहुन्छ; एप खोल्दा बायोमेट्रिक सोधिन्छ।",
                  "You stay signed in; the app asks for biometrics when opened.",
                )}
              </Text>
            </View>
          </View>
          <Switch
            value={biometric.enabled}
            onValueChange={(on) => void biometric.setEnabled(on)}
            trackColor={{ true: colors.secondary }}
            accessibilityLabel={pick("बायोमेट्रिक लक", "Biometric lock")}
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push("/account/offline-data" as never)}
        className="mt-3 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80"
      >
        <View className="flex-1 flex-row items-center gap-3 pr-3">
          <Ionicons name="download-outline" size={18} color={colors.secondary} />
          <View className="flex-1">
            <Text className="text-body font-medium text-foreground" style={nepaliTextStyle(14)}>
              {pick("अफलाइन डाटा", "Offline Data")}
            </Text>
            <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick(
                "इन्टरनेट बिना पात्रो हेर्न वर्षहरू व्यवस्थापन गर्नुहोस्।",
                "Manage the calendar years downloaded for offline use.",
              )}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </Pressable>

      <View className="mt-10 border-t border-border pt-6">
        <Text className="text-body font-semibold text-destructive" style={nepaliTextStyle(16)}>
          {pick("खाता मेटाउनुहोस्", "Delete account")}
        </Text>
        <Text className="text-body mt-1 text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick(
            "खाता र सबै कुण्डली प्रोफाइल स्थायी रूपमा मेटिनेछन्। यो फिर्ता हुँदैन।",
            "Your account and all kundali profiles will be permanently deleted. This cannot be undone.",
          )}
        </Text>
        <Pressable
          onPress={() => {
            Alert.alert(
              pick("खाता मेटाउने?", "Delete account?"),
              pick(
                "खाता र सबै कुण्डली प्रोफाइल स्थायी रूपमा मेटिनेछन्। यो फिर्ता हुँदैन।",
                "Your account and all kundali profiles will be permanently deleted. This cannot be undone.",
              ),
              [
                { text: pick("रद्द", "Cancel"), style: "cancel" },
                {
                  text: pick("मेट्नुहोस्", "Delete"),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace("/" as never);
                    } catch {
                      Alert.alert(
                        pick("खाता मेटाउन सकिएन", "Could not delete account"),
                        pick("पुनः प्रयास गर्नुहोस्।", "Please try again."),
                      );
                    }
                  },
                },
              ],
            );
          }}
          className="mt-3 self-start rounded-lg border border-destructive px-4 py-2.5 active:opacity-80"
        >
          <Text className="text-body font-semibold text-destructive" style={nepaliTextStyle(14)}>
            {pick("खाता मेटाउनुहोस्", "Delete account")}
          </Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

function IconBtn({
  icon,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
    >
      <Ionicons name={icon} size={17} color={tone ?? colors.foreground} />
    </Pressable>
  );
}
