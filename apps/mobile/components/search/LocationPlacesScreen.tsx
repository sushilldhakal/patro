import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { router } from "expo-router";
import { SidebarDrawer } from "@/components/AppHeader";
import { isLargeScreenSize } from "@/lib/responsive";
import { useWeatherPage, type WeatherPage } from "@vedic-patro/features/weather";
import { useLocale } from "@vedic-patro/i18n/react";
import { haptics } from "@vedic-patro/ui/motion";
import { locateDevice } from "@/components/panchanga/locate-device";
import { PlacesScreen, placesStorage } from "@/components/weather/WeatherPlacesScreen";
import { usePanchangaLocation, type PanchangaLocation } from "@/lib/use-panchanga-location";
import type { PlacePick } from "@/lib/menu-request";

/**
 * The header's place picker: the weather page's places screen itself (same cards, मुख्य default, ⋯ edit
 * list and units, search at the foot), over the same saved list. Here a place is chosen for the whole app:
 * tapping a card, making one primary, or adding one from search sets the app's place.
 * Mounted only while open, so the list and GPS are read fresh each time.
 */
let pendingPick: PlacePick | undefined;

let openPanel: ((request: { onPick?: PlacePick }) => void) | null = null;

/**
 * Opens the picker: a sidebar from the left edge on a big screen (isLargeScreenSize) (the side menu's size,
 * LocationPlacesPanelHost), otherwise a stack page (app/places) that slides in and swipes back.
 */
export function openLocationPlaces(onPick?: PlacePick) {
  const { width, height } = Dimensions.get("window");
  if (openPanel && isLargeScreenSize(width, height)) {
    openPanel({ onPick });
    return;
  }
  pendingPick = onPick;
  router.push("/places");
}

/** Wide screens: the same picker (cards, search at the foot) in the side menu's sidebar. Mounted once at the root. */
export function LocationPlacesPanelHost() {
  const [request, setRequest] = useState<{ onPick?: PlacePick } | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    openPanel = (next) => {
      setRequest(next);
      setVisible(true);
    };
    return () => {
      openPanel = null;
    };
  }, []);
  const close = useCallback(() => setVisible(false), []);
  const dismissed = useCallback(() => setRequest(null), []);
  return (
    <SidebarDrawer visible={visible} onClose={close} onDismissed={dismissed}>
      {request ? <Picker onClose={close} onPick={request.onPick} /> : null}
    </SidebarDrawer>
  );
}

/** The app/places route. */
export function LocationPlacesPage() {
  const [onPick] = useState(() => pendingPick);
  useEffect(() => () => { pendingPick = undefined; }, []);
  return <Picker onClose={() => router.canGoBack() && router.back()} onPick={onPick} />;
}

function Picker({ onClose, onPick }: { onClose: () => void; onPick?: PlacePick }) {
  const { t } = useLocale();
  const { location, setLocation: setAppLocation } = usePanchangaLocation();
  // Pick mode (a birth place): the choice goes back to the caller; the app's place stays.
  const setLocation = (next: PanchangaLocation) => (onPick ? onPick(next) : setAppLocation(next));
  const page = useWeatherPage({ location, locate: locateDevice, storage: placesStorage });
  const { places } = page;

  const { setListOpen, listOpen } = places;
  const shown = useRef(false);
  useEffect(() => {
    if (!shown.current) {
      shown.current = true;
      setListOpen(true);
    } else if (!listOpen) onClose(); // the back arrow / Android back
  }, [listOpen, setListOpen, onClose]);

  const use = (p: WeatherPage["places"]["pages"][number] | undefined) => {
    if (!p) return;
    haptics.tick();
    setLocation({ label: p.location.label || p.name, params: p.location.params });
    onClose();
  };
  // The city picked in search, kept until "make it primary?" is answered.
  const picked = useRef<PanchangaLocation | null>(null);

  const pickerPage: WeatherPage = {
    ...page,
    places: {
      ...places,
      makePrimary: (id) => {
        places.makePrimary(id);
        haptics.tick();
        const p = places.pages.find((x) => x.id === id);
        if (p && !onPick) setLocation({ label: p.location.label || p.name, params: p.location.params });
      },
      pick: (next) => {
        picked.current = next;
        places.pick(next);
      },
      confirm: (primary) => {
        places.confirm(primary);
        if (picked.current) setLocation(picked.current);
        onClose();
      },
    },
  };

  // The search and "make it primary?" sheets are drawn inside PlacesScreen, over the list.
  return <PlacesScreen asPage page={pickerPage} title={t("location.label")} onChoose={(i) => use(places.pages[i])} />;
}
