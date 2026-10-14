import { RotateCcw } from "lucide-react";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { useGrahaDetailsList, type GrahaDetailsInput } from "@vedic-patro/features/kundali";
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

const g = kundaliDetailClasses.grahaList;
const th = kundaliDetailClasses.table.th;
const td = kundaliDetailClasses.table.td;

export type GrahaDetailsListProps = GrahaDetailsInput;

/** Detailed graha table for one divisional chart (rows from `useGrahaDetailsList`). */
export function GrahaDetailsList(props: GrahaDetailsListProps) {
  const list = useGrahaDetailsList(props);

  if (list.rows.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          {list.columns.map((c, i) => (
            <TableHead
              key={c.key}
              className={cn(th, i === 0 && "sticky left-0 z-10 bg-muted pl-3.5", c.key === "bhava" && "text-center")}
            >
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.rows.map((row, i) => {
          const zebra = i % 2 === 1 && "bg-muted/20";
          return (
            <TableRow
              key={row.key}
              className={cn(zebra, row.retrograde && "bg-secondary/[0.06] dark:bg-secondary/10")}
            >
              {/* Sticky cell needs an opaque background so scrolled columns
                  don't show through — blend the row tint into the card color. */}
              <TableCell
                className={cn(
                  td,
                  "sticky left-0 z-10 bg-card pl-3.5",
                  g.name,
                  zebra && "bg-[color-mix(in_srgb,var(--muted)_20%,var(--card))]",
                  row.retrograde &&
                    "bg-[color-mix(in_srgb,var(--secondary)_6%,var(--card))] dark:bg-[color-mix(in_srgb,var(--secondary)_10%,var(--card))]",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {!row.isLagna && (
                    <GrahaPlanetIcon graha={row.key as GrahaKey} size={22} />
                  )}
                  {row.name}
                  {row.retrograde && (
                    <span
                      className={cn(g.retroBadge, g.retroText, "inline-flex normal-case")}
                      title={list.retroTitle}
                    >
                      <RotateCcw className="size-2.5" aria-hidden />
                      {list.retroLabel}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className={cn(td, g.dms)}>
                <span className={g.dmsDeg}>{row.deg}</span>{" "}
                <span className={cn(g.dmsRashi, "font-sans")}>{row.rashiName}</span>{" "}
                {row.min}{" "}
                {row.sec}
              </TableCell>
              <TableCell className={cn(td, g.bhava)}>{row.bhava}</TableCell>
              <TableCell className={td}>
                {row.nakName}
                <span> {row.pada}</span>
              </TableCell>
              <TableCell className={td}>
                {row.nakLord.name}
                <span className="mx-1">/</span>
                {row.subLord.name}
              </TableCell>
              <TableCell className={td}>
                {row.owner.name}
                {row.owner.bhava != null && <span> {row.owner.bhava}</span>}
              </TableCell>
              <TableCell className={td}>{row.relation}</TableCell>
              <TableCell className={td}>{row.dignity}</TableCell>
              <TableCell className={td}>{row.rules}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
