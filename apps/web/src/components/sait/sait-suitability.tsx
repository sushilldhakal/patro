import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import type { SaitSuitability } from "@/lib/api";
import { SUITABILITY_STYLE } from "@vedic-patro/domain/sait-suitability";

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
        saitClasses.badge,
        "inline-flex",
        saitClasses.badgeText,
        saitClasses.suitability[suitability].box,
        saitClasses.suitability[suitability].text,
        className,
      )}
    >
      <span className={cn(saitClasses.badgeDot, saitClasses.suitability[suitability].dot)} aria-hidden />
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
    <div className={cn(saitClasses.legend, saitClasses.legendText)}>
      <span className={saitClasses.legendTitle}>
        {t("sait.for_your_profile")}
      </span>
      {order.map((k) => {
        const s = SUITABILITY_STYLE[k];
        return (
          <span key={k} className={cn(saitClasses.legendItem, "inline-flex")}>
            <span className={cn(saitClasses.legendDot, saitClasses.suitability[k].dot)} aria-hidden />
            {bilingualText(lang, s.ne, s.en)}
            {counts ? (
              <span className={saitClasses.legendCount}>· {digits(counts[k])}</span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
