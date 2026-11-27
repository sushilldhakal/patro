import { Alert, Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { useAccountPage } from "@vedic-patro/features/account";
import { InnerPage, ListGroup, ListRow, SettingsCard } from "@/components/account/AccountList";
import { ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { Ionicons } from "@/components/icons/Ionicons";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBiometricLock } from "@/lib/auth/BiometricLock";
import { useLocale } from "@/lib/i18n";
import { requestSignIn } from "@/lib/menu-request";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { afterProfileDeleted } from "@/lib/notifications/triggers";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";

/**
 * Profile → My profile: the avatar, name, e-mail and its verified badge, an edit button (the default
 * profile's form), then the details in cards — personal, contact, place and time — sign-in with Face ID,
 * and deleting the account at the foot.
 */
export default function MyProfileScreen() {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const auth = useAuth();
  const biometric = useBiometricLock();
  const page = useAccountPage({ auth, onProfileDeleted: () => void afterProfileDeleted(lang === "en" ? "en" : "ne") });
  const { status, user, copy, editing } = page;

  if (status === "loading") {
    return (
      <InnerPage title={t("ui.me.title")}>
        <View className="items-center py-12">
          <VedicPatroLoader />
        </View>
      </InnerPage>
    );
  }
  if (status === "signed-out" || !user) {
    return (
      <InnerPage title={t("ui.me.title")}>
        <Text className="text-muted-foreground" style={nepaliTextStyle(14)}>
          {t("ui.account.log_in_to_view_your_account")}
        </Text>
        <Button label={t("ui.nav.log_in")} onPress={requestSignIn} />
      </InnerPage>
    );
  }

  const mine = page.profiles.find((p) => p.isDefault) ?? page.profiles[0];
  const p = mine?.profile;
  const name = mine?.name || user.email.split("@")[0] || "";
  const birth = [p?.birth_date, p?.birth_time].filter(Boolean).join(" · ");

  if (editing !== null && editing !== "new") {
    return (
      <InnerPage title={t("ui.me.edit")}>
        <ProfileForm initial={profileToInput(editing)} existing={editing} onCancel={page.cancelEdit} onSaved={page.onProfileSaved} />
      </InnerPage>
    );
  }

  return (
    <InnerPage title={t("ui.me.title")}>
      {/* The avatar is the edit button too: its pencil badge, and the pill under the e-mail. */}
      <View className="items-center gap-1.5">
        <Pressable onPress={p ? () => page.startEdit(p) : undefined} accessibilityRole="button" accessibilityLabel={t("ui.me.edit")}>
          <View className="size-24 items-center justify-center rounded-full border-2 border-secondary/40 bg-secondary/15">
            <Text className="text-4xl font-bold text-secondary">{name.charAt(0).toUpperCase()}</Text>
          </View>
          {p ? (
            <View className="absolute -bottom-0.5 -right-0.5 size-8 items-center justify-center rounded-full border-2 border-background bg-secondary">
              <Ionicons name="pencil" size={14} color={inkOn(colors.secondary)} />
            </View>
          ) : null}
        </Pressable>
        <Text className="mt-2 text-2xl font-bold text-foreground" numberOfLines={1} style={nepaliTextStyle()}>
          {name}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {user.email}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          {user.is_verified ? <Badge label={t("account_page.verified")} /> : null}
          {p ? (
            <Pressable
              onPress={() => page.startEdit(p)}
              accessibilityRole="button"
              className="flex-row items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 active:opacity-70"
            >
              <Ionicons name="create-outline" size={15} color={colors.foreground} />
              <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(13)}>
                {t("ui.me.edit")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <SettingsCard icon="user" tint="indigo" title={t("ui.me.personal")} caption={p ? undefined : t("ui.me.no_profile")}>
        <Field label={t("ui.me.full_name")} value={p?.full_name} />
        <Field label={t("ui.me.gender")} value={p?.gender} />
        <Field label={t("ui.me.birth")} value={birth} />
        <Field label={t("ui.me.birth_place")} value={p?.location_label ?? p?.city} last />
      </SettingsCard>

      <SettingsCard icon="mail" tint="blue" title={t("ui.me.contact")}>
        <Field label={t("ui.me.email")} value={user.email} />
        <Field label={t("ui.me.phone")} value={p?.phone} last />
      </SettingsCard>

      <SettingsCard icon="globe" tint="green" title={t("ui.me.place_time")}>
        <Field label={t("ui.me.country")} value={p?.country} />
        <Field label={t("ui.me.timezone")} value={p?.timezone} last />
      </SettingsCard>

      <SettingsCard icon="fingerprint" tint="pink" title={t("ui.me.signin")} caption={t("ui.me.signin_caption")}>
        {/* Sign-in methods: Google, Apple and Facebook open this account when their e-mail is this one. */}
        <View className="gap-1">
          <Text className="text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
            {t("ui.me.signin_methods")}
          </Text>
          <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
            {t("ui.me.signin_methods_body", { email: user.email })}
          </Text>
        </View>
      {biometric.available ? (
          <View className="flex-row items-center gap-3 border-t border-border pt-3">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-semibold text-foreground" style={nepaliTextStyle(15)}>
                {t("ui.me.face_id", { label: biometric.label })}
              </Text>
              <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
                {t("ui.account.you_stay_signed_in_the_app")}
              </Text>
            </View>
            <Switch
              value={biometric.enabled}
              onValueChange={(on) => void biometric.setEnabled(on)}
              trackColor={{ true: colors.secondary }}
              accessibilityLabel={t("ui.me.face_id", { label: biometric.label })}
            />
          </View>
      ) : null}
      </SettingsCard>

      <ListGroup title={t("ui.me.account")}>
        <ListRow
          icon="trash"
          tone="danger"
          title={copy.deleteAccount}
          subtitle={t("ui.account.account_data_body")}
          onPress={() =>
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
            ])
          }
        />
      </ListGroup>
    </InnerPage>
  );
}

/** One detail: a small grey label over its value ("Not set" in grey when empty), a line under all but the last. */
function Field({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  const { t } = useLocale();
  return (
    <View className={last ? "gap-0.5" : "gap-0.5 border-b border-border pb-3"}>
      <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
        {label}
      </Text>
      <Text className={value ? "text-base font-medium text-foreground" : "text-base text-muted-foreground"} style={nepaliTextStyle(16)}>
        {value || t("ui.me.not_set")}
      </Text>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-secondary/15 px-3 py-1.5">
      <Ionicons name="checkmark-circle" size={14} color={colors.secondary} />
      <Text className="text-sm font-semibold text-secondary">{label}</Text>
    </View>
  );
}
