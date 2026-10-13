import type { GocharGraha } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  mergeKundaliRashi,
  RASHYADI_PLANET_ABBREV,
  RASHYADI_PLANET_KEYS,
  RASHYADI_ROW_KEYS,
  rashyadiCellValue,
  type RashyadiSegment,
} from "@vedic-patro/domain/dainikKranti/rashyadi";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale } from "@/i18n/locale";
import { rowLabelFor } from "@vedic-patro/domain/dainikKranti/gochar-rows";

type GrahaRow = GocharGraha & { key: string };

type TableProps = {
  segment: RashyadiSegment;
  kundaliGrahas?: GrahaRow[];
  kundaliDateAd?: string | null;
  loading?: boolean;
  className?: string;
};

export function GocharRashyadiTable({
  segment,
  kundaliGrahas,
  kundaliDateAd,
  loading,
  className,
}: TableProps) {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const planets =
    kundaliGrahas &&
    kundaliDateAd &&
    segment.anchorDateAd === kundaliDateAd &&
    segment.anchor === "start"
      ? mergeKundaliRashi(segment.planets, kundaliGrahas)
      : segment.planets;

  if (loading) {
    return (
      <div className={cn(dainikKrantiClasses.rashyadiLoading, "flex h-full min-h-[280px]", className)}>
        <p className="text-sm">{t("dainik.loading")}</p>
      </div>
    );
  }

  return (
    <div className={cn(dainikKrantiClasses.rashyadiCard, "h-full overflow-x-auto", className)}>
      <div className={dainikKrantiClasses.rashyadiHead}>
        <p className={dainikKrantiClasses.rashyadiVersion}>{segment.versionNe}</p>
        <p className={dainikKrantiClasses.rashyadiLabel}>
          {segment.labelNe}
          {segment.bsDay != null ? (
            <span className={dainikKrantiClasses.rashyadiDay}>
              ({digits(segment.bsDay)}{t("dainik.text")})
            </span>
          ) : null}
        </p>
        {segment.moonRashiNe ? (
          <p className={dainikKrantiClasses.rashyadiMoon}>
            {t("dainik.moon")}: <span className={dainikKrantiClasses.rashyadiMoonValue}>{segment.moonRashiNe}</span>
          </p>
        ) : null}
      </div>

      <table className="w-full flex-1 border-collapse text-sm">
        <thead>
          <tr className={dainikKrantiClasses.rashyadiHeadRow}>
            <th className="w-10 px-1 py-2" />
            {RASHYADI_PLANET_KEYS.map((key) => (
              <th
                key={key}
                className={cn(dainikKrantiClasses.rashyadiTh, "min-w-[2.25rem]")}
              >
                {RASHYADI_PLANET_ABBREV[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className={dainikKrantiClasses.rashyadiRow}>
            <td className={dainikKrantiClasses.rashyadiTdPaksha}>
              {digits(segment.pakshaDayCount)}
            </td>
            {RASHYADI_PLANET_KEYS.map((key) => (
              <td key={`${segment.id}-hdr-${key}`} className="px-1 py-2" />
            ))}
          </tr>
          {RASHYADI_ROW_KEYS.map((rowKey) => (
            <tr key={rowKey} className={cn(dainikKrantiClasses.rashyadiRow, "last:border-0")}>
              <td className={cn(dainikKrantiClasses.rashyadiTdLabel, "whitespace-nowrap")}>
                {rowLabelFor(segment, rowKey)}
              </td>
              {RASHYADI_PLANET_KEYS.map((key) => {
                const row = planets[key];
                return (
                  <td
                    key={`${segment.id}-${key}-${rowKey}`}
                    className={dainikKrantiClasses.rashyadiTdValue}
                  >
                    {row ? rashyadiCellValue(row, rowKey) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={dainikKrantiClasses.rashyadiFoot}>
        {t("dainik.deg_degree_ka_kala_vi_vikala_pr_prati_tatpara_tr_prati_")}
      </p>
    </div>
  );
}
