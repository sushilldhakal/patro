/**
 * Panchak patro page logic, shared by the website (`apps/web/src/pages/PanchakPatro.tsx`)
 * and the app (`apps/mobile/app/(tabs)/panchak-patro.tsx`).
 */
import { useMemo } from "react";
import { fetchPanchakYear, panchakKeys } from "@vedic-patro/api-client";
import { mapPanchakPeriod } from "@vedic-patro/read-models/panchanga/panchak/panchak-patro-data";
import { formatBrowsePatroYear } from "@vedic-patro/domain/calendar/patro-year-axis";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, useYearData, type PageStatus, type YearScope } from "../_shared";
import { spanText, useNowMs, type NowHeroView } from "../common/now-hero";
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
  /** In a panchak now (how far, how long left), or the next one. */
  hero?: NowHeroView;
  prohibited: { key: string; title: string; desc: string }[];
  varieties: { id: string; name: string; note: string }[];
};

export function usePanchakPage(scope: YearScope): PanchakPage {
  const { t, lang, digits } = useLocale();
  const query = useYearData(scope, { queryKey: panchakKeys.year, queryFn: fetchPanchakYear });
  const year = formatBrowsePatroYear(scope.era, scope.year, lang, digits);
  const periods = query.data?.periods;
  const cards = useMemo(() => (periods ?? []).map(mapPanchakPeriod).map((p, i) => panchakCardView(p, i, lang, t)), [periods, lang, t]);
  const nowMs = useNowMs();
  const hero = useMemo((): NowHeroView | undefined => {
    if (!periods?.length) return undefined;
    const spans = periods.map((p, i) => ({ start: Date.parse(p.start.iso), end: Date.parse(p.end.iso), card: cards[i]! }));
    const at = spans.findIndex((p) => nowMs >= p.start && nowMs < p.end);
    const ahead = spans.findIndex((p) => p.start > nowMs);
    const cur = at >= 0 ? spans[at]! : ahead >= 0 ? spans[ahead]! : undefined;
    if (!cur) return { eyebrow: t("now_hero.panchak_next"), tone: "plain", title: t("now_hero.panchak_none") };
    const on = at >= 0;
    const after = spans[(on ? at : ahead) + 1];
    return {
      eyebrow: t(on ? "now_hero.panchak_now" : "now_hero.panchak_next"),
      live: on,
      tone: on ? "bad" : "neutral",
      title: cur.card.variety ?? cur.card.title,
      subtitle: `${cur.card.start.bs} → ${cur.card.end.bs}`,
      progress: on ? (nowMs - cur.start) / (cur.end - cur.start || 1) : undefined,
      foot: {
        left: cur.card.duration,
        right: on ? t("now_hero.left", { time: spanText(cur.end - nowMs, t, digits) }) : t("now_hero.starts_in", { time: spanText(cur.start - nowMs, t, digits) }),
      },
      next: after ? { label: t("now_hero.then"), title: after.card.variety ?? after.card.title, detail: after.card.start.bs } : undefined,
    };
  }, [periods, cards, nowMs, t, digits]);
  return {
    hero,
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
