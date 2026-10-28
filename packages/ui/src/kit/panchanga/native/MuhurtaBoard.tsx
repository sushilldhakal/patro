import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { MuhurtaBoard as Board, MuhurtaSlot } from "@vedic-patro/features/panchanga-element";
import type { ChoghadiyaTone } from "@vedic-patro/domain/panchanga/choghadiya-display";
import { Text } from "@vedic-patro/ui";

export type MuhurtaBoardProps = {
  board: Board;
  icons: { day: ReactNode; night: ReactNode };
  /** Drawn before a slot's name (the hora planet). */
  leading?: (slot: MuhurtaSlot) => ReactNode;
};

const DOT: Record<ChoghadiyaTone, string> = { good: "bg-success", neutral: "bg-warning", bad: "bg-danger" };
const INK: Record<ChoghadiyaTone, string> = { good: "text-success", neutral: "text-foreground", bad: "text-danger" };
const TINT: Record<ChoghadiyaTone, string> = { good: "bg-success/10", neutral: "bg-warning/15", bad: "bg-danger/10" };

/** The whole sunrise-to-sunrise day as one bar; the slot the clock is in stands out. */
function DayStrip({ board }: { board: Board }) {
  const slots = board.phases.flatMap((p) => p.slots);
  return (
    <View>
      <View className="h-3 flex-row gap-px overflow-hidden rounded-full">
        {slots.map((s) => (
          <View
            key={s.key}
            className={cn(DOT[s.tone], s.state === "past" && "opacity-30", s.state === "now" && "border-2 border-foreground")}
            style={{ flexGrow: s.share, flexBasis: 0 }}
          />
        ))}
      </View>
      <View className="mt-1.5 flex-row justify-between">
        <Text className="font-num text-xs text-muted-foreground">{board.marks.sunrise}</Text>
        <Text className="font-num text-xs text-muted-foreground">{board.marks.sunset}</Text>
        <Text className="font-num text-xs text-muted-foreground">{board.marks.nextSunrise}</Text>
      </View>
    </View>
  );
}

function Legend({ board }: { board: Board }) {
  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-1">
      {board.groups.map((g) => (
        <View key={g.tone} className="flex-row items-center gap-1.5">
          <View className={cn("h-2.5 w-2.5 rounded-full", DOT[g.tone])} />
          <Text className="text-sm font-semibold text-foreground">{g.title}</Text>
          <Text className="text-sm text-muted-foreground">{g.names}</Text>
        </View>
      ))}
    </View>
  );
}

/** Today: the slot the clock is in, how far through it is, and the next good one. */
function NowCard({ now }: { now: NonNullable<Board["now"]> }) {
  const { slot } = now;
  return (
    <View className={cn("gap-3 rounded-xl p-4", TINT[slot.tone])}>
      <View>
        <View className="flex-row">
          <View className="flex-row items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5">
            <View className={cn("h-2 w-2 rounded-full", DOT[slot.tone])} />
            <Text className="text-xs font-bold text-foreground">{now.label}</Text>
          </View>
        </View>
        <Text className={cn("mt-2 text-2xl font-bold", INK[slot.tone])}>{slot.name}</Text>
        <Text className="mt-0.5 text-sm text-foreground">{slot.quality}</Text>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
          <View className={cn("h-full rounded-full", DOT[slot.tone])} style={{ width: `${now.progress * 100}%` }} />
        </View>
        <View className="mt-1.5 flex-row justify-between gap-2">
          <Text className="font-num text-xs text-muted-foreground">{slot.time}</Text>
          <Text className="text-xs font-semibold text-muted-foreground">{now.left}</Text>
        </View>
      </View>
      {now.nextGood ? (
        <View className="rounded-lg bg-card px-3 py-2.5">
          <Text className="text-xs font-semibold text-muted-foreground">{now.nextGood.label}</Text>
          <View className="mt-1 flex-row items-baseline justify-between gap-2">
            <Text className="text-base font-bold text-success">{now.nextGood.slot.name}</Text>
            <Text className="font-num text-sm text-foreground">{now.nextGood.slot.time}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SlotRow({ slot, index, nowLabel, leading }: { slot: MuhurtaSlot; index: number; nowLabel: string; leading?: MuhurtaBoardProps["leading"] }) {
  const now = slot.state === "now";
  return (
    <View
      className={cn(
        "flex-row items-center gap-3 rounded-lg px-3 py-2.5",
        now ? cn(TINT[slot.tone], "border border-foreground/20") : index % 2 === 0 && "bg-surface-inset",
        slot.state === "past" && "opacity-50",
      )}
    >
      <View className={cn("h-9 w-1 rounded-full", DOT[slot.tone])} />
      {leading?.(slot)}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className={cn("text-base font-bold", INK[slot.tone])}>{slot.name}</Text>
          {now ? (
            <View className="rounded-full bg-foreground px-2 py-px">
              <Text className="text-xs font-bold text-background">{nowLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} className="text-xs text-muted-foreground">
          {slot.quality}
        </Text>
      </View>
      <Text className="font-num text-sm font-semibold text-foreground">{slot.time}</Text>
    </View>
  );
}

/**
 * Choghadiya or hora for one day: what is on now (today), a strip of the whole day,
 * then the eight day and eight night slots.
 */
export function MuhurtaBoard({ board, icons, leading }: MuhurtaBoardProps) {
  return (
    <View className="gap-4">
      <View className="gap-4 rounded-2xl border border-border bg-card p-4">
        {board.now ? <NowCard now={board.now} /> : null}
        <DayStrip board={board} />
        <Legend board={board} />
      </View>
      {board.phases.map((phase) => (
        <View key={phase.id} className="rounded-2xl border border-border bg-card p-3">
          <View className="mb-2 flex-row items-center justify-between gap-2 px-1">
            <View className="flex-row items-center gap-2">
              {icons[phase.id]}
              <Text as="h2" className="text-base font-bold text-foreground">
                {phase.title}
              </Text>
            </View>
            <Text className="font-num text-xs text-muted-foreground">{phase.range}</Text>
          </View>
          <View className="gap-1">
            {phase.slots.map((s, i) => (
              <SlotRow key={s.key} slot={s} index={i} nowLabel={board.nowLabel} leading={leading} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
