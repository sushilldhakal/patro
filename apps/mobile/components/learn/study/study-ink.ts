/**
 * The colours the website's Learn studies draw with (`--tm-*` in its index.css),
 * resolved for the app's current theme.
 *
 * The website's studies are SVG on the page's own card, so they follow light
 * and dark; these do the same, which is what makes a ported study look like
 * the website's rather than a dark canvas dropped into a light article.
 */
import { useMemo } from "react";
import { brand, fontFamily, midnight, mix, neutral, withAlpha } from "@vedic-patro/design-tokens";
import { useTheme } from "@/lib/theme-context";

export type StudyInk = {
  ink: string;
  dim: string;
  faint: string;
  teal: string;
  amber: string;
  gold: string;
  card: string;
  border: string;
  isDark: boolean;
  /** CSS `color-mix(in srgb, a p%, b)`; `b` defaults to transparent. */
  mix: (a: string, percent: number, b?: string) => string;
};

export function useStudyInk(): StudyInk {
  const { isDark, colors } = useTheme();
  return useMemo(() => {
    const ink = isDark ? midnight.foam : colors.foreground;
    const muted = isDark ? midnight.foam : colors.mutedForeground;
    const card = isDark ? mix(midnight.card, 86, midnight.popover) : colors.card;
    return {
      ink,
      dim: withAlpha(muted, isDark ? 0.78 : 0.9),
      faint: withAlpha(muted, isDark ? 0.6 : 0.75),
      teal: brand.green,
      amber: brand.saffronBright,
      gold: brand.gold,
      card,
      border: isDark ? withAlpha(brand.gold, 0.18) : colors.border,
      isDark,
      mix: (a, percent, b) => (b ? mix(a, percent, b) : withAlpha(a, percent / 100)),
    };
  }, [isDark, colors]);
}

const TM_KEYS: Record<string, keyof StudyInk> = {
  "--tm-ink": "ink",
  "--tm-ink-dim": "dim",
  "--tm-ink-faint": "faint",
  "--tm-teal": "teal",
  "--tm-amber": "amber",
  "--tm-gold": "gold",
  "--tm-card": "card",
  "--tm-border": "border",
  "--hora-ink": "ink",
  "--hora-ink-dim": "dim",
  "--hora-ink-faint": "faint",
  "--hora-yellow": "gold",
  "--brand-gold": "gold",
};

/**
 * The website's colour strings — `var(--tm-teal)`,
 * `color-mix(in srgb, var(--tm-amber) 22%, transparent)` — as the app's
 * colours for the current theme, so ported drawing code can keep the
 * website's expressions and resolve them where it draws.
 */
export function useTm(): (css: string) => string {
  const ink = useStudyInk();
  return useMemo(() => {
    const one = (v: string): string => {
      const s = v.trim();
      const m = /^var\((--[\w-]+)\)$/.exec(s);
      if (m) {
        const key = TM_KEYS[m[1]!];
        return key ? (ink[key] as string) : ink.ink;
      }
      return s;
    };
    const hex = (c: string) => /^#[0-9a-f]{6}$/i.test(c);
    return (css: string) => {
      const m = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/.exec(css.trim());
      if (!m) return one(css);
      const a = one(m[1]!);
      const p = Number(m[2]);
      const b = m[3]!.trim();
      if (b === "transparent" || !hex(one(b))) return hex(a) ? withAlpha(a, p / 100) : a;
      return hex(a) ? mix(a, p, one(b)) : a;
    };
  }, [ink]);
}

/* Tailwind font sizes in stylesheet order: when a class string carries two,
   the later one in the stylesheet wins, as it does on the website. */
const FONT_SIZES: [string, number][] = [
  ["text-diagram-2xs", 8],
  ["text-diagram-xs", 10],
  ["text-diagram-sm", 12],
  ["text-xs", 12],
  ["text-sm", 14],
  ["text-base", 16],
  ["text-lg", 18],
  ["text-xl", 20],
];

export type SvgClassProps = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "round" | "butt" | "square";
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  letterSpacing?: number;
};

/**
 * The website's SVG class strings (`edMoonDisk`, `tmBand({ alt })`,
 * `"fill-current text-diagram-2xs opacity-55"` …) as react-native-svg props.
 *
 * The ported studies keep the very class constants the website draws with —
 * they live in `@vedic-patro/design-tokens/classes` — and spread
 * `{...sc(edMoonDisk)}` where the website wrote `className={edMoonDisk}`, so a
 * colour changed in one of those constants changes it in both apps.
 */
export function useSvgClass(): (cls: string | false | null | undefined) => SvgClassProps {
  const ink = useStudyInk();
  const tm = useTm();
  const { colors } = useTheme();
  return useMemo(() => {
    const cache = new Map<string, SvgClassProps>();
    const color = (raw: string): string => {
      let v = raw.replace(/_/g, " ").trim();
      v = v.replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/gi, "#$1$1$2$2$3$3");
      v = v.replace(/var\(--foreground\)/g, colors.foreground);
      v = v.replace(/var\(--tm-ring-soft\)/g, `color-mix(in srgb, ${brand.green} ${ink.isDark ? 16 : 14}%, transparent)`);
      v = v.replace(/var\(--tm-ring\)/g, `color-mix(in srgb, ${brand.green} ${ink.isDark ? 50 : 45}%, transparent)`);
      return tm(v);
    };
    const parse = (cls: string): SvgClassProps => {
      const out: SvgClassProps = {};
      let sizeRank = -1;
      for (const raw of cls.split(/\s+/)) {
        if (!raw) continue;
        let tok = raw;
        if (tok.startsWith("dark:")) {
          if (!ink.isDark) continue;
          tok = tok.slice(5);
        }
        let m: RegExpExecArray | null;
        if (tok === "fill-none") out.fill = "none";
        else if (tok === "fill-current") out.fill = "currentColor";
        else if (tok === "fill-foreground") out.fill = colors.foreground;
        else if (tok === "fill-white") out.fill = neutral.white;
        else if (tok === "stroke-foreground") out.stroke = colors.foreground;
        else if (tok === "stroke-white") out.stroke = neutral.white;
        else if (tok === "stroke-none") out.stroke = "none";
        else if (tok === "stroke-round") out.strokeLinecap = "round";
        else if ((m = /^fill-\[(.+)\]$/.exec(tok))) out.fill = color(m[1]!);
        else if ((m = /^stroke-\[(.+)\]$/.exec(tok))) {
          /* A bare number in the brackets is a stroke width; anything else is a colour. */
          if (/^\d+(\.\d+)?$/.test(m[1]!)) out.strokeWidth = Number(m[1]);
          else out.stroke = color(m[1]!);
        } else if ((m = /^\[stroke-width:([\d.]+)(px)?\]$/.exec(tok))) out.strokeWidth = Number(m[1]);
        else if ((m = /^\[stroke-dasharray:(.+)\]$/.exec(tok))) out.strokeDasharray = m[1]!.replace(/_/g, " ");
        else if ((m = /^opacity-\[([\d.]+)\]$/.exec(tok))) out.opacity = Number(m[1]);
        else if ((m = /^opacity-(\d+)$/.exec(tok))) out.opacity = Number(m[1]) / 100;
        else if (tok === "font-bold" || tok === "font-extrabold") out.fontFamily = STUDY_FONT.bold;
        else if (tok === "font-semibold" || tok === "font-medium") out.fontFamily = STUDY_FONT.semibold;
        else if (tok === "font-normal") out.fontFamily = STUDY_FONT.regular;
        else if (tok === "tracking-wide") out.letterSpacing = 0.4;
        else if (tok === "tracking-widest") out.letterSpacing = 1.6;
        else {
          const rank = FONT_SIZES.findIndex(([k]) => k === tok);
          if (rank >= 0 && rank > sizeRank) {
            sizeRank = rank;
            out.fontSize = FONT_SIZES[rank]![1];
          }
          /* Everything else (filters, transitions, font-num, cursor…) has no SVG prop here. */
        }
      }
      return out;
    };
    return (cls) => {
      if (!cls) return {};
      let hit = cache.get(cls);
      if (!hit) {
        hit = parse(cls);
        cache.set(cls, hit);
      }
      return hit;
    };
  }, [ink, tm, colors]);
}

/** SVG text faces: the website's `font: 700 13px var(--pn-font)` and friends. */
export const STUDY_FONT = {
  regular: fontFamily.native.regular,
  semibold: fontFamily.native.semibold,
  bold: fontFamily.native.bold,
} as const;

/**
 * react-native-svg has no reliable `dominant-baseline: central`, so centred
 * text is nudged down by a third of its size instead — close enough for the
 * Devanagari and digit labels these diagrams set.
 */
export function centralY(y: number, fontSize: number): number {
  return y + fontSize * 0.34;
}
