import type { ReactNode } from "react";
import { useGrahaStatusBadges, useGrahaStatusLabels } from "@vedic-patro/features/graha";
import { showAsta, showVakri } from "@vedic-patro/domain/jyotish/graha-status";
import { cn } from "@vedic-patro/design-tokens/cn";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { Icon } from "@vedic-patro/ui";
import { flameIcon, rotateCcwIcon } from "../icons";
import { FLAME_PATH, ROTATE_CCW_PATHS } from "../status-marks";

export type GrahaStatusBadgesProps = {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  className?: string;
  size?: number;
};

export function GrahaStatusBadges({ planetKey, isRetrograde, isCombust, className, size = 14 }: GrahaStatusBadgesProps) {
  const { vakri, asta, any, labels } = useGrahaStatusBadges({ planetKey, isRetrograde, isCombust });
  if (!any) return null;
  return (
    <span className={cn(grahaClasses.statusRow, "inline-flex", className)}>
      {vakri ? (
        <span className="inline-flex" title={labels.retrograde} aria-label={labels.retrograde}>
          <Icon node={rotateCcwIcon} size={size} tone="secondary" strokeWidth={2.5} />
        </span>
      ) : null}
      {asta ? (
        <span className="inline-flex" title={labels.combust} aria-label={labels.combust}>
          <Icon node={flameIcon} size={size} tone="destructive" strokeWidth={2.5} />
        </span>
      ) : null}
    </span>
  );
}

export type GrahaStatusMarksProps = {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  x: number;
  y: number;
  size?: number;
  vakriColor?: string;
  astaColor?: string;
};

export function GrahaStatusMarksSvg({ planetKey, isRetrograde, isCombust, x, y, size = 9 }: GrahaStatusMarksProps) {
  const vakri = showVakri(planetKey, isRetrograde);
  const asta = showAsta(planetKey, isCombust);
  if (!vakri && !asta) return null;
  const s = size / 24;
  const gap = size + 0.75;
  const marks: ReactNode[] = [];
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

export function GrahaStatusLegend({ className }: { className?: string }) {
  const labels = useGrahaStatusLabels();
  return (
    <p className={cn(grahaClasses.statusLegend, grahaClasses.statusLegendText, "flex", className)}>
      <span className={cn(grahaClasses.statusLegendItem, "inline-flex")}>
        <Icon node={rotateCcwIcon} size={14} tone="secondary" />
        {labels.retrograde}
      </span>
      <span className={cn(grahaClasses.statusLegendItem, "inline-flex")}>
        <Icon node={flameIcon} size={14} tone="destructive" />
        {labels.combust}
      </span>
    </p>
  );
}
