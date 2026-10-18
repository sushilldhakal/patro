import type { JanmaPhalaHintPart } from "@vedic-patro/domain/janma-phala-tables";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

export function JanmaPhalaChartSummary({
  parts,
  className,
}: {
  parts: JanmaPhalaHintPart[];
  className?: string;
}) {
  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        kundaliDetailClasses.parts.chartSummary,
        className,
      )}
    >
      <ul className={cn("grid gap-2 sm:grid-cols-2 xl:grid-cols-3", kundaliDetailClasses.parts.chartSummaryText)}>
        {parts.map((p) => (
          <li key={p.grahaKey} className="min-w-0">
            <span className={kundaliDetailClasses.prose.strong}>{p.grahaLabel}</span>
            <span className="text-muted-foreground"> · </span>
            {p.houseLabel}{" "}
            <span className="text-muted-foreground">({p.bhavaTag})</span>
            <span className="text-muted-foreground"> — </span>
            <span className="text-foreground/90">{p.phala}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
