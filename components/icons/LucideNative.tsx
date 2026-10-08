import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
} from "react-native-svg";

export type LucideIconNode = ReadonlyArray<readonly [string, Record<string, string | number>]>;

/**
 * Renders a Lucide icon's own node data with react-native-svg — the same
 * artwork (24 × 24 grid, round caps and joins) the website draws with
 * `lucide-react`, so native icons are identical to web instead of the nearest
 * Ionicons look-alike.
 */
export function LucideNative({
  node,
  size,
  color,
  strokeWidth = 1.75,
  fill,
  style,
}: {
  node: LucideIconNode;
  size: number;
  color: string;
  strokeWidth?: number;
  /** Solid glyphs (a filled star, flame…). */
  fill?: string;
  style?: object;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style as never}>
      <G
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill ?? "none"}
      >
        {node.map(([tag, attrs], i) => {
          const { key: _key, ...p } = attrs as Record<string, string | number>;
          switch (tag) {
            case "path":
              return <Path key={i} {...(p as object)} />;
            case "circle":
              return <Circle key={i} {...(p as object)} />;
            case "ellipse":
              return <Ellipse key={i} {...(p as object)} />;
            case "rect":
              return <Rect key={i} {...(p as object)} />;
            case "line":
              return <Line key={i} {...(p as object)} />;
            case "polyline":
              return <Polyline key={i} {...(p as object)} />;
            case "polygon":
              return <Polygon key={i} {...(p as object)} />;
            default:
              return null;
          }
        })}
      </G>
    </Svg>
  );
}
