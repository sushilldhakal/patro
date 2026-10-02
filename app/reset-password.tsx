import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { apiResetPassword } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

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
      <AppShell title={pick("पासवर्ड रिसेट", "Reset password")}>
        <View className="items-center gap-3 py-12">
          <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
          <Text className="text-xl font-bold text-foreground" style={nepaliTextStyle(20)}>
            {pick("पासवर्ड परिवर्तन भयो", "Password updated")}
          </Text>
          <Text className="text-center text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
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
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle(13)}>
        {label}
      </Text>
      <PasswordInput
        value={value}
        onChangeText={onChange}
        autoComplete="new-password"
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={{
          borderColor: colors.border,
          backgroundColor: colors.background,
          color: colors.foreground,
        }}
        className="rounded-lg border px-3 py-2.5 text-base"
      />
    </View>
  );

  return (
    <AppShell
      title={pick("नयाँ पासवर्ड राख्नुहोस्", "Set a new password")}
      subtitle={pick(
        "तलको फारम भरेर आफ्नो पासवर्ड परिवर्तन गर्नुहोस्।",
        "Fill in the form below to change your password.",
      )}
    >
      <View className="gap-3">
        {field(pick("नयाँ पासवर्ड", "New password"), password, setPassword, pick("कम्तीमा ८ अक्षर", "At least 8 characters"))}
        {field(pick("पासवर्ड दोहोर्‍याउनुहोस्", "Confirm password"), confirm, setConfirm)}

        {error ? (
          <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className="text-sm">
            {error}
          </Text>
        ) : null}

        <Button
          label={busy ? pick("अद्यावधिक हुँदै…", "Updating…") : pick("पासवर्ड परिवर्तन", "Update password")}
          size="lg"
          disabled={busy}
          className="mt-1"
          onPress={submit}
        />
        <Button
          label={pick("गृहपृष्ठ", "Back home")}
          variant="ghost"
          onPress={() => router.replace("/" as never)}
        />
      </View>
    </AppShell>
  );
}
