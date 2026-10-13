import { cn } from "@vedic-patro/domain/utils";
import { spec } from "@vedic-patro/design-tokens";

interface Props {
  label: string;
  value?: string | null;
  sub?: string;
  className?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, sub, className, highlight }: Props) {
  return (
    <div
      className={cn(spec.statCard, highlight && spec.statCardHighlight, className)}
    >
      <span className={spec.label}>
        {label}
      </span>
      <span className={spec.statValue}>
        {value ?? <span>—</span>}
      </span>
      {sub && <span className={spec.caption}>{sub}</span>}
    </div>
  );
}
