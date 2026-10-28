import { ArrowUp, ChevronRight, Hourglass, LocateFixed } from "lucide-react";
import { LearnMoreCard } from "@/components/LearnMoreCard";
import { PageHeader, PageShell } from "@/components/PageShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBrahmaManaPage, type BrahmaManaPage } from "@vedic-patro/features/brahma-mana";
import { useRouteLoading } from "@/lib/route-loading";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

type Ladder = BrahmaManaPage["ladder"];

function Mana({ text }: { text?: string }) {
  return text ? <span className="block text-xs italic text-danger">{text}:</span> : null;
}

const NOW_PILL = "shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground";

/** The way down from Brahmā's life to the level in view, on one rail; the last step is the level itself. */
function Trail({ ladder }: { ladder: Ladder }) {
  const steps = [...ladder.trail, ladder.focus];
  return (
    <ol className="m-0 list-none p-0">
      {steps.map((step, i) => {
        const here = i === steps.length - 1;
        const rail = step.current ? "bg-secondary" : "bg-border";
        return (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => ladder.focusOn(step.key)}
              aria-current={here ? "step" : undefined}
              className={cn("flex w-full gap-3 rounded-lg px-1 text-left", here ? "bg-secondary/10" : "hover:bg-muted/60")}
            >
              <span aria-hidden className="flex w-3 shrink-0 flex-col items-center">
                <span className={cn("w-px flex-1", i === 0 ? "bg-transparent" : rail)} />
                <span
                  className={cn(
                    "rounded-full",
                    here
                      ? "size-3 bg-secondary ring-4 ring-secondary/20"
                      : step.current
                        ? "size-2.5 bg-secondary"
                        : "size-2.5 border border-border bg-card",
                  )}
                />
                <span className={cn("w-px flex-1", here ? "bg-transparent" : rail)} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col py-1.5 leading-snug">
                <Mana text={step.mana} />
                <span className={cn("font-semibold", here && "text-lg", step.current ? "text-secondary dark:text-accent" : "text-foreground")}>
                  {step.name}
                </span>
                <span className="font-num text-xs text-muted-foreground">{step.divya}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** The parts drawn to scale — Kṛta 4 : Tretā 3 : Dvāpara 2 : Kali 1 — each a way in. */
function ProportionBar({ ladder }: { ladder: Ladder }) {
  if (ladder.parts.length < 2) return null;
  return (
    <div className="flex h-4 gap-px overflow-hidden rounded-full">
      {ladder.parts.map((p) => {
        const tone = p.current ? "bg-secondary" : p.pause ? "bg-muted" : "bg-secondary/25 hover:bg-secondary/50";
        const style = { flexGrow: p.share, flexBasis: 0, minWidth: 2 };
        return p.hasChildren ? (
          <button key={p.key} type="button" title={p.name} aria-label={p.name} onClick={() => ladder.focusOn(p.key)} className={tone} style={style} />
        ) : (
          <span key={p.key} title={p.name} className={tone} style={style} />
        );
      })}
    </div>
  );
}

function PartCard({ part, ladder }: { part: Ladder["parts"][number]; ladder: Ladder }) {
  const body = (
    <span
      className={cn(
        "flex h-full w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        part.current
          ? "border-2 border-secondary bg-secondary/10"
          : part.pause
            ? "border border-dashed border-border bg-muted/50"
            : "border border-border bg-card",
        part.hasChildren && !part.current && "hover:border-secondary/60 hover:bg-secondary/5",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "font-semibold",
            part.current ? "text-secondary dark:text-accent" : part.pause ? "italic text-muted-foreground" : "text-foreground",
          )}
        >
          {part.name}
        </span>
        <span className="font-num text-sm text-muted-foreground">{part.divya}</span>
        <span className="font-num text-xs text-muted-foreground">{part.solar}</span>
      </span>
      {part.current ? <span className={NOW_PILL}>{ladder.nowLabel}</span> : null}
      {part.hasChildren ? <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
    </span>
  );
  return part.hasChildren ? (
    <button type="button" onClick={() => ladder.focusOn(part.key)} className="h-full w-full active:opacity-70">
      {body}
    </button>
  ) : (
    body
  );
}

/**
 * Brahmā's time one level at a time: the way down on the left (above, on a phone), the level in
 * view with its parts to scale, and the parts to step into.
 */
function LadderCard({ page }: { page: BrahmaManaPage }) {
  const ladder: Ladder = page.ladder;
  return (
    <section className={cn(patroCard, "flex flex-col gap-4 p-4 md:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-lg font-bold text-foreground md:text-xl">{page.tree.title}</h2>
          <p className="m-0 max-w-2xl text-sm text-muted-foreground">{ladder.hint}</p>
          <p className="m-0 font-num text-sm font-semibold text-foreground">{page.tree.unit}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ladder.up ? (
            <button
              type="button"
              onClick={ladder.up}
              className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted/60 active:opacity-70"
            >
              <ArrowUp className="size-3.5" aria-hidden />
              {ladder.upLabel}
            </button>
          ) : null}
          {ladder.atNow ? null : (
            <button
              type="button"
              onClick={ladder.toNow}
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground hover:opacity-90 active:opacity-70"
            >
              <LocateFixed className="size-3.5" aria-hidden />
              {ladder.toNowLabel}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(14rem,17rem)_minmax(0,1fr)] md:gap-6">
        <aside className="md:sticky md:top-24 md:self-start md:border-r md:border-border md:pr-4">
          <Trail ladder={ladder} />
        </aside>

        <div key={ladder.focus.key} className="flex min-w-0 animate-in flex-col gap-3 fade-in duration-200 motion-reduce:animate-none">
          <div
            className={cn(
              "flex flex-col gap-1 rounded-2xl p-4 md:p-5",
              ladder.focus.current ? "border-2 border-secondary bg-secondary/10" : "border border-border bg-muted/50",
            )}
          >
            <Mana text={ladder.focus.mana} />
            <div className="flex items-start gap-2">
              <h3
                className={cn(
                  "m-0 min-w-0 flex-1 text-xl font-bold md:text-2xl",
                  ladder.focus.current ? "text-secondary dark:text-accent" : "text-foreground",
                )}
              >
                {ladder.focus.name}
              </h3>
              {ladder.focus.current ? <span className={cn(NOW_PILL, "mt-1")}>{ladder.nowLabel}</span> : null}
            </div>
            <p className="m-0 font-num text-base font-semibold text-foreground md:text-lg">{ladder.focus.divya}</p>
            <p className="m-0 font-num text-xs text-muted-foreground md:text-sm">{ladder.focus.solar}</p>
          </div>

          {ladder.parts.length ? (
            <>
              <p className="m-0 text-sm font-semibold text-muted-foreground">{ladder.partsLabel}</p>
              <ProportionBar ladder={ladder} />
              <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
                {ladder.parts.flatMap((part) => [
                  part.mana ? (
                    <li key={`${part.key}-mana`} className="col-span-full pt-1">
                      <Mana text={part.mana} />
                    </li>
                  ) : null,
                  <li key={part.key}>
                    <PartCard part={part} ladder={ladder} />
                  </li>,
                ])}
              </ul>
            </>
          ) : (
            <p className="m-0 text-sm text-muted-foreground">{ladder.endLabel}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function BrahmaMana() {
  const page = useBrahmaManaPage();
  useRouteLoading(false);

  return (
    <PageShell>
      <PageHeader
        icon={<Hourglass className="size-7 text-secondary dark:text-primary" strokeWidth={1.8} />}
        title={page.title}
        subtitle={page.subtitle}
      />

      <LadderCard page={page} />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={cn(patroCard, "flex flex-col gap-2 p-4")}>
          <h2 className="m-0 text-lg font-bold text-foreground">{page.now.title}</h2>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {page.now.lines.map((line, i) => (
              <li key={line} className="flex items-start gap-2 text-sm text-foreground">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-secondary"
                  style={{
                    opacity: 0.45 + (0.55 * (i + 1)) / page.now.lines.length,
                  }}
                />
                <span className="font-num">{line}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={cn(patroCard, "flex flex-col gap-2 p-4")}>
          <h2 className="m-0 text-lg font-bold text-foreground">{page.notes.title}</h2>
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground">
            {page.notes.items.map((note) => (
              <li key={note} className="font-num">
                {note}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={cn(patroCard, "mt-4 flex flex-col gap-2 p-4")}>
        <h2 className="m-0 text-lg font-bold text-foreground">{page.pada.title}</h2>
        <p className="m-0 text-sm text-muted-foreground">{page.pada.caption}</p>
        <Table>
          <TableHeader>
            <TableRow>
              {page.pada.cols.map((c, i) => (
                <TableHead key={c} className={cn(i > 0 && "text-right")}>
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.pada.rows.map((r) => (
              <TableRow key={r.key} className={cn(r.total && "font-bold")}>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right font-num">{r.padas}</TableCell>
                <TableCell className="text-right font-num whitespace-nowrap">{r.calc}</TableCell>
                <TableCell className="text-right font-num whitespace-nowrap">{r.years}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="m-0 text-xs text-muted-foreground">{page.pada.note}</p>
      </section>

      <section className={cn(patroCard, "mt-4 flex flex-col gap-2 p-4")}>
        <h2 className="m-0 text-lg font-bold text-foreground">{page.years.title}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              {page.years.cols.map((c, i) => (
                <TableHead key={c} className={cn(i > 0 && "text-right")}>
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.years.rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.unit}</TableCell>
                <TableCell className="text-right font-num whitespace-nowrap">{r.divya}</TableCell>
                <TableCell className="text-right font-num whitespace-nowrap">{r.years}</TableCell>
                <TableCell className="text-right text-muted-foreground">{r.rough}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="m-0 text-xs text-muted-foreground">{page.source}</p>
      </section>

      <LearnMoreCard className="mt-7" slugs={page.learnSlugs} />
    </PageShell>
  );
}

export default BrahmaMana;
