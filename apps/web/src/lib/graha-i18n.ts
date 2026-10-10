import i18n from "@/i18n";
import { normalizeLang, type Lang } from "@/i18n/locale";

/** Localized graha name from `grahas.*` keys (sun, moon, mercury, …). */
export function grahaName(key: string, lang?: string | Lang): string {
  const lng = lang ? normalizeLang(lang) : normalizeLang(i18n.language);
  return i18n.t(`grahas.${key}`, { lng, defaultValue: key });
}
