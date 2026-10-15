import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { iconSize, mobileRoles } from "@vedic-patro/design-tokens";
import { iconStrokeWidth } from "@vedic-patro/icons";
import { iconToneRole } from "../classes";
import type { IconProps } from "../contract";

const SHAPES = { path: Path, circle: Circle, ellipse: Ellipse, rect: Rect, line: Line, polyline: Polyline, polygon: Polygon } as const;
const ROLES = { light: mobileRoles("light"), dark: mobileRoles("dark") };

/**
 * Draws a Lucide node list with react-native-svg — the same artwork the
 * website draws. react-native-svg needs a real colour, so the tone's theme
 * role is looked up for the current light/dark scheme.
 */
export function Icon({ node, size = "md", tone = "foreground", filled, strokeWidth, label, testID }: IconProps) {
  const { colorScheme } = useColorScheme();
  const px = typeof size === "number" ? size : iconSize[size];
  const color = ROLES[colorScheme === "dark" ? "dark" : "light"][iconToneRole[tone]];
  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      testID={testID}
    >
      <G
        stroke={color}
        strokeWidth={strokeWidth ?? iconStrokeWidth(px)}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : "none"}
      >
        {node.map(([tag, attrs], i) => {
          const Shape = SHAPES[tag as keyof typeof SHAPES];
          if (!Shape) return null;
          const { key: _key, ...rest } = attrs as Record<string, string | number>;
          return <Shape key={i} {...(rest as object)} />;
        })}
      </G>
    </Svg>
  );
}
