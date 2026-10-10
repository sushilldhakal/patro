import {
  Briefcase,
  CalendarDays,
  CalendarRange,
  Clock,
  Coins,
  Compass,
  Flame,
  GraduationCap,
  Hash,
  Heart,
  HeartPulse,
  Orbit,
  Palette,
  Plane,
  RotateCcw,
  ShieldBan,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { RashifalDomainKey, RashifalPeriod } from "@/lib/api";

export {
  rashifalRangeLabel,
  rashifalStepDate,
  rashifalToneBar,
  rashifalToneText,
  toNepaliDigits,
  type RashifalWindowSource,
} from "@vedic-patro/domain/rashifal-ui";

/**
 * Period tabs are icon-only on the page, so each icon has to carry the whole
 * meaning: the Sun is one sunrise, the two calendar glyphs are the week and the
 * month, and the orbit is a year — Jupiter's own sign-per-year circuit, which is
 * also the graha the server's yearly reading leans on.
 */
export const RASHIFAL_PERIOD_ICON: Record<RashifalPeriod, LucideIcon> = {
  daily: Sun,
  weekly: CalendarDays,
  monthly: CalendarRange,
  yearly: Orbit,
};

export const RASHIFAL_DOMAIN_ICON: Record<RashifalDomainKey, LucideIcon> = {
  career: Briefcase,
  finance: Coins,
  health: HeartPulse,
  love: Heart,
  learning: GraduationCap,
  travel: Plane,
};

export const RASHIFAL_LUCKY_ICON = {
  color: Palette,
  number: Hash,
  direction: Compass,
  time: Clock,
} satisfies Record<string, LucideIcon>;

/**
 * Flags on a single gochar row. वेध is a *blocked* transit, so it takes the
 * shield rather than a bare Ban — a plain circle-slash on a chip reads as a
 * glyph that failed to load, not as "this transit is cancelled".
 */
export const RASHIFAL_FLAG_ICON = {
  vedha: ShieldBan,
  retrograde: RotateCcw,
  combust: Flame,
} satisfies Record<string, LucideIcon>;
