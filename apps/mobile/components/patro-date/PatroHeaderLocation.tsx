import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { __iconNode as check } from "lucide-react/dist/esm/icons/check";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as crosshair } from "lucide-react/dist/esm/icons/crosshair";
import { __iconNode as mapPin } from "lucide-react/dist/esm/icons/map-pin";
import { __iconNode as searchIcon } from "lucide-react/dist/esm/icons/search";
import { Box, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { useLocationSelector } from "@vedic-patro/features/panchanga";
import type { City } from "@/lib/api";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { locateDevice } from "@/components/panchanga/locate-device";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

/** The location button + search sheet of the calendar headers; also the app's one place picker in forms. */
export function PatroHeaderLocation({
  location,
  onLocationChange,
  className,
  open: openProp,
  onOpenChange,
}: {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  className?: string;
  /** Controlled sheet state, for headers where only one panel may be open at a time. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const dense = width < 420;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const picker = useLocationSelector({ location, onLocationChange, locate: locateDevice });

  useEffect(() => {
    picker.setOpen(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <View className={className}>
      <Pressable
        label={picker.copy.change}
        onPress={() => setOpen(!open)}
        className={cn(cls.locationButton, open ? cls.selectButtonOpen : cls.selectButtonIdle, dense && cls.nativeDenseControl)}
      >
        <Box className={cls.locationPin}>
          <Icon node={mapPin} size="sm" tone="secondary" />
        </Box>
        <Text numberOfLines={1} className={cn(cls.locationName, dense ? "max-w-20" : "max-w-32")}>
          {picker.labelMain}
        </Text>
        {dense ? null : <Icon node={chevronDown} size="sm" tone="secondary" />}
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={picker.copy.choose} closeLabel={picker.copy.cancel}>
        <View className={cls.searchBox}>
          <Icon node={searchIcon} size="sm" tone="muted" />
          <TextInput
            value={picker.query}
            onChangeText={picker.setQuery}
            placeholder={picker.copy.search}
            placeholderTextColor={colors.mutedForeground}
            accessibilityLabel={picker.copy.search}
            autoCorrect={false}
            className={cls.searchInput}
          />
        </View>
        <Pressable
          label={picker.copy.useMyLocation}
          disabled={picker.geoLoading}
          onPress={() =>
            void picker.useCurrentLocation().then((ok) => {
              if (ok) setOpen(false);
            })
          }
          className={cls.locationRow}
        >
          <Text className={cls.locationRowGps}>{picker.copy.useMyLocation}</Text>
          <Icon node={crosshair} size="sm" tone="secondary" />
        </Pressable>
        {picker.geoError ? <Text className={cls.locationError}>{picker.geoError}</Text> : null}
        {picker.results.length === 0 ? (
          <Text className={cls.locationEmpty}>{picker.emptyText}</Text>
        ) : (
          picker.results.map((city: City) => (
            <Pressable
              key={city.id}
              label={picker.citySub(city)}
              onPress={() => {
                picker.pickCity(city);
                setOpen(false);
              }}
              className={cn(cls.locationRow, picker.isSelected(city) && cls.locationRowActive)}
            >
              <View className="min-w-0 flex-1">
                <Text className={cls.locationRowName}>{picker.cityName(city)}</Text>
                <Text className={cls.locationRowSub}>{picker.citySub(city)}</Text>
              </View>
              {picker.isSelected(city) ? <Icon node={check} size="sm" tone="secondary" /> : null}
            </Pressable>
          ))
        )}
      </Sheet>
    </View>
  );
}
