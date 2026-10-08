import type { ComponentProps } from "react";
import { Ionicons as RealIonicons } from "@expo/vector-icons";
import { LucideNative, type LucideIconNode } from "./LucideNative";
import { __iconNode as ActivityNode } from "lucide-react/dist/esm/icons/activity";
import { __iconNode as ArrowDownNode } from "lucide-react/dist/esm/icons/arrow-down";
import { __iconNode as ArrowLeftNode } from "lucide-react/dist/esm/icons/arrow-left";
import { __iconNode as ArrowLeftRightNode } from "lucide-react/dist/esm/icons/arrow-left-right";
import { __iconNode as ArrowRightNode } from "lucide-react/dist/esm/icons/arrow-right";
import { __iconNode as ArrowUpNode } from "lucide-react/dist/esm/icons/arrow-up";
import { __iconNode as BanknoteNode } from "lucide-react/dist/esm/icons/banknote";
import { __iconNode as BookOpenNode } from "lucide-react/dist/esm/icons/book-open";
import { __iconNode as BriefcaseNode } from "lucide-react/dist/esm/icons/briefcase";
import { __iconNode as CalculatorNode } from "lucide-react/dist/esm/icons/calculator";
import { __iconNode as CalendarNode } from "lucide-react/dist/esm/icons/calendar";
import { __iconNode as CalendarDaysNode } from "lucide-react/dist/esm/icons/calendar-days";
import { __iconNode as ChartColumnNode } from "lucide-react/dist/esm/icons/chart-column";
import { __iconNode as CheckNode } from "lucide-react/dist/esm/icons/check";
import { __iconNode as ChevronDownNode } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as ChevronLeftNode } from "lucide-react/dist/esm/icons/chevron-left";
import { __iconNode as ChevronRightNode } from "lucide-react/dist/esm/icons/chevron-right";
import { __iconNode as ChevronUpNode } from "lucide-react/dist/esm/icons/chevron-up";
import { __iconNode as CircleNode } from "lucide-react/dist/esm/icons/circle";
import { __iconNode as CircleAlertNode } from "lucide-react/dist/esm/icons/circle-alert";
import { __iconNode as CircleArrowDownNode } from "lucide-react/dist/esm/icons/circle-arrow-down";
import { __iconNode as CircleArrowLeftNode } from "lucide-react/dist/esm/icons/circle-arrow-left";
import { __iconNode as CircleArrowRightNode } from "lucide-react/dist/esm/icons/circle-arrow-right";
import { __iconNode as CircleCheckNode } from "lucide-react/dist/esm/icons/circle-check";
import { __iconNode as CircleHelpNode } from "lucide-react/dist/esm/icons/circle-help";
import { __iconNode as CircleMinusNode } from "lucide-react/dist/esm/icons/circle-minus";
import { __iconNode as CirclePlusNode } from "lucide-react/dist/esm/icons/circle-plus";
import { __iconNode as CircleUserNode } from "lucide-react/dist/esm/icons/circle-user";
import { __iconNode as CircleXNode } from "lucide-react/dist/esm/icons/circle-x";
import { __iconNode as ClockNode } from "lucide-react/dist/esm/icons/clock";
import { __iconNode as CloudNode } from "lucide-react/dist/esm/icons/cloud";
import { __iconNode as CloudDownloadNode } from "lucide-react/dist/esm/icons/cloud-download";
import { __iconNode as CloudOffNode } from "lucide-react/dist/esm/icons/cloud-off";
import { __iconNode as CloudSunNode } from "lucide-react/dist/esm/icons/cloud-sun";
import { __iconNode as CompassNode } from "lucide-react/dist/esm/icons/compass";
import { __iconNode as DownloadNode } from "lucide-react/dist/esm/icons/download";
import { __iconNode as EllipsisNode } from "lucide-react/dist/esm/icons/ellipsis";
import { __iconNode as EyeNode } from "lucide-react/dist/esm/icons/eye";
import { __iconNode as EyeOffNode } from "lucide-react/dist/esm/icons/eye-off";
import { __iconNode as FastForwardNode } from "lucide-react/dist/esm/icons/fast-forward";
import { __iconNode as FileTextNode } from "lucide-react/dist/esm/icons/file-text";
import { __iconNode as FingerprintNode } from "lucide-react/dist/esm/icons/fingerprint";
import { __iconNode as FlagNode } from "lucide-react/dist/esm/icons/flag";
import { __iconNode as FlameNode } from "lucide-react/dist/esm/icons/flame";
import { __iconNode as Flower2Node } from "lucide-react/dist/esm/icons/flower-2";
import { __iconNode as GemNode } from "lucide-react/dist/esm/icons/gem";
import { __iconNode as GiftNode } from "lucide-react/dist/esm/icons/gift";
import { __iconNode as GitBranchNode } from "lucide-react/dist/esm/icons/git-branch";
import { __iconNode as GitCompareNode } from "lucide-react/dist/esm/icons/git-compare";
import { __iconNode as GlobeNode } from "lucide-react/dist/esm/icons/globe";
import { __iconNode as GraduationCapNode } from "lucide-react/dist/esm/icons/graduation-cap";
import { __iconNode as GripNode } from "lucide-react/dist/esm/icons/grip";
import { __iconNode as HeadphonesNode } from "lucide-react/dist/esm/icons/headphones";
import { __iconNode as HeartNode } from "lucide-react/dist/esm/icons/heart";
import { __iconNode as HouseNode } from "lucide-react/dist/esm/icons/house";
import { __iconNode as InfinityNode } from "lucide-react/dist/esm/icons/infinity";
import { __iconNode as InfoNode } from "lucide-react/dist/esm/icons/info";
import { __iconNode as LanguagesNode } from "lucide-react/dist/esm/icons/languages";
import { __iconNode as LayersNode } from "lucide-react/dist/esm/icons/layers";
import { __iconNode as LayoutGridNode } from "lucide-react/dist/esm/icons/layout-grid";
import { __iconNode as LeafNode } from "lucide-react/dist/esm/icons/leaf";
import { __iconNode as ListNode } from "lucide-react/dist/esm/icons/list";
import { __iconNode as LocateNode } from "lucide-react/dist/esm/icons/locate";
import { __iconNode as LockNode } from "lucide-react/dist/esm/icons/lock";
import { __iconNode as LogOutNode } from "lucide-react/dist/esm/icons/log-out";
import { __iconNode as MailNode } from "lucide-react/dist/esm/icons/mail";
import { __iconNode as MapPinNode } from "lucide-react/dist/esm/icons/map-pin";
import { __iconNode as Maximize2Node } from "lucide-react/dist/esm/icons/maximize-2";
import { __iconNode as MenuNode } from "lucide-react/dist/esm/icons/menu";
import { __iconNode as Minimize2Node } from "lucide-react/dist/esm/icons/minimize-2";
import { __iconNode as MinusNode } from "lucide-react/dist/esm/icons/minus";
import { __iconNode as MoonNode } from "lucide-react/dist/esm/icons/moon";
import { __iconNode as MusicNode } from "lucide-react/dist/esm/icons/music";
import { __iconNode as NavigationNode } from "lucide-react/dist/esm/icons/navigation";
import { __iconNode as OrbitNode } from "lucide-react/dist/esm/icons/orbit";
import { __iconNode as PaletteNode } from "lucide-react/dist/esm/icons/palette";
import { __iconNode as PauseNode } from "lucide-react/dist/esm/icons/pause";
import { __iconNode as PencilNode } from "lucide-react/dist/esm/icons/pencil";
import { __iconNode as PlaneNode } from "lucide-react/dist/esm/icons/plane";
import { __iconNode as PlayNode } from "lucide-react/dist/esm/icons/play";
import { __iconNode as PlusNode } from "lucide-react/dist/esm/icons/plus";
import { __iconNode as RefreshCwNode } from "lucide-react/dist/esm/icons/refresh-cw";
import { __iconNode as RewindNode } from "lucide-react/dist/esm/icons/rewind";
import { __iconNode as ScanNode } from "lucide-react/dist/esm/icons/scan";
import { __iconNode as ScissorsNode } from "lucide-react/dist/esm/icons/scissors";
import { __iconNode as SearchNode } from "lucide-react/dist/esm/icons/search";
import { __iconNode as ServerNode } from "lucide-react/dist/esm/icons/server";
import { __iconNode as ShieldNode } from "lucide-react/dist/esm/icons/shield";
import { __iconNode as SkipBackNode } from "lucide-react/dist/esm/icons/skip-back";
import { __iconNode as SkipForwardNode } from "lucide-react/dist/esm/icons/skip-forward";
import { __iconNode as SlidersHorizontalNode } from "lucide-react/dist/esm/icons/sliders-horizontal";
import { __iconNode as SmartphoneNode } from "lucide-react/dist/esm/icons/smartphone";
import { __iconNode as SmileNode } from "lucide-react/dist/esm/icons/smile";
import { __iconNode as SparklesNode } from "lucide-react/dist/esm/icons/sparkles";
import { __iconNode as SquareNode } from "lucide-react/dist/esm/icons/square";
import { __iconNode as StarNode } from "lucide-react/dist/esm/icons/star";
import { __iconNode as SunNode } from "lucide-react/dist/esm/icons/sun";
import { __iconNode as TelescopeNode } from "lucide-react/dist/esm/icons/telescope";
import { __iconNode as Trash2Node } from "lucide-react/dist/esm/icons/trash-2";
import { __iconNode as TriangleNode } from "lucide-react/dist/esm/icons/triangle";
import { __iconNode as TriangleAlertNode } from "lucide-react/dist/esm/icons/triangle-alert";
import { __iconNode as TypeNode } from "lucide-react/dist/esm/icons/type";
import { __iconNode as UserNode } from "lucide-react/dist/esm/icons/user";
import { __iconNode as WrenchNode } from "lucide-react/dist/esm/icons/wrench";
import { __iconNode as XNode } from "lucide-react/dist/esm/icons/x";
import { __iconNode as ZapNode } from "lucide-react/dist/esm/icons/zap";

/**
 * Drop-in for `@expo/vector-icons`' `Ionicons` that draws the Lucide icon the
 * website uses for the same meaning (web renders Lucide everywhere), so native
 * screens stop looking like a different icon set. Names with no Lucide
 * counterpart (brand logos, rare glyphs) fall back to the real Ionicons.
 */
const LUCIDE_BY_IONICON: Record<string, LucideIconNode> = {
  "add": PlusNode,
  "add-circle-outline": CirclePlusNode,
  "airplane-outline": PlaneNode,
  "alert-circle-outline": CircleAlertNode,
  "arrow-back": ArrowLeftNode,
  "arrow-back-circle-outline": CircleArrowLeftNode,
  "arrow-down": ArrowDownNode,
  "arrow-down-circle-outline": CircleArrowDownNode,
  "arrow-forward": ArrowRightNode,
  "arrow-forward-circle-outline": CircleArrowRightNode,
  "arrow-up": ArrowUpNode,
  "book-outline": BookOpenNode,
  "briefcase-outline": BriefcaseNode,
  "build-outline": WrenchNode,
  "calculator-outline": CalculatorNode,
  "calendar": CalendarNode,
  "calendar-number-outline": CalendarDaysNode,
  "calendar-outline": CalendarNode,
  "cash-outline": BanknoteNode,
  "checkmark": CheckNode,
  "checkmark-circle": CircleCheckNode,
  "chevron-back": ChevronLeftNode,
  "chevron-down": ChevronDownNode,
  "chevron-forward": ChevronRightNode,
  "chevron-right": ChevronRightNode,
  "chevron-up": ChevronUpNode,
  "close": XNode,
  "close-circle": CircleXNode,
  "close-circle-outline": CircleXNode,
  "cloud-download-outline": CloudDownloadNode,
  "cloud-offline-outline": CloudOffNode,
  "cloud-outline": CloudNode,
  "color-palette-outline": PaletteNode,
  "compass": CompassNode,
  "compass-outline": CompassNode,
  "contract-outline": Minimize2Node,
  "cut-outline": ScissorsNode,
  "diamond-outline": GemNode,
  "document-text-outline": FileTextNode,
  "download-outline": DownloadNode,
  "ellipse-outline": CircleNode,
  "ellipsis-horizontal-outline": EllipsisNode,
  "expand-outline": Maximize2Node,
  "eye-off-outline": EyeOffNode,
  "eye-outline": EyeNode,
  "finger-print-outline": FingerprintNode,
  "fitness-outline": ActivityNode,
  "flag": FlagNode,
  "flag-outline": FlagNode,
  "flame": FlameNode,
  "flame-outline": FlameNode,
  "flash-outline": ZapNode,
  "flower-outline": Flower2Node,
  "gift-outline": GiftNode,
  "git-branch-outline": GitBranchNode,
  "git-compare-outline": GitCompareNode,
  "globe": GlobeNode,
  "globe-outline": GlobeNode,
  "grid": LayoutGridNode,
  "grid-outline": LayoutGridNode,
  "happy-outline": SmileNode,
  "headset-outline": HeadphonesNode,
  "heart": HeartNode,
  "heart-outline": HeartNode,
  "help-circle-outline": CircleHelpNode,
  "home": HouseNode,
  "home-outline": HouseNode,
  "infinite-outline": InfinityNode,
  "information-circle-outline": InfoNode,
  "keypad-outline": GripNode,
  "language-outline": LanguagesNode,
  "layers-outline": LayersNode,
  "leaf-outline": LeafNode,
  "list": ListNode,
  "list-outline": ListNode,
  "locate-outline": LocateNode,
  "location-outline": MapPinNode,
  "lock-closed-outline": LockNode,
  "log-out-outline": LogOutNode,
  "mail-unread-outline": MailNode,
  "man-outline": UserNode,
  "menu-outline": MenuNode,
  "moon": MoonNode,
  "moon-outline": MoonNode,
  "musical-notes-outline": MusicNode,
  "navigate-outline": NavigationNode,
  "options": SlidersHorizontalNode,
  "partly-sunny-outline": CloudSunNode,
  "pause": PauseNode,
  "pencil-outline": PencilNode,
  "person-circle-outline": CircleUserNode,
  "person-outline": UserNode,
  "phone-portrait-outline": SmartphoneNode,
  "planet": OrbitNode,
  "planet-outline": OrbitNode,
  "play": PlayNode,
  "play-back": RewindNode,
  "play-forward": FastForwardNode,
  "play-skip-back": SkipBackNode,
  "play-skip-forward": SkipForwardNode,
  "refresh": RefreshCwNode,
  "refresh-outline": RefreshCwNode,
  "remove": MinusNode,
  "remove-circle-outline": CircleMinusNode,
  "scan-outline": ScanNode,
  "school-outline": GraduationCapNode,
  "search": SearchNode,
  "search-outline": SearchNode,
  "server-outline": ServerNode,
  "shield-outline": ShieldNode,
  "sparkles": SparklesNode,
  "sparkles-outline": SparklesNode,
  "square-outline": SquareNode,
  "star": StarNode,
  "star-outline": StarNode,
  "stats-chart": ChartColumnNode,
  "sunny-outline": SunNode,
  "swap-horizontal": ArrowLeftRightNode,
  "swap-horizontal-outline": ArrowLeftRightNode,
  "sync-outline": RefreshCwNode,
  "telescope-outline": TelescopeNode,
  "text-outline": TypeNode,
  "time": ClockNode,
  "time-outline": ClockNode,
  "trash-outline": Trash2Node,
  "triangle-outline": TriangleNode,
  "warning-outline": TriangleAlertNode,
  "woman-outline": UserNode,
};

/** Ionicons names that are solid glyphs — keep them solid. */
const FILLED = new Set<string>(["flag", "flame", "heart", "moon", "pause", "play", "star"]);

type Props = ComponentProps<typeof RealIonicons>;

function IoniconsImpl(props: Props) {
  const { name, size = 24, color = "#000", style } = props;
  const node = LUCIDE_BY_IONICON[name as string];
  if (!node) return <RealIonicons {...props} />;
  return (
    <LucideNative
      node={node}
      size={size}
      color={color as string}
      fill={FILLED.has(name as string) ? (color as string) : undefined}
      style={style as object}
      strokeWidth={size <= 16 ? 2 : 1.75}
    />
  );
}

export const Ionicons = Object.assign(IoniconsImpl, { glyphMap: RealIonicons.glyphMap });
