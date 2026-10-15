import { Crosshair, Loader2, MapPin } from "lucide-react";
import { type City } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { useLocationSelector } from "@vedic-patro/features/panchanga";
import { locateDevice } from "./locate-device";
import type { PanchangaLocation } from "./use-panchanga-location";

interface Props {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  className?: string;
  compact?: boolean;
}

type Picker = ReturnType<typeof useLocationSelector>;

function LocationPickerPanel({ picker }: { picker: Picker }) {
  return (
    <>
      <ComboboxInput
        showTrigger={false}
        placeholder={picker.copy.search}
        className="w-full"
      />

      <div className="px-1 pb-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void picker.useCurrentLocation()}
          disabled={picker.geoLoading}
          className="w-full"
        >
          {picker.geoLoading ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Crosshair data-icon="inline-start" />
          )}
          {picker.copy.useMyLocation}
        </Button>
      </div>

      {picker.geoError && (
        <p className={panchangaPageClasses.location.geoErrorPanel} role="alert">
          {picker.geoError}
        </p>
      )}

      <ComboboxEmpty className="py-3 text-xs">{picker.emptyText}</ComboboxEmpty>

      <ComboboxList className="max-h-60">
        {(city: City) => (
          <ComboboxItem
            key={city.id}
            value={city}
            onClick={() => picker.pickCity(city)}
            className={cn(picker.isSelected(city) && panchangaPageClasses.location.citySelected)}
          >
            <span className={cn("block", panchangaPageClasses.location.cityName)}>{picker.cityName(city)}</span>
            <span className={panchangaPageClasses.location.citySub}>{picker.citySub(city)}</span>
          </ComboboxItem>
        )}
      </ComboboxList>
    </>
  );
}

export function LocationSelector({
  location,
  onLocationChange,
  className,
  compact = false,
}: Props) {
  const picker = useLocationSelector({ location, onLocationChange, locate: locateDevice });

  const comboboxSearchProps = {
    inputValue: picker.query,
    onInputValueChange: picker.setQuery,
  };

  const pickerPanel = <LocationPickerPanel picker={picker} />;

  if (compact) {
    return (
      <Combobox
        open={picker.open}
        onOpenChange={picker.setOpen}
        items={picker.results}
        filter={null}
        onValueChange={(city) => {
          if (city) picker.pickCity(city);
        }}
        itemToStringValue={(city: City) => picker.citySub(city)}
        isItemEqualToValue={(a, b) => a.id === b.id}
        {...comboboxSearchProps}
      >
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full max-w-[12.5rem] justify-between gap-1 font-semibold",
                className
              )}
              title={picker.copy.choose}
            />
          }
        >
          <span className="inline-flex items-center gap-1 min-w-0 md:gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            {/* Smaller text on mobile so the full city name fits instead of
                truncating to "Kat…"; desktop keeps the standard size. */}
            <span className="truncate text-xs leading-none md:text-sm">{picker.labelMain}</span>
          </span>
        </ComboboxTrigger>
        <ComboboxContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="w-[min(calc(100vw-1.25rem),20rem)] min-w-[16rem]"
        >
          {pickerPanel}
        </ComboboxContent>
      </Combobox>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Combobox
        open={picker.open}
        onOpenChange={picker.setOpen}
        items={picker.results}
        filter={null}
        onValueChange={(city) => {
          if (city) picker.pickCity(city);
        }}
        itemToStringValue={(city: City) => picker.citySub(city)}
        isItemEqualToValue={(a, b) => a.id === b.id}
        {...comboboxSearchProps}
      >
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              className="w-full max-w-md justify-between font-normal"
            />
          }
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{picker.label}</span>
          </span>
        </ComboboxTrigger>
        <ComboboxContent
          align="start"
          className="w-[min(calc(100vw-1.25rem),24rem)] min-w-[16rem]"
        >
          {pickerPanel}
        </ComboboxContent>
      </Combobox>

      {picker.geoError && (
        <p className={panchangaPageClasses.location.geoError} role="alert">
          {picker.geoError}
        </p>
      )}
    </div>
  );
}
