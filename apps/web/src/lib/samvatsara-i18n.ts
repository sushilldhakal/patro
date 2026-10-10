import i18n from "@/i18n";
import { normalizeLang, type Lang } from "@/i18n/locale";
import type { SamvatsaraInfo } from "@/lib/samvatsara";

/** Localized samvatsara name from `samvatsara_names.*` keys. */
export function samvatsaraName(info: SamvatsaraInfo, lang?: string | Lang): string {
  const lng = lang ? normalizeLang(lang) : normalizeLang(i18n.language);
  return i18n.t(`samvatsara_names.${info.key}`, { lng, defaultValue: info.name_en });
}
