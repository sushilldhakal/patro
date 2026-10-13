import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { inkOn } from "@/lib/theme";
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
import { afterProfileDeleted } from "@/lib/notifications/triggers";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { brand, illustration } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

const ACCOUNT_PROFILES_KEY = ["account-profiles"] as const;

export default function AccountScreen() {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const { isDark } = useTheme();
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
    staleTime: 60_000,
  });

  const profiles = profilesQuery.data ?? [];
  const reloadProfiles = () =>
    void queryClient.invalidateQueries({ queryKey: ACCOUNT_PROFILES_KEY });

  const onDelete = (p: Profile) => {
    Alert.alert(
      t("ui.account.delete_profile"),
      t("ui.account.full_name_will_be_permanently_removed", { full_name: p.full_name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("ui.account.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteProfile(p.id);
            void afterProfileDeleted(lang === "en" ? "en" : "ne");
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
      <AppShell title={t("ui.common.account")}>
        <View className="items-center py-12">
          <ActivityIndicator />
        </View>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title={t("ui.common.account")}>
        <View className="items-center gap-3 rounded-xl border border-dashed border-border px-5 py-12">
          <Ionicons name="person-circle-outline" size={40} color={colors.mutedForeground} />
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("ui.account.log_in_to_view_your_account")}
          </Text>
          <Button
            label={t("ui.account.go_home")}
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
              <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle(14)}>
                {t("ui.account.offline_data")}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
                {t("ui.account.offline_calendar_data_can_be_managed")}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("ui.common.account")} showHeader={false}>
      <View className={cn("w-full", accountClasses.column)}>
      <View className={accountClasses.header}>
        <Text className={accountClasses.title} style={nepaliTextStyle()}>
          {t("ui.common.account")}
        </Text>
        <Text className={accountClasses.subtitle} style={nepaliTextStyle()}>
          {user.email}
        </Text>
      </View>

      {!user.is_verified ? (
        <View className={cn("flex-row", accountClasses.banner)}>
          <View className={accountClasses.bannerIcon}>
            <Ionicons
              name="mail-unread-outline"
              size={16}
              color={isDark ? illustration.amber56 : brand.saffron}
            />
          </View>
          <View className="flex-1">
            <Text className={accountClasses.bannerText} style={nepaliTextStyle()}>
              {t("ui.account.your_email_is_not_verified_yet")}
            </Text>
            <Pressable
              disabled={resent}
              onPress={async () => {
                await apiResendVerification();
                setResent(true);
              }}
              className={cn("self-start", resent && "opacity-60")}
            >
              <Text className={accountClasses.bannerAction} style={nepaliTextStyle()}>
                {resent
                  ? t("ui.account.verification_email_sent")
                  : t("ui.account.resend_verification_email")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className={cn("flex-row", accountClasses.sectionRow)}>
        <Text className={accountClasses.sectionTitle} style={nepaliTextStyle()}>
          {t("ui.account.profiles")}
        </Text>
        {editing === null ? (
          <Button
            label={t("ui.account.add_profile")}
            size="sm"
            onPress={() => setEditing("new")}
            icon={<Ionicons name="add" size={14} color={inkOn(colors.secondary)} />}
          />
        ) : null}
      </View>

      {profilesQuery.isError ? (
        <Text className={accountClasses.errorText} style={nepaliTextStyle()}>
          {t("ui.account.could_not_load_your_profiles")}
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
        <View className={cn("items-center", accountClasses.loadingBox)}>
          <ActivityIndicator />
        </View>
      ) : profiles.length === 0 ? (
        <View className={accountClasses.emptyBox}>
          <Text className={accountClasses.emptyText} style={nepaliTextStyle()}>
            {t("ui.account.no_profiles_yet")}
          </Text>
        </View>
      ) : (
        <View className={accountClasses.profileList}>
          {profiles.map((p) => (
            <View
              key={p.id}
              className={cn("flex-row", accountClasses.profileRow)}
            >
              <View className={cn("flex-1", accountClasses.profileBody)}>
                <View className={cn("flex-row", accountClasses.profileNameRow)}>
                  <Text numberOfLines={1} className={cn("shrink", accountClasses.profileName)} style={nepaliTextStyle()}>
                    {p.full_name}
                  </Text>
                  {p.is_default ? (
                    <View className={cn("flex-row", accountClasses.defaultBadge)}>
                      <Ionicons name="star" size={12} color={colors.secondary} />
                      <Text className={accountClasses.defaultBadgeText} style={nepaliTextStyle()}>
                        {t("account_page.default")}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} className={accountClasses.profileMeta} style={nepaliTextStyle()}>
                  {[
                    p.location_label || p.city,
                    p.birth_date && `${p.birth_date}${p.birth_time ? ` ${p.birth_time}` : ""}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || t("account_page.no_birth_details")}
                </Text>
              </View>
              <View className={cn("flex-row", accountClasses.profileActions)}>
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
              <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle(14)}>
                {t("ui.account.unlock_with_label", { label: biometric.label })}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
                {t("ui.account.you_stay_signed_in_the_app")}
              </Text>
            </View>
          </View>
          <Switch
            value={biometric.enabled}
            onValueChange={(on) => void biometric.setEnabled(on)}
            trackColor={{ true: colors.secondary }}
            accessibilityLabel={t("ui.account.biometric_lock")}
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
            <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle(14)}>
              {t("ui.account.offline_data")}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" style={nepaliTextStyle(12)}>
              {t("ui.account.manage_the_calendar_years_downloaded_for")}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </Pressable>

      <View className={accountClasses.dangerZone}>
        <Text className={accountClasses.dangerTitle} style={nepaliTextStyle()}>
          {t("account_page.delete_account")}
        </Text>
        <Text className={accountClasses.dangerBody} style={nepaliTextStyle()}>
          {t("account_page.delete_account_confirm")}
        </Text>
        <Pressable
          onPress={() => {
            Alert.alert(
              t("ui.account.delete_account"),
              t("account_page.delete_account_confirm"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("ui.account.delete"),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace("/" as never);
                    } catch {
                      Alert.alert(
                        t("ui.account.could_not_delete_account"),
                        t("ui.account.please_try_again"),
                      );
                    }
                  },
                },
              ],
            );
          }}
          className={cn(accountClasses.dangerButton, "h-8 items-center justify-center self-start rounded-lg px-2.5 active:bg-destructive/10")}
        >
          <Text className={cn("text-sm", accountClasses.dangerButtonText)} style={nepaliTextStyle()}>
            {t("account_page.delete_account")}
          </Text>
        </Pressable>
      </View>
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
      className="h-8 w-8 items-center justify-center rounded-lg active:bg-muted"
    >
      <Ionicons name={icon} size={16} color={tone ?? colors.foreground} />
    </Pressable>
  );
}
