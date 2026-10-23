import { useEffect, useState } from "react";
import { TextInput, View, useWindowDimensions } from "react-native";
import { useColorScheme } from "nativewind";
import type { City } from "@vedic-patro/api-client";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { useLocationSelector } from "@vedic-patro/features/common";
import { Box, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { PatroHeaderLocationProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** The location button and its search sheet. The app opens the picker as a sheet (the website drops a panel under the button). */
export function PatroHeaderLocation({ location, onLocationChange, locate, className, open: openProp, onOpenChange }: PatroHeaderLocationProps) {
  const { width } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const dense = width < 420;
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const picker = useLocationSelector({ location, onLocationChange, locate });

  useEffect(() => {
    picker.setOpen(open);
    // The picker identity changes when the query changes; only the panel flag should reset it.
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
          <Icon node={shellIcons.mapPin} size="sm" tone="secondary" />
        </Box>
        <Text numberOfLines={1} className={cn(cls.locationName, dense ? "max-w-24" : "max-w-32")}>
          {picker.labelMain}
        </Text>
        {dense ? null : <Icon node={shellIcons.chevronDown} size="sm" tone="secondary" />}
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={picker.copy.choose} closeLabel={picker.copy.cancel}>
        <View className={cls.searchBox}>
          <Icon node={shellIcons.search} size="sm" tone="muted" />
          <TextInput
            value={picker.query}
            onChangeText={picker.setQuery}
            placeholder={picker.copy.search}
            placeholderTextColor={roles.mutedForeground}
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
          <Icon node={shellIcons.crosshair} size="sm" tone="secondary" />
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
              {picker.isSelected(city) ? <Icon node={shellIcons.check} size="sm" tone="secondary" /> : null}
            </Pressable>
          ))
        )}
      </Sheet>
    </View>
  );
}
