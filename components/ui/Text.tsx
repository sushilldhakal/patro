import { Text as RNText, type TextProps as RNTextProps } from "react-native";
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
  if (/\btext-\[/.test(className)) return undefined;
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

/** Default Text — always applies theme foreground unless a palette utility is used. */
export function Text({ className, style, ...props }: Props) {
  const colors = useThemeColors();
  const color = themedTextColor(className, colors);

  return (
    <RNText
      {...props}
      className={cn("font-sans", className)}
      style={[color ? { color } : undefined, style]}
    />
  );
}

export default Text;
