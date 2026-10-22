import { INLINE_LOADER_SIZE } from "@/components/ui/States";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { contentSectionId, useKundaliChart, useKundaliDetailPage } from "@vedic-patro/features/kundali";
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
import { useAuth } from "@/lib/auth/AuthContext";
import { getStoredAyanamshaMode, setStoredAyanamshaMode } from "@/lib/kundali/ayanamsha-storage";
import { useKundaliSection } from "@/lib/kundali/use-kundali-section";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { haptics } from "@vedic-patro/ui/motion";

const ayanamshaStorage = { load: getStoredAyanamshaMode, save: setStoredAyanamshaMode };

export default function KundaliDetailScreen() {
  const { profileId, created } = useLocalSearchParams<{ profileId: string; created?: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { section, setSection } = useKundaliSection();
  const profiles = useProfilesQuery(auth.isAuthenticated);
  const page = useKundaliDetailPage({ profileId, auth, profiles, ayanamshaStorage });
  const { status, profile, moment, location, copy, authDialog } = page;
  const { detail, status: chartStatus } = useKundaliChart(
    status === "ready" ? moment : null,
    location?.params,
    page.ayanamshaMode,
  );
  const showSidebar = useShowPanchangaSidebar();

  /* A profile just added from the hub opens with `?created=1`: its kundali is being
     drawn for the first time, which is the one moment the charts fade in and the
     phone answers with a success tick. Opening a saved kundali does neither. The
     flag is spent on that first paint so a section switch, a division change or a
     later visit to this screen never replays it. */
  const [chartEntrance, setChartEntrance] = useState(created === "1");
  const chartReady = Boolean(detail) && status === "ready";
  const chartShown = contentSectionId(section) === "kundali-overview" && Boolean(detail?.vargaCharts.entries["1"]?.length);
  useEffect(() => {
    if (!chartEntrance || !chartReady) return;
    // Never the only feedback: no chart on screen, no tick.
    if (chartShown) haptics.success();
    setChartEntrance(false);
    router.setParams({ created: undefined } as never);
  }, [chartEntrance, chartReady, chartShown, router]);

  const topBar = (
    <View className={cn(kundaliClasses.topBar, "mb-4")}>
      <Pressable onPress={() => router.back()} className={cn(kundaliClasses.backLink, "active:opacity-70")}>
        <Ionicons name="arrow-back" size={18} color={colors.foreground} />
        <Text className={kundaliClasses.backLinkText} style={nepaliTextStyle(14)}>
          {copy.backAll}
        </Text>
      </Pressable>
      <View className={kundaliClasses.topBarActions}>
        <Button
          label={copy.otherKundali}
          size="md"
          variant="outline"
          icon={<Ionicons name="sparkles-outline" size={16} color={colors.foreground} />}
          onPress={() => router.push("/kundali" as never)}
        />
        {profile ? (
          <Button
            label={copy.editProfile}
            size="md"
            variant="outline"
            icon={<Ionicons name="pencil-outline" size={14} color={colors.foreground} />}
            onPress={() => page.edit.setOpen(true)}
          />
        ) : null}
      </View>
    </View>
  );

  const renderBody = () => {
    if (status === "loading") {
      return (
        <View className={cn(kundaliClasses.emptyBoxTall, "items-center")}>
          <VedicPatroLoader label={null} size={INLINE_LOADER_SIZE} />
          <Text className={cn("mt-3", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
            {copy.loading}
          </Text>
        </View>
      );
    }

    if (status === "login") {
      return (
        <KundaliLoginPrompt
          title={copy.loginTitle}
          body={copy.loginRequired}
          onLogin={authDialog.openLogin}
          onSignup={authDialog.openSignup}
        />
      );
    }

    if (status === "not-found" || !profile) {
      return (
        <View className={cn(kundaliClasses.noticeBox, "items-center")}>
          <Text className={kundaliClasses.noticeTitle} style={nepaliTextStyle(14)}>
            {copy.notFound}
          </Text>
          <Text className={kundaliClasses.noticeBody} style={nepaliTextStyle(14)}>
            {copy.notFoundBody}
          </Text>
        </View>
      );
    }

    if (status === "no-birth") {
      return (
        <View className={cn(kundaliClasses.noBirthBox, "items-center")}>
          <Ionicons name="time-outline" size={40} color={colors.mutedForeground} />
          <Text className={cn("mt-4", kundaliClasses.noBirthTitle)} style={nepaliTextStyle(16)}>
            {copy.noBirthTitle}
          </Text>
          <Text className={kundaliClasses.noBirthBody} style={nepaliTextStyle(14)}>
            {copy.noBirthBody}
          </Text>
          <View className="mt-6">
            <Button label={copy.editProfile} onPress={() => page.edit.setOpen(true)} />
          </View>
        </View>
      );
    }

    if (chartStatus === "loading") {
      return (
        <View className={cn(kundaliClasses.computingBox, "items-center")}>
          <VedicPatroLoader label={null} size={INLINE_LOADER_SIZE} />
          <Text className={cn("mt-3", kundaliClasses.emptyText)} style={nepaliTextStyle(14)}>
            {copy.computing}
          </Text>
        </View>
      );
    }

    if (!detail) {
      return (
        <View className={kundaliClasses.loadError}>
          <Text className={kundaliClasses.loadErrorText} style={nepaliTextStyle(14)}>
            {copy.loadError}
          </Text>
        </View>
      );
    }

    return (
      <View>
        <KundaliProfileHeader profile={profile} eyebrow={copy.eyebrow} meta={page.meta} />
        <AyanamshaSelector mode={page.ayanamshaMode} onModeChange={page.setAyanamshaMode} />
        {!showSidebar ? (
          <KundaliSectionNav variant="horizontal" activeId={section} onNavigate={setSection} />
        ) : null}
        <KundaliDetailView
          detail={detail}
          section={section}
          onSectionChange={setSection}
          ayanamshaMode={page.ayanamshaMode}
          timeZone={profile.timezone ?? undefined}
          birthMoment={moment}
          birthLocation={location?.params}
          reportDisabled={false}
          onNavigate={setSection}
          chartEntrance={chartEntrance}
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
        key={authDialog.mode}
        open={authDialog.open}
        onOpenChange={authDialog.setOpen}
        initialMode={authDialog.mode}
      />

      {profile ? (
        <BottomSheetModal
          visible={page.edit.open}
          onClose={() => page.edit.setOpen(false)}
          keyboardAvoiding
          maxHeight="92%"
        >
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Pressable onPress={() => page.edit.setOpen(false)} hitSlop={8} className="min-w-[4.5rem] active:opacity-70">
              <Text className="text-sm text-foreground" style={nepaliTextStyle(15)}>
                {copy.cancel}
              </Text>
            </Pressable>
            <Text
              className="min-w-0 flex-1 text-center text-lg font-semibold tracking-tight text-foreground"
              style={nepaliTextStyle(16)}
              numberOfLines={1}
            >
              {copy.editProfile}
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
              onCancel={() => page.edit.setOpen(false)}
              onSaved={async () => {
                page.edit.setOpen(false);
                await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
              }}
            />
          </ScrollView>
        </BottomSheetModal>
      ) : null}
    </>
  );
}
