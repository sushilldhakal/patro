import { INLINE_LOADER_SIZE } from "@/components/ui/States";
import { Alert, Pressable, Switch, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { inkOn } from "@/lib/theme";
import { useAccountPage } from "@vedic-patro/features/account";
import { AppShell } from "@/components/AppShell";
import { EMPTY_PROFILE, ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBiometricLock } from "@/lib/auth/BiometricLock";
import { afterProfileDeleted } from "@/lib/notifications/triggers";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useTheme, useThemeColors } from "@/lib/theme-context";
import { brand, illustration } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

export default function AccountScreen() {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const biometric = useBiometricLock();
  const page = useAccountPage({
    auth,
    onProfileDeleted: () => void afterProfileDeleted(lang === "en" ? "en" : "ne"),
  });
  const { status, user, copy, editing, verification } = page;

  if (status === "loading") {
    return (
      <AppShell title={copy.title}>
        <View className="items-center py-12">
          <VedicPatroLoader />
        </View>
      </AppShell>
    );
  }

  if (status === "signed-out" || !user) {
    return (
      <AppShell title={copy.title}>
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
    <AppShell title={copy.title} showHeader={false}>
      <View className={cn("w-full", accountClasses.column)}>
      <View className={accountClasses.header}>
        <Text className={accountClasses.title} style={nepaliTextStyle()}>
          {copy.title}
        </Text>
        <Text className={accountClasses.subtitle} style={nepaliTextStyle()}>
          {user.email}
        </Text>
      </View>

      {verification.needed ? (
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
              {copy.verifyEmail}
            </Text>
            <Pressable
              disabled={verification.sent}
              onPress={verification.resend}
              className={cn("self-start", verification.sent && "opacity-60")}
            >
              <Text className={accountClasses.bannerAction} style={nepaliTextStyle()}>
                {verification.label}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className={cn("flex-row", accountClasses.sectionRow)}>
        <Text className={accountClasses.sectionTitle} style={nepaliTextStyle()}>
          {copy.profilesTitle}
        </Text>
        {editing === null ? (
          <Button
            label={copy.addProfile}
            size="sm"
            onPress={page.startNew}
            icon={<Ionicons name="add" size={14} color={inkOn(colors.secondary)} />}
          />
        ) : null}
      </View>

      {page.loadError ? (
        <Text className={accountClasses.errorText} style={nepaliTextStyle()}>
          {page.loadError}
        </Text>
      ) : null}

      {editing !== null ? (
        <ProfileForm
          initial={editing === "new" ? EMPTY_PROFILE : profileToInput(editing)}
          existing={editing === "new" ? undefined : editing}
          onCancel={page.cancelEdit}
          onSaved={page.onProfileSaved}
        />
      ) : page.listStatus === "loading" ? (
        <View className={cn("items-center", accountClasses.loadingBox)}>
          <VedicPatroLoader label={null} size={INLINE_LOADER_SIZE} />
        </View>
      ) : page.listStatus === "empty" ? (
        <View className={accountClasses.emptyBox}>
          <Text className={accountClasses.emptyText} style={nepaliTextStyle()}>
            {copy.noProfiles}
          </Text>
        </View>
      ) : (
        <View className={accountClasses.profileList}>
          {page.profiles.map(({ profile: p, name, isDefault, meta }) => (
            <View
              key={p.id}
              className={cn("flex-row", accountClasses.profileRow)}
            >
              <View className={cn("flex-1", accountClasses.profileBody)}>
                <View className={cn("flex-row", accountClasses.profileNameRow)}>
                  <Text numberOfLines={1} className={cn("shrink", accountClasses.profileName)} style={nepaliTextStyle()}>
                    {name}
                  </Text>
                  {isDefault ? (
                    <View className={cn("flex-row", accountClasses.defaultBadge)}>
                      <Ionicons name="star" size={12} color={colors.secondary} />
                      <Text className={accountClasses.defaultBadgeText} style={nepaliTextStyle()}>
                        {copy.defaultBadge}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} className={accountClasses.profileMeta} style={nepaliTextStyle()}>
                  {meta}
                </Text>
              </View>
              <View className={cn("flex-row", accountClasses.profileActions)}>
                {!isDefault ? (
                  <IconBtn icon="star-outline" onPress={() => void page.makeDefault(p)} />
                ) : null}
                <IconBtn icon="pencil-outline" onPress={() => page.startEdit(p)} />
                <IconBtn
                  icon="trash-outline"
                  tone={colors.destructive}
                  onPress={() =>
                    Alert.alert(copy.deleteProfileConfirm, p.full_name, [
                      { text: copy.cancel, style: "cancel" },
                      { text: copy.delete, style: "destructive", onPress: () => void page.removeProfile(p) },
                    ])
                  }
                />
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
          {copy.deleteAccount}
        </Text>
        <Text className={accountClasses.dangerBody} style={nepaliTextStyle()}>
          {copy.deleteAccountConfirm}
        </Text>
        <Pressable
          onPress={() => {
            Alert.alert(copy.deleteAccount, copy.deleteAccountConfirm, [
              { text: copy.cancel, style: "cancel" },
              {
                text: copy.delete,
                style: "destructive",
                onPress: async () => {
                  if (await page.deleteAccount()) router.replace("/" as never);
                  else Alert.alert(copy.deleteAccountError);
                },
              },
            ]);
          }}
          className={cn(accountClasses.dangerButton, "h-8 items-center justify-center self-start rounded-lg px-2.5 active:bg-destructive/10")}
        >
          <Text className={cn("text-sm", accountClasses.dangerButtonText)} style={nepaliTextStyle()}>
            {copy.deleteAccount}
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
