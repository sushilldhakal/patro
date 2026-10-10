import { Flame, RotateCcw } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { showAsta, showVakri } from "@/lib/graha-status";

type Props = {
  /** Graha key ("sun" … "ketu"); gates which markers are allowed. */
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  className?: string;
  /** Icon size in px (default 14). */
  size?: number;
};

/**
 * Icon-only वक्री / अस्त status markers for a graha, shared by every planet
 * readout so the icons stay consistent — RotateCcw (secondary) for वक्री,
 * Flame (destructive) for अस्त. The Nepali/English word only appears in the
 * hover tooltip, never as inline text.
 */
export function GrahaStatusBadges({ planetKey, isRetrograde, isCombust, className, size = 14 }: Props) {
  const { lang } = useLocale();
  const vakri = showVakri(planetKey, isRetrograde);
  const asta = showAsta(planetKey, isCombust);
  if (!vakri && !asta) return null;
  const px = `${size}px`;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {vakri && (
        <span className="inline-flex" title={bilingualText(lang, "वक्री", "Retrograde")} aria-label={bilingualText(lang, "वक्री", "Retrograde")}>
          <RotateCcw className="text-secondary" style={{ width: px, height: px }} strokeWidth={2.5} aria-hidden />
        </span>
      )}
      {asta && (
        <span className="inline-flex" title={bilingualText(lang, "अस्त", "Combust")} aria-label={bilingualText(lang, "अस्त", "Combust")}>
          <Flame className="text-destructive" style={{ width: px, height: px }} strokeWidth={2.5} aria-hidden />
        </span>
      )}
    </span>
  );
}

// Lucide icon path data (24×24 viewBox), embedded so the same marks can be
// drawn inside SVG charts where a React <svg> icon can't be nested.
const ROTATE_CCW_PATHS = ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5"];
const FLAME_PATH =
  "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

/**
 * वक्री / अस्त marks as inline SVG, for the kundali/gochar charts. Renders the
 * lucide RotateCcw + Flame glyphs (not letters) at (x, y), sized to `size`.
 */
export function GrahaStatusMarksSvg({
  planetKey,
  isRetrograde,
  isCombust,
  x,
  y,
  size = 9,
}: {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  x: number;
  y: number;
  size?: number;
}) {
  const vakri = showVakri(planetKey, isRetrograde);
  const asta = showAsta(planetKey, isCombust);
  if (!vakri && !asta) return null;
  const s = size / 24;
  const gap = size + 0.75;
  const marks: React.ReactNode[] = [];
  let offset = 0;
  if (vakri) {
    marks.push(
      <g key="v" transform={`translate(${x + offset}, ${y}) scale(${s})`} className="stroke-secondary" fill="none" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        {ROTATE_CCW_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>,
    );
    offset += gap;
  }
  if (asta) {
    marks.push(
      <g key="a" transform={`translate(${x + offset}, ${y}) scale(${s})`} className="stroke-destructive" fill="none" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        <path d={FLAME_PATH} />
      </g>,
    );
  }
  return <>{marks}</>;
}

/** Compact icon key explaining the chart/list markers. */
export function GrahaStatusLegend({ className }: { className?: string }) {
  const { lang } = useLocale();
  return (
    <p
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <RotateCcw className="size-3.5 text-secondary" aria-hidden />
        {bilingualText(lang, "वक्री", "Retrograde")}
      </span>
      <span className="inline-flex items-center gap-1">
        <Flame className="size-3.5 text-destructive" aria-hidden />
        {bilingualText(lang, "अस्त", "Combust")}
      </span>
    </p>
  );
}
