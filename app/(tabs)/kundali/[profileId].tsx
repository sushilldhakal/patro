import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { KundaliDetailView } from "@/components/kundali/KundaliDetailView";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { KundaliPageShell } from "@/components/kundali/KundaliPageShell";
import {
  KundaliProfileHeader,
} from "@/components/kundali/KundaliProfileHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { fetchKundaliDetail, kundaliDetailKeys } from "@/lib/api";
import { type AyanamshaMode } from "@/lib/ayanamsha";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { getStoredAyanamshaMode, setStoredAyanamshaMode } from "@/lib/kundali/ayanamsha-storage";
import { useKundaliSection } from "@/lib/kundali/use-kundali-section";
import { formatProfileBirthLabel, profileChartParams, profileLocation } from "@/lib/kundali/profile-chart";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { useThemeColors } from "@/lib/theme-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function KundaliDetailScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { lang, pick, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [editOpen, setEditOpen] = useState(false);
  const [ayanamshaMode, setAyanamshaModeState] = useState<AyanamshaMode>("nepal");
  const { section, setSection } = useKundaliSection();

  useEffect(() => {
    void getStoredAyanamshaMode().then((saved) => {
      if (saved) setAyanamshaModeState(saved);
    });
  }, []);

  const setAyanamshaMode = (next: AyanamshaMode) => {
    setAyanamshaModeState(next);
    void setStoredAyanamshaMode(next);
  };

  const { data: profiles, isLoading: profilesLoading, isError: profilesError } = useProfilesQuery(
    isAuthenticated,
  );

  const profile = useMemo(
    () => profiles?.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );
  const location = useMemo(() => (profile ? profileLocation(profile) : null), [profile]);
  const chart = profile ? profileChartParams(profile) : null;
  const moment = chart?.moment ?? null;

  const detailQueryKey = useMemo(
    () =>
      moment && chart
        ? kundaliDetailKeys.atTime(moment, chart.location.params, ayanamshaMode)
        : (["kundali", "detail", "idle", profileId ?? ""] as const),
    [moment, chart, profileId, ayanamshaMode],
  );

  const detailQuery = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => fetchKundaliDetail(moment!, chart!.location.params, { ayanamsha: ayanamshaMode }),
    enabled: Boolean(moment && chart),
    staleTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });

  const detail = detailQuery.data;
  const canShowChart = Boolean(moment && location && chart);

  const birthDateLabel = profile
    ? formatProfileBirthLabel(profile, lang, lang === "en" ? digits : toNepaliDigits)
    : "—";
  const birthTime = profile?.birth_time ? digits(profile.birth_time) : "—";
  const place = profile?.location_label || profile?.city || "—";

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const topBar = (
    <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
      <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 active:opacity-70">
        <Ionicons name="arrow-back" size={18} color={colors.foreground} />
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("सबै कुण्डली", "All charts")}
        </Text>
      </Pressable>
      <View className="flex-row flex-wrap gap-2">
        <Button
          label={pick("अर्को कुण्डली", "Other chart")}
          size="sm"
          variant="outline"
          onPress={() => router.push("/kundali" as never)}
        />
        {profile ? (
          <Button
            label={pick("सम्पादन", "Edit profile")}
            size="sm"
            variant="outline"
            onPress={() => setEditOpen(true)}
          />
        ) : null}
      </View>
    </View>
  );

  const renderBody = () => {
    if (authLoading || (isAuthenticated && profilesLoading && !profile)) {
      return (
        <View className="items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-16">
          <ActivityIndicator />
          <Text className="mt-3 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("लोड हुँदै…", "Loading…")}
          </Text>
        </View>
      );
    }

    if (!isAuthenticated) {
      return (
        <KundaliLoginPrompt
          titleNe="कुण्डली हेर्न लगइन"
          titleEn="Log in to view kundali"
          bodyNe="यो कुण्डली हेर्न साइन इन गर्नुहोस्।"
          bodyEn="Sign in to view this birth chart."
          onLogin={() => openAuth("login")}
          onSignup={() => openAuth("signup")}
        />
      );
    }

    if (profilesError || (!profilesLoading && !profile)) {
      return (
        <Card>
          <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
            {pick("प्रोफाइल फेला परेन।", "Profile not found.")}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
            {pick("प्रोफाइल मेटिएको वा लिङ्क गलत हुन सक्छ।", "The profile may have been removed or the link is wrong.")}
          </Text>
        </Card>
      );
    }

    if (!profile) return null;

    if (!canShowChart) {
      return (
        <View className="items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16">
          <Ionicons name="time-outline" size={40} color={colors.mutedForeground} />
          <Text className="mt-4 text-base font-semibold text-foreground" style={nepaliTextStyle(16)}>
            {pick("जन्म मिति छैन", "No birth date")}
          </Text>
          <Text className="mt-2 max-w-md text-center text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick(
              "कुण्डली बनाउन जन्म मिति, समय र स्थान थप्नुहोस्।",
              "Add birth date, time and place to generate the chart.",
            )}
          </Text>
          <View className="mt-6">
            <Button label={pick("प्रोफाइल सम्पादन", "Edit profile")} onPress={() => setEditOpen(true)} />
          </View>
        </View>
      );
    }

    if (detailQuery.isLoading && !detail) {
      return (
        <View className="items-center rounded-xl border border-dashed border-border bg-muted/20 px-5 py-16">
          <ActivityIndicator />
          <Text className="mt-3 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("कुण्डली गणना हुँदै…", "Computing the chart…")}
          </Text>
        </View>
      );
    }

    if (!detail) {
      return (
        <Card>
          <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className="text-sm">
            {pick(
              "कुण्डली ल्याउन सकिएन। मिति/समय/स्थान जाँचेर पुनः प्रयास गर्नुहोस्।",
              "Could not load the chart. Check the date, time and place and try again.",
            )}
          </Text>
        </Card>
      );
    }

    return (
      <View>
        <KundaliProfileHeader
          profile={profile}
          birthDateLabel={birthDateLabel}
          birthTime={birthTime}
          place={place}
        />
        <AyanamshaSelector mode={ayanamshaMode} onModeChange={setAyanamshaMode} />
        <KundaliDetailView
          detail={detail}
          section={section}
          onSectionChange={setSection}
          ayanamshaMode={ayanamshaMode}
          timeZone={profile?.timezone ?? undefined}
          birthMoment={moment}
          birthLocation={chart?.location.params}
          reportDisabled={false}
          onNavigate={setSection}
        />
      </View>
    );
  };

  return (
    <>
      <KundaliPageShell
        variant="detail"
        sectionNav={{ activeId: section, onNavigate: setSection }}
      >
        {topBar}
        {renderBody()}
      </KundaliPageShell>

      <AuthDialog
        key={authMode}
        open={authOpen}
        onOpenChange={setAuthOpen}
        initialMode={authMode}
      />

      {profile ? (
        <BottomSheetModal
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          keyboardAvoiding
          maxHeight="92%"
        >
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Pressable onPress={() => setEditOpen(false)} hitSlop={8} className="min-w-[4.5rem] active:opacity-70">
              <Text className="text-base text-muted-foreground" style={nepaliTextStyle(15)}>
                {pick("रद्द", "Cancel")}
              </Text>
            </Pressable>
            <Text
              className="min-w-0 flex-1 text-center text-base font-semibold text-foreground"
              style={nepaliTextStyle(16)}
              numberOfLines={1}
            >
              {pick("प्रोफाइल सम्पादन", "Edit profile")}
            </Text>
            <View className="min-w-[4.5rem]" />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <ProfileForm
              initial={profileToInput(profile)}
              existing={profile}
              onCancel={() => setEditOpen(false)}
              onSaved={async () => {
                setEditOpen(false);
                await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
              }}
            />
          </ScrollView>
        </BottomSheetModal>
      ) : null}
    </>
  );
}
