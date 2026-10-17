import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from "react-native";
import {
  NOTO_DEVANAGARI_BOLD,
  NOTO_DEVANAGARI_MEDIUM,
  NOTO_DEVANAGARI_REGULAR,
  NOTO_DEVANAGARI_SEMIBOLD,
} from "@/lib/fonts";
import { cn } from "@vedic-patro/domain/utils";
import { spec } from "@vedic-patro/design-tokens";

/** Text styles from the shared spec. Colour stays a class, never a JS override. */
const TEXT_VARIANTS = [
  "pageTitle",
  "pageSubtitle",
  "sectionTitle",
  "cardTitle",
  "label",
  "eyebrow",
  "body",
  "caption",
  "statValue",
] as const;

export type TextVariant = (typeof TEXT_VARIANTS)[number];

type Props = RNTextProps & { className?: string; variant?: TextVariant };

/**
 * Size, alignment and wrapping utilities. Anything else that starts with
 * `text-` is a colour (`text-danger`, `text-ill-sky84`, `text-[var(--x)]`),
 * and a default foreground must not be stacked on top of it: two colour
 * utilities have the same specificity, so the stylesheet order would win.
 */
const TEXT_NOT_COLOR =
  /\btext-(?:left|center|right|justify|start|end|ellipsis|clip|wrap|nowrap|balance|pretty|caption|body|title|display|diagram-2xs|diagram-xs|diagram-sm|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/g;
const TEXT_LENGTH = /\btext-\[(?:length:)?-?\d*\.?\d+(?:px|rem|em|%|vw|vh|pt)\]/g;

function hasTextColor(className: string): boolean {
  const rest = className.replace(TEXT_NOT_COLOR, "").replace(TEXT_LENGTH, "");
  return /\btext-/.test(rest);
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

const TYPE_SCALE =
  /\btext-(?:caption|body|title|display|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|\[[^\]]+\])\b/;

/** Drop inline fontSize / lineHeight so only the shared type scale sets type. */
function withoutInlineType(style: RNTextProps["style"]): RNTextProps["style"] {
  if (style == null) return style;
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;
  const { fontSize: _size, lineHeight: _line, ...rest } = flat;
  return rest;
}

const DEVANAGARI = /[\u0900-\u097F]/;

/* iOS spaces each glyph of a shaped Devanagari cluster, so `tracking-*` pulled
   conjuncts and matras apart. The browser keeps clusters whole. */
function hasDevanagari(children: unknown): boolean {
  if (typeof children === "string") return DEVANAGARI.test(children);
  if (Array.isArray(children)) return children.some((child) => typeof child === "string" && DEVANAGARI.test(child));
  return false;
}

/** Default Text. Size comes from `variant` or a type class; colour comes from the class only. */
export function Text({ className, style, variant, ...props }: Props) {
  const merged = cn(variant ? spec[variant] : undefined, className);
  const sized = TYPE_SCALE.test(merged) ? merged : cn("text-body", merged);
  const colored = hasTextColor(sized) ? sized : cn("text-foreground", sized);
  const typeStyle = withoutInlineType(style);
  const flat = StyleSheet.flatten(typeStyle) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  const family = !flat?.fontFamily || NOTO_FAMILIES.has(flat.fontFamily)
    ? weightFamily(flat?.fontWeight, colored)
    : undefined;

  return (
    <RNText
      {...props}
      className={cn("font-sans", colored)}
      style={[
        typeStyle,
        family ? { fontFamily: family, fontWeight: "normal" } : undefined,
        hasDevanagari(props.children) ? { letterSpacing: 0 } : undefined,
      ]}
    />
  );
}

export default Text;
