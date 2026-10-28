/**
 * Graha asta and graha vakri page logic, shared by the website
 * (`apps/web/src/pages/GrahaAsta.tsx`, `GrahaVakri.tsx`) and the app
 * (`apps/mobile/app/(tabs)/panchanga/graha-asta.tsx`, `graha-vakri.tsx`).
 */
import { fetchGrahaAstaYear, fetchGrahaVakriYear, grahaDetailKeys } from "@vedic-patro/api-client";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, useYearData, type PageStatus, type YearScope } from "../_shared";
import {
  ASTA_ORDER,
  astaPeriodView,
  groupByGraha,
  VAKRI_ORDER,
  vakriEventView,
  type AstaPeriodView,
  type VakriEventView,
} from "./model";
import { astaOverview, vakriOverview, yearRange, type YearOverview } from "./overview";

export * from "./model";
export * from "./overview";

export type GrahaGroup<Item> = {
  graha: string;
  name: string;
  /** A line under the name (the Moon's "tara asta"). */
  note?: string;
  count: string;
  items: Item[];
  /** Shown in place of the items when the graha has none this year. */
  empty: string;
};

export type GrahaPage<Item> = {
  copy: { titleKey: string; blurbKey: string; title: string; blurb: string };
  /** Key for the long description block under the cards. */
  descriptionPageId: "graha-asta" | "graha-vakri";
  status: PageStatus;
  gregorianRange?: { start: string; end: string };
  groups: GrahaGroup<Item>[];
  /** The year at a glance: a strip per graha, today marked. */
  overview?: YearOverview;
};

function useCopy(page: "graha-asta" | "graha-vakri") {
  const { t } = useLocale();
  const titleKey = `sidebar_nav.items.${page}.label`;
  const blurbKey = `sidebar_nav.items.${page}.blurb`;
  return { titleKey, blurbKey, title: t(titleKey), blurb: t(blurbKey) };
}

export function useGrahaAstaPage(scope: YearScope): GrahaPage<AstaPeriodView> {
  const { t, lang, digits } = useLocale();
  const query = useYearData(scope, { queryKey: grahaDetailKeys.asta, queryFn: fetchGrahaAstaYear });
  const groups = groupByGraha(ASTA_ORDER, query.data?.periods ?? []);
  const range = yearRange(query.data as Parameters<typeof yearRange>[0]);
  return {
    overview: range ? astaOverview(ASTA_ORDER, query.data?.periods ?? [], range, lang, t, scope.era) : undefined,
    copy: useCopy("graha-asta"),
    descriptionPageId: "graha-asta",
    status: statusOf(query),
    gregorianRange: query.data?.gregorian_range,
    groups: [...groups].map(([graha, periods]) => ({
      graha,
      name: t(`grahas.${graha}`, { defaultValue: graha }),
      note: graha === "moon" ? t("graha_pages.asta.tara_asta") : undefined,
      count: periods.length ? t("graha_pages.asta.times", { count: digits(periods.length) }) : t("graha_pages.asta.none"),
      items: periods.map((p) => astaPeriodView(p, lang, t, scope.era)),
      empty: t("graha_pages.asta.no_asta_year"),
    })),
  };
}

export function useGrahaVakriPage(scope: YearScope): GrahaPage<VakriEventView> {
  const { t, lang, digits } = useLocale();
  const query = useYearData(scope, { queryKey: grahaDetailKeys.vakri, queryFn: fetchGrahaVakriYear });
  const groups = groupByGraha(VAKRI_ORDER, query.data?.events ?? []);
  const range = yearRange(query.data as Parameters<typeof yearRange>[0]);
  return {
    overview: range ? vakriOverview(VAKRI_ORDER, query.data?.events ?? [], range, lang, t, scope.era) : undefined,
    copy: useCopy("graha-vakri"),
    descriptionPageId: "graha-vakri",
    status: statusOf(query),
    gregorianRange: query.data?.gregorian_range,
    groups: [...groups].map(([graha, events]) => ({
      graha,
      name: t(`grahas.${graha}`, { defaultValue: graha }),
      count: events.length ? t("graha_pages.vakri.stations", { count: digits(events.length) }) : t("graha_pages.vakri.no_stations"),
      items: events.map((ev) => vakriEventView(ev, lang, t)),
      empty: t("graha_pages.vakri.no_vakri_year"),
    })),
  };
}
