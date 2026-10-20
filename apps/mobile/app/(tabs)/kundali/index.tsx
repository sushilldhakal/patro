import { useRef } from "react";
import { useKundaliHubPage } from "@vedic-patro/features/kundali";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { AuthDialog } from "@/components/auth/AuthDialog";
import {
  KundaliProfilePicker,
  type KundaliProfilePickerHandle,
} from "@/components/kundali/KundaliProfilePicker";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { LearnMoreCard } from "@/components/learn/LearnMoreCard";
import { KundaliPageShell } from "@/components/kundali/KundaliPageShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { type Profile } from "@/lib/auth/client";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { cn } from "@vedic-patro/domain/utils";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";

export default function KundaliScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { status, authDialog, canAddProfile, copy } = useKundaliHubPage({ isAuthenticated, authLoading });
  const pickerRef = useRef<KundaliProfilePickerHandle>(null);

  const onSelectProfile = (profile: Profile) => {
    router.push(`/kundali/${profile.id}` as never);
  };

  return (
    <>
      <KundaliPageShell
        eyebrow={copy.eyebrow}
        icon={<AppNavIcon name="sparkles" size={28} color={colors.secondary} />}
        title={copy.title}
        subtitle={copy.subtitle}
        headerRight={
          canAddProfile ? (
            <Button
              label={copy.addProfile}
              size="sm"
              onPress={() => pickerRef.current?.openAdd()}
            />
          ) : undefined
        }
      >
        {status === "loading" ? (
          <View className={cn(kundaliClasses.emptyBox, "items-center")}>
            <VedicPatroLoader label={null} size={72} />
            <Text className={cn("mt-2", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
              {copy.loading}
            </Text>
          </View>
        ) : status === "login" ? (
          <View className="gap-6">
            <KundaliLoginPrompt
              title={copy.loginTitle}
              body={copy.loginBody}
              onLogin={authDialog.openLogin}
              onSignup={authDialog.openSignup}
            />
            {/* Logged out, the card alone left half the screen empty: offer the reading
                that explains a kundali's parts, which needs no account. */}
            <LearnMoreCard slugs={["rashi", "sidereal-vs-tropical", "five-limbs-together"]} />
          </View>
        ) : (
          <View className="gap-4">
            <Text className={kundaliClasses.profileHint} style={nepaliTextStyle(14)}>
              {copy.profileHint}
            </Text>
            <KundaliProfilePicker ref={pickerRef} selectedId={null} onSelect={onSelectProfile} />
          </View>
        )}
      </KundaliPageShell>

      <AuthDialog
        key={authDialog.mode}
        open={authDialog.open}
        onOpenChange={authDialog.setOpen}
        initialMode={authDialog.mode}
      />
    </>
  );
}
