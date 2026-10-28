import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { SpanCard, SpanNow, UdayaSummary } from "@vedic-patro/features/panchanga-element";
import { Grid, Text } from "@vedic-patro/ui";
import { ElementSpanIcon } from "./ElementGlyphIcon";

export type SpanTimelineProps = {
  elementId: string;
  spans: SpanCard[];
  udaya?: UdayaSummary | null;
  current?: SpanNow | null;
  nowLabel: string;
};

const COLS = { base: 1, sm: 2, lg: 3 } as const;

function UdayaBadge({ kind, label }: { kind: "vriddhi" | "kshaya"; label: string }) {
  return (
    <View className={cn("rounded-full px-2 py-0.5", kind === "kshaya" ? "bg-danger" : "bg-secondary")}>
      <Text className="text-xs font-bold text-white">{label}</Text>
    </View>
  );
}

/** The span on now: name, how far through, when it ends, and what follows. */
function NowCard({ now, elementId }: { now: SpanNow; elementId: string }) {
  const { card } = now;
  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      <View className="gap-3 rounded-xl bg-primary/10 p-4">
        <View>
          <View className="flex-row">
            <View className="flex-row items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5">
              <View className="h-2 w-2 rounded-full bg-primary" />
              <Text className="text-xs font-bold text-foreground">{now.label}</Text>
            </View>
          </View>
          <View className="mt-2 flex-row items-center gap-3">
            <ElementSpanIcon elementId={elementId} span={card.span} size={44} />
            <View className="min-w-0 flex-1">
              <Text className="text-2xl font-bold text-foreground">{card.name}</Text>
              {card.paksha ? <Text className="text-sm text-muted-foreground">{card.paksha}</Text> : null}
            </View>
          </View>
          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
            <View className="h-full rounded-full bg-primary" style={{ width: `${now.progress * 100}%` }} />
          </View>
          <View className="mt-1.5 flex-row flex-wrap justify-between gap-x-3">
            <Text className="text-xs text-muted-foreground">
              {card.ends.label} <Text className="font-num text-xs font-semibold text-foreground">{now.endsAt}</Text>
            </Text>
            <Text className="text-xs font-semibold text-muted-foreground">{now.left}</Text>
          </View>
        </View>
        {now.next ? (
          <View className="flex-row items-center gap-3 rounded-lg bg-card px-3 py-2.5">
            <ElementSpanIcon elementId={elementId} span={now.next.card.span} size={32} />
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-semibold text-muted-foreground">{now.next.label}</Text>
              <Text className="text-base font-bold text-foreground">{now.next.card.name}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SpanRow({ card, elementId, nowLabel }: { card: SpanCard; elementId: string; nowLabel: string }) {
  const now = card.state === "now";
  const kind = card.udaya?.kind;
  return (
    <View
      className={cn(
        "gap-2 rounded-xl border bg-card p-3",
        now ? "border-primary/50 bg-primary/5" : "border-border",
        kind === "vriddhi" && "border-secondary/50",
        kind === "kshaya" && "border-dashed border-danger/50",
        card.state === "past" && "opacity-50",
      )}
    >
      <View className="flex-row items-center gap-3">
        <ElementSpanIcon elementId={elementId} span={card.span} size={34} />
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-x-2">
            <Text className="text-base font-bold text-foreground">{card.name}</Text>
            {now ? (
              <View className="rounded-full bg-foreground px-2 py-px">
                <Text className="text-xs font-bold text-background">{nowLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xs text-muted-foreground">{[card.paksha, card.length].filter(Boolean).join(" · ")}</Text>
        </View>
        {card.udaya ? <UdayaBadge kind={card.udaya.kind} label={card.udaya.label} /> : null}
      </View>
      {card.days ? (
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="text-xs font-semibold text-muted-foreground">{card.days.label}</Text>
          {card.days.list.map((d) => (
            <View key={d} className="rounded-full bg-surface-inset px-2 py-px">
              <Text className="font-num text-sm font-bold text-foreground">{d}</Text>
            </View>
          ))}
          {card.days.empty ? <Text className="text-sm font-bold text-danger">{card.days.empty}</Text> : null}
        </View>
      ) : null}
      {card.udaya ? <Text className="text-xs text-muted-foreground">{card.udaya.note}</Text> : null}
      <View className="gap-1 border-t border-border pt-2">
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-success" />
          <Text className="w-14 text-xs font-semibold text-success">{card.begins.label}</Text>
          <Text className="flex-1 font-num text-sm font-semibold text-foreground">{card.begins.when}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-danger" />
          <Text className="w-14 text-xs font-semibold text-danger">{card.ends.label}</Text>
          <Text className="flex-1 font-num text-sm font-semibold text-foreground">{card.ends.when}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * A month of a span element (tithi, nakshatra, yoga, karana, chandra rashi):
 * the one on now, the month's adhik/kshaya tithis, then every span with when
 * it begins and ends.
 */
export function SpanTimeline({ elementId, spans, udaya, current, nowLabel }: SpanTimelineProps) {
  return (
    <View className="gap-4">
      {current ? <NowCard now={current} elementId={elementId} /> : null}
      {udaya ? (
        <View className="gap-2 rounded-2xl border border-border bg-card p-4">
          <Text className="text-sm font-bold text-foreground">{udaya.title}</Text>
          {udaya.groups.map((g) => (
            <View key={g.kind} className="flex-row flex-wrap items-center gap-1.5">
              <UdayaBadge kind={g.kind} label={g.label} />
              <Text className="text-sm text-foreground">{g.items.join(" · ")}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Grid cols={COLS} gap={10}>
        {spans.map((s) => (
          <SpanRow key={s.key} card={s} elementId={elementId} nowLabel={nowLabel} />
        ))}
      </Grid>
    </View>
  );
}
