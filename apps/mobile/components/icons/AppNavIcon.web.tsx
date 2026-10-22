import type { LucideIcon } from "lucide-react";
import CalendarHeart from "lucide-react/dist/esm/icons/calendar-heart";
import CalendarSync from "lucide-react/dist/esm/icons/calendar-sync";
import ChartPie from "lucide-react/dist/esm/icons/chart-pie";
import CalendarX from "lucide-react/dist/esm/icons/calendar-x";
import CalendarPlus from "lucide-react/dist/esm/icons/calendar-plus";
import Leaf from "lucide-react/dist/esm/icons/leaf";
import Timer from "lucide-react/dist/esm/icons/timer";
import ScrollText from "lucide-react/dist/esm/icons/scroll-text";
import Bell from "lucide-react/dist/esm/icons/bell";
import Contrast from "lucide-react/dist/esm/icons/contrast";
import InfinityIcon from "lucide-react/dist/esm/icons/infinity";
import Hourglass from "lucide-react/dist/esm/icons/hourglass";
import ArrowUpFromLine from "lucide-react/dist/esm/icons/arrow-up-from-line";
import Gauge from "lucide-react/dist/esm/icons/gauge";
import Sparkle from "lucide-react/dist/esm/icons/sparkle";
import CalendarCheck from "lucide-react/dist/esm/icons/calendar-check";
import Droplets from "lucide-react/dist/esm/icons/droplets";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import SunMoon from "lucide-react/dist/esm/icons/sun-moon";
import Gem from "lucide-react/dist/esm/icons/gem";
import GraduationCap from "lucide-react/dist/esm/icons/graduation-cap";
import Hammer from "lucide-react/dist/esm/icons/hammer";
import DoorOpen from "lucide-react/dist/esm/icons/door-open";
import Store from "lucide-react/dist/esm/icons/store";
import Shell from "lucide-react/dist/esm/icons/shell";
import Flame from "lucide-react/dist/esm/icons/flame";
import Baby from "lucide-react/dist/esm/icons/baby";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
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
import House from "lucide-react/dist/esm/icons/house";
import BookMarked from "lucide-react/dist/esm/icons/book-marked";
import Layers from "lucide-react/dist/esm/icons/layers";
import Moon from "lucide-react/dist/esm/icons/moon";
import MoonStar from "lucide-react/dist/esm/icons/moon-star";
import Orbit from "lucide-react/dist/esm/icons/orbit";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import Route from "lucide-react/dist/esm/icons/route";
import Shield from "lucide-react/dist/esm/icons/shield";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Star from "lucide-react/dist/esm/icons/star";
import Sun from "lucide-react/dist/esm/icons/sun";
import Sunrise from "lucide-react/dist/esm/icons/sunrise";
import User from "lucide-react/dist/esm/icons/user";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import type { NavIconName } from "@vedic-patro/icons";

const LUCIDE: Record<NavIconName, LucideIcon> = {
  house: House,
  "scroll-text": ScrollText,
  bell: Bell,
  contrast: Contrast,
  infinity: InfinityIcon,
  hourglass: Hourglass,
  "arrow-up-from-line": ArrowUpFromLine,
  gauge: Gauge,
  sparkle: Sparkle,
  "calendar-check": CalendarCheck,
  droplets: Droplets,
  "eye-off": EyeOff,
  "sun-moon": SunMoon,
  gem: Gem,
  "graduation-cap": GraduationCap,
  hammer: Hammer,
  "door-open": DoorOpen,
  store: Store,
  shell: Shell,
  flame: Flame,
  baby: Baby,
  "calendar-heart": CalendarHeart,
  "calendar-sync": CalendarSync,
  "chart-pie": ChartPie,
  "calendar-x": CalendarX,
  "calendar-plus": CalendarPlus,
  "leaf": Leaf,
  "timer": Timer,
  "book-marked": BookMarked,
  star: Star,
  "book-open": BookOpen,
  compass: Compass,
  sunrise: Sunrise,
  moon: Moon,
  "calendar-clock": CalendarClock,
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
  name: NavIconName;
  size: number;
  color: string;
}) {
  const Icon = LUCIDE[name];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.75} color={color} aria-hidden />;
}
