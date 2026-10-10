import type { GocharGraha } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  buildGocharBhavaHouses,
  formatGocharBsLabel,
} from "@/lib/dainikKranti/gochar-display";
import { D1Chart } from "@/components/kundali/D1Chart";
import { cn } from "@/lib/utils";
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
    <div className={cn("rounded-xl border border-border p-4", className)}>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-secondary" /> {t("dainik.transit_chart")}
      </h3>

      <div className="mb-3 space-y-2">
        <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
          <p className="font-mono text-base text-base leading-relaxed text-foreground">
            {papanshaLine || t("dainik.papashah")}
          </p>
        </div>
        {gapanshaLine ? (
          <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
            <p className="font-mono text-base text-base leading-relaxed text-foreground">
              {gapanshaLine}
            </p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm">{t("dainik.loading")}</p>
      ) : grahas.length === 0 ? (
        <p className="py-8 text-center text-sm">{t("dainik.no_details_available")}</p>
      ) : (
        <D1Chart houses={buildGocharBhavaHouses(grahas)} />
      )}

      {grahas.some((g) => g.is_retrograde || g.is_combust) ? (
        <GrahaStatusLegend className="mt-2" />
      ) : null}

      {dateLabel ? (
        <p className="mt-2 text-center text-sm">{bilingualText(lang, `${dateLabel} को स्थिति`, `Position on ${dateLabel}`)}</p>
      ) : null}
    </div>
  );
}
