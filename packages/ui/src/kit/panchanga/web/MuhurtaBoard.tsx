import type { ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { MuhurtaBoard as Board, MuhurtaSlot } from "@vedic-patro/features/panchanga-element";
import type { ChoghadiyaTone } from "@vedic-patro/domain/panchanga/choghadiya-display";

export type MuhurtaBoardProps = {
  board: Board;
  icons: { day: ReactNode; night: ReactNode };
  /** Drawn before a slot's name (the hora planet). */
  leading?: (slot: MuhurtaSlot) => ReactNode;
};

const DOT: Record<ChoghadiyaTone, string> = { good: "bg-success", neutral: "bg-warning", bad: "bg-danger" };
const INK: Record<ChoghadiyaTone, string> = { good: "text-success", neutral: "text-foreground", bad: "text-danger" };
const TINT: Record<ChoghadiyaTone, string> = { good: "bg-success/10", neutral: "bg-warning/15", bad: "bg-danger/10" };

/** The whole sunrise-to-sunrise day as one bar, a tick where the clock is. */
function DayStrip({ board }: { board: Board }) {
  const slots = board.phases.flatMap((p) => p.slots);
  return (
    <div>
      <div className="flex h-3 gap-px overflow-hidden rounded-full">
        {slots.map((s) => (
          <span
            key={s.key}
            className={cn(DOT[s.tone], s.state === "past" && "opacity-35", s.state === "now" && "ring-2 ring-foreground ring-inset")}
            style={{ flexGrow: s.share, flexBasis: 0 }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-num text-xs tabular-nums text-muted-foreground">
        <span>{board.marks.sunrise}</span>
        <span>{board.marks.sunset}</span>
        <span>{board.marks.nextSunrise}</span>
      </div>
    </div>
  );
}

function Legend({ board }: { board: Board }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm">
      {board.groups.map((g) => (
        <li key={g.tone} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 shrink-0 rounded-full", DOT[g.tone])} />
          <span className="font-semibold text-foreground">{g.title}</span>
          <span className="text-muted-foreground">{g.names}</span>
        </li>
      ))}
    </ul>
  );
}

/** Today: the slot the clock is in, how far through it is, and the next good one. */
function NowCard({ now }: { now: NonNullable<Board["now"]> }) {
  const { slot } = now;
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:gap-6", TINT[slot.tone])}>
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 text-xs font-bold text-foreground">
          <span className={cn("size-2 animate-pulse rounded-full", DOT[slot.tone])} />
          {now.label}
        </span>
        <p className={cn("m-0 mt-2 text-2xl font-bold leading-tight", INK[slot.tone])}>{slot.name}</p>
        <p className="m-0 mt-0.5 text-sm text-foreground">{slot.quality}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
          <div className={cn("h-full rounded-full", DOT[slot.tone])} style={{ width: `${now.progress * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-num tabular-nums">{slot.time}</span>
          <span className="font-semibold">{now.left}</span>
        </div>
      </div>
      {now.nextGood ? (
        <div className="rounded-lg bg-card px-3 py-2.5 sm:w-56">
          <p className="m-0 text-xs font-semibold text-muted-foreground">{now.nextGood.label}</p>
          <p className="m-0 mt-1 flex items-baseline justify-between gap-2">
            <span className="text-base font-bold text-success">{now.nextGood.slot.name}</span>
            <span className="font-num text-sm tabular-nums text-foreground">{now.nextGood.slot.time}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SlotRow({ slot, nowLabel, leading }: { slot: MuhurtaSlot; nowLabel: string; leading?: MuhurtaBoardProps["leading"] }) {
  const now = slot.state === "now";
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5",
        now ? cn(TINT[slot.tone], "ring-1 ring-foreground/20") : "odd:bg-surface-inset",
        slot.state === "past" && "opacity-55",
      )}
    >
      <span className={cn("h-9 w-1 shrink-0 rounded-full", DOT[slot.tone])} />
      {leading?.(slot)}
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-center gap-2">
          <span className={cn("text-base font-bold", INK[slot.tone])}>{slot.name}</span>
          {now ? <span className="rounded-full bg-foreground px-2 py-px text-xs font-bold text-background">{nowLabel}</span> : null}
        </p>
        <p className="m-0 truncate text-xs text-muted-foreground">{slot.quality}</p>
      </div>
      <span className="shrink-0 font-num text-sm font-semibold tabular-nums text-foreground">{slot.time}</span>
    </li>
  );
}

/**
 * Choghadiya or hora for one day: what is on now (today), a strip of the whole day,
 * and the eight day and eight night slots side by side on wide screens.
 */
export function MuhurtaBoard({ board, icons, leading }: MuhurtaBoardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        {board.now ? <NowCard now={board.now} /> : null}
        <DayStrip board={board} />
        <Legend board={board} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {board.phases.map((phase) => (
          <section key={phase.id} className="rounded-2xl border border-border bg-card p-3">
            <header className="mb-2 flex items-center justify-between gap-2 px-1">
              <h2 className="m-0 flex items-center gap-2 text-base font-bold text-foreground">
                <span className={phase.id === "day" ? "text-warning" : "text-muted-foreground"}>{icons[phase.id]}</span>
                {phase.title}
              </h2>
              <span className="font-num text-xs tabular-nums text-muted-foreground">{phase.range}</span>
            </header>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {phase.slots.map((s) => (
                <SlotRow key={s.key} slot={s} nowLabel={board.nowLabel} leading={leading} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
