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
import { cn } from "@/lib/utils";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { KundaliMilanResult } from "@/components/kundali/KundaliMilanResult";
import { fetchKundaliMilan, milanKeys, type MilanPersonQuery } from "@/lib/api";
import { profileChartParams } from "@/lib/kundali/profile-chart";

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
          <View className="items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12">
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
          <View className="gap-4">
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick("वर र कन्याका प्रोफाइल छान्नुहोस्।", "Select profiles for groom and bride.")}
            </Text>

            <View className="gap-3 md:flex-row">
              <MilanSlot
                role="boy"
                label={pick("वर", "Groom")}
                profile={boyProfile}
                onPress={() => setPickRole("boy")}
                onClear={() => setBoyProfile(null)}
              />
              <MilanSlot
                role="girl"
                label={pick("कन्या", "Bride")}
                profile={girlProfile}
                onPress={() => setPickRole("girl")}
                onClear={() => setGirlProfile(null)}
              />
            </View>

            {boyProfile && girlProfile ? (
              !boyQuery || !girlQuery ? (
                <Card className="gap-2">
                  <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                    {pick(
                      "दुवै प्रोफाइलमा जन्म मिति चाहिन्छ — खातामा गएर थप्नुहोस्।",
                      "Both profiles need a birth date — add one in your account.",
                    )}
                  </Text>
                </Card>
              ) : milanQuery.isLoading && !milanQuery.data ? (
                <View className="items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12">
                  <ActivityIndicator />
                  <Text className="text-body mt-3 text-muted-foreground" style={nepaliTextStyle(14)}>
                    {pick("मिलान गणना हुँदै…", "Matching the charts…")}
                  </Text>
                </View>
              ) : milanQuery.data ? (
                <KundaliMilanResult
                  boyName={boyProfile.full_name}
                  girlName={girlProfile.full_name}
                  result={milanQuery.data.result}
                />
              ) : (
                <Card>
                  <Text className="text-body text-destructive" style={nepaliTextStyle(14)}>
                    {pick(
                      "मिलान ल्याउन सकिएन। पछि पुनः प्रयास गर्नुहोस्।",
                      "Could not load the match. Please try again shortly.",
                    )}
                  </Text>
                </Card>
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
        title={pick("प्रोफाइल थप्नुहोस्", "Add profile")}
        subtitle={pick("जन्म मिति, समय र स्थान सही राख्नुहोस्।", "Enter accurate birth date, time, and place.")}
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
  const { pick } = useLocale();
  const colors = useThemeColors();

  return (
    <Card className="min-w-[280px] flex-1 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons
            name={role === "boy" ? "man-outline" : "woman-outline"}
            size={20}
            color={colors.secondary}
          />
          <Text className="font-semibold text-foreground" style={nepaliTextStyle(16)}>
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
          <Text className="font-medium text-foreground" style={nepaliTextStyle(15)}>
            {profile.full_name}
          </Text>
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
            {profile.birth_date || "—"}
            {profile.birth_time ? ` · ${profile.birth_time}` : ""}
          </Text>
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
            {profile.location_label || profile.city || "—"}
          </Text>
        </Pressable>
      ) : (
        <Button label={pick("प्रोफाइल छान्नुहोस्", "Choose profile")} variant="outline" onPress={onPress} />
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
  const { pick } = useLocale();
  const { data: profiles, isLoading } = useProfilesQuery(open);
  const colors = useThemeColors();

  const title =
    role === "boy"
      ? pick("वरको प्रोफाइल", "Groom profile")
      : pick("कन्याको प्रोफाइल", "Bride profile");

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="text-body ml-3 font-semibold text-foreground" style={nepaliTextStyle(16)}>
            {title}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
          {isLoading ? (
            <ActivityIndicator />
          ) : (profiles ?? []).length === 0 ? (
            <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick("कुनै प्रोफाइल छैन — पहिले प्रोफाइल थप्नुहोस्।", "No profiles — add one first.")}
            </Text>
          ) : (
            <View className="gap-2">
              {(profiles ?? []).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onPick(p)}
                  className={cn("rounded-xl border border-border bg-card p-4 active:bg-muted")}
                >
                  <Text className="font-semibold text-foreground" style={nepaliTextStyle(16)}>
                    {p.full_name}
                  </Text>
                  <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(12)}>
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
