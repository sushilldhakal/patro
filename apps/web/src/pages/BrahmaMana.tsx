import { ChevronDown, Hourglass } from "lucide-react";
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
    <ChevronDown
      aria-hidden
      className={cn("mt-1 size-3.5 shrink-0 text-foreground transition-transform", !row.open && "-rotate-90")}
    />
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

      <section className={cn(patroCard, "flex flex-col gap-3 p-4")}>
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
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-secondary" style={{ opacity: 0.45 + (0.55 * (i + 1)) / page.now.lines.length }} />
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
