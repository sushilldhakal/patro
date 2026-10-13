import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiVerifyEmail } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export default function VerifyEmailScreen() {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [status, setStatus] = useState<"loading" | "ok" | "error">(() =>
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(() =>
    token ? "" : t("ui.verify_email.the_verification_link_is_incomplete"),
  );

  useEffect(() => {
    if (!token) return;
    apiVerifyEmail(token)
      .then(() => {
        setStatus("ok");
        // The email is verified at this point; a failed profile refresh must not
        // turn that into an error screen.
        void Promise.resolve(refreshUser()).catch(() => {});
      })
      .catch(() => {
        setStatus("error");
        setMessage(
          t("ui.verify_email.verification_failed_the_link_may_have"),
        );
      });
  }, [refreshUser, token, pick]);

  return (
    <AppShell title={t("ui.verify_email.verify_email")} showHeader={false}>
      <View className={cn("w-full py-12", accountClasses.panelCentered)}>
        {status === "loading" ? (
          <ActivityIndicator />
        ) : status === "ok" ? (
          <>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
              {t("auth.verify_ok_title")}
            </Text>
            <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
              {t("ui.verify_email.thanks_your_account_is_now_fully")}
            </Text>
            <Button
              label={t("ui.verify_email.go_to_account")}
              className={accountClasses.statusAction}
              onPress={() => router.replace("/account" as never)}
            />
          </>
        ) : (
          <>
            <Ionicons name="close-circle" size={48} color={colors.destructive} />
            <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
              {t("auth.verify_fail_title")}
            </Text>
            <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
              {message}
            </Text>
            <Button
              label={t("auth.back_to_account")}
              variant="outline"
              className={accountClasses.statusAction}
              onPress={() => router.replace("/account" as never)}
            />
          </>
        )}
      </View>
    </AppShell>
  );
}
