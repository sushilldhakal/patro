import type { VimshopakaData, VimshopakaGrade } from "@/lib/api";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { useVimshopakaCard } from "@vedic-patro/features/kundali";
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

const v = kundaliDetailClasses.vimshopaka;

const GRADE_STYLES: Record<VimshopakaGrade, string> = {
  full: cn(v.gradeFullBg, v.gradeFullText),
  mediocre: cn(v.gradeMediocreBg, v.gradeMediocreText),
  little: cn(v.gradeLittleBg, v.gradeLittleText),
  incapable: cn(v.gradeIncapableBg, v.gradeIncapableText),
};

export function VimshopakaCard({ data }: { data: VimshopakaData }) {
  const card = useVimshopakaCard(data);

  return (
    <div className={v.root}>
      <div>
        <h3 className={v.title}>{card.title}</h3>
        <p className={v.intro}>{card.intro}</p>
      </div>

      <div className={v.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">{card.grahaHeader}</TableHead>
              {card.columns.map((c) => (
                <TableHead key={c.key} className="whitespace-nowrap text-center">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {card.rows.map((p) => (
              <TableRow key={p.key}>
                <TableCell className="whitespace-nowrap font-semibold text-foreground">
                  <span className="inline-flex items-center gap-2">
                    <GrahaPlanetIcon graha={p.key as GrahaKey} size={22} />
                    {p.name}
                  </span>
                </TableCell>
                {p.cells.map((s) =>
                  s.score == null ? (
                    <TableCell key={s.key} className="text-center text-muted-foreground">
                      —
                    </TableCell>
                  ) : (
                    <TableCell key={s.key} className="text-center">
                      <span
                        className={cn(
                          v.badge,
                          v.badgeText,
                          "inline-flex min-w-[3.25rem] font-num",
                          GRADE_STYLES[s.grade],
                        )}
                        title={s.gradeLabel}
                      >
                        {s.score}
                      </span>
                    </TableCell>
                  ),
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Grade legend */}
      <div className={cn(v.legend, v.legendText)}>
        {card.legend.map((g) => (
          <span key={g.grade} className={cn(v.legendItem, "inline-flex")}>
            <span className={cn(v.legendDot, GRADE_STYLES[g.grade])} />
            {g.label}
            <span className={v.legendRange}>{g.range}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default VimshopakaCard;
