import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { SaitSuitability } from "@/lib/api";
import { SUITABILITY_STYLE } from "@/lib/sait-suitability";

/** A small verdict chip shown on a personalised day. */
export function SuitabilityBadge({
  suitability,
  className,
}: {
  suitability: SaitSuitability;
  className?: string;
}) {
  const { lang } = useLocale();
  const s = SUITABILITY_STYLE[suitability];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        s.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {bilingualText(lang, s.ne, s.en)}
    </span>
  );
}

/** Legend + optional counts, shown once a profile is chosen. */
export function SuitabilityLegend({
  counts,
}: {
  counts?: { favourable: number; neutral: number; avoid: number } | null;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const order: SaitSuitability[] = ["favourable", "neutral", "avoid"];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        {t("sait.for_your_profile")}
      </span>
      {order.map((k) => {
        const s = SUITABILITY_STYLE[k];
        return (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
            {bilingualText(lang, s.ne, s.en)}
            {counts ? (
              <span className="font-num tabular-nums">· {digits(counts[k])}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
