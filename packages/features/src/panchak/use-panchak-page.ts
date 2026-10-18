/**
 * Panchak patro page logic, shared by the website (`apps/web/src/pages/PanchakPatro.tsx`)
 * and the app (`apps/mobile/app/(tabs)/panchak-patro.tsx`).
 */
import { useMemo } from "react";
import { fetchPanchakYear, panchakKeys } from "@vedic-patro/api-client";
import { mapPanchakPeriod } from "@vedic-patro/read-models/panchak/panchak-patro-data";
import { formatBrowsePatroYear } from "@vedic-patro/domain/patro-year-axis";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, useYearData, type PageStatus, type YearScope } from "../_shared";
import { PANCHAK_PROHIBITED, panchakCardView, panchakVarieties, type PanchakCardView } from "./model";

export * from "./model";

export type PanchakPage = {
  copy: {
    title: string;
    subtitle: string;
    intro: string;
    loading: string;
    error: string;
    noData: string;
    periodsTitle: string;
    prohibitedTitle: string;
    learnTitle: string;
    duration: string;
    backHome: string;
    typesTitle: string;
  };
  learn: { title: string; body?: string }[];
  status: PageStatus;
  gregorianRange?: { start: string; end: string };
  cards: PanchakCardView[];
  prohibited: { key: string; title: string; desc: string }[];
  varieties: { id: string; name: string; note: string }[];
};

export function usePanchakPage(scope: YearScope): PanchakPage {
  const { t, lang, digits } = useLocale();
  const query = useYearData(scope, { queryKey: panchakKeys.year, queryFn: fetchPanchakYear });
  const year = formatBrowsePatroYear(scope.era, scope.year, lang, digits);
  const periods = query.data?.periods;
  const cards = useMemo(() => (periods ?? []).map(mapPanchakPeriod).map((p, i) => panchakCardView(p, i, lang, t)), [periods, lang, t]);
  return {
    copy: {
      title: t("panchak.title", { year }),
      subtitle: t("panchak.subtitle"),
      intro: t("panchak.intro"),
      loading: t("common.loading"),
      error: t("common.load_error"),
      noData: t("panchak.no_data", { year }),
      periodsTitle: t("panchak.periods_title", { year }),
      prohibitedTitle: t("panchak.prohibited_title"),
      learnTitle: t("panchak.learn_title"),
      duration: t("panchak.duration"),
      backHome: t("panchak.back_home"),
      typesTitle: t("panchak.types_title"),
    },
    learn: [
      { title: t("panchak.what_title"), body: t("panchak.what_body") },
      { title: t("panchak.rahita_title"), body: t("panchak.rahita_body") },
    ],
    status: statusOf(query),
    gregorianRange: query.data?.gregorian_range,
    cards,
    prohibited: PANCHAK_PROHIBITED.map((k) => ({ key: k, title: t(`panchak.prohibited.${k}`), desc: t(`panchak.prohibited.${k}_desc`) })),
    varieties: panchakVarieties(lang),
  };
}
