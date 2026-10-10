import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ChevronRight } from "lucide-react";
import { useLocale, bilingualText } from "@/i18n/locale";
import { dashaExpandKeys, fetchDashaChildren, type DashaSystem, type DashaTreeNode } from "@/lib/api";
import { formatZonedAdMoment, formatZonedBsMoment } from "@/lib/bs-calendar";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import {
  DASHA_LORD_EN,
  DASHA_LORD_NE,
  breakdownDashaDuration,
  dashaMahadashaGrahaKey,
  formatDashaDuration,
  formatDashaDurationParts,
  type DashaLord,
  type DashaSpan,
} from "@/lib/dasha";
import { cn } from "@/lib/utils";

/** Catalogue keys, outermost dasha level first. */
const LEVEL_LABELS: string[] = [
  "kundali.maha_dasha",
  "kundali.x.dasha_level_antar",
  "kundali.x.dasha_level_pratyantar",
  "kundali.x.dasha_level_sukshma",
  "kundali.x.dasha_level_prana",
];

const MAX_LEVEL = LEVEL_LABELS.length - 1;

const LORD_ACCENT: Record<DashaLord, string> = {
  sun: "border-amber-500/35 bg-amber-500/[0.08]",
  moon: "border-slate-400/35 bg-slate-400/[0.08]",
  mars: "border-red-500/35 bg-red-500/[0.08]",
  mercury: "border-emerald-500/35 bg-emerald-500/[0.08]",
  jupiter: "border-yellow-600/35 bg-yellow-600/[0.08]",
  venus: "border-pink-500/35 bg-pink-500/[0.08]",
  saturn: "border-violet-500/35 bg-violet-500/[0.08]",
  rahu: "border-neutral-500/35 bg-neutral-500/[0.08]",
  ketu: "border-orange-600/35 bg-orange-600/[0.08]",
};

const YOGINI_ACCENT: Record<string, string> = {
  mangala: "border-rose-500/35 bg-rose-500/[0.08]",
  pingala: "border-orange-500/35 bg-orange-500/[0.08]",
  dhanya: "border-amber-500/35 bg-amber-500/[0.08]",
  bhramari: "border-yellow-600/35 bg-yellow-600/[0.08]",
  bhadrika: "border-lime-600/35 bg-lime-600/[0.08]",
  ulka: "border-cyan-500/35 bg-cyan-500/[0.08]",
  siddha: "border-sky-500/35 bg-sky-500/[0.08]",
  sankata: "border-violet-500/35 bg-violet-500/[0.08]",
};

const YOGINI_DOT: Record<string, string> = {
  mangala: "bg-rose-500",
  pingala: "bg-orange-500",
  dhanya: "bg-amber-500",
  bhramari: "bg-yellow-600",
  bhadrika: "bg-lime-600",
  ulka: "bg-cyan-500",
  siddha: "bg-sky-500",
  sankata: "bg-violet-500",
};

const LORD_DOT: Record<DashaLord, string> = {
  sun: "bg-amber-500",
  moon: "bg-slate-400",
  mars: "bg-red-500",
  mercury: "bg-emerald-500",
  jupiter: "bg-yellow-600",
  venus: "bg-pink-500",
  saturn: "bg-violet-500",
  rahu: "bg-neutral-500",
  ketu: "bg-orange-600",
};

function lordAccent(lord: string, system: DashaSystem): string {
  if (system === "yogini") return YOGINI_ACCENT[lord] ?? "border-border/50 bg-muted/20";
  return LORD_ACCENT[(lord as DashaLord) in LORD_ACCENT ? (lord as DashaLord) : "ketu"];
}

function lordDot(lord: string, system: DashaSystem): string {
  if (system === "yogini") return YOGINI_DOT[lord] ?? "bg-muted-foreground";
  return LORD_DOT[(lord as DashaLord) in LORD_DOT ? (lord as DashaLord) : "ketu"];
}

/** A BS year like "2076" means nothing in English — English mode shows the
 * Gregorian calendar instead of translating BS month names into English. */
function formatMoment(
  date: Date,
  lang: string,
  timeZone?: string,
  digits?: (v: string | number) => string,
): string {
  const isEn = lang.slice(0, 2) === "en";
  return isEn
    ? formatZonedAdMoment(date, { lang, timeZone, digits })
    : formatZonedBsMoment(date, { lang, timeZone, digits });
}

function MomentLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-snug">
      <span className="inline-block w-14 shrink-0 font-semibold uppercase tracking-wide text-sm">
        {label}
      </span>
      <span className="text-base text-foreground/80">{value}</span>
    </p>
  );
}

function TimelineDot({
  running,
  level,
  lord,
  system,
}: {
  running: boolean;
  level: number;
  lord: string;
  system: DashaSystem;
}) {
  const size =
    level === 0 ? "size-3.5 -left-[8px]" : level === 1 ? "size-2.5 -left-[6px]" : "size-2 -left-[5px]";

  return (
    <span
      className={cn(
        "absolute top-[1.125rem] z-10 rounded-full border-2 border-background shadow-sm",
        size,
        running ? "bg-secondary ring-2 ring-secondary/35" : lordDot(lord, system),
      )}
      aria-hidden
    />
  );
}

function SpanProgress({ start, end, now }: { start: Date; end: Date; now: number }) {
  const total = end.getTime() - start.getTime();
  const pct = total > 0 ? Math.min(100, Math.max(0, ((now - start.getTime()) / total) * 100)) : 0;
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
      <div
        className="h-full rounded-full bg-secondary transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const DURATION_COLS = [
  "kundali.x.duration_bs",
  "kundali.x.duration_years",
  "kundali.x.duration_months",
  "holidays.col_days",
  "kundali.yoga",
] as const;

function DashaDurationGrid({
  start,
  end,
  lang,
  digits,
}: {
  start: Date;
  end: Date;
  lang: string;
  digits: (v: string | number) => string;
}) {
  const { t } = useTranslation();
  const ms = end.getTime() - start.getTime();
  const parts = breakdownDashaDuration(ms);
  const locale = lang === "en" ? "en" : "ne";
  const avadhi = formatDashaDurationParts(parts, locale);
  const values = [avadhi, parts.years, parts.months, parts.days, parts.yogas] as const;

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[280px] border-collapse text-sm">
        <thead>
          <tr>
            {DURATION_COLS.map((col) => (
              <th
                key={col}
                className="border border-border/50 bg-muted/30 px-1.5 py-1 text-left font-semibold text-sm uppercase tracking-wide"
              >
                {t(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {values.map((value, i) => (
              <td
                key={DURATION_COLS[i]}
                className="border border-border/50 px-1.5 py-1 text-base tabular-nums text-foreground/90"
              >
                {digits(value)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Span with the pre-computed children the API embedded (down to pratyantar). */
type SpanWithChildren = DashaSpan & { childNodes?: DashaTreeNode[]; lordNe: string };

function toSpan(node: DashaTreeNode): SpanWithChildren {
  return {
    lord: (node.lord as DashaLord) ?? "ketu",
    lordNe: node.lord_ne,
    start: new Date(node.start),
    end: new Date(node.end),
    childNodes: node.children,
  };
}

function displayLordName(span: SpanWithChildren, lang: string, system: DashaSystem): string {
  if (system === "yogini") return span.lordNe;
  const lord = span.lord as DashaLord;
  return lang === "en" ? DASHA_LORD_EN[lord] ?? span.lordNe : DASHA_LORD_NE[lord] ?? span.lordNe;
}

function isRunning(span: SpanWithChildren | undefined, now: number): boolean {
  return span != null && span.start.getTime() <= now && now < span.end.getTime();
}

function findRunning(spans: SpanWithChildren[] | undefined, now: number): SpanWithChildren | undefined {
  return spans?.find((s) => isRunning(s, now));
}

/** Every period at one level under `parent` — fetched only when the API
 * didn't already embed them (pratyantar and deeper come from a lazy
 * /kundali/dasha/expand call, cached by React Query once fetched). A fixed
 * 4-call chain (see `DashaTree`) keeps every render calling the same number
 * of hooks regardless of how deep this chart's `maxLevel` goes — React's
 * rules of hooks forbid a variable-length loop of `useQuery`. */
function useLevelChildren(
  parent: SpanWithChildren | undefined,
  system: DashaSystem,
  parentLevel: number,
  maxLevel: number,
): SpanWithChildren[] | undefined {
  const enabled = parent != null && parentLevel < maxLevel && parent.childNodes == null;
  const startIso = parent?.start.toISOString() ?? "";
  const endIso = parent?.end.toISOString() ?? "";
  const q = useQuery({
    queryKey: dashaExpandKeys.span(parent?.lord ?? "", startIso, endIso, system),
    queryFn: () => fetchDashaChildren(parent!.lord, startIso, endIso, system),
    enabled,
    staleTime: Infinity,
  });
  if (parent == null || parentLevel >= maxLevel) return undefined;
  return (parent.childNodes ?? q.data?.children)?.map(toSpan);
}

/** Recursive accordion node — one mahadasha/antar/pratyantar/etc. row on the
 * spine, expandable to reveal its own children. This is the full explorer
 * ("browse every period", not just what's running now) that sits below the
 * always-visible {@link ChainStack}. */
function DashaNode({
  span,
  level,
  now,
  timeZone,
  isLast,
  system,
  maxLevel,
}: {
  span: SpanWithChildren;
  level: number;
  now: number;
  timeZone?: string;
  isLast?: boolean;
  system: DashaSystem;
  maxLevel: number;
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const running = isRunning(span, now);
  const [open, setOpen] = useState(false);
  const expandable = level < maxLevel;

  const needsFetch = open && expandable && !span.childNodes;
  const startIso = span.start.toISOString();
  const endIso = span.end.toISOString();
  const childQ = useQuery({
    queryKey: dashaExpandKeys.span(span.lord, startIso, endIso, system),
    queryFn: () => fetchDashaChildren(span.lord, startIso, endIso, system),
    enabled: needsFetch,
    staleTime: Infinity,
  });

  const children = useMemo<SpanWithChildren[] | null>(() => {
    if (!open || !expandable) return null;
    const nodes = span.childNodes ?? childQ.data?.children;
    return nodes ? nodes.map(toSpan) : null;
  }, [open, expandable, span.childNodes, childQ.data]);

  const duration = formatDashaDuration(span.end.getTime() - span.start.getTime(), lang);
  const levelLabel = t(LEVEL_LABELS[level]!);
  const accent = lordAccent(span.lord, system);

  return (
    <li className={cn("relative", level === 0 ? "pb-4" : "pb-2", level > 0 && "ml-1")}>
      <span
        className={cn(
          "absolute top-0 bottom-0 border-l-2",
          level === 0 ? "-left-px border-border/80" : "left-0 border-border/50",
          isLast && !open && "bottom-auto h-[1.125rem]",
        )}
        aria-hidden
      />
      <TimelineDot running={running} level={level} lord={span.lord} system={system} />

      <article
        className={cn(
          "ml-5 overflow-hidden rounded-xl border transition-colors",
          level === 0 ? "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_4%,transparent)]" : "",
          accent,
          running && "border-secondary/40 ring-1 ring-secondary/20",
        )}
      >
        <button
          type="button"
          onClick={() => expandable && setOpen((v) => !v)}
          disabled={!expandable}
          aria-expanded={expandable ? open : undefined}
          className={cn(
            "w-full px-3 py-2.5 text-left transition-colors",
            expandable && "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
          )}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {expandable ? (
              <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} aria-hidden />
            ) : (
              <span className="w-3.5 shrink-0" aria-hidden />
            )}
            <span className="text-sm font-bold text-foreground">{displayLordName(span, lang, system)}</span>
            <span className="text-sm">
              {levelLabel}
              <span className="mx-1">·</span>
              {digits(duration)}
            </span>
            {running && (
              <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-sm font-bold text-secondary">
                {t("kundali.running")}
              </span>
            )}
          </span>

          <span className="mt-2 block space-y-0.5 pl-[22px]">
            <MomentLine label={t("kundali.begin")} value={formatMoment(span.start, lang, timeZone, digits)} />
            <MomentLine label={t("kundali.end")} value={formatMoment(span.end, lang, timeZone, digits)} />
          </span>

          {running && <SpanProgress start={span.start} end={span.end} now={now} />}
        </button>

        {children && (
          <div className="border-t border-border/50 bg-card/40 px-2 pb-2 pt-1">
            <ul className="relative ml-3 flex flex-col gap-0">
              {children.map((child, i) => (
                <DashaNode
                  key={`${child.lord}-${child.start.getTime()}-${i}`}
                  span={child}
                  level={level + 1}
                  now={now}
                  timeZone={timeZone}
                  isLast={i === children.length - 1}
                  system={system}
                  maxLevel={maxLevel}
                />
              ))}
            </ul>
          </div>
        )}
      </article>
    </li>
  );
}

function ChainStackRow({
  span,
  level,
  system,
  lang,
  digits,
  timeZone,
  now,
  isLast,
}: {
  span: SpanWithChildren;
  level: number;
  system: DashaSystem;
  lang: "ne" | "en";
  digits: (v: string | number) => string;
  timeZone?: string;
  now: number;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const grahaKey = dashaMahadashaGrahaKey(system, span.lord);
  const running = isRunning(span, now);

  return (
    <div className="px-4 py-3">
      <p className="flex items-center gap-2">
        {grahaKey ? <GrahaPlanetIcon graha={grahaKey} size={26} /> : null}
        <span className="text-base font-bold text-foreground">
          {displayLordName(span, lang, system)}
          <span className="font-normal text-muted-foreground"> — {t(LEVEL_LABELS[level]!)}</span>
        </span>
        {running && (
          <span className="ml-auto shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-sm font-bold text-secondary">
            {t("kundali.running")}
          </span>
        )}
      </p>
      <div className="mt-1.5 space-y-1 pl-1">
        <p className="flex items-center gap-1.5 text-sm">
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-base text-foreground/80">
            {formatMoment(span.start, lang, timeZone, digits)}
          </span>
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <ArrowRight className="size-3.5 shrink-0 text-foreground" aria-hidden />
          <span className="text-base text-foreground/80">
            {formatMoment(span.end, lang, timeZone, digits)}
          </span>
        </p>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 pl-1 text-sm">
        <p>
          <span>{t("kundali.total")} — </span>
          <span className="font-semibold text-foreground">
            {digits(formatDashaDuration(span.end.getTime() - span.start.getTime(), lang))}
          </span>
        </p>
        {running && (
          <p>
            <span>{t("kundali.left")} — </span>
            <span className="font-semibold text-foreground">
              {digits(formatDashaDuration(span.end.getTime() - now, lang))}
            </span>
          </p>
        )}
      </div>
      {running && <SpanProgress start={span.start} end={span.end} now={now} />}
      {isLast && <DashaDurationGrid start={span.start} end={span.end} lang={lang} digits={digits} />}
    </div>
  );
}

/**
 * The full active chain — Mahadasha down to whatever level is known — as one
 * unified stack, each level a plain row connected by a down-arrow. Nothing
 * here is collapsed or click-gated: every level's begin/end/total/left is
 * visible the instant the page loads, so "what's running right now" needs
 * no expanding and no scrolling to find.
 */
function ChainStack({
  path,
  system,
  now,
  timeZone,
  lang,
  digits,
}: {
  path: SpanWithChildren[];
  system: DashaSystem;
  now: number;
  timeZone?: string;
  lang: "ne" | "en";
  digits: (v: string | number) => string;
}) {
  if (path.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/40 divide-y divide-border/50">
      {path.map((span, i) => (
        <div key={`${span.lord}-${i}`}>
          {i > 0 && (
            <div className="flex justify-center py-0.5">
              <ArrowDown className="size-4 text-muted-foreground" aria-hidden />
            </div>
          )}
          <ChainStackRow
            span={span}
            level={i}
            system={system}
            lang={lang}
            digits={digits}
            timeZone={timeZone}
            now={now}
            isLast={i === path.length - 1}
          />
        </div>
      ))}
    </div>
  );
}

export type DashaTreeProps = {
  /** Server-computed mahadasha tree (full spans, antar/pratyantar embedded). */
  tree: DashaTreeNode[];
  /** IANA timezone of the chart's place, for begin/end display. */
  timeZone?: string;
  system?: DashaSystem;
  /** Deepest expandable level index (0 = maha only). Default: full Vimshottari depth. */
  maxLevel?: number;
  /** Yogini full-cycle length in years (for cycle badge). */
  cycleYears?: number;
};

/**
 * Dasha timeline: an always-visible stack of the live chain (Mahadasha down
 * to whatever level is known — nothing collapsed, no clicking needed to see
 * "what's running right now"), followed by the full accordion tree for
 * browsing every other period at every level.
 */
export function DashaTree({
  tree,
  timeZone,
  system = "vimshottari",
  maxLevel = MAX_LEVEL,
  cycleYears,
}: DashaTreeProps) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const [now] = useState(() => Date.now());
  const mahadashas = useMemo(() => tree.map(toSpan), [tree]);

  const p0 = findRunning(mahadashas, now);
  const list1 = useLevelChildren(p0, system, 0, maxLevel);
  const p1 = findRunning(list1, now);
  const list2 = useLevelChildren(p1, system, 1, maxLevel);
  const p2 = findRunning(list2, now);
  const list3 = useLevelChildren(p2, system, 2, maxLevel);
  const p3 = findRunning(list3, now);
  const list4 = useLevelChildren(p3, system, 3, maxLevel);
  const p4 = findRunning(list4, now);

  const knownPath = [p0, p1, p2, p3, p4].filter((s): s is SpanWithChildren => s != null);

  const timelineStart = mahadashas[0]?.start;
  const timelineEnd = mahadashas[mahadashas.length - 1]?.end;
  const yoginiCycle =
    p0 && cycleYears
      ? Math.floor((p0.start.getTime() - (timelineStart?.getTime() ?? p0.start.getTime())) / (cycleYears * 365.2425 * 86400000)) + 1
      : null;

  return (
    <div className="space-y-5">
      {knownPath.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold uppercase tracking-wide text-secondary">
              {t("kundali.running_dasha")}
            </p>
            {yoginiCycle ? (
              <span className="rounded-full border border-border/60 bg-card px-2 py-0.5 text-sm font-semibold">
                {bilingualText(lang, `चक्र: ${digits(yoginiCycle)}`, `Cycle: ${digits(yoginiCycle)}`)}
              </span>
            ) : null}
          </div>
          <ChainStack
            path={knownPath}
            system={system}
            now={now}
            timeZone={timeZone}
            lang={lang}
            digits={digits}
          />
        </div>
      )}

      {timelineStart && timelineEnd && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
          <span>
            <span className="font-semibold uppercase tracking-wide text-sm">{t("kundali.from")}</span>{" "}
            <span className="text-base text-foreground/80">
              {formatMoment(timelineStart, lang, timeZone, digits)}
            </span>
          </span>
          <span className="hidden sm:inline">→</span>
          <span>
            <span className="font-semibold uppercase tracking-wide text-sm">{t("kundali.to")}</span>{" "}
            <span className="text-base text-foreground/80">
              {formatMoment(timelineEnd, lang, timeZone, digits)}
            </span>
          </span>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("kundali.x.dasha_full_timeline")}
        </p>
        <ol className="relative m-0 list-none pl-3">
          {mahadashas.map((span, i) => (
            <DashaNode
              key={`${span.lord}-${span.start.getTime()}-${i}`}
              span={span}
              level={0}
              now={now}
              timeZone={timeZone}
              isLast={i === mahadashas.length - 1}
              system={system}
              maxLevel={maxLevel}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
