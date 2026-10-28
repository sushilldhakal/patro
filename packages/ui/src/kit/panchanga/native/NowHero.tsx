import { View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import type { NowHeroTone, NowHeroView } from "@vedic-patro/features/common";
import { Grid, Text } from "@vedic-patro/ui";

const DOT: Record<NowHeroTone, string> = { good: "bg-success", neutral: "bg-warning", bad: "bg-danger", plain: "bg-primary" };
const INK: Record<NowHeroTone, string> = { good: "text-success", neutral: "text-foreground", bad: "text-danger", plain: "text-foreground" };
const TINT: Record<NowHeroTone, string> = { good: "bg-success/10", neutral: "bg-warning/15", bad: "bg-danger/10", plain: "bg-primary/10" };
const FACT_COLS = { base: 2, md: 3 } as const;

/** The card a calendar page opens with: what is on now (or next), how far through, what follows. */
export function NowHero({ hero, className }: { hero: NowHeroView; className?: string }) {
  return (
    <View className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <View className={cn("gap-3 rounded-xl p-4", TINT[hero.tone])}>
        <View>
          <View className="flex-row">
            <View className="flex-row items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5">
              <View className={cn("h-2 w-2 rounded-full", DOT[hero.tone])} />
              <Text className="text-xs font-bold text-foreground">{hero.eyebrow}</Text>
            </View>
          </View>
          <Text className={cn("mt-2 font-num text-2xl font-bold", INK[hero.tone])}>{hero.title}</Text>
          {hero.subtitle ? <Text className="mt-0.5 text-sm text-foreground">{hero.subtitle}</Text> : null}
          {hero.progress != null ? (
            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
              <View className={cn("h-full rounded-full", DOT[hero.tone])} style={{ width: `${hero.progress * 100}%` }} />
            </View>
          ) : null}
          {hero.foot ? (
            <View className="mt-1.5 flex-row flex-wrap justify-between gap-x-3">
              <Text className="font-num text-xs text-muted-foreground">{hero.foot.left ?? ""}</Text>
              <Text className="text-xs font-semibold text-muted-foreground">{hero.foot.right ?? ""}</Text>
            </View>
          ) : null}
          {hero.facts?.length ? (
            <Grid cols={FACT_COLS} gap={8} className="mt-3">
              {hero.facts.map((f) => (
                <View key={f.label} className="rounded-lg bg-card px-3 py-2">
                  <Text className="text-xs font-semibold text-muted-foreground">{f.label}</Text>
                  <Text className="font-num text-sm font-bold text-foreground">{f.value}</Text>
                  {f.sub ? <Text className="font-num text-xs text-muted-foreground">{f.sub}</Text> : null}
                </View>
              ))}
            </Grid>
          ) : null}
        </View>
        {hero.next ? (
          <View className="rounded-lg bg-card px-3 py-2.5">
            <Text className="text-xs font-semibold text-muted-foreground">{hero.next.label}</Text>
            <Text className="mt-1 text-base font-bold text-foreground">{hero.next.title}</Text>
            {hero.next.detail ? <Text className="font-num text-sm text-muted-foreground">{hero.next.detail}</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
