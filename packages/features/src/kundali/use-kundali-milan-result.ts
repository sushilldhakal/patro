/**
 * The ashtakuta match result, shared by the website's and the app's
 * `components/kundali/KundaliMilanResult.tsx`: the total and recommendation,
 * the partners, the nadi-dosha advisory, the dosha list, the eight kuta rows
 * (one open at a time, with its detail panel) and the notes.
 */
import { useState } from "react";
import type { AshtakutaResult, KutaRow } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";

const KUTA_LABEL: Record<KutaRow["id"], string> = {
  varna: "avakahada.col_varna",
  vashya: "kundali.vashya",
  tara: "kundali.tara",
  yoni: "avakahada.col_yoni",
  maitri: "kundali.x.kuta_maitri",
  gana: "kundali.gana",
  bhakuta: "kundali.x.kuta_bhakuta",
  nadi: "kundali.nadi",
};

function formatObtained(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function useKundaliMilanResult({ boyName, girlName, result }: { boyName: string; girlName: string; result: AshtakutaResult }) {
  const { t, lang } = useLocale();
  const en = lang === "en";
  const [openId, setOpenId] = useState<KutaRow["id"] | null>(null);

  const kutas = result.kutas.map((kuta) => {
    const label = KUTA_LABEL[kuta.id] ? t(KUTA_LABEL[kuta.id]!) : kuta.id;
    const open = openId === kuta.id;
    return {
      id: kuta.id,
      label,
      max: String(kuta.max),
      obtained: formatObtained(kuta.obtained),
      boyValue: kuta.boyValue,
      girlValue: kuta.girlValue,
      area: en ? kuta.areaOfLife : kuta.areaOfLifeNe,
      open,
      toggle: () => setOpenId(open ? null : kuta.id),
      detail: {
        title: `${label} ${t("kundali.x.kuta_details_heading")}`,
        pointsLabel: `${label} ${t("kundali.x.kuta_points_label")}:`,
        points: `${formatObtained(kuta.obtained)}/${kuta.max}`,
        people: [
          { who: boyName, value: kuta.boyValue },
          { who: girlName, value: kuta.girlValue },
        ],
        info: en ? kuta.info : kuta.infoNe,
      },
    };
  });

  const advisory = result.nadiDoshaAdvisory || result.nadiDoshaAdvisoryNe;
  return {
    recommendation: result.recommendation,
    recommendationLabel: en ? result.recommendationLabel : result.recommendationLabelNe,
    total: formatObtained(result.totalObtained),
    totalMax: ` / ${result.totalMax}`,
    partners: [
      { label: t("milan.boy"), name: boyName },
      { label: t("milan.girl"), name: girlName },
    ],
    advisory: advisory ? { title: t("milan.nadi_dosha_advisory_title"), text: en ? result.nadiDoshaAdvisory : result.nadiDoshaAdvisoryNe } : null,
    doshas: result.doshaAnalysis.map((d) => ({
      id: d.id,
      label: en ? d.labelEn : d.labelNe,
      /** The English name beside the Nepali one, in Nepali only. */
      alt: en ? null : `(${d.labelEn.replace(" Dosha", "")})`,
      present: d.present,
      verdict: d.present ? t("milan.dosha_present") : t("milan.dosha_absent"),
    })),
    columns: [t("milan.guna"), t("kundali.x.milan_col_max"), t("kundali.x.milan_col_obtained"), boyName, girlName, t("kundali.x.milan_col_area_of_life")],
    kutas,
    footnote: `*${t("kundali.x.milan_points_footnote")}`,
    notes: en ? result.notes : result.notesNe,
    copy: {
      totalGuna: t("milan.total_guna"),
      guna: t("milan.guna"),
      doshaTitle: t("milan.dosha_analysis_title"),
      notesTitle: t("milan.notes_title"),
    },
  };
}
