import { useMemo, useState } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { EMPTY_PROFILE, ProfileForm } from "@/components/auth/ProfileForm";
import {
  ProfileFormModal,
} from "@/components/kundali/KundaliProfilePicker";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { KundaliPageShell } from "@/components/kundali/KundaliPageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { type Profile } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { KundaliMilanResult } from "@/components/kundali/KundaliMilanResult";
import { fetchKundaliMilan, milanKeys, type MilanPersonQuery } from "@/lib/api";
import { profileChartParams } from "@vedic-patro/domain/kundali/profile-chart";
import { space } from "@vedic-patro/design-tokens";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

export default function KundaliMilanScreen() {
  const { lang, pick, t } = useLocale();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [addOpen, setAddOpen] = useState(false);
  const [boyProfile, setBoyProfile] = useState<Profile | null>(null);
  const [girlProfile, setGirlProfile] = useState<Profile | null>(null);
  const [pickRole, setPickRole] = useState<"boy" | "girl" | null>(null);

  const boyQuery = useMemo(() => milanPersonQuery(boyProfile), [boyProfile]);
  const girlQuery = useMemo(() => milanPersonQuery(girlProfile), [girlProfile]);

  const milanQuery = useQuery({
    queryKey:
      boyQuery && girlQuery
        ? milanKeys.match(boyQuery, girlQuery, undefined, lang)
        : ["kundali", "milan", "idle", lang],
    queryFn: () => fetchKundaliMilan(boyQuery!, girlQuery!, { lang }),
    enabled: Boolean(boyQuery && girlQuery),
    staleTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <KundaliPageShell
        eyebrow={t("milan.eyebrow")}
        icon={<AppNavIcon name="heart" size={28} color={colors.secondary} />}
        title={t("milan.title")}
        subtitle={isAuthenticated ? t("milan.subtitle_auth") : t("milan.login_required")}
        headerRight={
          isAuthenticated ? (
            <Button
              label={t("kundali.add_profile")}
              size="sm"
              onPress={() => setAddOpen(true)}
            />
          ) : undefined
        }
      >
        {authLoading ? (
          <View className={cn(kundaliClasses.emptyBox, "items-center")}>
            <ActivityIndicator />
          </View>
        ) : !isAuthenticated ? (
          <KundaliLoginPrompt
            icon="heart-outline"
            titleNe={t("milan.login_prompt_title")}
            titleEn={t("milan.login_prompt_title")}
            bodyNe={t("milan.login_prompt_body")}
            bodyEn={t("milan.login_prompt_body")}
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
          />
        ) : (
          <View className="gap-6">
            <Text className={kundaliClasses.profileHint} style={nepaliTextStyle(14)}>
              {t("ui.kundali_milan.select_profiles_for_groom_and_bride")}
            </Text>

            <View className="gap-3 sm:flex-row">
              <MilanSlot
                role="boy"
                label={t("ui.common.groom")}
                profile={boyProfile}
                onPress={() => setPickRole("boy")}
                onClear={() => setBoyProfile(null)}
              />
              <MilanSlot
                role="girl"
                label={t("ui.common.bride")}
                profile={girlProfile}
                onPress={() => setPickRole("girl")}
                onClear={() => setGirlProfile(null)}
              />
            </View>

            {boyProfile && girlProfile ? (
              !boyQuery || !girlQuery ? (
                <View className={cn(kundaliClasses.warnBox, "items-center")}>
                  <Text className={kundaliClasses.warnText} style={nepaliTextStyle(14)}>
                    {t("ui.kundali_milan.both_profiles_need_a_birth_date")}
                  </Text>
                </View>
              ) : milanQuery.isLoading && !milanQuery.data ? (
                <View className={cn(kundaliClasses.emptyBox, "items-center")}>
                  <ActivityIndicator />
                  <Text className={cn("mt-3", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
                    {t("ui.kundali_milan.matching_the_charts")}
                  </Text>
                </View>
              ) : milanQuery.data ? (
                <KundaliMilanResult
                  boyName={boyProfile.full_name}
                  girlName={girlProfile.full_name}
                  result={milanQuery.data.result}
                />
              ) : (
                <View className={cn(kundaliClasses.errorBox, "items-center")}>
                  <Text className={kundaliClasses.errorText} style={nepaliTextStyle(14)}>
                    {t("ui.kundali_milan.could_not_load_the_match_please")}
                  </Text>
                </View>
              )
            ) : null}
          </View>
        )}
      </KundaliPageShell>

      <ProfilePickModal
        open={pickRole !== null}
        role={pickRole}
        onClose={() => setPickRole(null)}
        onPick={(profile) => {
          if (pickRole === "boy") setBoyProfile(profile);
          if (pickRole === "girl") setGirlProfile(profile);
          setPickRole(null);
        }}
      />

      <ProfileFormModal
        open={addOpen}
        title={t("kundali.add_profile")}
        subtitle={t("ui.common.enter_accurate_birth_date_time_and")}
        onClose={() => setAddOpen(false)}
      >
        <ProfileForm
          initial={EMPTY_PROFILE}
          onCancel={() => setAddOpen(false)}
          onSaved={async () => {
            setAddOpen(false);
            await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
          }}
        />
      </ProfileFormModal>

      <AuthDialog
        key={authMode}
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
      />
    </>
  );
}

function MilanSlot({
  role,
  label,
  profile,
  onPress,
  onClear,
}: {
  role: "boy" | "girl";
  label: string;
  profile: Profile | null;
  onPress: () => void;
  onClear: () => void;
}) {
  const { t, pick } = useLocale();
  const colors = useThemeColors();

  return (
    <Card className="min-w-[280px] flex-1 gap-3 rounded-2xl">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name={role === "boy" ? "man-outline" : "woman-outline"}
            size={20}
            color={colors.secondary}
          />
          <Text className={kundaliDetailClasses.milanPicker.slotLabel} style={nepaliTextStyle(16)}>
            {label}
          </Text>
        </View>
        {profile ? (
          <Pressable onPress={onClear} className="rounded-lg p-1 active:bg-muted">
            <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {profile ? (
        <Pressable onPress={onPress} className="gap-1 active:opacity-80">
          <Text className={kundaliDetailClasses.milanPicker.slotName} style={nepaliTextStyle(15)}>
            {profile.full_name}
          </Text>
          <Text className={kundaliDetailClasses.milanPicker.slotMeta} style={nepaliTextStyle(12)}>
            {profile.birth_date || "—"}
            {profile.birth_time ? ` · ${profile.birth_time}` : ""}
          </Text>
          <Text className={kundaliDetailClasses.milanPicker.slotMeta} style={nepaliTextStyle(12)}>
            {profile.location_label || profile.city || "—"}
          </Text>
        </Pressable>
      ) : (
        <Button label={t("ui.kundali_milan.choose_profile")} variant="outline" onPress={onPress} />
      )}
    </Card>
  );
}

function ProfilePickModal({
  open,
  role,
  onClose,
  onPick,
}: {
  open: boolean;
  role: "boy" | "girl" | null;
  onClose: () => void;
  onPick: (profile: Profile) => void;
}) {
  const insets = useSafeAreaInsets();
  const { t, pick } = useLocale();
  const { data: profiles, isLoading } = useProfilesQuery(open);
  const colors = useThemeColors();

  const title =
    role === "boy"
      ? t("ui.kundali_milan.groom_profile")
      : t("ui.kundali_milan.bride_profile");

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="ml-3 text-base font-semibold text-foreground" style={nepaliTextStyle(16)}>
            {title}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: Math.max(insets.bottom, space.lg) }}>
          {isLoading ? (
            <ActivityIndicator />
          ) : (profiles ?? []).length === 0 ? (
            <Text className="text-sm text-foreground" style={nepaliTextStyle(14)}>
              {t("ui.kundali_milan.no_profiles_add_one_first")}
            </Text>
          ) : (
            <View className="gap-2">
              {(profiles ?? []).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onPick(p)}
                  className={cn("rounded-xl border border-border bg-card p-4 active:bg-muted")}
                >
                  <Text className={kundaliDetailClasses.milanPicker.pickName} style={nepaliTextStyle(16)}>
                    {p.full_name}
                  </Text>
                  <Text className={kundaliDetailClasses.milanPicker.pickMeta} style={nepaliTextStyle(12)}>
                    {p.birth_date || "—"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** A profile becomes a milan query only once it carries a usable birth moment. */
function milanPersonQuery(profile: Profile | null): MilanPersonQuery | null {
  if (!profile) return null;
  const chart = profileChartParams(profile);
  if (!chart) return null;
  return {
    moment: chart.moment,
    lat: chart.location.params.lat,
    lon: chart.location.params.lon,
    timezone: profile.timezone ?? chart.location.params.timezone,
  };
}
