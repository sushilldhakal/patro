import { useEffect, useState } from "react";
import type { City } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { useLocationSelector } from "@vedic-patro/features/common";
import { Box, Icon, Input, Pressable, Text } from "@vedic-patro/ui";
import type { PatroHeaderLocationProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Location button and search panel. The website drops the panel under the button; the same classes do that in the app. */
export function PatroHeaderLocation({ location, onLocationChange, locate, className, open: openProp, onOpenChange }: PatroHeaderLocationProps) {
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

  const pickCity = (city: City) => {
    picker.pickCity(city);
    setOpen(false);
  };

  return (
    <Box className={cn(cls.webLocation, "relative", className)}>
      {open ? <Pressable label={picker.copy.change} onPress={() => setOpen(false)} className={cls.webScrim} /> : null}
      <Pressable
        label={picker.copy.change}
        onPress={() => setOpen(!open)}
        className={cn(cls.locationButton, open ? cls.selectButtonOpen : cls.selectButtonIdle)}
        webClassName={cn("hover:bg-muted", cls.webDenseControl)}
      >
        <Box className={cls.locationPin}>
          <Icon node={shellIcons.mapPin} size="sm" tone="secondary" />
        </Box>
        <Text numberOfLines={1} className={cn(cls.locationName, cls.webLocationName)}>
          {picker.labelMain}
        </Text>
        <Icon node={shellIcons.chevronDown} size="sm" tone="secondary" webClassName={cls.webChevronHide} />
      </Pressable>
      {open ? (
        <Box className={cn(cls.panel, cls.webPanel, "right-0")} label={picker.copy.choose}>
          <Box className={cls.searchBox}>
            <Icon node={shellIcons.search} size="sm" tone="muted" />
            <Input
              autoFocus
              type="search"
              value={picker.query}
              onChange={picker.setQuery}
              placeholder={picker.copy.search}
              label={picker.copy.search}
              className={cn(cls.searchInput, "bg-transparent")}
              webClassName="outline-none"
            />
          </Box>
          <Box className={cls.webLocationList}>
            <Pressable
              label={picker.copy.useMyLocation}
              onPress={() =>
                void picker.useCurrentLocation().then((ok) => {
                  if (ok) setOpen(false);
                })
              }
              disabled={picker.geoLoading}
              className={cn(cls.locationRow, "w-full")}
              webClassName="hover:bg-muted"
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
                  onPress={() => pickCity(city)}
                  className={cn(cls.locationRow, "w-full", picker.isSelected(city) && cls.locationRowActive)}
                  webClassName="hover:bg-muted"
                >
                  <Box className="min-w-0">
                    <Text className={cls.locationRowName}>{picker.cityName(city)}</Text>
                    <Text className={cls.locationRowSub}>{picker.citySub(city)}</Text>
                  </Box>
                  {picker.isSelected(city) ? <Icon node={shellIcons.check} size="sm" tone="secondary" /> : null}
                </Pressable>
              ))
            )}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
