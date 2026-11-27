import { useEffect, useRef } from "react";
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
export function LocationPlacesScreen({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick?: PlacePick }) {
  return open ? <Picker onClose={onClose} onPick={onPick} /> : null;
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
  return <PlacesScreen page={pickerPage} title={t("location.label")} onChoose={(i) => use(places.pages[i])} />;
}
