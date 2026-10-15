import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n";
import { cityKeys, fetchNearestCity, searchCities, type City } from "@/lib/api";
import {
  NEPAL_NEAREST_MAX_KM,
  nearestNepalCity,
  nepalCityToCity,
  searchNepalCities,
} from "@vedic-patro/domain/cities/nepal-cities";
import { cityToLocation, type PanchangaLocation } from "@/lib/use-panchanga-location";
import { inkOn } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { patroDateClasses } from "@vedic-patro/design-tokens/classes/patro-date-classes";
import { cn } from "@vedic-patro/domain/utils";

function cityLabel(city: City): string {
  return city.name || city.ascii_name;
}

type Props = {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  /** When true, list is the scroll root (for date sheet — no parent ScrollView). */
  embedded?: boolean;
  /** Embedded mode: explicit list area height (grows when keyboard lifts the sheet). */
  listHeight?: number;
};

/** Search field + city list — used in Patro date sheet Location tab (single source). */
export function PatroLocationSearchPanel({ location, onLocationChange, embedded, listHeight }: Props) {
  const colors = useThemeColors();
  const { t, lang } = useLocale();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), Platform.OS === "ios" ? 400 : 150);
    return () => clearTimeout(focusTimer);
  }, []);

  const { data: searchData, isFetching: isSearching } = useQuery({
    queryKey: cityKeys.search(debouncedQuery),
    queryFn: () => searchCities(debouncedQuery, 15),
    enabled: debouncedQuery.length >= 2,
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
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
    } catch {
      setGeoError(t("location.not_found"));
    } finally {
      setGeoLoading(false);
    }
  };

  const searchHeader = (
    <View className={patroDateClasses.locationHead}>
      <View className={cn("flex-row", patroDateClasses.locationSearch)}>
        <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder={t("location.search_city")}
          placeholderTextColor={colors.mutedForeground}
          className={patroDateClasses.locationInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          {...(Platform.OS === "web" ? { style: { outlineStyle: "none" } as never } : {})}
        />
      </View>

      <Pressable
        onPress={useCurrentLocation}
        disabled={geoLoading}
        className={cn("flex-row", patroDateClasses.locationGeo, "active:opacity-90")}
      >
        {geoLoading ? (
          <ActivityIndicator color={inkOn(colors.secondary)} size="small" />
        ) : (
          <Ionicons name="locate-outline" size={16} color={inkOn(colors.secondary)} />
        )}
        <Text className={patroDateClasses.locationGeoLabel}>
          {t("location.use_my_location")}
        </Text>
      </Pressable>

      {geoError ? <Text className={patroDateClasses.locationError}>{geoError}</Text> : null}
    </View>
  );

  const listFooter = (
    <Text className={patroDateClasses.locationHint}>
      {t("ui.patro_date.location_changes_apply_immediately")}
    </Text>
  );

  const emptyMessage = (() => {
    if (debouncedQuery.length < 2) {
      return t("location.type_min_chars");
    }
    if (isSearching) return null;
    return t("location.no_city_found");
  })();

  if (embedded) {
    const panelHeight = listHeight ?? 420;
    return (
      <View style={{ height: panelHeight, minHeight: 180, maxHeight: panelHeight }}>
        <FlatList
          style={{ flex: 1 }}
          data={debouncedQuery.length >= 2 && !isSearching ? results : []}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <>
              {searchHeader}
              {debouncedQuery.length >= 2 && isSearching ? (
                <View className={patroDateClasses.locationLoading}>
                  <ActivityIndicator color={colors.secondary} />
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            emptyMessage ? (
              <View className={patroDateClasses.locationEmpty}>
                <Text className={patroDateClasses.locationEmptyText}>{emptyMessage}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={listFooter}
          renderItem={({ item }) => {
            const selected = location.params.city_id === item.id;
            return (
              <Pressable
                onPress={() => pickCity(item)}
                className={cn(
                  patroDateClasses.locationItem,
                  "active:bg-muted",
                  selected && patroDateClasses.locationItemActive,
                )}
              >
                <Text className={patroDateClasses.locationName}>{cityLabel(item)}</Text>
                <Text className={patroDateClasses.locationSub}>
                  {item.admin1_name ? `${item.admin1_name}, ` : ""}
                  {item.country}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  const listBody =
    debouncedQuery.length < 2 ? (
      <View className={patroDateClasses.locationEmpty}>
        <Text className={patroDateClasses.locationEmptyText}>
          {t("location.type_min_chars")}
        </Text>
      </View>
    ) : isSearching ? (
      <View className={patroDateClasses.locationLoading}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    ) : results.length === 0 ? (
      <View className={patroDateClasses.locationEmpty}>
        <Text className={patroDateClasses.locationEmptyText}>
          {t("location.no_city_found")}
        </Text>
      </View>
    ) : (
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="pb-4"
        renderItem={({ item }) => {
          const selected = location.params.city_id === item.id;
          return (
            <Pressable
              onPress={() => pickCity(item)}
              className={cn(
                patroDateClasses.locationItem,
                "active:bg-muted",
                selected && patroDateClasses.locationItemActive,
              )}
            >
              <Text className={patroDateClasses.locationName}>{cityLabel(item)}</Text>
              <Text className={patroDateClasses.locationSub}>
                {item.admin1_name ? `${item.admin1_name}, ` : ""}
                {item.country}
              </Text>
            </Pressable>
          );
        }}
      />
    );

  return (
    <View>
      {searchHeader}
      {listBody}
      {listFooter}
    </View>
  );
}
