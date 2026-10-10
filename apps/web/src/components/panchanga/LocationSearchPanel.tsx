import { useTranslation } from "react-i18next";
import { Crosshair, Loader2, Search } from "lucide-react";
import type { City } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale";
import { cityItemLabel, cityLabel } from "./city-labels";
import { useCitySearch } from "./use-city-search";
import { displayLocationLabel, type PanchangaLocation } from "./use-panchanga-location";

/**
 * Location picker rendered inline — no popup. The header's selector puts this
 * same search in a combobox, but inside the date sheet a nested popup fights
 * the drawer for focus and flickers on open, so this draws a plain field with
 * the results listed beneath it.
 */
export function LocationSearchPanel({
  location,
  onLocationChange,
  active,
  className,
}: {
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  /** False while the tab is hidden — keeps the search query idle. */
  active?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const {
    query,
    setQuery,
    debouncedQuery,
    isSearching,
    results,
    geoLoading,
    geoError,
    pickCity,
    useCurrentLocation,
  } = useCitySearch({ onLocationChange, enabled: active !== false });

  const emptyMessage =
    debouncedQuery.length < 2
      ? t("location.type_min_chars")
      : isSearching
        ? t("location.searching")
        : t("location.no_city_found");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="m-0 flex items-baseline gap-1.5 text-sm">
        <span className="text-muted-foreground">{t("location.tab")}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {displayLocationLabel(location, undefined, lang)}
        </span>
      </p>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("location.search_city")}
          aria-label={t("location.search_city")}
          className="h-10 pl-8"
          autoComplete="off"
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={useCurrentLocation}
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

      {geoError ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {geoError}
        </p>
      ) : null}

      {/* Fixed height so picking a city, or typing, never resizes the sheet. */}
      <ul className="m-0 h-56 list-none overflow-y-auto overscroll-contain rounded-lg border border-border p-1">
        {results.length === 0 ? (
          <li className="px-2 py-3 text-sm text-muted-foreground">{emptyMessage}</li>
        ) : (
          results.map((city: City) => {
            const selected = location.params.city_id === city.id;
            return (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => pickCity(city)}
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-hover",
                    selected && "bg-secondary/20",
                  )}
                >
                  <span className="block font-semibold">{cityLabel(city)}</span>
                  <span className="block text-sm text-muted-foreground">
                    {cityItemLabel(city, lang)}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
