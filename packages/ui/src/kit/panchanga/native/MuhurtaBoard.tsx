import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { MuhurtaBoard as Board, MuhurtaSlot, MuhurtaTone } from "@vedic-patro/features/panchanga-element";
import { Text } from "@vedic-patro/ui";

export type MuhurtaBoardProps = {
  board: Board;
  icons: { day: ReactNode; night: ReactNode };
  /** Drawn before a slot's name (the hora planet, a rashi or nakshatra glyph). */
  leading?: (slot: MuhurtaSlot) => ReactNode;
};

const DOT: Record<MuhurtaTone, string> = { good: "bg-success", neutral: "bg-warning", bad: "bg-danger", plain: "bg-primary" };
const INK: Record<MuhurtaTone, string> = { good: "text-success", neutral: "text-foreground", bad: "text-danger", plain: "text-foreground" };
const TINT: Record<MuhurtaTone, string> = { good: "bg-success/10", neutral: "bg-warning/15", bad: "bg-danger/10", plain: "bg-primary/10" };

/** The whole sunrise-to-sunrise day as one bar; the slot the clock is in stands out. */
function DayStrip({ board, marks }: { board: Board; marks: NonNullable<Board["marks"]> }) {
  const slots = board.phases.flatMap((p) => p.slots);
  return (
    <View>
      <View className="h-3 flex-row gap-px overflow-hidden rounded-full">
        {slots.map((s, i) => (
          <View
            key={s.key}
            className={cn(
              DOT[s.tone],
              s.tone === "plain" && i % 2 === 1 && "opacity-60",
              s.state === "past" && "opacity-30",
              s.state === "now" && "border-2 border-foreground",
            )}
            style={{ flexGrow: s.share, flexBasis: 0 }}
          />
        ))}
      </View>
      <View className="mt-1.5 flex-row justify-between">
        <Text className="font-num text-xs text-muted-foreground">{marks.sunrise}</Text>
        <Text className="font-num text-xs text-muted-foreground">{marks.sunset}</Text>
        <Text className="font-num text-xs text-muted-foreground">{marks.nextSunrise}</Text>
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
          {g.names ? <Text className="text-sm text-muted-foreground">{g.names}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Today: the slot the clock is in (or the next one), how long it has, and what follows. */
function NowCard({ now, leading }: { now: NonNullable<Board["now"]>; leading?: MuhurtaBoardProps["leading"] }) {
  const { slot } = now;
  const on = now.progress != null;
  return (
    <View className={cn("gap-3 rounded-xl p-4", TINT[slot.tone])}>
      <View>
        <View className="flex-row">
          <View className="flex-row items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5">
            <View className={cn("h-2 w-2 rounded-full", DOT[slot.tone])} />
            <Text className="text-xs font-bold text-foreground">{now.label}</Text>
          </View>
        </View>
        <View className="mt-2 flex-row items-center gap-2">
          {leading?.(slot)}
          <Text className={cn("text-2xl font-bold", INK[slot.tone])}>{slot.name}</Text>
        </View>
        <Text className="mt-0.5 text-sm text-foreground">{slot.quality}</Text>
        {on ? (
          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
            <View className={cn("h-full rounded-full", DOT[slot.tone])} style={{ width: `${(now.progress ?? 0) * 100}%` }} />
          </View>
        ) : null}
        <View className="mt-1.5 flex-row justify-between gap-2">
          <Text className="font-num text-xs text-muted-foreground">{slot.time}</Text>
          <Text className="text-xs font-semibold text-muted-foreground">{now.left}</Text>
        </View>
      </View>
      {now.next ? (
        <View className="rounded-lg bg-card px-3 py-2.5">
          <Text className="text-xs font-semibold text-muted-foreground">{now.next.label}</Text>
          <View className="mt-1 flex-row items-baseline justify-between gap-2">
            <Text className={cn("text-base font-bold", INK[now.next.slot.tone])}>{now.next.slot.name}</Text>
            <Text className="font-num text-sm text-foreground">{now.next.slot.time}</Text>
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
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
          <Text className={cn("text-base font-bold", INK[slot.tone])}>{slot.name}</Text>
          {now ? (
            <View className="rounded-full bg-foreground px-2 py-px">
              <Text className="text-xs font-bold text-background">{nowLabel}</Text>
            </View>
          ) : null}
          {slot.badge ? (
            <View className="rounded-full bg-success/15 px-2 py-px">
              <Text className="font-num text-xs font-semibold text-success">{slot.badge}</Text>
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
 * One day of a muhurta table (choghadiya, hora, lagna, …): what is on now or
 * next (today), a strip of the whole day, then the day and night slots.
 */
export function MuhurtaBoard({ board, icons, leading }: MuhurtaBoardProps) {
  const top = board.note || board.now || board.marks || board.groups.length > 0;
  return (
    <View className="gap-4">
      {top ? (
        <View className="gap-4 rounded-2xl border border-border bg-card p-4">
          {board.note ? <Text className="text-sm font-semibold text-foreground">{board.note}</Text> : null}
          {board.now ? <NowCard now={board.now} leading={leading} /> : null}
          {board.marks ? <DayStrip board={board} marks={board.marks} /> : null}
          {board.groups.length ? <Legend board={board} /> : null}
        </View>
      ) : null}
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
