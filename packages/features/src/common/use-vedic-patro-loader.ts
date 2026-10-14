/**
 * The branded loader's caption, shared by the website's
 * `components/VedicPatroLoader.tsx` and the app's
 * `components/branding/VedicPatroLoader.tsx`: the localized "Loading" default,
 * or the caller's own label (`null` hides it).
 */
import { useLocale } from "@vedic-patro/i18n/react";

export function useVedicPatroLoader(label?: string | null): string | null {
  const { t } = useLocale();
  return label === undefined ? t("rashifal.profile.loading") : label;
}
