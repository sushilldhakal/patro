import type { NavataraTone } from "@vedic-patro/api-client";
import type { IconNode, IconTone } from "@vedic-patro/ui/contract";
import type { RashifalGocharFlag, RashifalLuckyKey } from "@vedic-patro/features/rashifal";
import {
  iconBriefcase,
  iconChevronDown,
  iconChevronUp,
  iconClock,
  iconCoins,
  iconCompass,
  iconFlame,
  iconGraduationCap,
  iconHash,
  iconHeart,
  iconHeartPulse,
  iconPalette,
  iconPlane,
  iconRotateCcw,
  iconShieldBan,
  iconUserRound,
} from "./icons";

export const rashifalDomainIcon: Record<string, IconNode> = {
  career: iconBriefcase,
  finance: iconCoins,
  health: iconHeartPulse,
  love: iconHeart,
  learning: iconGraduationCap,
  travel: iconPlane,
};

export const rashifalLuckyIcon: Record<RashifalLuckyKey, IconNode> = {
  color: iconPalette,
  number: iconHash,
  direction: iconCompass,
  time: iconClock,
};

export const rashifalFlagIcon: Record<RashifalGocharFlag, IconNode> = {
  vedha: iconShieldBan,
  retrograde: iconRotateCcw,
  combust: iconFlame,
};

/** Flag colours match the website: muted, secondary, destructive. */
export const rashifalFlagTone: Record<RashifalGocharFlag, IconTone> = {
  vedha: "muted",
  retrograde: "secondary",
  combust: "destructive",
};

/**
 * Nearest kit tone for a navatara band. The website colours the icon with
 * `rashifalToneText` (currentColor). The app's Icon only accepts a theme role.
 */
export function rashifalIconTone(tone: NavataraTone | undefined): IconTone {
  if (tone === "best" || tone === "good") return "success";
  if (tone === "neutral" || tone === "bad") return "warning";
  if (tone === "worst") return "destructive";
  return "muted";
}

export { iconChevronDown, iconChevronUp, iconClock, iconUserRound };
