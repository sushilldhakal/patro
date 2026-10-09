import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
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
import { SocialSignInButtons } from "./SocialSignInButtons";

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
  const { pick } = useLocale();
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
      setError(pick("पासवर्ड मिलेन", "Passwords do not match"));
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError(pick("पासवर्ड कम्तीमा ८ अक्षर हुनुपर्छ", "Password must be at least 8 characters"));
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
          pick(
            "खाता बनियो! इमेल प्रमाणीकरणको लागि इनबक्स हेर्नुहोस्।",
            "Account created! Check your email to verify your address.",
          ),
        );
        setTimeout(close, 1400);
      } else {
        await apiForgotPassword(email.trim());
        setNotice(
          pick(
            "यदि त्यो इमेल छ भने, रिसेट लिङ्क पठाइएको छ",
            "If that email exists, a reset link has been sent",
          ),
        );
      }
    } catch {
      setError(pick("केही गडबड भयो। पुनः प्रयास गर्नुहोस्।", "Something went wrong. Try again."));
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
      setError(detail || pick("गुगल लग-इन असफल", "Google sign-in failed"));
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
      setError(pick("फेसबुक लग-इन असफल", "Facebook sign-in failed"));
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
      setError(pick("एपल लग-इन असफल", "Apple sign-in failed"));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "login"
      ? pick("लग-इन", "Sign in")
      : mode === "signup"
        ? pick("खाता खोल्नुहोस्", "Create account")
        : pick("पासवर्ड रिसेट", "Reset password");
  const desc =
    mode === "login"
      ? pick("वैदिक पात्रोमा फेरि स्वागत छ।", "Welcome back to Vedic Patro.")
      : mode === "signup"
        ? pick(
            "आफ्ना कुण्डली प्रोफाइलहरू उपकरणहरूमा सुरक्षित राख्नुहोस्।",
            "Save your kundali profiles across devices.",
          )
        : pick(
            "हामी तपाईंलाई नयाँ पासवर्ड सेट गर्न लिङ्क इमेल गर्छौं।",
            "We'll email you a link to set a new password.",
          );
  const submitLabel = busy
    ? pick("कृपया पर्खनुहोस्…", "Please wait…")
    : mode === "login"
      ? pick("लग-इन", "Sign in")
      : mode === "signup"
        ? pick("खाता खोल्नुहोस्", "Create account")
        : pick("रिसेट लिङ्क पठाउनुहोस्", "Send reset link");

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
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72 }}>
            <Text style={{ fontSize: 18, color: colors.mutedForeground }}>
              {pick("रद्द", "Cancel")}
            </Text>
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "600",
              color: colors.foreground,
            }}
          >
            {title}
          </Text>
          <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.primary }}>
              {pick("भयो", "Done")}
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 48 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text className="text-body text-muted-foreground">{desc}</Text>

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
              label={pick("इमेल", "Email")}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />

            {mode !== "forgot" ? (
              <Field
                label={pick("पासवर्ड", "Password")}
                value={password}
                onChangeText={setPassword}
                placeholder={
                  mode === "signup" ? pick("कम्तीमा ८ अक्षर", "At least 8 characters") : "••••••••"
                }
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                textContentType={mode === "login" ? "password" : "newPassword"}
              />
            ) : null}

            {mode === "signup" ? (
              <Field
                label={pick("पासवर्ड पुष्टि", "Confirm password")}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
              />
            ) : null}

            {error ? <Text className="text-body mt-3 text-danger">{error}</Text> : null}
            {notice ? <Text className="text-body mt-3 text-accent">{notice}</Text> : null}

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              className="mt-5 h-12 flex-row items-center justify-center gap-2 rounded-lg bg-primary active:opacity-90"
              style={busy ? { opacity: 0.6 } : undefined}
            >
              {busy ? <ActivityIndicator color="#fff" size="small" /> : null}
              <Text className="text-body font-semibold text-primary-foreground">{submitLabel}</Text>
            </Pressable>

            <View className="mt-5 items-center gap-2 pb-4">
              {mode === "login" ? (
                <>
                  <Pressable onPress={() => reset("forgot")}>
                    <Text className="text-body text-muted-foreground">
                      {pick("पासवर्ड बिर्सनुभयो?", "Forgot your password?")}
                    </Text>
                  </Pressable>
                  <Text className="text-body text-muted-foreground">
                    {pick("नयाँ हुनुहुन्छ?", "New here?")}{" "}
                    <Text className="font-semibold text-secondary" onPress={() => reset("signup")}>
                      {pick("खाता खोल्नुहोस्", "Create account")}
                    </Text>
                  </Text>
                </>
              ) : null}
              {mode === "signup" ? (
                <Text className="text-body text-muted-foreground">
                  {pick("पहिले नै खाता छ?", "Already have an account?")}{" "}
                  <Text className="font-semibold text-secondary" onPress={() => reset("login")}>
                    {pick("लग-इन", "Sign in")}
                  </Text>
                </Text>
              ) : null}
              {mode === "forgot" ? (
                <Pressable onPress={() => reset("login")}>
                  <Text className="text-body text-muted-foreground">
                    {pick("लग-इनमा फर्कनुहोस्", "Back to sign in")}
                  </Text>
                </Pressable>
              ) : null}
              {mode !== "forgot" ? (
                <Text className="text-caption mt-2 px-4 text-center leading-relaxed text-muted-foreground">
                  {pick(
                    "जारी राखेर तपाईं गोपनीयता नीति र प्रयोगका सर्त मान्नुहुन्छ।",
                    "By continuing you agree to the Privacy Policy and Terms of Use.",
                  )}{" "}
                  <Text
                    className="font-semibold text-secondary"
                    onPress={() => {
                      close();
                      router.push("/privacy" as never);
                    }}
                  >
                    {pick("गोपनीयता", "Privacy")}
                  </Text>
                  {" · "}
                  <Text
                    className="font-semibold text-secondary"
                    onPress={() => {
                      close();
                      router.push("/terms" as never);
                    }}
                  >
                    {pick("सर्त", "Terms")}
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
    <View className="mt-3 gap-1.5">
      <Text className="text-body text-foreground">{label}</Text>
      <Input
        placeholderTextColor={colors.mutedForeground}
        className="text-body h-12 rounded-lg border px-3 text-foreground"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : {}),
        }}
        {...props}
      />
    </View>
  );
}
