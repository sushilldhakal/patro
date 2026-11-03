import { Alert, Pressable, View } from "react-native";
import { useAccountPage } from "@vedic-patro/features/account";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { InnerPage } from "@/components/account/AccountList";
import { EMPTY_PROFILE, ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { Ionicons } from "@/components/icons/Ionicons";
import { Button } from "@/components/ui/Button";
import { INLINE_LOADER_SIZE } from "@/components/ui/States";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { requestSignIn } from "@/lib/menu-request";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { afterProfileDeleted } from "@/lib/notifications/triggers";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

/** Profile → Saved profiles: add, edit, make default and delete the birth profiles. */
export default function ProfilesScreen() {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const auth = useAuth();
  const page = useAccountPage({
    auth,
    onProfileDeleted: () => void afterProfileDeleted(lang === "en" ? "en" : "ne"),
  });
  const { status, user, copy, editing } = page;

  if (status === "loading") {
    return (
      <InnerPage title={copy.profilesTitle}>
        <View className="items-center py-12">
          <VedicPatroLoader />
        </View>
      </InnerPage>
    );
  }

  if (status === "signed-out" || !user) {
    return (
      <InnerPage title={copy.profilesTitle}>
        <View className={accountClasses.signedOutBox}>
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {t("ui.account.log_in_to_view_your_account")}
          </Text>
          <Button label={t("ui.nav.log_in")} size="sm" onPress={requestSignIn} />
        </View>
      </InnerPage>
    );
  }

  return (
    <InnerPage title={copy.profilesTitle}>
      <View>
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

      </View>
    </InnerPage>
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
      className={accountClasses.profileIconButton}
    >
      <Ionicons name={icon} size={16} color={tone ?? colors.foreground} />
    </Pressable>
  );
}
