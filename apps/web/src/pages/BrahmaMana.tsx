import { ArrowUp, ChevronDown, ChevronRight, Hourglass, LocateFixed } from "lucide-react";
import { LearnMoreCard } from "@/components/LearnMoreCard";
import { PageHeader, PageShell } from "@/components/PageShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBrahmaManaPage, type BrahmaManaPage, type BrahmaTreeRow } from "@vedic-patro/features/brahma-mana";
import { useRouteLoading } from "@/lib/route-loading";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/** Indent per level, in px. Fifteen levels deep still leaves a phone most of its width. */
const STEP = 16;

/** One stretch of time: rails of the levels above, a triangle if it opens, name, [divya varṣa]. */
function TreeRow({ row, tree }: { row: BrahmaTreeRow; tree: BrahmaManaPage["tree"] }) {
  const line = row.current ? "bg-secondary" : "bg-border";
  const rails = row.rails.map((on, i) => (
    <span key={i} aria-hidden className="relative shrink-0" style={{ width: STEP }}>
      {on ? <span className="absolute left-1.5 top-0 h-full w-px bg-border" /> : null}
    </span>
  ));
  const elbow =
    row.depth > 0 ? (
      <span aria-hidden className="relative shrink-0" style={{ width: STEP }}>
        <span className={cn("absolute left-1.5 top-0 w-px", line, row.last ? "h-3.5" : "h-full")} />
        <span className={cn("absolute left-1.5 top-3.5 h-px w-2", line)} />
      </span>
    ) : null;
  const label = (
    <span className="min-w-0 py-0.5 text-left leading-snug">
      <span
        className={cn(
          "font-semibold",
          row.current ? "text-secondary underline decoration-dashed decoration-1 underline-offset-4 dark:text-accent" : "text-foreground",
        )}
      >
        {row.name}
      </span>{" "}
      <span className="font-num text-sm text-muted-foreground">[{row.divya}]</span>{" "}
      <span className="font-num text-xs text-muted-foreground/80">{row.solar}</span>
    </span>
  );
  const triangle = row.hasChildren ? (
    <ChevronDown aria-hidden className={cn("mt-1 size-3.5 shrink-0 text-foreground transition-transform", !row.open && "-rotate-90")} />
  ) : (
    <span aria-hidden className="w-3.5 shrink-0" />
  );

  return (
    <>
      {row.mana ? (
        <li className="flex">
          {rails}
          {/* The parent's rail runs on through the label to this row's elbow. */}
          {row.depth > 0 ? (
            <span aria-hidden className="relative shrink-0" style={{ width: STEP }}>
              <span className={cn("absolute left-1.5 top-0 h-full w-px", row.current ? "bg-secondary" : "bg-border")} />
            </span>
          ) : null}
          <span className="pl-5 text-sm italic text-danger">{row.mana}:</span>
        </li>
      ) : null}
      <li className="flex items-stretch">
        {rails}
        {elbow}
        {row.hasChildren ? (
          <button
            type="button"
            onClick={() => tree.toggle(row.key)}
            aria-expanded={row.open}
            className="flex min-w-0 items-start gap-1.5 rounded px-1 hover:bg-muted/50"
          >
            {triangle}
            {label}
          </button>
        ) : (
          <span className="flex min-w-0 items-start gap-1.5 px-1">
            {triangle}
            {label}
          </span>
        )}
      </li>
    </>
  );
}

type Ladder = BrahmaManaPage["ladder"];

function Mana({ text }: { text?: string }) {
  return text ? <span className="block text-xs italic text-danger">{text}:</span> : null;
}

/** The phone view: one level of Brahmā's time at a time, the way down above it, its parts below. */
function LadderCard({ page }: { page: BrahmaManaPage }) {
  const ladder: Ladder = page.ladder;
  return (
    <section className={cn(patroCard, "flex flex-col gap-3 p-4 md:hidden")}>
      <h2 className="m-0 text-lg font-bold text-foreground">{page.tree.title}</h2>
      <p className="m-0 text-sm text-muted-foreground">{ladder.hint}</p>
      <p className="m-0 font-num text-sm font-semibold text-foreground">{page.tree.unit}</p>
      <div className="flex flex-wrap gap-2">
        {ladder.up ? (
          <button
            type="button"
            onClick={ladder.up}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground active:opacity-70"
          >
            <ArrowUp className="size-3.5" aria-hidden />
            {ladder.upLabel}
          </button>
        ) : null}
        {ladder.atNow ? null : (
          <button
            type="button"
            onClick={ladder.toNow}
            className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground active:opacity-70"
          >
            <LocateFixed className="size-3.5" aria-hidden />
            {ladder.toNowLabel}
          </button>
        )}
      </div>

      {ladder.trail.length ? (
        <ol className="m-0 list-none p-0">
          {ladder.trail.map((step) => (
            <li key={step.key}>
              <button type="button" onClick={() => ladder.focusOn(step.key)} className="flex w-full gap-3 text-left active:opacity-70">
                <span aria-hidden className="flex w-3 shrink-0 flex-col items-center">
                  <span className={cn("w-px flex-1", step.current ? "bg-secondary" : "bg-border")} />
                  <span className={cn("size-2.5 rounded-full", step.current ? "bg-secondary" : "border border-border bg-card")} />
                  <span className={cn("w-px flex-1", step.current ? "bg-secondary" : "bg-border")} />
                </span>
                <span className="min-w-0 flex-1 py-1 leading-snug">
                  <Mana text={step.mana} />
                  <span className={cn("font-semibold", step.current ? "text-secondary dark:text-accent" : "text-foreground")}>{step.name}</span>
                  <span className="font-num text-xs text-muted-foreground">
                    {"  "}
                    {step.divya}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <div key={ladder.focus.key} className="flex animate-in flex-col gap-3 fade-in duration-200 motion-reduce:animate-none">
        <div
          className={cn(
            "flex flex-col gap-1 rounded-2xl p-4",
            ladder.focus.current ? "border-2 border-secondary bg-secondary/10" : "border border-border bg-muted/50",
          )}
        >
          <Mana text={ladder.focus.mana} />
          <div className="flex items-start gap-2">
            <h3 className={cn("m-0 min-w-0 flex-1 text-xl font-bold", ladder.focus.current ? "text-secondary dark:text-accent" : "text-foreground")}>
              {ladder.focus.name}
            </h3>
            {ladder.focus.current ? (
              <span className="mt-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">{ladder.nowLabel}</span>
            ) : null}
          </div>
          <p className="m-0 font-num text-base font-semibold text-foreground">{ladder.focus.divya}</p>
          <p className="m-0 font-num text-xs text-muted-foreground">{ladder.focus.solar}</p>
        </div>

        {ladder.parts.length ? (
          <>
            <p className="m-0 text-sm font-semibold text-muted-foreground">{ladder.partsLabel}</p>
            {ladder.parts.length > 1 ? (
              <div aria-hidden className="flex h-3 gap-px overflow-hidden rounded-full">
                {ladder.parts.map((p) => (
                  <span
                    key={p.key}
                    className={cn(p.current ? "bg-secondary" : p.pause ? "bg-muted" : "bg-secondary/25")}
                    style={{ flexGrow: p.share, flexBasis: 0, minWidth: 2 }}
                  />
                ))}
              </div>
            ) : null}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {ladder.parts.map((part) => {
                const body = (
                  <span
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                      part.current
                        ? "border-2 border-secondary bg-secondary/10"
                        : part.pause
                          ? "border border-dashed border-border bg-muted/50"
                          : "border border-border bg-card",
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
                    {part.current ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">{ladder.nowLabel}</span>
                    ) : null}
                    {part.hasChildren ? <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
                  </span>
                );
                return (
                  <li key={part.key} className="flex flex-col gap-1">
                    <Mana text={part.mana} />
                    {part.hasChildren ? (
                      <button type="button" onClick={() => ladder.focusOn(part.key)} className="active:opacity-70">
                        {body}
                      </button>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">{ladder.endLabel}</p>
        )}
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

      <section className={cn(patroCard, "hidden flex-col gap-3 p-4 md:flex")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-lg font-bold text-foreground">{page.tree.title}</h2>
          <div className="flex gap-3">
            <button type="button" onClick={page.tree.showNow} className="text-sm font-semibold text-secondary hover:underline">
              {page.tree.showNowLabel}
            </button>
            <button type="button" onClick={page.tree.collapseAll} className="text-sm font-semibold text-secondary hover:underline">
              {page.tree.collapseAllLabel}
            </button>
          </div>
        </div>
        <p className="m-0 text-sm text-muted-foreground">
          {page.tree.hint} <span className="font-num font-semibold text-foreground">{page.tree.unit}</span>
        </p>
        <p className="m-0 text-sm italic text-danger">{page.tree.rootMana}:</p>
        <ul className="m-0 list-none overflow-x-auto p-0">
          {page.tree.rows.map((row) => (
            <TreeRow key={row.key} row={row} tree={page.tree} />
          ))}
        </ul>
      </section>

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
