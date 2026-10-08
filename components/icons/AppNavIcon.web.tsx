import type { LucideIcon } from "lucide-react";
import ArrowLeftRight from "lucide-react/dist/esm/icons/arrow-left-right";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import CalendarRange from "lucide-react/dist/esm/icons/calendar-range";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import Compass from "lucide-react/dist/esm/icons/compass";
import Eclipse from "lucide-react/dist/esm/icons/eclipse";
import Ellipsis from "lucide-react/dist/esm/icons/ellipsis";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Flower2 from "lucide-react/dist/esm/icons/flower-2";
import Grid3x3 from "lucide-react/dist/esm/icons/grid-3x3";
import Heart from "lucide-react/dist/esm/icons/heart";
import HeartHandshake from "lucide-react/dist/esm/icons/heart-handshake";
import Home from "lucide-react/dist/esm/icons/home";
import Layers from "lucide-react/dist/esm/icons/layers";
import Moon from "lucide-react/dist/esm/icons/moon";
import MoonStar from "lucide-react/dist/esm/icons/moon-star";
import Orbit from "lucide-react/dist/esm/icons/orbit";
import PartyPopper from "lucide-react/dist/esm/icons/party-popper";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import Route from "lucide-react/dist/esm/icons/route";
import Shield from "lucide-react/dist/esm/icons/shield";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Sprout from "lucide-react/dist/esm/icons/sprout";
import Star from "lucide-react/dist/esm/icons/star";
import Sun from "lucide-react/dist/esm/icons/sun";
import Sunrise from "lucide-react/dist/esm/icons/sunrise";
import User from "lucide-react/dist/esm/icons/user";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import type { DrawerIconName } from "@/lib/drawer-icons";

const LUCIDE: Record<DrawerIconName, LucideIcon> = {
  home: Home,
  star: Star,
  "book-open": BookOpen,
  compass: Compass,
  "party-popper": PartyPopper,
  "arrow-left-right": ArrowLeftRight,
  sunrise: Sunrise,
  "calendar-range": CalendarRange,
  moon: Moon,
  "calendar-clock": CalendarClock,
  sprout: Sprout,
  "grid-3x3": Grid3x3,
  sparkles: Sparkles,
  heart: Heart,
  sun: Sun,
  layers: Layers,
  "moon-star": MoonStar,
  "clock-3": Clock3,
  route: Route,
  orbit: Orbit,
  "rotate-ccw": RotateCcw,
  eclipse: Eclipse,
  "heart-handshake": HeartHandshake,
  "calendar-days": CalendarDays,
  "flower-2": Flower2,
  ellipsis: Ellipsis,
  shield: Shield,
  "file-text": FileText,
  user: User,
  "chevron-right": ChevronRight,
  "log-in": LogIn,
  "user-plus": UserPlus,
};

/** Same Lucide set as `dhakal-patro` MobileNavMenu — Ionicons fonts fail on Expo web. */
export function AppNavIcon({
  name,
  size,
  color,
}: {
  name: DrawerIconName;
  size: number;
  color: string;
}) {
  const Icon = LUCIDE[name];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.75} color={color} aria-hidden />;
}
