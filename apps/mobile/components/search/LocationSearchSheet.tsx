import { useEffect } from "react";
import { FlatList, Pressable, View } from "react-native";
import type { City } from "@vedic-patro/api-client";
import { useLocationSelector } from "@vedic-patro/features/panchanga";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { locateDevice } from "@/components/panchanga/locate-device";
import { SearchSheetFrame } from "@/components/search/SearchSheetFrame";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

/**
 * The place picker, drawn like festival search (SearchSheetFrame): the current place and "use my
 * location" at the top, the matching cities under them, and the search field floating at the foot. Every
 * screen's usePanchangaLocation follows the place picked here.
 */
export function LocationSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const { location, setLocation } = usePanchangaLocation();
  const picker = useLocationSelector({ location, onLocationChange: setLocation, locate: locateDevice });

  const { setQuery } = picker;
  useEffect(() => {
    if (!open) setQuery("");
  }, [open, setQuery]);

  const choose = (city: City) => {
    haptics.tick();
    picker.pickCity(city);
    onClose();
  };

  const header = (
    <View className="gap-1 pb-2">
      <View className="flex-row items-center gap-3 border-b border-border py-3.5">
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: colors.secondary }}>
          <Ionicons name="location" size={16} color={colors.card} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-body font-semibold text-foreground" numberOfLines={1} style={nepaliTextStyle(18)}>
            {picker.labelMain}
          </Text>
          <Text className="text-caption text-muted-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
            {picker.label}
          </Text>
        </View>
        <Ionicons name="checkmark" size={20} color={colors.secondary} />
      </View>
      <Pressable
        disabled={picker.geoLoading}
        onPress={() =>
          void picker.useCurrentLocation().then((ok) => {
            if (ok) onClose();
          })
        }
        className="flex-row items-center gap-3 border-b border-border py-3.5 active:opacity-60"
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Ionicons name="navigate" size={16} color={colors.secondary} />
        </View>
        <Text className="min-w-0 flex-1 text-body text-secondary" style={nepaliTextStyle(17)}>
          {picker.copy.useMyLocation}
        </Text>
      </Pressable>
      {picker.geoError ? (
        <Text className="pt-2 text-caption text-destructive" style={nepaliTextStyle(14)}>
          {picker.geoError}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SearchSheetFrame
      open={open}
      onClose={onClose}
      query={picker.query}
      onQueryChange={picker.setQuery}
      placeholder={picker.copy.search}
      label={picker.copy.choose}
    >
      {(contentContainerStyle) => (
        <FlatList
          data={picker.results}
          keyExtractor={(city) => String(city.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={contentContainerStyle}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text className="pt-8 text-center text-body text-muted-foreground" style={nepaliTextStyle(15)}>
              {picker.emptyText}
            </Text>
          }
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          renderItem={({ item: city }) => {
            const selected = picker.isSelected(city);
            return (
              <Pressable onPress={() => choose(city)} className="flex-row items-center gap-3 py-3.5 active:opacity-60">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Ionicons name="location-outline" size={16} color={colors.foreground} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-body text-foreground" numberOfLines={1} style={nepaliTextStyle(17)}>
                    {picker.cityName(city)}
                  </Text>
                  <Text className="text-caption text-muted-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
                    {picker.citySub(city)}
                  </Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.secondary} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </SearchSheetFrame>
  );
}
