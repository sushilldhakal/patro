import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from "react-native";
import {
  NOTO_DEVANAGARI_BOLD,
  NOTO_DEVANAGARI_MEDIUM,
  NOTO_DEVANAGARI_REGULAR,
  NOTO_DEVANAGARI_SEMIBOLD,
} from "@/lib/fonts";
import { useThemeColors } from "@/lib/theme-context";
import { inkOn, relativeLuminance, type ThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Props = RNTextProps & { className?: string };

/** Tailwind palette utilities — leave to NativeWind when vars work. */
const PALETTE_COLOR_CLASS =
  /\btext-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-/;

function themedTextColor(className: string | undefined, colors: ThemeColors): string | undefined {
  if (!className) return colors.foreground;
  if (PALETTE_COLOR_CLASS.test(className)) return undefined;
  if (/\btext-\[#/.test(className)) return undefined;
  /* Arbitrary *colours* (`text-[var(--x)]`, `text-[color:...]`) stay with NativeWind.
     Arbitrary *sizes* (`text-caption`, `text-caption`, `text-[length:...]`) are not
     colours — returning here for them left the text with no colour at all, which
     rendered black on dark surfaces. */
  const arbitrary = className.match(/\btext-\[([^\]]*)\]/);
  if (arbitrary && !/^(?:length:)?-?\d*\.?\d+(?:px|rem|em|%|vw|vh|pt)?$/.test(arbitrary[1])) {
    return undefined;
  }
  if (/\btext-muted-foreground\b/.test(className)) return colors.mutedForeground;
  if (/\btext-secondary-foreground\b/.test(className)) return inkOn(colors.secondary);
  if (/\btext-secondary\b/.test(className)) return colors.secondary;
  /* Check this before `text-primary`. `\btext-primary\b` also matches
     `text-primary-foreground`, which would paint the label the same orange
     as a `bg-primary` button. */
  /* Dark-mode primary is a light orange. White type on it is hard to read. */
  if (/\btext-primary-foreground\b/.test(className)) {
    return relativeLuminance(colors.background) < 0.2 && relativeLuminance(colors.primary) > 0.2
      ? "#1a1410"
      : "#ffffff";
  }
  if (/\btext-primary\b/.test(className)) return colors.primary;
  if (/\btext-destructive\b/.test(className)) return colors.destructive;
  /* Without this, `text-danger` fell through to the foreground default below
     and the class did nothing — the style prop this returns wins over the
     compiled className. */
  if (/\btext-danger\b/.test(className)) return colors.danger;
  if (/\btext-accent\b/.test(className)) return colors.accent;
  if (/\btext-success\b/.test(className)) return colors.accent;
  if (/\btext-white\b/.test(className)) return "#ffffff";
  if (/\btext-black\b/.test(className)) return "#000000";
  if (/\btext-foreground/.test(className)) return colors.foreground;
  return colors.foreground;
}

/**
 * Custom fonts on iOS/Android ignore `fontWeight` — a weight needs its own font
 * file. `nepaliTextStyle` pins the Regular file, so every `font-bold` heading
 * rendered at regular weight (the main reason the app looked lighter than web).
 * Pick the file that matches the requested weight instead.
 */
const NOTO_FAMILIES = new Set([
  NOTO_DEVANAGARI_REGULAR,
  NOTO_DEVANAGARI_MEDIUM,
  NOTO_DEVANAGARI_SEMIBOLD,
  NOTO_DEVANAGARI_BOLD,
]);

function weightFamily(weight: string | number | undefined, className?: string): string | undefined {
  let w: number | undefined;
  if (weight === "bold") w = 700;
  else if (weight != null && weight !== "normal") w = Number(weight);
  if (w == null || Number.isNaN(w)) {
    if (className) {
      if (/\bfont-(?:bold|extrabold|black)\b/.test(className)) w = 700;
      else if (/\bfont-semibold\b/.test(className)) w = 600;
      else if (/\bfont-medium\b/.test(className)) w = 500;
    }
  }
  if (w == null) return undefined;
  if (w >= 700) return NOTO_DEVANAGARI_BOLD;
  if (w >= 600) return NOTO_DEVANAGARI_SEMIBOLD;
  if (w >= 500) return NOTO_DEVANAGARI_MEDIUM;
  return undefined;
}

const TYPE_SCALE = /\btext-(?:caption|body|title|display)\b/;

/** Drop inline fontSize / lineHeight so only the four global classes set type. */
function withoutInlineType(style: RNTextProps["style"]): RNTextProps["style"] {
  if (style == null) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;
  const { fontSize: _size, lineHeight: _line, ...rest } = flat;
  return rest;
}

/** Default Text — always applies theme foreground unless a palette utility is used. */
export function Text({ className, style, ...props }: Props) {
  const colors = useThemeColors();
  const sized = TYPE_SCALE.test(className ?? "") ? className : cn("text-body", className);
  const color = themedTextColor(sized, colors);
  const typeStyle = withoutInlineType(style);
  const flat = StyleSheet.flatten(typeStyle) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  const family = !flat?.fontFamily || NOTO_FAMILIES.has(flat.fontFamily)
    ? weightFamily(flat?.fontWeight, sized)
    : undefined;

  return (
    <RNText
      {...props}
      className={cn("font-sans", sized)}
      style={[color ? { color } : undefined, typeStyle, family ? { fontFamily: family, fontWeight: "normal" } : undefined]}
    />
  );
}

export default Text;
