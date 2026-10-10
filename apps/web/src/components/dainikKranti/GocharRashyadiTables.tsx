import type { GocharGraha } from "@/lib/api";
import { useTranslation } from "react-i18next";
import {
  mergeKundaliRashi,
  RASHYADI_PLANET_ABBREV,
  RASHYADI_PLANET_KEYS,
  RASHYADI_ROW_KEYS,
  RASHYADI_ROW_LABEL,
  rashyadiCellValue,
  type RashyadiRowKey,
  type RashyadiSegment,
} from "@/lib/dainikKranti/rashyadi";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale";

type GrahaRow = GocharGraha & { key: string };

type TableProps = {
  segment: RashyadiSegment;
  kundaliGrahas?: GrahaRow[];
  kundaliDateAd?: string | null;
  loading?: boolean;
  className?: string;
};

function rowLabelFor(segment: RashyadiSegment, key: RashyadiRowKey): string {
  if (key === "rashi") return segment.monthInitialLabel;
  return RASHYADI_ROW_LABEL[key];
}

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
      <div className={cn("flex h-full min-h-[280px] items-center justify-center rounded-xl border border-border p-4", className)}>
        <p className="text-sm">{t("dainik.loading")}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col overflow-x-auto rounded-xl border border-border bg-muted/15", className)}>
      <div className="border-b border-border bg-muted/40 px-3 py-2.5">
        <p className="text-sm font-semibold leading-snug text-secondary">{segment.versionNe}</p>
        <p className="mt-0.5 text-base text-base text-foreground">
          {segment.labelNe}
          {segment.bsDay != null ? (
            <span className="ml-1.5 text-sm">
              ({digits(segment.bsDay)}{t("dainik.text")})
            </span>
          ) : null}
        </p>
        {segment.moonRashiNe ? (
          <p className="mt-1 text-sm">
            {t("dainik.moon")}: <span className="text-base text-foreground">{segment.moonRashiNe}</span>
          </p>
        ) : null}
      </div>

      <table className="w-full flex-1 border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="w-10 px-1 py-2" />
            {RASHYADI_PLANET_KEYS.map((key) => (
              <th
                key={key}
                className="min-w-[2.25rem] px-1 py-2 text-center text-base font-bold text-foreground"
              >
                {RASHYADI_PLANET_ABBREV[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/60">
            <td className="px-1 py-2 text-center text-base font-semibold">
              {digits(segment.pakshaDayCount)}
            </td>
            {RASHYADI_PLANET_KEYS.map((key) => (
              <td key={`${segment.id}-hdr-${key}`} className="px-1 py-2" />
            ))}
          </tr>
          {RASHYADI_ROW_KEYS.map((rowKey) => (
            <tr key={rowKey} className="border-b border-border/60 last:border-0">
              <td className="whitespace-nowrap px-1 py-2 text-center text-sm font-semibold">
                {rowLabelFor(segment, rowKey)}
              </td>
              {RASHYADI_PLANET_KEYS.map((key) => {
                const row = planets[key];
                return (
                  <td
                    key={`${segment.id}-${key}-${rowKey}`}
                    className="px-1 py-2 text-center font-mono text-base text-base tabular-nums text-foreground"
                  >
                    {row ? rashyadiCellValue(row, rowKey) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border/60 px-3 py-1.5 text-xs">
        {t("dainik.deg_degree_ka_kala_vi_vikala_pr_prati_tatpara_tr_prati_")}
      </p>
    </div>
  );
}
