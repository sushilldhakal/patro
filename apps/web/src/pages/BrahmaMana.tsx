import { ChevronDown, Hourglass } from "lucide-react";
import { LearnMoreCard } from "@/components/LearnMoreCard";
import { PageHeader, PageShell } from "@/components/PageShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBrahmaManaPage, type BrahmaManaPage, type BrahmaTreeRow } from "@vedic-patro/features/brahma-mana";
import { useRouteLoading } from "@/lib/route-loading";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/** Indent per level, in px. Nine levels deep still leaves a phone most of its width. */
const STEP = 14;

/** One level of the ladder: the rails of its ancestors, its own elbow and dot, then the card. */
function TreeRow({ row, tree }: { row: BrahmaTreeRow; tree: BrahmaManaPage["tree"] }) {
  const open = tree.isOpen(row);
  const here = row.current && !row.hasChildren;
  const body = (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2 text-left",
        row.current ? "border-secondary/40 bg-secondary/[0.06] dark:bg-secondary/15" : "border-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-bold text-foreground">{row.name}</span>
        {row.count ? (
          <span className="rounded-full bg-muted px-2 py-px font-num text-xs font-semibold text-muted-foreground">{row.count}</span>
        ) : null}
        {here ? (
          <span className="rounded-full bg-secondary px-2 py-px text-xs font-bold text-white">{tree.nowLabel}</span>
        ) : null}
        {row.hasChildren ? (
          <ChevronDown
            aria-hidden
            className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
          />
        ) : null}
      </div>
      <span className="text-sm text-muted-foreground">{row.holds}</span>
      <span className="font-num text-sm font-semibold text-foreground">
        {row.years} <span className="font-normal text-muted-foreground">· {row.rough}</span>
      </span>
      {row.split ? <span className="font-num text-xs text-muted-foreground">{row.split}</span> : null}
    </div>
  );

  return (
    <li className="relative flex items-stretch">
      {/* Rails of the levels above: each runs on while that level has children still to come. */}
      {row.ancestors.map((id, i) => (
        <span key={id} aria-hidden className="relative shrink-0" style={{ width: STEP }}>
          {i === row.ancestors.length - 1 ? (
            <>
              <span
                className={cn("absolute left-1.5 top-0 w-px", row.current ? "bg-secondary" : "bg-border", row.last ? "h-5" : "h-full")}
              />
              <span className={cn("absolute left-1.5 top-5 h-px w-2", row.current ? "bg-secondary" : "bg-border")} />
            </>
          ) : row.rails[i] ? (
            <span className="absolute left-1.5 top-0 h-full w-px bg-border" />
          ) : null}
        </span>
      ))}
      <div className="flex min-w-0 flex-1 py-1">
        {row.hasChildren ? (
          <button
            type="button"
            onClick={() => tree.toggle(row.id)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 rounded-lg transition-transform active:scale-[0.99]"
          >
            {body}
          </button>
        ) : (
          body
        )}
      </div>
    </li>
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
          <button type="button" onClick={page.tree.toggleAll} className="text-sm font-semibold text-secondary hover:underline">
            {page.tree.toggleAllLabel}
          </button>
        </div>
        <p className="m-0 text-sm text-muted-foreground">{page.tree.hint}</p>
        <ul className="m-0 list-none p-0">
          {page.tree.rows.map((row) => (
            <TreeRow key={row.id} row={row} tree={page.tree} />
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
