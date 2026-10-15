import { useMemo } from "react";
import { useAakashGocharPage } from "@vedic-patro/features/aakash-gochar";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { PatroFooterNote } from "@/components/branding/PatroFooterNote";
import { AakashGocharSky } from "@/components/sky3d/AakashGocharSky";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { GocharSkySection } from "@vedic-patro/ui/kit/panchanga";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
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
 * 3D Aakash Gochar — the app's drawing of `useAakashGocharPage` (@vedic-patro/features).
 * The live sky in three dimensions, seen from the Earth.
 *
 * The API supplies the sidereal longitudes for the chosen date; the scene pins
 * its own orbital model onto them and animates outward from there, so pressing
 * play walks the real gochar forward rather than an approximation of it.
 */
export default function AakashGocharScreen() {
  const colors = useThemeColors();
  const { height: screenH, isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const { location, setLocation } = usePanchangaLocation();
  const page = useAakashGocharPage({ location });

  const sceneHeight = useMemo(() => sceneHeightFor(screenH, insets.top, isTablet), [screenH, insets.top, isTablet]);

  return (
    /* Outside the (tabs) group, so this route has to bring the app chrome the
       tab layout gives every other page — same header and floating nav. */
    <View className="flex-1 bg-background">
      <AppHeader />
      <AppShell title={page.copy.title} showHeader={false}>
        <View className="gap-8">
          <PageHeader
            icon={<AppNavIcon name="orbit" size={28} color={colors.secondary} />}
            title={page.copy.title}
            subtitle={page.copy.subtitle}
          />
          <PanchangaDateNav
            date={page.date}
            onDateChange={page.setDate}
            todayAd={page.todayAd}
            clock={page.clock}
            onClockChange={page.setClock}
            location={location}
            onLocationChange={setLocation}
            adDateStr={page.dateAd}
          />

          {page.showLoader ? (
            <View className={gocharClasses.skyLoading}>
              <VedicPatroLoader />
            </View>
          ) : (
            /* The scene runs on its own model, so a failed fetch costs accuracy for
               the day on screen, not the view itself. */
            <AakashGocharSky
              gochar={page.gochar}
              vedicStars={page.vedicStars}
              ayanamsaDeg={page.ayanamsaDeg}
              date={page.sceneDate}
              onDateChange={page.setDate}
              clock={page.clock}
              onClockChange={page.setClock}
              todayAd={page.todayAd}
              observer={page.observer}
              timeZone={page.timeZone}
              height={sceneHeight}
            />
          )}

          {page.isError ? (
            <Text className={gocharClasses.skyNotice} style={nepaliTextStyle()}>
              {page.copy.fetchError}
            </Text>
          ) : null}

          {page.gochar ? (
            <View className={page.stale ? "opacity-60" : undefined}>
              <GocharSkySection gochar={page.gochar} dateLabel={page.dateLabel} onSelectPlanet={page.toggleSelected} />
            </View>
          ) : null}

          <View className={gocharClasses.footnoteStack}>
            {page.copy.footnotes.map((note) => (
              <Text key={note} className={gocharClasses.footnote} style={nepaliTextStyle()}>
                {note}
              </Text>
            ))}
          </View>

          <PatroFooterNote locationLabel={page.locationLabel} />
        </View>
      </AppShell>
      <FloatingNavBar />
    </View>
  );
}
