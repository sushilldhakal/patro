import { ChevronDown, Loader2, Search } from "lucide-react";
import { useYogaReferenceCatalog } from "@vedic-patro/features/kundali";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const y = kundaliDetailClasses.yogaCatalog;
const th = kundaliDetailClasses.table.th;
const td = cn(kundaliDetailClasses.table.td, "align-top");

export type YogaReferenceCatalogProps = {
  /** 162-ids present in this chart, hidden here so they aren't shown twice. */
  excludeIds?: ReadonlySet<string>;
};

/** Reference catalog of Raman's 162 combinations not formed in this chart (see `useYogaReferenceCatalog`). */
export function YogaReferenceCatalog({ excludeIds }: YogaReferenceCatalogProps = {}) {
  const cat = useYogaReferenceCatalog({ excludeIds });

  return (
    <div className={y.root}>
      <button
        type="button"
        onClick={cat.toggle}
        className={cn(y.toggle, "flex w-full text-left")}
        aria-expanded={cat.open}
      >
        <span className="flex flex-col">
          <span className={y.title}>{cat.title}</span>
          <span className={y.source}>{cat.source}</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", cat.open && "rotate-180")}
          aria-hidden
        />
      </button>

      {cat.open && (
        <div className={y.body}>
          {cat.status === "error" ? (
            <p className={y.message}>{cat.errorText}</p>
          ) : cat.status === "loading" ? (
            <p className={cn(y.loadingRow, y.loadingText, "flex")}>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {cat.loadingText}
            </p>
          ) : (
            <>
              <label className={cn(y.search, "flex")}>
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  value={cat.query}
                  onChange={(e) => cat.setQuery(e.target.value)}
                  placeholder={cat.searchPlaceholder}
                  className={cn(y.searchInput, "w-full bg-transparent outline-none placeholder:text-muted-foreground")}
                />
              </label>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      {cat.columns.map((c, i) => (
                        <TableHead
                          key={c.key}
                          className={cn(th, i === 0 && "pl-3.5", i === cat.columns.length - 1 && "pr-3.5")}
                        >
                          {c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.rows.map((e, i) => (
                      <TableRow
                        key={e.id}
                        className={cn(i % 2 === 1 && "bg-muted/20")}
                      >
                        <TableCell className={cn(td, y.idText, "pl-3.5 whitespace-nowrap")}>
                          {e.id}
                        </TableCell>
                        <TableCell className={cn(td, y.nameText, "whitespace-nowrap")}>
                          {e.name}
                        </TableCell>
                        <TableCell className={cn(td, "min-w-[14rem] whitespace-normal leading-snug")}>
                          {e.definition}
                        </TableCell>
                        <TableCell className={cn(td, "min-w-[12rem] whitespace-normal pr-3.5 leading-snug")}>
                          {e.result}
                        </TableCell>
                      </TableRow>
                    ))}
                    {cat.rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className={cn(y.message, "px-3.5")}
                        >
                          {cat.noMatch}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className={y.note}>{cat.note}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
