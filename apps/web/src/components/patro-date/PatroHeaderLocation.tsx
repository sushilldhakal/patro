import { useEffect, useState } from "react";
import { __iconNode as check } from "lucide-react/dist/esm/icons/check.mjs";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down.mjs";
import { __iconNode as crosshair } from "lucide-react/dist/esm/icons/crosshair.mjs";
import { __iconNode as mapPin } from "lucide-react/dist/esm/icons/map-pin.mjs";
import { __iconNode as searchIcon } from "lucide-react/dist/esm/icons/search.mjs";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { useLocationSelector } from "@vedic-patro/features/panchanga";
import type { City } from "@/lib/api";
import { locateDevice } from "@/components/panchanga/locate-device";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";

/**
 * The location button + search panel of the calendar headers, for pages whose
 * header has no panel state of its own (`PatroCalendarHeader` draws the same).
 */
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
  /** Controlled panel state, for headers where only one panel may be open at a time. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
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

  const pickCity = (city: City) => {
    picker.pickCity(city);
    setOpen(false);
  };

  return (
    <Box className={cn(cls.webLocation, "relative", className)}>
      {open ? <button type="button" tabIndex={-1} aria-hidden className={cls.webScrim} onClick={() => setOpen(false)} /> : null}
      <Pressable
        label={picker.copy.change}
        onPress={() => setOpen(!open)}
        className={cn(cls.locationButton, open ? cls.selectButtonOpen : cls.selectButtonIdle)}
        webClassName={cn("hover:bg-muted", cls.webDenseControl)}
      >
        <Box className={cls.locationPin}>
          <Icon node={mapPin} size="sm" tone="secondary" />
        </Box>
        <Text className={cn(cls.locationName, "max-w-32 truncate max-[419px]:max-w-16")}>{picker.labelMain}</Text>
        <Icon node={chevronDown} size="sm" tone="secondary" webClassName="max-[419px]:hidden" />
      </Pressable>
      {open ? (
        <Box className={cn(cls.panel, cls.webPanel, "right-0")} label={picker.copy.choose}>
          <label className={cls.searchBox}>
            <Icon node={searchIcon} size="sm" tone="muted" />
            <input
              autoFocus
              type="text"
              value={picker.query}
              onChange={(e) => picker.setQuery(e.target.value)}
              placeholder={picker.copy.search}
              aria-label={picker.copy.search}
              className={cn(cls.searchInput, "bg-transparent outline-none")}
            />
          </label>
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
                  onPress={() => pickCity(city)}
                  className={cn(cls.locationRow, "w-full", picker.isSelected(city) && cls.locationRowActive)}
                  webClassName="hover:bg-muted"
                >
                  <Box className="min-w-0">
                    <Text className={cls.locationRowName}>{picker.cityName(city)}</Text>
                    <Text className={cls.locationRowSub}>{picker.citySub(city)}</Text>
                  </Box>
                  {picker.isSelected(city) ? <Icon node={check} size="sm" tone="secondary" /> : null}
                </Pressable>
              ))
            )}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
