import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "@/lib/i18n";
import {
  cityKeys,
  fetchNearestCity,
  searchCities,
  type City,
} from "@/lib/api";
import {
  NEPAL_NEAREST_MAX_KM,
  nearestNepalCity,
  nepalCityToCity,
  searchNepalCities,
} from "@vedic-patro/domain/cities/nepal-cities";
import {
  cityToLocation,
  displayLocationLabel,
  type PanchangaLocation,
} from "@/lib/use-panchanga-location";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { dayCycleToggleMetrics } from "@/lib/day-cycle-toggle-metrics";
import { useBreakpoint } from "@/lib/responsive";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

type Props = {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

function cityLabel(city: City): string {
  return city.name || city.ascii_name;
}

function LocationResultsList({
  debouncedQuery,
  isSearching,
  results,
  location,
  onPickCity,
  pick,
}: {
  debouncedQuery: string;
  isSearching: boolean;
  results: City[];
  location: PanchangaLocation;
  onPickCity: (city: City) => void;
  pick: (ne: string, en: string) => string;
}) {
  const colors = useThemeColors();
  if (debouncedQuery.length < 2) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-sm text-center text-muted-foreground">
          {pick("कम्तीमा २ अक्षर टाइप गर्नुहोस्", "Type at least 2 characters")}
        </Text>
      </View>
    );
  }

  if (isSearching) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-sm text-center text-muted-foreground">
          {pick("कुनै सहर भेटिएन", "No city found")}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ flex: 1 }}
      contentContainerClassName="pb-4"
      renderItem={({ item }) => {
        const selected = location.params.city_id === item.id;
        return (
          <Pressable
            onPress={() => onPickCity(item)}
            className={cn(
              "border-b border-border px-4 py-3 active:bg-muted",
              selected && panchangaPageClasses.location.citySelected,
            )}
          >
            <Text className={cn(panchangaPageClasses.location.cityName, "text-sm text-foreground")}>{cityLabel(item)}</Text>
            <Text className={cn(panchangaPageClasses.location.citySub, "text-muted-foreground")}>
              {item.admin1_name ? `${item.admin1_name}, ` : ""}
              {item.country}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

export function LocationSelector({ location, onLocationChange, className, style }: Props) {
  const colors = useThemeColors();
  const { t, pick, lang } = useLocale();
  const { isCompact } = useBreakpoint();
  const chipH = dayCycleToggleMetrics(isCompact).height;
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const label = displayLocationLabel(location, undefined, lang);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), Platform.OS === "ios" ? 320 : 120);
    return () => clearTimeout(focusTimer);
  }, [open]);

  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: cityKeys.search(debouncedQuery),
    queryFn: () => searchCities(debouncedQuery, 15),
    enabled: debouncedQuery.length >= 2 && open,
    staleTime: 60_000,
  });

  const results = useMemo<City[]>(() => {
    const nepal = searchNepalCities(debouncedQuery).map((c) => nepalCityToCity(c, lang));
    const world = (searchData?.cities ?? []).filter((c) => c.country?.toUpperCase() !== "NP");
    return [...nepal, ...world];
  }, [debouncedQuery, lang, searchData]);

  const pickCity = (city: City) => {
    Keyboard.dismiss();
    onLocationChange(cityToLocation(city));
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    setGeoError(null);
  };

  const useCurrentLocation = async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError(t("location.permission_denied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lon } = pos.coords;
      const nearest = nearestNepalCity(lat, lon);
      try {
        if (nearest.distanceKm <= NEPAL_NEAREST_MAX_KM) {
          onLocationChange(cityToLocation(nepalCityToCity(nearest.city, lang)));
        } else {
          const { city } = await fetchNearestCity(lat, lon);
          onLocationChange(cityToLocation(city));
        }
      } catch {
        onLocationChange(cityToLocation(nepalCityToCity(nearest.city, lang)));
      }
      Keyboard.dismiss();
      setQuery("");
      setDebouncedQuery("");
      setOpen(false);
    } catch {
      setGeoError(t("location.not_found"));
    } finally {
      setGeoLoading(false);
    }
  };

  const close = () => {
    Keyboard.dismiss();
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setGeoError(null);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={t("ui.common.change_location")}
        className={cn(
          "max-w-[7.5rem] shrink flex-row items-center gap-1 rounded-lg border border-border bg-card px-2 active:bg-muted",
          className,
        )}
        style={[{ height: chipH, maxHeight: chipH }, style]}
      >
        <Ionicons name="location-outline" size={13} color={colors.secondary} />
        <Text numberOfLines={1} className="text-xs font-semibold text-foreground">
          {label}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.card,
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <View
            className="px-4 py-3"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72 }}>
              <Text className="text-lg" style={{ color: colors.mutedForeground }}>
                {t("common.cancel")}
              </Text>
            </Pressable>
            <Text
              className="text-lg"
              style={{
                flex: 1,
                textAlign: "center",
                fontWeight: "600",
                color: colors.foreground,
              }}
            >
              {t("location.label")}
            </Text>
            <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72, alignItems: "flex-end" }}>
              <Text className="text-lg" style={{ fontWeight: "600", color: colors.primary }}>
                {t("common.done")}
              </Text>
            </Pressable>
          </View>

          <View className="gap-3 border-b border-border px-4 py-3">
            <View className="flex-row items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder={t("location.search_city")}
                placeholderTextColor={colors.mutedForeground}
                className="text-sm h-10 flex-1 text-foreground"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                {...(Platform.OS === "web" ? { style: { outlineStyle: "none" } as never } : {})}
              />
            </View>

            <Pressable
              onPress={useCurrentLocation}
              disabled={geoLoading}
              className="h-10 flex-row items-center justify-center gap-2 rounded-lg bg-secondary active:opacity-90"
            >
              {geoLoading ? (
                <ActivityIndicator color={inkOn(colors.secondary)} size="small" />
              ) : (
                <Ionicons name="locate-outline" size={16} color={inkOn(colors.secondary)} />
              )}
              <Text className="text-sm font-semibold text-secondary-foreground">
                {t("location.use_my_location")}
              </Text>
            </Pressable>

            {geoError ? <Text className={panchangaPageClasses.location.geoError}>{geoError}</Text> : null}
          </View>

          <LocationResultsList
            debouncedQuery={debouncedQuery}
            isSearching={isSearching}
            results={results}
            location={location}
            onPickCity={pickCity}
            pick={pick}
          />
        </View>
      </Modal>
    </>
  );
}
