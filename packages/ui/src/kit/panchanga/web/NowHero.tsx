import { cn } from "@vedic-patro/design-tokens/cn";
import type { NowHeroTone, NowHeroView } from "@vedic-patro/features/common";

const DOT: Record<NowHeroTone, string> = { good: "bg-success", neutral: "bg-warning", bad: "bg-danger", plain: "bg-primary" };
const INK: Record<NowHeroTone, string> = { good: "text-success", neutral: "text-foreground", bad: "text-danger", plain: "text-foreground" };
const TINT: Record<NowHeroTone, string> = { good: "bg-success/10", neutral: "bg-warning/15", bad: "bg-danger/10", plain: "bg-primary/10" };

/** The card a calendar page opens with: what is on now (or next), how far through, what follows. */
export function NowHero({ hero, className }: { hero: NowHeroView; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className={cn("flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:gap-6", TINT[hero.tone])}>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-0.5 text-xs font-bold text-foreground">
            <span className={cn("size-2 rounded-full", DOT[hero.tone], hero.live && "animate-pulse")} />
            {hero.eyebrow}
          </span>
          <p className={cn("m-0 mt-2 font-num text-2xl font-bold leading-tight", INK[hero.tone])}>{hero.title}</p>
          {hero.subtitle ? <p className="m-0 mt-0.5 text-sm text-foreground">{hero.subtitle}</p> : null}
          {hero.progress != null ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
              <div className={cn("h-full rounded-full", DOT[hero.tone])} style={{ width: `${hero.progress * 100}%` }} />
            </div>
          ) : null}
          {hero.foot ? (
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
              <span className="font-num">{hero.foot.left}</span>
              <span className="font-semibold">{hero.foot.right}</span>
            </div>
          ) : null}
          {hero.facts?.length ? (
            <dl className="m-0 mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {hero.facts.map((f) => (
                <div key={f.label} className="rounded-lg bg-card px-3 py-2">
                  <dt className="text-xs font-semibold text-muted-foreground">{f.label}</dt>
                  <dd className="m-0 font-num text-sm font-bold text-foreground">{f.value}</dd>
                  {f.sub ? <dd className="m-0 font-num text-xs text-muted-foreground">{f.sub}</dd> : null}
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {hero.next ? (
          <div className="rounded-lg bg-card px-3 py-2.5 sm:w-60">
            <p className="m-0 text-xs font-semibold text-muted-foreground">{hero.next.label}</p>
            <p className="m-0 mt-1 text-base font-bold text-foreground">{hero.next.title}</p>
            {hero.next.detail ? <p className="m-0 font-num text-sm text-muted-foreground">{hero.next.detail}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
