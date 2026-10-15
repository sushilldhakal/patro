import { ArrowDown, ArrowRight, ChevronRight } from "lucide-react";
import type { DashaSystem, DashaTreeNode } from "@/lib/api";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { DashaLord } from "@vedic-patro/domain/dasha";
import type { SpanWithChildren } from "@vedic-patro/domain/kundali/dasha-tree";
import { DASHA_MAX_LEVEL, useDashaNode, useDashaTree, type DashaChainRow } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

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

function MomentLine({ label, value }: { label: string; value: string }) {
  return (
    <p className={kundaliDetailClasses.prose.bodyTight}>
      <span className={cn(kundaliDetailClasses.dashaTree.momentLabel, "inline-block")}>
        {label}
      </span>
      <span className={kundaliDetailClasses.dashaTree.momentValue}>{value}</span>
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

function SpanProgress({ pct }: { pct: number }) {
  return (
    <div className={kundaliDetailClasses.dashaTree.progressTrack}>
      <div
        className={cn(kundaliDetailClasses.dashaTree.progressFill, "transition-[width] duration-500")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DashaDurationGrid({ grid }: { grid: NonNullable<DashaChainRow["grid"]> }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[280px] border-collapse text-sm">
        <thead>
          <tr>
            {grid.columns.map((col) => (
              <th key={col} className={cn(kundaliDetailClasses.dashaTree.durationHeadCell, "border text-left")}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {grid.values.map((value, i) => (
              <td
                key={grid.columns[i]}
                className={cn(kundaliDetailClasses.dashaTree.durationCell, kundaliDetailClasses.dashaTree.durationValue, "border")}
              >
                {value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

type Copy = ReturnType<typeof useDashaTree>["copy"];

/** Recursive accordion node — one mahadasha/antar/pratyantar/etc. row on the
 * spine, expandable to reveal its own children (the full explorer below the
 * always-visible {@link ChainStack}). */
function DashaNode({
  span,
  level,
  now,
  timeZone,
  isLast,
  system,
  maxLevel,
  copy,
}: {
  span: SpanWithChildren;
  level: number;
  now: number;
  timeZone?: string;
  isLast?: boolean;
  system: DashaSystem;
  maxLevel: number;
  copy: Copy;
}) {
  const node = useDashaNode({ span, level, now, timeZone, system, maxLevel });
  const { open, expandable, running, children } = node;
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
          onClick={node.toggle}
          disabled={!expandable}
          aria-expanded={expandable ? open : undefined}
          className={cn(
            "w-full px-3 py-2.5 text-left transition-colors",
            expandable && "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
          )}
        >
          <span className={cn(kundaliDetailClasses.dashaTree.spanHead, "flex")}>
            {expandable ? (
              <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} aria-hidden />
            ) : (
              <span className="w-3.5 shrink-0" aria-hidden />
            )}
            <span className={kundaliDetailClasses.dashaTree.spanLord}>{node.name}</span>
            <span className={kundaliDetailClasses.dashaTree.spanMeta}>
              {node.level}
              <span className="mx-1">·</span>
              {node.duration}
            </span>
            {running && (
              <span className={cn(kundaliDetailClasses.dashaTree.runningBadge, kundaliDetailClasses.dashaTree.runningBadgeText)}>
                {copy.running}
              </span>
            )}
          </span>

          <span className="mt-2 block space-y-0.5 pl-5.5">
            <MomentLine label={copy.begin} value={node.start} />
            <MomentLine label={copy.end} value={node.end} />
          </span>

          {node.progress != null && <SpanProgress pct={node.progress} />}
        </button>

        {children && (
          <div className={kundaliDetailClasses.dashaTree.childrenBox}>
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
                  copy={copy}
                />
              ))}
            </ul>
          </div>
        )}
      </article>
    </li>
  );
}

function ChainStackRow({ row, copy }: { row: DashaChainRow; copy: Copy }) {
  return (
    <div className={kundaliDetailClasses.dashaTree.detail}>
      <p className={cn(kundaliDetailClasses.dashaTree.detailHead, "flex")}>
        {row.graha ? <GrahaPlanetIcon graha={row.graha} size={26} /> : null}
        <span className={kundaliDetailClasses.dashaTree.detailTitle}>
          {row.name}
          <span className={kundaliDetailClasses.dashaTree.detailLevel}> — {row.level}</span>
        </span>
        {row.running && (
          <span className={cn(kundaliDetailClasses.dashaTree.runningBadge, kundaliDetailClasses.dashaTree.runningBadgeText, "ml-auto shrink-0")}>
            {copy.running}
          </span>
        )}
      </p>
      <div className={cn(kundaliDetailClasses.dashaTree.detailFlow, "space-y-1")}>
        <p className={cn(kundaliDetailClasses.dashaTree.detailFlowRow, kundaliDetailClasses.dashaTree.detailTotalText, "flex")}>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className={kundaliDetailClasses.dashaTree.detailFlowText}>{row.start}</span>
        </p>
        <p className={cn(kundaliDetailClasses.dashaTree.detailFlowRow, kundaliDetailClasses.dashaTree.detailTotalText, "flex")}>
          <ArrowRight className="size-3.5 shrink-0 text-foreground" aria-hidden />
          <span className={kundaliDetailClasses.dashaTree.detailFlowText}>{row.end}</span>
        </p>
      </div>
      <div className={cn(kundaliDetailClasses.dashaTree.detailTotals, kundaliDetailClasses.dashaTree.detailTotalText, "flex")}>
        <p>
          <span>{copy.total} — </span>
          <span className={kundaliDetailClasses.dashaTree.detailStrong}>{row.total}</span>
        </p>
        {row.left && (
          <p>
            <span>{copy.left} — </span>
            <span className={kundaliDetailClasses.dashaTree.detailStrong}>{row.left}</span>
          </p>
        )}
      </div>
      {row.progress != null && <SpanProgress pct={row.progress} />}
      {row.grid && <DashaDurationGrid grid={row.grid} />}
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
 * Dasha timeline: an always-visible stack of the live chain (nothing
 * collapsed), followed by the full accordion tree for browsing every period.
 */
export function DashaTree({
  tree,
  timeZone,
  system = "vimshottari",
  maxLevel = DASHA_MAX_LEVEL,
  cycleYears,
}: DashaTreeProps) {
  const dasha = useDashaTree({ tree, timeZone, system, maxLevel, cycleYears });
  const { copy, chain, range } = dasha;

  return (
    <div className="space-y-5">
      {chain.length > 0 && (
        <div className="space-y-2">
          <div className={cn(kundaliDetailClasses.dashaTree.runningHead, "flex")}>
            <p className={kundaliDetailClasses.dashaTree.runningTitle}>{copy.runningDasha}</p>
            {dasha.cycle ? (
              <span className={cn(kundaliDetailClasses.dashaTree.cycleChip, kundaliDetailClasses.dashaTree.cycleChipText)}>
                {dasha.cycle}
              </span>
            ) : null}
          </div>
          {/* The full active chain as one stack, each level joined by a down-arrow. */}
          <div className={cn(kundaliDetailClasses.dashaTree.pathBox, "divide-y divide-border/50")}>
            {chain.map((row, i) => (
              <div key={row.key}>
                {i > 0 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                )}
                <ChainStackRow row={row} copy={copy} />
              </div>
            ))}
          </div>
        </div>
      )}

      {range && (
        <div className={cn(kundaliDetailClasses.dashaTree.range, kundaliDetailClasses.dashaTree.rangeText, "flex")}>
          <span>
            <span className={kundaliDetailClasses.dashaTree.rangeLabel}>{copy.from}</span>{" "}
            <span className={kundaliDetailClasses.dashaTree.rangeValue}>{range.from}</span>
          </span>
          <span className="hidden sm:inline">→</span>
          <span>
            <span className={kundaliDetailClasses.dashaTree.rangeLabel}>{copy.to}</span>{" "}
            <span className={kundaliDetailClasses.dashaTree.rangeValue}>{range.to}</span>
          </span>
        </div>
      )}

      <div>
        <p className={kundaliDetailClasses.dashaTree.timelineLabel}>{copy.fullTimeline}</p>
        <ol className="relative m-0 list-none pl-3">
          {dasha.mahadashas.map((span, i) => (
            <DashaNode
              key={`${span.lord}-${span.start.getTime()}-${i}`}
              span={span}
              level={0}
              now={dasha.now}
              timeZone={timeZone}
              isLast={i === dasha.mahadashas.length - 1}
              system={system}
              maxLevel={maxLevel}
              copy={copy}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
