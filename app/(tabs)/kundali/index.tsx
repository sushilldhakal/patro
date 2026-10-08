import { useRef, useState } from "react";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { AuthDialog } from "@/components/auth/AuthDialog";
import {
  KundaliProfilePicker,
  type KundaliProfilePickerHandle,
} from "@/components/kundali/KundaliProfilePicker";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { KundaliPageShell } from "@/components/kundali/KundaliPageShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { type Profile } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";

export default function KundaliScreen() {
  const { pick, t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const pickerRef = useRef<KundaliProfilePickerHandle>(null);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const onSelectProfile = (profile: Profile) => {
    router.push(`/kundali/${profile.id}` as never);
  };

  return (
    <>
      <KundaliPageShell
        eyebrow={t("kundali.eyebrow")}
        icon={<AppNavIcon name="sparkles" size={28} color={colors.secondary} />}
        title={t("kundali.title")}
        subtitle={isAuthenticated ? t("kundali.subtitle_auth") : t("kundali.login_required")}
        headerRight={
          isAuthenticated ? (
            <Button
              label={t("kundali.add_profile")}
              size="sm"
              onPress={() => pickerRef.current?.openAdd()}
            />
          ) : undefined
        }
      >
        {authLoading ? (
          <View className="items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12">
            <ActivityIndicator />
            <Text className="mt-2 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick("लोड हुँदै…", "Loading…")}
            </Text>
          </View>
        ) : !isAuthenticated ? (
          <KundaliLoginPrompt
            titleNe={t("kundali.login_prompt_title")}
            titleEn={t("kundali.login_prompt_title")}
            bodyNe={t("kundali.login_prompt_body")}
            bodyEn={t("kundali.login_prompt_body")}
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
          />
        ) : (
          <View className="gap-4">
            <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick(
                "प्रोफाइल छान्नुहोस् वा नयाँ थप्नुहोस्।",
                "Select a profile or add a new one.",
              )}
            </Text>
            <KundaliProfilePicker ref={pickerRef} selectedId={null} onSelect={onSelectProfile} />
          </View>
        )}
      </KundaliPageShell>

      <AuthDialog
        key={authMode}
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
      />
    </>
  );
}
