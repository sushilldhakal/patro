import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAuthDialog, type AuthDialogMode } from "@vedic-patro/features/account";
import { useThemeColors } from "@/lib/theme-context";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { EmailTextInput } from "@/components/ui/EmailTextInput";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { SocialSignInButtons } from "./SocialSignInButtons";

import { neutral, space } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthDialogMode;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const auth = useAuth();
  const d = useAuthDialog({
    open,
    onOpenChange,
    initialMode,
    auth,
    onClose: Keyboard.dismiss,
    resetBetweenOpens: true,
  });
  const { copy, mode, close } = d;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.card,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72 }}>
            <Text className="text-lg text-muted-foreground">{copy.cancel}</Text>
          </Pressable>
          <Text className="flex-1 text-center text-lg font-semibold text-foreground">{copy.title}</Text>
          <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72, alignItems: "flex-end" }}>
            <Text className="text-lg font-semibold text-primary">{copy.done}</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 48 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space["3xl"] }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text className="text-sm text-muted-foreground">{copy.description}</Text>

            {d.showSocial ? (
              <View className="mt-4">
                <SocialSignInButtons
                  onGoogle={d.onGoogle}
                  onFacebook={d.onFacebook}
                  onApple={d.onApple}
                  onError={d.setError}
                  disabled={d.busy}
                />
              </View>
            ) : null}

            <Field
              email
              label={copy.email}
              value={d.email}
              onChangeText={d.setEmail}
              placeholder={copy.emailPlaceholder}
            />

            {d.showPassword ? (
              <Field
                label={copy.password}
                value={d.password}
                onChangeText={d.setPassword}
                placeholder={copy.passwordPlaceholder}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={d.passwordAutoComplete}
                textContentType={mode === "login" ? "password" : "newPassword"}
              />
            ) : null}

            {d.showConfirm ? (
              <Field
                label={copy.confirmPassword}
                value={d.confirm}
                onChangeText={d.setConfirm}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
              />
            ) : null}

            {d.error ? <Text className={cn("mt-3", accountClasses.formError)}>{d.error}</Text> : null}
            {d.notice ? <Text className={cn("mt-3", accountClasses.formNotice)}>{d.notice}</Text> : null}

            <Button
              label={copy.submit}
              size="lg"
              onPress={() => void d.submit()}
              disabled={d.busy}
              className="mt-4"
              icon={d.busy ? <ActivityIndicator color={neutral.white} size="small" /> : undefined}
            />

            <View className={cn("mt-4 items-center pb-4", accountClasses.switchStack)}>
              {mode === "login" ? (
                <>
                  <Pressable onPress={() => d.switchMode("forgot")}>
                    <Text className={accountClasses.switchText}>
                      {copy.forgotPassword}
                    </Text>
                  </Pressable>
                  <Text className={accountClasses.switchText}>
                    {copy.newHere}{" "}
                    <Text className={accountClasses.switchLink} onPress={() => d.switchMode("signup")}>
                      {copy.createAccount}
                    </Text>
                  </Text>
                </>
              ) : null}
              {mode === "signup" ? (
                <Text className={accountClasses.switchText}>
                  {copy.alreadyHave}{" "}
                  <Text className={accountClasses.switchLink} onPress={() => d.switchMode("login")}>
                    {copy.signIn}
                  </Text>
                </Text>
              ) : null}
              {mode === "forgot" ? (
                <Pressable onPress={() => d.switchMode("login")}>
                  <Text className={accountClasses.switchText}>
                    {copy.backToSignIn}
                  </Text>
                </Pressable>
              ) : null}
              {d.showLegal ? (
                <Text className={cn("mt-2 px-4", accountClasses.legal)}>
                  {copy.legalAgree}{" "}
                  <Text
                    className={accountClasses.legalLink}
                    onPress={() => {
                      close();
                      router.push("/privacy" as never);
                    }}
                  >
                    {copy.privacy}
                  </Text>
                  {" · "}
                  <Text
                    className={accountClasses.legalLink}
                    onPress={() => {
                      close();
                      router.push("/terms" as never);
                    }}
                  >
                    {copy.terms}
                  </Text>
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({
  label,
  email,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; email?: boolean }) {
  const colors = useThemeColors();
  const Input = email ? EmailTextInput : props.secureTextEntry ? PasswordInput : TextInput;
  return (
    <View className={cn("mt-3", accountClasses.field)}>
      <Text className={accountClasses.label}>{label}</Text>
      <Input
        placeholderTextColor={colors.mutedForeground}
        className={accountClasses.input}
        style={Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : undefined}
        {...props}
      />
    </View>
  );
}
