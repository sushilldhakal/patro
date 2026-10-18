/**
 * One dainik kranti rashyadi table per paksha segment, shared by the
 * website's and the app's `components/dainikKranti/GocharRashyadiTables.tsx`:
 * the header lines, the planet columns, row labels and cells (the kundali's
 * rashi merged in on its own day), and copy.
 */
import type { GocharGraha } from "@vedic-patro/api-client";
import { rowLabelFor } from "@vedic-patro/domain/jyotish/dainikKranti/gochar-rows";
import {
  mergeKundaliRashi,
  RASHYADI_PLANET_ABBREV,
  RASHYADI_PLANET_KEYS,
  RASHYADI_ROW_KEYS,
  rashyadiCellValue,
  type RashyadiSegment,
} from "@vedic-patro/read-models/jyotish/dainikKranti/rashyadi";
import { useLocale } from "@vedic-patro/i18n/react";

export type GocharGrahaRow = GocharGraha & { key: string };

export function useGocharRashyadiTable({
  segment,
  kundaliGrahas,
  kundaliDateAd,
}: {
  segment: RashyadiSegment;
  kundaliGrahas?: GocharGrahaRow[];
  kundaliDateAd?: string | null;
}) {
  const { t, digits } = useLocale();
  const planets =
    kundaliGrahas && kundaliDateAd && segment.anchorDateAd === kundaliDateAd && segment.anchor === "start"
      ? mergeKundaliRashi(segment.planets, kundaliGrahas)
      : segment.planets;
  return {
    loadingText: t("dainik.loading"),
    version: segment.versionNe,
    label: segment.labelNe,
    /** "(12 gate)" after the label, when the segment starts on a known day. */
    day: segment.bsDay != null ? `(${digits(segment.bsDay)}${t("dainik.text")})` : null,
    moon: segment.moonRashiNe ? { label: `${t("dainik.moon")}:`, value: segment.moonRashiNe } : null,
    pakshaDays: digits(segment.pakshaDayCount),
    columns: RASHYADI_PLANET_KEYS.map((key) => ({ key, label: RASHYADI_PLANET_ABBREV[key] })),
    rows: RASHYADI_ROW_KEYS.map((rowKey) => ({
      key: rowKey,
      label: rowLabelFor(segment, rowKey),
      cells: RASHYADI_PLANET_KEYS.map((key) => {
        const row = planets[key];
        return { key: `${segment.id}-${key}-${rowKey}`, value: row ? rashyadiCellValue(row, rowKey) : "—" };
      }),
    })),
    footnote: t("dainik.deg_degree_ka_kala_vi_vikala_pr_prati_tatpara_tr_prati_"),
  };
}
