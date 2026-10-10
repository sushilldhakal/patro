import type { City } from "@/lib/api";

export function cityLabel(city: City): string {
  return city.name || city.ascii_name;
}

// Resolve a 2-letter ISO country code to a readable, localized name
// ("NP" → "Nepal" / "नेपाल") via the built-in Intl API. Cached per locale;
// falls back to the raw code if the runtime lacks the region data.
const countryNameCache = new Map<string, Intl.DisplayNames | null>();

export function countryName(code: string | undefined | null, lang: string): string {
  if (!code) return "";
  const locale = lang === "ne" ? "ne" : "en";
  if (!countryNameCache.has(locale)) {
    try {
      countryNameCache.set(locale, new Intl.DisplayNames([locale], { type: "region" }));
    } catch {
      countryNameCache.set(locale, null);
    }
  }
  const dn = countryNameCache.get(locale);
  const upper = code.toUpperCase();
  try {
    return dn?.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

/** "Pokhara, Gandaki, Nepal" — the full line shown under a search result. */
export function cityItemLabel(city: City, lang: string): string {
  const region = city.admin1_name ?? city.admin1;
  const country = countryName(city.country, lang);
  if (region) return `${cityLabel(city)}, ${region}, ${country}`;
  return `${cityLabel(city)}, ${country}`;
}
