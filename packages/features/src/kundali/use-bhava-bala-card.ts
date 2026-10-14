/**
 * The bhava bala card, shared by the website's and the app's
 * `components/kundali/BhavaBalaCard.tsx`: the selected house (shared with the
 * chart), the heading and method line, the strongest / weakest house tiles and
 * every row of the house-strength table.
 */
import { useState } from "react";
import type { BhavaBalaData, BhavaBalaHouse } from "@vedic-patro/api-client";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { fmtNum } from "@vedic-patro/domain/kundali/bhava-bala-chart";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

/** The house the chart and table highlight; starts on the strongest house. */
export function useBhavaBalaSelection(data: BhavaBalaData) {
  const [selectedHouse, setSelectedHouse] = useState(data.strongest.house);
  return { selectedHouse, selectHouse: setSelectedHouse };
}

export type BhavaBalaTableRow = {
  house: number;
  label: string;
  lordKey: string;
  lordName: string;
  bhavadhipati: string;
  disha: string;
  drishti: string;
  totalPinda: string;
  percent: string;
};

const COLUMN_KEYS = [
  ["house", "kundali.house"],
  ["lord", "kundali.lord"],
  ["bhavadhipati", "kundali.bhavadhipati"],
  ["disha", "kundali.disha"],
  ["drishti", "kundali.drishti"],
  ["total_pinda", "kundali.total_pinda"],
  ["bhava_pct", "kundali.bhava"],
] as const;

export function useBhavaBalaTable(data: BhavaBalaData) {
  const { t, lang, digits } = useLocale();

  const houseLabel = (house: number) => bilingualText(lang, t("ui.kundali.x_f08204a5", { v0: digits(house) }), `House ${house}`);
  const lordName = (key: string) => {
    const g = GRAHA_NAME[key as GrahaKey];
    return g ? bilingualText(lang, g.ne, g.en) : key;
  };
  const percent = (h: BhavaBalaHouse) => `${digits(h.percent.toFixed(1))}%`;
  const summary = (label: string, h: BhavaBalaHouse) => ({
    label,
    house: h.house,
    name: houseLabel(h.house),
    lordLabel: t("kundali.lord"),
    lordName: lordName(h.lordKey),
    percent: percent(h),
  });

  return {
    title: t("kundali.bhava_bala_house_strength_virupas"),
    intro: bilingualText(
      lang,
      t("ui.kundali.x_cf46d965", { v0: digits(data.referenceVirupas) }),
      `Bhavadhipati (lord's Shadbala) + Bhava Disha + Bhava Drishti. Whole-sign houses; ${data.referenceVirupas} virupas = 100%.`,
    ),
    strongest: summary(t("kundali.strongest_house"), data.strongest),
    weakest: summary(t("kundali.weakest_house"), data.weakest),
    columns: COLUMN_KEYS.map(([key, label]) => ({ key, label: t(label) })),
    rows: data.houses.map(
      (h): BhavaBalaTableRow => ({
        house: h.house,
        label: houseLabel(h.house),
        lordKey: h.lordKey,
        lordName: lordName(h.lordKey),
        bhavadhipati: fmtNum(h.bhavadhipati, digits),
        disha: fmtNum(h.disha, digits),
        drishti: fmtNum(h.drishti, digits),
        totalPinda: fmtNum(h.totalPinda, digits),
        percent: percent(h),
      }),
    ),
  };
}
