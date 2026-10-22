/**
 * The website's renderer for the shared icon identity (@vedic-patro/icons):
 * each Lucide name the navigation can produce → its lucide-react component.
 * Which icon means what is decided in the package, the same for the app.
 */
import type { LucideIcon } from "lucide-react";
import {
  CalendarHeart,
  CalendarSync,
  ChartPie,
  CalendarX,
  CalendarPlus,
  Leaf,
  Timer,
  BookMarked,
  BookOpen,
  CalendarClock,
  CalendarDays,
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
  RotateCcw,
  Route,
  Shield,
  Sparkles,
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
  compass: Compass,
  "book-open": BookOpen,
  "book-marked": BookMarked,
  "flower-2": Flower2,
  ellipsis: Ellipsis,
  sunrise: Sunrise,
  "calendar-clock": CalendarClock,
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
  "calendar-heart": CalendarHeart,
  "calendar-sync": CalendarSync,
  "chart-pie": ChartPie,
  "calendar-x": CalendarX,
  "calendar-plus": CalendarPlus,
  "leaf": Leaf,
  "timer": Timer,
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
