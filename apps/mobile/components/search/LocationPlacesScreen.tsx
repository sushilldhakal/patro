import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { weatherClasses as wc } from "@vedic-patro/design-tokens/classes/weather-classes";
import { placeId, useWeatherPlaces, type WeatherPlacesStorage } from "@vedic-patro/features/weather";
import { useLocale } from "@vedic-patro/i18n/react";
import { displayLocationLabel } from "@vedic-patro/read-models/geography/panchanga-location";
import { haptics } from "@vedic-patro/ui/motion";
import { UiIcon } from "@vedic-patro/ui/kit/weather";
import { LocationSearchSheet } from "@/components/search/LocationSearchSheet";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { usePanchangaLocation, type PanchangaLocation } from "@/lib/use-panchanga-location";

/** The weather page's saved places (same key), so a place added on either screen shows on both. */
const placesStorage: WeatherPlacesStorage = {
  read: (key) => AsyncStorage.getItem(key),
  write: (key, value) => void AsyncStorage.setItem(key, value),
};

/**
 * The header's place picker, drawn like the weather page's places screen: a full screen with the app's
 * place first, the saved places under it, and a search bar at the foot that finds and adds a city.
 * Mounted only while open, so it reads the saved list fresh each time.
 */
export function LocationPlacesScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <PlacesList onClose={onClose} /> : null;
}

function PlacesList({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLocale();
  const { location, setLocation } = usePanchangaLocation();
  // No `locate`: this list asks for no GPS; "use my location" is in the search sheet.
  const places = useWeatherPlaces({ location, storage: placesStorage });
  const [searchOpen, setSearchOpen] = useState(false);
  const currentId = placeId(location.params);
  const nameOf = (p: PanchangaLocation) => displayLocationLabel(p, undefined, lang);

  const choose = (next: PanchangaLocation) => {
    haptics.tick();
    setLocation(next);
    onClose();
  };
  // Saved places other than the app's own (it is drawn first, ticked).
  const saved = places.pages.slice(1).filter((p) => p.id !== currentId);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className={cn("flex-row", wc.topBar, "pr-3")}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("weather.back")}
            onPress={onClose}
            hitSlop={8}
            className="size-11 items-center justify-center active:opacity-60"
          >
            <UiIcon name="arrow-left" size={24} tone="foreground" />
          </Pressable>
          <Text className={wc.placesTitle} numberOfLines={1} style={nepaliTextStyle()}>
            {t("location.label")}
          </Text>
        </View>

        <ScrollView contentContainerClassName="gap-3 px-4 pb-4 pt-2">
          <PlaceRow name={nameOf(location)} active onPress={onClose} />
          {saved.map((p) => {
            const place = { label: p.label, params: p.params };
            return <PlaceRow key={p.id} name={nameOf(place)} onPress={() => choose(place)} />;
          })}
        </ScrollView>

        <View className="px-4 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
          <Pressable
            accessibilityRole="search"
            accessibilityLabel={t("location.search_city")}
            onPress={() => setSearchOpen(true)}
            className={cn(wc.searchBar, "active:opacity-80")}
          >
            <UiIcon name="search" size={20} />
            <Text className={wc.searchBarText} style={nepaliTextStyle()}>
              {t("location.search_city")}
            </Text>
          </Pressable>
        </View>
      </View>
      {/* Inside the Modal so it stacks above it, as on the weather page. A found city is saved to the list. */}
      <LocationSearchSheet
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(next) => {
          places.add(next, false);
          choose(next);
        }}
      />
    </Modal>
  );
}

function PlaceRow({ name, active, onPress }: { name: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      className={cn(wc.placeCard, active && wc.placeCardActive, "active:opacity-80")}
    >
      <View className="flex-row items-center gap-2">
        {active ? <UiIcon name="arrow" size={14} /> : null}
        <Text className={cn("shrink", wc.placeCardName)} numberOfLines={1} style={nepaliTextStyle()}>
          {name}
        </Text>
      </View>
    </Pressable>
  );
}
