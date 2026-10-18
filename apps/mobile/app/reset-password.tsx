import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useResetPasswordPage } from "@vedic-patro/features/account";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Ionicons } from "@/components/icons/Ionicons";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { AppShell } from "@/components/AppShell";
import { StandaloneChrome } from "@/components/StandaloneChrome";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/** Set a new password — the app's drawing of `useResetPasswordPage` (@vedic-patro/features). */
function ResetPasswordScreenBody() {
  const colors = useThemeColors();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const page = useResetPasswordPage(token, () => router.replace("/" as never));

  if (page.done) {
    return (
      <AppShell title={page.copy.title} showHeader={false}>
        <View className={cn("w-full py-12", accountClasses.panelCentered)}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text className={cn("text-center", accountClasses.statusTitle)} style={nepaliTextStyle()}>
            {page.copy.doneTitle}
          </Text>
          <Text className={cn("text-center", accountClasses.statusBody)} style={nepaliTextStyle()}>
            {page.copy.doneBody}
          </Text>
        </View>
      </AppShell>
    );
  }

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
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
    <AppShell title={page.copy.title} showHeader={false}>
      <View className={cn("w-full py-12", accountClasses.panel)}>
        <Text className={accountClasses.formTitle} style={nepaliTextStyle()}>
          {page.copy.title}
        </Text>
        <Text className={accountClasses.statusBody} style={nepaliTextStyle()}>
          {page.copy.description}
        </Text>
        <View className={accountClasses.form}>
          {field(page.copy.newPassword, page.password, page.setPassword, page.copy.passwordHint)}
          {field(page.copy.confirmPassword, page.confirm, page.setConfirm)}
          {page.error ? (
            <Text className={accountClasses.formError} style={nepaliTextStyle()}>
              {page.error}
            </Text>
          ) : null}
          <Button label={page.copy.submit} size="lg" disabled={page.busy} className={accountClasses.submit} onPress={() => void page.submit()} />
          <Pressable onPress={() => router.replace("/" as never)} accessibilityRole="button" className="items-center">
            <Text className={accountClasses.backLink} style={nepaliTextStyle()}>
              {page.copy.backHome}
            </Text>
          </Pressable>
        </View>
      </View>
    </AppShell>
  );
}

export default function ResetPasswordScreen() {
  return (
    <StandaloneChrome>
      <ResetPasswordScreenBody />
    </StandaloneChrome>
  );
}
