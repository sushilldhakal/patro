import { INLINE_LOADER_SIZE } from "@/components/ui/States";
import { useRef, useState } from "react";
import { useKundaliHubPage } from "@vedic-patro/features/kundali";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Pressable, ScrollView, View } from "react-native";
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
import { nepaliTextStyle } from "@/lib/nepali-text";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { EMPTY_PROFILE, ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import { GUEST_PROFILE_ID, saveGuestProfile, useGuestProfile } from "@/lib/kundali/guest-profile";
import { useLocale } from "@/lib/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "@vedic-patro/design-tokens";

/**
 * Signed out: a kundali needs no account. The birth details are kept on the phone and the chart opens
 * at `/kundali/guest`; signing in (below) is for keeping several and opening them anywhere.
 */
function GuestKundali({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const { t } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const guest = useGuestProfile();
  const [formOpen, setFormOpen] = useState(false);
  const open = (created?: boolean) => router.push(`/kundali/${GUEST_PROFILE_ID}${created ? "?created=1" : ""}` as never);

  return (
    <View className="gap-6">
      <View className={kundaliClasses.guestCard}>
        <Text className={kundaliClasses.guestTitle} style={nepaliTextStyle(17)}>
          {t("kundali_guest.title")}
        </Text>
        <Text className={kundaliClasses.guestBody} style={nepaliTextStyle(14)}>
          {t("kundali_guest.body")}
        </Text>
        {guest.profile ? (
          <Pressable onPress={() => open()} accessibilityRole="button" className={cn(kundaliClasses.guestRow, "active:opacity-80")}>
            <View className="min-w-0 shrink">
              <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
                {t("kundali_guest.yours")}
              </Text>
              <Text numberOfLines={1} className={kundaliClasses.guestName} style={nepaliTextStyle(15)}>
                {guest.profile.full_name}
              </Text>
            </View>
            <Text className="text-body font-semibold text-secondary" style={nepaliTextStyle(14)}>
              {t("kundali_guest.view")}
            </Text>
          </Pressable>
        ) : null}
        <Button
          label={guest.profile ? t("kundali_guest.replace") : t("kundali_guest.create")}
          variant={guest.profile ? "outline" : undefined}
          onPress={() => setFormOpen(true)}
        />
      </View>

      <KundaliLoginPrompt title={t("kundali_guest.save_title")} body={t("kundali_guest.save_body")} onLogin={onLogin} onSignup={onSignup} />

      <BottomSheetModal visible={formOpen} onClose={() => setFormOpen(false)} keyboardAvoiding maxHeight="92%">
        <View className={kundaliClasses.sheetHead}>
          <View className="min-w-[4.5rem]" />
          <Text className={kundaliClasses.sheetTitle} style={nepaliTextStyle(16)} numberOfLines={1}>
            {t("kundali_guest.sheet_title")}
          </Text>
          <View className="min-w-[4.5rem]" />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: Math.max(insets.bottom, space.lg) }}
        >
          <ProfileForm
            initial={guest.profile ? profileToInput(guest.profile) : EMPTY_PROFILE}
            store={saveGuestProfile}
            minimal
            onCancel={() => setFormOpen(false)}
            onSaved={(saved) => {
              guest.setProfile(saved);
              setFormOpen(false);
              open(true);
            }}
          />
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}

export default function KundaliScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { status, authDialog, canAddProfile, copy } = useKundaliHubPage({ isAuthenticated, authLoading });
  const pickerRef = useRef<KundaliProfilePickerHandle>(null);

  const onSelectProfile = (profile: Profile, opts?: { created: boolean }) => {
    router.push(`/kundali/${profile.id}${opts?.created ? "?created=1" : ""}` as never);
  };

  return (
    <>
      {/* No breadcrumb (a website thing). Signed out, the guest card below says what to do, so the
          shared "log in to see this kundali" subtitle is left off: a kundali here needs no account. */}
      <KundaliPageShell
        icon={<AppNavIcon name="sparkles" size={28} color={colors.secondary} />}
        title={copy.title}
        subtitle={isAuthenticated ? copy.subtitle : undefined}
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
            <VedicPatroLoader label={null} size={INLINE_LOADER_SIZE} />
            <Text className={cn("mt-2", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
              {copy.loading}
            </Text>
          </View>
        ) : status === "login" ? (
          <GuestKundali onLogin={authDialog.openLogin} onSignup={authDialog.openSignup} />
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
