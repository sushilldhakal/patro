import type { ComponentProps } from "react";
import type { Ionicons } from "@/components/icons/Ionicons";
import type { RashifalDomainKey, RashifalPeriod } from "@/lib/api";
import type { AppLanguage } from "@/lib/i18n";
import {
  rashifalRangeLabel,
  toNepaliDigits,
  type RashifalWindowSource,
} from "@vedic-patro/domain/rashifal-ui";

export {
  rashifalStepDate,
  rashifalToneBar,
  rashifalToneText,
} from "@vedic-patro/domain/rashifal-ui";
export { rashifalRangeLabel, toNepaliDigits, type RashifalWindowSource };

export type RashifalDomainIcon = ComponentProps<typeof Ionicons>["name"];

export const RASHIFAL_DOMAIN_ICON: Record<RashifalDomainKey, RashifalDomainIcon> = {
  career: "briefcase-outline",
  finance: "cash-outline",
  health: "fitness-outline",
  love: "heart-outline",
  learning: "school-outline",
  travel: "airplane-outline",
};

export const RASHIFAL_PERIOD_ICON: Record<RashifalPeriod, RashifalDomainIcon> = {
  daily: "sunny-outline",
  weekly: "calendar-outline",
  monthly: "calendar-number-outline",
  yearly: "planet-outline",
};

export function rashifalMonthLabel(
  source: RashifalWindowSource | undefined,
  lang: AppLanguage,
): string {
  return rashifalRangeLabel(source, "monthly", lang) ?? "";
}
