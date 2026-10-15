import { Crosshair, Loader2, Search } from "lucide-react";
import type { City } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@vedic-patro/domain/utils";
import { useCitySearch } from "@vedic-patro/features/panchanga";
import { useLocale } from "@/i18n/locale";
import { locateDevice } from "./locate-device";
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
  const { lang } = useLocale();
  const search = useCitySearch({ onLocationChange, locate: locateDevice, enabled: active !== false });
  const { query, setQuery, results, geoLoading, geoError, pickCity, copy } = search;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="m-0 flex items-baseline gap-1.5 text-sm">
        <span className="text-muted-foreground">{copy.tab}</span>
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
          placeholder={copy.search}
          aria-label={copy.search}
          className="h-10 pl-8"
          autoComplete="off"
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void search.useCurrentLocation()}
        disabled={geoLoading}
        className="w-full"
      >
        {geoLoading ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <Crosshair data-icon="inline-start" />
        )}
        {copy.useMyLocation}
      </Button>

      {geoError ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {geoError}
        </p>
      ) : null}

      {/* Fixed height so picking a city, or typing, never resizes the sheet. */}
      <ul className="m-0 h-56 list-none overflow-y-auto overscroll-contain rounded-lg border border-border p-1">
        {results.length === 0 ? (
          <li className="px-2 py-3 text-sm text-muted-foreground">{search.emptyText}</li>
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
                  <span className="block font-semibold">{search.cityName(city)}</span>
                  <span className="block text-sm text-muted-foreground">
                    {search.citySub(city)}
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
