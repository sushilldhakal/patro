import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { apiResetPassword } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export default function ResetPasswordScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError(t("ui.reset_password.password_must_be_at_least_8"));
      return;
    }
    if (password !== confirm) {
      setError(t("ui.reset_password.passwords_do_not_match"));
      return;
    }
    if (!token) {
      setError(t("ui.reset_password.that_reset_link_is_not_valid"));
      return;
    }
    setBusy(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/" as never), 2000);
    } catch {
      setError(
        t("ui.reset_password.could_not_update_the_password_the"),
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AppShell title={t("auth.reset_password")} showHeader={false}>
        <View className={cn("w-full py-12", accountClasses.panelCentered)}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
            {t("ui.reset_password.password_updated")}
          </Text>
          <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
            {t("ui.reset_password.you_can_now_log_in_with")}
          </Text>
        </View>
      </AppShell>
    );
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder?: string,
  ) => (
    <View className={accountClasses.field}>
      <Text className={accountClasses.label} style={nepaliTextStyle()}>
        {label}
      </Text>
      <PasswordInput
        value={value}
        onChangeText={onChange}
        autoComplete="new-password"
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        className={accountClasses.input}
      />
    </View>
  );

  return (
    <AppShell title={t("ui.reset_password.set_a_new_password")} showHeader={false}>
      <View className={cn("w-full py-12", accountClasses.panel)}>
        <Text className={accountClasses.formTitle} style={nepaliTextStyle()}>
          {t("ui.reset_password.set_a_new_password")}
        </Text>
        <Text className={accountClasses.statusBody} style={nepaliTextStyle()}>
          {t("ui.reset_password.fill_in_the_form_below_to")}
        </Text>

        <View className={accountClasses.form}>
          {field(t("auth.new_password"), password, setPassword, t("auth.password_hint"))}
          {field(t("ui.reset_password.confirm_password"), confirm, setConfirm)}

          {error ? (
            <Text className={accountClasses.formError} style={nepaliTextStyle()}>
              {error}
            </Text>
          ) : null}

          <Button
            label={busy ? t("ui.reset_password.updating") : t("ui.reset_password.update_password")}
            size="lg"
            disabled={busy}
            className={accountClasses.submit}
            onPress={submit}
          />
          <Pressable onPress={() => router.replace("/" as never)} accessibilityRole="button" className="items-center">
            <Text className={accountClasses.backLink} style={nepaliTextStyle()}>
              {t("ui.reset_password.back_home")}
            </Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}
