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
  const { pick } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [status, setStatus] = useState<"loading" | "ok" | "error">(() =>
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(() =>
    token ? "" : pick("प्रमाणीकरण लिंक अपूर्ण छ।", "The verification link is incomplete."),
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
          pick(
            "प्रमाणीकरण असफल भयो। लिंक अवधि सकिएको हुन सक्छ।",
            "Verification failed. The link may have expired.",
          ),
        );
      });
  }, [refreshUser, token, pick]);

  return (
    <AppShell title={pick("इमेल प्रमाणीकरण", "Verify email")} showHeader={false}>
      <View className={cn("w-full py-12", accountClasses.panelCentered)}>
        {status === "loading" ? (
          <ActivityIndicator />
        ) : status === "ok" ? (
          <>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
              {pick("इमेल प्रमाणित भयो", "Email verified")}
            </Text>
            <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
              {pick(
                "धन्यवाद — तपाईंको खाता अब पूर्ण रूपमा सक्रिय छ।",
                "Thanks — your account is now fully active.",
              )}
            </Text>
            <Button
              label={pick("खातामा जानुहोस्", "Go to account")}
              className={accountClasses.statusAction}
              onPress={() => router.replace("/account" as never)}
            />
          </>
        ) : (
          <>
            <Ionicons name="close-circle" size={48} color={colors.destructive} />
            <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
              {pick("प्रमाणीकरण असफल", "Verification failed")}
            </Text>
            <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
              {message}
            </Text>
            <Button
              label={pick("खातामा फर्कनुहोस्", "Back to account")}
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
