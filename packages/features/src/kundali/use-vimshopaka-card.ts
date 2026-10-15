/**
 * The vimshopaka bala card, shared by the website's and the app's
 * `components/kundali/VimshopakaCard.tsx`: the heading and 20-point intro,
 * one column per varga classification, one row per graha with a graded
 * score per classification, and the grade legend.
 */
import type { VimshopakaData, VimshopakaGrade } from "@vedic-patro/api-client";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

const PLANET_ORDER = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

export const VIMSHOPAKA_GRADES: VimshopakaGrade[] = ["full", "mediocre", "little", "incapable"];

const GRADE_LABEL: Record<VimshopakaGrade, string> = {
  full: "kundali.x.grade_full",
  mediocre: "kundali.x.grade_mediocre",
  little: "kundali.x.grade_little",
  incapable: "kundali.x.grade_incapable",
};

const GRADE_RANGE: Record<VimshopakaGrade, string> = {
  full: "15–20",
  mediocre: "10–15",
  little: "5–10",
  incapable: "<5",
};

export type VimshopakaScoreCell = { key: string; score: string; grade: VimshopakaGrade; gradeLabel: string } | { key: string; score: null };

export function useVimshopakaCard(data: VimshopakaData) {
  const { t, lang, digits } = useLocale();
  const classes = data.classifications;
  const planets = PLANET_ORDER.map((key) => data.planets.find((p) => p.key === key)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );

  return {
    title: t("kundali.vimshopaka_bala"),
    intro: bilingualText(
      lang,
      t("ui.kundali.x_0d730df7", { v0: digits(data.max_score) }),
      `Divisional strength on a 20-point scale (${data.max_score} = full) — a planet's capacity to deliver its results.`,
    ),
    grahaHeader: t("kundali.graha"),
    columns: classes.map((c) => ({ key: c.key, label: bilingualText(lang, c.label_ne, c.label) })),
    rows: planets.map((p) => {
      const graha = GRAHA_NAME[p.key as GrahaKey];
      return {
        key: p.key,
        name: graha ? bilingualText(lang, graha.ne, graha.en) : bilingualText(lang, p.name_ne, p.name),
        cells: classes.map((c): VimshopakaScoreCell => {
          const s = p.scores[c.key];
          return s
            ? { key: c.key, score: digits(s.score.toFixed(2)), grade: s.grade, gradeLabel: t(GRADE_LABEL[s.grade]) }
            : { key: c.key, score: null };
        }),
      };
    }),
    legend: VIMSHOPAKA_GRADES.map((g) => ({ grade: g, label: t(GRADE_LABEL[g]), range: GRADE_RANGE[g] })),
  };
}
