import { createContext, isValidElement, useContext, type ReactNode } from "react";
import { Platform, Text as RNText } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { fontFamily } from "@vedic-patro/design-tokens";
import { textVariantClass } from "../classes";
import type { TextProps } from "../contract";

/**
 * Size, alignment and wrapping utilities. Anything else that starts with
 * `text-` is a colour, and a default foreground must not be stacked on top of
 * one: two colour utilities have the same specificity, so stylesheet order wins.
 */
const TEXT_NOT_COLOR =
  /\btext-(?:left|center|right|justify|start|end|ellipsis|clip|wrap|nowrap|balance|pretty|caption|body|title|display|diagram-2xs|diagram-xs|diagram-sm|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/g;
const TYPE_SCALE = /\btext-(?:caption|body|title|display|xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/;

/**
 * Custom fonts on iOS/Android ignore `fontWeight` — each weight is its own
 * font file — so the weight class picks the file.
 */
function familyFor(className: string): string {
  if (/\bfont-mono\b/.test(className)) return fontFamily.native.mono;
  if (/\bfont-(?:bold|extrabold|black|num-bold)\b/.test(className)) return fontFamily.native.bold;
  if (/\bfont-semibold\b/.test(className)) return fontFamily.native.semibold;
  if (/\bfont-medium\b/.test(className)) return fontFamily.native.medium;
  return fontFamily.native.regular;
}

const ANDROID_PADDING = Platform.OS === "android" ? { includeFontPadding: true } : undefined;

/** Devanagari letters and marks; the digits ०–९ (U+0966–096F) carry no marks to crop or space. */
const DEVANAGARI = /[\u0900-\u0965\u0970-\u097F]/;

/** True when a direct string child is Devanagari. */
function hasDevanagari(children: unknown): boolean {
  if (typeof children === "string") return DEVANAGARI.test(children);
  if (Array.isArray(children)) return children.some((child) => typeof child === "string" && DEVANAGARI.test(child));
  return false;
}

/* iOS spaces each glyph of a shaped Devanagari cluster, so `tracking-*` pulled
   conjuncts and matras apart ("न क्ष त्र"). The browser keeps clusters whole. */
const NO_TRACKING = { letterSpacing: 0 };

/* Android measures a line-height-styled run that ends in a Devanagari
   cluster short of what it draws, so a label sized to its text (a chip, a
   table cell, "नयाँ वर्ष") wrapped its last word — or clipped it — with room
   to spare. Ending the run on a no-break space keeps measure and draw in step.
   (Same fix as the app's own Text.) */
const ENDS_DEVANAGARI = /[\u0900-\u097F]$/;

/** Set inside a Text: a nested span is part of its parent's run, not the end of one. */
const InsideText = createContext(false);

function padAndroidDevanagari(children: ReactNode): ReactNode {
  if (Platform.OS !== "android") return children;
  if (typeof children === "string") return ENDS_DEVANAGARI.test(children) ? `${children}\u00A0` : children;
  if (Array.isArray(children) && children.length > 0) {
    const last: unknown = children[children.length - 1];
    /* A run that ends in a nested span ("श्रावण <Text>३१ दिन</Text>") ends on that span's text. */
    if ((typeof last === "string" && ENDS_DEVANAGARI.test(last)) || isValidElement(last)) return [...children, "\u00A0"];
  }
  return children;
}

/* A line box of 1–1.25× the size crops the marks above and below a Devanagari
   line on iOS (असोज drew as "असाज", चैत as "चत"). The browser paints overflow. */
const TIGHT_LEADING = /\bleading-(?:none|tight)\b/g;

/**
 * Text in the app. React Native does not inherit size or colour from a parent
 * View, so every run gets the body size and foreground colour unless its
 * classes say otherwise — the same defaults the website's page text has.
 */
export function Text({ variant, numberOfLines, as, className, nativeClassName, children, testID }: TextProps) {
  const merged = cn(variant && textVariantClass[variant], className, nativeClassName);
  const sized = TYPE_SCALE.test(merged) ? merged : cn("text-body", merged);
  const tinted = /\btext-/.test(sized.replace(TEXT_NOT_COLOR, "")) ? sized : cn("text-foreground", sized);
  const devanagari = hasDevanagari(children);
  const colored = devanagari ? tinted.replace(TIGHT_LEADING, "leading-normal") : tinted;
  const nested = useContext(InsideText);
  return (
    <InsideText.Provider value>
    <RNText
      className={cn("font-sans", colored)}
      style={[{ fontFamily: familyFor(colored), fontWeight: "normal" }, ANDROID_PADDING, devanagari ? NO_TRACKING : undefined]}
      numberOfLines={numberOfLines}
      accessibilityRole={as && /^h\d$/.test(as) ? "header" : undefined}
      testID={testID}
    >
      {nested ? children : padAndroidDevanagari(children)}
    </RNText>
    </InsideText.Provider>
  );
}
