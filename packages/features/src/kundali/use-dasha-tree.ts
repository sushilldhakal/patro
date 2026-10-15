/**
 * The dasha timeline, shared by the website's and the app's
 * `components/kundali/DashaTree.tsx`: the running chain from mahadasha down
 * (each level fetched lazily from /kundali/dasha/expand when the tree did not
 * embed it), the yogini cycle chip, the full-timeline range, and one node of
 * the expandable explorer with its own children. Each app draws the rows.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashaExpandKeys, fetchDashaChildren, type DashaSystem, type DashaTreeNode } from "@vedic-patro/api-client";
import { formatZonedAdMoment, formatZonedBsMoment } from "@vedic-patro/domain/bs-calendar";
import {
  DASHA_LORD_EN,
  DASHA_LORD_NE,
  breakdownDashaDuration,
  dashaMahadashaGrahaKey,
  formatDashaDuration,
  formatDashaDurationParts,
  type DashaLord,
} from "@vedic-patro/domain/dasha";
import { toSpan, type SpanWithChildren } from "@vedic-patro/domain/kundali/dasha-tree";
import { useLocale } from "@vedic-patro/i18n/react";

/** Catalogue keys, outermost dasha level first. */
const LEVEL_LABELS = [
  "kundali.maha_dasha",
  "kundali.x.dasha_level_antar",
  "kundali.x.dasha_level_pratyantar",
  "kundali.x.dasha_level_sukshma",
  "kundali.x.dasha_level_prana",
] as const;

export const DASHA_MAX_LEVEL = LEVEL_LABELS.length - 1;

const DURATION_COLS = ["kundali.x.duration_bs", "kundali.x.duration_years", "kundali.x.duration_months", "holidays.col_days", "kundali.yoga"] as const;

const isRunning = (span: SpanWithChildren | undefined, now: number) => span != null && span.start.getTime() <= now && now < span.end.getTime();
const findRunning = (spans: SpanWithChildren[] | undefined, now: number) => spans?.find((s) => isRunning(s, now));
const progressOf = (span: SpanWithChildren, now: number) => {
  const total = span.end.getTime() - span.start.getTime();
  return total > 0 ? Math.min(100, Math.max(0, ((now - span.start.getTime()) / total) * 100)) : 0;
};

function useDashaFormat(timeZone?: string) {
  const { t, lang: rawLang, digits } = useLocale();
  const lang: "ne" | "en" = rawLang === "en" ? "en" : "ne";
  /** A BS year means nothing in English — English shows the Gregorian date instead. */
  const moment = (date: Date) =>
    lang === "en" ? formatZonedAdMoment(date, { lang, timeZone, digits }) : formatZonedBsMoment(date, { lang, timeZone, digits });
  const lordName = (span: SpanWithChildren, system: DashaSystem) => {
    if (system === "yogini") return span.lordNe;
    const lord = span.lord as DashaLord;
    return (lang === "en" ? DASHA_LORD_EN[lord] : DASHA_LORD_NE[lord]) ?? span.lordNe;
  };
  return { t, lang, digits, moment, lordName };
}

/**
 * Children of one period — fetched only when the API did not embed them,
 * cached once fetched. Called a fixed number of times per render (the rules
 * of hooks forbid a variable-length loop of queries).
 */
function useChildren(parent: SpanWithChildren | undefined, system: DashaSystem, enabled: boolean) {
  const startIso = parent?.start.toISOString() ?? "";
  const endIso = parent?.end.toISOString() ?? "";
  const q = useQuery({
    queryKey: dashaExpandKeys.span(parent?.lord ?? "", startIso, endIso, system),
    queryFn: () => fetchDashaChildren(parent!.lord, startIso, endIso, system),
    enabled: enabled && parent != null && parent.childNodes == null,
    staleTime: Infinity,
  });
  const nodes = parent?.childNodes ?? q.data?.children;
  return { list: nodes ? nodes.map(toSpan) : undefined, loading: q.isLoading && q.fetchStatus !== "idle" };
}

export type DashaChainRow = {
  key: string;
  lord: string;
  graha: ReturnType<typeof dashaMahadashaGrahaKey>;
  name: string;
  level: string;
  running: boolean;
  start: string;
  end: string;
  total: string;
  left: string | null;
  progress: number | null;
  /** The duration breakdown table, on the innermost known level. */
  grid: { columns: string[]; values: string[] } | null;
};

export function useDashaTree({
  tree,
  timeZone,
  system = "vimshottari",
  maxLevel = DASHA_MAX_LEVEL,
  cycleYears,
}: {
  tree: DashaTreeNode[];
  timeZone?: string;
  system?: DashaSystem;
  maxLevel?: number;
  cycleYears?: number;
}) {
  const { t, lang, digits, moment, lordName } = useDashaFormat(timeZone);
  const [now] = useState(() => Date.now());
  const mahadashas = useMemo(() => tree.map(toSpan), [tree]);

  const p0 = findRunning(mahadashas, now);
  const p1 = findRunning(useChildren(p0, system, 0 < maxLevel).list, now);
  const p2 = findRunning(useChildren(p1, system, 1 < maxLevel).list, now);
  const p3 = findRunning(useChildren(p2, system, 2 < maxLevel).list, now);
  const p4 = findRunning(useChildren(p3, system, 3 < maxLevel).list, now);
  const path = [p0, p1, p2, p3, p4].filter((s): s is SpanWithChildren => s != null).slice(0, maxLevel + 1);

  const chain: DashaChainRow[] = path.map((span, i) => {
    const running = isRunning(span, now);
    const ms = span.end.getTime() - span.start.getTime();
    const parts = breakdownDashaDuration(ms);
    return {
      key: `${span.lord}-${i}`,
      lord: span.lord,
      graha: dashaMahadashaGrahaKey(system, span.lord),
      name: lordName(span, system),
      level: t(LEVEL_LABELS[i]!),
      running,
      start: moment(span.start),
      end: moment(span.end),
      total: digits(formatDashaDuration(ms, lang)),
      left: running ? digits(formatDashaDuration(span.end.getTime() - now, lang)) : null,
      progress: running ? progressOf(span, now) : null,
      grid:
        i === path.length - 1
          ? {
              columns: DURATION_COLS.map((c) => t(c)),
              values: [formatDashaDurationParts(parts, lang), parts.years, parts.months, parts.days, parts.yogas].map((v) => digits(v)),
            }
          : null,
    };
  });

  const timelineStart = mahadashas[0]?.start;
  const timelineEnd = mahadashas[mahadashas.length - 1]?.end;
  const yoginiCycle =
    p0 && cycleYears
      ? Math.floor((p0.start.getTime() - (timelineStart?.getTime() ?? p0.start.getTime())) / (cycleYears * 365.2425 * 86400000)) + 1
      : null;

  return {
    now,
    mahadashas,
    chain,
    cycle: yoginiCycle ? t("ui.kundali.cycle_yoginicycle", { yoginiCycle: digits(yoginiCycle) }) : null,
    range: timelineStart && timelineEnd ? { from: moment(timelineStart), to: moment(timelineEnd) } : null,
    copy: {
      runningDasha: t("kundali.running_dasha"),
      running: t("kundali.running"),
      total: t("kundali.total"),
      left: t("kundali.left"),
      from: t("kundali.from"),
      to: t("kundali.to"),
      fullTimeline: t("kundali.x.dasha_full_timeline"),
      begin: t("kundali.begin"),
      end: t("kundali.end"),
    },
  };
}

/** One period of the explorer: its labels, whether it is running, and its children once opened. */
export function useDashaNode({
  span,
  level,
  now,
  timeZone,
  system,
  maxLevel,
}: {
  span: SpanWithChildren;
  level: number;
  now: number;
  timeZone?: string;
  system: DashaSystem;
  maxLevel: number;
}) {
  const { t, lang, digits, moment, lordName } = useDashaFormat(timeZone);
  const [open, setOpen] = useState(false);
  const expandable = level < maxLevel;
  const { list: children, loading } = useChildren(span, system, open && expandable);
  const running = isRunning(span, now);
  return {
    open,
    expandable,
    toggle: () => expandable && setOpen((v) => !v),
    running,
    name: lordName(span, system),
    level: t(LEVEL_LABELS[level]!),
    duration: digits(formatDashaDuration(span.end.getTime() - span.start.getTime(), lang)),
    start: moment(span.start),
    end: moment(span.end),
    progress: running ? progressOf(span, now) : null,
    /** Fetching this node's children for the first time. */
    loading: open && expandable && loading,
    /** Shown once the node is open and its children are known. */
    children: open && expandable ? (children ?? null) : null,
  };
}
