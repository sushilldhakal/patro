/**
 * A dainik kranti day's expand panel, shared by the website's and the app's
 * `components/dainikKranti/DayPatroExpandPanel.tsx`: the lagna / graha / notes
 * tabs (one at a time on narrow screens), the twelve lagna start cells, the
 * planet cells at sunrise, the notes, and copy.
 */
import { useState } from "react";
import {
  PATRO_PLANET_KEYS,
  type CalcNote,
  type GrahaSpashtaRow,
  type LagnaMatrixRow,
} from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";
import { isLateLagnaTime, patroPlanetLabel, rashiColumns, type PatroPlanetKey } from "./patro-cells";

export type DayPatroExpandTab = "lagna" | "graha" | "notes";

export function useDayPatroExpand({
  lagna,
  graha,
  notes = [],
}: {
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
}) {
  const { t, lang } = useLocale();
  const isEn = lang === "en";
  const tabIds = [lagna && "lagna", graha && "graha", notes.length > 0 && "notes"].filter(Boolean) as DayPatroExpandTab[];
  const tabLabel: Record<DayPatroExpandTab, string> = {
    lagna: t("kundali.report.meta_lagna"),
    graha: t("panchanga.day_cycle.planets"),
    notes: t("ui.common.notes"),
  };
  const [picked, setPicked] = useState<DayPatroExpandTab | undefined>(tabIds[0]);
  const tab = picked && tabIds.includes(picked) ? picked : tabIds[0];

  return {
    tab,
    /** Only worth showing (on narrow screens) when there is more than one section. */
    hasTabs: tabIds.length > 1,
    tabs: tabIds.map((id) => ({ id, label: tabLabel[id], active: tab === id, select: () => setPicked(id) })),
    lagna: lagna
      ? {
          title: t("dainik.daily_lagna_start"),
          cells: rashiColumns(lang).map((r) => {
            const value = lagna.times[r.number];
            return { key: r.ne, rashiNe: r.ne, number: r.number, name: r.label, time: value ?? "—", late: isLateLagnaTime(value) };
          }),
        }
      : null,
    graha: graha
      ? {
          title: t("dainik.planetary_positions_at_sunrise"),
          cells: PATRO_PLANET_KEYS.flatMap((key: PatroPlanetKey) => {
            const cell = graha.planets[key];
            if (!cell) return [];
            return [
              {
                key,
                name: patroPlanetLabel(lang, key),
                rashi: isEn ? (cell.rashiEn ?? cell.rashiNe) : cell.rashiNe,
                coords: cell.coords,
                isRetrograde: cell.isRetrograde,
                isCombust: cell.isCombust,
              },
            ];
          }),
          solar: { deshaantar: graha.deshaantar, akshamsha: graha.akshamsha, belaantar: graha.belaantar },
        }
      : null,
    notes: notes.map((n) => ({ key: `${n.kind}-${n.text}`, text: bilingualText(lang, n.text, n.textEn ?? n.text) })),
  };
}
