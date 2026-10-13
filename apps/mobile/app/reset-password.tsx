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
  const { pick } = useLocale();
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
      setError(pick("पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।", "Password must be at least 8 characters."));
      return;
    }
    if (password !== confirm) {
      setError(pick("पासवर्ड मिलेन।", "Passwords do not match."));
      return;
    }
    if (!token) {
      setError(pick("रिसेट लिंक अवैध छ।", "That reset link is not valid."));
      return;
    }
    setBusy(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/" as never), 2000);
    } catch {
      setError(
        pick(
          "पासवर्ड परिवर्तन गर्न सकिएन। लिंक अवधि सकिएको हुन सक्छ।",
          "Could not update the password. The link may have expired.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AppShell title={pick("पासवर्ड रिसेट", "Reset password")} showHeader={false}>
        <View className={cn("w-full py-12", accountClasses.panelCentered)}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
            {pick("पासवर्ड परिवर्तन भयो", "Password updated")}
          </Text>
          <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
            {pick("अब नयाँ पासवर्डले लगइन गर्न सक्नुहुन्छ।", "You can now log in with the new password.")}
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
    <AppShell title={pick("नयाँ पासवर्ड राख्नुहोस्", "Set a new password")} showHeader={false}>
      <View className={cn("w-full py-12", accountClasses.panel)}>
        <Text className={accountClasses.formTitle} style={nepaliTextStyle()}>
          {pick("नयाँ पासवर्ड राख्नुहोस्", "Set a new password")}
        </Text>
        <Text className={accountClasses.statusBody} style={nepaliTextStyle()}>
          {pick(
            "तलको फारम भरेर आफ्नो पासवर्ड परिवर्तन गर्नुहोस्।",
            "Fill in the form below to change your password.",
          )}
        </Text>

        <View className={accountClasses.form}>
          {field(pick("नयाँ पासवर्ड", "New password"), password, setPassword, pick("कम्तीमा ८ अक्षर", "At least 8 characters"))}
          {field(pick("पासवर्ड दोहोर्‍याउनुहोस्", "Confirm password"), confirm, setConfirm)}

          {error ? (
            <Text className={accountClasses.formError} style={nepaliTextStyle()}>
              {error}
            </Text>
          ) : null}

          <Button
            label={busy ? pick("अद्यावधिक हुँदै…", "Updating…") : pick("पासवर्ड परिवर्तन", "Update password")}
            size="lg"
            disabled={busy}
            className={accountClasses.submit}
            onPress={submit}
          />
          <Pressable onPress={() => router.replace("/" as never)} accessibilityRole="button" className="items-center">
            <Text className={accountClasses.backLink} style={nepaliTextStyle()}>
              {pick("गृहपृष्ठ", "Back home")}
            </Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}
