/**
 * The ritu page's header, shared by the website's `pages/Ritu.tsx` and the
 * app's `app/(tabs)/ritu.tsx`: title and the subtitle with the place. Its Learn
 * articles are in the related footer (PAGE_LEARN_SLUGS); the seasons come from
 * `useRituPage`.
 */
import { displayLocationLabel, type PanchangaLocation } from "@vedic-patro/read-models/geography/panchanga-location";
import { useLocale } from "@vedic-patro/i18n/react";

export function useRituScreen(location: PanchangaLocation) {
  const { t, lang } = useLocale();
  const locationLabel = displayLocationLabel(location, undefined, lang);
  return {
    title: t("ritu.title"),
    subtitle: `${t("ritu.subtitle")}${locationLabel ? ` · ${locationLabel}` : ""}`,
  };
}
