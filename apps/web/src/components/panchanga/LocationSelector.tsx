import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { cn } from "@/lib/utils";
import { cityItemLabel, cityLabel } from "./city-labels";
import { useCitySearch } from "./use-city-search";
import { useLocale } from "@/i18n/locale";
import { displayLocationLabel, type PanchangaLocation } from "./use-panchanga-location";

interface Props {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  className?: string;
  compact?: boolean;
}

function LocationPickerPanel({
  debouncedQuery,
  isSearching,
  location,
  geoLoading,
  geoError,
  onPickCity,
  onUseCurrentLocation,
}: {
  debouncedQuery: string;
  isSearching: boolean;
  results: City[];
  location: PanchangaLocation;
  geoLoading: boolean;
  geoError: string | null;
  onPickCity: (city: City) => void;
  onUseCurrentLocation: () => void;
}) {
  const { lang } = useLocale();
  const { t } = useTranslation();
  return (
    <>
      <ComboboxInput
        showTrigger={false}
        placeholder={t("location.search_city")}
        className="w-full"
      />

      <div className="px-1 pb-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onUseCurrentLocation}
          disabled={geoLoading}
          className="w-full"
        >
          {geoLoading ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Crosshair data-icon="inline-start" />
          )}
          {t("location.use_my_location")}
        </Button>
      </div>

      {geoError && (
        <p className="text-sm text-destructive px-2 pb-1" role="alert">
          {geoError}
        </p>
      )}

      <ComboboxEmpty className="py-3 text-xs">
        {debouncedQuery.length < 2
          ? t("location.type_min_chars")
          : isSearching
            ? t("location.searching")
            : t("location.no_city_found")}
      </ComboboxEmpty>

      <ComboboxList className="max-h-60">
        {(city) => {
          const name = cityLabel(city);
          const selected = location.params.city_id === city.id;
          return (
            <ComboboxItem
              key={city.id}
              value={city}
              onClick={() => onPickCity(city)}
              className={cn(selected && "bg-secondary/20")}
            >
              <span className="font-semibold block">{name}</span>
              <span className="text-sm">
                {cityItemLabel(city, lang)}
              </span>
            </ComboboxItem>
          );
        }}
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
  const { lang } = useLocale();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const localizedLabel = displayLocationLabel(location, undefined, lang);
  const labelMain = localizedLabel.split(",")[0]?.trim() ?? localizedLabel;
  const {
    query,
    setQuery,
    debouncedQuery,
    isSearching,
    results,
    geoLoading,
    geoError,
    pickCity: pickCityAndReset,
    useCurrentLocation,
    reset,
  } = useCitySearch({ onLocationChange, enabled: open });

  const pickCity = (city: City) => {
    pickCityAndReset(city);
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const comboboxSearchProps = {
    inputValue: query,
    onInputValueChange: setQuery,
  };

  const pickerPanel = (
    <LocationPickerPanel
      debouncedQuery={debouncedQuery}
      isSearching={isSearching}
      results={results}
      location={location}
      geoLoading={geoLoading}
      geoError={geoError}
      onPickCity={pickCity}
      onUseCurrentLocation={useCurrentLocation}
    />
  );

  if (compact) {
    return (
      <Combobox
        open={open}
        onOpenChange={handleOpenChange}
        items={results}
        filter={null}
        onValueChange={(city) => {
          if (city) pickCity(city);
        }}
        itemToStringValue={(city: City) => cityItemLabel(city, lang)}
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
              title={t("location.choose_location")}
            />
          }
        >
          <span className="inline-flex items-center gap-1 min-w-0 md:gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            {/* Smaller text on mobile so the full city name fits instead of
                truncating to "Kat…"; desktop keeps the standard size. */}
            <span className="truncate text-[11px] leading-none md:text-sm">{labelMain}</span>
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
        open={open}
        onOpenChange={handleOpenChange}
        items={results}
        filter={null}
        onValueChange={(city) => {
          if (city) pickCity(city);
        }}
        itemToStringValue={(city: City) => cityItemLabel(city, lang)}
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
            <span className="truncate">{localizedLabel}</span>
          </span>
        </ComboboxTrigger>
        <ComboboxContent
          align="start"
          className="w-[min(calc(100vw-1.25rem),24rem)] min-w-[16rem]"
        >
          {pickerPanel}
        </ComboboxContent>
      </Combobox>

      {geoError && (
        <p className="text-xs text-destructive" role="alert">
          {geoError}
        </p>
      )}
    </div>
  );
}
