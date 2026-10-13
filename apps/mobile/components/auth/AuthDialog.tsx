import { useEffect, useState } from "react";
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
import { apiForgotPassword } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { EmailTextInput } from "@/components/ui/EmailTextInput";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { SocialSignInButtons } from "./SocialSignInButtons";

import { neutral, space } from "@vedic-patro/design-tokens";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";
type Mode = "login" | "signup" | "forgot";

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "login",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const router = useRouter();
  const { login, signup, loginWithGoogle, loginWithFacebook, loginWithApple } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  function reset(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  }

  function close() {
    Keyboard.dismiss();
    onOpenChange(false);
    setTimeout(() => reset("login"), 200);
    setEmail("");
  }

  async function onSubmit() {
    setError(null);
    setNotice(null);

    if (mode === "signup" && password !== confirm) {
      setError(t("auth.passwords_mismatch"));
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError(t("auth.password_min"));
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        close();
      } else if (mode === "signup") {
        await signup(email.trim(), password);
        setNotice(
          t("auth.signup_notice"),
        );
        setTimeout(close, 1400);
      } else {
        await apiForgotPassword(email.trim());
        setNotice(
          t("auth.forgot_notice"),
        );
      }
    } catch {
      setError(t("auth.generic_error"));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle(idToken: string) {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle(idToken);
      close();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      setError(detail || t("auth.google_error"));
    } finally {
      setBusy(false);
    }
  }

  async function onFacebook(accessToken: string) {
    setError(null);
    setBusy(true);
    try {
      await loginWithFacebook(accessToken);
      close();
    } catch {
      setError(t("auth.facebook_error"));
    } finally {
      setBusy(false);
    }
  }

  async function onApple(identityToken: string, email?: string | null) {
    setError(null);
    setBusy(true);
    try {
      await loginWithApple(identityToken, email);
      close();
    } catch {
      setError(t("ui.auth.apple_sign_in_failed"));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? t("kundali.login")
      : mode === "signup"
        ? t("kundali.signup")
        : t("auth.reset_password");
  const desc =
    mode === "login"
      ? t("auth.sign_in_desc")
      : mode === "signup"
        ? t("auth.signup_desc")
        : t("auth.forgot_desc");
  const submitLabel = busy
    ? t("auth.please_wait")
    : mode === "login"
      ? t("kundali.login")
      : mode === "signup"
        ? t("kundali.signup")
        : t("auth.send_reset");

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
            <Text className="text-lg text-muted-foreground">{t("common.cancel")}</Text>
          </Pressable>
          <Text className="flex-1 text-center text-lg font-semibold text-foreground">{title}</Text>
          <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72, alignItems: "flex-end" }}>
            <Text className="text-lg font-semibold text-primary">{t("common.done")}</Text>
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
            <Text className="text-sm text-muted-foreground">{desc}</Text>

            {mode !== "forgot" ? (
              <View className="mt-4">
                <SocialSignInButtons
                  onGoogle={onGoogle}
                  onFacebook={onFacebook}
                  onApple={onApple}
                  onError={setError}
                  disabled={busy}
                />
              </View>
            ) : null}

            <Field
              email
              label={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />

            {mode !== "forgot" ? (
              <Field
                label={t("auth.password")}
                value={password}
                onChangeText={setPassword}
                placeholder={
                  mode === "signup" ? t("auth.password_hint") : "••••••••"
                }
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                textContentType={mode === "login" ? "password" : "newPassword"}
              />
            ) : null}

            {mode === "signup" ? (
              <Field
                label={t("auth.confirm_password")}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
              />
            ) : null}

            {error ? <Text className={cn("mt-3", accountClasses.formError)}>{error}</Text> : null}
            {notice ? <Text className={cn("mt-3", accountClasses.formNotice)}>{notice}</Text> : null}

            <Button
              label={submitLabel}
              size="lg"
              onPress={onSubmit}
              disabled={busy}
              className="mt-4"
              icon={busy ? <ActivityIndicator color={neutral.white} size="small" /> : undefined}
            />

            <View className={cn("mt-4 items-center pb-4", accountClasses.switchStack)}>
              {mode === "login" ? (
                <>
                  <Pressable onPress={() => reset("forgot")}>
                    <Text className={accountClasses.switchText}>
                      {t("auth.forgot_password")}
                    </Text>
                  </Pressable>
                  <Text className={accountClasses.switchText}>
                    {t("auth.new_here")}{" "}
                    <Text className={accountClasses.switchLink} onPress={() => reset("signup")}>
                      {t("kundali.signup")}
                    </Text>
                  </Text>
                </>
              ) : null}
              {mode === "signup" ? (
                <Text className={accountClasses.switchText}>
                  {t("auth.already_have")}{" "}
                  <Text className={accountClasses.switchLink} onPress={() => reset("login")}>
                    {t("kundali.login")}
                  </Text>
                </Text>
              ) : null}
              {mode === "forgot" ? (
                <Pressable onPress={() => reset("login")}>
                  <Text className={accountClasses.switchText}>
                    {t("auth.back_to_sign_in")}
                  </Text>
                </Pressable>
              ) : null}
              {mode !== "forgot" ? (
                <Text className={cn("mt-2 px-4", accountClasses.legal)}>
                  {t("auth.legal_agree")}{" "}
                  <Text
                    className={accountClasses.legalLink}
                    onPress={() => {
                      close();
                      router.push("/privacy" as never);
                    }}
                  >
                    {t("footer.privacy")}
                  </Text>
                  {" · "}
                  <Text
                    className={accountClasses.legalLink}
                    onPress={() => {
                      close();
                      router.push("/terms" as never);
                    }}
                  >
                    {t("footer.terms")}
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
