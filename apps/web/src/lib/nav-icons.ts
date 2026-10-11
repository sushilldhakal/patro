/**
 * The website's renderer for the shared icon identity (@vedic-patro/icons):
 * each Lucide name the navigation can produce → its lucide-react component.
 * Which icon means what is decided in the package, the same for the app.
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookMarked,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Clock3,
  Compass,
  Eclipse,
  Ellipsis,
  FileText,
  Flower2,
  Grid3x3,
  Heart,
  HeartHandshake,
  House,
  Layers,
  LogIn,
  Moon,
  MoonStar,
  Orbit,
  PartyPopper,
  RotateCcw,
  Route,
  Shield,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Sunrise,
  User,
  UserPlus,
} from "lucide-react";
import { FEATURE_ICON, resolveNavIcon, type FeatureId, type NavIconName } from "@vedic-patro/icons";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  house: House,
  star: Star,
  sparkles: Sparkles,
  moon: Moon,
  heart: Heart,
  sun: Sun,
  "calendar-range": CalendarRange,
  compass: Compass,
  "book-open": BookOpen,
  "book-marked": BookMarked,
  "flower-2": Flower2,
  ellipsis: Ellipsis,
  "party-popper": PartyPopper,
  "arrow-left-right": ArrowLeftRight,
  sunrise: Sunrise,
  "calendar-clock": CalendarClock,
  sprout: Sprout,
  "grid-3x3": Grid3x3,
  layers: Layers,
  "moon-star": MoonStar,
  "clock-3": Clock3,
  route: Route,
  orbit: Orbit,
  "rotate-ccw": RotateCcw,
  eclipse: Eclipse,
  "heart-handshake": HeartHandshake,
  user: User,
  "log-in": LogIn,
  "user-plus": UserPlus,
  shield: Shield,
  "file-text": FileText,
  "calendar-days": CalendarDays,
  "chevron-right": ChevronRight,
};

/** The icon a feature is shown with (same as in the app). */
export function featureIcon(id: FeatureId): LucideIcon {
  return NAV_ICONS[FEATURE_ICON[id]];
}

/** The icon a drawer/sidebar entry is shown with (same as in the app). */
export function navEntryIcon(sectionId: string, itemId: string): LucideIcon {
  return NAV_ICONS[resolveNavIcon(sectionId, itemId)];
}
