import { useMemo, useState } from "react";
import { useThemeColors } from "@/lib/theme-context";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
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
  const { pick, lang } = useLocale();
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
      <AppShell title={pick("३D आकाश गोचर", "3D Aakash Gochar")} showHeader={false}>
        <PatroPageHeader
          icon={<AppNavIcon name="orbit" size={28} color={colors.secondary} />}
          title={pick("३D आकाश गोचर", "3D Aakash Gochar")}
          subtitle={`${pick(
            "भूकेन्द्रित दृष्टिकोणबाट प्रत्यक्ष ग्रह गोचर",
            "Live graha transits from the geocentric standpoint",
          )} · ${displayLocationLabel(location, undefined, lang)}`}
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
          <View className="items-center rounded-2xl border border-dashed border-border py-16">
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

        <View className="mt-3 gap-2">
          <Text className="text-body leading-relaxed text-muted-foreground" style={nepaliTextStyle(13)}>
            {pick(
              "पृथ्वी केन्द्रमा छ र क्यामेरा त्यसैको वरिपरि घुम्छ — यही भूकेन्द्रित दृष्टिकोणबाट वैदिक गोचर हेरिन्छ। प्रत्येक ग्रह आफ्नो निरयन देशान्तर र शरमा राखिएको छ, र चन्द्रदेखि शनिसम्मको परम्परागत क्रममा आफ्नो कक्षमा हिँड्छ।",
              "Earth sits at the centre and the camera orbits it — the geocentric standpoint Vedic gochar is read from. Each graha is placed at its true sidereal longitude and shara, riding a shell in the classical Moon-to-Saturn order.",
            )}
          </Text>
          <Text className="text-body leading-relaxed text-muted-foreground" style={nepaliTextStyle(13)}>
            {pick(
              "«यहाँबाट आकाश» दृश्यमा माथिको स्थान र मिति-समय अनुसार क्षितिज बन्छ — राशि वलय अक्षांश अनुसार ढल्किन्छ र घण्टै पिच्छे घुम्छ, त्यसैले यो पृथ्वीको कक्षसँग समानान्तर देखिँदैन। पहेँलो रेखा खगोलीय विषुवत् हो; त्यससँगको २३.४४° को झुकाव यहीँ प्रस्ट देखिन्छ।",
              "In “Sky from here” the horizon is built from the location and date-time above — the rashi belt tips with your latitude and swings with the hour, which is why it does not sit parallel to anything. The gold line is the celestial equator; the 23.44° tilt between the two is visible right there.",
            )}
          </Text>
          <Text className="text-body leading-relaxed text-muted-foreground" style={nepaliTextStyle(13)}>
            {pick(
              "गति रेखाले ४५ दिन अघि र पछिको बाटो देखाउँछ — मंगल वा शनि वक्री हुँदा त्यही रेखामा पछाडि फर्किएको पासो देखिन्छ। कुनै पनि ग्रह छोएर नजिक पुग्न सकिन्छ; «पूरा दृश्य» ले फेरि सिङ्गो सौर्यमण्डल देखाउँछ।",
              "The trail draws 45 days either side of the moment on screen — when Mars or Saturn turns vakri you can watch the loop close on itself. Tap any graha to fly in close to it; “Zoom out” pulls back to the whole system.",
            )}
          </Text>
          </View>

        <PatroFooterNote locationLabel={displayLocationLabel(location, undefined, lang)} />
      </AppShell>
      <FloatingNavBar />
    </View>
  );
}
