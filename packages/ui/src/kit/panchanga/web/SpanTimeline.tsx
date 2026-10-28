import { cn } from "@vedic-patro/design-tokens/cn";
import type { SpanCard, SpanNow, UdayaSummary } from "@vedic-patro/features/panchanga-element";
import { ElementSpanIcon } from "./ElementGlyphIcon";

export type SpanTimelineProps = {
  elementId: string;
  spans: SpanCard[];
  udaya?: UdayaSummary | null;
  current?: SpanNow | null;
  nowLabel: string;
};

function UdayaBadge({ kind, label }: { kind: "vriddhi" | "kshaya"; label: string }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white", kind === "kshaya" ? "bg-danger" : "bg-secondary")}>{label}</span>
  );
}

/** The span on now: name, how far through, when it ends, and what follows. */
function NowCard({ now, elementId }: { now: SpanNow; elementId: string }) {
  const { card } = now;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 rounded-xl bg-primary/10 p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 text-xs font-bold text-foreground">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            {now.label}
          </span>
          <div className="mt-2 flex items-center gap-3">
            <ElementSpanIcon elementId={elementId} span={card.span} size={44} />
            <div className="min-w-0">
              <p className="m-0 text-2xl font-bold leading-tight text-foreground">{card.name}</p>
              {card.paksha ? <p className="m-0 text-sm text-muted-foreground">{card.paksha}</p> : null}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-primary" style={{ width: `${now.progress * 100}%` }} />
          </div>
          <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {card.ends.label} <span className="font-num font-semibold text-foreground">{now.endsAt}</span>
            </span>
            <span className="font-semibold">{now.left}</span>
          </div>
        </div>
        {now.next ? (
          <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5 sm:w-64">
            <ElementSpanIcon elementId={elementId} span={now.next.card.span} size={32} />
            <div className="min-w-0">
              <p className="m-0 text-xs font-semibold text-muted-foreground">{now.next.label}</p>
              <p className="m-0 text-base font-bold text-foreground">{now.next.card.name}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpanRow({ card, elementId, nowLabel }: { card: SpanCard; elementId: string; nowLabel: string }) {
  const now = card.state === "now";
  const kind = card.udaya?.kind;
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3",
        now ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border",
        kind === "vriddhi" && "border-secondary/50",
        kind === "kshaya" && "border-dashed border-danger/50",
        card.state === "past" && "opacity-55",
      )}
    >
      <div className="flex items-center gap-3">
        <ElementSpanIcon elementId={elementId} span={card.span} size={34} />
        <div className="min-w-0 flex-1">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-base font-bold text-foreground">{card.name}</span>
            {now ? <span className="rounded-full bg-foreground px-2 py-px text-xs font-bold text-background">{nowLabel}</span> : null}
          </p>
          <p className="m-0 text-xs text-muted-foreground">{[card.paksha, card.length].filter(Boolean).join(" · ")}</p>
        </div>
        {card.udaya ? <UdayaBadge kind={card.udaya.kind} label={card.udaya.label} /> : null}
      </div>
      {card.days ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{card.days.label}</span>
          {card.days.list.map((d) => (
            <span key={d} className="rounded-full bg-surface-inset px-2 py-px font-num text-sm font-bold text-foreground">
              {d}
            </span>
          ))}
          {card.days.empty ? <span className="text-sm font-bold text-danger">{card.days.empty}</span> : null}
        </div>
      ) : null}
      {card.udaya ? <p className="m-0 text-xs leading-snug text-muted-foreground">{card.udaya.note}</p> : null}
      <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-1 border-t border-border pt-2 text-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <span className="size-2 rounded-full bg-success" />
          {card.begins.label}
        </span>
        <span className="font-num font-semibold text-foreground">{card.begins.when}</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <span className="size-2 rounded-full bg-danger" />
          {card.ends.label}
        </span>
        <span className="font-num font-semibold text-foreground">{card.ends.when}</span>
      </div>
    </li>
  );
}

/**
 * A month of a span element (tithi, nakshatra, yoga, karana, chandra rashi):
 * the one on now, the month's adhik/kshaya tithis, then every span with when
 * it begins and ends.
 */
export function SpanTimeline({ elementId, spans, udaya, current, nowLabel }: SpanTimelineProps) {
  return (
    <div className="flex flex-col gap-4">
      {current ? <NowCard now={current} elementId={elementId} /> : null}
      {udaya ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
          <p className="m-0 text-sm font-bold text-foreground">{udaya.title}</p>
          {udaya.groups.map((g) => (
            <div key={g.kind} className="flex flex-wrap items-center gap-1.5">
              <UdayaBadge kind={g.kind} label={g.label} />
              <span className="text-sm text-foreground">{g.items.join(" · ")}</span>
            </div>
          ))}
        </div>
      ) : null}
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {spans.map((s) => (
          <SpanRow key={s.key} card={s} elementId={elementId} nowLabel={nowLabel} />
        ))}
      </ul>
    </div>
  );
}
