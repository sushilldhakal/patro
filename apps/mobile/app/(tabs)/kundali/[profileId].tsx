import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { ProfileForm, profileToInput } from "@/components/auth/ProfileForm";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import { KundaliSectionNav } from "@/components/kundali/KundaliSectionNav";
import { useShowPanchangaSidebar } from "@/components/panchanga/PanchangaSplitShell";
import { KundaliDetailView } from "@/components/kundali/KundaliDetailView";
import { KundaliLoginPrompt } from "@/components/kundali/KundaliLoginPrompt";
import { KundaliPageShell } from "@/components/kundali/KundaliPageShell";
import {
  KundaliProfileHeader,
} from "@/components/kundali/KundaliProfileHeader";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { fetchKundaliDetail, kundaliDetailKeys } from "@/lib/api";
import { type AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { getStoredAyanamshaMode, setStoredAyanamshaMode } from "@/lib/kundali/ayanamsha-storage";
import { useKundaliSection } from "@/lib/kundali/use-kundali-section";
import { formatProfileBirthLabel, profileChartParams, profileLocation } from "@vedic-patro/domain/kundali/profile-chart";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { useThemeColors } from "@/lib/theme-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";

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
  const showSidebar = useShowPanchangaSidebar();

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const topBar = (
    <View className={cn(kundaliClasses.topBar, "mb-4")}>
      <Pressable onPress={() => router.back()} className={cn(kundaliClasses.backLink, "active:opacity-70")}>
        <Ionicons name="arrow-back" size={18} color={colors.foreground} />
        <Text className={kundaliClasses.backLinkText} style={nepaliTextStyle(14)}>
          {pick("सबै कुण्डली", "All charts")}
        </Text>
      </Pressable>
      <View className={kundaliClasses.topBarActions}>
        <Button
          label={pick("अर्को कुण्डली", "Other chart")}
          size="md"
          variant="outline"
          icon={<Ionicons name="sparkles-outline" size={16} color={colors.foreground} />}
          onPress={() => router.push("/kundali" as never)}
        />
        {profile ? (
          <Button
            label={pick("प्रोफाइल सम्पादन गर्नुहोस्", "Edit profile")}
            size="md"
            variant="outline"
            icon={<Ionicons name="pencil-outline" size={14} color={colors.foreground} />}
            onPress={() => setEditOpen(true)}
          />
        ) : null}
      </View>
    </View>
  );

  const renderBody = () => {
    if (authLoading || (isAuthenticated && profilesLoading && !profile)) {
      return (
        <View className={cn(kundaliClasses.emptyBoxTall, "items-center")}>
          <ActivityIndicator />
          <Text className={cn("mt-3", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
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
        <View className={cn(kundaliClasses.noticeBox, "items-center")}>
          <Text className={kundaliClasses.noticeTitle} style={nepaliTextStyle(14)}>
            {pick("प्रोफाइल फेला परेन।", "Profile not found.")}
          </Text>
          <Text className={kundaliClasses.noticeBody} style={nepaliTextStyle(14)}>
            {pick("प्रोफाइल मेटिएको वा लिङ्क गलत हुन सक्छ।", "The profile may have been removed or the link is wrong.")}
          </Text>
        </View>
      );
    }

    if (!profile) return null;

    if (!canShowChart) {
      return (
        <View className={cn(kundaliClasses.noBirthBox, "items-center")}>
          <Ionicons name="time-outline" size={40} color={colors.mutedForeground} />
          <Text className={cn("mt-4", kundaliClasses.noBirthTitle)} style={nepaliTextStyle(16)}>
            {pick("जन्म मिति छैन", "No birth date")}
          </Text>
          <Text className={kundaliClasses.noBirthBody} style={nepaliTextStyle(14)}>
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
        <View className={cn(kundaliClasses.computingBox, "items-center")}>
          <ActivityIndicator />
          <Text className={cn("mt-3", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
            {pick("कुण्डली गणना हुँदै…", "Computing the chart…")}
          </Text>
        </View>
      );
    }

    if (!detail) {
      return (
        <View className={kundaliClasses.loadError}>
          <Text className={kundaliClasses.loadErrorText} style={nepaliTextStyle(14)}>
            {pick(
              "कुण्डली ल्याउन सकिएन। मिति/समय/स्थान जाँचेर पुनः प्रयास गर्नुहोस्।",
              "Could not load the chart. Check the date, time and place and try again.",
            )}
          </Text>
        </View>
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
        {!showSidebar ? (
          <KundaliSectionNav variant="horizontal" activeId={section} onNavigate={setSection} />
        ) : null}
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
              <Text className="text-sm text-foreground" style={nepaliTextStyle(15)}>
                {pick("रद्द", "Cancel")}
              </Text>
            </Pressable>
            <Text
              className="min-w-0 flex-1 text-center text-lg font-semibold tracking-tight text-foreground"
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
              paddingHorizontal: space.lg,
              paddingTop: space.lg,
              paddingBottom: Math.max(insets.bottom, space.lg),
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
