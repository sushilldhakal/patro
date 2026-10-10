import type { JanmaPhalaHintPart } from "@/shared/janma-phala-tables";
import { cn } from "@/lib/utils";

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
        "rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5",
        className,
      )}
    >
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 text-xs leading-snug text-muted-foreground">
        {parts.map((p) => (
          <li key={p.grahaKey} className="min-w-0">
            <span className="font-semibold text-foreground">{p.grahaLabel}</span>
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
