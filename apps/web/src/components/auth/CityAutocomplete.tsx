import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchCities, type City } from "@/lib/api";
import { nepalCityToCity, searchNepalCities } from "@/lib/cities/nepal-cities";
import { useLocale, bilingualText } from "@/i18n/locale";

export interface CitySelection {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  location_label: string;
}

/** Debounced city search that fills city/country/lat/lon/timezone on select. */
export function CityAutocomplete({
  value,
  onSelect,
  placeholder,
}: {
  value?: string | null;
  onSelect: (sel: CitySelection) => void;
  placeholder?: string;
}) {
  const { lang } = useLocale();
  const resolvedPlaceholder = placeholder ?? bilingualText(lang, "सहर खोज्नुहोस्…", "Search a city…");
  const [query, setQuery] = useState(value ?? "");
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value ?? "");
  }
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced fetch starts loading immediately
    setLoading(true);
    // Nepal from the curated local list; other countries from the backend.
    const nepal = searchNepalCities(query.trim()).map((c) => nepalCityToCity(c, lang));
    const t = setTimeout(async () => {
      try {
        const res = await searchCities(query.trim(), 8);
        const world = res.cities.filter((c) => c.country?.toUpperCase() !== "NP");
        if (active) setResults([...nepal, ...world]);
      } catch {
        if (active) setResults(nepal);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, lang]);

  const visibleResults = query.trim().length < 2 ? [] : results;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function selectCity(city: City) {
    const name = bilingualText(lang, city.name || city.ascii_name, city.ascii_name || city.name);
    const label = `${name}, ${city.country}`;
    setQuery(label);
    setOpen(false);
    onSelect({
      city: name,
      country: city.country,
      latitude: city.lat,
      longitude: city.lon,
      timezone: city.timezone,
      location_label: label,
    });
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={resolvedPlaceholder}
          className="pl-8"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin" />
        )}
      </div>
      {open && visibleResults.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {visibleResults.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectCity(c)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted hover:text-foreground"
              >
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">
                  {bilingualText(lang, c.name || c.ascii_name, c.ascii_name || c.name)}, {c.country}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
