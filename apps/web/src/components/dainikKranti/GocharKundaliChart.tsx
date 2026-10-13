import type { GocharGraha } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  buildGocharBhavaHouses,
  formatGocharBsLabel,
} from "@vedic-patro/domain/dainikKranti/gochar-display";
import { D1Chart } from "@/components/kundali/D1Chart";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { Sparkles } from "lucide-react";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { useLocale, bilingualText } from "@/i18n/locale";

type GrahaRow = GocharGraha & { key: string };

type Props = {
  grahas: GrahaRow[];
  /** पापाशाःसू०७, म.६, श.१०, रा.९के.३ */
  papanshaLine?: string;
  /** गा.पाशाः१५सू८, १८म.७, … */
  gapanshaLine?: string;
  dateBs?: string | null;
  dateAd?: string | null;
  loading?: boolean;
  className?: string;
};

export function GocharKundaliChart({
  grahas,
  papanshaLine = "",
  gapanshaLine = "",
  dateBs,
  dateAd,
  loading,
  className,
}: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const dateLabel = formatGocharBsLabel(dateBs, dateAd);

  return (
    <div className={cn(dainikKrantiClasses.chartCard, className)}>
      <h3 className={cn(dainikKrantiClasses.chartTitle, dainikKrantiClasses.chartTitleText)}>
        <Sparkles className="h-4 w-4 text-secondary" /> {t("dainik.transit_chart")}
      </h3>

      <div className={cn(dainikKrantiClasses.chartLines, "space-y-2")}>
        <div className={dainikKrantiClasses.chartLine}>
          <p className={dainikKrantiClasses.chartLineText}>
            {papanshaLine || t("dainik.papashah")}
          </p>
        </div>
        {gapanshaLine ? (
          <div className={dainikKrantiClasses.chartLine}>
            <p className={dainikKrantiClasses.chartLineText}>
              {gapanshaLine}
            </p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className={dainikKrantiClasses.chartState}>{t("dainik.loading")}</p>
      ) : grahas.length === 0 ? (
        <p className={dainikKrantiClasses.chartState}>{t("dainik.no_details_available")}</p>
      ) : (
        <D1Chart houses={buildGocharBhavaHouses(grahas)} />
      )}

      {grahas.some((g) => g.is_retrograde || g.is_combust) ? (
        <GrahaStatusLegend className="mt-2" />
      ) : null}

      {dateLabel ? (
        <p className={dainikKrantiClasses.chartDate}>{bilingualText(lang, `${dateLabel} को स्थिति`, `Position on ${dateLabel}`)}</p>
      ) : null}
    </div>
  );
}
