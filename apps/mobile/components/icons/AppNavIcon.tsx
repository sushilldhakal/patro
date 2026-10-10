import type { DrawerIconName } from "@/lib/drawer-icons";
import { LucideNative, type LucideIconNode } from "./LucideNative";
import { __iconNode as ArrowLeftRightNode } from "lucide-react/dist/esm/icons/arrow-left-right";
import { __iconNode as BookOpenNode } from "lucide-react/dist/esm/icons/book-open";
import { __iconNode as CalendarClockNode } from "lucide-react/dist/esm/icons/calendar-clock";
import { __iconNode as CalendarDaysNode } from "lucide-react/dist/esm/icons/calendar-days";
import { __iconNode as CalendarRangeNode } from "lucide-react/dist/esm/icons/calendar-range";
import { __iconNode as ChevronRightNode } from "lucide-react/dist/esm/icons/chevron-right";
import { __iconNode as Clock3Node } from "lucide-react/dist/esm/icons/clock-3";
import { __iconNode as CompassNode } from "lucide-react/dist/esm/icons/compass";
import { __iconNode as EclipseNode } from "lucide-react/dist/esm/icons/eclipse";
import { __iconNode as EllipsisNode } from "lucide-react/dist/esm/icons/ellipsis";
import { __iconNode as FileTextNode } from "lucide-react/dist/esm/icons/file-text";
import { __iconNode as Flower2Node } from "lucide-react/dist/esm/icons/flower-2";
import { __iconNode as Grid3x3Node } from "lucide-react/dist/esm/icons/grid-3x3";
import { __iconNode as HeartNode } from "lucide-react/dist/esm/icons/heart";
import { __iconNode as HeartHandshakeNode } from "lucide-react/dist/esm/icons/heart-handshake";
import { __iconNode as HomeNode } from "lucide-react/dist/esm/icons/home";
import { __iconNode as LayersNode } from "lucide-react/dist/esm/icons/layers";
import { __iconNode as MoonNode } from "lucide-react/dist/esm/icons/moon";
import { __iconNode as MoonStarNode } from "lucide-react/dist/esm/icons/moon-star";
import { __iconNode as OrbitNode } from "lucide-react/dist/esm/icons/orbit";
import { __iconNode as PartyPopperNode } from "lucide-react/dist/esm/icons/party-popper";
import { __iconNode as RotateCcwNode } from "lucide-react/dist/esm/icons/rotate-ccw";
import { __iconNode as RouteNode } from "lucide-react/dist/esm/icons/route";
import { __iconNode as ShieldNode } from "lucide-react/dist/esm/icons/shield";
import { __iconNode as SparklesNode } from "lucide-react/dist/esm/icons/sparkles";
import { __iconNode as SproutNode } from "lucide-react/dist/esm/icons/sprout";
import { __iconNode as StarNode } from "lucide-react/dist/esm/icons/star";
import { __iconNode as SunNode } from "lucide-react/dist/esm/icons/sun";
import { __iconNode as SunriseNode } from "lucide-react/dist/esm/icons/sunrise";
import { __iconNode as LogInNode } from "lucide-react/dist/esm/icons/log-in";
import { __iconNode as UserPlusNode } from "lucide-react/dist/esm/icons/user-plus";
import { __iconNode as UserNode } from "lucide-react/dist/esm/icons/user";

const LUCIDE: Record<DrawerIconName, LucideIconNode> = {
  home: HomeNode,
  star: StarNode,
  "book-open": BookOpenNode,
  compass: CompassNode,
  "party-popper": PartyPopperNode,
  "arrow-left-right": ArrowLeftRightNode,
  sunrise: SunriseNode,
  "calendar-range": CalendarRangeNode,
  moon: MoonNode,
  "calendar-clock": CalendarClockNode,
  sprout: SproutNode,
  "grid-3x3": Grid3x3Node,
  sparkles: SparklesNode,
  heart: HeartNode,
  sun: SunNode,
  layers: LayersNode,
  "moon-star": MoonStarNode,
  "clock-3": Clock3Node,
  route: RouteNode,
  orbit: OrbitNode,
  "rotate-ccw": RotateCcwNode,
  eclipse: EclipseNode,
  "heart-handshake": HeartHandshakeNode,
  "calendar-days": CalendarDaysNode,
  "flower-2": Flower2Node,
  ellipsis: EllipsisNode,
  shield: ShieldNode,
  "file-text": FileTextNode,
  user: UserNode,
  "chevron-right": ChevronRightNode,
  "log-in": LogInNode,
  "user-plus": UserPlusNode,
};

/** Native: the same Lucide artwork as web (`AppNavIcon.web.tsx`), drawn with react-native-svg. */
export function AppNavIcon({
  name,
  size,
  color,
}: {
  name: DrawerIconName;
  size: number;
  color: string;
}) {
  const node = LUCIDE[name];
  if (!node) return null;
  return <LucideNative node={node} size={size} color={color} />;
}
