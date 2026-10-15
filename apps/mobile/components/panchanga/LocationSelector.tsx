import { useEffect, useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { City } from "@/lib/api";
import { GeoLocateError, useLocationSelector } from "@vedic-patro/features/panchanga";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
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

/** The device position for "use my location", rejecting with a GeoLocateError. */
async function locateDevice(): Promise<{ lat: number; lon: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new GeoLocateError("denied");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lon: pos.coords.longitude };
}

type Picker = ReturnType<typeof useLocationSelector>;

function LocationResultsList({ picker }: { picker: Picker }) {
  const colors = useThemeColors();
  if (picker.results.length === 0 && picker.isSearching && picker.debouncedQuery.length >= 2) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  if (picker.results.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-sm text-center text-muted-foreground">{picker.emptyText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={picker.results}
      keyExtractor={(item: City) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ flex: 1 }}
      contentContainerClassName="pb-4"
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            picker.pickCity(item);
          }}
          className={cn(
            "border-b border-border px-4 py-3 active:bg-muted",
            picker.isSelected(item) && panchangaPageClasses.location.citySelected,
          )}
        >
          <Text className={cn(panchangaPageClasses.location.cityName, "text-sm text-foreground")}>{picker.cityName(item)}</Text>
          <Text className={cn(panchangaPageClasses.location.citySub, "text-muted-foreground")}>{picker.citySub(item)}</Text>
        </Pressable>
      )}
    />
  );
}

export function LocationSelector({ location, onLocationChange, className, style }: Props) {
  const colors = useThemeColors();
  const picker = useLocationSelector({ location, onLocationChange, locate: locateDevice });
  const { open, copy } = picker;
  const { isCompact } = useBreakpoint();
  const chipH = dayCycleToggleMetrics(isCompact).height;
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), Platform.OS === "ios" ? 320 : 120);
    return () => clearTimeout(focusTimer);
  }, [open]);

  const useCurrentLocation = async () => {
    if (await picker.useCurrentLocation()) {
      Keyboard.dismiss();
      picker.setOpen(false);
    }
  };

  const close = () => {
    Keyboard.dismiss();
    picker.setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => picker.setOpen(true)}
        accessibilityLabel={copy.change}
        className={cn(
          "max-w-[7.5rem] shrink flex-row items-center gap-1 rounded-lg border border-border bg-card px-2 active:bg-muted",
          className,
        )}
        style={[{ height: chipH, maxHeight: chipH }, style]}
      >
        <Ionicons name="location-outline" size={13} color={colors.secondary} />
        <Text numberOfLines={1} className="text-xs font-semibold text-foreground">
          {picker.labelMain}
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
                {copy.cancel}
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
              {copy.title}
            </Text>
            <Pressable onPress={close} hitSlop={8} style={{ minWidth: 72, alignItems: "flex-end" }}>
              <Text className="text-lg" style={{ fontWeight: "600", color: colors.primary }}>
                {copy.done}
              </Text>
            </Pressable>
          </View>

          <View className="gap-3 border-b border-border px-4 py-3">
            <View className="flex-row items-center gap-2 rounded-lg border border-border bg-background px-3">
              <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
              <TextInput
                ref={inputRef}
                value={picker.query}
                onChangeText={picker.setQuery}
                placeholder={copy.search}
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
              disabled={picker.geoLoading}
              className="h-10 flex-row items-center justify-center gap-2 rounded-lg bg-secondary active:opacity-90"
            >
              {picker.geoLoading ? (
                <ActivityIndicator color={inkOn(colors.secondary)} size="small" />
              ) : (
                <Ionicons name="locate-outline" size={16} color={inkOn(colors.secondary)} />
              )}
              <Text className="text-sm font-semibold text-secondary-foreground">
                {copy.useMyLocation}
              </Text>
            </Pressable>

            {picker.geoError ? <Text className={panchangaPageClasses.location.geoError}>{picker.geoError}</Text> : null}
          </View>

          <LocationResultsList picker={picker} />
        </View>
      </Modal>
    </>
  );
}
