import type { DashaSystem } from "@vedic-patro/api-client";
import type { DashaLord } from "@vedic-patro/domain/dasha";
import type { SpanWithChildren } from "@vedic-patro/domain/kundali/dasha-tree";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { DASHA_MAX_LEVEL, useDashaNode, useDashaTree, type DashaChainRow } from "@vedic-patro/features/kundali";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { DashaTreeProps, GrahaSlot } from "../contract";
import { iconArrowDown, iconArrowRight, iconChevronDown, iconChevronRight } from "../icons";

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
const LORD_DOT: Record<DashaLord, string> = {
  sun: "bg-amber-500", moon: "bg-slate-400", mars: "bg-red-500", mercury: "bg-emerald-500",
  jupiter: "bg-yellow-600", venus: "bg-pink-500", saturn: "bg-violet-500", rahu: "bg-neutral-500", ketu: "bg-orange-600",
};
const YOGINI_DOT: Record<string, string> = {
  mangala: "bg-rose-500", pingala: "bg-orange-500", dhanya: "bg-amber-500", bhramari: "bg-yellow-600",
  bhadrika: "bg-lime-600", ulka: "bg-cyan-500", siddha: "bg-sky-500", sankata: "bg-violet-500",
};

function accent(lord: string, system: DashaSystem) {
  if (system === "yogini") return YOGINI_ACCENT[lord] ?? "border-border/50 bg-muted/20";
  return LORD_ACCENT[(lord as DashaLord) in LORD_ACCENT ? (lord as DashaLord) : "ketu"];
}
function dot(lord: string, system: DashaSystem) {
  if (system === "yogini") return YOGINI_DOT[lord] ?? "bg-muted-foreground";
  return LORD_DOT[(lord as DashaLord) in LORD_DOT ? (lord as DashaLord) : "ketu"];
}

const tree = kundaliDetailClasses.dashaTree;
type Copy = ReturnType<typeof useDashaTree>["copy"];

function Progress({ pct }: { pct: number }) {
  return (
    <Box className={tree.progressTrack}>
      <Box className={tree.progressFill} widthPercent={pct} />
    </Box>
  );
}

function ChainRow({ row, copy, renderGraha }: { row: DashaChainRow; copy: Copy; renderGraha: GrahaSlot }) {
  return (
    <Box className={tree.detail}>
      <Box className={tree.detailHead} webClassName="flex">
        {row.graha ? renderGraha({ graha: row.graha, size: 26 }) : null}
        <Text className={tree.detailTitle}>{row.name}<Text className={tree.detailLevel}> — {row.level}</Text></Text>
        {row.running ? <Text className={cn(tree.runningBadge, tree.runningBadgeText)}>{copy.running}</Text> : null}
      </Box>
      <Box className={tree.detailFlowRow}><Icon node={iconArrowRight} size={14} tone="muted" /><Text className={tree.detailFlowText}>{row.start}</Text></Box>
      <Box className={tree.detailFlowRow}><Icon node={iconArrowRight} size={14} tone="foreground" /><Text className={tree.detailFlowText}>{row.end}</Text></Box>
      <Text className={tree.detailTotalText}>{copy.total} — <Text className={tree.detailStrong}>{row.total}</Text></Text>
      {row.left ? <Text className={tree.detailTotalText}>{copy.left} — <Text className={tree.detailStrong}>{row.left}</Text></Text> : null}
      {row.progress != null ? <Progress pct={row.progress} /> : null}
      {row.grid ? (
        <Box className="mt-2 flex-row" nativeClassName="flex-row">
          {row.grid.columns.map((col, i) => (
            <Box key={col} className={tree.durationCell}>
              <Text className={tree.durationHeadCell}>{col}</Text>
              <Text className={tree.durationValue}>{row.grid!.values[i]}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function Node({ span, level, now, timeZone, isLast, system, maxLevel, copy }: {
  span: SpanWithChildren; level: number; now: number; timeZone?: string; isLast?: boolean; system: DashaSystem; maxLevel: number; copy: Copy;
}) {
  const node = useDashaNode({ span, level, now, timeZone, system, maxLevel });
  return (
    <Box className={cn("relative", level === 0 ? "pb-4" : "pb-2", level > 0 && "ml-1")}>
      <Box className={cn("absolute top-[1.125rem] z-10 rounded-full border-2 border-background", level === 0 ? "size-3.5" : "size-2.5", node.running ? "bg-secondary ring-2 ring-secondary/35" : dot(span.lord, system))} />
      <Box className={cn("ml-5 overflow-hidden rounded-xl border", accent(span.lord, system), node.running && "border-secondary/40 ring-1 ring-secondary/20", isLast && !node.open && "pb-0")}>
        <Pressable onPress={node.expandable ? node.toggle : undefined} disabled={!node.expandable} className="w-full px-3 py-2.5">
          <Box className={tree.spanHead} nativeClassName="flex-row">
            {node.expandable ? <Icon node={node.open ? iconChevronDown : iconChevronRight} size={14} tone="muted" /> : <Box className="w-3.5" />}
            <Text className={tree.spanLord}>{node.name}</Text>
            <Text className={tree.spanMeta}>{node.level} · {node.duration}</Text>
            {node.running ? <Text className={cn(tree.runningBadge, tree.runningBadgeText)}>{copy.running}</Text> : null}
          </Box>
          <Text className={kundaliDetailClasses.prose.bodyTight}><Text className={tree.momentLabel}>{copy.begin}</Text> <Text className={tree.momentValue}>{node.start}</Text></Text>
          <Text className={kundaliDetailClasses.prose.bodyTight}><Text className={tree.momentLabel}>{copy.end}</Text> <Text className={tree.momentValue}>{node.end}</Text></Text>
          {node.progress != null ? <Progress pct={node.progress} /> : null}
        </Pressable>
        {node.children ? (
          <Box className={tree.childrenBox}>
            <Box className="relative ml-3">
              {node.children.map((child, i) => (
                <Node key={`${child.lord}-${child.start.getTime()}-${i}`} span={child} level={level + 1} now={now} timeZone={timeZone} isLast={i === node.children!.length - 1} system={system} maxLevel={maxLevel} copy={copy} />
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export function DashaTree({ tree: roots, timeZone, system = "vimshottari", maxLevel = DASHA_MAX_LEVEL, cycleYears, renderGraha }: DashaTreeProps) {
  const dasha = useDashaTree({ tree: roots, timeZone, system, maxLevel, cycleYears });
  return (
    <Box className="gap-5">
      {dasha.chain.length > 0 ? (
        <Box className="gap-2">
          <Box className={tree.runningHead} webClassName="flex">
            <Text className={tree.runningTitle}>{dasha.copy.runningDasha}</Text>
            {dasha.cycle ? <Text className={cn(tree.cycleChip, tree.cycleChipText)}>{dasha.cycle}</Text> : null}
          </Box>
          <Box className={tree.pathBox}>
            {dasha.chain.map((row, i) => (
              <Box key={row.key}>
                {i > 0 ? <Box className="items-center py-0.5"><Icon node={iconArrowDown} size={16} tone="muted" /></Box> : null}
                <ChainRow row={row} copy={dasha.copy} renderGraha={renderGraha} />
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
      {dasha.range ? (
        <Text className={cn(tree.range, tree.rangeText)}>
          <Text className={tree.rangeLabel}>{dasha.copy.from}</Text> <Text className={tree.rangeValue}>{dasha.range.from}</Text>
          {" → "}
          <Text className={tree.rangeLabel}>{dasha.copy.to}</Text> <Text className={tree.rangeValue}>{dasha.range.to}</Text>
        </Text>
      ) : null}
      <Box>
        <Text className={tree.timelineLabel}>{dasha.copy.fullTimeline}</Text>
        <Box className="relative pl-3">
          {dasha.mahadashas.map((span, i) => (
            <Node key={`${span.lord}-${span.start.getTime()}-${i}`} span={span} level={0} now={dasha.now} timeZone={timeZone} isLast={i === dasha.mahadashas.length - 1} system={system} maxLevel={maxLevel} copy={dasha.copy} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
