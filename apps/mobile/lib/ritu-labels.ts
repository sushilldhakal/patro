import type { RituSeasonKey } from "@/lib/ritu-display";
import type { AppLanguage } from "@/lib/i18n";

const SEASON: Record<RituSeasonKey, [ne: string, en: string]> = {
  spring: ["वसन्त", "Spring"],
  summer: ["ग्रीष्म", "Summer"],
  monsoon: ["वर्षा", "Monsoon"],
  autumn: ["शरद्", "Autumn"],
  pre_winter: ["हेमन्त", "Pre-winter"],
  winter: ["शिशिर", "Winter"],
};

export function rituSeasonLabel(key: RituSeasonKey, lang: AppLanguage): string {
  const pair = SEASON[key];
  return lang === "en" ? pair[1] : pair[0];
}

export function rituMarkerLabel(marker: "vernal" | "autumnal", lang: AppLanguage): string {
  if (marker === "vernal") return lang === "en" ? "Vernal equinox" : "वसन्त विषुव";
  return lang === "en" ? "Autumnal equinox" : "शरद् विषुव";
}
