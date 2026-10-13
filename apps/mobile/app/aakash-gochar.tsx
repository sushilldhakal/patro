import { useMemo, useState } from "react";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { PatroFooterNote } from "@/components/branding/PatroFooterNote";
import { AakashGocharSky } from "@/components/sky3d/AakashGocharSky";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { defaultClockForTimezone, parseClockParts } from "@/components/panchanga/use-panchanga-mode";
import { Text } from "@/components/ui/Text";
import { fetchGochar, gocharKeys } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { KATHMANDU, type Observer } from "@vedic-patro/domain/sky3d/horizon";
import { displayLocationLabel, usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

/** Roughly what the date chrome above the scene occupies. */
const DATE_NAV_HEIGHT = 132;
const SCENE_MIN_HEIGHT = 380;
/** Phones keep the scene inside a scrollable page rather than filling it. */
const PHONE_SCENE_HEIGHT = 460;

/**
 * A fixed height left half an iPad empty. Tablets get whatever the viewport has
 * left under the date chrome; phones keep the old size, where a taller scene
 * would just push the notes below it out of reach.
 */
function sceneHeightFor(screenH: number, safeAreaTop: number, isTablet: boolean): number {
  const available = screenH - safeAreaTop - DATE_NAV_HEIGHT - 24;
  const target = isTablet ? available : Math.min(available, PHONE_SCENE_HEIGHT);
  return Math.max(SCENE_MIN_HEIGHT, Math.round(target));
}

/**
 * 3D Aakash Gochar — the live sky in three dimensions, seen from the Earth.
 *
 * The API supplies the sidereal longitudes for the chosen date; the scene pins
 * its own orbital model onto them and animates outward from there, so pressing
 * play walks the real gochar forward rather than an approximation of it.
 */
export default function AakashGocharScreen() {
  const { t, lang } = useLocale();
  const colors = useThemeColors();
  const { height: screenH, isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const { location, setLocation } = usePanchangaLocation();
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));
  const [clock, setClock] = useState(() => defaultClockForTimezone(tz));

  const sceneHeight = useMemo(
    () => sceneHeightFor(screenH, insets.top, isTablet),
    [screenH, insets.top, isTablet],
  );

  const dateAd = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [date]);

  /* The scene reads a single instant — merge the picked day with the picked
     clock so "Done" in the sheet actually moves the sky, not just the date. */
  const sceneDate = useMemo(() => {
    const { hour, minute } = parseClockParts(clock);
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [date, clock]);

  /* The horizon/globe view is drawn from these coordinates — the observer frame
     and the "you are here" pin both. Every location now carries them (picked
     cities via cityToLocation, the default and older stored ones via the heal in
     usePanchangaLocation), so the constant below is a type-level backstop rather
     than a place the app actually lands on. */
  const observer: Observer = useMemo(() => {
    const { lat, lon } = location.params;
    return lat != null && lon != null ? { lat, lon } : KATHMANDU;
  }, [location.params]);

  const query = useQuery({
    queryKey: gocharKeys.dayLegacy(dateAd, "ad", location.params),
    queryFn: () => fetchGochar(dateAd, "ad", location.params),
    /* Without this, `isLoading` goes true on every date change (no data yet
       under the new key), which swaps AakashGocharSky out for the spinner —
       unmounting it and wiping its fullscreen/mode/camera state. Keeping the
       previous day's data on screen during the refetch keeps it mounted. */
    placeholderData: keepPreviousData,
  });

  return (
    /* Outside the (tabs) group, so this route has to bring the app chrome the
       tab layout gives every other page — same header and floating nav. */
    <View className="flex-1 bg-background">
      <AppHeader />
      <AppShell title={t("sidebar_nav.items.aakash-gochar.label")} showHeader={false}>
        <View className="gap-8">
        <PageHeader
          icon={<AppNavIcon name="orbit" size={28} color={colors.secondary} />}
          title={t("sidebar_nav.items.aakash-gochar.label")}
          subtitle={`${t("ui.aakash_gochar.live_graha_transits_from_the_geocentric")} · ${displayLocationLabel(location, undefined, lang)}`}
        />
        <PanchangaDateNav
          date={date}
          onDateChange={setDate}
          todayAd={todayAd}
          clock={clock}
          onClockChange={setClock}
          location={location}
          onLocationChange={setLocation}
          adDateStr={dateAd}
        />

        {query.isLoading ? (
          <View className={gocharClasses.skyLoading}>
            <VedicPatroLoader />
          </View>
        ) : (
          /* The scene runs on its own model, so a failed fetch costs accuracy for
             the day on screen, not the view itself. */
          <AakashGocharSky
            gochar={query.data?.gochar}
            vedicStars={query.data?.vedic_stars}
            ayanamsaDeg={query.data?.ayanamsa?.degrees}
            date={sceneDate}
            onDateChange={setDate}
            clock={clock}
            onClockChange={setClock}
            todayAd={todayAd}
            observer={observer}
            timeZone={tz}
            height={sceneHeight}
          />
        )}

        <View className={gocharClasses.footnoteStack}>
          <Text className={gocharClasses.footnote} style={nepaliTextStyle()}>
            {t("ui.aakash_gochar.earth_sits_at_the_centre_and")}
          </Text>
          <Text className={gocharClasses.footnote} style={nepaliTextStyle()}>
            {t("ui.aakash_gochar.in_sky_from_here_the_horizon")}
          </Text>
          <Text className={gocharClasses.footnote} style={nepaliTextStyle()}>
            {t("ui.aakash_gochar.the_trail_draws_45_days_either")}
          </Text>
          </View>

        <PatroFooterNote locationLabel={displayLocationLabel(location, undefined, lang)} />
        </View>
      </AppShell>
      <FloatingNavBar />
    </View>
  );
}
